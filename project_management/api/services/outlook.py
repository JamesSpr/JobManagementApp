import graphene
from graphene_django import DjangoObjectType
import win32com.client as win32
import pythoncom
from datetime import datetime
import re
import os
import sys
import environ
import requests
import json
from ..models import Job, Estimate, Invoice, JobInvoice
from ..schema import InvoiceUpdateInput
sys.path.append("...")
from myob.models import MyobUser
from myob.schema import checkTokenAuth

EMAIL_STYLE="""<body style="font-size:11pt; font-family:'Calibri'; color: rgb(0,0,0)">"""

class outlookJob(DjangoObjectType):
    class Meta:
        model = Job

class CheckJobExists(graphene.Mutation):
    class Arguments:
        job = graphene.String()

    exists = graphene.Boolean()
    name = graphene.String()

    @classmethod
    def mutate(self, root, info, job):
        print(job)
        if Job.objects.filter(po = job):
            return self(exists=True, name=str(Job.objects.get(po = job)))
        if Job.objects.filter(sr = job):
            return self(exists=True, name=str(Job.objects.get(sr = job)))
        if Job.objects.filter(other_id = job):
            return self(exists=True, name=str(Job.objects.get(other_id = job)))

        return self(exists=False, name='')


class QuoteType(DjangoObjectType):
    class Meta:
        model = Estimate
        fields = '__all__'
    
    
class GetQuotes(graphene.Mutation):
    class Arguments:
        job = graphene.String()

    success = graphene.Boolean()
    quotes = graphene.List(QuoteType)

    @classmethod
    def mutate(self, root, info, job):

        if not Job.objects.filter(po = job).exists():
            return self(success = False)

        job = Job.objects.get(po = job)
        estimate = Estimate.objects.filter(job_id=job)
        
        return self(success=True, quotes=estimate)
    

class ProcessApproval(graphene.Mutation):
    class Arguments:
        job = graphene.String()
        uid = graphene.String()
        quote = graphene.String()
        date = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, job, uid, quote, date):
        if not Job.objects.filter(po = job).exists():
            return self(success = False)
            
        # Update Approval Date
        estimate = Estimate.objects.get(id=quote)
        estimate.approval_date = date
        estimate.save()

        # Send Job details to MYOB
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            job = Job.objects.get(po=job)

            if job.myob_uid:
                return self(success=True, message="Job is already linked to MYOB")

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job/"
            payload = json.dumps({
                "Number": "PO" + job.po,
                "Name": (job.location.name + " " + job.title)[0:30],
                "Description": str(job),
                "IsHeader": False,
                "LinkedCustomer": {"UID": job.client.myob_uid,},
            })
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            post_response = requests.request("POST", url, headers=headers, data=payload)

            if(post_response.status_code != 201):
                print("Error:", job)
                return self(success=False, message=post_response.text)
                
            print("Uploaded:", job, post_response.headers['Location'].replace(url, ""))
            job.myob_uid = post_response.headers['Location'].replace(url, "")
            job.save()
            return self(success=True, message="Job Linked to MYOB")
        
        return self(success=False, message="Error Connecting to MYOB")

