from datetime import date, datetime, timedelta
from genericpath import exists
import shutil
from accounts.models import CustomUser
from api.models import Client, Contractor, Estimate, Job, Invoice, JobInvoice, Bill
from api.schema import InvoiceUpdateInput, JobInvoiceType, ClientType
import graphene
from graphene_django import DjangoObjectType
from graphql_jwt.decorators import login_required
import json
import os
import win32com.client as win32
import pythoncom
import base64
from pandas import isna
from myob.scripts.invoice_generator import generate_invoice
from .models import MyobUser
from django.utils import timezone
import environ
import requests
import urllib.parse

insurance_expiry_date = date(2023, 3, 31)
INVOICE_TEMPLATE = "James Tax Invoice 2022"
MAIN_FOLDER_PATH = r"C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Jobs"

class MyobUserType(DjangoObjectType):
    class Meta:
        model = MyobUser
        fields = "__all__"

class myobInitialConnection(graphene.Mutation):
    success = graphene.Boolean()
    auth_link = graphene.String()

    @classmethod
    def mutate(self, root, info): 
        env = environ.Env()
        environ.Env.read_env()

        authLink = f"https://secure.myob.com/oauth2/account/authorize?client_id={env('CLIENT_ID')}&redirect_uri={env('URL_ENC_REDIRECT_URL')}&response_type=code&scope=CompanyFile"
        # headers = {'Content-Type': 'application/x-www-form-urlencoded', 'Connection': 'keep-alive'}
        # auth_link = requests.get(authLink, headers=headers)
        
        return self(auth_link=authLink, success=True)
    
class myobGetAccessToken(graphene.Mutation):
    class Arguments:
        code = graphene.String()
    
    success = graphene.Boolean()
    response = graphene.String()

    @classmethod
    def mutate(self, root, info, code):
        env = environ.Env()
        environ.Env.read_env()

        link = 'https://secure.myob.com/oauth2/v1/authorize/'
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        payload = {
            'client_id': env('CLIENT_ID'),
            'client_secret': env('CLIENT_SECRET'),
            'scope' : 'CompanyFile',
            'grant_type':'authorization_code',
            'code': code,
            'redirect_uri': env('REDIRECT_URL')
        }
        # print(payload)
        response = requests.post(link, data=payload, headers=headers)

        return self(success=True, response=response.text)

class updateOrCreateMyobAccount(graphene.Mutation):
    class Arguments:
        access_token = graphene.String()
        expires_in = graphene.String()
        refresh_token = graphene.String()
        uid = graphene.String()
        username = graphene.String(required=False)
        user_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    user = graphene.Field(MyobUserType)

    @classmethod
    def mutate(self, root, info, access_token, expires_in, refresh_token, uid, user_id, username=None):

        user = MyobUser.objects.get(id=uid) if MyobUser.objects.filter(id=uid).exists() else False
        app_user = CustomUser.objects.get(id=user_id) if CustomUser.objects.filter(id=user_id).exists() else False
        
        if not app_user:
            return self(success=False, message="User Account Not Provided")

        if not user:
            user = MyobUser.objects.create(
                id = uid,
                username = username,
                access_token = access_token,
                refresh_token = refresh_token,
            )
            return self(success=True, message="New Account Created")

        user.access_token = access_token
        user.refresh_token = refresh_token
        user.save()

        app_user.myob_user = user
        app_user.save()

        return self(success=True, message="Account Updated", user=user)

class DeleteMyobUser(graphene.Mutation):
    class Arguments:
        # user_id = graphene.String()
        myob_uid = graphene.String()

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, user_id, myob_uid):
        myob_user = MyobUser.objects.get(id=myob_uid) if MyobUser.objects.filter(id=myob_uid).exists() else False
        app_user = CustomUser.objects.get(id=user_id) if CustomUser.objects.filter(id=user_id).exists() else False
        
        app_user.myob_user = None
        app_user.save()

        if myob_user:
            myob_user.delete()

        return self(success=True)

import inspect
# Check the current authentication of user, and refresh token if required (within 2 minutes of expiry)
def checkTokenAuth(uid):
    env = environ.Env()
    environ.Env.read_env()

    print(f'Checking MYOB Auth from {inspect.stack()[1][0].f_locals["self"].__name__}')

    if MyobUser.objects.filter(id=uid).exists():
        user = MyobUser.objects.get(id=uid)

        if timezone.now() >= (user.access_expires_at - timedelta(minutes=2)):
            
            link = "https://secure.myob.com/oauth2/v1/authorize"
            headers = {'Content-Type': 'application/x-www-form-urlencoded'}
            payload = {
                'client_id': env('CLIENT_ID'),
                'client_secret': env('CLIENT_SECRET'),
                'refresh_token': user.refresh_token,
                'grant_type':'refresh_token',
            }
            # print(payload)
            response = requests.post(link, data=payload, headers=headers)

            if not response.status_code == 200:
                print("MYOB Authentication error for", user.username)
                print(response)
                return False

            res = json.loads(response.text)

            user.access_token = res['access_token']
            user.refresh_token = res['refresh_token']
            user.access_expires_at = timezone.now() + timedelta(seconds=int(res['expires_in']))
            user.save()
            
            print('MYOB Auth Refreshed By', user.username)
            return True
        else:
            print('MYOB Auth Active')
            return True
    else:
        print('Error with User Auth')
        return False


class myobRefreshToken(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            link = "https://secure.myob.com/oauth2/v1/authorize"
            headers = {'Content-Type': 'application/x-www-form-urlencoded'}
            payload = {
                'client_id': env('CLIENT_ID'),
                'client_secret': env('CLIENT_SECRET'),
                'refresh_token': user.refresh_token,
                'grant_type':'refresh_token',
            }
            # print(payload)
            response = requests.post(link, data=payload, headers=headers)

            return self(success=True, message=response.text)

        else:
            return self(success=False, message="User Not Found")

class myobGetClients(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        client = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, client):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            client_filter = "" if client == "" else "?$filter=" + client
            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Customer{client_filter}"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.get(link, headers=headers)

            return self(success=True, message=response.text)
        else:
            return self(success=False, message="MYOB Connection Error")
        
class myobCreateClient(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        name = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    client = graphene.Field(ClientType)

    @classmethod
    def mutate(self, root, info, uid, name):
        env = environ.Env()
        environ.Env.read_env()

        if(Client.objects.filter(name=name).exists()):
            return self(success=False, message="Client Already Exists")

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            name = urllib.parse.quote(name)
            client_filter = "" if name == "" else f"?$filter=CompanyName eq'{name}'"
            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Customer{client_filter}"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.get(link, headers=headers)
            res = json.loads(response.text)

            if(len(res['Items']) > 0):
                return self(success=False, message="Client Already Exists in MYOB")
            
            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Customer/"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            payload = json.dumps({
                'CompanyName': name,
                'IsActive': True,
                'SellingDetails': {
                    'SaleLayout': 'NoDefault',
                    'InvoiceDelivery': 'Print',
                    'TaxCode': {'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4'},
                    'FreightTaxCode': {'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4'}
                },
            })
            response = requests.post(link, headers=headers, data=payload)

            if not response.status_code == 201:
                return self(success=False, message=response.text)
            
            myob_uid = response.headers['Location'].replace(link, "")
            
            client = Client()
            client.name = name
            client.myob_uid = myob_uid
            client.save()

            return self(success=True, client=client, message="Client Successfully Created")
        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetContractors(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        contractor = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, contractor):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            
            contractor_filter = "" if contractor == "" else "?$filter=" + contractor
            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier{contractor_filter}"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.get(link, headers=headers)

            return self(success=True, message=response.text)
        else:
            return self(success=False, message="MYOB Connection Error")

