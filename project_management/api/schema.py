import os
import shutil
import base64
import subprocess
from datetime import datetime

import graphene
from graphene import relay
from django.utils import timezone
from graphene_django import DjangoObjectType
from graphene_django.filter import DjangoFilterConnectionField
from graphql_jwt.decorators import login_required
from django.db.models import Q
from django.db import connection
from django.conf import settings

from .models import RemittanceAdvice, Insurance, Estimate, EstimateHeader, EstimateItem, Expense, Job, Location, Contractor, ContractorContact, InvoiceSetting, Client, ClientContact, Region, Invoice, Bill
from .scripts.create_completion_documents import CreateCompletionDocuments
from .scripts.email_functions import AllocateJobEmail, CloseOutEmail, EmailQuote, ExchangeEmail
from .scripts.data_extraction import ExtractRemittanceAdvice, ExtractBillDetails
from .scripts.create_quote import CreateQuote
from .scripts.file_processing import PDFToImage
from .scripts.invoice_generator import generate_invoice
from .schemas.reports import GenerateFinancialReport
from .schemas.searching import JobSearch
from accounts.models import CustomUser
from myob.models import MyobUser


import environ
env = environ.Env()
environ.Env.read_env()
MAIN_FOLDER_PATH = f"{env('SHAREPOINT_MAINTENANCE_PATH')}/Jobs"

class CustomNode(graphene.relay.Node):
    class Meta:
        name = 'Nodes'

    @staticmethod
    def to_global_id(__type, id):
        return id

class JobRelayType(DjangoObjectType):
    class Meta:
        model = Job
        interfaces = (CustomNode, )
        filter_fields = ['status']
        fields = "__all__"

class JobConnection(relay.Connection):
    class Meta:
        node = JobRelayType

class EstimateItemType(DjangoObjectType):
    class Meta:
        model = EstimateItem
        fields = '__all__'
        convert_choices_to_enum = False

    quantity = graphene.Float()
    rate = graphene.Float()
    extension = graphene.Float()
    markup = graphene.Float()
    gross = graphene.Float()

class EstimateHeaderType(DjangoObjectType):
    class Meta:
        model = EstimateHeader
        fields = '__all__'

    markup = graphene.Float()
    gross = graphene.Float()

    estimateitem_set = graphene.List(EstimateItemType)

    @classmethod
    @login_required
    def resolve_estimateitem_set(self, instance, info):
        return EstimateItem.objects.filter(header_id=instance.id).order_by('id')


class EstimateType(DjangoObjectType):
    class Meta:
        model = Estimate
        fields = '__all__'
    
    estimateheader_set = graphene.List(EstimateHeaderType)

    @classmethod
    @login_required
    def resolve_estimateheader_set(self, instance, info):
        return EstimateHeader.objects.filter(estimate_id=instance.id).order_by('id')

class RemittanceType(DjangoObjectType):
    class Meta:
        model = RemittanceAdvice
        fields = '__all__'

    amount = graphene.Float()

# Jobs
class JobType(DjangoObjectType):
    class Meta:
        model = Job
        fields = '__all__'
        filter_fields = ['po', 'sr', 'other_id', 'stage']
        convert_choices_to_enum = ['stage']
        interfaces = (CustomNode, )

    @staticmethod
    def to_global_id(type_, id):
        return id
    
    estimate_set = graphene.List(EstimateType)

    @classmethod
    @login_required
    def resolve_estimate_set(self, instance, info):
        return Estimate.objects.filter(job_id=instance.id).order_by('approval_date', 'id')
    
    date_issued = graphene.String()
    overdue_date = graphene.String()
    inspection_date = graphene.String()
    commencement_date = graphene.String()
    completion_date = graphene.String()
    close_out_date = graphene.String()

    def resolve_date_issued(self, info):
        if not self.date_issued:
            return None
        return self.date_issued.strftime('%Y-%m-%dT%H:%M')
    def resolve_overdue_date(self, info):
        if not self.overdue_date:
            return None
        return self.overdue_date.strftime('%Y-%m-%dT%H:%M')
    def resolve_inspection_date(self, info):
        if not self.inspection_date:
            return None
        return self.inspection_date.strftime('%Y-%m-%dT%H:%M')
    def resolve_commencement_date(self, info):
        if not self.commencement_date:
            return None
        return self.commencement_date.strftime('%Y-%m-%dT%H:%M')
    def resolve_completion_date(self, info):
        if not self.completion_date:
            return None
        return self.completion_date.strftime('%Y-%m-%dT%H:%M')
    def resolve_close_out_date(self, info):
        if not self.close_out_date:
            return None
        return self.close_out_date.strftime('%Y-%m-%dT%H:%M')
    
class EstimateLineInput(graphene.InputObjectType):
    id = graphene.String()
    description = graphene.String()
    quantity = graphene.Float()
    itemType = graphene.String()
    rate = graphene.Float()
    extension = graphene.Float()
    markup = graphene.Float()
    gross = graphene.Float()

class EstimateHeaderInput(graphene.InputObjectType):
    id = graphene.String()
    description = graphene.String()
    gross = graphene.Float()
    markup = graphene.Float()
    estimateitemSet = graphene.List(EstimateLineInput)

class IDInput(graphene.InputObjectType):
    id = graphene.String()

class EstimateInput(graphene.InputObjectType):
    id = graphene.String()
    name = graphene.String()
    description = graphene.String()
    price = graphene.Float()
    issue_date = graphene.String()
    approval_date = graphene.String()
    scope = graphene.String()
    quote_by = graphene.Field(IDInput)
    estimateheaderSet = graphene.List(EstimateHeaderInput)

class ClientInputType(graphene.InputObjectType):
    id = graphene.String()
    myob_uid = graphene.String()
    name = graphene.String()
    display_name = graphene.String()
    abn = graphene.String()

class LocationInputType(graphene.InputObjectType):
    id = graphene.String()
    client = graphene.String()
    client_ref = graphene.String()
    region = graphene.String()
    name = graphene.String()
    address = graphene.String()
    locality = graphene.String()
    state = graphene.String()
    postcode = graphene.String()    

class InvoiceUpdateInput(graphene.InputObjectType):
    id = graphene.String()
    myob_uid = graphene.String()
    number = graphene.String()
    amount = graphene.Float()
    date_created = graphene.Date()
    date_issued = graphene.Date()
    date_paid = graphene.Date()
    job_id = graphene.String()

class ClientContactInput(graphene.InputObjectType):
    id = graphene.String(required=False)
    first_name = graphene.String()
    last_name = graphene.String()
    position = graphene.String()
    phone = graphene.String()
    email = graphene.String()
    region = graphene.String()
    client = graphene.String()
    active = graphene.Boolean()

class JobInput(graphene.InputObjectType):
    id = graphene.String()
    po = graphene.String()
    sr = graphene.String()
    other_id = graphene.String()
    client = ClientInputType()
    location = LocationInputType()
    building = graphene.String()
    detailed_location = graphene.String()
    title = graphene.String()
    priority = graphene.String()
    date_issued = graphene.DateTime()
    requester = graphene.Field(ClientContactInput)
    poc_name = graphene.String()
    poc_phone = graphene.String()
    poc_email = graphene.String()
    alt_poc_name = graphene.String()
    alt_poc_phone = graphene.String()
    alt_poc_email = graphene.String()
    description = graphene.String()
    special_instructions = graphene.String()
    inspection_by = graphene.Field(IDInput)
    inspection_date = graphene.DateTime()
    inspection_notes = graphene.String()
    scope = graphene.String()
    work_notes = graphene.String()
    site_manager = graphene.Field(IDInput)
    commencement_date = graphene.DateTime()
    completion_date = graphene.DateTime()
    total_hours = graphene.Float()
    bsafe_link = graphene.String()
    overdue_date = graphene.DateTime()
    close_out_date = graphene.DateTime()
    work_type = graphene.String()
    opportunity_type = graphene.String()
    cancelled = graphene.Boolean()
    cancel_reason = graphene.String()
    estimate_set = graphene.List(EstimateInput)
    invoice_set = graphene.List(InvoiceUpdateInput)
    stage = graphene.String()

