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
                emp = Employee()
                if Employee.objects.filter(myob_uid=employee['UID']).exists():
                    emp = Employee.objects.get(myob_uid=employee['UID'])

                emp.myob_uid = employee['UID']
                emp.name = employee['FirstName'].strip() + " " + employee['LastName'].strip()
                emp.isActive = employee['IsActive']
                emp.save()
        else:
            return self(success=False, message="MYOB Connection Error")

        return self(success=True)

class WorkDayInputType(graphene.InputObjectType):
    id = graphene.String()
    date = graphene.String()
    hours = graphene.Float()
    work_type = graphene.String()
    job = graphene.String()
    notes = graphene.String()

class TimesheetImportType(graphene.InputObjectType):
    name = graphene.String()
    work_days = graphene.List(WorkDayInputType)

class ImportTimesheets(graphene.Mutation):
    class Arguments:
        summary = graphene.List(TimesheetImportType)
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
    for fmt in ('%d/%m/%Y', '%e/%m/%Y', "%Y-%m-%d"):
        try:
            return datetime.strptime(dateString, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return ""

class TimesheetInputType(graphene.InputObjectType):
    id = graphene.String()
    employee = graphene.Field(graphene.String)
    workday_set = graphene.List(WorkDayInputType)
    sent_to_myob = graphene.Boolean()

class UpdateTimesheet(graphene.Mutation):
    class Arguments:
        timesheet = TimesheetInputType()

    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info, timesheet):

        sheet = Timesheet.objects.get(id = timesheet.id)
        
        for workday in timesheet.workday_set:
            day = WorkDay.objects.get(id=workday.id)
            day.hours = workday.hours
            day.work_type = workday.work_type
            day.save()

        sheet.save()

        return self(success=True)

class GetPayrollDetails(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    details = graphene.String()

    @classmethod
    def mutate(self, root, info, uid):
        env = environ.Env()
        env.read_env(env.str('ENV_PATH', '../myob/.env'))

        if not MyobUser.objects.filter(id=uid).exists():
            return self(success=False, message="MYOB Connection Error - Not User Assigned")
        
        checkTokenAuth(uid)
        user = MyobUser.objects.get(id=uid)

        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/EmployeePayrollDetails"
        headers = {                
            'Authorization': f'Bearer {user.access_token}',
            'x-myobapi-key': env('CLIENT_ID'),
            'x-myobapi-version': 'v2',
            'Accept-Encoding': 'gzip,deflate',
        }
        response = requests.request("GET", url, headers=headers)

        res = json.loads(response.text)
        res = res['Items']

        return self(success=True, message="Successfully Retrieved Payroll Details", 
                    details=json.dumps(res))    

class ClearAllTimesheetExamples(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    def mutate(self, root, info):
        for workday in WorkDay.objects.all():
            workday.delete()

        for timesheet in Timesheet.objects.all():
            timesheet.delete()

        return self(success=True)

class SubmitTimesheets(graphene.Mutation):
    class Arguments:
        uid = graphene.String()
        timesheets = graphene.List(TimesheetInputType)

    success = graphene.Boolean()
    timesheets = graphene.List(TimesheetType)

    @classmethod
    def mutate(self, root, info, uid, timesheets):
        
        processed = []
        for timesheet in timesheets:

            sheet = Timesheet.objects.get(id = timesheet.id)

            


            # sheet.sent_to_myob = True
            # sheet.save()
            processed.append(sheet)

        return self(success=True, timesheets=timesheets)

class Query(graphene.ObjectType):
    timesheets = graphene.List(TimesheetType, end_date=graphene.String())
    @login_required
    def resolve_timesheets(root, info, end_date=None, **kwargs):
        if end_date:
            return Timesheet.objects.filter(end_date=end_date)

        return Timesheet.objects.all()
    
    employees = graphene.List(EmployeeType)
    @login_required
    def resolve_employees(root, info, **kwargs):
        return Employee.objects.filter(isActive=True)
    
    work_days = graphene.List(WorkDayType)
    @login_required
    def resolve_work_days(root, info, **kwargs):
        return WorkDay.objects.all()

class Mutation(graphene.ObjectType):
    get_myob_employees = GetEmployeesFromMyob.Field()
    delete_all_timesheets = ClearAllTimesheetExamples.Field()
    get_payroll_details = GetPayrollDetails.Field()
    # get_employee_count = GetEmployeeCount.Field()
    import_timesheets = ImportTimesheets.Field()
    submit_timesheets = SubmitTimesheets.Field()
    update_timesheet = UpdateTimesheet.Field()


   