class myobContractorInput(graphene.InputObjectType):
    name = graphene.String()
    abn = graphene.String()
    bsb = graphene.String()
    bank_account_name = graphene.String()
    bank_account_number = graphene.String()
    id = graphene.String()
    myob_uid = graphene.String()

class myobCreateContractor(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        contractor = myobContractorInput()

    success = graphene.Boolean()
    message = graphene.String()
    myob_uid = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, contractor):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier/"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            payload = json.dumps({
                'CompanyName': contractor['name'],
                'BuyingDetails': {
                    'ABN': contractor['abn'],
                    'IsReportable': True,
                    'TaxCode': {
                        'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                    },
                    'FreightTaxCode': {
                        'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                    },
                },
                'PaymentDetails': {
                    'BSBNumber': contractor['bsb'],
                    'BankAccountName': contractor['bank_account_name'],
                    'BankAccountNumber': contractor['bank_account_number'].strip(),
                },
            })
            response = requests.post(link, headers=headers, data=payload)

            if not response.status_code == 201:
                return self(success=False, message=response.text)

            myob_uid = response.headers['Location'].replace(link, "")

            return self(success=True, message=response.text, myob_uid=myob_uid)
        else:
            return self(success=False, message="MYOB Connection Error")
        
class myobUpdateContractor(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        contractors = graphene.List(myobContractorInput)

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, contractors):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            for contractor in contractors:
                print("Updating Contractor:", contractor)
                link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier?$filter=UID eq guid'{contractor['myob_uid']}'"
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.get(link, headers=headers)

                if not response.status_code == 200:
                    return self(success=False, message=response.text)
                    
                res = json.loads(response.text)
                res = res['Items'][0]
                print(res['RowVersion'])

                link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier/{contractor['myob_uid']}"
                payload = json.dumps({
                    'UID': contractor['myob_uid'],
                    'CompanyName': contractor['name'],
                    'BuyingDetails': {
                        'ABN': contractor['abn'],
                        'IsReportable': True,
                        'TaxCode': {
                            'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                        },
                        'FreightTaxCode': {
                            'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                        },
                    },
                    'PaymentDetails': {
                        'BSBNumber': contractor['bsb'],
                        'BankAccountName': contractor['bank_account_name'],
                        'BankAccountNumber': contractor['bank_account_number'].strip(),
                    },
                    'RowVersion': res['RowVersion']
                })
                response = requests.put(link, headers=headers, data=payload)

                if not response.status_code == 200:
                    return self(success=False, message=response.text)
                
                cont = Contractor.objects.get(id = contractor['id'])
                cont.name = contractor['name']
                cont.abn = contractor['abn']
                cont.bsb = contractor['bsb']
                cont.bank_account_name = contractor['bank_account_name']
                cont.bank_account_number = contractor['bank_account_number']
                cont.save()

                return self(success=True, message="Contractor Successfully Updated")
            else:
                return self(success=False, message="MYOB Connection Error")

class myobGetInvoices(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        inv = graphene.String()
        as_pdf = graphene.Boolean()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, inv, as_pdf=False):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            invoice_filter = "" if inv == "" else "?$filter=" + inv

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service{invoice_filter}"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            
            if not as_pdf:
                return self(success=True, message=response.text)

            ## Save Invoice as PDF
            if not response.status_code == 200:
                return self(success=False, message=response.text)

            res = json.loads(response.text)
            res = res['Items']

            if len(res) > 1:
                for invoice in res:
                    # Get invoice from MYOB
                    url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service/{invoice['UID']}/?format=pdf&templatename=James Tax Invoice 2022"
                
                    headers = {                
                        'Authorization': f'Bearer {user.access_token}',
                        'x-myobapi-key': env('CLIENT_ID'),
                        'x-myobapi-version': 'v2',
                        'Accept-Encoding': 'gzip,deflate',
                        'Accept': 'Application/PDF'
                    }
                    pdf_response = requests.request("GET", url, headers=headers, data={})

                    with open(f"./myob/invoices/INV{invoice['Number']} - {invoice['CustomerPurchaseOrderNumber'].replace('_C001', '')}.pdf", "wb") as f:
                        f.write(pdf_response.content)

                return self(success=True, message=response.text)

            invoice = res[0]

            # Get invoice from MYOB
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service/{invoice['UID']}/?format=pdf&templatename=James Tax Invoice 2022"
        
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
                'Accept': 'Application/PDF'
            }
            pdf_response = requests.request("GET", url, headers=headers, data={})

            with open(f"./myob/invoices/INV{invoice['Number']} - {invoice['CustomerPurchaseOrderNumber'].replace('_C001', '')}.pdf", "wb") as f:
                f.write(pdf_response.content)

            return self(success=True, message=response.text)

        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetOrders(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        query = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, query):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            filter = "" if query == "" else "?$filter=" + query
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Order/Service{filter}"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            
            return self(success=True, message=response.text)
            
        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetJobs(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, job):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            job_filter = "" if job == "" else "?$filter=" + job
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job{job_filter}"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})

            return self(success=True, message=response.text)
        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetBills(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        bill = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, bill):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            bill_filter = "" if bill == "" else "?$filter=" + bill
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service{bill_filter}"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})

            return self(success=True, message=response.text)
        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetAccounts(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Account?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})

            return self(success=True, message=response.text)
        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetTaxCodes(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/TaxCode?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})

            return self(success=True, message=response.text)
        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetGeneralJournal(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/JournalTransaction"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }

            general_journal = getAllData(url, headers)

            return self(success=True, message=json.dumps(general_journal))
        else:
            return self(success=False, message="MYOB Connection Error")

def getAllData(url, headers):
    url += "?$top=1000"
    response = requests.request("GET", url, headers=headers, data={})
    res = json.loads(response.text)
    data = res
    counter = 1

    while res['NextPageLink'] != None:
        skip = 1000*counter
        response = requests.request("GET", f"{url}&$skip={skip}", headers=headers, data={})
        res = json.loads(response.text)
        data['Items'].extend(res['Items'])
        counter += 1
        print(f"Fetched: {skip} records")

    return data

class myobRepairJobSync(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    errors = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, job_id):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            job = Job.objects.get(id=job_id)

            job_filter = f"?$filter=Number eq 'PO{job.po}'"
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job{job_filter}"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)

            if len(res['Items']) > 0:
                return self(success=True, message="Job Already Linked Correctly")
            else:
                job.myob_uid = ''
                job.save()
                create_job = myobCreateJob()
                create_job_res = create_job.mutate(root, info, uid, job_id)
                return self(success=True, message=create_job_res.message)

                # url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job/"
                # payload = json.dumps({
                #     "Number": "PO" + job.po,
                #     "Name": (job.location.name + " " + job.title)[0:30],
                #     "Description": str(job),
                #     "IsHeader": False,
                #     "LinkedCustomer": {"UID": job.client.myob_uid,},
                # })
                # headers = {                
                #     'Authorization': f'Bearer {user.access_token}',
                #     'x-myobapi-key': env('CLIENT_ID'),
                #     'x-myobapi-version': 'v2',
                #     'Accept-Encoding': 'gzip,deflate',
                # }
                # post_response = requests.request("POST", url, headers=headers, data=payload)

                # if(post_response.status_code != 201):
                #     print("Error:", job)
                #     return self(success=False, message=json.dumps(post_response.text))
                # else:
                #     print("Uploaded:", job, post_response.headers['Location'].replace(url, ""))
                #     job.myob_uid = post_response.headers['Location'].replace(url, "")
                #     job.save()
                #     return self(success=True, message=json.dumps("Job Linked to MYOB"), uid=job.myob_uid)

        else:
            return self(success=False, message="MYOB Connection Error")

class myobSyncJobs(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    errors = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            jobs = []
            
            print("MYOB Job Sync - Beginning Download")

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)
            jobs = res
            counter = 1

            while res['NextPageLink'] != None:
                skip = 1000*counter
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job?$top=1000&$skip={skip}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})
                res = json.loads(response.text)
                jobs['Items'].extend(res['Items'])
                counter += 1

            print("MYOB Job Sync - Download Complete")

            for myob_job in jobs['Items']:
                if 'PO' in myob_job['Number'] and '_' not in myob_job['Number']:
                    job_num = myob_job['Number'][2:]
                    if not job_num == "":
                        job = Job.objects.get(po=job_num) if Job.objects.filter(po=job_num).exists() else None 
                        if job:
                            # print(myob_job['UID'])
                            job.myob_uid = myob_job['UID']
                            job.save()

            print("MYOB Job Sync - References Updated")
            print("MYOB Job Sync - Beginning Upload")
            
            error_responses = {}
            all_jobs = Job.objects.filter(myob_uid__isnull=True)
            for one_job in all_jobs:
                if not "_" in str(one_job.po):
                    # print(one_job)
                    estimate = Estimate.objects.filter(job_id=one_job.id).exclude(approval_date=None)
                    if estimate:
                        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job/"
                        payload = json.dumps({
                            "Number": "PO" + one_job.po,
                            "Name": (one_job.location.name + " " + one_job.title)[0:30],
                            "Description": str(one_job),
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
                            print("Error:", one_job)
                            error_responses.update({one_job.po: json.loads(post_response.text)})
                        else:
                            print("Uploaded:", one_job, post_response.headers['Location'].replace(url, ""))
                            one_job.myob_uid = post_response.headers['Location'].replace(url, "")
                            one_job.save()

            
            print("MYOB Job Sync - Upload Complete")

            return self(success=True, message=json.dumps(jobs['Items']), errors=json.dumps(error_responses))
        else:
            return self(success=False, message="MYOB Connection Error")

class myobCreateJob(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    uid = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, job_id):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            job = Job.objects.get(id=job_id)

            if job.myob_uid:
                return self(success=False, message=json.dumps("Job is already linked to MYOB"))

            if not job.po:
                return self(success=False, message=json.dumps("Job needs to have PO before sending to MYOB"))

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
                return self(success=False, message=json.dumps(post_response.text))
            else:
                print("Uploaded:", job, post_response.headers['Location'].replace(url, ""))
                job.myob_uid = post_response.headers['Location'].replace(url, "")
                job.save()
                return self(success=True, message=json.dumps("Job Linked to MYOB"), uid=job.myob_uid)
        
        return self(success=False, message=json.dumps("Error Connecting to MYOB"))

class myobSyncClients(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            clients = []

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Customer?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)
            clients = res
            counter = 1

            while res['NextPageLink'] != None:
                skip = 1000*counter
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Customer?$top=1000&$skip={skip}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})
                res = json.loads(response.text)
                clients['Items'].extend(res['Items'])
                counter += 1

            for myob_client in clients['Items']:
                client = Client.objects.get(name=myob_client['CompanyName']) if Client.objects.filter(name=myob_client['CompanyName']).exists() else None 
                if client:
                    client.myob_uid = myob_client['UID']
                    client.save()
            
            return self(success=True, message=json.dumps(clients['Items']))
        else:
            return self(success=False, message="MYOB Connection Error")