class CreateJob(graphene.Mutation):
    class Arguments:
        input = JobInput()

    job = graphene.Field(JobType)
    success = graphene.Boolean()
    updated = graphene.Boolean()
    message = graphene.List(graphene.String)

    @classmethod
    @login_required
    def mutate(self, root, info, input):
        print("Creating Job")

        missing = False
        updated = False
        message = []
        missingItems = ["The following are required:"]

        # Error Checking
        illegal_characters = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
        if [char for char in illegal_characters if char in input['title']]:
            return self(success=False, message=["Title can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input['building']]:
            return self(success=False, message=["Building can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input['po']]:
            return self(success=False, message=["PO can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input['sr']]:
            return self(success=False, message=["SR can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input['other_id']]:
            return self(success=False, message=["Other ID can not contain the characters:"] + illegal_characters)

        if input['client'].id == "":
            missing = True
            missingItems.append(" Client")
        if input['po'] == "" and input['sr'] == "" and input['other_id'] == "":
            missing = True
            missingItems.append(" Job Identifier")
        if input['location'].id == "":
            missing = True
            missingItems.append(" Location")
        if input['requester'].id == "":
            missing = True
            missingItems.append(" Requester")
        if input['title'] == "":
            missing = True
            missingItems.append(" Title")

        if input['po'] and input['po'][0].isdigit():
            input['po'] = f"PO{input['po']}"
        if input['sr'] and input['sr'][0].isdigit():
            input['sr'] = f"SR{input['sr']}"

        if missing:
            return self(success=False, message=missingItems)

        # Clean the input elements
        for (key, value) in input.items():
            input[key] = value.strip() if type(input[key]) == str else value

        if (input['po'] != "" and Job.objects.filter(po=input['po']).exists()) or (input['sr'] != "" and Job.objects.filter(sr=input['sr']).exists()) or (input['other_id'] != "" and Job.objects.filter(other_id=input['other_id']).exists()):
            if input['po'] != "" and Job.objects.filter(po=input['po']).exists():
                job = Job.objects.get(po=input['po'], client=Client.objects.get(id=input['client'].id))
                print("PO Found", end=' - ')
            elif input['sr'] != "" and Job.objects.filter(sr=input['sr']).exists():
                job = Job.objects.get(sr=input['sr'], client=Client.objects.get(id=input['client'].id))
                print("SR Found", end=' - ')
            elif input['other_id'] != "" and Job.objects.filter(other_id=input['other_id']).exists():
                job = Job.objects.get(other_id=input['other_id'], client=Client.objects.get(id=input['client'].id))
                print("otherID Found", end=' - ')
            
            if job:
                print("Updating " + str(job))
                old_folder_name = str(job)
                ## Only update fields that are empty
                # job.client = Client.objects.get(id=input.client_id) if not job.client else job.client
                if input['date_issued']: job.date_issued = input['date_issued'].replace(tzinfo=timezone.get_fixed_timezone(0)) if not job.date_issued else job.date_issued
                job.po = input['po'] if not job.po else job.po
                job.sr = input['sr'] if not job.sr else job.sr
                job.other_id = input['other_id'] if not job.other_id else job.other_id
                job.location = Location.objects.get(id=input['location'].id) if not job.location else job.location
                job.building = input['building'] if not job.building else job.building
                job.detailed_location = input['detailed_location'] if not job.detailed_location else job.detailed_location
                job.requester = ClientContact.objects.get(id=input['requester'].id) if not job.requester else job.requester
                job.priority = input['priority'] if not job.priority else job.priority
                job.special_instructions = input['special_instructions'] if not job.special_instructions else job.special_instructions
                job.poc_name = input['poc_name'] if not job.poc_name else job.poc_name 
                job.poc_phone = input['poc_phone'] if not job.poc_phone else job.poc_phone
                job.poc_email = input['poc_email'] if not job.poc_email else job.poc_email
                job.alt_poc_name = input['alt_poc_name'] if not job.alt_poc_name else job.alt_poc_name
                job.alt_poc_phone = input['alt_poc_phone'] if not job.alt_poc_phone else job.alt_poc_phone
                job.alt_poc_email = input['alt_poc_email'] if not job.alt_poc_email else job.alt_poc_email
                job.title = input['title'] if not job.title else job.title
                job.description = input['description'] if not job.description else job.description
                if input['overdue_date']: job.overdue_date = input['overdue_date'].replace(tzinfo=timezone.get_fixed_timezone(0)) if not input['overdue_date'] == None else job.overdue_date
                job.bsafe_link = input['bsafe_link'] if not input['bsafe_link'] == "" else job.bsafe_link
                job.save()

                # Check folder name and rename if they're different
                if old_folder_name != str(job):
                    old_folder = os.path.join(MAIN_FOLDER_PATH, old_folder_name)
                    new_folder = os.path.join(MAIN_FOLDER_PATH, str(job))
                    try:
                        os.rename(old_folder, new_folder)
                    except FileNotFoundError:
                        message.append("Folder Not Found with name: " + old_folder)

                message.append("Job found and Updated")
                updated = True

        else:
            message.append("New Job Created")

            job = Job()
            job.client = Client.objects.get(id=input['client'].id)
            if input['date_issued']: job.date_issued = input['date_issued'].replace(tzinfo=timezone.get_fixed_timezone(0))
            job.po = input['po'].strip()
            job.sr = input['sr'].strip()
            job.other_id = input['other_id'].strip()
            job.location = Location.objects.get(id=input['location'].id)
            job.building = input['building'].strip()
            job.detailed_location = input['detailed_location'].strip()
            job.requester = ClientContact.objects.get(id=input['requester'].id)
            job.priority = input['priority'].strip()
            job.special_instructions = input['special_instructions'].strip()
            job.poc_name = input['poc_name'].strip()
            job.poc_phone = input['poc_phone'].strip()
            job.poc_email = input['poc_email'].strip()
            job.alt_poc_name = input['alt_poc_name'].strip()
            job.alt_poc_phone = input['alt_poc_phone'].strip()
            job.alt_poc_email = input['alt_poc_email'].strip()
            job.title = input['title'].strip()
            job.description = input['description'].strip()
            if input['overdue_date']: job.overdue_date = input['overdue_date'].replace(tzinfo=timezone.get_fixed_timezone(0))
            job.bsafe_link = input['bsafe_link'].strip()
            job.total_hours = "0.00"
            job.save()

            ## Create new folder
            folder_name = str(job)
            new_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)

            folders = ["Photos", "Photos/Inspection", "Photos/Onsite", "Estimates", "Documentation", "Accounts", "Accounts/Aurify"]

            if not os.path.exists(new_folder):
                os.mkdir(new_folder)

            for folder in folders:
                if not os.path.exists(os.path.join(new_folder, folder)):
                    os.mkdir(os.path.join(new_folder, folder))

            print("Folder Created", new_folder)

        return self(job=job, success=True, message=message, updated=updated)

class CheckFolder(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, job_id):
        job = Job.objects.get(id=job_id)

        ## Create new folder
        folder_name = str(job)
        new_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)
        folders = ["Photos", "Photos/Inspection", "Photos/Onsite", "Estimates", "Documentation", "Accounts", "Accounts/Aurify"]

        if not os.path.exists(new_folder):
            os.mkdir(new_folder)

        for folder in folders:
            if not os.path.exists(os.path.join(new_folder, folder)):
                os.mkdir(os.path.join(new_folder, folder))

        return self(success=True, message="Folder Created")

class DeleteJob(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        job = Job.objects.get(id=id)
        if job:
            job.delete()
            return self(success=True)
        return self(success = False)

class CreateJobInMyob(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    uid = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, job_id):
        print("ID:", job_id)
        if not Job.objects.filter(id = job_id).exists():
            return self(success=False, message="Job Not Found.")

        job = Job.objects.get(id=job_id)

        if job.myob_uid:
            return self(success=True, message="Job is already linked to MYOB")
        
        if job.client.name == "BGIS" and not job.po:
            return self(success=False, message="BGIS Job needs to have PO before sending to MYOB")
        
        job_identifier = ""
        if job.po:
            job_identifier = job.po
        elif job.other_id:
            job_identifier = job.other_id

        if job_identifier == "":
            return self(success=False, message="Job Identifier Error. Please contact developer")

        job_data = {
            "identifier": job_identifier,
            "name": (job.location.name + " " + job.title)[0:30],
            "description": str(job),
            "customer_uid": job.client.myob_uid,
        }
        
        from myob.schema import CreateMyobJob
        post_response = CreateMyobJob.mutate(root, info, job_data)

        if not post_response.success:
            print("Error:", post_response.message)
            return self(success=False, message=post_response.message)
            
        job.myob_uid = post_response.uid
        job.save()

        return self(success=True, message=post_response.message, uid=post_response.uid)

class UpdateJob(graphene.Mutation):
    class Arguments:
        input = JobInput()

    job = graphene.Field(JobType)
    message = graphene.String()
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, input):
        if input['id'] == "":
            return self(success=False, message="Job ID Not Found!")

        for (key, value) in input.items():
            input[key] = value.strip() if type(input[key]) == str else value
            # input[key] = value.strip() if type(input[key]) == str else input[key]

        # Name Checking
        illegal_characters = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
        if [char for char in illegal_characters if char in input['title']]:
            message = "Title can not contain the characters: " + str(illegal_characters)
            return self(success=False, message=message)
        
        if [char for char in illegal_characters if char in input['building']]:
            message = "Building can not contain the characters: " + str(illegal_characters)
            return self(success=False, message=message)
        
        if [char for char in illegal_characters if char in input['po']]:
            message = "PO can not contain the characters: " + str(illegal_characters)
            return self(success=False, message=message)
        
        if [char for char in illegal_characters if char in input['sr']]:
            message = "SR can not contain the characters: " + str(illegal_characters)
            return self(success=False, message=message)
        
        if [char for char in illegal_characters if char in input['other_id']]:
            message = "Other ID can not contain the characters: " + str(illegal_characters)
            return self(success=False, message=message)
        
        # if Job.objects.filter(po = input.po).exists():
        #     return self(success=False)
 
        # if Job.objects.filter(sr = input.sr).exists():
        #     return self(success=False)
 
        # if Job.objects.filter(other_id = input.other_id).exists():
        #     return self(success=False)

        job = Job.objects.get(id=input.id)

        email_update_required = not job == input
        old_job_str = str(job)
        if job.overdue_date: old_job_date = job.overdue_date.replace(tzinfo=timezone.get_current_timezone())

        job.client = None if input['client'] == None else Client.objects.get(id=input['client'].id)
        job.date_issued = None if input['date_issued'] == None else input['date_issued'].replace(tzinfo=timezone.get_fixed_timezone(0))
        job.po = input['po'].strip()
        job.sr = input['sr'].strip()
        job.other_id = input['other_id'].strip()
        job.location = None if input['location'] == None else Location.objects.get(id=input['location'].id)
        job.building = input['building'].strip()
        job.detailed_location = input['detailed_location']
        job.requester = None if input['requester'] == None or input['requester'].id == None else ClientContact.objects.get(id=input['requester'].id)
        job.priority = input['priority'].strip()
        job.special_instructions = input['special_instructions'].strip()
        job.poc_name = input['poc_name'].strip()
        job.poc_phone = input['poc_phone'].strip()
        job.poc_email = input['poc_email'].strip()
        job.alt_poc_name = input['alt_poc_name'].strip()
        job.alt_poc_phone = input['alt_poc_phone'].strip()
        job.alt_poc_email = input['alt_poc_email'].strip()
        job.title = input['title'].strip()
        job.description = input['description'].strip()
        job.inspection_by = None if input['inspection_by'] == None or input['inspection_by'].id == None else CustomUser.objects.get(id=input['inspection_by'].id)
        job.inspection_date = None if input['inspection_date'] == None else input['inspection_date'].replace(tzinfo=timezone.get_fixed_timezone(0))
        job.inspection_notes = input['inspection_notes'].strip()
        job.scope = input['scope'].strip()
        job.site_manager = None if input['site_manager'] == None or input['site_manager'].id == None else CustomUser.objects.get(id=input['site_manager'].id)
        job.commencement_date = None if input['commencement_date'] == None else input['commencement_date'].replace(tzinfo=timezone.get_fixed_timezone(0))
        job.completion_date = None if input['completion_date'] == None else input['completion_date'].replace(tzinfo=timezone.get_fixed_timezone(0))
        job.total_hours = 0.0 if input['total_hours'] == "" else str(input['total_hours'])
        job.work_notes = input['work_notes'].strip()
        job.overdue_date = None if input['overdue_date'] == None else input['overdue_date'].replace(tzinfo=timezone.get_fixed_timezone(0))
        job.close_out_date = None if input['close_out_date'] == None else input['close_out_date'].replace(tzinfo=timezone.get_fixed_timezone(0))
        job.work_type = input['work_type'].strip()
        job.opportunity_type = input['opportunity_type'].strip()
        job.cancelled = input['cancelled']
        job.cancel_reason = input['cancel_reason'].strip()
        job.bsafe_link = input['bsafe_link'].strip()
        job.save()

        # Change Calendar Event
        if email_update_required:
            email = ExchangeEmail()
            email.connect()
            if email.email_account.calendar.filter(subject=old_job_str).exists():
                email.update_calendar_event(old=old_job_str, job=job,
                                            old_date=old_job_date, 
                                            new_date=job.overdue_date.replace(tzinfo=timezone.get_current_timezone()))

        if old_job_str != str(job):
            old_folder = os.path.join(MAIN_FOLDER_PATH, old_job_str)
            new_folder = os.path.join(MAIN_FOLDER_PATH, str(job))
            try:
                os.rename(old_folder, new_folder)
            except FileNotFoundError:
                pass

        message = ""
        # Update the Job Estimate
        for est in input['estimate_set']:

            if [char for char in illegal_characters if char in est.name]:
                return self(success=False, message="Estimate name can not contain the characters:" + str(illegal_characters))


            # Get existing estimate for that job with the same name
            print("Saving Estimate:", est.name)
            if Estimate.objects.filter(job_id=job, id=est.id).exists():
                estimate = Estimate.objects.get(job_id=job, id=est.id)
            else:
                print("Creating New")
                estimate = Estimate.objects.create(job_id=job, name=est.name, quote_by=CustomUser.objects.get(id=est.quote_by.id))
                try:
                    if not os.path.exists(os.path.join(MAIN_FOLDER_PATH, str(job).strip(), "Estimates", str(estimate.name).strip())):
                        os.mkdir(os.path.join(MAIN_FOLDER_PATH, str(job).strip(), "Estimates", str(estimate.name).strip()))
                except Exception as e:
                    print("File Name Error for:", str(job).strip())
                    message = "Job Saved. There is an error with the folder name, please correct in file system."

            # If the estimate name is changed, update the existing folder name
            if est.name != estimate.name:
                current_estimate_folder = os.path.join(MAIN_FOLDER_PATH, str(job).strip(), "Estimates", str(estimate.name).strip())
                new_estimate_folder = os.path.join(MAIN_FOLDER_PATH, str(job).strip(), "Estimates", str(est.name).strip())
                if os.path.exists(current_estimate_folder):
                    os.rename(current_estimate_folder, new_estimate_folder)

            # Update the estimate data
            estimate.job_id = job
            estimate.name = est.name.strip()
            estimate.description = est.description
            estimate.price = est.price
            estimate.quote_by = CustomUser.objects.get(id=est.quote_by.id)
            estimate.issue_date = None if not est.issue_date or est.issue_date == "" else est.issue_date
            estimate.approval_date = None if not est.approval_date or est.approval_date == "" else est.approval_date
            estimate.scope = "" if not est.scope else est.scope
            estimate.save()

            # Update the headers
            if est.estimateheaderSet:
                for header in est.estimateheaderSet:
                    estimate_header = EstimateHeader.objects.get(id=header.id)
                    estimate_header.estimate_id = estimate
                    estimate_header.description = header.description.strip()
                    estimate_header.markup = header.markup
                    estimate_header.gross = header.gross
                    estimate_header.save()

                    if not header.estimateitemSet:
                        continue

                    for item in header.estimateitemSet:
                        estimate_item = EstimateItem.objects.get(id=item.id)
                        estimate_item.header_id = estimate_header
                        estimate_item.description = item.description.strip()
                        estimate_item.quantity = item.quantity
                        estimate_item.item_type = item.itemType
                        estimate_item.rate = item.rate
                        estimate_item.extension = item.extension
                        estimate_item.markup = item.markup
                        estimate_item.gross = item.gross
                        estimate_item.save()

        job.save() # Save again to update the status

        if message == "":
            message = "Job Updated Successfully"

        return self(success=True, job=job, message=message)
        
class CreateEstimate(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()
        estimate = EstimateInput()

    success = graphene.Boolean()
    message = graphene.String()
    estimate = graphene.Field(EstimateType)

    @classmethod
    @login_required
    def mutate(self, root, info, job_id, estimate):

        job = Job.objects.get(id=job_id)

        # Name checking
        illegal_characters = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
        if [char for char in illegal_characters if char in estimate.name]:
            return self(success=False, message=["Estimate name can not contain the characters:"] + illegal_characters)

        try:
            os.mkdir(os.path.join(MAIN_FOLDER_PATH, str(job).strip(), "Estimates", str(estimate.name).strip()))
        except Exception as e: 
            print("Failed to create folder", os.path.join(MAIN_FOLDER_PATH, str(job).strip(), "Estimates", str(estimate.name).strip()))
            print(e)
            return self(success=False, message="Folder Cannot Be Found/Created. Please Check OneDrive")

        est = Estimate()
        est.quote_by = CustomUser.objects.get(id=estimate.quote_by.id)
        est.job_id = job
        est.name = estimate.name.strip()
        est.price = str(estimate.price)
        est.description = estimate.description.strip()
        est.scope = estimate.scope
        est.save()

        # If an existing estimate has been copied
        if len(estimate.estimateheaderSet) > 0:
            # Create the estimate headers
            for header in estimate.estimateheaderSet:
                estHeader = EstimateHeader()
                estHeader.estimate_id = est
                estHeader.description = header.description.strip()
                estHeader.gross = header.gross
                estHeader.markup = header.markup
                estHeader.save()

                # Create the estimate items
                for item in header.estimateitemSet:
                    estItem = EstimateItem()
                    estItem.header_id = estHeader
                    estItem.description = item.description.strip()
                    estItem.quantity = item.quantity
                    estItem.item_type = item.itemType
                    estItem.rate = item.rate
                    estItem.extension = item.extension
                    estItem.markup = item.markup
                    estItem.gross = item.gross
                    estItem.save()

        return self(success=True, estimate=est)

class UpdateEstimate(graphene.Mutation):
    class Arguments:
        id = graphene.String()
        name = graphene.String()
        description = graphene.String()
        price = graphene.String()
        issue_date = graphene.Date()
        approval_date = graphene.Date()
        quote_by = graphene.String()

    estimate = graphene.Field(EstimateType)
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id, name, description, price, issue_date, approval_date, quote_by):

        # Name Checking
        illegal_characters = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
        if [char for char in illegal_characters if char in estimate.name]:
            return self(success=False, message=["Estimate name can not contain the characters:"] + illegal_characters)

        estimate = Estimate.objects.get(id=id)
        estimate.name = name.strip()
        estimate.description = description
        estimate.price = price
        estimate.issue_date = None if issue_date == datetime.date(1970, 1, 1) else issue_date
        estimate.approval_date = None if approval_date == datetime.date(1970, 1, 1) else approval_date
        estimate.quote_by = CustomUser.objects.get(pk=quote_by)
        estimate.save()
                
        return UpdateEstimate(estimate=estimate, success=True)

class CreateEstimateHeader(graphene.Mutation):
    class Arguments:
        estimate_id = graphene.String()

    success = graphene.Boolean()
    estimate_header = graphene.Field(EstimateHeaderType)

    @classmethod
    @login_required
    def mutate(self, root, info, estimate_id):
        estHeader = EstimateHeader()
        estHeader.estimate_id = Estimate.objects.get(id=estimate_id)
        estHeader.save()

        estItem = EstimateItem()
        estItem.header_id = estHeader
        estItem.save()

        return self(success=True, estimate_header=estHeader)
    
class DeleteEstimateHeader(graphene.Mutation):
    class Arguments:
        header_id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, header_id):
        estimateItems = EstimateItem.objects.filter(header_id = header_id)
        for item in estimateItems:
            item.delete()

        estHeader = EstimateHeader.objects.get(id=header_id)
        estHeader.delete()

        return self(success=True)
    
class CreateEstimateItem(graphene.Mutation):
    class Arguments:
        header_id = graphene.String()

    success = graphene.Boolean()
    estimate_item = graphene.Field(EstimateItemType)

    @classmethod
    @login_required
    def mutate(self, root, info, header_id):
        estimate_item = EstimateItem()
        estimate_item.header_id = EstimateHeader.objects.get(id=header_id)
        estimate_item.save()
        
        return self(success=True, estimate_item=estimate_item)
    
class DeleteEstimateItem(graphene.Mutation):
    class Arguments:
        item_id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, item_id):
        estimate_item = EstimateItem.objects.get(id=item_id)
        estimate_item.delete()
        
        return self(success=True)

class DeleteEstimate(graphene.Mutation):
    ok = graphene.Boolean()

    class Arguments:
        id = graphene.ID()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        estimate = Estimate.objects.get(id=id)

        if os.path.exists(os.path.join(MAIN_FOLDER_PATH, str(estimate.job_id), "Estimates", str(estimate.name))):
            shutil.rmtree(os.path.join(MAIN_FOLDER_PATH, str(estimate.job_id), "Estimates", str(estimate.name)))

        estimate.delete()

        return self(ok=True)

class ContractorType(DjangoObjectType):
    class Meta:
        model = Contractor
        fields = '__all__'

class ClientType(DjangoObjectType):
    class Meta:
        model = Client
        fields = '__all__'

def create_default_client_invoice_settings(client):
    defaultInvoiceSettings = [
        {'name': "Invoice", "file_location": "Accounts", 'rule': "N/A", "active": True, "default": True},
        {'name': "Insurances", "file_location": "Insurances", 'rule': "N/A", "active": True, "default": True},
        {'name': "Statutory Declaration", "file_location": "System", 'rule': "N/A", "active": True, "default": True}
    ]
    for setting in defaultInvoiceSettings:
        invoice_setting = InvoiceSetting()
        invoice_setting.client = client
        invoice_setting.name = setting['name']
        invoice_setting.file_location = setting['file_location']
        invoice_setting.rule = setting['rule']
        invoice_setting.active = setting['active']
        invoice_setting.default = setting['default']
        invoice_setting.save()

class CreateClient(graphene.Mutation):
    class Arguments:
        details = ClientInputType()

    success = graphene.Boolean()
    message = graphene.String()
    client = graphene.Field(ClientType)

    @classmethod
    @login_required
    def mutate(self, root, info, details):
        if(Client.objects.filter(name=details.name).exists() or Client.objects.filter(abn=details.abn).exists()):
            return self(success=False, message="Client Already Exists")
        
        import myob.schema as myob
        response = myob.CreateCustomer.mutate(root, info, details)

        if response.success:
            client = Client()
            client.myob_uid = response.myob_uid
            client.name = details.name
            client.abn = details.abn
            client.save()

            create_default_client_invoice_settings(client)

            return self(success=True, message=response.message, client=client)
        
        return self(success=False, message=response.message)

class UpdateClient(graphene.Mutation):
    class Arguments:
        details = ClientInputType()

    success = graphene.Boolean()
    message = graphene.String()
    client = graphene.Field(ClientType)

    @classmethod
    @login_required
    def mutate(self, root, info, details):
        if not Client.objects.filter(id=details.id).exists():
            return self(success=False, message="Client Not Found")
        
        # Prepare new client object
        client = Client.objects.get(id=details.id)
        client.name = details.name
        client.display_name = details.display_name
        client.abn = details.abn

        import myob.schema as myob
        myob_update = myob.UpdateCustomer.mutate(root, info, client)

        if myob_update.success:
            client.save()
            return self(success=True, message="Client Successfully Updated", client=client)
        
        return self(success=False, message=myob_update.message)

class DeleteClient(graphene.Mutation):
    class Arguments:
        id = graphene.String()
 
    ok = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        client = Client.objects.get(id=id)
        client.delete()
        return self(ok=True)

class LocationType(DjangoObjectType):
    class Meta:
        model = Location
        fields = '__all__'



class CreateLocation(graphene.Mutation):
    class Arguments:
        client = graphene.String()
        new_location = LocationInputType()

    location = graphene.Field(LocationType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, client, new_location):
        
        if(Location.objects.filter(client = Client.objects.get(id=client), name = new_location.name).exists()):
            return self(success=False, message="Location Already Exists")

        location = Location()
        location.client = Client.objects.get(id=client)
        location.client_ref = "{:0>4}".format(new_location.client_ref)
        location.region = Region.objects.get(id=new_location.region)
        location.name = new_location.name
        location.address = new_location.address
        location.locality = new_location.locality
        location.state = new_location.state
        location.postcode = new_location.postcode
        location.save()

        return self(location=location, success=True, message="Location Successfully Created")
    
class UpdateLocation(graphene.Mutation):
    class Arguments:
        client = graphene.String()
        locations = graphene.List(LocationInputType)

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, client, locations):
        for loc in locations:
            location = Location.objects.get(id=loc.id)
            location.client = Client.objects.get(id=client)
            location.client_ref = "{:0>4}".format(loc.client_ref)
            location.region = Region.objects.get(id=loc.region)
            location.name = loc.name
            location.address = loc.address
            location.locality = loc.locality
            location.state = loc.state
            location.postcode = loc.postcode
            location.save()

        return self(success=True, message="Locations Updated Successfully")    
    
class DeleteLocation(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        location = Location.objects.get(id=id)
        if location:
            location.delete()
            return self(success=True)
        
        return self(success=False)

class RegionType(DjangoObjectType):
    class Meta:
        model = Region
        fields = '__all__'

class RegionInput(graphene.InputObjectType):
    id = graphene.String()
    name = graphene.String()
    shortName = graphene.String()
    email = graphene.String()
    billToAddress = graphene.String()

class CreateRegion(graphene.Mutation):
    class Arguments:
        client = graphene.String()
        region = RegionInput()

    region = graphene.Field(RegionType)
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, client, region):
        client_region = Region()
        client_region.client = Client.objects.get(id=client)
        client_region.short_name = region.shortName.strip()
        client_region.name = region.name.strip()
        client_region.email = region.email.strip()
        client_region.bill_to_address = region.billToAddress.strip()

        client_region.save()
        return self(success=True, region=client_region)

class UpdateRegion(graphene.Mutation):
    class Arguments:
        regions = graphene.List(RegionInput)
        client = graphene.String()

    # client_region = graphene.Field(RegionType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, regions, client):
        for region in regions:
            if not Region.objects.filter(id=region.id).exists():
                return self(success=False, message="Error Finding Region")
            
            client_region = Region.objects.get(id=region.id)
            client_region.client = Client.objects.get(id=client)
            client_region.short_name = region.shortName.strip()
            client_region.name = region.name.strip()
            client_region.email = region.email.strip()
            client_region.bill_to_address = region.billToAddress.strip()
            client_region.save()

        return self(success=True)

class DeleteRegion(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        client_region = Region.objects.get(id=id)

        if not client_region:
            return self(success=False) 

        client_region.delete()
        return self(success=True)


class ContractorContactType(DjangoObjectType):
    class Meta:
        model = ContractorContact
        fields = '__all__'

class ClientContactType(DjangoObjectType):
    class Meta:
        model = ClientContact
        fields = '__all__'

class CreateContact(graphene.Mutation):
    class Arguments:
        contact = ClientContactInput()
        client = graphene.String()
         
    client_contact = graphene.Field(ClientContactType)
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, contact, client):
        if ClientContact.objects.filter(first_name=contact.first_name, last_name=contact.last_name, client=Client.objects.get(id=client)).exists():
            return self(success=False, message="Contact Already Exists")
            
        client_contact = ClientContact()
        client_contact.first_name = contact.first_name.strip()
        client_contact.last_name = contact.last_name.strip()
        client_contact.position = contact.position.strip()
        client_contact.client = Client.objects.get(id=client)
        client_contact.active = True

        # Format Phone Input
        contact.phone = contact.phone.replace("+61", "0").strip() 
        if len(contact.phone) > 8:
            client_contact.phone = "{} {} {}".format(contact.phone.replace(" ","")[0:4], contact.phone.replace(" ","")[4:7], contact.phone.replace(" ","")[7:])
        else:
            client_contact.phone = "{} {}".format(contact.phone.replace(" ","")[0:4], contact.phone.replace(" ","")[4:])
        
        client_contact.email = contact.email.lower().strip()
        if not contact.region == '': client_contact.region = Region.objects.get(id=contact.region)
        client_contact.save()
        return self(success=True, client_contact=client_contact)

class UpdateContact(graphene.Mutation):
    class Arguments:
        contacts = graphene.List(ClientContactInput)
        client = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, contacts, client):
        for contact in contacts:
            client_contact = ClientContact(id=contact.id)
            client_contact.client = Client.objects.get(id=client)
            client_contact.first_name = contact.first_name.strip()
            client_contact.last_name = contact.last_name.strip()
            client_contact.position = contact.position.strip()
            client_contact.phone = contact.phone.strip()
            client_contact.email = contact.email.strip()
            if contact.region: client_contact.region = Region.objects.get(id=contact.region)
            client_contact.active = contact.active
            client_contact.save()

        return self(success=True, message="Contacts Updated")    

class DeleteContact(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        if not ClientContact.objects.filter(id=id).exists():
            return self(success=False)

        client_contact = ClientContact.objects.get(id=id)
        client_contact.delete()
        return self(success=True)

class ContractorContactInput(graphene.InputObjectType):
    id = graphene.String()
    location = graphene.Int()
    contact_name = graphene.String()
    address = graphene.String()
    locality = graphene.String()
    state = graphene.String()
    postcode = graphene.String()
    country = graphene.String()
    phone1 = graphene.String()
    phone2 = graphene.String()
    phone3 = graphene.String()
    fax = graphene.String()
    email = graphene.String()
    website = graphene.String()

class ContractorInput(graphene.InputObjectType):
    id = graphene.String(required=False)
    myob_uid = graphene.String()
    name = graphene.String()
    abn = graphene.String()
    bsb = graphene.String()
    bank_account_name = graphene.String()
    bank_account_number = graphene.String()
    contacts = graphene.List(ContractorContactInput)

class CreateContractor(graphene.Mutation):
    class Arguments:
        contractor = ContractorInput()
         
    success = graphene.Boolean()
    message = graphene.String()
    contractor = graphene.Field(ContractorType)

    @classmethod
    @login_required
    def mutate(self, root, info, contractor):
        if Contractor.objects.filter(abn=contractor.abn).exists():
            return self(success=False, message="Contractor Already Exists. Check ABN")
        
        from myob.schema import GetSuppliers, CreateSupplier, UpdateSupplier
        contractor_check = f"BuyingDetails/ABN eq '{contractor.abn.strip()}'"
        existing_contractor = GetSuppliers.mutate(root, info, contractor_check)
        print(existing_contractor)

        if len(existing_contractor.supplier) > 0:
            existing = existing_contractor.supplier[0]
            
            new_contractor = Contractor()
            new_contractor.myob_uid = existing['UID']
                
            if not existing['CompanyName']:
                new_contractor.myob_uid = contractor['name']
            else:
                new_contractor.name = existing['CompanyName']

            if not existing['BuyingDetails']['ABN']:
                new_contractor.abn = contractor.abn.strip()
            else:
                new_contractor.abn = existing['BuyingDetails']['ABN']

            if not existing['PaymentDetails']['BSBNumber']:
                new_contractor.bsb = contractor['bsb']
            else:   
                new_contractor.bsb = existing['PaymentDetails']['BSBNumber']

            if not existing['PaymentDetails']['BankAccountName']:
                new_contractor.bank_account_name = contractor['bank_account_name']
            else:
                new_contractor.bank_account_name = existing['PaymentDetails']['BankAccountName']

            if not existing['PaymentDetails']['BankAccountNumber']:
                new_contractor.bank_account_number = contractor['bank_account_number'].strip()
            else:
                new_contractor.bank_account_number = existing['PaymentDetails']['BankAccountNumber']

            update = UpdateSupplier.mutate(root, info, new_contractor, existing)

            if update.success:
                new_contractor.save()

                if len(existing['Addresses']) == 0:
                    contact_addresses = []
                    for i, contact in enumerate(contractor.contacts):
                        # Create new contractor contact
                        new_contractor_contact = ContractorContact()
                        new_contractor_contact.company = new_contractor
                        new_contractor_contact.location = i
                        new_contractor_contact.contact_name = contact.contact_name.strip()
                        new_contractor_contact.address = contact.address.strip()
                        new_contractor_contact.locality = contact.locality.strip()
                        new_contractor_contact.state = contact.state.strip()
                        new_contractor_contact.postcode = contact.postcode.strip()
                        new_contractor_contact.country = contact.country.strip()
                        new_contractor_contact.phone1 = contact.phone1.strip()
                        new_contractor_contact.phone2 = contact.phone2.strip()
                        new_contractor_contact.phone3 = contact.phone3.strip()
                        new_contractor_contact.fax = contact.fax.strip()
                        new_contractor_contact.email = contact.email.strip()
                        new_contractor_contact.website = contact.website.strip()
                        new_contractor_contact.save()

                        # Create list to post to myob
                        contact_addresses.append({
                            'Location': i,
                            'ContactName': contact.contact_name.strip(),
                            'Street': contact.address.strip(),
                            'City': contact.locality.strip(),
                            'State': contact.state.strip(),
                            'Postcode': contact.postcode.strip(),
                            'Country': contact.country.strip(),
                            'Phone1': contact.phone1.strip(),
                            'Phone2': contact.phone2.strip(),
                            'Phone3': contact.phone3.strip(),
                            'Fax': contact.fax.strip(),
                            'Email': contact.email.strip(),
                            'Website': contact.website.strip(),
                        })
                else:
                    # Grab from myob
                    for i, contact in enumerate(existing['Addresses']):
                        new_contractor_contact = ContractorContact()
                        new_contractor_contact.company = new_contractor
                        new_contractor_contact.location = i
                        new_contractor_contact.contact_name = contact['ContactName']
                        new_contractor_contact.address = contact['Street']
                        new_contractor_contact.locality = contact['City']
                        new_contractor_contact.state = contact['State']
                        new_contractor_contact.postcode = contact['PostCode']
                        new_contractor_contact.country = contact['Country']
                        new_contractor_contact.phone1 = contact['Phone1']
                        new_contractor_contact.phone2 = contact['Phone2']
                        new_contractor_contact.phone3 = contact['Phone3']
                        new_contractor_contact.fax = contact['Fax']
                        new_contractor_contact.email = contact['Email']
                        new_contractor_contact.website = contact['Website']
                        new_contractor_contact.save()

                return self(success=True, message="Contractor Existed in MYOB. Successfully Created & Updated in MYOB")
                
            return self(success=False, message="Failed to Create/Update Myob Contractor")
                # if not response.status_code == 200:
                #     print(response.text)
                #     print("MYOB Update Unsuccessful")

        create = CreateSupplier.mutate(root, info, contractor)
        if create.success:
            new_contractor = Contractor()
            new_contractor.myob_uid = create.myob_uid
            new_contractor.name = contractor.name.strip()
            new_contractor.abn = contractor.abn.strip()
            new_contractor.bsb = contractor.bsb.strip()
            new_contractor.bank_account_name = contractor.bank_account_name.strip()
            new_contractor.bank_account_number = contractor.bank_account_number.strip()
            new_contractor.save()

            for i, contact in enumerate(contractor.contacts):
                new_contractor_contact = ContractorContact()
                new_contractor_contact.company = new_contractor
                new_contractor_contact.location = i
                new_contractor_contact.contact_name = contact.contact_name.strip()
                new_contractor_contact.address = contact.address.strip()
                new_contractor_contact.locality = contact.locality.strip()
                new_contractor_contact.state = contact.state.strip()
                new_contractor_contact.postcode = contact.postcode.strip()
                new_contractor_contact.country = contact.country.strip()
                new_contractor_contact.phone1 = contact.phone1.strip()
                new_contractor_contact.phone2 = contact.phone2.strip()
                new_contractor_contact.phone3 = contact.phone3.strip()
                new_contractor_contact.fax = contact.fax.strip()
                new_contractor_contact.email = contact.email.strip()
                new_contractor_contact.website = contact.website.strip()
                new_contractor_contact.save()

            return self(success=True, contractor=new_contractor)
        
        return self(success=False, message=create.message)
    
class UpdateContractor(graphene.Mutation):
    class Arguments:
        contractor = ContractorInput()
        
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, contractor):
        from myob.schema import UpdateSupplier

        cont = Contractor.objects.get(id = contractor['id'])
        cont.name = contractor['name']
        cont.abn = contractor['abn']
        cont.bsb = contractor['bsb']
        cont.bank_account_name = contractor['bank_account_name']
        cont.bank_account_number = contractor['bank_account_number']

        update = UpdateSupplier.mutate(root, info, contractor)

        if update.success:
            cont.save()

            return self(success=True, message="Contractor Successfully Updated")

        return self(success=False, message=update.message)

class UpdateContractors(graphene.Mutation):
    class Arguments:
        contractors = graphene.List(ContractorInput)
        
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, contractors):
        from myob.schema import UpdateSupplier
        
        errors = []
        for contractor in contractors:
            cont = Contractor.objects.get(id = contractor['id'])
            cont.name = contractor['name']
            cont.abn = contractor['abn']
            cont.bsb = contractor['bsb']
            cont.bank_account_name = contractor['bank_account_name']
            cont.bank_account_number = contractor['bank_account_number']

            update = UpdateSupplier.mutate(root, info, contractor)

            if update.success:
                cont.save()
            else:
                errors.append(contractor)


        if len(errors) == 0:
            return self(success=True, message="Contractor Successfully Updated")

        print(errors)
        return self(success=False, message="Error updating some contractors. Please Contact Developer for additional details.")


class DeleteContractor(graphene.Mutation):
    class Arguments:
        id = graphene.String()
    
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        contractor = Contractor.objects.get(id=id)
        contacts = ContractorContact.objects.filter(company=contractor)

        for contact in contacts:
            contact.delete()

        if not contractor:
            return self(success=False)
        
        contractor.delete()
        return self(success=True)

class InvoiceType(DjangoObjectType):
    class Meta:
        model = Invoice
        fields = '__all__'

class BillType(DjangoObjectType):
    class Meta:
        model = Bill
        fields = '__all__'

    amount = graphene.Float()

class BillInput(graphene.InputObjectType):
    id = graphene.String()
    myobUid = graphene.String()
    supplier = ContractorType()
    job = JobType()
    contractor = graphene.String()
    invoiceNumber = graphene.String()
    invoiceDate = graphene.Date()
    processDate = graphene.Date()
    amount = graphene.Decimal()
    billType = graphene.String()
    thumbnailPath = graphene.String()
    filePath = graphene.String()


class CreateBill(graphene.Mutation):
    class Arguments:
        jobId = graphene.String()
        newBill = BillInput()
        attachment = graphene.String()
        attachmentName = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    bill = graphene.Field(BillType)

    @classmethod
    @login_required
    def mutate(self, root, info, jobId, newBill, attachment, attachmentName): 
        from myob.schema import CreateMyobBill

        job = Job.objects.get(id=jobId)
        supplier = Contractor.objects.get(id=newBill['contractor'])

        # Check to see if bill already exists in the system
        if Bill.objects.filter(supplier=supplier, invoice_number=newBill['invoiceNumber'], invoice_date=newBill['invoiceDate']).exists():
            print(Bill.objects.get(supplier=supplier, invoice_number=newBill['invoiceNumber'], invoice_date=newBill['invoiceDate']).id)
            return self(success=False, message="Bill Already Exists")

        # Ensure Job is in MYOB
        if not job.myob_uid:
            res = CreateJobInMyob.mutate(root, info, job.id)
            if not res.success:
                return self(success=False, message="Please sync job with MYOB before creating invoice!")

            job.myob_uid = res.uid
            job.save()        

        folder_name = str(job)
        job_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)

        if not os.path.exists(job_folder):
            return self(success=False, message="Job Folder Does Not Exist")

        accounts_folder = os.path.join(job_folder, "Accounts", supplier.name)

        if not os.path.exists(accounts_folder):
            os.mkdir(accounts_folder)
        
        # Read PDF and write to file
        pdf = base64.b64decode(attachment, validate=True)
        with open(os.path.join(accounts_folder, attachmentName), 'wb') as f:
            f.write(pdf)

        print("Creating Bill")

        bill = Bill()
        bill.job = job
        bill.supplier = supplier
        bill.amount = newBill['amount']
        bill.invoice_date = newBill['invoiceDate']
        bill.invoice_number = newBill['invoiceNumber']
        bill.bill_type = newBill['billType']
        bill.thumbnail_path = newBill['thumbnailPath']
        bill.file_path = os.path.join(accounts_folder, attachmentName)

        create_bill = CreateMyobBill.mutate(root, info, str(job), job.myob_uid, supplier.myob_uid, newBill, attachment, attachmentName)
        bill.myob_uid = create_bill.uid

        if not create_bill.success:
            print(create_bill.message)
            return self(success=False, message="Bill could not be created")
                
        bill.save()
        return self(success=True, message="Bill Successfully Created", bill=bill)
    
