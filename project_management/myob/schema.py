from datetime import date, datetime, timedelta
from genericpath import exists
import shutil
from accounts.models import CustomUser
from api.models import Client, Contractor, ContractorContact, Estimate, Job, Invoice, Bill, RemittanceAdvice
from api.schema import  JobType
from myob.object_types import CustomerPaymentObject, SupplierObject
from myob.input_object_types import SupplierInputObject
import graphene
from graphene_django import DjangoObjectType
from graphql_jwt.decorators import login_required
import json
import os
from subprocess import Popen, PIPE
import base64
from pandas import isna
from myob.scripts.invoice_generator import generate_invoice
from .models import MyobUser
from django.utils import timezone
import environ
import requests
import urllib.parse
import inspect


INVOICE_TEMPLATE = "James Tax Invoice 2022"
MAIN_FOLDER_PATH = r"C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Jobs"

class UIDType(graphene.InputObjectType):
    UID = graphene.String()

def is_valid_myob_user(uid, user):
    if MyobUser.objects.filter(id=uid).exists():
        
        myob_user = MyobUser.objects.get(id=uid)
        if not user: user = CustomUser.objects.get(email=user, myob_user=myob_user)
    
        return user.myob_access
    
    return False

# Check the current authentication of user, and refresh token if required (within 2 minutes of expiry)
def check_user_token_auth(uid, usr):
    env = environ.Env()
    environ.Env.read_env()

    print(f'Checking MYOB Auth from {inspect.stack()[1][0].f_locals["self"].__name__}')

    if is_valid_myob_user(uid, usr):
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
            return user
        else:
            print('MYOB Auth Active')
            return user
    else:
        print('Error with MYOB User Auth')
        return None
    
def get_myob_user(user):
    user = CustomUser.objects.get(email=user)

    if user.myob_access and user.myob_user:    
        return user.myob_user
    
    return None

# Check the current authentication of user, and refresh token if required (within 2 minutes of expiry)
def check_user_token_auth_new(usr) -> MyobUser:
    env = environ.Env()
    environ.Env.read_env()

    print(f'Checking MYOB Auth from {inspect.stack()[1][0].f_locals["self"].__name__}')

    user = get_myob_user(usr)
    if user is None:
        print('Error with MYOB User Auth')
        return None

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
        return user
    else:
        print('MYOB Auth Active')
        return user


