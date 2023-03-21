import graphene
from graphene_django import DjangoObjectType
from graphene import relay
from graphql_jwt.decorators import login_required

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
    job_number = graphene.String()
    source_transaction_type = graphene.String()

class UpdateTransactions(graphene.Mutation):
    class Arguments:
        transactions = graphene.List(TransactionInputType)

    success = graphene.Boolean()

    @login_required
    def mutate(self, root, info, transactions):

        return self(success=False)

class Query(graphene.ObjectType):
    pass

class Mutation(graphene.ObjectType):
    update_accounts = UpdateAccounts.Field()
    update_transactions = UpdateTransactions.Field()
    