class UpdateBill(graphene.Mutation):
    class Arguments:
        bill = BillInput()

    success = graphene.Boolean()
    message = graphene.String()
    bill = graphene.Field(BillType)

    @classmethod
    @login_required
    def mutate(self, root, info, bill):
        if not Bill.objects.filter(id = bill.id).exists():
            return self(success=False, message="Bill can not be found.")

        b = Bill.objects.get(id=bill.id)
        if bill.job: b.job = Job.objects.get(po=bill.job)
        if bill.myobUid: b.myob_uid = bill.myobUid
        if bill.contractor: b.supplier = Contractor.objects.get(name=bill.contractor)
        if bill.processDate: b.process_date = bill.processDate
        if bill.amount: b.amount = str(bill.amount)
        if bill.invoiceDate: b.invoice_date = bill.invoiceDate
        if bill.invoiceNumber: b.invoice_number = bill.invoiceNumber
        if bill.thumbnailPath: b.thumbnail_path = bill.thumbnailPath
        b.save()

        return self(success=True, message="Bill Successfully Updated", bill=b)

class DeleteBill(graphene.Mutation):
    class Arguments:
        id = graphene.ID()
    
    ok = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        bill = Bill.objects.get(id=id)
        bill.delete()
        return self(ok=True)

class ExpenseType(DjangoObjectType):
    class Meta:
        model = Expense
        fields = '__all__'

    amount = graphene.Float()