class myobSyncContractors(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            contractors = []

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)
            contractors = res
            counter = 1

            while res['NextPageLink'] != None:
                skip = 1000*counter
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier?$top=1000&$skip={skip}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})
                res = json.loads(response.text)
                contractors['Items'].extend(res['Items'])
                counter += 1

            for myob_contractor in contractors['Items']:
                contractor = Contractor.objects.get(myob_uid=myob_contractor['UID']) if Contractor.objects.filter(myob_uid=myob_contractor['UID']).exists() else None 
                if contractor:
                    print(contractor)
                    contractor.myob_uid = myob_contractor['UID']
                    contractor.name = myob_contractor['CompanyName']
                    contractor.abn = myob_contractor['BuyingDetails']['ABN']
                    contractor.bsb = myob_contractor['PaymentDetails']['BSBNumber']
                    contractor.bank_account_name = myob_contractor['PaymentDetails']['BankAccountName']
                    contractor.bank_account_number = myob_contractor['PaymentDetails']['BankAccountNumber']

                    contractor.save()
            
            return self(success=True, message=json.dumps(contractors['Items']))
        else:
            return self(success=False, message="MYOB Connection Error")

class myobSyncInvoices(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            invoices = []

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)
            invoices = res
            counter = 1

            while res['NextPageLink'] != None:
                skip = 1000*counter
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service?$top=1000&$skip={skip}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})
                res = json.loads(response.text)
                invoices['Items'].extend(res['Items'])
                counter += 1
                
            bgis = Client.objects.get(name='BGIS')
            for invoice in invoices['Items']:
                if invoice['Customer']['UID'] == bgis.myob_uid:
                    if invoice['CustomerPurchaseOrderNumber']:
                        po = invoice['CustomerPurchaseOrderNumber'].split('_')[0] if '_' in invoice['CustomerPurchaseOrderNumber'] else invoice['CustomerPurchaseOrderNumber']
                        job = Job.objects.get(po=po[2:]) if Job.objects.filter(po=po[2:]).exists() else None 
                        inv = Invoice.objects.get(number=invoice['Number']) if Invoice.objects.filter(number=invoice['Number']).exists() else False
                        if inv:
                            if not invoice['UID'] == inv.myob_uid: inv.myob_uid = invoice['UID']
                            if invoice['Status'] == "Closed" and invoice['LastPaymentDate']:
                                inv.date_paid = datetime.strptime(invoice['LastPaymentDate'].split('T')[0], '%Y-%m-%d')

                            inv.save()
                            print(invoice['Number'], invoice['Status'])

            return self(success=True, message=json.dumps(invoices['Items']))
        else:
            return self(success=False, message="MYOB Connection Error")

