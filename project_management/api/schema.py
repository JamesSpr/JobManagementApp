import os
import shutil
import re
import datetime
import graphene
from graphene_django import DjangoObjectType
from graphene_django.filter import DjangoFilterConnectionField
from graphene import relay
from graphql_jwt.decorators import login_required
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.db import connection
from accounts.models import CustomUser
from api.services.create_completion_documents import CreateCompletionDocuments
from .services.email import AllocateJobEmail, CloseOutEmail, EmailQuote
from .models import Insurance, Estimate, EstimateHeader, EstimateItem, Job, JobInvoice, Location, Contractor, ContractorContact, Client, ClientContact, Region, Invoice, Bill
from .services.import_csv import UploadClientContactsCSV, UploadRegionsCSV, UploadClientsCSV, UploadInvoiceDetailsCSV, UploadJobsCSV, UploadLocationsCSV
from .services.data_extraction import ExtractRemittanceAdvice, ExtractBillDetails
from .services.create_quote import CreateQuote, CreateBGISEstimate
from .services.get_pdf_thumbnail import PDFToImage

main_folder_path = r"C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Jobs"

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
    def resolve_estimateitem_set(self, instance, info):
        return EstimateItem.objects.filter(header_id=instance.id).order_by('id')


class EstimateType(DjangoObjectType):
    class Meta:
        model = Estimate
        fields = '__all__'
    
    estimateheader_set = graphene.List(EstimateHeaderType)

    @classmethod
    def resolve_estimateheader_set(self, instance, info):
        return EstimateHeader.objects.filter(estimate_id=instance.id).order_by('id')

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
    def resolve_estimate_set(self, instance, info):
        return Estimate.objects.filter(job_id=instance.id).order_by('approval_date', 'id')

    
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

class JobInput(graphene.InputObjectType):
    id = graphene.String()
    po = graphene.String()
    sr = graphene.String()
    other_id = graphene.String()
    client = graphene.Field(IDInput)
    location = graphene.Field(IDInput)
    building = graphene.String()
    detailed_location = graphene.String()
    title = graphene.String()
    priority = graphene.String()
    date_issued = graphene.Date()
    requester = graphene.Field(IDInput)
    poc_name = graphene.String()
    poc_phone = graphene.String()
    poc_email = graphene.String()
    alt_poc_name = graphene.String()
    alt_poc_phone = graphene.String()
    alt_poc_email = graphene.String()
    description = graphene.String()
    special_instructions = graphene.String()
    inspection_by = graphene.Field(IDInput)
    inspection_date = graphene.Date()
    inspection_notes = graphene.String()
    scope = graphene.String()
    work_notes = graphene.String()
    site_manager = graphene.Field(IDInput)
    commencement_date = graphene.Date()
    completion_date = graphene.Date()
    total_hours = graphene.Float()
    bsafe_link = graphene.String()
    overdue_date = graphene.Date()
    close_out_date = graphene.Date()
    work_type = graphene.String()
    opportunity_type = graphene.String()
    cancelled = graphene.Boolean()
    cancel_reason = graphene.String()
    estimate_set = graphene.List(EstimateInput)


