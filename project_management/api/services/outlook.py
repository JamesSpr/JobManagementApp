import graphene
from graphene_django import DjangoObjectType
from datetime import datetime
import sys
import environ
import requests
import json
from ..models import Job, Estimate, Invoice, JobInvoice
from ..schema import InvoiceUpdateInput
sys.path.append("...")
from myob.models import MyobUser
from myob.schema import checkTokenAuth


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

class Query(graphene.ObjectType):
    pass

class Mutation(graphene.ObjectType):
    check_job_exists = CheckJobExists.Field()
    get_quotes = GetQuotes.Field()
    process_approval = ProcessApproval.Field()
    process_invoices = ProcessInvoices.Field()