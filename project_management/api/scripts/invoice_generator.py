# Invoice Generator
# Uses MYOB invoice and generates an invoice that is ready to submit to the client
# Adds subcontractor statement with the details that are entered into the system
import os
from datetime import date, datetime
import pymupdf
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
    
    pdf_data = {
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

    doc = pymupdf.open()

    # print(paths['approval'])
    if job.client.name == "BGIS":
        if (invoice['Subtotal'] > 500.00):

            inv = pymupdf.open(paths['invoice'])
            doc.insert_pdf(inv)
            inv.close()

            approval = pymupdf.open(paths['approval'])
            approval.select([0])
            doc.insert_pdf(approval)
            approval.close()

            estimate = pymupdf.open(paths['estimate'])
            doc.insert_pdf(estimate)
            estimate.close()

            for i in insurances:
                ins = pymupdf.open(i.filename)
                doc.insert_pdf(ins)
                ins.close()

            stat_dec = pymupdf.open("./api/scripts/StatDec.pdf")
            page = stat_dec[0]
            for field in page.widgets():
                field.text_font = "Helv"
                field.text_fontsize = 10
                if field.field_name in pdf_data:
                    field.field_value = pdf_data[field.field_name]
                    field.update()

            page=stat_dec.reload_page(page)
            stat_dec.bake()
            doc.insert_pdf(stat_dec)
            stat_dec.close()

        else:
            inv = pymupdf.open(paths['invoice'])
            doc.insert_pdf(inv)
            inv.close()

            for i in insurances:
                ins = pymupdf.open(i.filename)
                doc.insert_pdf(ins)
                ins.close()
                
            stat_dec = pymupdf.open("./api/scripts/StatDec.pdf")
            page = stat_dec[0]
            for field in page.widgets():
                field.text_font = "Helv"
                field.text_fontsize = 10
                if field.field_name in pdf_data:
                    field.field_value = pdf_data[field.field_name]
                    field.update()

            page=stat_dec.reload_page(page)
            stat_dec.bake()
            doc.insert_pdf(stat_dec)
            stat_dec.close()
            
    elif  job.client.name == "CBRE Group Inc":
        for i in insurances:
            ins = pymupdf.open(i.filename)
            doc.insert_pdf(ins)
            ins.close()
            
        stat_dec = pymupdf.open("./api/scripts/StatDec.pdf")
        page = stat_dec[0]
        for field in page.widgets():
            field.text_font = "Helv"
            field.text_fontsize = 10
            if field.field_name in pdf_data:
                field.field_value = pdf_data[field.field_name]
                field.update()

        page=stat_dec.reload_page(page)
        stat_dec.bake()
        doc.insert_pdf(stat_dec)
        stat_dec.close()

        invoiceFile = os.path.join(accounts_folder, "Supporting Documents for " + str(job).split(' - ')[0] + ".pdf")
        doc.save(invoiceFile)
        doc.close()

        ## Check insurances expiry date
        if date.today() ==  insurances[0].expiry_date:
            return {'success': True, 'message': "Generated Successfully.\nWarning: Insurances Expire Today, Please update!"}

        return {'success': True, 'message': "Generated Successfully"}

    else:
        inv = pymupdf.open(paths['invoice'])
        doc.insert_pdf(inv)
        inv.close()

        if 'purchaseOrder' in paths:
            po = pymupdf.open(paths['purchaseOrder'])
            doc.insert_pdf(po)
            po.close()

        for i in insurances:
            ins = pymupdf.open(i.filename)
            doc.insert_pdf(ins)
            ins.close()
            
        stat_dec = pymupdf.open("./api/scripts/StatDec.pdf")
        page = stat_dec[0]
        for field in page.widgets():
            field.text_font = "Helv"
            field.text_fontsize = 10
            if field.field_name in pdf_data:
                field.field_value = pdf_data[field.field_name]
                field.update()

        page=stat_dec.reload_page(page)
        stat_dec.bake()
        doc.insert_pdf(stat_dec)
        stat_dec.close()

    invoiceFile = os.path.join(accounts_folder, "Invoice for " + str(job).split(' - ')[0] + ".pdf")
    doc.save(invoiceFile)
    doc.close()

    ## Check insurances expiry date
    if date.today() ==  insurances[0].expiry_date:
        return {'success': True, 'message': "Invoice Generated Successfully.\nWarning: Insurances Expire Today, Please update!"}

    return {'success': True, 'message': "Invoice Generated Successfully"}