class ExpenseInput(graphene.InputObjectType):
    id = graphene.String()
    myobUid = graphene.String()
    employee = graphene.Field(IDInput)
    job = graphene.String()
    vendor = graphene.String()
    locale = graphene.String()
    expenseDate = graphene.Date()
    processDate = graphene.Date()
    amount = graphene.Float()
    thumbnailPath = graphene.String()

class CreateExpense(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        jobId = graphene.String()
        newExpense = ExpenseInput()

    success = graphene.Boolean()
    message = graphene.String()
    expense = graphene.Field(ExpenseType)

    @classmethod
    @login_required
    def mutate(self, root, info, newExpense, jobId, uid): 
        job = Job.objects.get(po=jobId)

        expense = Expense()
        expense.job = job
        expense.myob_uid = uid
        expense.vendor = newExpense['vendor']
        expense.locale = newExpense['locale']
        expense.employee = CustomUser.objects.get(id=newExpense['employee'].id)
        expense.process_date = datetime.date.today()
        expense.amount = newExpense['amount'], 2
        expense.expense_date = newExpense['expenseDate']
        expense.thumbnail_path = newExpense['thumbnailPath']
        expense.save()

        return self(success=True, message="Expense Successfully Created", expense=expense)
    

class DeleteInvoice(graphene.Mutation):
    ok = graphene.Boolean()

    class Arguments:
        id = graphene.ID()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        invoice = Invoice.objects.get(id=id)
        invoice.delete()
        return self(ok=True)


class CreateInvoice(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    invoice = graphene.Field(InvoiceType)

    @classmethod
    @login_required
    def mutate(self, root, info, job_id):

        job = Job.objects.get(id=job_id) if Job.objects.filter(id=job_id).exists() else None 
        print("Creating Invoice for {job.client.display_name} - {str(job)}")

        # Error Checking
        if not job:
            return self(success=False, message="Job Not Found!")

        if not Estimate.objects.filter(job_id=job).exclude(approval_date=None).exists():
            return self(success=False, message="No Approved Estimate to use as Invoice.")

        if len(Estimate.objects.filter(job_id=job).exclude(approval_date=None)) > 1:
            return self(success=False, message="More than 1 estimate approved. Please fix and try again.")

        estimate = Estimate.objects.filter(job_id=job).exclude(approval_date=None)[0]

        if estimate.price == 0.0:
            return self(success=False, message="Estimate price is $0. Please check job.")

        if not job.myob_uid:
            job_identifier = ""
            if job.po:
                job_identifier = job.po
            elif job.other_id:
                job_identifier = job.other_id

            if job_identifier == "":
                return self(success=False, message="Job Identifier Error. Please Sync with MYOB")

            res = CreateJobInMyob.mutate(root, info, job_id)
            if not res.success:
                return self(success=False, message="Please sync job with MYOB before creating invoice!")

            job.myob_uid = res.uid

        if not job.completion_date:
            return self(success=False, message="Job completion date not recorded.")

        if Invoice.objects.filter(job=job).exists():
            return self(success=False, message="Invoice already exists for this job.")

        invoice = []

        folder_name = str(job)
        job_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)

        if not os.path.exists(job_folder):
            return self(success=False, message="Job Folder does not exist.")

        accounts_folder = os.path.join(job_folder, "Accounts", "Aurify")

        if not os.path.exists(accounts_folder):
            os.mkdir(accounts_folder)

        if not os.path.exists(accounts_folder):
            return self(success=False, message="Jobs Accounts Folder does not exist.")

        estimate_folder = os.path.join(job_folder, "Estimates", estimate.name.strip())
        
        if not os.path.exists(estimate_folder):
            return self(success=False, message="Job Estimate Folder does not exist.")

        if job.client.name == "BGIS":
            ## Check the required invoice files that are stored in the relevant estimate folder
            found = {"approval": False, "estimate": False}
            paths = {"invoice": "", "approval": "", "estimate": ""}
            
            # Only need approval and breakdown on jobs > $500
            if estimate.price > 500.00:
                if not os.path.exists(estimate_folder):
                    return self(success=False, message="Jobs Estimate Folder does not exist!")

                estimate_file = None
                for files in os.listdir(estimate_folder):
                    print(files)
                    if "Approval" in files and not found['approval'] and files.endswith(".pdf"):
                        found['approval'] = True
                        paths['approval'] = os.path.join(estimate_folder, files)
                    if "BGIS Estimate" in files and not found["estimate"]:
                        if files.endswith(".pdf"):
                            found["estimate"] = True
                            paths["estimate"] = os.path.join(estimate_folder, files)
                        else:
                            estimate_file = os.path.join(estimate_folder, files)
                
                if not found["estimate"] and not estimate_file is None :
                    print("Converting Spreadsheet to PDF", estimate_file)

                    estimate_file_name = estimate_file.split('\\')[len(estimate_file.split('\\'))-1].replace("\\", '/')
                    estimate_folder_name = estimate_folder.replace("\\", '/')
                    subprocess.call(['soffice', '--headless', '--infilter=\"Microsoft Excel 2007/2010 XML\"', '--convert-to', 'pdf:writer_pdf_Export', f'{estimate_file_name}', '--outdir', f'{estimate_folder_name}'])

                    found["estimate"] = True
                    paths["estimate"] = estimate_file.strip(".xlsm") + ".pdf" 

            else:
                found['approval'] = True
                found['estimate'] = True

            if estimate.price > 500.00 and not all(found.values()):
                error_str = " "
                for [key, val] in found.items():
                    if not val:
                        error_str += key.capitalize() + ", "

                return self(success=False, message="Not all required invoice files can be found:" + error_str[:-2])
        
        elif job.client.display_name == "CBRE (GCS)" or job.client.name == "CBRE Pty Ltd" or job.client.name == "CDC Data Centres Pty Ltd" or job.client.display_name == "Create NSW":
            found = {"not_required": True}
            paths = {"invoice": ""}
        else:
            ## Check the required invoice files that are stored in the relevant estimate folder
            found = {"purchaseOrder": False}
            paths = {"invoice": "", "purchaseOrder": ""}

            for files in os.listdir(estimate_folder):
                if job.po in files:
                    if files.endswith(".pdf"):
                        found["purchaseOrder"] = True
                        paths["purchaseOrder"] = os.path.join(estimate_folder, files)
            
            if not found['purchaseOrder']:
                return self(success=False, message="Error. Purchase Order can not be found")

        if job.location.region.bill_to_address == '':
            shipToAddress = f"{job.client} {job.location}\n{job.location.getFullAddress()}"
        else:
            shipToAddress = job.location.region.bill_to_address

        # 4-3000 Maintenance Income - e5495a96-41a3-4e65-b56d-43e585f2742d
        payload = {
            "Date": datetime.today(), 
            "Customer": {"UID": job.client.myob_uid},
            "CustomerPurchaseOrderNumber": job.po,
            "Comment": f"Please find details of progress claim C001 attached.",
            "ShipToAddress": shipToAddress,
            "IsTaxInclusive": False,
            "Lines": [
                {
                    "Type": "Transaction",
                    "Description": str(job),
                    "Account": {"UID": "e5495a96-41a3-4e65-b56d-43e585f2742d"},
                    "TaxCode": {"UID": "d35a2eca-6c7d-4855-9a6a-0a73d3259fc4"},
                    "Total": estimate.price,
                    "Job": {"UID": job.myob_uid},
                }
            ],
            "JournalMemo": f"Sale: {job.client.name}",
        }

        from myob.schema import CreateMYOBSaleOrder

        create_invoice = CreateMYOBSaleOrder.mutate(root, info, payload)
        if not create_invoice.success:
            return self(success=False, message=create_invoice.message)
        
        new_invoice = Invoice()
        new_invoice.myob_uid = create_invoice.invoice['UID']
        new_invoice.number = create_invoice.invoice['Number']
        new_invoice.amount = round(float(create_invoice.invoice['Subtotal']), 2)
        new_invoice.job = job
        new_invoice.save()
        new_invoice.job.save() ## Update job stage
        print("Invoice Saved")

        if create_invoice.filename == None:
            return self(success=True, message=create_invoice.message)

        shutil.copyfile(f"{settings.MEDIA_ROOT}/invoices/{create_invoice.filename}", f"{job_folder}/Accounts/Aurify/{create_invoice.filename}.pdf")
        paths['invoice'] = f"{job_folder}/Accounts/Aurify/{create_invoice.filename}.pdf"

        # Create Full Invoice using function from invoice_generator.py
        print("Invoice Generation Starting")
        result = generate_invoice(job, paths, create_invoice.invoice, accounts_folder)
        if not result['success']:
            return self(success=False, message=result['message'])

        print("Invoice Generated")
        
        return self(success = True, message="Successfully Created Invoice", invoice=new_invoice)

class GenerateInvoice(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, job_id):

        job = Job.objects.get(id=job_id) if Job.objects.filter(id=job_id).exists() else None 
        print(f"Generating Invoice for {job.client.display_name} - {str(job)}")
        # Error Checking
        if not job:
            return self(success=False, message="Job Not Found!")

        if not Estimate.objects.filter(job_id=job).exclude(approval_date=None).exists():
            return self(success=False, message="No Approved Estimate to Invoice")

        if len(Estimate.objects.filter(job_id=job).exclude(approval_date=None)) > 1:
            return self(success=False, message="More than 1 estimate approved!")

        estimate = Estimate.objects.filter(job_id=job).exclude(approval_date=None)[0]

        if estimate.price == 0.0:
            return self(success=False, message="Estimate price is $0. please check job!")

        if not job.myob_uid:
            return self(success=False, message="Please sync job with MYOB before creating invoice!")

        if not job.completion_date:
            return self(success=False, message="Job completion date not recorded!")
        
        folder_name = str(job)
        job_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)

        if not os.path.exists(job_folder):
            return self(success=False, message="Job Folder does not exist!")

        accounts_folder = os.path.join(job_folder, "Accounts", "Aurify")
        if not os.path.exists(accounts_folder):
            os.mkdir(accounts_folder)

        estimate_folder = os.path.join(job_folder, "Estimates", estimate.name)

        if job.client.name == "BGIS":
            ## Check the required invoice files that are stored in the relevant estimate folder
            found = {"invoice": False, "approval": False, "estimate": False}
            paths = {"invoice": "", "approval": "", "estimate": ""}

            for files in os.listdir(accounts_folder):
                if "INV" in files:
                    found['invoice'] = True
                    paths['invoice'] = os.path.join(accounts_folder, files)
            
            # Only need approval and breakdown on jobs > $500
            if estimate.price > 500.00:
                if not os.path.exists(estimate_folder):
                    return self(success=False, message="Estimate has not been created for this job. Please check the estimate folder.")
                
                estimate_file = None
                for files in os.listdir(estimate_folder):
                    if "Approval" in files and not found['approval'] and files.endswith(".pdf"):
                        found['approval'] = True
                        paths['approval'] = os.path.join(estimate_folder, files)
                    if "BGIS Estimate" in files and not found["estimate"]:
                        if files.endswith(".pdf"):
                            found["estimate"] = True
                            paths["estimate"] = os.path.join(estimate_folder, files)
                        else:
                            estimate_file = os.path.join(estimate_folder, files)
                
                if not found["estimate"] and not estimate_file is None :
                    print("Converting Spreadsheet to PDF", estimate_file)

                    estimate_file_name = estimate_file.split('\\')[len(estimate_file.split('\\'))-1].replace("\\", '/')
                    estimate_folder_name = estimate_folder.replace("\\", '/')
                    subprocess.call(['soffice', '--headless', '--infilter=\"Microsoft Excel 2007/2010 XML\"', '--convert-to', 'pdf:writer_pdf_Export', f'{estimate_file_name}', '--outdir', f'{estimate_folder_name}'])

                    found["estimate"] = True
                    paths["estimate"] = estimate_file.strip(".xlsm") + ".pdf" 

            else:
                found['approval'] = True
                found['estimate'] = True
        elif job.client.display_name == "CBRE (GCS)" or job.client.name == "CBRE Pty Ltd" or job.client.name == "CDC Data Centres Pty Ltd" or job.client.display_name == "Create NSW":
            found = {"invoice": False}
            paths = {"invoice": ""}

            for files in os.listdir(accounts_folder):
                if "INV" in files:
                    found['invoice'] = True
                    paths['invoice'] = os.path.join(accounts_folder, files)

        else:
            ## Check the required invoice files that are stored in the relevant estimate folder
            found = {"invoice": False, "purchaseOrder": False}
            paths = {"invoice": "", "purchaseOrder": ""}

            for files in os.listdir(accounts_folder):
                if "INV" in files:
                    found['invoice'] = True
                    paths['invoice'] = os.path.join(accounts_folder, files)

            for files in os.listdir(estimate_folder):
                if job.po in files:
                    if files.endswith(".pdf"):
                        found["purchaseOrder"] = True
                        paths["purchaseOrder"] = os.path.join(estimate_folder, files)
            
            if not found['purchaseOrder']:
                return self(success=False, message="Error. Purchase Order can not be found")

        # GET Invoice from MYOB
        inv = Invoice.objects.get(job=job)
        invoice_number = inv.number
        invoice_uid = inv.myob_uid
        
        if not invoice_number or not invoice_uid:
            return self(success=False, message="Invoice not found")
        
        sale_type = "Order"
        if inv.date_issued != None:
            sale_type = "Invoice"

        if not found['invoice']:
            from myob.schema import GetSalePDF
            pdf_data = GetSalePDF.mutate(root, info, sale_type, invoice_uid)

            if not pdf_data.success:
                return self(success=False, message=pdf_data.message)

            print("Writing Invoice to File")
            with open(f"{settings.MEDIA_ROOT}/invoices/INV{invoice_number} - {str(job).split(' - ')[0]}.pdf", "wb") as f:
                f.write(pdf_data.data)

            shutil.copyfile(f"{settings.MEDIA_ROOT}/invoices/INV{invoice_number} - {str(job).split(' - ')[0]}.pdf", f"{accounts_folder}/INV{invoice_number} - {str(job).split(' - ')[0]}.pdf")
            paths['invoice'] = f"{accounts_folder}/INV{invoice_number} - {job.po}.pdf"
            found['invoice'] = True

            print("Invoice Saved")

        if not all(found.values()):
            error_str = " "
            for key, val in found.items():
                if not val:
                    error_str += key.capitalize() + ", "

            return self(success=False, message="Not all required invoice files can be found - " + error_str[:-2])
        
        from myob.schema import GetSale
        get_sale = GetSale.mutate(root, info, sale_type, invoice_number)
        if not get_sale.success:
            print("Error", get_sale.sale)
            return self(success=False, message="Can not find Sale invoice/order")
        
        invoice = get_sale.sale['Items'][0]
        
        # Create Full Invoice using function from invoice_generator.py
        result = generate_invoice(job, paths, invoice, accounts_folder)

        print("Invoice Generation Finished")

        return self(success=result['success'], message=result['message'])