class CreateJob(graphene.Mutation):
    class Arguments:
        input = JobInput()

    job = graphene.Field(JobType)
    success = graphene.Boolean()
    updated = graphene.Boolean()
    message = graphene.List(graphene.String)

    @classmethod
    def mutate(self, root, info, input):
        print("Creating Job")

        missing = False
        updated = False
        message = []
        missingItems = ["The following are required:"]

        # Error Checking
        illegal_characters = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
        if [char for char in illegal_characters if char in input.title]:
            return self(success=False, message=["Title can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input.building]:
            return self(success=False, message=["Building can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input.po]:
            return self(success=False, message=["PO can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input.sr]:
            return self(success=False, message=["SR can not contain the characters:"] + illegal_characters)
        if [char for char in illegal_characters if char in input.other_id]:
            return self(success=False, message=["Other ID can not contain the characters:"] + illegal_characters)

        if input.client.id == "":
            missing = True
            missingItems.append(" Client")
        if input.po == "" and input.sr == "" and input.other_id == "":
            missing = True
            missingItems.append(" Job Identifier")
        if input.location.id == "":
            missing = True
            missingItems.append(" Location")
        if input.requester.id == "":
            missing = True
            missingItems.append(" Requester")
        if input.title == "":
            missing = True
            missingItems.append(" Title")

        if missing:
            return self(success=False, message=missingItems)

        # Clean the input elements
        for (key, value) in input.items():
            input[key] = value.strip() if type(input[key]) == str else value

        # Remove letters from po and sr
        input.po = re.sub('\D', "", input.po) 
        input.sr = re.sub('\D', "", input.sr) 

        if (input.po != "" and Job.objects.filter(po=input.po).exists()) or (input.sr != "" and Job.objects.filter(sr=input.sr).exists()) or (input["other_id"] != "" and Job.objects.filter(other_id=input["other_id"]).exists()):
            if input.po != "" and Job.objects.filter(po=input.po).exists():
                job = Job.objects.get(po=input.po, client=Client.objects.get(id=input.client.id))
                print("PO Found", end=' - ')
            elif input.sr != "" and Job.objects.filter(sr=input.sr).exists():
                job = Job.objects.get(sr=input.sr, client=Client.objects.get(id=input.client.id))
                print("SR Found", end=' - ')
            elif input.other_id != "" and Job.objects.filter(other_id=input.other_id).exists():
                job = Job.objects.get(other_id=input.other_id, client=Client.objects.get(id=input.client.id))
                print("otherID Found", end=' - ')
            
            if job:
                print("Updating " + str(job))
                old_folder_name = str(job)
                ## Only update fields that are empty
                # job.client = Client.objects.get(id=input["client_id"]) if not job.client else job.client
                job.date_issued = input["date_issued"] if not job.date_issued else job.date_issued
                job.po = input.po if not job.po else job.po
                job.sr = input.sr if not job.sr else job.sr
                job.other_id = input.other_id if not job.other_id else job.other_id
                job.location = Location.objects.get(id=input.location.id) if not job.location else job.location
                job.building = input.building if not job.building else job.building
                job.detailed_location = input.detailed_location if not job.detailed_location else job.detailed_location
                job.requester = ClientContact.objects.get(id=input.requester.id) if not job.requester else job.requester
                job.priority = input.priority if not job.priority else job.priority
                job.special_instructions = input.special_instructions if not job.special_instructions else job.special_instructions
                job.poc_name = input["poc_name"] if not job.poc_name else job.poc_name 
                job.poc_phone = input["poc_phone"] if not job.poc_phone else job.poc_phone
                job.poc_email = input["poc_email"] if not job.poc_email else job.poc_email
                job.alt_poc_name = input["alt_poc_name"] if not job.alt_poc_name else job.alt_poc_name
                job.alt_poc_phone = input["alt_poc_phone"] if not job.alt_poc_phone else job.alt_poc_phone
                job.alt_poc_email = input["alt_poc_email"] if not job.alt_poc_email else job.alt_poc_email
                job.title = input["title"] if not job.title else job.title
                job.description = input["description"] if not job.description else job.description
                job.overdue_date = job.overdue_date if job.overdue_date else None if input["overdue_date"] == datetime.date(1970, 1, 1) else input["overdue_date"] 
                job.bsafe_link = input["bsafe_link"] if not job.bsafe_link else job.bsafe_link
                job.save()

                # Check folder name and rename if they're different
                if old_folder_name != str(job):
                    old_folder = os.path.join(main_folder_path, old_folder_name)
                    new_folder = os.path.join(main_folder_path, str(job))
                    try:
                        os.rename(old_folder, new_folder)
                    except FileNotFoundError:
                        message.append("Folder Not Found with name: " + old_folder)

                message.append("Job found and Updated")
                updated = True

        else:            
            message.append("New Job Created")

            job = Job()
            job.client = Client.objects.get(id=input.client.id)
            job.date_issued = input["date_issued"]
            job.po = input.po
            job.sr = input.sr
            job.other_id = input.other_id
            job.location = Location.objects.get(id=input.location.id)
            job.building = input.building
            job.detailed_location = input.detailed_location
            job.requester = ClientContact.objects.get(id=input.requester.id)
            job.priority = input.priority
            job.special_instructions = input.special_instructions
            job.poc_name = input["poc_name"]
            job.poc_phone = input["poc_phone"]
            job.poc_email = input["poc_email"]
            job.alt_poc_name = input["alt_poc_name"]
            job.alt_poc_phone = input["alt_poc_phone"]
            job.alt_poc_email = input["alt_poc_email"]
            job.title = input["title"]
            job.description = input["description"]
            job.overdue_date = None if input["overdue_date"] == datetime.date(1970, 1, 1) else input["overdue_date"]
            job.bsafe_link = input["bsafe_link"]
            job.save()

            # Create estimate for job
            # estimate = Estimate.objects.get()
            # estimate.job_id = job
            # estimate.name = str(job).split('-')[0].strip()
            # estimate.description = "Default Quote"
            # estimate.save()

            ## Create new folder
            folder_name = str(job)
            new_folder = os.path.join(main_folder_path, folder_name)

            folders = ["Photos", "Photos/Inspection", "Photos/Onsite", "Estimates", "Documentation", "Accounts", "Accounts/Aurify"]

            if not os.path.exists(new_folder):
                os.mkdir(new_folder)

            for folder in folders:
                if not os.path.exists(os.path.join(new_folder, folder)):
                    os.mkdir(os.path.join(new_folder, folder))

            print("Folder Created", new_folder)       
            # try:
            #     os.mkdir(new_folder)
            #     os.mkdir(os.path.join(new_folder, "Photos"))
            #     os.mkdir(os.path.join(new_folder, "Photos", "Inspection"))
            #     os.mkdir(os.path.join(new_folder, "Photos", "Onsite"))
            #     os.mkdir(os.path.join(new_folder, "Estimates"))
            #     os.mkdir(os.path.join(new_folder, "Documentation"))
            #     os.mkdir(os.path.join(new_folder, "Accounts"))
            #     os.mkdir(os.path.join(new_folder, "Accounts", "Aurify"))
            #     print("Folder Created", new_folder)
            # except FileExistsError:
            #     print("Folder already exists")
       
        return self(job=job, success=True, message=message, updated=updated)

class CheckFolder(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, job_id):
        job = Job.objects.get(id=job_id)

        ## Create new folder
        folder_name = str(job)
        new_folder = os.path.join(main_folder_path, folder_name)
        folders = ["Photos", "Photos/Inspection", "Photos/Onsite", "Estimates", "Documentation", "Accounts", "Accounts/Aurify"]

        if not os.path.exists(new_folder):
            os.mkdir(new_folder)

        for folder in folders:
            if not os.path.exists(os.path.join(new_folder, folder)):
                os.mkdir(os.path.join(new_folder, folder))

        return self(success=True, message="Folder Created")

        # try:
        #     os.mkdir(new_folder)
        #     os.mkdir(os.path.join(new_folder, "Photos"))
        #     os.mkdir(os.path.join(new_folder, "Photos", "Inspection"))
        #     os.mkdir(os.path.join(new_folder, "Photos", "Onsite"))
        #     os.mkdir(os.path.join(new_folder, "Estimates"))
        #     os.mkdir(os.path.join(new_folder, "Documentation"))
        #     os.mkdir(os.path.join(new_folder, "Accounts"))
        #     os.mkdir(os.path.join(new_folder, "Accounts", "Aurify"))
        # except FileExistsError:
        #     return self(success=False, message="Folder already exists")

class DeleteJob(graphene.Mutation):
    class Arguments:
        id = graphene.String()

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, id):
        job = Job.objects.get(id=id)
        if job:
            job.delete()
            return self(success=True)
        return self(success = False)

class UpdateJob(graphene.Mutation):
    class Arguments:
        input = JobInput()

    job = graphene.Field(JobType)
    message = graphene.List(graphene.String)
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, input):
        if input.id == "":
            return self(success=False, message="Job ID Not Found!")

        for (key, value) in input.items():
            input[key] = value.strip() if type(input[key]) == str else input[key]

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

        # if Job.objects.filter(po = input['po']).exists():
        #     return self(success=False)
 
        # if Job.objects.filter(sr = input['sr']).exists():
        #     return self(success=False)
 
        # if Job.objects.filter(other_id = input['other_id']).exists():
        #     return self(success=False)
    
        job = Job.objects.get(id=input['id'])
        old_folder_name = str(job)
        job.client = None if input.client == None else Client.objects.get(id=input.client.id)
        job.date_issued = None if input['date_issued'] == datetime.date(1970, 1, 1) else input['date_issued']
        job.po = input['po']
        job.sr = input['sr']
        job.other_id = input['other_id']
        job.location = None if input.location == None else Location.objects.get(id=input.location.id)
        job.building = input['building']
        job.detailed_location = input['detailed_location']
        job.requester = None if input.requester == None else ClientContact.objects.get(id=input.requester.id)
        job.priority = input['priority']
        job.special_instructions = input['special_instructions']
        job.poc_name = input['poc_name']
        job.poc_phone = input['poc_phone']
        job.poc_email = input['poc_email']
        job.alt_poc_name = input['alt_poc_name']
        job.alt_poc_phone = input['alt_poc_phone']
        job.alt_poc_email = input['alt_poc_email']
        job.title = input['title']
        job.description = input['description']
        job.inspection_by = None if input.inspection_by == None else CustomUser.objects.get(id=input.inspection_by.id)
        job.inspection_date = None if input['inspection_date'] == datetime.date(1970, 1, 1) else input['inspection_date']
        job.inspection_notes = input['inspection_notes']
        job.scope = input['scope']
        job.site_manager = None if input.site_manager == None else CustomUser.objects.get(id=input.site_manager.id)
        job.commencement_date = None if input['commencement_date'] == datetime.date(1970, 1, 1) else input['commencement_date']
        job.completion_date = None if input['completion_date'] == datetime.date(1970, 1, 1) else input['completion_date']
        job.total_hours = input['total_hours']
        job.work_notes = input['work_notes']
        job.overdue_date = None if input['overdue_date'] == datetime.date(1970, 1, 1) else input['overdue_date']
        job.close_out_date = None if input['close_out_date'] == datetime.date(1970, 1, 1) else input['close_out_date']
        job.work_type = input['work_type']
        job.opportunity_type = input['opportunity_type']
        job.cancelled = input['cancelled']
        job.cancel_reason = input['cancel_reason']
        job.bsafe_link = input['bsafe_link']
        job.save()

        if old_folder_name != str(job):
            old_folder = os.path.join(main_folder_path, old_folder_name)
            new_folder = os.path.join(main_folder_path, str(job))
            try:
                os.rename(old_folder, new_folder)
            except FileNotFoundError:
                pass

        message = ""
        # Update the Job Estimate
        for est in input.estimate_set:
            # Get existing estimate for that job with the same name
            print("Saving Estimate:", est.name)
            if Estimate.objects.filter(job_id=job, id=est.id).exists():
                estimate = Estimate.objects.get(job_id=job, id=est.id)
            else:
                print("Creating New")
                estimate = Estimate.objects.create(job_id=job, name=est.name, quote_by=CustomUser.objects.get(id=est.quote_by.id))
                try:
                    if not os.path.exists(os.path.join(main_folder_path, str(job).strip(), "Estimates", str(estimate.name).strip())):
                        os.mkdir(os.path.join(main_folder_path, str(job).strip(), "Estimates", str(estimate.name).strip()))
                except Exception as e:
                    print("File Name Error for:", str(job).strip())
                    message = "Job Saved. There is an error with the folder name, please correct in file system."

            # If the estimate name is changed, update the existing folder name
            if est.name != estimate.name:
                current_estimate_folder = os.path.join(main_folder_path, str(job).strip(), "Estimates", str(estimate.name).strip())
                new_estimate_folder = os.path.join(main_folder_path, str(job).strip(), "Estimates", str(est.name).strip())
                if os.path.exists(current_estimate_folder):
                    os.rename(current_estimate_folder, new_estimate_folder)

            # Update the estimate data
            estimate.job_id = job
            estimate.name = est.name
            estimate.description = est.description
            estimate.price = est.price
            estimate.quote_by = CustomUser.objects.get(id=est.quote_by.id)
            estimate.issue_date = None if not est.issue_date or est.issue_date == "" else est.issue_date
            estimate.approval_date = None if not est.approval_date or est.approval_date == "" else est.approval_date
            estimate.scope = "" if not est.scope else est.scope
            estimate.save()

            # Update the headers
            for header in est.estimateheaderSet:
                estimate_header = EstimateHeader.objects.get(id=header.id)
                estimate_header.estimate_id = estimate
                estimate_header.description = header.description
                estimate_header.markup = header.markup
                estimate_header.gross = header.gross
                estimate_header.save()

                if not header.estimateitemSet:
                    continue

                for item in header.estimateitemSet:
                    estimate_item = EstimateItem.objects.get(id=item.id)
                    estimate_item.header_id = estimate_header
                    estimate_item.description = item.description
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
    estimate = graphene.Field(EstimateType)

    @classmethod
    def mutate(self, root, info, job_id, estimate):

        job = Job.objects.get(id=job_id)

        est = Estimate()
        est.quote_by = CustomUser.objects.get(id=estimate.quote_by.id)
        est.job_id = job
        est.name = estimate.name
        est.price = str(estimate.price)
        est.description = estimate.description
        est.scope = estimate.scope
        est.save()

        # If an existing estimate has been copied
        if len(estimate.estimateheaderSet) > 0:
            # Create the estimate headers
            for header in estimate.estimateheaderSet:
                estHeader = EstimateHeader()
                estHeader.estimate_id = est
                estHeader.description = header.description
                estHeader.gross = header.gross
                estHeader.markup = header.markup
                estHeader.save()

                # Create the estimate items
                for item in header.estimateitemSet:
                    estItem = EstimateItem()
                    estItem.header_id = estHeader
                    estItem.description = item.description
                    estItem.quantity = item.quantity
                    estItem.item_type = item.itemType
                    estItem.rate = item.rate
                    estItem.extension = item.extension
                    estItem.markup = item.markup
                    estItem.gross = item.gross
                    estItem.save()

        os.mkdir(os.path.join(main_folder_path, str(job).strip(), "Estimates", str(estimate.name).strip()))

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
    def mutate(self, root, info, id, name, description, price, issue_date, approval_date, quote_by):
        estimate = Estimate.objects.get(id=id)
        estimate.name = name
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
    def mutate(self, root, info, item_id):
        estimate_item = EstimateItem.objects.get(id=item_id)
        estimate_item.delete()
        
        return self(success=True)

class DeleteEstimate(graphene.Mutation):
    ok = graphene.Boolean()

    class Arguments:
        id = graphene.ID()

    @classmethod
    def mutate(self, root, info, id):
        estimate = Estimate.objects.get(id=id)

        if os.path.exists(os.path.join(main_folder_path, str(estimate.job_id), "Estimates", str(estimate.name))):
            shutil.rmtree(os.path.join(main_folder_path, str(estimate.job_id), "Estimates", str(estimate.name)))

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

class ClientInputType(graphene.InputObjectType):
    id = graphene.String()
    myob_uid = graphene.String()
    name = graphene.String()
    display_name = graphene.String()

class CreateClient(graphene.Mutation):
    class Arguments:
        name = graphene.String()
        myob_uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    client = graphene.Field(ClientType)

    @classmethod
    def mutate(self, root, info, name, myob_uid):
        if(Client.objects.filter(name=name).exists()):
            return self(success=False, message="Client Already Exists")
        
        client = Client()
        client.name = name
        client.myob_uid = myob_uid
        client.save()

        return self(success=True, message="Client Successfully Added", client=client)

class UpdateClient(graphene.Mutation):
    class Arguments:
        details = ClientInputType()

    success = graphene.Boolean()
    message = graphene.String()
    client = graphene.Field(ClientType)

    @classmethod
    def mutate(self, root, info, details):
        if(not Client.objects.filter(id=details.id).exists()):
            return self(success=False, message="Client Not Found")
        
        client = Client.objects.get(id=details.id)
        if details.name: client.name = details.name
        if details.display_name: client.display_name = details.display_name
        if details.myob_uid: client.myob_uid = details.myob_uid
        client.save()

        return self(success=True, message="Client Successfully Updated", client=client)

class LocationType(DjangoObjectType):
    class Meta:
        model = Location
        fields = '__all__'

class LocationInputType(graphene.InputObjectType):
    id = graphene.String()
    client_ref = graphene.String()
    region = graphene.String()
    name = graphene.String()
    address = graphene.String()
    locality = graphene.String()
    state = graphene.String()
    postcode = graphene.String()    

class CreateLocation(graphene.Mutation):
    class Arguments:
        client = graphene.String()
        new_location = LocationInputType()

    location = graphene.Field(LocationType)
    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, client, new_location):
        
        if(Location.objects.filter(client = Client.objects.get(name=client), name = new_location.name).exists()):
            return self(success=False, message="Location Already Exists")

        location = Location()
        location.client = Client.objects.get(name=client)
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
    def mutate(self, root, info, client, locations):
        for loc in locations:
            location = Location.objects.get(id=loc.id)
            # location.client = Client.objects.get(name=client),
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
    def mutate(self, root, info, client, region):
        client_region = Region()
        client_region.client = Client.objects.get(name=client)
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
    def mutate(self, root, info, regions, client):
        for region in regions:
            if not Region.objects.filter(id=region.id).exists():
                return self(success=False, message="Error Finding Region")
            
            client_region = Region.objects.get(id=region.id)
            client_region.client = Client.objects.get(name=client)
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
    def mutate(self, root, info, id):
        client_region = Region.objects.get(id=id)

        if not client_region:
            return self(success=False) 

        client_region.delete()
        return self(success=True)


class DeleteClient(graphene.Mutation):
    ok = graphene.Boolean()

    class Arguments:
        name = graphene.ID()

    @classmethod
    def mutate(self, root, info, name):
        client = Client.objects.get(name=name)
        client.delete()
        return self(ok=True)

class ContractorContactType(DjangoObjectType):
    class Meta:
        model = ContractorContact
        fields = '__all__'

class ClientContactType(DjangoObjectType):
    class Meta:
        model = ClientContact
        fields = '__all__'

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

class CreateContact(graphene.Mutation):
    class Arguments:
        contact = ClientContactInput()
        client = graphene.String()
         
    client_contact = graphene.Field(ClientContactType)
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, contact, client):
        if ClientContact.objects.filter(first_name=contact.first_name, last_name=contact.last_name, client=Client.objects.get(name=client)).exists():
            return self(success=False, message="Contact Already Exists")
            
        client_contact = ClientContact()
        client_contact.first_name = contact.first_name.strip()
        client_contact.last_name = contact.last_name.strip()
        client_contact.position = contact.position.strip()
        client_contact.client = Client.objects.get(name=client)
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
    def mutate(self, root, info, contacts, client):
        for contact in contacts:
            client_contact = ClientContact(id=contact.id)
            client_contact.client = Client.objects.get(name=client)
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
    def mutate(self, root, info, id):
        if not ClientContact.objects.filter(id=id).exists():
            return self(success=False)

        client_contact = ClientContact.objects.get(id=id)
        client_contact.delete()
        return self(success=True)

class ContractorInput(graphene.InputObjectType):
    id = graphene.String(required=False)
    myob_uid = graphene.String()
    name = graphene.String()
    abn = graphene.String()
    bsb = graphene.String()
    bank_account_name = graphene.String()
    bank_account_number = graphene.String()

class CreateContractor(graphene.Mutation):
    class Arguments:
        contractor = ContractorInput()
         
    contractor = graphene.Field(ContractorType)
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, contractor):
        if Contractor.objects.filter(abn=contractor.abn).exists():
            return self(success=False, message="Contractor Already Exists. Check ABN")
        
        print(contractor)

        new_contractor = Contractor()
        new_contractor.myob_uid = contractor.myob_uid
        new_contractor.name = contractor.name.strip()
        new_contractor.abn = contractor.abn.strip()
        new_contractor.bsb = contractor.bsb.strip()
        new_contractor.bank_account_name = contractor.bank_account_name.strip()
        new_contractor.bank_account_number = contractor.bank_account_number.strip()
        new_contractor.save()

        return self(success=True, contractor=new_contractor)
    
class UpdateContractor(graphene.Mutation):
    class Arguments:
        contractor = ContractorInput()
        
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, contractor):
        cont = Contractor.objects.filter(id=contractor.id)[0]
        if contractor.myob_uid: cont.myob_uid = contractor.myob_uid
        if contractor.name: cont.name = contractor.name.strip()
        if contractor.abn: cont.abn = contractor.abn.strip()
        if contractor.bsb: cont.bsb = contractor.bsb.strip()
        if contractor.bank_account_name: cont.bank_account_name = contractor.bank_account_name.strip()
        if contractor.bank_account_number: cont.bank_account_number = contractor.bank_account_number.strip()
        cont.save()

        return self(success=True)

