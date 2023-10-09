import graphene
from PyPDF2 import PdfReader
import fitz
import tempfile
from io import BytesIO
import PIL
import numpy as np
from PIL import Image
import re
import os
import base64
import json
import uuid
from datetime import datetime
from ..models import Contractor

REMITTANCE_PATH = r"C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Admin\Accounts\Remittance Advice"

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
    def mutate(self, root, info, file, filename, **kwargs):
        if not file: 
            return self(success=False)

        print("Remittance Advice Uploaded:", filename)

        file = file.replace("data:application/pdf;base64,", "")
        pdf = base64.b64decode(file, validate=True)

        # Save pdf to remittance advice folder
        f = open(os.path.join(REMITTANCE_PATH, filename), 'wb')
        f.write(pdf)
        f.close()

        data = []
        calculated_total = 0.0
        
        debug = False
        with BytesIO(pdf) as pdf_file:
            reader = PdfReader(pdf_file)
            # num_pages = len(reader.pages)
            client = 0

            for page_num, page in enumerate(reader.pages):
                print(f" Extracting Page {page_num + 1}/{len(reader.pages)}")
                pdf_data = page.extract_text()
                if debug: print(pdf_data)

                patterns = ['[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}', '-?[0-9]{0,3},*?[0-9]{0,3}\.[0-9]{2}', '^0{0,4}[0-9]{4,8}']
                if page_num == 0:
                    cath_sch = re.findall('Catholic Schools', pdf_data)
                    if len(cath_sch) >= 1:
                        patterns = ['[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}', '-?[0-9]{0,3},*?[0-9]{0,3}\.[0-9]{2}', ' 0+[0-9]{4,8} ']
                        client = 2
                        if debug: print("Catholic Schools")
                    dep_edu = re.findall('NSW DEPARTMENT OF EDUCATION', pdf_data)
                    if len(dep_edu) >= 1:
                        patterns = ['[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}', '-?[0-9]{0,3},*?[0-9]{0,3}\.[0-9]{2}', ' 0{0,4}[0-9]{4,8} ']
                        client = 5
                        if debug: print("NSW Department of Defence")

                    advice_date_match = re.findall(patterns[0], pdf_data)
                    if debug: print(advice_date_match)
                    advice_date = set(advice_date_match)
                    advice_date = list(advice_date)
                    if debug: print(advice_date)
                    # if not len(advice_date) == 1:
                    #     return self(success=False, message="Error retrieving date for remittance advice. Please Contact Admin")
                    advice_date = datetime.strptime(advice_date_match[0], '%d/%m/%Y').date()
                
                prices = re.findall(patterns[1], pdf_data)
                invoices = re.findall(patterns[2], pdf_data, re.MULTILINE)

                for i in range(len(invoices)):
                    invoices[i] = invoices[i].strip().zfill(8)

                if debug: print(prices)
                if debug: print(invoices)

                # Assuming there are multiple total amounts provided. Remove the repeated totals
                if len(prices) - 1 > len(invoices):
                    prices = prices[:len(invoices) + 1]

                if len(prices) < len(invoices):
                    return self(success=False, message="Error Extracting Data from PDF. Please contact admin.")

                if len(prices) == len(invoices) or (page_num == len(reader.pages)-1 and len(prices) - 1 == len(invoices)):
                    # Loop through invoices 
                    for i in range(len(invoices)):
                        # print(f"  {invoices[i]} {prices[i]}")
                        calculated_total += float(prices[i].replace(",", ""))
                        data.append({"number":invoices[i], "amount":float(prices[i].replace(",", ""))})
                
            total = float(prices[len(prices)-1].replace(",", ""))
            if debug: print(f" Price Validation: {round(calculated_total,2) == total} -> (${round(calculated_total,2)} / ${total})")

        if not round(calculated_total,2) == total:
            return self(success=True, message="Remittance Advice Totals do not add up. Please Contact Admin", data=data, advice_date=advice_date)

        return self(success=True, message="Successfully extracted remittance advice", data=data, advice_date=advice_date, client=client)

