import graphene
from graphql_jwt.decorators import login_required
import numpy as np
import re
import base64
from PIL import Image
import pytesseract
from django.conf import settings
import tempfile
import uuid
import os
import fitz
import json
from io import BytesIO
import environ

from datetime import datetime, timedelta
from ..models import Contractor, Client


# tesseract_cmd = r"C:\Program Files\Tesseract-OCR"
env = environ.Env()
environ.Env.read_env()
REMITTANCE_PATH = env('REMITTANCE_PATH')
pytesseract.pytesseract.tesseract_cmd = env('TESSERACT_PATH')

class RemittanceAdvice(graphene.ObjectType):
    number = graphene.String()
    amount = graphene.Float()

class ExtractRemittanceAdvice(graphene.Mutation):
    class Arguments: 
        file = graphene.String()
        filename = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    advice_date = graphene.Date()
    client = graphene.String()
    data = graphene.List(RemittanceAdvice)
    
    @classmethod
    @login_required
    def mutate(self, root, info, file, filename, **kwargs):
        debug = True
        
        if not file: 
            return self(success=False)

        print("Remittance Advice Uploaded:", filename)

        file = file.replace("data:application/pdf;base64,", "")
        pdf = base64.b64decode(file, validate=True)

        # Save pdf to remittance advice folder
        f = open(os.path.join(REMITTANCE_PATH, filename), 'wb')
        f.write(pdf)
        f.close()

        img_uid = pdf_to_image(pdf, 'remittance')
        
        if debug: print(img_uid)
        advice_text = pytesseract.image_to_string(Image.open(f"{settings.MEDIA_ROOT}/remittance/{img_uid}.jpg"))

        data = []
        calculated_total = 0.0
        
        client = None
        if debug: print(advice_text)

        for _client in Client.objects.all():
            client_name = _client.name
            
            if client_name.lower() in advice_text.lower():
                client = _client
                break

        if debug and client: print(f"Client: {client.name} ({client.id})")

        date_pattern = '[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}'
        advice_date_match = re.findall(date_pattern, advice_text)
        if debug: print(advice_date_match)
        advice_date = set(advice_date_match)
        advice_date = list(advice_date)
        if debug: print(advice_date)
        advice_date = datetime.strptime(advice_date[0], '%d/%m/%Y').date()

        price_pattern = '-?[0-9]{0,3},*?[0-9]{0,3}\.[0-9]{2}'
        prices = re.findall(price_pattern, advice_text)

        invoice_patterns = ['^0{1,3}[0-9]{4,8}', ' 0{1,3}[0-9]{4,8}$', ' 0+[0-9]{4,8} ', ' 0{0,4}[0-9]{4,8} ']
        for invoice_pattern in invoice_patterns:
            invoices = re.findall(invoice_pattern, advice_text, re.MULTILINE)
            if len(invoices) > 0:
                break

        for i in range(len(invoices)):
            invoices[i] = invoices[i].strip().zfill(8)

        if debug: print(prices)
        if debug: print(invoices)

        print(len(prices), len(invoices))

        # Assuming there are multiple total amounts provided. Remove the repeated total
        if len(prices) - 1 > len(invoices):
            prices = prices[:len(invoices) + 1]

        if len(prices) < len(invoices):
            return self(success=False, message="Error Extracting Data from PDF. Please contact admin.")

        # Match invoices with the associated price
        if len(prices) == len(invoices) or len(prices) - 1 == len(invoices):
            # Loop through invoices 
            for i in range(len(invoices)):
                # print(f"  {invoices[i]} {prices[i]}")
                calculated_total += float(prices[i].replace(",", ""))
                data.append({"number":invoices[i], "amount":float(prices[i].replace(",", ""))})
                
            total = float(prices[len(prices)-1].replace(",", ""))
            if debug: print(f" Price Validation: {round(calculated_total,2) == total} -> (${round(calculated_total,2)} / ${total})")

        if not round(calculated_total, 2) == total:
            return self(success=True, message="Remittance Advice Totals do not add up. Please Check Advice", data=data, advice_date=advice_date, client=client.id)

        return self(success=True, message="Successfully extracted remittance advice", data=data, advice_date=advice_date, client=client.id)