class DeleteContractor(graphene.Mutation):
    class Arguments:
        id = graphene.String()
    
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, id):
        contractor = Contractor.objects.get(id=id)

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
    job = graphene.String()
    contractor = graphene.String()
    invoiceNumber = graphene.String()
    invoiceDate = graphene.Date()
    amount = graphene.Float()
    myobUid = graphene.String()
    processDate = graphene.Date()
    imgPath = graphene.String()

class CreateBill(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        jobId = graphene.String()
        newBill = BillInput()

    success = graphene.Boolean()
    message = graphene.String()
    bill = graphene.Field(BillType)

    @classmethod
    def mutate(self, root, info, newBill, jobId, uid): 
        contractor = Contractor.objects.get(id=newBill.contractor)
        
        if Bill.objects.filter(supplier=contractor, invoice_number=newBill['invoiceNumber']).exists():
            return self(success=False, message="Bill Already Exists", bill=Bill.objects.get(supplier=contractor, invoice_number=newBill['invoiceNumber']))

        job = Job.objects.get(po=jobId)

        bill = Bill()
        bill.job = job
        bill.myob_uid = uid
        bill.supplier = contractor
        bill.process_date = datetime.date.today()
        bill.amount = newBill['amount'], 2
        bill.invoice_date = newBill['invoiceDate']
        bill.invoice_number = newBill['invoiceNumber']
        bill.img_path = newBill['imagePath']
        bill.save()

        return self(success=True, message="Bill Successfully Created", bill=bill)
    
class UpdateBill(graphene.Mutation):
    class Arguments:
        bill = BillInput()

    success = graphene.Boolean()
    message = graphene.String()
    bill = graphene.Field(BillType)

    @classmethod
    def mutate(self, root, info, bill):
        if not Bill.objects.filter(id = bill.id).exists():
            return self(success=False, message="Bill can not be found.")

        b = Bill.objects.get(id=bill.id)
        if bill.job: b.job = Job.objects.get(po=bill.job)
        if bill.myobUid: b.myob_uid = bill.uid
        if bill.contractor: b.supplier = Contractor.objects.get(name=bill.contractor)
        if bill.processDate: b.process_date = bill.processDate
        if bill.amount: b.amount = bill.amount
        if bill.invoiceDate: b.invoice_date = bill.invoiceDate
        if bill.invoiceNumber: b.invoice_number = bill.invoiceNumber
        if bill.imgPath: b.img_path = bill.imgPath
        b.save()

        return self(success=True, message="Bill Successfully Updated", bill=b)

class DeleteBill(graphene.Mutation):
    class Arguments:
        id = graphene.ID()
    
    ok = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, id):
        bill = Bill.objects.get(id=id)
        bill.delete()
        return self(ok=True)

