import shutil
import graphene

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.shared import Cm


import win32com.client as win32
import pythoncom

from datetime import datetime
import os
from ..models import Job, Estimate, EstimateHeader

import sys
sys.path.append("...")
from accounts.models import CustomUser

class CreateBGISEstimate(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()
        selected_estimate = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, job_id, selected_estimate):
        
        job = Job.objects.get(id=job_id)
        estimate = Estimate.objects.get(job_id=job_id, name=selected_estimate)

        # Check to see if file already exists
        # This will have to be removed when we move to pdf only quotes
        jobs_path = r'C:\Users\Aurify Constructions\Aurify Dropbox\5. Projects\02 - Brookfield WR\00 New System\Jobs'
        
        if os.path.exists(os.path.join(jobs_path, str(job).strip(), "Estimates", str(estimate.name).strip(), "BGIS Estimate " + str(job).split(' ')[0] + ".xlsx")):
            return cls(success=False, message="Estimate Already Exists")

        ## Create folder for the selected estimate
        try:
            os.mkdir(os.path.join(jobs_path, str(job).strip(), "Estimates", str(estimate.name).strip()))
        except FileExistsError:
            pass

        ## Save to new folder
        shutil.copy(r"C:\Users\Aurify Constructions\Documents\PM_Software\project_management\api\templates\BGIS Estimate Template.xlsx", os.path.join(jobs_path, str(job).strip(), "Estimates", str(estimate.name).strip(), "BGIS Estimate " + str(job).split(' ')[0] + ".xlsx"))

        xlApp = win32.Dispatch("Excel.Application", pythoncom.CoInitialize())
        xlApp.Visible = False
        wb = xlApp.Workbooks.Open(os.path.join(jobs_path, str(job).strip(), "Estimates", str(estimate.name).strip(), "BGIS Estimate " + str(job).split(' ')[0] + ".xlsx"))
        ws = wb.Sheets("Cost Breakdown")
        ws.Range("C5").Value = estimate.name 

        wb.Close(True)
        xlApp.Quit()
        del xlApp

        return cls(success=True, message="Estimate Created Successfully")