class ExtractBillDetails(graphene.Mutation):
    class Arguments:
        file = graphene.String()
        filename = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    data = graphene.String()
    billFileName = graphene.String()
    billFileData = graphene.String()

    @classmethod
    def mutate(self, root, info, file, filename):
        if not file: 
            return self(success=False)

        file = file.replace("data:application/pdf;base64,", "")
        pdf = base64.b64decode(file, validate=True)

        # write pdf to temp file so we can convert to a thumbnail image
        tf_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        tf_pdf.write(pdf)
        tf_pdf.close()

        img_filename = uuid.uuid4().hex
        while os.path.exists(f"Media\processed_bills\{img_filename}.jpg"):
            img_filename = uuid.uuid4().hex

        thumbnail_image_path = f"Media\processed_bills\{img_filename}.jpg"

        with fitz.open(tf_pdf.name) as doc: # open document
            img_bytes = []
            for page in doc:
                pix = page.get_pixmap()  # render first page to an image
                img_bytes.append(pix.pil_tobytes(format="JPEG", optimize=True))

            imgs = [Image.open(BytesIO(i)) for i in img_bytes]

            # pick the image which is the smallest, and resize the others to match it (can be arbitrary image shape here)
            min_shape = sorted( [(np.sum(i.size), i.size ) for i in imgs])[0][1]

            imgs_comb = np.vstack([i.resize(min_shape) for i in imgs])
            imgs_comb = Image.fromarray( imgs_comb)
            imgs_comb.save(thumbnail_image_path)

        os.remove(tf_pdf.name) # remove temp file

        data = {
            'thumbnailPath':'',
            'contractor':'',
            'invoiceNumber':'',
            'invoiceDate':'',
            'amount':'',
            'billType':'subcontractor'
        }
        data.update({'thumbnailPath': thumbnail_image_path})

        debug = False

        with BytesIO(pdf) as pdf_file:
            reader = PdfReader(pdf_file)
            for page_num, page in enumerate(reader.pages):
                pdf_data = page.extract_text().lower()

                if debug: print("page ", page_num)
                if debug: print(pdf_data)

                abn_regex = re.findall('[\b\s]abn:?\s*([0-9]{2}\s*[0-9]{3}\s*[0-9]{3}\s*[0-9]{3})', pdf_data)

                for i, abn in enumerate(abn_regex):
                    abn_regex[i] = abn.replace(" ", "")

                if not data.get('abn'):
                    abn_set = set(abn_regex)
                    if '14609594532' in abn_set: abn_set.remove('14609594532') # Aurify ABN [HARDCODED]
                    abn_regex = list(abn_set)
                    if(len(abn_regex) == 1): 
                        abn = abn_format(abn_regex[0])
                        data.update({'abn': abn})

                        if Contractor.objects.filter(abn=abn).exists():
                            contractor = Contractor.objects.get(abn=abn)
                            if debug: print("Contractor:",contractor)
                            data.update({'contractor': contractor.id})

                    if debug: print("ABN:", abn_regex)

                if not data.get('invoiceNumber'):
                    invoice_regex = re.findall('[\b\s](?:inv(?:oice)?)[-noumber.:# ]*?(\d+\/?\d*)', pdf_data)
                    invoice_set = set(invoice_regex)
                    invoice_regex = list(invoice_set)
                    if(len(invoice_regex) == 1): 
                        data.update({'invoiceNumber': invoice_regex[0]})
                    if debug: print("Invoice:", invoice_regex)


                if not data.get('invoiceDate'):
                    date_regex = re.findall('(?:\s?\d{1,2}[-/, ]{0,1}(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[-/, ]{0,1}\s*\d{2,4})|(?:\s?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{1,2}[-/, ]{0,1}\s*[-/, ]{0,1}\d{4})|(?:3[01]|[12][0-9]|0?[1-9])[/-](?:1[0-2]|0?[1-9])[/-](?:[0-9]{2})?[0-9]{2}', pdf_data)
                    for i, val in enumerate(date_regex):
                        date_regex[i] = val.strip()
                    
                    date_set = set(date_regex)
                    date_regex = list(date_set)
                    if debug: print("Date:", date_regex)
                    # If more than one date is found from the beginning, narrow down the search to look for an invoice date specifically. 
                    if(len(date_regex) == 1):
                        date = try_parsing_date(date_regex[0].capitalize(), debug)
                        data.update({'invoiceDate': date})
                    elif(len(date_regex) > 1):
                        date_regex = re.findall('(?:invoice\s?date[\r\n\s]*)((?:\s?\d*\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d*,{0,1}\s*\d{4})|(?:3[01]|[12][0-9]|0?[1-9])[/-](?:1[0-2]|0?[1-9])[/-](?:[0-9]{2})?[0-9]{2})', pdf_data)
                        date_set = set(date_regex)
                        date_regex = list(date_set)
                        if debug: print("Date:", date_regex)
                        if(len(date_regex) == 1):
                            date = try_parsing_date(date_regex[0].capitalize(), debug)
                            data.update({'invoiceDate': date})
 
                if not data.get('amount'):
                    total_regex = re.findall('(?![\b[^\S\r\n]](?:total|amount|due)[: $aud]*?[^\S\r\n]*?)(-?[0-9]{0,3}[^\S\r\n]*,*?[0-9]{0,3}[^\S\r\n]*\.[^\S\r\n]*[0-9]{2})', pdf_data)
                    if debug: print(total_regex)
                    if(len(total_regex) == 1):
                        data.update({'amount': total_regex[0].replace(' ', '').replace(',', '')})
                    if len(total_regex) > 1:
                        for i, val in enumerate(total_regex):
                            total_regex[i] = float(val.replace(' ', '').replace(',', ''))
                        data.update({'amount': max(total_regex)})

                    if debug: print("Amount:", total_regex)   

        return self(success=True, message="Successfully Uploaded", data=json.dumps(data, indent=4, sort_keys=True, default=str), billFileName=filename, billFileData=file)

def abn_format(text):
    if len(text) == 14:
        return text
    if len(text) < 14:
        text.replace(" ", "")
        text = text[:2] + " " + text[2:5] + " " + text[5:8] + " " + text[8:]
        return text


def try_parsing_date(text, debug=False):
    text = text.strip().title()
    if debug: print("Parsing:", text)
    for fmt in ('%d/%m/%y', '%d/%m/%Y', '%d-%m-%y', '%d-%m-%Y', '%B %d, %Y', '%b %d, %Y', '%B %d %Y', '%b %d %Y', '%d %B %Y', '%d %b %Y', '%d%B%Y', '%d%b%Y', '%d-%b-%y', '%d-%b-%Y', '%-d-%b-%y', '%-d-%b-%Y'):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return ""