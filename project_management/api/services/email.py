import graphene
import win32com.client as win32
import pythoncom
import os
import math
from datetime import date, datetime
from ..models import Job, Estimate, EstimateHeader

import sys
sys.path.append("...")
from accounts.models import CustomUser

EMAIL_STYLE="""<body style="font-size:11pt; font-family:'Calibri'; color: rgb(0,0,0)">"""
JOBS_PATH = r'C:\Users\Aurify Constructions\Aurify Dropbox\5. Projects\02 - Brookfield WR\00 New System\Jobs'

class AllocateJobEmail(graphene.Mutation):
    class Arguments:
        jobs = graphene.List(graphene.String)
        recipient = graphene.List(graphene.String)

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, jobs, recipient):
        outlook = win32.Dispatch('outlook.application', pythoncom.CoInitialize())
        count = 0

        if jobs:
            for job_id in jobs:
                job_id = int(job_id)
                job = Job.objects.get(id = job_id)

                if not job:
                    return cls(success=False, message="Could not find Job. ID = " + str(job_id))

                job_string = f"<b>Job</b>: {str(job)}<br>"
                description = f"<b>Description</b>: {job.description}<br>".replace('\n', '<br>') if job.description else ""
                priority = f"<b>Priority</b>: {job.priority} <br>" if job.priority else ""
                overdue_date = f"<b>Overdue Date</b>: {job.overdue_date.strftime('%d/%m/%y')} <br>" if job.overdue_date else ""
                special_instructions = f"<b>Special Instructions</b>: {job.special_instructions}<br>" if job.special_instructions else ""
                detailed_locaton = f"<b>Detailed Location</b>: {job.detailed_location}<br>" if job.detailed_location else ""
                requester = f"<b>Requestor</b>: {job.requester.first_name} {job.requester.last_name} - {job.requester.phone}<br>" if job.requester.first_name else ""
                poc = f"<b>POC</b>: {job.poc_name} - {job.poc_phone}<br>" if job.poc_name or job.poc_phone else ""
                alt_poc = f"<b>ALT POC</b>: {job.alt_poc_name} - {job.alt_poc_phone}<br>" if job.alt_poc_name or job.alt_poc_phone else ""
                bsafe_link = f"<a href='{job.bsafe_link}'>BSAFE Link</a><br>" if job.bsafe_link else ""
                
                # print(str(job))
                mail = outlook.CreateItem(0)

                mail.Display()
                Signature = mail.HTMLBody.replace("<p class=MsoNromal><o:p>&nbsp;</o:p></p>", "")
                Signature = mail.HTMLBody.replace("<o:p>&nbsp;</o:p>", "", 2)

                recipient_emails = ""
                for email in recipient:
                    recipient_emails += email + "; "

                addressee = "All"
                if len(recipient) == 1:
                    addressee = recipient[0].split("@")[0].capitalize()

                priority_title =  " " + job.priority if not job.priority == "" else "" 

                mail.To = recipient_emails
                mail.Subject = f"NEW{priority_title}: {str(job)}"
                
                mail.HTMLBody = f"""{EMAIL_STYLE}
                                Hi {addressee},<br><br>
                                We have received this new work request. Could you please inspect and provide details/quote<br><br>

                                {job_string}
                                {priority}
                                {overdue_date}
                                {detailed_locaton}
                                {description}
                                {special_instructions}
                                <br>
                                {requester}
                                {poc}
                                {alt_poc}
                                <br>
                                <b>Time Inspected</b>: 
                                <br>
                                <b>Time Started</b>: 
                                <br>
                                <b>Time Completed</b>: 
                                <br><br>
                                {bsafe_link}
                                
                                <br>
                                </body>
                                """ + Signature

                mail.Send()
                count += 1

                job = ""
                mail = ""

        return AllocateJobEmail(success=True, message=f"{count} Emails Sent")

class CloseOutEmail(graphene.Mutation):
    class Arguments:
        jobid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, jobid):
        outlook = win32.Dispatch('outlook.application', pythoncom.CoInitialize())
        count = 0

        job = Job.objects.get(id = jobid)
        if not job:
            return cls(success=False, message="Job Not Found")

        if not job.location:
            return cls(success=False, message="Please Ensure Job Location Is Not Empty")

        if not job.inspection_date:
            return cls(success=False, message="Please Ensure Job Inspection Date Is Not Empty")

        if not job.completion_date:
            return cls(success=False, message="Please Ensure Job Completion Date Is Not Empty")

        if job.total_hours == 0:
            return cls(success=False, message="Job's Hours must not be 0")

        if not job.scope:
            return cls(success=False, message="Please Ensure Job Scope of Works Is Not Empty")

       

        scope = "<br>" + job.scope.replace('\n', '<br>') if '\n' in job.scope else job.scope

        jobTimes = ""
        if(job.location.region.short_name == "LMA"):
            finishTime = 7 + job.total_hours
            if finishTime >= 15:
                finishTime = "15:00"
            else:
                finishTime = str( math.ceil(finishTime) ).zfill(2) + ":00"
            jobTimes = f"<b>Start Time:</b> 07:00<br><b>Finish Time</b>: {finishTime}<br>" 
        

        mail = outlook.CreateItem(0)

        mail.Display()
        Signature = mail.HTMLBody.replace("<p class=MsoNromal><o:p>&nbsp;</o:p></p>", "")
        Signature = mail.HTMLBody.replace("<o:p>&nbsp;</o:p>", "", 2)

        mail.To = job.location.region.email
        mail.CC = "Colin@aurify.com.au; James@aurify.com.au"
        mail.Subject = "Close out: " + str(job)
        
        mail.HTMLBody = f"""{EMAIL_STYLE}
        Hi {job.location.region.short_name} EMOS,<br><br>
        
        All works have been completed for PO{job.po}. Details Below:<br>
        <b>Works Commenced</b>: {job.inspection_date.strftime('%d/%m/%y')}<br>
        <b>Work Completed</b>: {job.completion_date.strftime('%d/%m/%y')}<br> 
        {jobTimes}
        <b>Total Hours</b>: {job.total_hours}<br>
        <b>Scope of Works</b>: {scope}<br>
        <br>
        </body>""" + Signature

        mail.Send()

        job.close_out_date = datetime.today()
        job.save()

        return cls(success=True, message=f"Close Out Email Sent")

class EmailQuote(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()
        selected_estimate = graphene.String()
        userId = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(cls, root, info, job_id, selected_estimate, userId):
        
        job = Job.objects.get(id=job_id)
        estimate = Estimate.objects.get(job_id=job_id, name=selected_estimate)
        estimate_headers = EstimateHeader.objects.filter(estimate_id=estimate)
        user = CustomUser.objects.get(id=userId)
        # print("Creating Quote for", job)
        # print("Selected Estimate", estimate.name)
    
        # Check to see if file already exists# Save to dropbox
        # This will have to be removed when we move to pdf only quotes
        if not os.path.exists(os.path.join(JOBS_PATH, str(job).strip(), "Estimates", str(estimate.name).strip(), 'Aurify Quote ' + str(estimate.name).strip() + '.docx')):
            return EmailQuote(success=False, message="Quote Does Not Exists")

        return EmailQuote(success=True, message=f"Quote Sent to {job.location.region.email}")