def myob_get(user: MyobUser, url: str, filter:str = '', all:bool = False) -> dict:
    """ Basic Get request to myob with option for filter

    ``user`` is the myob user object
    ``url`` is the myob endpoint for the get request
    ``filter`` is an optional string with the odata query for the myob endpoint
    
    returns json object with the response data

    """
    print("MYOB GET", url, filter)

    env = environ.Env()
    environ.Env.read_env()

    headers = {                
        'Authorization': f'Bearer {user.access_token}',
        'x-myobapi-key': env('CLIENT_ID'),
        'x-myobapi-version': 'v2',
        'Accept-Encoding': 'gzip,deflate',
    }

    get_filter = "" if filter == "" else "?$filter=" + filter
    if all:
        get_filter += "&$top=1000" if filter else "?$top=1000"

    response = requests.get(f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/{url}{get_filter}", headers=headers) 

    if response.status_code != 200:
        print(response.status_code, response.text)
        return None

    if not all:
        return json.loads(response.text)
    
    res = json.loads(response.text)
    data = res
    counter = 1
    
    while res['NextPageLink'] != None:
        skip = 1000*counter
        response = requests.get(f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/{url}/{get_filter}{'?' if get_filter == '' else '&'}$skip={skip}", headers=headers)
        
        if response.status_code != 200:
            print(response.status_code, response.text)
            raise BaseException("Get Request Failed")
            
        res = json.loads(response.text)
        data['Items'].extend(res['Items'])
        counter += 1

    # print(f"Fetched: {skip} records from {url}")

    return data

def myob_post(user: MyobUser, url: str, payload) -> requests.Response:
    """ Basic Post request to myob with a payload

        ``user`` is the myob user object
        ``url`` is the myob endpoint for the get request
        ``payload`` is the payload for the request
    
        returns the requests data
    """
    print("MYOB POST", url)

    env = environ.Env()
    environ.Env.read_env()

    headers = {                
        'Authorization': f'Bearer {user.access_token}',
        'x-myobapi-key': env('CLIENT_ID'),
        'x-myobapi-version': 'v2',
        'Accept-Encoding': 'gzip,deflate',
    }

    response = requests.post(f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/{url}", headers=headers, data=payload)
    
    if response.status_code != 200 and response.status_code != 201:
        print(response.status_code, response.text)
        return None
    
    return response

def myob_put(user: MyobUser, url: str, payload) -> requests.Response:
    """ Basic Put request to myob with a payload

        ``user`` is the myob user object
        ``url`` is the myob endpoint for the get request
        ``payload`` is the payload for the request
    
        returns the requests data
    """

    # if "UID" not in payload:
    #     raise BaseException("UID is required for a put request")
    # if "RowVersion" not in payload:
    #     raise BaseException("RowVersion is required for a put request")

    env = environ.Env()
    environ.Env.read_env()

    headers = {                
        'Authorization': f'Bearer {user.access_token}',
        'x-myobapi-key': env('CLIENT_ID'),
        'x-myobapi-version': 'v2',
        'Accept-Encoding': 'gzip,deflate',
    }

    response = requests.put(f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/{url}", headers=headers, data=payload)

    
    print(response.status_code, response.text)
    if response.status_code != 200:
        print(response.status_code, response.text)
        return None

    return response

def get_response_uid(response):
    return response.headers['Location'][-36:]

class MyobUserType(DjangoObjectType):
    class Meta:
        model = MyobUser
        fields = "__all__"

class myobInitialConnection(graphene.Mutation):
    success = graphene.Boolean()
    auth_link = graphene.String()

    @classmethod
    @login_required
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
    @login_required
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

class myobRefreshToken(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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
    # user = graphene.Field(MyobUserType)

    @classmethod
    @login_required
    def mutate(self, root, info, access_token, expires_in, refresh_token, uid, user_id, username=None):

        app_user = CustomUser.objects.get(id=user_id) if CustomUser.objects.filter(id=user_id).exists() else False
        user = MyobUser.objects.get(id=uid) if is_valid_myob_user(uid, info.context.user) else False
        
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

        return self(success=True, message="Account Updated")

class DeleteMyobUser(graphene.Mutation):
    class Arguments:
        # user_id = graphene.String()
        myob_uid = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, user_id, myob_uid):
        myob_user = MyobUser.objects.get(id=myob_uid) if MyobUser.objects.filter(id=myob_uid).exists() else False
        app_user = CustomUser.objects.get(id=user_id) if CustomUser.objects.filter(id=user_id).exists() else False
        
        app_user.myob_user = None
        app_user.save()

        if myob_user:
            myob_user.delete()

        return self(success=True)

class CustomerInputType(graphene.InputObjectType):
    id = graphene.String()
    myob_uid = graphene.String()
    name = graphene.String()
    display_name = graphene.String()
    abn = graphene.String()
          
class GetCustomers(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    customers = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, filter):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "Contact/Customer"
        response = myob_get(user, endpoint, filter)

        return self(success=True, customers=json.dumps(response['Items']))

class CreateCustomer(graphene.Mutation):
    class Arguments:
        customer = CustomerInputType()

    success = graphene.Boolean()
    message = graphene.String()
    myob_uid = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, customer):

        if(Client.objects.filter(name=customer.name).exists()):
            return self(success=False, message="Client Already Exists in Database")

        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        # Check if the customer exists based on the ABN
        customer_filter = f"SellingDetails/ABN eq '{customer.abn}'"
        get_url = "Contact/Customer"
        get_res = myob_get(user, get_url, customer_filter)

        if len(get_res['Items']) > 0:
            if len(get_res['Items'] > 1):
                return self(success=False, message="There are multiple customers with the same ABN in MYOB. Please manually merge and retry")

            return self(success=True, message="Customer Already Exists in MYOB. Customer info has been linked", myob_uid=get_res['Items'][0]['UID'])
        
        # Post the new customer details to MYOB
        post_url = "Contact/Customer"
        payload = json.dumps({
            'CompanyName': customer.name,
            'IsActive': True,
            'SellingDetails': {
                'ABN': customer.abn,
                'SaleLayout': 'NoDefault',
                'InvoiceDelivery': 'Print',
                'TaxCode': {'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4'},
                'FreightTaxCode': {'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4'}
            },
        })
        post_res = myob_post(user, post_url, payload)

        if not post_res.status_code == 201:
            return self(success=False, message=post_res.text)
        
        myob_uid = get_response_uid(post_res)

        return self(success=True, message="New Customer Successfully Created", myob_uid=myob_uid)

class UpdateCustomer(graphene.Mutation):
    class Arguments:
        customer = CustomerInputType()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, customer):

        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
        
        # Check if the customer exists based on the ABN
        filter = f"UID eq guid'{customer.myob_uid}'"
        get_endpoint = "Contact/Customer"
        get_res = myob_get(user, get_endpoint, filter)

        # If ABN has been updated we need to check the new ABN is not going to be the same as another client
        if customer.abn != get_res['Items'][0]['SellingDetails']['ABN']:
            filter_abn_check = f"SellingDetails/ABN eq '{customer.abn}'"
            get_res_abn_check = myob_get(user, get_endpoint, filter_abn_check)

            if len(get_res_abn_check['Items']) >= 1:
                return self(success=False, message="The ABN entered already exists for another client, you may already have this client in MYOB.")
        
        # Update the myob customer details
        put_endpoint = f"Contact/Customer/{customer.myob_uid}"
        payload = json.dumps({
            'UID': customer.myob_uid,
            'CompanyName': customer.name,
            'SellingDetails': {
                'ABN': customer.abn,
                'TaxCode': {'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4'},
                'FreightTaxCode': {'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4'}
            },
            'RowVersion': get_res['Items'][0]['RowVersion']
        })
        put_res = myob_put(user, put_endpoint, payload)

        if put_res.status_code != 200:
            print(put_res.status_code, put_res.text)
            return self(success=False, message="Error Updating MYOB Customer" + put_res.text)
        
        return self(success=True, message="Customer Successfully Updated")
        

class GetSuppliers(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    supplier = graphene.Field(SupplierObject)

    @classmethod
    @login_required
    def mutate(self, root, info, filter):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "Contact/Supplier"
        response = myob_get(user, endpoint, filter)

        return self(success=True, supplier=response['Items'])


class myobSupplierContactInput(graphene.InputObjectType):
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

class myobSupplierInput(graphene.InputObjectType):
    id = graphene.String()
    myob_uid = graphene.String()
    name = graphene.String()
    abn = graphene.String()
    bsb = graphene.String()
    bank_account_name = graphene.String()
    bank_account_number = graphene.String()
    contacts = graphene.List(myobSupplierContactInput)

class CreateSupplier(graphene.Mutation):
    class Arguments:
        supplier = myobSupplierInput()

    success = graphene.Boolean()
    message = graphene.String()
    myob_uid = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, supplier):

        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        contact_addresses = []
        for i, contact in enumerate(supplier.contacts):
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


        endpoint = "Contact/Supplier"
        payload = json.dumps({
            'CompanyName': supplier['name'],
            'Addresses': contact_addresses,
            'BuyingDetails': {
                'ABN': supplier.abn.strip(),
                'IsReportable': True,
                'TaxCode': {
                    'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                },
                'FreightTaxCode': {
                    'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                },
            },
            'PaymentDetails': {
                'BSBNumber': supplier['bsb'].strip(),
                'BankAccountName': supplier['bank_account_name'].strip(),
                'BankAccountNumber': supplier['bank_account_number'].strip(),
            },
        })
        response = myob_post(user, endpoint, payload)

        if not response.status_code == 201:
            return self(success=False, message=response.text)

        myob_uid = response.headers['Location'][-36:]

        return self(success=True, message=response.text, myob_uid=myob_uid)
        
class UpdateSupplier(graphene.Mutation):
    class Arguments:
        supplier = myobSupplierInput()
        existing_supplier = SupplierInputObject()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, supplier, existing_supplier=None):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
        
        endpoint = "Contact/Supplier"
        if existing_supplier is None:
            filter = f"UID eq guid'{supplier.myob_uid}'"
            response = myob_get(user, endpoint, filter)
            existing_supplier = response['Items'][0]

        # If ABN has been updated we need to check the new ABN is not going to be the same as another client
        if supplier.abn != existing_supplier['BuyingDetails']['ABN']:
            filter_abn_check = f"BuyingDetails/ABN eq '{supplier.abn}'"
            get_res_abn_check = myob_get(user, endpoint, filter_abn_check)

            if len(get_res_abn_check['Items']) >= 1:
                return self(success=False, message="The ABN entered already exists for another supplier, you may already have this supplier in MYOB.")

        endpoint = f"Contact/Supplier/{supplier.myob_uid}"
        payload = json.dumps({
            'UID': supplier.myob_uid,
            'CompanyName': supplier.name.strip(),
            'BuyingDetails': {
                'ABN': supplier.abn.strip(),
                'IsReportable': True,
                'TaxCode': {
                    'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                },
                'FreightTaxCode': {
                    'UID': 'd35a2eca-6c7d-4855-9a6a-0a73d3259fc4',
                },
            },
            'PaymentDetails': {
                'BSBNumber': supplier.bsb.strip(),
                'BankAccountName': supplier.bank_account_name.strip(),
                'BankAccountNumber': supplier.bank_account_number.strip(),
            },
            'RowVersion': existing_supplier['RowVersion']
        })
        response = myob_put(user, endpoint, payload)

        if not response.status_code == 200:
            return self(success=False, message=response.text)

        return self(success=True, message="Supplier Successfully Updated")

class GetInvoice(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    invoice = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, filter):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
    
        endpoint = "Sale/Invoice/Service"
        invoice = myob_get(user, endpoint, filter)

        return self(success=True, invoice=invoice['Items'])

class myobGetInvoices(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        inv = graphene.String()
        as_pdf = graphene.Boolean()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, inv, as_pdf=False):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        invoice_filter = "" if inv == "" else "?$filter=" + inv

        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Invoice/Service{invoice_filter}"
        
        headers = {                
            'Authorization': f'Bearer {user.access_token}',
            'x-myobapi-key': env('CLIENT_ID'),
            'x-myobapi-version': 'v2',
            'Accept-Encoding': 'gzip,deflate',
        }
        response = requests.request("GET", url, headers=headers, data={})
        
        ## Save Invoice as PDF
        if not response.status_code == 200:
            return self(success=False, message=response.text)

        res = json.loads(response.text)
        res = res['Items']

        if not as_pdf:
            return self(success=True, message=json.dumps(res))

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


class myobGetOrders(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        query = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, query):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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
            

class GetMyobJobs(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    jobs = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, filter):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "GeneralLedger/Job"
        response = myob_get(user, endpoint, filter, all=True)

        return self(success=True, message="Successfully retrieved jobs", jobs=json.dumps(response['Items']))

class myobGetBills(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        bill = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, bill):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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

class GetAccounts(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, filter=''):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "GeneralLedger/Account"
        response = myob_get(user, endpoint, filter, all=True)

        return self(success=True, message=json.dumps(response['Items']))

class myobGetTaxCodes(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/TaxCode?$top=1000"
        
        headers = {                
            'Authorization': f'Bearer {user.access_token}',
            'x-myobapi-key': env('CLIENT_ID'),
            'x-myobapi-version': 'v2',
            'Accept-Encoding': 'gzip,deflate',
        }
        response = requests.request("GET", url, headers=headers, data={})

        return self(success=True, message=response.text)

class GetGeneralJournal(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    general_journal = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, filter=''):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "GeneralLedger/JournalTransaction"
        general_journal = myob_get(user, endpoint, filter, all=True)

        return self(success=True, general_journal=json.dumps(general_journal['Items']))


class myobRepairJobSync(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    errors = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, job_id):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        job = Job.objects.get(id=job_id)

        filter = f"Number eq '{job.po}'"
        endpoint = "GeneralLedger/Job"
        
        response = myob_get(user, endpoint, filter)

        if len(response['Items']) > 0:
            job.myob_uid = response['Items'][0]['UID']
            job.save()
            return self(success=True, message="Job Link Repaired")

        job.myob_uid = ''
        job.save()
        create_job = CreateMyobJob.mutate(root, info, job)
        # create_job_res = create_job.mutate(root, info, uid, job_id)
        return self(success=True, message=create_job.message)


class myobSyncJobs(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    errors = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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
                        "Number": one_job.po,
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
                        print("Uploaded:", one_job, post_response.headers['Location'][-36:])
                        one_job.myob_uid = post_response.headers['Location'][-36:]
                        one_job.save()

        
        print("MYOB Job Sync - Upload Complete")

        return self(success=True, message=json.dumps(jobs['Items']), errors=json.dumps(error_responses))

class JobInputType(graphene.InputObjectType):
    uid = graphene.String()
    identifier = graphene.String()
    name = graphene.String()
    description = graphene.String()
    customer_uid = graphene.String()

class CreateMyobJob(graphene.Mutation):
    class Arguments:
        job = JobInputType()

    success = graphene.Boolean()
    message = graphene.String()
    uid = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, job):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "GeneralLedger/Job/"
        payload = json.dumps({
            "Number": job['identifier'],
            "Name": job['name'],
            "Description": job['description'],
            "IsHeader": False,
            "LinkedCustomer": {"UID": job['customer_uid']},
        })
        post_response = myob_post(user, endpoint, payload)

        if post_response == None or post_response.status_code != 201:
            print("Error:", job)
            return self(success=False, message=json.dumps(post_response.text))

        job_uid = get_response_uid(post_response)
        
        return self(success=True, message=json.dumps("Job Linked to MYOB"), uid=job_uid)
     
class myobSyncClients(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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

class myobSyncContractors(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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

class myobSyncInvoices(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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
                        if not inv.date_issued: inv.date_issued = datetime.strptime(invoice['Date'].split('T')[0], '%Y-%m-%d')
                        if invoice['Status'] == "Closed" and invoice['LastPaymentDate']:
                            if not inv.date_paid: inv.date_paid = datetime.strptime(invoice['LastPaymentDate'].split('T')[0], '%Y-%m-%d')

                        inv.save()
                        print(invoice['Number'], invoice['Status'])

        return self(success=True, message=json.dumps(invoices['Items']))

class myobSyncBills(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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

class myobSyncRemittance(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        remittance = []

        endpoint = "Sale/CustomerPayment"
        remittance = myob_get(user, endpoint, all=True)

        relevant_advice = []
        for advice in remittance['Items']:
            if len(advice['Invoices']) > 0 and 'BGIS' in advice['Memo']:
                relevant_advice.append(advice)
                
                if RemittanceAdvice.objects.filter(myob_uid=advice['UID']).exists():
                    remittance_advice = RemittanceAdvice.objects.get(myob_uid=advice['UID'])
                else:
                    remittance_advice = RemittanceAdvice()

                remittance_advice.myob_uid = advice['UID']
                remittance_advice.date = advice['Date'].split('T')[0]
                remittance_advice.amount = advice['AmountReceived']
                remittance_advice.client = Client.objects.get(name="BGIS")
                remittance_advice.save()

                for inv in advice['Invoices']:
                    if Invoice.objects.filter(myob_uid=inv['UID']).exists():
                        invoice = Invoice.objects.get(myob_uid=inv['UID'])
                        invoice.remittance = remittance_advice
                        if not invoice.date_paid: invoice.date_paid = remittance_advice.date
                        invoice.save()
                    else:
                        print(inv['Number'])


            return self(success=True, message=json.dumps(relevant_advice))


class myobImportContractorsFromBills(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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

class myobImportClientFromABN(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        name = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, name):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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
        
class myobImportContractorFromABN(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        name = graphene.String()
        abn = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, name, abn):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")


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

        if len(res['Items']) == 0:
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


class myobImportBGISInvoices(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")


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

                        invs.append(invoice)
                
        print("Imported BGIS Invoices")
        return self(success=True, message=json.dumps(invs))

class myobCreateInvoice(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    number = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, job):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        print("Creating Invoice")

        job = Job.objects.get(id=job) if Job.objects.filter(id=job).exists() else None 

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

            job_data = {
                "identifier": job_identifier,
                "name": (job.location.name + " " + job.title)[0:30],
                "description": str(job),
                "customer_uid": job.client.myob_uid,
            }
            res = CreateMyobJob.mutate(root, info, job_data)
            if not res.success:
                return self(success=False, message="Please sync job with MYOB before creating invoice!")

            job.myob_uid = res.uid
            job.save()        

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
                    # Convert excel sheet to pdf
                    # df = pd.read_excel(estimate_file)
                    # df.to_html(estimate_file.strip(".xlsm") + ".html")
                    # pdfkit.from_file(estimate_file.strip(".xlsm") + ".html", estimate_file.strip(".xlsm") + ".pdf")
                    
                    p = Popen("C:/cygwin64/Cygwin.bat", stdin=PIPE, stdout=PIPE)
                    bash_folder_path = f"/cygdrive/c/{estimate_folder[3:]}"#.replace("\\", '/').replace(" ", "\\ ") 
                    estimate_file_name = estimate_file.split('\\')[len(estimate_file.split('\\'))-1].replace("\\", '/').replace(" ", "\\ ") 
                    p.communicate(input=f"""cd "{bash_folder_path}"\n/cygdrive/c/build/instdir/program/soffice.exe --headless --infilter="Microsoft Excel 2007/2010 XML" --convert-to pdf:writer_pdf_Export {estimate_file_name} --outdir .""".encode())[0]

                    # xlApp = win32.DispatchEx("Excel.Application", pythoncom.CoInitialize())
                    # time.sleep(1)
                    # books = xlApp.Workbooks.Open(estimate_file)
                    # ws = books.Worksheets[0]
                    # ws.Visible = 1
                    # ws.ExportAsFixedFormat(0, estimate_file.strip(".xlsm") + ".pdf")
                    # xlApp.ActiveWorkbook.Close()

                    # xlApp.Quit()
                    # del xlApp

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
        
        elif job.client.name == "CBRE Group Inc" or job.client.name == "CDC Data Centres Pty Ltd":
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

        print("Posting Sale Order")

        # 4-3000 Maintenance Income - e5495a96-41a3-4e65-b56d-43e585f2742d
        # POST Invoice to MYOB
        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Sale/Order/Service/"
        payload = json.dumps({
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
        invoice_uid = response.headers['Location'][-36:]
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

        invoice = res['Items'][0]

        new_invoice, created = Invoice.objects.get_or_create(myob_uid=invoice_uid)
        new_invoice.number = invoice['Number']
        new_invoice.date = invoice['Date'].split('T')[0]
        new_invoice.amount = round(float(invoice['Subtotal']), 2)
        new_invoice.job = job
        new_invoice.save()
        new_invoice.job.save() ## Update job stage

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
        with open(f"./myob/invoices/INV{invoice['Number']} - {job.po}.pdf", "wb") as f:
            f.write(pdf_response.content)

        shutil.copyfile(f"./myob/invoices/INV{invoice['Number']} - {job.po}.pdf", f"{job_folder}/Accounts/Aurify/INV{invoice['Number']} - {job.po}.pdf")
        paths['invoice'] = f"{job_folder}/Accounts/Aurify/INV{invoice['Number']} - {job.po}.pdf"

        print("Invoice Saved")

        # Create Full Invoice using function from invoice_generator.py
        print("Invoice Generation Starting")
        result = generate_invoice(job, paths, invoice, accounts_folder)
        if not result['success']:
            return self(success=False, message=result['message'])

        print("Invoice Generated")
        return self(success=True, message=json.dumps(result['message']), number=invoice['Number'])

class BillInputType(graphene.InputObjectType):
    id = graphene.String()
    myobUid = graphene.String()
    supplier = myobSupplierInput()
    job = JobInputType()
    contractor = graphene.String()
    invoiceNumber = graphene.String()
    invoiceDate = graphene.Date()
    processDate = graphene.Date()
    amount = graphene.Decimal()
    billType = graphene.String()
    thumbnailPath = graphene.String()
    filePath = graphene.String()

class BillOutputType(DjangoObjectType):
    class Meta:
        model = Bill
        fields = '__all__'

class CreateMyobBill(graphene.Mutation):
    class Arguments:
        job_name = graphene.String()
        job_uid = graphene.String()
        supplier_uid = graphene.String()
        newBill = BillInputType()
        attachment = graphene.String()
        attachmentName = graphene.String()

    success = graphene.Boolean()
    message= graphene.String()
    error = graphene.String()
    uid = graphene.String()
    bill = graphene.Field(BillOutputType)
    
    @classmethod
    @login_required
    def mutate(self, root, info, job_name, job_uid, supplier_uid, newBill, attachment, attachmentName):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        # Get shipToAddress from MYOB
        filter = f"UID eq guid'{supplier_uid}'"
        get_endpoint = "Contact/Supplier"
        supplier_details = myob_get(user, get_endpoint, filter)

        if len(supplier_details['Items']) < 1:
            return self(success=False, message="Could Not Get Contractor Details From MYOB")

        supplier_details = supplier_details['Items'][0]
        shipToAddress = supplier_details['CompanyName'] # Default bill to as suppliers name
        if supplier_details['Addresses'] is None:
            return self(success=False, message="Please add an address to the supplier in MYOB")

        if len(supplier_details) > 0 and len(supplier_details['Addresses']) > 0:
            addressDetails = supplier_details['Addresses'][0]
            shipToAddress = f"{supplier_details['CompanyName']}\n{addressDetails['Street']},\n{addressDetails['City']} {addressDetails['State']} {addressDetails['PostCode']}"

        # 5-1100 Maintenance Subcontractors - d7a5adf7-a9c1-47b0-b11d-f72f62cd575d
        # 5-2100 Maintenance Materials - 83c3ab74-1b2e-4002-9e38-65c99fbf2b46
        
        bill_account = "d7a5adf7-a9c1-47b0-b11d-f72f62cd575d"
        if newBill['billType'] == 'material':
            bill_account = "83c3ab74-1b2e-4002-9e38-65c99fbf2b46"

        # POST Bill to MYOB
        post_endpoint = "/Purchase/Bill/Service/"
        payload = json.dumps({
            "Date": newBill['invoiceDate'], 
            "Supplier": {"UID": supplier_uid},
            "SupplierInvoiceNumber": newBill['invoiceNumber'],
            "ShipToAddress": shipToAddress,
            "IsTaxInclusive": True,
            "Lines": [
                {
                    "Type": "Transaction",
                    "Description": job_name,
                    "Account": {"UID": bill_account},
                    "TaxCode": {"UID": "d35a2eca-6c7d-4855-9a6a-0a73d3259fc4"},
                    "Total": round(newBill['amount'], 2),
                    "Job": {"UID": job_uid},
                }
            ],
            "FreightTaxCode": {"UID": "d35a2eca-6c7d-4855-9a6a-0a73d3259fc4"},
            "JournalMemo": f"Purchase: {supplier_details['CompanyName']}",
        }, default=str)

        response = myob_post(user, post_endpoint, payload)

        if response is None:
            return self(success=False, message="Issue creating bill in MYOB. Please contact developer for additional details.")

        # Get the bill uid
        bill_uid = get_response_uid(response)

        print("Bill Created for", supplier_details['CompanyName'], "- UID =", bill_uid)

        # # POST Bill Attachment to MYOB
        attachment_endpoint = f"/Purchase/Bill/Service/{bill_uid}/Attachment"
        attachment_payload = json.dumps({
            "Attachments": [
                {
                    "FileBase64Content": attachment,
                    "OriginalFileName": attachmentName,
                }
            ],
        }, default=str)
        attachment_response = myob_post(user, attachment_endpoint, attachment_payload)

        if not attachment_response.status_code == 200:
            print(attachment_response.status_code, attachment_response.text)
            return self(success=True, message="Error Uploading Attachment. Please manually attach in MYOB", uid=bill_uid, error=response.text)

        print("Attachment Added")

        return self(success=True, message="Bill Created Successfully", uid=bill_uid, error=None)

class myobUpdateBill(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        bill = BillInputType()

    success = graphene.Boolean()
    message= graphene.String()
    uid = graphene.String()
    job = graphene.Field(JobType)
    
    @classmethod
    @login_required
    def mutate(self, root, info, uid, bill):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
            
        if not Bill.objects.filter(id = bill.id).exists():
            return self(success=False, message="Cannot Find Bill")
        
        b = Bill.objects.get(id = bill.id)

        currentJob = b.job

        job = Job.objects.get(id = bill.job.id)

        # Update the MYOB bill
        headers = {                
            'Authorization': f'Bearer {user.access_token}',
            'x-myobapi-key': env('CLIENT_ID'),
            'x-myobapi-version': 'v2',
            'Accept-Encoding': 'gzip,deflate',
            'Content-Type': 'application/json',
        }

        # GET MYOB Bill
        get_url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service?$filter=UID eq guid'{bill.myobUid}'"
        get_response = requests.request("GET", get_url, headers=headers)

        if not get_response.status_code == 200:
            print(get_response.status_code)
            return self(success=False, message="Could Not Get Bill Details From MYOB")

        if len(json.loads(get_response.text)['Items']) == 0:
            print(json.loads(get_response.text))
            return self(success=False, message="Could Not Get Bill Details From MYOB")

        myob_bill = json.loads(get_response.text)['Items'][0]

        if myob_bill['Status'] == "Closed":
            return self(success=False, message="Can not update a Bill that has already been processed")

        # Update lines
        myob_bill['SupplierInvoiceNumber'] = bill.invoiceNumber
        myob_bill['Date'] = bill.invoiceDate
        myob_bill['Lines'][0]['Description'] = str(job)
        myob_bill['Lines'][0]['Total'] = round(bill.amount, 2)
        myob_bill['Lines'][0]['Job']['UID'] = job.myob_uid

        myob_bill['Lines'][0]['Account']['UID']  = "d7a5adf7-a9c1-47b0-b11d-f72f62cd575d"
        if bill.billType == 'material':
            myob_bill['Lines'][0]['Account']['UID'] = "83c3ab74-1b2e-4002-9e38-65c99fbf2b46"

        # PUT Bill with updates to MYOB
        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Purchase/Bill/Service/{bill.myobUid}"
        payload = json.dumps(myob_bill, default=str)
        response = requests.request("PUT", url, headers=headers, data=payload)

        if(not response.status_code == 200):
            print(response.status_code, response.text)
            return self(success=False, message="Issue updating bill in MYOB")

        # Update the bill
        b.job = job
        b.invoice_number = bill.invoiceNumber
        b.invoice_date = bill.invoiceDate
        b.amount = bill.amount
        b.bill_type = bill.billType

        if bill.filePath and currentJob != job:
            folder_name = str(job)
            job_folder = os.path.join(MAIN_FOLDER_PATH, folder_name)
            accounts_folder = os.path.join(job_folder, "Accounts", job.supplier.name)
            if os.path.exists(bill.filePath):
                new_file_path = os.path.join(accounts_folder, bill.filePath.split('\\')[len(bill.filePath.split('\\'))-1])
                shutil.move(bill.filePath, new_file_path)
                b.file_path = new_file_path

        b.save()

        return self(success=True, message="Successfully Updated Bill", job=currentJob)

class InvoiceType(graphene.InputObjectType):
    UID = graphene.String()
    Type = graphene.String()
    AmountApplied = graphene.Float()
    AmountAppliedForeign = graphene.Boolean()

class CustomerPaymentType(graphene.InputObjectType):
    Date = graphene.String()
    DepositTo = graphene.String()
    Account = UIDType()
    Customer = UIDType()
    Invoices = graphene.List(InvoiceType)
    Memo = graphene.String()

class GetCustomerPayment(graphene.Mutation):
    class Argument:
        filter = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    customer_payment = graphene.Field(CustomerPaymentObject)

    @classmethod
    @login_required
    def mutate(self, root, info, filter):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
        
        endpoint = "Sale/CustomerPayment"
        response = myob_get(user, endpoint, filter)
        if response is None:            
            return self(success=False, message="Get Request Failed")

        return self(success=True, customer_payment=response['Items'])

class CreateCustomerPayment(graphene.Mutation):
    class Argument:
        customer_payment = CustomerPaymentType()

    success = graphene.Boolean()
    message = graphene.String()
    uid = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, customer_payment):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
        
        endpoint = "Sale/CustomerPayment"
        response = myob_post(user, endpoint, json.dumps(customer_payment, default=str))
        if response is None:            
            print(customer_payment)
            return self(success=False, message="Post Request Failed")
        
        payment_uid = get_response_uid(response)

        return self(success=True, message="Successfully processed customer payment", uid=payment_uid)

class InvoiceInput(graphene.InputObjectType):
    number = graphene.String()
    date_issued = graphene.Date()
        
class convertSaleOrdertoInvoice(graphene.Mutation):
    class Arguments:
        invoice = InvoiceInput()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, invoice):

        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        if not Invoice.objects.filter(number=invoice.number).exists():
            return self(success=False, message="Invoice not found in database") 
        invoice = Invoice.objects.get(number=invoice.number)

        # Check to see if the sale is an order
        url = "Sale/Order/Service"
        filter = f"UID eq guid'{invoice.myob_uid}'"
        response = myob_get(user, url, filter)
        if response == None:
            print("Get Error")
            return self(success=False, message="Error with MYOB Request")

        order = response['Items']
        if len(order) == 0:
            return self(success=True, message="Invoice not found")
        if len(order) > 1:
            return self(success=False, message="Multiple Invoices Found")
        order = order[0]

        # Convert the sale order to invoice
        if order['Status'] == "ConvertedToInvoice":
            print("Already Converted:", order['Number'])
            return self(success=True, message="Already an Invoice")
            
        # Remove line RowIDs for the 
        for line in order['Lines']:
            line.pop("RowID", None)

        # Add the original creation date to a header line in the invoice as it is overwritten when converted
        order['Lines'].append({
            "Type": "Header",
            "Description": "Order Created on " + datetime.strptime(order['Date'].split('T')[0], "%Y-%m-%d").strftime('%d/%m/%Y'),
        })

        # Convert Order to Invoice / POST to MYOB
        post_url = "Sale/Invoice/Service"
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

        post_response = myob_post(user, post_url, payload)
        if not post_response.status_code == 201:
            return self(success=False, message=post_response.text)
        
        invoice_uid = get_response_uid(post_response)

        invoice.myob_uid = invoice_uid
        if not invoice.date_issued: invoice.date_issued = invoice.date_issued
        invoice.save()

        # save job to update stage
        job = invoice.job
        job.save()

        return self(success=True, message="Successfully Converted Sale Order")

## Test Function
# class myobCustomFunction(graphene.Mutation):
    # class Arguments:

#     success = graphene.Boolean()
#     message = graphene.String()
#     obj = graphene.String()
#     items = graphene.List(graphene.String)

#     @classmethod
#     @login_required
#     def mutate(self, root, info):
#         env = environ.Env()
#         environ.Env.read_env()

#         user = check_user_token_auth(uid, info.context.user)
#         if user is None:
#             return self(success=False, message="MYOB User Authentication Error")

#         url = "Sale/Invoice/Service"
#         response = myob_get(user, url, all=True)
#         res = response['Items']

#         for invoice in res:
#             if Invoice.objects.filter(number=invoice['Number']).exists():
#                 inv = Invoice.objects.get(number=invoice['Number'])
#                 if not inv.myob_uid == invoice['UID']:
#                     print(invoice['Number'])
#                     inv.myob_uid = invoice['UID']
#                     inv.save()

class generateInvoice(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        job = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, job):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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

                    p = Popen("C:/cygwin64/Cygwin.bat", stdin=PIPE, stdout=PIPE)
                    bash_folder_path = f"/cygdrive/c/{estimate_folder[3:]}"#.replace("\\", '/').replace(" ", "\\ ") 
                    estimate_file_name = estimate_file.split('\\')[len(estimate_file.split('\\'))-1].replace("\\", '/').replace(" ", "\\ ") 
                    p.communicate(input=f"""cd "{bash_folder_path}"\n/cygdrive/c/build/instdir/program/soffice.exe --headless --infilter="Microsoft Excel 2007/2010 XML" --convert-to pdf:writer_pdf_Export {estimate_file_name} --outdir .""".encode())[0]

                    found["estimate"] = True
                    paths["estimate"] = estimate_file.strip(".xlsm") + ".pdf" 

            else:
                found['approval'] = True
                found['estimate'] = True
        elif job.client.name == "CBRE Group Inc" or job.client.name == "CDC Data Centres Pty Ltd":
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
                with open(f"./myob/invoices/INV{invoice_number} - {str(job).split(' - ')[0]}.pdf", "wb") as f:
                    f.write(pdf_response.content)

                shutil.copyfile(f"./myob/invoices/INV{invoice_number} - {str(job).split(' - ')[0]}.pdf", f"{accounts_folder}/INV{invoice_number} - {str(job).split(' - ')[0]}.pdf")
                paths['invoice'] = f"{accounts_folder}/INV{invoice_number} - {job.po}.pdf"
                found['invoice'] = True

                print("Invoice Saved")

        if not all(found.values()):
            error_str = " "
            for key, val in found.items():
                if not val:
                    error_str += key.capitalize() + ", "

            return self(success=False, message="Not all required invoice files can be found - " + error_str[:-2])

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
            result = generate_invoice(job, paths, invoice, accounts_folder)

            print("Invoice Generation Finished")
            
            return self(success=result['success'], message=result['message'])

class GetTimesheets(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, filter=''):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "Payroll/Timesheet"
        response = myob_get(user, endpoint, filter)

        return self(success=True, message=response['Items'])
    
class TimesheetEntryType(graphene.InputObjectType):
    Date = graphene.String()
    Hours = graphene.Float()

class TimesheetLineType(graphene.InputObjectType):
    PayrollCategory = graphene.Field(UIDType)
    Notes = graphene.String()
    Job = graphene.Field(UIDType)
    Entries = graphene.List(TimesheetEntryType)

class TimesheetDataType(graphene.InputObjectType):
    Employee = graphene.Field(UIDType)
    StartDate = graphene.String()
    EndDate = graphene.String()
    Lines = graphene.List(TimesheetLineType)

class CreateTimesheet(graphene.Mutation):
    class Arguments:
        timesheet_data = TimesheetDataType()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, timesheet_data):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = f"Payroll/Timesheet/{timesheet_data['Employee']['UID']}"
        timesheet = myob_put(user, endpoint, json.dumps(timesheet_data))
        if timesheet is None:
            return self(success=False)

        return self(success=True)    

class GetMyobEmployees(graphene.Mutation):
    class Arguments:
        filter = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    employees = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, filter=''):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
        
        endpoint = "Contact/Employee"
        employees = myob_get(user, endpoint, filter, all=True)

        return self(success=True, message="Successfully retrieved employees", employees=employees['Items'])


class GetPayrollCategories(graphene.Mutation):
    success = graphene.Boolean()
    message = graphene.String()
    payroll_categories = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")
        
        endpoint = "Payroll/PayrollCategory"
        payroll_categories = myob_get(user, endpoint)

        return self(success=True, message="Successfully retrieved payroll categories", payroll_categories=payroll_categories['Items'])

class GetPayrollDetails(graphene.Mutation):
    success = graphene.Boolean()
    message = graphene.String()
    payroll_details = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info):
        user = check_user_token_auth_new(info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

        endpoint = "Contact/EmployeePayrollDetails"
        payroll_details = myob_get(user, endpoint)

        return self(success=True, message="Successfully retrieved payroll details", payroll_details=payroll_details['Items'])


class myobCustomQuery(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        query = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, query):
        env = environ.Env()
        environ.Env.read_env()

        user = check_user_token_auth(uid, info.context.user)
        if user is None:
            return self(success=False, message="MYOB User Authentication Error")

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
    get_timesheets = GetTimesheets.Field()
    create_timesheet = CreateTimesheet.Field()
    get_payroll_categories = GetPayrollCategories.Field()

    myob_custom_query = myobCustomQuery.Field()

    myob_initial_connection = myobInitialConnection.Field()
    myob_get_access_token = myobGetAccessToken.Field()
    update_or_create_myob_account = updateOrCreateMyobAccount.Field()
    delete_myob_user = DeleteMyobUser.Field()
    myob_refresh_token = myobRefreshToken.Field()

    get_customers = GetCustomers.Field()
    create_customer = CreateCustomer.Field()
    update_customer = UpdateCustomer.Field()

    myob_get_supplier = GetSuppliers.Field()
    myob_create_supplier = CreateSupplier.Field()
    myob_update_supplier = UpdateSupplier.Field()

    get_myob_jobs = GetMyobJobs.Field()
    myob_get_invoices = myobGetInvoices.Field()
    myob_get_orders = myobGetOrders.Field()
    myob_get_bills = myobGetBills.Field()
    get_accounts = GetAccounts.Field()
    myob_get_tax_codes = myobGetTaxCodes.Field()
    get_general_journal = GetGeneralJournal.Field()

    myob_sync_jobs = myobSyncJobs.Field()
    myob_sync_invoices = myobSyncInvoices.Field()
    myob_sync_bills = myobSyncBills.Field()
    myob_sync_clients = myobSyncClients.Field()
    myob_sync_contractors = myobSyncContractors.Field()
    myob_sync_remittance = myobSyncRemittance.Field()
    
    myob_import_contractor_from_abn = myobImportContractorFromABN.Field()
    myob_import_client_from_abn = myobImportClientFromABN.Field()
    myob_import_contractors_from_bills = myobImportContractorsFromBills.Field()
    myob_import_bgis_invoices = myobImportBGISInvoices.Field()

    create_myob_job = CreateMyobJob.Field()
    myob_create_invoice = myobCreateInvoice.Field()
    myob_create_bill = CreateMyobBill.Field()
    myob_update_bill = myobUpdateBill.Field()
    
    generate_invoice = generateInvoice.Field()
    repair_sync = myobRepairJobSync.Field()
    convert_sale = convertSaleOrdertoInvoice.Field()

    # myob_custom_function = myobCustomFunction.Field()


# 4-1000 Construction Income - 8fa9fc62-8cb0-4cad-9f08-686ffa76c98b
# 5-1000 Subcontractors - 6c8f22f3-39dc-41f0-9f59-0949f9ee0b76

# 4-3000 Maintenance Income - e5495a96-41a3-4e65-b56d-43e585f2742d
# 5-1100 Maintenance Subcontractors - d7a5adf7-a9c1-47b0-b11d-f72f62cd575d
# 5-2100 Maintenance Materials - 83c3ab74-1b2e-4002-9e38-65c99fbf2b46

# TaxCode GST - d35a2eca-6c7d-4855-9a6a-0a73d3259fc4 