class UpdateInvoice(graphene.Mutation):
    class Arguments:
        invoice = InvoiceUpdateInput()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, invoice):
        if not Invoice.objects.filter(number=invoice.number).exists():
            return self(success=False)
        
        inv = Invoice.objects.get(number=invoice.number)
        if invoice.amount: inv.amount = invoice.amount
        if invoice.date_created: inv.date_created = invoice.date_created
        if invoice.date_issued: inv.date_issued = invoice.date_issued
        if invoice.date_paid: inv.date_paid = invoice.date_paid
        if invoice.myob_uid: inv.myob_uid = invoice.myob_uid
        if invoice.job_id: inv.job = Job.objects.get(id=invoice.job_id)
        inv.save()

        return self(success=True)


class UpdateInvoices(graphene.Mutation):
    class Arguments:
        invoices = graphene.List(InvoiceUpdateInput)
        date_paid = graphene.Date()

    success = graphene.Boolean()
    message = graphene.String()
    invoice = graphene.List(InvoiceType)

    @classmethod
    @login_required
    def mutate(self, root, info, invoices, date_paid):
        updatedInvoices = []
        for inv in invoices:
            invoice = Invoice.objects.get(number=inv.number) if Invoice.objects.filter(number=inv.number).exists() else False
            if invoice:
                # if invoice.date_issued == "" or invoice.date_issued == None: invoice.date_issued = inv.date_issued
                if date_paid: invoice.date_paid = date_paid
                invoice.save()
                invoice.job.save() ## save job to update stage
                updatedInvoices.append(invoice)

        return self(success=True, message="Invoices Updated", invoice=updatedInvoices)
        