class myobSyncBills(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            bills = []

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)
            bills = res
            counter = 1

            while res['NextPageLink'] != None:
                skip = 1000*counter
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service?$top=1000&$skip={skip}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})
                res = json.loads(response.text)
                bills['Items'].extend(res['Items'])
                counter += 1
        
            relevant_bills = []
            for bill in bills['Items']:
                if len(bill['Lines']) > 0:
                    if Contractor.objects.filter(myob_uid=bill['Supplier']['UID']).exists():
                        if bill['Lines'][0]['Job']:
                            job_UID = bill['Lines'][0]['Job']['UID']
                            if Job.objects.filter(myob_uid=job_UID).exists():
                                job = Job.objects.get(myob_uid=job_UID)
                                relevant_bills.append(bill)

                                # Create Bill
                                if(not Bill.objects.filter(myob_uid=bill['UID']).exists()):
                                    b = Bill()
                                    b.job = job
                                    b.myob_uid = bill['UID']
                                    b.supplier = Contractor.objects.get(myob_uid=bill['Supplier']['UID'])
                                    b.process_date = datetime.strptime(bill['Date'].split("T")[0], "%Y-%m-%d")
                                    b.invoice_date = datetime.strptime(bill['Date'].split("T")[0], "%Y-%m-%d")
                                    b.invoice_number = bill['SupplierInvoiceNumber']
                                    b.amount = bill['TotalAmount']
                                else:
                                    b = Bill.objects.get(myob_uid=bill['UID'])
                                    b.job = job
                                    b.myob_uid = bill['UID']
                                    b.supplier = Contractor.objects.get(myob_uid=bill['Supplier']['UID'])
                                    b.process_date = datetime.strptime(bill['Date'].split("T")[0], "%Y-%m-%d")
                                    b.invoice_date = datetime.strptime(bill['Date'].split("T")[0], "%Y-%m-%d")
                                    b.invoice_number = bill['SupplierInvoiceNumber']
                                    b.amount = bill['TotalAmount']
                                
                                b.save()

            return self(success=True, message=json.dumps(relevant_bills))
        else:
            return self(success=False, message="MYOB Connection Error")


class myobImportContractorsFromBills(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            ## Get Bills
            bills = []

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)
            bills = res
            counter = 1

            while res['NextPageLink'] != None:
                skip = 1000*counter
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service?$top=1000&$skip={skip}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})
                res = json.loads(response.text)
                bills['Items'].extend(res['Items'])
                counter += 1

            contractors = []
            
            for bill in bills['Items']:
                if 'Lines' in bill.keys() and bill['Lines']:
                    for line in bill['Lines']:
                        if 'Job' in line.keys() and line['Job']:
                            uid = line['Job']['UID']
                            job = Job.objects.get(myob_uid=uid) if Job.objects.filter(myob_uid=uid).exists() else None 
                            if job:
                                # print(job)
                                # print(bill['Supplier']['Name'], bill['Supplier']['UID'])
                                contractor, created = Contractor.objects.get_or_create(
                                    myob_uid = bill['Supplier']['UID']
                                )
                                contractor.name = bill['Supplier']['Name']

                                # OPTIMISE - Get all contractors then find in that list. Not individual contractors
                                if contractor.abn == "":
                                    link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier?$filter=UID eq guid'{bill['Supplier']['UID']}'"
                                    headers = {                
                                        'Authorization': f'Bearer {user.access_token}',
                                        'x-myobapi-key': env('CLIENT_ID'),
                                        'x-myobapi-version': 'v2',
                                        'Accept-Encoding': 'gzip,deflate',
                                    }
                                    
                                    response = requests.get(link, headers=headers)
                                    res = json.loads(response.text)
                                    supp = res['Items']

                                    contractor.abn = supp[0]['BuyingDetails']['ABN']
                                    contractor.bsb = supp[0]['PaymentDetails']['BSBNumber'] if not isna(supp[0]['PaymentDetails']['BSBNumber'] ) else ""
                                    contractor.bank_account_number = supp[0]['PaymentDetails']['BankAccountNumber'] if not isna(supp[0]['PaymentDetails']['BankAccountNumber']) else ""
                                    contractor.bank_account_name = supp[0]['PaymentDetails']['BankAccountName'] if not isna(supp[0]['PaymentDetails']['BankAccountName']) else ""
                                contractor.save()

                                if created:
                                    contractors.append(contractor)

                # contractors.update({contractor.name: contractor.uid})
            
            return self(success=True, message=json.dumps(contractors))
        else:
            return self(success=False, message="MYOB Connection Error")

class myobImportClientFromABN(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        name = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, name):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            ## Get Contractor by ABN

            name = urllib.parse.quote(name)
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Customer?$filter=CompanyName eq '{name}'"

            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)

            if res['Items'] and not len(res['Items']) > 0:
                return self(success=False, message="Client not found with the provided details")
            
            clientDetails = res['Items'][0]
            
            if(Client.objects.filter(myob_uid=clientDetails['UID']).exists()):
                return self(success=False, message="Client Already Exists")
            
            client = Client()
            client.name = clientDetails['CompanyName']
            client.myob_uid = clientDetails['UID']
            client.save()

            return self(success=True, message="Client Imported")
        else:
            return self(success=False, message="MYOB Connection Error")
        