class ProcessInvoices(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        invoices = graphene.List(graphene.String)
        issue_date = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    # error = graphene.Field(graphene.String)nnnnnnn
    # converted = graphene.List(graphene.String)

    @classmethod
    def mutate(self, root, info, uid, invoices, issue_date):
        print('invoices:', invoices)

        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            converted = {}
            _invoices = invoices.copy()

            while len(invoices) > 0:
                query_limit = 35

                # Build Query
                queryFilter = ""
                for i, inv in enumerate(invoices[:query_limit]):
                    print(inv)
                    invoice = Invoice.objects.get(number=inv)
                    queryFilter += f"UID eq guid'{invoice.myob_uid}'"
                    if not (i + 1 == query_limit or i+1 == len(invoices)):
                        queryFilter += " or "

                # Check to see if the sale is an order
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Order/Service?$filter={queryFilter}"
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})

                if not response.status_code == 200:
                    return self(success=False, message="Error with MYOB Request")

                res = json.loads(response.text)

                res = res['Items']
                if len(res) == 0:
                    break

                for i, order in enumerate(res):
                    if order['Status'] == "ConvertedToInvoice":
                        print("Already Converted:", order['Number'])
                        for idx, inv in enumerate(invoices[:query_limit]):
                            if inv == order['Number']:
                                del invoices[idx]
                                query_limit -= 1
                        continue

                    for line in order['Lines']:
                        line.pop("RowID", None)

                    order['Lines'].append({
                        "Type": "Header",
                        "Description": "Order Created on " + datetime.strptime(order['Date'].split('T')[0], "%Y-%m-%d").strftime('%d/%m/%Y'),
                    })

                    # Convert order to Invoice / POST to MYOB
                    url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service/"
                    payload = json.dumps({
                        "Date": datetime.now(), 
                        "Number": order['Number'],
                        "Customer": {"UID": order['Customer']['UID']},
                        "CustomerPurchaseOrderNumber": order['CustomerPurchaseOrderNumber'],
                        "Comment": order['Comment'],
                        "ShipToAddorders": order['ShipToAddress'],
                        "IsTaxInclusive": False,
                        "Lines": order['Lines'],
                        "JournalMemo": order['JournalMemo'],
                        "Order": {
                            "UID": order['UID']
                        }
                    }, default=str)
                    headers = {                
                        'Authorization': f'Bearer {user.access_token}',
                        'x-myobapi-key': env('CLIENT_ID'),
                        'x-myobapi-version': 'v2',
                        'Accept-Encoding': 'gzip,deflate',
                        'Content-Type': 'application/json',
                    }
                    response = requests.request("POST", url, headers=headers, data=payload)
                    if not response.status_code == 201:
                        return self(success=False, message=response.text)
                    
                    # Get uid of the invoice created by conversion process
                    myob_uid = response.headers['Location'].replace(url, "")
                    converted.update({order['Number']: myob_uid})

                del invoices[:query_limit]

            for inv in _invoices:
                invoice = Invoice.objects.get(number=inv) if Invoice.objects.filter(number=inv).exists() else False
                if invoice:
                    if converted.get(inv) is not None: invoice.myob_uid = converted[inv]
                    invoice.date_issued = issue_date
                    invoice.save()

                    jobinv = JobInvoice.objects.get(invoice=invoice)
                    jobinv.job.save() ## save job to update stage

            return self(success=True, message="Orders have been converted")
        return self(success=False, message="MYOB Connection Error")


main_folder_path = r"C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Jobs"

# class SendInvoices(graphene.Mutation):

#     success = graphene.Boolean()
#     message = graphene.String()

#     @classmethod
#     def mutate(self, root, info):

#         outlook = win32.DispatchEx('Outlook.Application', pythoncom.CoInitialize())
#         outlookObj = outlook.CreateObject('Outlook.Application')
#         outlookObj.Run('Project1.RemoteTest')

#         return self(success=True)
    

# class SendInvoices(graphene.Mutation):

#     success = graphene.Boolean()
#     message = graphene.String()

#     @classmethod
#     def mutate(self, root, info):
#         outlook = win32.DispatchEx('Outlook.Application', pythoncom.CoInitialize())
        
#         for oAccount in outlook.GetNamespace("MAPI").Accounts:
#             if oAccount.DisplayName == "james@aurify.com.au":
#                 outlookInbox = oAccount.DeliveryStore.GetRootFolder.Folders("Inbox")
    
#         # Find emails with PO has been approved in inbox
#         for emailLoop in outlookInbox.Items.Count:
#             emailItem = outlookInbox.Items(emailLoop)
#             if "has been Approved" in emailItem.Subject:
#         #AttemptAgain:
#                 # Extract PO number
#                 PONum = re.findall("(\d)+", emailItem.Subject)(0)
                
#                 job = Job.objects.get(po=PONum)
#                 # Get PO Folder and Invoice Details
#                 POFolder = os.path.join(main_folder_path, str(job))
                
