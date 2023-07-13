import graphene
from graphene_django import DjangoObjectType
from graphql_jwt.decorators import login_required
from timesheets.models import Timesheet, WorkDay, Employee

class TimesheetType(DjangoObjectType):
    class Meta:
        model = Timesheet
        fields = '__all__'

class WorkDayType(DjangoObjectType):
    class Meta:
        model = WorkDay
        fields = '__all__'

class EmployeeType(DjangoObjectType):
    class Meta:
        model = Employee
        fields = '__all__'

class GetEmployeesFromMyob(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info):

        return self(success=True)

class Query(graphene.ObjectType):
    timesheets = graphene.List(TimesheetType)
    @login_required
    def resolve_timesheets(root, info, **kwargs):
        return Timesheet.objects.all()
    
    employees = graphene.List(EmployeeType)
    @login_required
    def resolve_employees(root, info, **kwargs):
        return Employee.objects.all()
    
    work_days = graphene.List(WorkDayType)
    @login_required
    def resolve_work_days(root, info, **kwargs):
        return WorkDay.objects.all()

class Mutation(graphene.ObjectType):
    pass