class myobImportContractorFromABN(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        name = graphene.String()
        abn = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, name, abn):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            ## Get Contractor by ABN

            name = urllib.parse.quote(name)
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier?$filter=CompanyName eq '{name}' and BuyingDetails/ABN eq '{abn}'"

            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)

            if res['Items'] and not len(res['Items']) > 0:
                return self(success=False, message="Contractor not found with the provided details")
            
            contractorDetails = res['Items'][0]
            
            if Contractor.objects.filter(myob_uid = contractorDetails['UID']).exists():
                return self(success=False, message="Contractor already exists in the system")

            contractor = Contractor.objects.create(myob_uid = contractorDetails['UID'])
            contractor.name = contractorDetails['CompanyName']
            contractor.abn = contractorDetails['BuyingDetails']['ABN']
            contractor.bsb = contractorDetails['PaymentDetails']['BSBNumber'] if not isna(contractorDetails['PaymentDetails']['BSBNumber'] ) else ""
            contractor.bank_account_number = contractorDetails['PaymentDetails']['BankAccountNumber'] if not isna(contractorDetails['PaymentDetails']['BankAccountNumber']) else ""
            contractor.bank_account_name = contractorDetails['PaymentDetails']['BankAccountName'] if not isna(contractorDetails['PaymentDetails']['BankAccountName']) else ""
            contractor.save()

            return self(success=True, message="Contractor Imported")
        else:
            return self(success=False, message="MYOB Connection Error")


class myobImportBGISInvoices(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            print("Importing BGIS Invoices")

            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            invoices = []

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service?$top=1000"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            res = json.loads(response.text)
            invoices = res
            counter = 1

            while res['NextPageLink'] != None:
                skip = 1000*counter
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service?$top=1000&$skip={skip}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers, data={})
                res = json.loads(response.text)
                invoices['Items'].extend(res['Items'])
                counter += 1

            invs = []
            bgis = Client.objects.get(name='BGIS')
            for invoice in invoices['Items']:
                # print(invoice)
                if invoice['Customer']['UID'] == bgis.myob_uid:
                    if invoice['CustomerPurchaseOrderNumber']:
                        po = invoice['CustomerPurchaseOrderNumber'].split('_')[0] if '_' in invoice['CustomerPurchaseOrderNumber'] else invoice['CustomerPurchaseOrderNumber']
                        job = Job.objects.get(po=po[2:]) if Job.objects.filter(po=po[2:]).exists() else None 
                        if job:
                            new_invoice, created = Invoice.objects.get_or_create(myob_uid=invoice['UID'])
                            new_invoice.number = invoice['Number']
                            new_invoice.date_created = invoice['Date'].split('T')[0]
                            new_invoice.date_paid = invoice['LastPaymentDate'].split('T')[0]
                            new_invoice.amount = round(float(invoice['Subtotal']), 2)
                            new_invoice.save()

                            # JobInvoice.objects.get_or_create(job=job, invoice=new_invoice)

                            invs.append(invoice)
                    
            print("Imported BGIS Invoices")
            return self(success=True, message=json.dumps(invs))
        else:
            return self(success=False, message="MYOB Connection Error")

class myobCreateInvoice(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    number = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, job):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            print("Creating Invoice")

            job = Job.objects.get(po=job) if Job.objects.filter(po=job).exists() else None 

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

            if JobInvoice.objects.filter(job=job).exists():
                return self(success=False, message="Invoice already exists for this job")

            invoice = []

            folder_name = str(job)
            job_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)

            if not os.path.exists(job_folder):
                return self(success=False, message="Job Folder does not exist!")

            accounts_folder = os.path.join(job_folder, "Accounts", "Aurify")

            if not os.path.exists(accounts_folder):
                os.mkdir(accounts_folder)
            estimate_folder = os.path.join(job_folder, "Estimates", estimate.name)

            if not os.path.exists(accounts_folder):
                return self(success=False, message="Jobs Accounts Folder does not exist!")

            if job.client.name == "BGIS":
                ## Check the required invoice files that are stored in the relevant estimate folder
                found = {"approval": False, "estimate": False}
                paths = {"invoice": "", "approval": "", "estimate": ""}
                
                # Only need approval and breakdown on jobs > $500
                if estimate.price > 500.00:
                    if not os.path.exists(estimate_folder):
                        return self(success=False, message="Jobs Estimate Folder does not exist!")

                    for files in os.listdir(estimate_folder):
                        if "Approval" in files:
                            found['approval'] = True
                            paths['approval'] = os.path.join(estimate_folder, files)
                        if "BGIS Estimate" in files:
                            if files.endswith(".pdf"):
                                found["estimate"] = True
                                paths["estimate"] = os.path.join(estimate_folder, files)
                            else:
                                # Convert excel sheet to pdf
                                xlApp = win32.DispatchEx("Excel.Application", pythoncom.CoInitialize())
                                books = xlApp.Workbooks.Open(os.path.join(estimate_folder, files))
                                ws = books.Worksheets[0]
                                ws.Visible = 1
                                ws.ExportAsFixedFormat(0, estimate_folder + "/" + files.strip(".xlsm") + ".pdf")
                                xlApp.ActiveWorkbook.Close()

                                found["estimate"] = True
                                paths["estimate"] = os.path.join(estimate_folder, files.strip(".xlsm") + ".pdf")
                else:
                    found['approval'] = True
                    found['estimate'] = True

                if estimate.price > 500.00 and not all(found.values()):
                    return self(success=False, message="Error. Not all required files can be found:" + str(found))
            
            else:
                ## Check the required invoice files that are stored in the relevant estimate folder
                found = {"purchaseOrder": False}
                paths = {"invoice": "", "purchaseOrder": ""}

                for files in os.listdir(estimate_folder):
                    if "PO" + job.po in files:
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
            # POST Invoice to MYOB
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Order/Service/"
            payload = json.dumps({
                "Date": datetime.today(), 
                "Customer": {"UID": job.client.myob_uid},
                "CustomerPurchaseOrderNumber": "PO" + job.po,
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
            }, default=str)

            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Type': 'application/json',
            }
            response = requests.request("POST", url, headers=headers, data=payload)

            if(not response.status_code == 201):
                print("Error:", job, response)
                return self(success=False, message=json.loads(response.text))

            # Get the invoice number and create new invoice model
            invoice_uid = response.headers['Location'].replace(url, "")
            print("Invoice Created for", str(job), " - UID =", invoice_uid)

            ## Confirm Creation and get details (number)
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Order/Service?$filter=UID eq guid'{invoice_uid}'"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            res = requests.request("GET", url, headers=headers, data={})
            res = json.loads(res.text)
            invoice = res['Items']
            invoice = invoice[0]

            new_invoice, created = Invoice.objects.get_or_create(myob_uid=invoice_uid)
            new_invoice.number = invoice['Number']
            new_invoice.date = invoice['Date'].split('T')[0]
            new_invoice.amount = round(float(invoice['Subtotal']), 2)
            new_invoice.save()

            JobInvoice.objects.get_or_create(job=job, invoice=new_invoice)
            job.save() ## Update job stage

            # Get invoice as PDF
            print("Getting PDF")
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Order/Service/{invoice_uid}/?format=pdf&templatename={INVOICE_TEMPLATE}"
        
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
                'Accept': 'Application/PDF'
            }
            pdf_response = requests.request("GET", url, headers=headers, data={})

            if(not pdf_response.status_code == 200):
                print(pdf_response, "Error retrieving PDF for", job)
                return self(success=False, message=json.loads(response.text))
            
            print("Writing Invoice to File")
            with open(f"./myob/invoices/INV{invoice['Number']} - PO{job.po}.pdf", "wb") as f:
                f.write(pdf_response.content)

            shutil.copyfile(f"./myob/invoices/INV{invoice['Number']} - PO{job.po}.pdf", f"{job_folder}/Accounts/Aurify/INV{invoice['Number']} - PO{job.po}.pdf")
            paths['invoice'] = f"{job_folder}/Accounts/Aurify/INV{invoice['Number']} - PO{job.po}.pdf"

            print("Invoice Saved")

            # Create Full Invoice using function from invoice_generator.py
            print("Invoice Generation Starting")
            result = generate_invoice(job, paths, invoice, accounts_folder, insurance_expiry_date)
            if not result['success']:
                return self(success=False, message=result['message'])

            print("Invoice Generated")
            return self(success=True, message=json.dumps(result['message']), number=invoice['Number'])
        else:
            return self(success=False, message="MYOB Connection Error")