class TransferEstimate(graphene.Mutation):
    class Arguments:
        estimate_id = graphene.String()
        to_job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    job = graphene.Field(JobType)

    @classmethod
    @login_required
    def mutate(self, root, info, estimate_id, to_job):
        try:
            estimate = Estimate.objects.get(id=estimate_id)
            job = Job.objects.get(id=to_job)

            old_job = estimate.job_id
        except Exception as e:
            return self(success=False, message="Not found: " + str(e))

        if os.path.exists(os.path.join(MAIN_FOLDER_PATH, str(estimate.job_id), "Estimates", str(estimate.name))):
            shutil.move(os.path.join(MAIN_FOLDER_PATH, str(estimate.job_id), "Estimates", str(estimate.name)), os.path.join(MAIN_FOLDER_PATH, str(job), "Estimates", str(estimate.name)))

        estimate.job_id = job
        estimate.save()
        return self(success=True, message="Estimate & Folder successfully transferred", job=old_job)

class TransferInvoice(graphene.Mutation):
    class Arguments:
        invoice_id = graphene.String()
        to_job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, invoice_id, to_job):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            new_job = Job.objects.get(id=to_job)
        except Exception as e:
            return self(success=False, message="Not found: " + str(e))

        if os.path.exists(os.path.join(MAIN_FOLDER_PATH, str(invoice.job), "Accounts", "Aurify", "Invoice for " + invoice.job.po + ".pdf")):
            shutil.move(os.path.join(MAIN_FOLDER_PATH, str(invoice.job), "Accounts", "Aurify", "Invoice for " + invoice.job.po + ".pdf"), os.path.join(MAIN_FOLDER_PATH, str(new_job), "Accounts", "Aurify", "Invoice for " + new_job.po + ".pdf"))

        if os.path.exists(os.path.join(MAIN_FOLDER_PATH, str(invoice.job), "Accounts", "Aurify", "INV" + invoice.number + " - " + invoice.job.po + ".pdf")):
            shutil.move(os.path.join(MAIN_FOLDER_PATH, str(invoice.job), "Accounts", "Aurify", "INV" + invoice.number + " - " + invoice.job.po + ".pdf"), os.path.join(MAIN_FOLDER_PATH, str(new_job), "Accounts", "Aurify", "INV" + invoice.number + " - " + new_job.po + ".pdf"))

        invoice.job = new_job
        invoice.save()
        return self(success=True, message="Invoice & Folder successfully transferred")