class DeleteInvoice(graphene.Mutation):
    ok = graphene.Boolean()

    class Arguments:
        id = graphene.ID()

    @classmethod
    def mutate(self, root, info, id):
        invoice = Invoice.objects.get(id=id)
        invoice.delete()
        return self(ok=True)

class JobInvoiceType(DjangoObjectType):
    class Meta:
        model = JobInvoice
        fields = '__all__'

class UpdateJobInvoice(graphene.Mutation):
    class Arguments:
        id = graphene.String()
        po = graphene.String()

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, id, po):
        if(not JobInvoice.objects.filter(id=id).exists()):
            return self(success = False)
        
        jobInvoice = JobInvoice.objects.get(id=id)
        existing_job = jobInvoice.job
        new_job = Job.objects.get(po=po)

        jobInvoice.job = new_job
        jobInvoice.save()
        existing_job.save()
        new_job.save()

        return self(success=True)

class DeleteJobInvoice(graphene.Mutation):
    ok = graphene.Boolean()

    class Arguments:
        id = graphene.ID()

    @classmethod
    def mutate(self, root, info, id):
        jobInvoice = JobInvoice.objects.get(id=id)
        jobInvoice.delete()
        return self(ok=True)

class InvoiceUpdateInput(graphene.InputObjectType):
    myob_uid = graphene.String()
    number = graphene.String()
    amount = graphene.Float()
    date_created = graphene.Date()
    date_issued = graphene.Date()
    date_paid = graphene.Date()

