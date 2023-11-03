# Invoice Generator
# Uses MYOB invoice and generates an invoice that is ready to submit to the client
# Adds subcontractor statement with the details that are entered into the system
import os
from datetime import date, datetime
from PyPDF2 import PdfFileReader, PdfFileWriter
from PyPDF2.generic import BooleanObject, NameObject, IndirectObject, NumberObject
from PyPDF2.errors import PdfReadWarning
import warnings
import sys
sys.path.append("...")
from api.models import Insurance


def get_insurances():
    return Insurance.objects.filter(active=True).order_by('expiry_date')

def generate_invoice(job, paths, invoice, accounts_folder, insurance_expiry_date):
    if paths['invoice'] == "":
        return {'success': False, 'message': "Bad Invoice Path"}

    if job.client.name == "BGIS":
        if invoice['Subtotal'] > 500.00:
            if paths['approval'] == "":
                return {'success': False, 'message': "Bad Approval Path"}
            
            if paths['estimate'] == "":
                return {'success': False, 'message': "Bad Estimate Path"}
    else:
        if 'purchaseOrder' in paths and paths['purchaseOrder'] == "":
            return {'success': False, 'message': "Bad Purchase Order Path"}
    

    insurances = get_insurances()
    workers_insurance = {}
    for i in insurances:
        if i.description == "Workers Insurance":
            workers_insurance = i

    if not workers_insurance:
        return {'success': False, 'message': "No Workers Insurance Found. Please ensure there is an insurance with the description 'Workers Insurance'"}

    ## Check the first insurances expiry date
    if date.today() > insurances[0].expiry_date:
        return {'success': False, 'message': "Insurances have expired. Please update!"}
    
    ## Collect data to add to invoice
    invoice_date = datetime.strptime(invoice['Date'].split("T")[0], '%Y-%m-%d')
    start_date = job.commencement_date
    finish_date = job.completion_date
    
    addData = {
        "contact number/identifier/name": str(job),
        "principal contractor": job.client.name,
        "date 1a": start_date.day,
        "date 1b": start_date.month,
        "date 1c": str(start_date.year)[-2:],
        "date 2a": finish_date.day,
        "date 2b": finish_date.month,
        "date 2c": str(finish_date.year)[-2:],
        "date 3a": invoice_date.day,
        "date 3b": invoice_date.month,
        "date 3c": str(invoice_date.year)[-2:],
        "date 4a": workers_insurance.issue_date.day,
        "date 4b": workers_insurance.issue_date.month,
        "date 4c": str(workers_insurance.issue_date.year)[-2:],
        "date 5a": invoice_date.day,
        "date 5b": invoice_date.month,
        "date 5c": str(invoice_date.year)[-2:]
    }

    ## Put together invoice
    def set_need_appearances_writer(writer: PdfFileWriter):
        # See 12.7.2 and 7.7.2 for more information: http://www.adobe.com/content/dam/acom/en/devnet/acrobat/pdfs/PDF32000_2008.pdf
        try:
            catalog = writer._root_object
            # get the AcroForm tree
            if "/AcroForm" not in catalog:
                writer._root_object.update({
                    NameObject("/AcroForm"): IndirectObject(len(writer._objects), 0, writer)
                })

            need_appearances = NameObject("/NeedAppearances")
            writer._root_object["/AcroForm"][need_appearances] = BooleanObject(True)
            # del writer._root_object["/AcroForm"]['NeedAppearances']
            return writer

        except Exception as e:
            print('set_need_appearances_writer() catch : ', repr(e))
            return writer

    warnings.filterwarnings("ignore", category=PdfReadWarning)

    stat_dec = "myob\scripts\StatDec.pdf"
    stat_dec_pdf = PdfFileReader(stat_dec)

    invoice_pdf = PdfFileReader(paths['invoice'])
    writer = PdfFileWriter()
    set_need_appearances_writer(writer)

    data = stat_dec_pdf.getPage(0)
    dictionary = stat_dec_pdf.getFields()

    # print(paths['approval'])
    if job.client.name == "BGIS":
        if (invoice['Subtotal'] > 500.00):
            approval_pdf = PdfFileReader(paths['approval'])
            breakdown_pdf = PdfFileReader(paths['estimate'])
            approval = approval_pdf.getPage(0)
            writer.appendPagesFromReader(invoice_pdf)
            writer.addPage(approval)
            writer.appendPagesFromReader(breakdown_pdf)

            for i in insurances:
                ins_page = PdfFileReader(i.filename)
                writer.appendPagesFromReader(ins_page)
                ins_page = ''

            writer.appendPagesFromReader(stat_dec_pdf)
            writer.updatePageFormFieldValues(data, addData)
            
            # Make Fields Read Only
            for j in range(0, len(data['/Annots'])):
                writer_annot = data['/Annots'][j].getObject()
                for field in dictionary:
                    if writer_annot.get('/T') == field:
                        writer_annot.update({
                            NameObject("/Ff"): NumberObject(1)    # make ReadOnly
                        })

        else:
            writer.appendPagesFromReader(invoice_pdf)
            for i in insurances:
                ins_page = PdfFileReader(i.filename)
                writer.appendPagesFromReader(ins_page)
                ins_page = ''
            writer.appendPagesFromReader(stat_dec_pdf)
            writer.updatePageFormFieldValues(data, addData)
    elif  job.client.name == "CBRE Group Inc":
        for i in insurances:
            ins_page = PdfFileReader(i.filename)
            writer.appendPagesFromReader(ins_page)
            ins_page = ''
        writer.appendPagesFromReader(stat_dec_pdf)
        writer.updatePageFormFieldValues(data, addData)

        invoiceFile = os.path.join(accounts_folder, "Supporting Documents for " + job.po + ".pdf")
        with open(invoiceFile, "wb") as edited:
            writer.write(edited)
            edited.close()

        ## Check insurances expiry date
        if date.today() == insurance_expiry_date:
            return {'success': True, 'message': "Generated Successfully.\nWarning: Insurances Expire Today, Please update!"}

        return {'success': True, 'message': "Generated Successfully"}

    else:
        writer.appendPagesFromReader(invoice_pdf)

        if 'purchaseOrder' in paths:
            purchaseOrder_pdf = PdfFileReader(paths['purchaseOrder'])
            po = purchaseOrder_pdf.getPage(0)
            writer.addPage(po)

        for i in insurances:
            ins_page = PdfFileReader(i.filename)
            writer.appendPagesFromReader(ins_page)
            ins_page = ''
        writer.appendPagesFromReader(stat_dec_pdf)
        writer.updatePageFormFieldValues(data, addData)

    invoiceFile = os.path.join(accounts_folder, "Invoice for " + job.po + ".pdf")
    with open(invoiceFile, "wb") as edited:
        writer.write(edited)
        edited.close()

    ## Check insurances expiry date
    if date.today() == insurance_expiry_date:
        return {'success': True, 'message': "Invoice Generated Successfully.\nWarning: Insurances Expire Today, Please update!"}

    return {'success': True, 'message': "Invoice Generated Successfully"}