class MYOBUserInputType(graphene.InputObjectType):
    id = graphene.String()
    username = graphene.String()

class UserInputType(graphene.InputObjectType):
    id = graphene.String()
    email = graphene.String()
    first_name = graphene.String()
    last_name = graphene.String()
    role = graphene.String()
    position = graphene.String()
    is_staff = graphene.Boolean()
    is_active = graphene.Boolean()
    myob_access = graphene.Boolean()
    myob_user = graphene.Field(MYOBUserInputType)


class InsuranceInputType(graphene.InputObjectType):
    id = graphene.String()
    description = graphene.String()
    issueDate = graphene.Date()
    startDate = graphene.Date()
    expiryDate = graphene.Date()
    active = graphene.Boolean()
    filename = graphene.String()
    thumbnail = graphene.String()

class UpdateCompany(graphene.Mutation):
    class Arguments:
        employees = graphene.List(UserInputType)
        insurances = graphene.List(InsuranceInputType)

    success = graphene.String()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, employees, insurances):
        for emp in employees:
            if CustomUser.objects.filter(email=emp.email).exists():
                user = CustomUser.objects.get(email=emp.email)
                user.first_name = emp.first_name
                user.last_name = emp.last_name
                user.is_active = emp.is_active
                user.is_staff = emp.is_staff
                user.role = emp.role
                user.myob_user = MyobUser.objects.get(id=emp.myob_user.id) if emp.myob_user and MyobUser.objects.filter(id=emp.myob_user.id).exists() else None
                user.myob_access = emp.myob_access
                user.save()

        for ins in insurances:
            if Insurance.objects.filter(id=ins.id).exists():
                insurance = Insurance.objects.get(id=ins.id)
                insurance.description = ins.description
                insurance.issue_date = ins.issueDate
                insurance.start_date = ins.startDate
                insurance.expiry_date = ins.expiryDate
                insurance.active = ins.active
                insurance.save()
            
        return self(success=True, message="Company Details Updated")

class InsuranceType(DjangoObjectType):
    class Meta:
        model = Insurance
        fields = '__all__'

class CreateInsurance(graphene.Mutation):
    class Arguments:
        insurance = InsuranceInputType()

    success = graphene.Boolean()
    data = graphene.Field(InsuranceType)

    @classmethod
    @login_required
    def mutate(self, root, info, insurance):

        ins = Insurance()
        ins.description = insurance.description
        ins.issue_date = insurance.issueDate
        ins.start_date = insurance.startDate
        ins.expiry_date = insurance.expiryDate
        ins.active = True
        ins.filename = insurance.filename
        ins.thumbnail = insurance.thumbnail
        ins.save()

        return self(success=True, data=ins)
    
class UpdateInsurance(graphene.Mutation):
    class Arguments:
        insurance = InsuranceInputType()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, insurance):

        if not Insurance.objects.filter(id=insurance.id).exists():
            return self(success=True, message="Insurances Updated Successfully")

        ins = Insurance.objects.filter(id = insurance.id)[0]
        if insurance.description: ins.description = insurance.description
        if insurance.issueDate: ins.issue_date = insurance.issueDate
        if insurance.startDate: ins.start_date = insurance.startDate
        if insurance.expiryDate: ins.expiry_date = insurance.expiryDate
        if insurance.active: ins.active = insurance.active
        if insurance.filename: ins.filename = insurance.filename
        if insurance.thumbnail: ins.thumbnail = insurance.thumbnail
        ins.save()

        return self(success=True, message="Insurances Updated Successfully")

class DeleteInsurance(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, id):
        insurance = Insurance.objects.get(id=id)

        if insurance != None:
            insurance.delete()
            return self(success=True)
            
        return self(success=False)


class ProcessRemittanceAdvice(graphene.Mutation):
    class Arguments:
        client = graphene.String()
        payment_date = graphene.Date()
        invoices = graphene.List(InvoiceUpdateInput)

    success = graphene.Boolean()
    message = graphene.String()    
    remittance_advice = graphene.Field(RemittanceType)
    invoices = graphene.List(InvoiceType)


    @classmethod
    @login_required
    def mutate(self, root, info, client, payment_date, invoices):
        from myob.schema import CreateCustomerPayment, GetInvoice, GetCustomerPayment
        client = Client.objects.get(id=client)

        # Calculate the total remittance amount
        total_amount = 0
        for inv in invoices:
            total_amount += inv.amount

        # Check remittance advice already exists in System
        if RemittanceAdvice.objects.filter(client = client, date=payment_date, amount=total_amount).exists():
            return self(success=False, message="Remittance Advice Already Exists")
        
        # Check remittance advice already exists in MYOB
        check_filter = f"Customer/UID eq guid'{client.myob_uid}' and AmountReceived eq {total_amount}M and Date eq datetime'{payment_date}T00:00:00'"
        check = GetCustomerPayment.mutate(root, info, check_filter)

        if not check.success:
            return self(success=False, message="Cannot check MYOB for existing remittance advice. Contact Developer")

        customer_payment = check.customer_payment
        if len(customer_payment) > 0:        
            # Create remittance advice with duplicates information
            remittance_advice = RemittanceAdvice()
            remittance_advice.client = client
            remittance_advice.date = payment_date
            remittance_advice.amount = total_amount
            remittance_advice.myob_uid = customer_payment[0]['UID']
            remittance_advice.save()

            # Update invoices
            print("Updaing Invoices")
            updatedInvoices = []
            for inv in invoices:
                invoice = Invoice.objects.get(number=inv.number) if Invoice.objects.filter(number=inv.number).exists() else False
                if invoice:
                    if not invoice.date_issued: invoice.date_issued = inv.date_issued
                    invoice.date_paid = payment_date
                    invoice.remittance = remittance_advice
                    invoice.save()
                    invoice.job.save()
                    updatedInvoices.append(invoice)
            
            print("Invoices Updated")

            return self(success=True, message="Remittance Advice Already Exists in MYOB. Information has been saved", invoices=updatedInvoices, remittance_advice=remittance_advice)

        # Create payment from the list of invoices provided
        paid_invoices = []
        external_invoices = []
        for invoice in invoices:
            if Invoice.objects.filter(number=invoice.number).exists():
                inv = Invoice.objects.get(number=invoice.number)
                if not inv.remittance is None:
                    return self(success=False, message="Remittance Advice Already Exists.")
                
                paid_invoices.append({
                    "UID": inv.myob_uid,
                    "Type": "Invoice",
                    "AmountApplied": round(float(inv.amount) * 1.1, 2),
                    "AmountAppliedForeign": None
                })

            else:
                external_invoices.append(invoice.number)

        if len(external_invoices) > 0:
            # Get the details of the invoices that are not saved in the system
            for inv_num in external_invoices:
                # Fetch the invoice from MYOB to include in the paid invoices
                invoice_filter = f"Number eq '{inv_num}'"
                get_invoice = GetInvoice.mutate(root, info, invoice_filter)
                ext_inv = get_invoice.invoice[0]

                paid_invoices.append({
                    "UID": ext_inv['UID'],
                    "Type": "Invoice",
                    "AmountApplied": float(ext_inv['TotalAmount']),
                    "AmountAppliedForeign": None
                })

        if len(paid_invoices) < 1:
            return self(success=False, message="No Invoices Found")

        # Create MYOB Customer Payment Payload Object
        customer_payment = {
            "Date": payment_date, 
            "DepositTo": "Account",
            "Account": {"UID": "7c6557f4-d684-41f2-9e0b-2f53c06828d3"},
            "Customer": {"UID": client.myob_uid},
            "Invoices": paid_invoices,
            "PaymentMethod": "EFT",
            "Memo": f"Payment: Transfer from {client.name}"
        }

        payment = CreateCustomerPayment.mutate(root, info, customer_payment)

        # Create remittance advice
        if payment.success:
            remittance_advice = RemittanceAdvice()
            remittance_advice.client = client
            remittance_advice.date = payment_date
            remittance_advice.amount = total_amount
            remittance_advice.myob_uid = payment.uid
            remittance_advice.save()

            # Update invoices
            print("Updating Invoices")
            updatedInvoices = []
            for inv in invoices:
                invoice = Invoice.objects.get(number=inv.number) if Invoice.objects.filter(number=inv.number).exists() else False
                if invoice:
                    if not invoice.date_issued: invoice.date_issued = inv.date_issued
                    invoice.date_paid = payment_date
                    invoice.remittance = remittance_advice
                    invoice.save()
                    invoice.job.save()
                    updatedInvoices.append(invoice)
        
            print("Invoices Updated")

            return self(success=True, message="Invoices Updated and Remittance Advice Processed.", invoices=updatedInvoices, remittance_advice=remittance_advice)
        return self(success=False, message="Error Processing Remittance Advice.")