class CreateInvoice(graphene.Mutation):
    class Arguments:
        myob_uid = graphene.String()
        number = graphene.String()
        amount = graphene.Float()
        date_created = graphene.Date()
        date_issued = graphene.Date()
        date_paid = graphene.Date()
        job = graphene.String() 

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, myob_uid, number, amount, date_created, date_issued, job):
        if Invoice.objects.filter(number=number).exists():
            return self(success=False)
        
        invoice = Invoice()
        invoice.myob_uid = myob_uid
        invoice.number = number
        invoice.amount = amount
        invoice.date_created = date_created
        invoice.date_issued = date_issued
        invoice.save()

        job=Job.objects.get(po=job)
        ji = JobInvoice()
        ji.invoice = invoice
        ji.job = job
        ji.save()
        job.save()

        return self(success = True)

class UpdateInvoice(graphene.Mutation):
    class Arguments:
        invoice = InvoiceUpdateInput()

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, invoice):
        if not Invoice.objects.filter(number=invoice.number).exists():
            return self(success=False)
        
        inv = Invoice.objects.get(number=invoice.number)
        if invoice.amount: inv.amount = invoice.amount
        if invoice.date_created: inv.date_created = invoice.date_created
        if invoice.date_issued: inv.date_issued = invoice.date_issued
        if invoice.date_paid: inv.date_paid = invoice.date_paid
        if invoice.myob_uid: inv.myob_uid = invoice.myob_uid
        inv.save()

        jobinv = JobInvoice.objects.get(invoice=inv)
        jobinv.job.save() ## save job to update stage

        return self(success=True)