class CreateCompletionDocuments(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()
        
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, job_id):

        job = Job.objects.get(id=job_id)
        jobs_path = r'C:\Users\Aurify Constructions\Aurify Dropbox\5. Projects\02 - Brookfield WR\00 New System\Jobs'
        templates_path = r'C:\Users\Aurify Constructions\Documents\PM_Software\project_management\api\templates'

        if job.po == "" or job.po == None:
            return cls(success=False, message="Please ensure job has a PO Number")

        if job.scope == "" or job.scope == None:
            return cls(success=False, message="Please ensure job has a Scope of Works")

        if job.site_manager == "" or job.site_manager == None:
            return cls(success=False, message="Please ensure a site manager is selected")

        if not os.path.exists(os.path.join(jobs_path, str(job).strip())):
            return cls(success=False, message="Job folder does not exist")

        word = win32.Dispatch("Word.Application", pythoncom.CoInitialize())
        word.Visible = True

        document = None

        try:
            if not os.path.exists(os.path.join(jobs_path, str(job).strip(), "Documentation", "PO" + job.po + " - SWMS.docx")):
                if not job.site_manager == None or not job.site_manager == "":
                    # Open SWMS
                    document = word.Documents.Add(Template=templates_path + "/SWMS.dotx", NewTemplate=False, DocumentType=0)
                    
                    # Add relevant job data to bookmark positions
                    title = document.Bookmarks("ProjectTitle").Range
                    title.Text = job.title
                    project_number = document.Bookmarks("ProjectNo").Range
                    project_number.Text = job.po
                    scope = document.Bookmarks("SOW").Range
                    scope.Text = job.scope
                    address = document.Bookmarks("Address").Range
                    address.Text = job.location.getFullAddress()
                    site_manager = document.Bookmarks("SiteManager").Range
                    site_manager.Text = job.site_manager.first_name + " " + job.site_manager.last_name
                    site_manager1 = document.Bookmarks("SiteManager1").Range
                    site_manager1.Text = job.site_manager.first_name + " " + job.site_manager.last_name
                    date = document.Bookmarks("Date").Range
                    date.Text = job.commencement_date.strftime('%d/%m/%Y') if job.commencement_date and not job.commencement_date == "" else datetime.now().strftime('%d/%m/%Y')
                    date1 = document.Bookmarks("Date1").Range
                    date1.Text = job.commencement_date.strftime('%d/%m/%Y') if job.commencement_date and not job.commencement_date == "" else datetime.now().strftime('%d/%m/%Y')

                    # Remove Bookmarks
                    for bookmark in document.Bookmarks:
                        bookmark.Delete

                    # Save and close word document
                    swms_filename = os.path.join(jobs_path, str(job).strip(), "Documentation", "PO" + job.po + " - SWMS.docx")
                    document.SaveAs(swms_filename)
                    document.Close()
                else:
                    word.Quit()
                    del word
                    return cls(success=False, message="Site Manager Required for SWMS Creation")
                
            if not os.path.exists(os.path.join(jobs_path, str(job).strip(), "Documentation", "PO" + job.po + " - PRA.docx")):
                if not job.site_manager == None or not job.site_manager == "":
                    # Open PRA
                    document = word.Documents.Add(Template=templates_path + "/PRA.dotx", NewTemplate=False, DocumentType=0)
                    
                    # Add relevant job data to bookmark positions
                    site_manager = document.Bookmarks("SiteManager").Range
                    site_manager.Text = job.site_manager.first_name + " " + job.site_manager.last_name
                    project = document.Bookmarks("Project").Range
                    project.Text = "PO" + job.po + " - " + job.title
                    date = document.Bookmarks("Date").Range
                    date.Text = job.commencement_date.strftime('%d/%m/%Y') if job.commencement_date and not job.commencement_date == "" else datetime.now().strftime('%d/%m/%Y')
                    address = document.Bookmarks("Address").Range
                    address.Text = job.location.getFullAddress()

                    # Remove Bookmarks
                    for bookmark in document.Bookmarks:
                        bookmark.Delete

                    # Save and close word document
                    pra_filename = os.path.join(jobs_path, str(job).strip(), "Documentation", "PO" + job.po + " - PRA.docx")
                    document.SaveAs(pra_filename)
                    document.Close()
                else:
                    word.Quit()
                    del word
                    return cls(success=False, message="Site Manager Required for Pre-Start Risk Assessment Creation")
            
            if not os.path.exists(os.path.join(jobs_path, str(job).strip(), "Documentation", "PO" + job.po + " - SDKT.docx")):
                if not job.completion_date == "" or not job.completion_date == None:
                    # Open Service Docket
                    document = word.Documents.Add(Template=templates_path + "/SDKT.dotx", NewTemplate=False, DocumentType=0)
                    
                    # Add relevant job data to bookmark positions
                    po_number = document.Bookmarks("PONumber").Range
                    po_number.Text = job.po
                    po_number1 = document.Bookmarks("PONumber1").Range
                    po_number1.Text = job.po
                    date = document.Bookmarks("Date").Range
                    date.Text = job.completion_date.strftime('%d/%m/%Y') if job.completion_date and not job.completion_date == "" else datetime.now().strftime('%d/%m/%Y')
                    scope = document.Bookmarks("SOW").Range
                    scope.Text = job.scope
                    
                    # Remove Bookmarks
                    for bookmark in document.Bookmarks:
                        bookmark.Delete

                    # Save and close word document
                    sdkt_filename = os.path.join(jobs_path, str(job).strip(), "Documentation", "PO" + job.po + " - SDKT.docx")
                    document.SaveAs(sdkt_filename)
                    document.Close()
                else:
                    word.Quit()
                    del word
                    return cls(success=False, message="Completion Date required for Service Docket.")
        except BaseException as err:
            print(err)
            return cls(success=False, message="An Error has occured, please contact admin.")

        finally: 
            if word:
                word.Quit()
                del word

        return cls(success=True, message="Completion Documents Saved to Folder. Please fill out the SWMS and PRA")