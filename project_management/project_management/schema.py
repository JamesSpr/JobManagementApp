import graphene
import api.schema as api
import api.services.outlook as outlook
import accounts.schema as accounts
import myob.schema as myob
import analytics.schema as analytics
import timesheets.schema as timesheets

class Query(
    api.Query,
    outlook.Query,
    accounts.Query,
    myob.Query,
    analytics.Query,
    timesheets.Query,
    graphene.ObjectType
):
    pass

class Mutation(
    api.Mutation, 
    outlook.Mutation, 
    accounts.Mutation, 
    myob.Mutation, 
    analytics.Mutation, 
    timesheets.Mutation, 
    graphene.ObjectType
):
    pass

schema = graphene.Schema(query=Query, mutation=Mutation)