class ExtractBillDetails(graphene.Mutation):
    class Arguments:
        file = graphene.String()
        filename = graphene.String()
        num_pages = graphene.Int()
        object_type = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    data = graphene.String()
    billFileName = graphene.String()
    billFileData = graphene.String()

    @classmethod
    def mutate(self, root, info, file, filename, num_pages, object_type):
        if not file: 
            return self(success=False)
        
        debug = True

        if "data:application/pdf;base64," in file:
            # Convert PDF to JPG and Save
            file = file.replace("data:application/pdf;base64,", "")
            pdf = base64.b64decode(file, validate=True)

            img_uid = pdf_to_image(pdf, 'bills', num_pages)
            thumbnail_image_path = f"{settings.MEDIA_ROOT}/bills/{img_uid}.jpg"
            img = Image.open(thumbnail_image_path)

            # Check the image is within the requirements for pytesseract
            ## Image size - Max is 32767 (INT16_MAX) width and height
            if(img.height > 32767 or img.width > 32767):
                return self(success=False, message="Bill PDF is too large. Please remove unnecessary pages using the advanced upload section")
            
        elif "data:image" in file:
            # Save as JPG
            img_uid = uuid.uuid4().hex
            while os.path.exists(img_uid):
                img_uid = uuid.uuid4().hex

            thumbnail_image_path = f"{settings.MEDIA_ROOT}/bills/{img_uid}.jpg"

            file = re.sub("data:image(.+);base64,", "", file)
            img = Image.open(BytesIO(base64.b64decode(file)))
            img = img.convert('RGB')
            img.save(thumbnail_image_path)
            
            if(img.height > 32767 or img.width > 32767):
                return self(success=False, message="Image size is too large. Please reduce the size and reupload")

        else:
            return self(success=False, message="File type not recognised. Please Contact Developer")

        thumbnail_image_path = f"media/bills/{img_uid}.jpg"
        if debug: print(thumbnail_image_path)
        data = {'thumbnailPath': thumbnail_image_path}

        text = pytesseract.image_to_string(img).lower()
        if debug: print(text)

        if object_type == "bill":
            data.update({'billType':'subcontractor'})

            data = extract_contractor_into_struct(text, data, debug)
            data = extract_invoice_number_into_struct(text, data, debug)
            data = extract_invoice_date_into_struct(text, data, 'invoiceDate', debug)
            data = extract_amount_into_struct(text, data, debug)
            
        elif object_type == "expense":            
            data = extract_invoice_date_into_struct(text, data, "expenseDate", debug)
            data = extract_amount_into_struct(text, data, debug)

        else:
            return self(success=False, message="Provided object type not recognised")


        return self(success=True, message="Successfully Uploaded", data=json.dumps(data, indent=4, default=str), billFileName=filename, billFileData=file)

def extract_amount_into_struct(text, data, debug=False):
    total_regex = re.findall('(?![\b[^\S\r\n]](?:total|amount|due)[: $aud]*?[^\S\r\n]*?)(-?[0-9]{0,3}[^\S\r\n]*,*?[0-9]{0,3}[^\S\r\n]*\.[^\S\r\n]*[0-9]{2})', text)
    if debug: print(total_regex)
    if(len(total_regex) == 1):
        data.update({'amount': total_regex[0].replace(' ', '').replace(',', '')})
    if len(total_regex) > 1:
        for i, val in enumerate(total_regex):
            total_regex[i] = float(val.replace(' ', '').replace(',', ''))
        data.update({'amount': max(total_regex)})

    if debug: print("Amount:", total_regex)

    return data

def extract_invoice_date_into_struct(text, data, data_name="invoiceDate", debug=False):
    date_regex = re.findall('(?:\s?\d{1,2}[-/, ]{0,1}\s?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[-/, ]{0,1}\s*\d{2,4})|(?:\s?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{1,2}[-/, ]{0,1}\s*[-/, ]{0,1}\s?\d{4})|(?:3[01]|[12][0-9]|0?[1-9])\s?[/-]\s?(?:1[0-2]|0?[1-9])\s?[/-]\s?(?:[0-9]{2})?[0-9]{2}', text)
    for i, val in enumerate(date_regex):
        date_regex[i] = val.strip().replace(" ", "")
    
    date_set = set(date_regex)
    date_regex = list(date_set)
    if debug: print("Date:", date_regex)

    # If more than one date is found from the beginning, narrow down the search to look for an invoice date specifically. 
    if(len(date_regex) == 1):
        date = try_parsing_date_to_string(date_regex[0].capitalize(), debug)
        data.update({data_name: date})
        return data 

    if (len(date_regex) > 1):
        # Remove future dates that could be the due date.
        for d in date_regex:
            if not try_parsing_date(d) == None and try_parsing_date(d) > datetime.today() + timedelta(days=1):
                date_regex.remove(d)

        if debug: print("Date:", date_regex)
        if(len(date_regex) == 1):
            date = try_parsing_date_to_string(date_regex[0].capitalize(), debug)
            data.update({data_name: date})
            return data

        # Try a different regex pattern
        date_regex = re.findall('(?:invoice\s?date[\r\n\s]*)((?:\s?\d*\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d*,{0,1}\s*\d{4})|(?:3[01]|[12][0-9]|0?[1-9])[/-](?:1[0-2]|0?[1-9])[/-](?:[0-9]{2})?[0-9]{2})', text)
        date_set = set(date_regex)
        date_regex = list(date_set)
        if debug: print("Date:", date_regex)
        if(len(date_regex) == 1):
            date = try_parsing_date_to_string(date_regex[0].capitalize(), debug)
            data.update({data_name: date})

    return data                