class UpdateInvoices(graphene.Mutation):
    class Arguments:
        invoices = graphene.List(InvoiceUpdateInput)
        date_paid = graphene.Date()

    success = graphene.Boolean()
    message = graphene.String()
    job_invoice = graphene.List(JobInvoiceType)

    @classmethod
    def mutate(self, root, info, invoices, date_paid):
        updatedInvoices = []
        for inv in invoices:
            invoice = Invoice.objects.get(number=inv.number) if Invoice.objects.filter(number=inv.number).exists() else False
            if invoice:
                # if invoice.date_issued == "" or invoice.date_issued == None: invoice.date_issued = inv.date_issued
                if date_paid: invoice.date_paid = date_paid
                invoice.save()

                jobinv = JobInvoice.objects.get(invoice=invoice)
                jobinv.job.save() ## save job to update stage
                updatedInvoices.append(jobinv)

        return self(success=True, message="Invoices Updated", job_invoice=updatedInvoices)
        
class TransferEstimate(graphene.Mutation):
    class Arguments:
        estimate_id = graphene.String()
        to_job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, estimate_id, to_job):
        try:
            estimate = Estimate.objects.get(id=estimate_id)
            job = Job.objects.get(id=to_job)
        except Exception as e:
            return self(success=False, message="Not found: " + str(e))

        if os.path.exists(os.path.join(main_folder_path, str(estimate.job_id), "Estimates", str(estimate.name))):
            shutil.move(os.path.join(main_folder_path, str(estimate.job_id), "Estimates", str(estimate.name)), os.path.join(main_folder_path, str(job), "Estimates", str(estimate.name)))

        estimate.job_id = job
        estimate.save()
        return self(success=True, message="Estimate & Folder successfully transferred")