class Query(graphene.ObjectType):
    job_page = relay.ConnectionField(JobConnection)
    archived_jobs = relay.ConnectionField(JobConnection)

    @login_required
    def resolve_job_page(root, info, **kwargs):
        return Job.objects.order_by('id').exclude(stage="CAN").exclude(stage="FIN") #.exclude(location=None)
       
    @login_required
    def resolve_archived_jobs(root, info, **kwargs):
        return Job.objects.filter(Q(stage="CAN") | Q(stage="FIN"))
        # return Job.objects.all()

    jobs = graphene.List(JobType, identifier = graphene.String(), OnlyMyobJobs = graphene.Boolean())
    next_id = graphene.String(item=graphene.String())
    job_all = DjangoFilterConnectionField(JobType)
    estimates = graphene.List(EstimateType)
    estimate_headers = graphene.List(EstimateHeaderType)
    estimate_items = graphene.List(EstimateItemType)
    contractors = graphene.List(ContractorType)
    clients = graphene.List(ClientType, client=graphene.String())
    locations = graphene.List(LocationType, client=graphene.String())
    regions = graphene.List(RegionType, client=graphene.String())
    client_contacts = graphene.List(ClientContactType, client=graphene.String())
    contractor_contacts = graphene.List(ContractorContactType, contractor=graphene.String())
    invoices = graphene.List(InvoiceType)
    bills = graphene.List(BillType, bill=graphene.String())
    expenses = graphene.List(BillType, expense=graphene.String())
    insurances = graphene.List(InsuranceType)
    remittance_advice = graphene.List(RemittanceType)

    @login_required
    def resolve_jobs(root, info, OnlyMyobJobs=False, identifier=False, **kwargs):
        # if order_by:
        #     if order_by == "job":    
        #         return Job.objects.all().order_by('po', 'sr', 'other_id')
            
        #     return Job.objects.all().order_by(order_by)

        if identifier:
            print(identifier, type(identifier))
            if identifier.isnumeric() and Job.objects.filter(id=identifier).exists():
                return [Job.objects.get(id=identifier)]

            if Job.objects.filter(po=identifier).exists():
                return [Job.objects.get(po=identifier)]
            
            if Job.objects.filter(sr=identifier).exists():
                return [Job.objects.get(sr=identifier)]
            
            if Job.objects.filter(other_id=identifier).exists():
                return [Job.objects.get(other_id=identifier)]
        
            return None
            
        if OnlyMyobJobs:
            return Job.objects.exclude(myob_uid=None).order_by('po', 'sr', 'other_id')

        return Job.objects.all()

    @login_required
    def resolve_insurances(roof, info, **kwargs):
        return Insurance.objects.all()

    @login_required
    def resolve_next_id(root, info, item, **kwargs):
        cursor = connection.cursor()
        cursor.execute(f"SELECT last_value FROM api_{item}_id_seq")
        row = cursor.fetchone()
        cursor.close()
        return row[0] + 1 

    @login_required
    def resolve_bills(root, info, bill=None, **kwargs):
        if bill:
           return Bill.objects.filter(id=bill)
        
        return Bill.objects.all()

    @login_required
    def resolve_expenses(root, info, expense=None, **kwargs):
        if expense:
           return Expense.objects.filter(id=expense)

        return Expense.objects.all()

    @login_required
    def resolve_invoices(root, info, **kwargs):
        return Invoice.objects.all()

    @login_required
    def resolve_job_from_id(root, info, **kwargs):
        if(Job.objects.filter(id=id) > 0):
            return Job.objects.filter(id=id)
        
        if(Job.objects.filter(po=id) > 0):
            return Job.objects.filter(po=id)
        
        if(Job.objects.filter(sr=id) > 0) :
            return Job.objects.filter(sr=id)

        if(Job.objects.filter(other_id=id) > 0):
            return Job.objects.filter(other_id=id)

        return 

    @login_required
    def resolve_locations(root, info, client=None, **kwargs):
        if client:
            locations = Location.objects.filter(client = Client.objects.get(id=client)).order_by('client_ref')
            return locations

        return Location.objects.all().order_by('client_ref')

    @login_required
    def resolve_estimates(root, info, **kwargs):
        return Estimate.objects.all().order_by('id')

    @login_required
    def resolve_estimate_headers(root, info, **kwargs):
        return EstimateHeader.objects.all().order_by('id')

    @login_required
    def resolve_estimate_items(root, info, **kwargs):
        return EstimateItem.objects.all().order_by('id')

    @login_required
    def resolve_contractors(root, info, **kwargs):
        return Contractor.objects.all().order_by('name')
    
    @login_required
    def resolve_contractors_contacts(root, info, contractor=None, **kwargs):
        if contractor:
            return ContractorContact.objects.filter(contractor=Contractor.objects.get(name=contractor))

        return ContractorContact.objects.all()
    
    @login_required
    def resolve_clients(root, info, client=None, **kwargs):
        if client:
            return Client.objects.filter(id=client)

        return Client.objects.all().order_by('name')

    @login_required
    def resolve_client_contacts(root, info, client=None, **kwargs):
        if client:
            return ClientContact.objects.filter(client=Client.objects.get(id=client))

        return ClientContact.objects.all().order_by('-active', 'first_name')
    
    @login_required
    def resolve_regions(root, info, client=None, **kwargs):
        if client:
            return Region.objects.filter(client = Client.objects.get(id=client))
        return Region.objects.all()
    
    @login_required
    def resolve_remittance_advice(root, info, **kwargs):
        return RemittanceAdvice.objects.all().order_by('-date')

class UpdateJobStatus(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info):
        jobs = Job.objects.all()
        for job in jobs:
            job.save()
    
        return self(success=True)



class TestFeature(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info):
        print(info.context.user)

        for bill in Bill.objects.all():
            if "/var/www/aurify/" in bill.thumbnail_path:
                print(bill)
                bill.thumbnail_path = bill.thumbnail_path.replace("/var/www/aurify/", "")
                bill.save()
        # ## Merge Contractors
        # primary_contrator = Contractor.objects.get(id=34)
        # secondary_contractor = Contractor.objects.get(id=94)

        # print(f"{secondary_contractor.name} --> {primary_contrator.name}")
        # for bill in Bill.objects.all():
        #     if bill.supplier == secondary_contractor:
        #         bill.supplier = primary_contrator
        #         bill.save()

        # for inv in Invoice.objects.all():
        #     inv.job = None
        #     inv.save()
        
        return self(success=True)

class Mutation(graphene.ObjectType):
    test_feature = TestFeature.Field()
    update_job_status = UpdateJobStatus.Field()
    
    extract_remittance_advice = ExtractRemittanceAdvice.Field()
    extract_bill_details = ExtractBillDetails.Field()
    pdf_to_image = PDFToImage.Field()
    
    check_folder = CheckFolder.Field()
    
    # Emails
    allocate_job_email = AllocateJobEmail.Field()
    close_out_email = CloseOutEmail.Field()
    email_quote = EmailQuote.Field()

    create_job = CreateJob.Field()
    update_job = UpdateJob.Field()
    delete_job = DeleteJob.Field()
    create_job_in_myob = CreateJobInMyob.Field()

    create_client = CreateClient.Field()
    update_client = UpdateClient.Field()
    delete_client = DeleteClient.Field()
    
    create_location = CreateLocation.Field()
    update_location = UpdateLocation.Field()
    delete_location = DeleteLocation.Field()

    create_region = CreateRegion.Field()
    update_region = UpdateRegion.Field()
    delete_region = DeleteRegion.Field()

    create_contact = CreateContact.Field()
    update_contact = UpdateContact.Field()
    delete_contact = DeleteContact.Field()

    create_contractor = CreateContractor.Field()
    update_contractor = UpdateContractor.Field()
    update_contractors = UpdateContractors.Field()
    delete_contractor = DeleteContractor.Field()

    create_invoice = CreateInvoice.Field()
    update_invoice = UpdateInvoice.Field()
    update_invoices = UpdateInvoices.Field()
    delete_invoice = DeleteInvoice.Field()
    transfer_invoice = TransferInvoice.Field()
    generate_invoice = GenerateInvoice.Field()

    create_bill = CreateBill.Field()
    update_bill = UpdateBill.Field()
    delete_bill = DeleteBill.Field()

    create_expense = CreateExpense.Field()
    # update_expense = UpdateExpense.Field()
    # delete_expense = DeleteExpense.Field()

    create_estimate = CreateEstimate.Field()
    update_estimate = UpdateEstimate.Field()
    delete_estimate = DeleteEstimate.Field()
    transfer_estimate = TransferEstimate.Field()

    create_estimate_header = CreateEstimateHeader.Field()
    delete_estimate_header = DeleteEstimateHeader.Field()

    create_estimate_item = CreateEstimateItem.Field()
    delete_estimate_item = DeleteEstimateItem.Field()

    create_quote = CreateQuote.Field()
    create_completion_documents = CreateCompletionDocuments.Field()

    update_company = UpdateCompany.Field()
    create_insurance = CreateInsurance.Field()
    update_insurance = UpdateInsurance.Field()
    delete_insurance = DeleteInsurance.Field()

    process_remittance = ProcessRemittanceAdvice.Field()

    # Reports
    generate_financial_report = GenerateFinancialReport.Field()

    # Searching
    search_jobs = JobSearch.Field()