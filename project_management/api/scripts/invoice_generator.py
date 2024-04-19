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


def generate_invoice(job, paths, invoice, accounts_folder):
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
    

    insurances = Insurance.objects.filter(active=True).order_by('expiry_date')
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
        "ABN 2": job.client.abn,
        "date 1a": f"{start_date.day:02}",
        "date 1b": f"{start_date.month:02}",
        "date 1c": str(start_date.year)[-2:],
        "date 2a": f"{finish_date.day:02}",
        "date 2b": f"{finish_date.month:02}",
        "date 2c": str(finish_date.year)[-2:],
        "date 3a": f"{invoice_date.day:02}",
        "date 3b": f"{invoice_date.month:02}",
        "date 3c": str(invoice_date.year)[-2:],
        "date 4a": f"{workers_insurance.issue_date.day:02}",
        "date 4b": f"{workers_insurance.issue_date.month:02}",
        "date 4c": str(workers_insurance.issue_date.year)[-2:],
        "date 5a": f"{invoice_date.day:02}",
        "date 5b": f"{invoice_date.month:02}",
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
            return writer

        except Exception as e:
            print('set_need_appearances_writer() catch : ', repr(e))
            return writer

    warnings.filterwarnings("ignore", category=PdfReadWarning)

    stat_dec = "./api/scripts/StatDec.pdf"
    stat_dec_pdf = PdfFileReader(stat_dec)
    if "/AcroForm" in stat_dec_pdf.trailer["/Root"]:
        stat_dec_pdf.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})

    invoice_pdf = PdfFileReader(paths['invoice'])
    if "/AcroForm" in invoice_pdf.trailer["/Root"]:
        invoice_pdf.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})

    writer = PdfFileWriter()
    writer = set_need_appearances_writer(writer)
    if "/AcroForm" in writer._root_object:
        writer._root_object["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})

    data = stat_dec_pdf.getPage(0)
    dictionary = stat_dec_pdf.getFields()

    # print(paths['approval'])
    if job.client.name == "BGIS":
        if (invoice['Subtotal'] > 500.00):
            approval_pdf = PdfFileReader(paths['approval'])
            if "/AcroForm" in approval_pdf.trailer["/Root"]:
                approval_pdf.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})
            breakdown_pdf = PdfFileReader(paths['estimate'])
            if "/AcroForm" in breakdown_pdf.trailer["/Root"]:
                breakdown_pdf.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})
            writer.addPage(invoice_pdf.getPage(0))
            writer.addPage(approval_pdf.getPage(0))
            writer.addPage(breakdown_pdf.getPage(0))

            for i in insurances:
                ins_page = PdfFileReader(i.filename)
                if "/AcroForm" in ins_page.trailer["/Root"]:
                    ins_page.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})
                writer.appendPagesFromReader(ins_page)
                ins_page = ''

            writer.addPage(stat_dec_pdf.getPage(0))
            writer.updatePageFormFieldValues(stat_dec_pdf.getPage(0), addData)
            writer.addPage(stat_dec_pdf.getPage(1))
            
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
                if "/AcroForm" in ins_page.trailer["/Root"]:
                    ins_page.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})
                writer.appendPagesFromReader(ins_page)
                ins_page = ''
            writer.addPage(stat_dec_pdf.getPage(0))
            writer.updatePageFormFieldValues(stat_dec_pdf.getPage(0), addData)
            writer.addPage(stat_dec_pdf.getPage(1))
    elif  job.client.name == "CBRE Group Inc":
        for i in insurances:
            ins_page = PdfFileReader(i.filename)
            if "/AcroForm" in ins_page.trailer["/Root"]:
                    ins_page.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})
            writer.appendPagesFromReader(ins_page)
            ins_page = ''
        writer.addPage(stat_dec_pdf.getPage(0))
        writer.updatePageFormFieldValues(stat_dec_pdf.getPage(0), addData)
        writer.addPage(stat_dec_pdf.getPage(1))

        invoiceFile = os.path.join(accounts_folder, "Supporting Documents for " + str(job).split(' - ')[0] + ".pdf")
        with open(invoiceFile, "wb") as edited:
            writer.write(edited)
            edited.close()

        ## Check insurances expiry date
        if date.today() ==  insurances[0].expiry_date:
            return {'success': True, 'message': "Generated Successfully.\nWarning: Insurances Expire Today, Please update!"}

        return {'success': True, 'message': "Generated Successfully"}

    else:
        writer.appendPagesFromReader(invoice_pdf)

        if 'purchaseOrder' in paths:
            purchaseOrder_pdf = PdfFileReader(paths['purchaseOrder'], strict=False)
            if "/AcroForm" in purchaseOrder_pdf.trailer["/Root"]:
                    purchaseOrder_pdf.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})
            
            po = purchaseOrder_pdf.getPage(0)
            writer.addPage(po)

        for i in insurances:
            ins_page = PdfFileReader(i.filename)
            if "/AcroForm" in ins_page.trailer["/Root"]:
                    ins_page.trailer["/Root"]["/AcroForm"].update({NameObject("/NeedAppearances"): BooleanObject(True)})
            writer.appendPagesFromReader(ins_page)
            ins_page = ''

        writer.addPage(stat_dec_pdf.getPage(0))
        writer.updatePageFormFieldValues(stat_dec_pdf.getPage(0), addData)
        writer.addPage(stat_dec_pdf.getPage(1))

    invoiceFile = os.path.join(accounts_folder, "Invoice for " + str(job).split(' - ')[0] + ".pdf")
    with open(invoiceFile, "wb") as edited:
        writer.write(edited)
        edited.close()

    ## Check insurances expiry date
    if date.today() ==  insurances[0].expiry_date:
        return {'success': True, 'message': "Invoice Generated Successfully.\nWarning: Insurances Expire Today, Please update!"}

    return {'success': True, 'message': "Invoice Generated Successfully"}