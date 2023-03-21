import graphene
import api.schema
import api.services.outlook
import accounts.schema
import myob.schema
import analytics.schema


class Query(api.schema.Query, api.services.outlook.Query, accounts.schema.Query, myob.schema.Query, analytics.schema.Query, graphene.ObjectType):
    pass

class Mutation(api.schema.Mutation, api.services.outlook.Mutation, accounts.schema.Mutation, myob.schema.Mutation, analytics.schema.Mutation, graphene.ObjectType):
    pass

schema = graphene.Schema(query=Query, mutation=Mutation)