import graphene
import functools
import re
from graphene_django import DjangoObjectType
from graphql_jwt.decorators import login_required
from django.contrib.postgres.search import SearchVector, SearchRank, SearchQuery
from ..models import Job, Estimate, Invoice, Bill, Contractor, Client

class JobObjectType(DjangoObjectType):
    class Meta:
        model = Job
        fields = '__all__'

    job_name = graphene.String()
    
    def resolve_job_name(self, info):
        return str(self)

class JobSearch(graphene.Mutation):
    class Arguments:
        query = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    results = graphene.List(JobObjectType)

    @classmethod
    @login_required
    def mutate(cls, root, info, query):
        # Create the search vector with all the relevant job fields
        vector = SearchVector(
            "po", "sr", "other_id",
            "client__name", "requester__first_name", "requester__last_name",
            "location", "building", "detailed_location", 
            "title", "description", "scope",
            "poc_name", "poc_phone", "poc_email",
            "alt_poc_name", "alt_poc_phone", "alt_poc_email"
        )
        results = Job.objects.annotate(search=SearchVector(vector)).filter(search__icontains=query)[:20]

        return cls(success=True, message="Successful Search", results=list(results))