class BillInputType(graphene.InputObjectType):
    contractor = graphene.String()
    invoiceNumber = graphene.String()
    invoiceDate = graphene.Date()
    amount = graphene.Decimal()
    billType = graphene.String()

class BillOutputType(DjangoObjectType):
    class Meta:
        model = Bill
        fields = '__all__'

class myobCreateBill(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        jobId = graphene.String()
        newBill = BillInputType()
        attachment = graphene.String()
        attachmentName = graphene.String()

    success = graphene.Boolean()
    message= graphene.String()
    error = graphene.String()
    uid = graphene.String()
    bill = graphene.Field(BillOutputType)
    
    @classmethod
    def mutate(self, root, info, uid, jobId, newBill, attachment, attachmentName):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            supplier = Contractor.objects.get(id=newBill['contractor'])
            job = Job.objects.get(po=jobId)

            if not job.myob_uid:
                return self(success=False, message="Please sync job with MYOB before creating invoice!")

            # Check to see if bill already exists in the system
            if Bill.objects.filter(supplier=supplier, invoice_number=newBill['invoiceNumber'], invoice_date=newBill['invoiceDate']).exists():
                return self(success=False, message="Bill Already Exists", error=Bill.objects.get(supplier=supplier, invoice_number=newBill['invoiceNumber']))

            folder_name = str(job)
            job_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)

            if not os.path.exists(job_folder):
                return self(success=False, message="Job Folder Does Not Exist", error="Folder Not Found")

            accounts_folder = os.path.join(job_folder, "Accounts", supplier.name)

            if not os.path.exists(accounts_folder):
                os.mkdir(accounts_folder)
                
            pdf = base64.b64decode(attachment, validate=True)
            with open(os.path.join(accounts_folder, attachmentName), 'wb') as f:
                f.write(pdf)

            print("Creating Bill")

            # Get shipToAddress from MYOB
            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Supplier?$filter=UID eq guid'{supplier.myob_uid}'"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.get(link, headers=headers)

            if not response.status_code == 200:
                return self(success=False, message="Could Not Get Contractor Details From MYOB", error=response.text)

            res = json.loads(response.text)
            contractorDetails = res['Items']

            shipToAddress = supplier.name # Default bill to as suppliers name
            if contractorDetails[0]['Addresses'] == None:
                return self(success=False, message="Please add an address to the supplier in MYOB")

            if len(contractorDetails) > 0 and len(contractorDetails[0]['Addresses']) > 0:
                addressDetails = contractorDetails[0]['Addresses'][0]
                shipToAddress = f"{contractorDetails[0]['CompanyName']}\n{addressDetails['Street']},\n{addressDetails['City']} {addressDetails['State']} {addressDetails['PostCode']}"

            # 5-1100 Maintenance Subcontractors - d7a5adf7-a9c1-47b0-b11d-f72f62cd575d
            # 5-2100 Maintenance Materials - 83c3ab74-1b2e-4002-9e38-65c99fbf2b46
            
            bill_account = "d7a5adf7-a9c1-47b0-b11d-f72f62cd575d"
            if newBill['billType'] == 'material':
                bill_account = "83c3ab74-1b2e-4002-9e38-65c99fbf2b46"

            # POST Bill to MYOB
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service/"
            payload = json.dumps({
                "Date": newBill['invoiceDate'], 
                "Supplier": {"UID": supplier.myob_uid},
                "SupplierInvoiceNumber": newBill['invoiceNumber'],
                "ShipToAddress": shipToAddress,
                "IsTaxInclusive": True,
                "Lines": [
                    {
                        "Type": "Transaction",
                        "Description": str(job),
                        "Account": {"UID": bill_account},
                        "TaxCode": {"UID": "d35a2eca-6c7d-4855-9a6a-0a73d3259fc4"},
                        "Total": round(newBill['amount'], 2),
                        "Job": {"UID": job.myob_uid},
                    }
                ],
                "FreightTaxCode": {"UID": "d35a2eca-6c7d-4855-9a6a-0a73d3259fc4"},
                "JournalMemo": f"Purchase: {supplier.name}",
            }, default=str)
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Type': 'application/json',
            }
            response = requests.request("POST", url, headers=headers, data=payload)

            if(not response.status_code == 201):
                return self(success=False, message="Issue creating bill in MYOB", error=json.loads(response.text))

            # Get the bill uid
            bill_uid = response.headers['Location'].replace(url, "")

            job = Job.objects.get(po=jobId)

            bill = Bill()
            bill.job = job
            bill.myob_uid = uid
            bill.supplier = supplier
            bill.amount = newBill['amount']
            bill.invoice_date = newBill['invoiceDate']
            bill.invoice_number = newBill['invoiceNumber']
            bill.save()

            print("Bill Created for", supplier.name, "- UID =", bill_uid)

            # # POST Bill Attachment to MYOB
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service/{bill_uid}/Attachment"
            payload = json.dumps({
                "Attachments": [
                    {
                        "FileBase64Content": attachment,
                        "OriginalFileName": attachmentName,
                    }
                ],
            }, default=str)
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Type': 'application/json',
            }
            response = requests.request("POST", url, headers=headers, data=payload)

            if not response.status_code == 200:
                print(response)
                return self(success=True, message="Error Uploading Attachment. Please manually attach in MYOB", uid=bill_uid, error=response.text)

            print("Attachment Added")

            return self(success=True, message="Bill Created Successfully", bill=bill, error=None)
        return self(success=False, message="MYOB Authorisation Error", error="Can not authorise myob account")

