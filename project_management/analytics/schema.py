import graphene
from graphene_django import DjangoObjectType
from graphene import relay
from graphql_jwt.decorators import login_required
from .models import Account, Transaction, Sync
from datetime import datetime
import environ
import requests
import json

import sys
sys.path.append("..")
from myob.models import MyobUser
from myob.schema import checkTokenAuth

def getAllData(url, headers):
    if "?$" in url:
        url+= "&$"
    else:
        url += "?$"

    url += "top=1000"
    response = requests.request("GET", url, headers=headers, data={})
    res = json.loads(response.text)
    data = res
    counter = 1

    if 'NextPageLink' in res:
        while res['NextPageLink'] != None:
            skip = 1000*counter
            response = requests.request("GET", f"{url}&$skip={skip}", headers=headers, data={})
            res = json.loads(response.text)
            data['Items'].extend(res['Items'])
            counter += 1
            # print(f"Fetched: {skip} records")

    return data


class AccountInputType(graphene.InputObjectType):
    myob_uid = graphene.String()
    display_id = graphene.String()
    name = graphene.String()
    level = graphene.Int()
    current_balance = graphene.Float()

class UpdateAccounts(graphene.Mutation):
    class Arguments:
        accounts = graphene.List(AccountInputType)

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, accounts):
        for acc in accounts:
            if Account.objects.filter(myob_uid=acc['UID']):
                account = Account.objects.get(myob_uid=acc['UID'])
            else:
                account = Account()

            account.myob_uid = acc['UID']
            account.display_id = acc['DisplayID']
            account.name = acc['Name']
            account.level = acc['Level']
            account.current_balance = acc['CurrentBalance']
            account.save()

        return self(success=True)

class TransactionInputType(graphene.InputObjectType):
    myob_uid = graphene.String()
    display_id = graphene.String()
    description = graphene.String()
    journal_type = graphene.String()
    account = graphene.String()
    amount = graphene.Float()
    is_credit = graphene.Boolean()
    job_uid = graphene.String()
    source_transaction_type = graphene.String()
    date_occurred = graphene.Date()

class UpdateTransactions(graphene.Mutation):
    class Arguments:
        transactions = graphene.List(TransactionInputType)

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, transactions):
        for trans in transactions:
            for line in trans['Lines']:
                # if Account.objects.filter(myob_uid=acc['UID']):
                #     account = Account.objects.get(myob_uid=acc['UID'])
                # else:
                transaction = Transaction() 
                transaction.myob_uid = trans['UID']
                transaction.display_id = trans['DisplayID'] if trans['DisplayID'] != None else "NA"
                transaction.description = trans['Description'] if trans['Description'] != None else "NA"
                transaction.journal_type = trans['JournalType']
                # transaction.source_transaction_type = trans['SourceTransaction']['TransactionType']
                transaction.date_occurred = trans['DateOccurred'].split("T")[0]
                transaction.account = Account.objects.get(myob_uid=line['Account']['UID'])
                transaction.amount = line['Amount']
                transaction.is_credit = line['IsCredit']
                if line['Job']: transaction.job_uid = line['Job']['UID']
                transaction.save()

        return self(success=False)

class SyncTransactions(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    data = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            last_sync_date = Sync.objects.filter(sync_type="TRA").order_by('-sync_date_time').values()[0]['sync_date_time']
            last_sync_date = last_sync_date.strftime("%Y-%m-%dT%H:%M:%S")
            now_datetime = datetime.today().strftime("%Y-%m-%dT%H:%M:%S")
            print(last_sync_date, now_datetime)
            if last_sync_date:
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/JournalTransaction?$filter=DateOccurred gt datetime'{last_sync_date}' and DateOccurred le datetime'{now_datetime}'"
            else:
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/JournalTransaction"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }

            general_journal = getAllData(url, headers)
            print(general_journal)
        
            # Update Transactions
            if(general_journal['Items']):
                UpdateTransactions.mutate(root, info, general_journal['Items'])

            sync = Sync()
            sync.sync_type = "TRA"
            sync.save()

            return self(success=True)
        else:
            return self(success=False, data="MYOB Connection Error")

class SyncAccounts(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    data = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        environ.Env.read_env()

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Account"
            
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }

            accounts = getAllData(url, headers)
            print(accounts)
            UpdateAccounts.mutate(root, info, accounts['Items'])

            sync = Sync()
            sync.sync_type = "ACC"
            sync.save()

            return self(success=True)
        else:
            return self(success=False, data="MYOB Connection Error")
    
class SyncType(DjangoObjectType):
    class Meta:
        model = Sync
        fields = '__all__'

class AccountType(DjangoObjectType):
    class Meta:
        model = Account
        fields = '__all__'

class TransactionType(DjangoObjectType):
    class Meta:
        model = Transaction
        fields = '__all__'


class Query(graphene.ObjectType):
    syncs = graphene.List(SyncType)   
    synctype = graphene.Field(SyncType, sync_type=graphene.String())
    accounts = graphene.List(AccountType)
    transactions = graphene.List(TransactionType)

    @login_required
    def resolve_syncs(root, info, **kwargs):
        return Sync.objects.all()
        
    @login_required
    def resolve_synctype(root, info, sync_type, **kwargs):
        if sync_type != None:
            return Sync.objects.filter(sync_type=sync_type).order_by('-sync_date_time').first()

    @login_required
    def resolve_transactions(root, info, **kwargs):
        return Transaction.objects.all()

    @login_required
    def resolve_accounts(root, info, **kwargs):
        return Account.objects.all()

class Mutation(graphene.ObjectType):
    # update_accounts = UpdateAccounts.Field()
    # update_transactions = UpdateTransactions.Field()
    sync_transactions = SyncTransactions.Field()
    sync_accounts = SyncAccounts.Field()
    