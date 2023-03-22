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

    @login_required
    def mutate(self, root, info, accounts):
        for acc in accounts:
            if Account.objects.filter(myob_uid=acc.myob_uid):
                account = Account.object.get(myob_uid=acc.myob_uid)
            else:
                account = Account()

            account.display_id = acc.display_id
            account.name = acc.name
            account.level = acc.level
            account.current_balance = acc.current_balance
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

    @login_required
    def mutate(self, root, info, transactions):
        for trans in transactions:
            if Transaction.objects.filter(myob_uid=trans.myob_uid):
                transaction = Transaction.object.get(myob_uid=trans.myob_uid)
            else:
                transaction = Transaction()
        
            transaction.myob_uid = trans.myob_uid
            transaction.display_id = trans.display_id
            transaction.description = trans.description
            transaction.journal_type = trans.journal_type
            transaction.account = trans.account
            transaction.amount = trans.amount
            transaction.is_credit = trans.is_credit
            transaction.job_uid = trans.job_uid
            transaction.source_transaction_type = trans.source_transaction_type
            transaction.date_occurred = trans.date_occurred
            transaction.save()

        return self(success=False)

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

class SyncTransactions(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    data = graphene.String()

    @login_required
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

            return self(success=True, data=json.dumps(general_journal))
        else:
            return self(success=False, data="MYOB Connection Error")

        # Update Transactions
        transactions = []
        UpdateTransactions.mutate(root, info, transactions)

        sync = Sync()
        sync.sync_date_time = datetime.now()

        return self(success=False)

class SyncAccounts(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()

    @login_required
    def mutate(self, root, info):

        # Update Accounts
        accounts = []
        UpdateAccounts.mutate(root, info, accounts)

        return self(success=False)

class Query(graphene.ObjectType):
    pass

class Mutation(graphene.ObjectType):
    # update_accounts = UpdateAccounts.Field()
    # update_transactions = UpdateTransactions.Field()
    sync_transactions = SyncTransactions.Field()
    sync_accounts = SyncAccounts.Field()
    