def extract_invoice_number_into_struct(text, data, debug=False):
    invoice_regex = re.findall('[\b\s](?:inv(?:oice)?)[-noumber.:# ]*?(\d+\/?\d*)', text)
    invoice_set = set(invoice_regex)
    invoice_regex = list(invoice_set)
    if(len(invoice_regex) == 1): 
        data.update({'invoiceNumber': invoice_regex[0]})

    if debug: print("Invoice:", invoice_regex)
    
    return data

# Extracts ABN from image and finds contact with that ABN
def extract_contractor_into_struct(text, data, debug=False):
    abn_regex = re.findall('[\b\s]?[abn.]{3,6}\s*:?\s*([0-9]{2}\s*[0-9]{3}\s*[0-9]{3}\s*[0-9]{3})', text)
    for i, abn in enumerate(abn_regex):
        abn_regex[i] = abn.replace(" ", "")

    abn_set = set(abn_regex)
    if '14609594532' in abn_set: abn_set.remove('14609594532') # Aurify ABN [HARDCODED]
    abn_regex = list(abn_set)
    if(len(abn_regex) == 1): 
        abn = abn_format(abn_regex[0])
        data.update({'abn': abn})

        if Contractor.objects.filter(abn=abn).exists():
            contractor = Contractor.objects.get(abn=abn)
            if debug: print("Contractor:",contractor)
            data.update({'contractor': str(contractor.id)})

    if debug: print("ABN:", abn_regex)

    return data

def abn_format(text):
    if len(text) == 14:
        return text
    if len(text) < 14:
        text.replace(" ", "")
        text = text[:2] + " " + text[2:5] + " " + text[5:8] + " " + text[8:]
        return text

DATE_FORMATS = ('%d/%m/%y', '%d/%m/%Y', '%d-%m-%y', '%d-%m-%Y', 
                '%B %d, %Y', '%b %d, %y', '%B %d %Y', '%b %d %y', '%d %b %Y', '%d %b %y',
                '%B%d,%Y', '%b%d,%y', '%B%d%Y', '%b%d%y', '%d%b%Y', '%d%b%y','%d%B%Y', '%d%B%y',
                '%d-%b-%y', '%d-%b-%Y', '%-d-%b-%y', '%-d-%b-%Y')

def try_parsing_date(text, debug=False):
    text = text.strip().title()
    if debug: print("Parsing:", text)
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass

    return None
 
def try_parsing_date_to_string(text, debug=False):
    text = text.strip().title()
    if debug: print("Parsing:", text)
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return ""

def pdf_to_image(pdf, type, num_pages=0):
    # write pdf to temp file so we can convert to a thumbnail image
    temp_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    temp_pdf.write(pdf)
    temp_pdf.close()

    img_filename = uuid.uuid4().hex
    while os.path.exists(f"{settings.MEDIA_ROOT}/{type}/{img_filename}.jpg"):
        img_filename = uuid.uuid4().hex

    thumbnail_image_path = f"{settings.MEDIA_ROOT}/{type}/{img_filename}.jpg"

    with fitz.open(temp_pdf.name) as doc: # open document
        img_bytes = []
        for idx, page in enumerate(doc):
            if num_pages > 0 and idx >= num_pages:
                continue
            pix = page.get_pixmap(dpi=350)  # render page to an image
            img_bytes.append(pix.pil_tobytes(format="JPEG", optimize=True))

        imgs = [Image.open(BytesIO(i)) for i in img_bytes]

        # pick the image which is the smallest, and resize the others to match it (can be arbitrary image shape here)
        min_shape = sorted([(np.sum(i.size), i.size ) for i in imgs])[0][1]
        print(min_shape)

        imgs_comb = np.vstack([i.resize(min_shape) for i in imgs])
        imgs_comb = Image.fromarray(imgs_comb)
        imgs_comb.save(thumbnail_image_path)

    os.remove(temp_pdf.name) # remove temp file

    return img_filename