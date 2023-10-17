import graphene
from graphql_jwt.decorators import login_required

import numpy as np
import re
import base64

from datetime import datetime
from ..models import Contractor, Client

from PIL import Image
import pytesseract

import tempfile
import uuid
import os
import fitz
from io import BytesIO
from PIL import Image

# tesseract_cmd = r"C:\Program Files\Tesseract-OCR"
REMITTANCE_PATH = r"C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Admin\Aurify\Accounts\Remittance Advice"
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract'

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
        if not file: 
            return self(success=False)

        print("Remittance Advice Uploaded:", filename)

        file = file.replace("data:application/pdf;base64,", "")
        pdf = base64.b64decode(file, validate=True)

        # Save pdf to remittance advice folder
        f = open(os.path.join(REMITTANCE_PATH, filename), 'wb')
        f.write(pdf)
        f.close()

        img_uid = pdf_to_image(pdf)
        advice_text = pytesseract.image_to_string(Image.open(f"Media\\remittance\\{img_uid}.jpg"))

        data = []
        calculated_total = 0.0
        
        debug = True
        client = None
        if debug: print(advice_text)

        for _client in Client.objects.all():
            client_name = _client.name
            
            if client_name.lower() in advice_text.lower():
                client = _client
                break

        if debug and client: print(f"Client: {client.name} ({client.id})")


        #         if page_num == 0:
                    # cath_sch = re.findall('Catholic Schools', pdf_data)
        #             if len(cath_sch) >= 1:
        #                 patterns = ['[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}', '-?[0-9]{0,3},*?[0-9]{0,3}\.[0-9]{2}', ' 0+[0-9]{4,8} ']
        #                 client = 2
        #                 if debug: print("Catholic Schools")
        #             dep_edu = re.findall('NSW DEPARTMENT OF EDUCATION', pdf_data)
        #             if len(dep_edu) >= 1:
        #                 patterns = ['[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}', '-?[0-9]{0,3},*?[0-9]{0,3}\.[0-9]{2}', ' 0{0,4}[0-9]{4,8} ']
        #                 client = 5
        #                 if debug: print("NSW Department of Education")

        date_pattern = '[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}'
        advice_date_match = re.findall(date_pattern, advice_text)
        if debug: print(advice_date_match)
        advice_date = set(advice_date_match)
        advice_date = list(advice_date)
        if debug: print(advice_date)
        advice_date = datetime.strptime(advice_date[0], '%d/%m/%Y').date()

        # if not len(advice_date) == 1:
        #     return self(success=False, message="Error retrieving date for remittance advice. Please Contact Admin")
        price_pattern = '-?[0-9]{0,3},*?[0-9]{0,3}\.[0-9]{2}'
        prices = re.findall(price_pattern, advice_text)

        invoice_patterns = ['^0{0,4}[0-9]{4,8}', ' 0+[0-9]{4,8} ', ' 0{0,4}[0-9]{4,8} ']
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
            return self(success=True, message="Remittance Advice Totals do not add up. Please Contact Admin", data=data, advice_date=advice_date)

        return self(success=True, message="Successfully extracted remittance advice", data=data, advice_date=advice_date, client=client.id)


def pdf_to_image(pdf):
    # write pdf to temp file so we can convert to a thumbnail image
    temp_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    temp_pdf.write(pdf)
    temp_pdf.close()

    img_filename = uuid.uuid4().hex
    while os.path.exists(f"Media\\remittance\\{img_filename}.jpg"):
        img_filename = uuid.uuid4().hex

    thumbnail_image_path = f"Media\\remittance\\{img_filename}.jpg"

    with fitz.open(temp_pdf.name) as doc: # open document
        img_bytes = []
        for page in doc:
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