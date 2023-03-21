import graphene
from graphene_django import DjangoObjectType
from graphene import relay
from graphql_jwt.decorators import login_required

class Query(graphene.ObjectType):
    pass

class Mutation(graphene.ObjectType):
    pass