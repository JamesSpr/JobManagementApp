import graphene
import environ
import requests
import json
from datetime import datetime
from graphene_django import DjangoObjectType
from graphql_jwt.decorators import login_required
from timesheets.models import Timesheet, WorkDay, Employee

from myob.models import MyobUser
from myob.schema import checkTokenAuth

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
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        env.read_env(env.str('ENV_PATH', '../myob/.env'))

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid)
            user = MyobUser.objects.get(id=uid)

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/Employee"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("GET", url, headers=headers)

            res = json.loads(response.text)
            res = res['Items']

            for employee in res:
                if employee['IsActive'] and not Employee.objects.filter(myob_uid=employee['UID']).exists():
                    emp = Employee()
                    emp.myob_uid = employee['UID']
                    emp.name = employee['FirstName'].strip() + " " + employee['LastName'].strip()
                    emp.save()
        else:
            return self(success=False, message="MYOB Connection Error")

        return self(success=True)

class WorkDayInputType(graphene.InputObjectType):
    date = graphene.String()
    hours = graphene.Float()
    work_type = graphene.String()
    job = graphene.String()
    notes = graphene.String()

class TimesheetInputType(graphene.InputObjectType):
    name = graphene.String()
    work_days = graphene.List(WorkDayInputType)

class ImportTimesheets(graphene.Mutation):
    class Arguments:
        summary = graphene.List(TimesheetInputType)
        start_date = graphene.String()
        end_date = graphene.String()

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, summary, start_date, end_date):
        start_date = parse_date(start_date)
        end_date = parse_date(end_date)
        
        for sheet in summary:
            if not Timesheet.objects.filter(start_date=start_date, end_date=end_date, employee=Employee.objects.get(name=sheet['name'])).exists():
                timesheet = Timesheet()
                timesheet.employee = Employee.objects.get(name=sheet['name'])
                timesheet.start_date = start_date
                timesheet.end_date = end_date
                timesheet.save()
            else:
                timesheet = Timesheet.objects.get(start_date=start_date, end_date=end_date, employee=Employee.objects.get(name=sheet['name']))


            for day in sheet['work_days']:
                work_date = parse_date(day['date'])
                work_day = WorkDay()

                if WorkDay.objects.filter(timesheet = timesheet, date=work_date).exists():
                    work_day = WorkDay.objects.get(timesheet = timesheet, date=work_date)

                work_day.timesheet = timesheet
                work_day.date = work_date
                work_day.hours = day['hours']
                work_day.work_type = day['work_type']
                work_day.job = day['job']
                work_day.notes = day['notes']
                work_day.save()

        return self(success=True)


def parse_date(dateString):
    dateString = dateString.strip().title()
    for fmt in ('%d/%m/%Y', '%e/%m/%Y'):
        try:
            return datetime.strptime(dateString, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return ""

class ClearAllTimesheetExamples(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info):
        for workday in WorkDay.objects.all():
            workday.delete()

        for timesheet in Timesheet.objects.all():
            timesheet.delete()

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
    get_myob_employees = GetEmployeesFromMyob.Field()
    import_timesheets = ImportTimesheets.Field()
    delete_all_timesheets = ClearAllTimesheetExamples.Field()


   