class myobProcessPayment(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        client = graphene.String()
        payment_date = graphene.Date()
        invoices = graphene.List(InvoiceUpdateInput)

    success = graphene.Boolean()
    message= graphene.String()
    error = graphene.String()
    job_invoice = graphene.List(JobInvoiceType)
    
    @classmethod
    def mutate(self, root, info, uid, client, invoices, payment_date):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            client = Client.objects.get(id=client)

            # Create payment from the list of invoices provided
            paid_invoices = []
            external_invoices = []
            for invoice in invoices:
                if Invoice.objects.filter(number=invoice.number).exists():
                    inv = Invoice.objects.get(number=invoice.number)
                    paid_invoices.append({
                        "UID": inv.myob_uid,
                        "Type": "Invoice",
                        "AmountApplied": round(float(inv.amount) * 1.1, 2),
                        "AmountAppliedForeign": None
                    })
                else:
                    external_invoices.append(invoice.number)

            if len(external_invoices) > 1:
                # Get the details of the invoices that are not saved in the system
                return self(success=False, message="Get Dev to finish this function")
                pass


            if len(paid_invoices) < 1:
                return self(success=False, message="No Invoices Found")

            # POST Payment to MYOB
            # ANZ Online-Saver UID: "7c6557f4-d684-41f2-9e0b-2f53c06828d3"
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/CustomerPayment"
            payload = json.dumps({
                "Date": payment_date, 
                "DepositTo": "Account",
                "Account": {"UID": "7c6557f4-d684-41f2-9e0b-2f53c06828d3"},
                "Customer": {"UID": client.myob_uid},
                "Invoices": paid_invoices,
                "PaymentMethod": "EFT",
                "Memo": f"Payment: Transfer from {client.name}"
            }, default=str)
            headers = {
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
                'Content-Type': 'application/json',
            }
            response = requests.request("POST", url, headers=headers, data=payload)

            # print(payload)

            if(not response.status_code == 201):
                return self(success=False, message="Issue creating bill in MYOB", error=json.loads(response.text))

            # Update invoices after the payment is processed in myob
            updatedInvoices = []
            for inv in invoices:
                invoice = Invoice.objects.get(number=inv.number) if Invoice.objects.filter(number=inv.number).exists() else False
                if invoice:
                    if not inv.date_issued: invoice.date_issued = inv.date_issued
                    invoice.date_paid = payment_date
                    invoice.save()

                    jobinv = JobInvoice.objects.get(invoice=invoice)
                    jobinv.job.save() ## save job to update stage
                    updatedInvoices.append(jobinv)

            return self(success=True, message="Invoices Updated and Payment Processed.", job_invoice=updatedInvoices)

        return self(success=False, message="Error connecting to MYOB.", error=json.loads("MYOB Connection Error"))

class InvoiceInput(graphene.InputObjectType):
    number = graphene.String()
    date_issued = graphene.Date()
        
class convertSaleOrdertoInvoice(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        invoices = graphene.List(InvoiceInput)
        date_paid = graphene.Date(required=False)

    success = graphene.Boolean()
    message = graphene.String()
    error = graphene.Field(graphene.String)
    converted = graphene.List(graphene.String)

    @classmethod
    def mutate(self, root, info, uid, invoices, date_paid=None):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)
            converted = []
            _invoices = invoices.copy()
            new_uids = {}

            while len(invoices) > 0:
                query_limit = 35

                # Build Query
                queryFilter = ""
                for i, inv in enumerate(invoices[:query_limit]):
                    invoice = Invoice.objects.get(number=inv.number)
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
                    return self(success=False, message="Error with MYOB Request", error=response.text)

                res = json.loads(response.text)

                res = res['Items']
                if len(res) == 0:
                    return self(success=True, message="Invoices Updated")

                for i, order in enumerate(res):
                    if order['Status'] == "ConvertedToInvoice":
                        print("Already Converted:", order['Number'])
                        for idx, inv in enumerate(invoices[:query_limit]):
                            if inv['number'] == order['Number']:
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
                    
                    invoice_uid = response.headers['Location'].replace(url, "")
                    new_uids.update({order['Number']: invoice_uid})
                    
                    converted.append(order['Number'])
                    del invoices[:query_limit]

            updatedInvoices = []
            for inv in _invoices:
                invoice = Invoice.objects.get(number=inv.number) if Invoice.objects.filter(number=inv.number).exists() else False
                if invoice:
                    if inv.number in new_uids: invoice.myob_uid = new_uids[inv.number]
                    if not invoice.date_issued: invoice.date_issued = inv.date_issued
                    if date_paid: invoice.date_paid = date_paid
                    invoice.save()

                    jobinv = JobInvoice.objects.get(invoice=invoice)
                    jobinv.job.save() ## save job to update stage
                    updatedInvoices.append(jobinv)

            return self(success=True, message="Orders have been converted", converted=converted)
        return self(success=False, message="MYOB Connection Error")

class myobCustomFunction(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    obj = graphene.String()
    items = graphene.List(graphene.String)

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

        return self(success=False, message="MYOB Auth Error")

class generateInvoice(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, job):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            print("Creating Invoice")
            job = Job.objects.get(id=job) if Job.objects.filter(id=job).exists() else None 
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
            
            invoice = []

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
                        
                    for files in os.listdir(estimate_folder):
                        if "Approval" in files:
                            found['approval'] = True
                            paths['approval'] = os.path.join(estimate_folder, files)
                        if "BGIS Estimate" in files and not found["estimate"]:
                            if files.endswith(".pdf"):
                                found["estimate"] = True
                                paths["estimate"] = os.path.join(estimate_folder, files)
                            else:
                                # Convert excel sheet to pdf
                                xlApp = win32.DispatchEx("Excel.Application", pythoncom.CoInitialize())
                                xlApp.Visible = True
                                wb = xlApp.Workbooks.Open(os.path.join(estimate_folder, files))
                                ws = wb.Sheets("Cost Breakdown")
                                ws.ExportAsFixedFormat(0, estimate_folder + "/" + files.strip(".xlsm") + ".pdf")
                                
                                wb.Close(False)
                                xlApp.Quit()

                                found["estimate"] = True
                                paths["estimate"] = os.path.join(estimate_folder, files.strip(".xlsm") + ".pdf")
                else:
                    found['approval'] = True
                    found['estimate'] = True
                
            else:
                ## Check the required invoice files that are stored in the relevant estimate folder
                found = {"invoice": False, "purchaseOrder": False}
                paths = {"invoice": "", "purchaseOrder": ""}

                for files in os.listdir(accounts_folder):
                    if "INV" in files:
                        found['invoice'] = True
                        paths['invoice'] = os.path.join(accounts_folder, files)

                for files in os.listdir(estimate_folder):
                    if "PO" + job.po in files:
                        if files.endswith(".pdf"):
                            found["purchaseOrder"] = True
                            paths["purchaseOrder"] = os.path.join(estimate_folder, files)
                
                if not found['purchaseOrder']:
                    return self(success=False, message="Error. Purchase Order can not be found")

            # GET Invoice from MYOB
            jobinvoice = JobInvoice.objects.get(job=job)
            inv = jobinvoice.invoice
            invoice_number = inv.number
            invoice_uid = inv.myob_uid
            
            if not invoice_number or not invoice_uid:
                return self(success=False, message=json.dumps("Invoice not found"))
            
            sale_type = "Order"
            if inv.date_issued != None:
                sale_type = "Invoice"

            if not found['invoice']:
                print("Getting PDF")
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/{sale_type}/Service/{invoice_uid}/?format=pdf&templatename={INVOICE_TEMPLATE}"
            
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                    'Accept': 'Application/PDF'
                }
                pdf_response = requests.request("GET", url, headers=headers, data={})

                if(pdf_response.status_code != 200):
                    print(pdf_response, "Error retrieving PDF for", job)
                    return self(success=False, message=json.loads(pdf_response.text))
                else:
                    print("Writing Invoice to File")
                    with open(f"./myob/invoices/INV{invoice_number} - PO{job.po}.pdf", "wb") as f:
                        f.write(pdf_response.content)

                    shutil.copyfile(f"./myob/invoices/INV{invoice_number} - PO{job.po}.pdf", f"{accounts_folder}/INV{invoice_number} - PO{job.po}.pdf")
                    paths['invoice'] = f"{accounts_folder}/INV{invoice_number} - PO{job.po}.pdf"
                    found['invoice'] = True

                    print("Invoice Saved")

            if not all(found.values()):
                return self(success=False, message="Not all required files can be found - " + str(found))

            print("Invoice: ", invoice_number)
            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/{sale_type}/Service?$filter=Number eq '{invoice_number}'"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers, data={})
            
            ## Save Invoice as PDF
            if not response.status_code == 200:
                print("Error:", job)
                return self(success=False, message=json.loads(response.text))
            else:
                res = json.loads(response.text)
                res = res['Items']
                invoice = res[0]
                
                # Create Full Invoice using function from invoice_generator.py
                result = generate_invoice(job, paths, invoice, accounts_folder, insurance_expiry_date)

                print("Invoice Generation Finished")
                
                return self(success=result['success'], message=result['message'])
        else:
            return self(success=False, message="MYOB Connection Error")

class myobGetTimesheets(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        timesheet = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, timesheet):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            timesheet_filter = "" if timesheet == "" else "?$filter=" + timesheet
            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Payroll/Timesheet{timesheet_filter}"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.get(link, headers=headers)

            return self(success=True, message=response.text)
        
class myobCustomQuery(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        query = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid, query):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            link = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/{query}"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.get(link, headers=headers)

            return self(success=True, message=response.text)

class Query(graphene.ObjectType):
    myob_users = graphene.List(MyobUserType)

    @login_required
    def resolve_myob_users(root, info, **kwargs):
        return MyobUser.objects.all()


class Mutation(graphene.ObjectType):
    myob_get_timesheets = myobGetTimesheets.Field()
    myob_custom_query = myobCustomQuery.Field()

    myob_initial_connection = myobInitialConnection.Field()
    myob_get_access_token = myobGetAccessToken.Field()
    update_or_create_myob_account = updateOrCreateMyobAccount.Field()
    delete_myob_user = DeleteMyobUser.Field()
    myob_refresh_token = myobRefreshToken.Field()

    myob_get_clients = myobGetClients.Field()
    myob_create_client = myobCreateClient.Field()

    myob_get_contractors = myobGetContractors.Field()
    myob_create_contractor = myobCreateContractor.Field()
    myob_update_contractor = myobUpdateContractor.Field()

    myob_get_invoices = myobGetInvoices.Field()
    myob_get_orders = myobGetOrders.Field()
    myob_get_bills = myobGetBills.Field()
    myob_get_jobs = myobGetJobs.Field()
    myob_get_accounts = myobGetAccounts.Field()
    myob_get_tax_codes = myobGetTaxCodes.Field()
    myob_get_general_journal = myobGetGeneralJournal.Field()

    myob_sync_jobs = myobSyncJobs.Field()
    myob_sync_invoices = myobSyncInvoices.Field()
    myob_sync_bills = myobSyncBills.Field()
    myob_sync_clients = myobSyncClients.Field()
    myob_sync_contractors = myobSyncContractors.Field()
    
    myob_import_contractor_from_abn = myobImportContractorFromABN.Field()
    myob_import_client_from_abn = myobImportClientFromABN.Field()
    myob_import_contractors_from_bills = myobImportContractorsFromBills.Field()
    myob_import_bgis_invoices = myobImportBGISInvoices.Field()

    myob_create_job = myobCreateJob.Field()
    myob_create_invoice = myobCreateInvoice.Field()
    myob_create_bill = myobCreateBill.Field()
    myob_process_payment = myobProcessPayment.Field()

    generate_invoice = generateInvoice.Field()
    repair_sync = myobRepairJobSync.Field()
    convert_sale = convertSaleOrdertoInvoice.Field()
    myob_custom_function = myobCustomFunction.Field()


# 4-1000 Construction Income - 8fa9fc62-8cb0-4cad-9f08-686ffa76c98b
# 5-1000 Subcontractors - 6c8f22f3-39dc-41f0-9f59-0949f9ee0b76

# 4-3000 Maintenance Income - e5495a96-41a3-4e65-b56d-43e585f2742d
# 5-1100 Maintenance Subcontractors - d7a5adf7-a9c1-47b0-b11d-f72f62cd575d
# 5-2100 Maintenance Materials - 83c3ab74-1b2e-4002-9e38-65c99fbf2b46

# TaxCode GST - d35a2eca-6c7d-4855-9a6a-0a73d3259fc4 