class TransferInvoice(graphene.Mutation):
    class Arguments:
        job_invoice_id = graphene.String()
        to_job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, job_invoice_id, to_job):
        try:
            job_invoice = JobInvoice.objects.get(id=job_invoice_id)
            new_job = Job.objects.get(id=to_job)
        except Exception as e:
            return self(success=False, message="Not found: " + str(e))

        if os.path.exists(os.path.join(main_folder_path, str(job_invoice.job), "Accounts", "Aurify", "Invoice for PO" + job_invoice.job.po + ".pdf")):
            shutil.move(os.path.join(main_folder_path, str(job_invoice.job), "Accounts", "Aurify", "Invoice for PO" + job_invoice.job.po + ".pdf"), os.path.join(main_folder_path, str(new_job), "Accounts", "Aurify", "Invoice for PO" + new_job.po + ".pdf"))

        if os.path.exists(os.path.join(main_folder_path, str(job_invoice.job), "Accounts", "Aurify", "INV" + job_invoice.invoice.number + " - PO" + job_invoice.job.po + ".pdf")):
            shutil.move(os.path.join(main_folder_path, str(job_invoice.job), "Accounts", "Aurify", "INV" + job_invoice.invoice.number + " - PO" + job_invoice.job.po + ".pdf"), os.path.join(main_folder_path, str(new_job), "Accounts", "Aurify", "INV" + job_invoice.invoice.number + " - PO" + new_job.po + ".pdf"))

        job_invoice.job = new_job
        job_invoice.save()
        return self(success=True, message="Invoice & Folder successfully transferred")

class InsuranceType(DjangoObjectType):
    class Meta:
        model = Insurance
        fields = '__all__'