#                 invoiceFolder = ""
#                 if os.path.exists(os.path.join(POFolder,"/Inv/")):
#                     invoiceFolder = os.path.join(POFolder,"/Inv/")
#                 elif os.path.exists(os.path.join(POFolder,"/Accounts/Aurify/")):
#                     invoiceFolder = os.path.join(POFolder,"/Accounts/Aurify/")
#                 elif os.path.exists(os.path.join(POFolder,"/Accounts/")):
#                     invoiceFolder = os.path.join(POFolder,"/Accounts/")
#                 else:
#                     return self(success=False, message="Job Accounts folder can not be found")
                
#                 invoiceNum = ""
#                 invoiceFile = ""
#                 for file in os.listdir(invoiceFolder):
#                     if "- PO".join(PONum) in file:
#                         invoiceNumber = file.split(" - ")(0)
#                         invoiceNum = invoiceNumber.replace("INV0000", "")
#                     if  "Invoice for PO" in file:
#                         invoiceFile = file
                
#                 approvedPOs = []
#                 approvedInvoices = []
#                 # Make sure an invoice and its number has been found before taking any significant actions
#                 if not invoiceNum == "" and not invoiceFile == "":
#                     # Handle cases where duplicate approval emails are sent.
#                     if not PONum in approvedPOs :
#                         approvedPOs.append(PONum)
#                         approvedInvoices.append(invoiceNumber)
                        
#                         emailSubject = POFolder.split("/")(6)
#                         if "Jobs" in emailSubject:
#                             emailSubject = POFolder.split("/")(8)
                        
#                         # Create email to send invoice
#                         mailObj = outlook.CreateItem(0)
#                         mailObj.To = "services.accountspayable@apac.bgis.com"
#                         mailObj.Subject = emailSubject
#                         mailObj.Display
#                         Signature = mailObj.HTMLBody.replace("<p class=MsoNormal><o:p>&nbsp;</o:p></p>", "")
#                         Signature = mailObj.HTMLBody.replace("<o:p>&nbsp;</o:p>", "")
#                         mailObj.HTMLBody = f"""{EMAIL_STYLE}
#                                        Hi BGIS Accounts Payable,<br><br>
#                                        Please find attached INV# {invoiceNum} for PO# {PONum}<br>
#                                        All works have been completed and supporting documents uploaded to BSAFE.""" + Signature
#                         mailObj.Attachments.Add(os.path.join(invoiceFolder, invoiceFile))
#                         # mailObj.Send
                        
#                         emailItem.UnRead = False
#                         emailItem.Move Main.POFolder
#                 else
#                     Dim response As Integer: response = MsgBox("Please check and correct the invoice file for " & PONum & ". Do you wish to retry sending the email?", vbAbortRetryIgnore, "Invoice Not Found")
#                     if response = 4 : # Retry
#                         GoTo AttemptAgain
#                     Elseif response = 2 :
#                         Exit for
#                     End if
#                 End if
#             End if
        
#             # Reset Variables for next email
#             Set invoiceFolder = Nothing
#             InvoiceFile = ""
#             invoiceNumber = ""
#             invoiceNum = ""
#             PONum = ""
#             POFolder = ""
#             emailSubject = ""
            
#         Next emailLoop
        
#         # Update new system with dates for each approved PO
#         if approvedInvoices.Count > 0 :
        
#             # Build the data structure
#             Dim ds As String: ds = "["
#             Dim inv As Variant
#             for Each inv In approvedInvoices
#                 ds = ds + """" + Replace(inv, "INV", "") + ""","
#             Next inv
#             ds = Left(ds, Len(ds) - 1) + "]"
                    
#             ProcessApprovedInvoices ds, Format(Date, "yyyy-mm-dd")
            
#         End if
        
#         MsgBox ("Invoices have been emailed for approved purchase orders." & vbCrLf & _
#         "if there are still approval emails in your inbox, please check that all required files are in the folder for the PO.")
        

#         return self(success=True)

class Query(graphene.ObjectType):
    pass

class Mutation(graphene.ObjectType):
    check_job_exists = CheckJobExists.Field()
    get_quotes = GetQuotes.Field()
    process_approval = ProcessApproval.Field()
    process_invoices = ProcessInvoices.Field()
    # send_invoices = SendInvoices.Field()