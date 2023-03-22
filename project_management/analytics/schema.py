import graphene
from graphene_django import DjangoObjectType
from graphene import relay
from graphql_jwt.decorators import login_required
from .models import Account, Transaction

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

class Query(graphene.ObjectType):
    pass

class Mutation(graphene.ObjectType):
    update_accounts = UpdateAccounts.Field()
    update_transactions = UpdateTransactions.Field()
    