class InsuranceInputType(graphene.InputObjectType):
    id = graphene.String()
    description = graphene.String()
    issueDate = graphene.Date()
    startDate = graphene.Date()
    expiryDate = graphene.Date()
    active = graphene.Boolean()
    filename = graphene.String()
    thumbnail = graphene.String()

class CreateInsurance(graphene.Mutation):
    class Arguments:
        insurance = InsuranceInputType()

    success = graphene.Boolean()
    data = graphene.Field(InsuranceType)

    @classmethod
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


class Query(graphene.ObjectType):
    job_page = relay.ConnectionField(JobConnection)
    archived_jobs = relay.ConnectionField(JobConnection)
    @login_required
    def resolve_job_page(root, info, **kwargs):
        # return Job.objects.exclude(stage="CAN").exclude(stage="FIN").exclude(location__isnull=False)
        return Job.objects.order_by('id').exclude(stage="CAN").exclude(stage="FIN") #.exclude(location=None)
        # return Job.objects.all()

    @login_required
    def resolve_archived_jobs(root, info, **kwargs):
        # return Job.objects.exclude(stage="CAN").exclude(stage="FIN").exclude(location__isnull=False)
        return Job.objects.filter(Q(stage="CAN") | Q(stage="FIN"))
        # return Job.objects.all()

    jobs = graphene.List(JobType)
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
    job_invoices = graphene.List(JobInvoiceType)
    bills = graphene.List(BillType)
    insurances = graphene.List(InsuranceType)

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
    def resolve_bills(root, info, **kwargs):
        return Bill.objects.all()

    @login_required
    def resolve_job_invoices(root, info, **kwargs):
        return JobInvoice.objects.all()

    @login_required
    def resolve_invoices(root, info, **kwargs):
        return Invoice.objects.all()

    @login_required
    def resolve_jobs(root, info, **kwargs):
        return Job.objects.all()

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
            locations = Location.objects.filter(client = Client.objects.get(name=client)).order_by('client_ref')
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
        return Contractor.objects.all()
    
    @login_required
    def resolve_contractors_contacts(root, info, contractor=None, **kwargs):
        if contractor:
            return ContractorContact.objects.filter(contractor=Contractor.objects.get(name=contractor))

        return ContractorContact.objects.all()
    
    @login_required
    def resolve_clients(root, info, client=None, **kwargs):
        if client:
            return Client.objects.filter(name=client)

        return Client.objects.all().order_by('id')

    @login_required
    def resolve_client_contacts(root, info, client=None, **kwargs):
        if client:
            return ClientContact.objects.filter(client=Client.objects.get(name=client))

        return ClientContact.objects.all().order_by('-active', 'first_name')
    
    @login_required
    def resolve_regions(root, info, client=None, **kwargs):
        if client:
            return Region.objects.filter(client = Client.objects.get(name=client))
        return Region.objects.all()

class UpdateJobStatus(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info):
        jobs = Job.objects.all()
        for job in jobs:
            job.save()
    
        return self(success=True)

from datetime import date
class TestFeature(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info):
        
        insurances = Insurance.objects.filter(active=True).order_by('expiry_date')
        
        for i in insurances:
            print(i.filename)
    
        return self(success=True)

class Mutation(graphene.ObjectType):
    test_feature = TestFeature.Field()
    update_job_status = UpdateJobStatus.Field()
    upload_clients_csv = UploadClientsCSV.Field()
    upload_client_regions_csv = UploadRegionsCSV.Field()
    upload_client_contacts_csv = UploadClientContactsCSV.Field()
    upload_locations_csv = UploadLocationsCSV.Field()
    upload_jobs_csv = UploadJobsCSV.Field()
    upload_invoice_details_csv = UploadInvoiceDetailsCSV.Field()
    
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
    delete_contractor = DeleteContractor.Field()

    create_invoice = CreateInvoice.Field()
    update_invoice = UpdateInvoice.Field()
    update_invoices = UpdateInvoices.Field()
    delete_invoice = DeleteInvoice.Field()
    transfer_invoice = TransferInvoice.Field()

    update_jobinvoice = UpdateJobInvoice.Field()
    delete_jobinvoice = DeleteJobInvoice.Field()

    create_bill = CreateBill.Field()
    update_bill = UpdateBill.Field()
    delete_bill = DeleteBill.Field()

    create_estimate = CreateEstimate.Field()
    update_estimate = UpdateEstimate.Field()
    delete_estimate = DeleteEstimate.Field()
    transfer_estimate = TransferEstimate.Field()

    create_estimate_header = CreateEstimateHeader.Field()
    delete_estimate_header = DeleteEstimateHeader.Field()

    create_estimate_item = CreateEstimateItem.Field()
    delete_estimate_item = DeleteEstimateItem.Field()

    create_quote = CreateQuote.Field()
    create_bgis_estimate = CreateBGISEstimate.Field()
    create_completion_documents = CreateCompletionDocuments.Field()

    create_insurance = CreateInsurance.Field()
    update_insurance = UpdateInsurance.Field()