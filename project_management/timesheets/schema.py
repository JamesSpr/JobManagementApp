import graphene
import environ
import requests
import json
from datetime import datetime
from graphene_django import DjangoObjectType
from graphql_jwt.decorators import login_required
from timesheets.models import Timesheet, WorkDay, Employee, PayrollCategory, MyobJob, SyncSettings

from myob.models import MyobUser
from myob.schema import checkTokenAuth

class MyobJobType(DjangoObjectType):
    class Meta:
        model = MyobJob
        fields = '__all__'

class SyncSettingsType(DjangoObjectType):
    class Meta:
        model = SyncSettings
        fields = '__all__'

class WorkDayType(DjangoObjectType):
    class Meta:
        model = WorkDay
        fields = '__all__'

class TimesheetType(DjangoObjectType):
    class Meta:
        model = Timesheet
        fields = '__all__'

    workday_set = graphene.List(WorkDayType)

    @classmethod
    @login_required
    def resolve_workday_set(self, instance, info):
        return WorkDay.objects.filter(timesheet=instance.id).order_by('date')

class EmployeeType(DjangoObjectType):
    class Meta:
        model = Employee
        fields = '__all__'
        convert_choices_to_enum = False

class PayrollCategoryType(DjangoObjectType):
    class Meta:
        model = PayrollCategory
        fields = '__all__'

class GetEmployees(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    employees = graphene.List(EmployeeType)

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        env.read_env(env.str('ENV_PATH', '../myob/.env'))

        if not MyobUser.objects.filter(id=uid).exists():
            return self(success=False, message="MYOB Connection Error - Not User Assigned")
        
        if not checkTokenAuth(uid, info.context.user):
            return self(success=False, message="MYOB Authentication Error")
        
        user = MyobUser.objects.get(id=uid)

        GetMyobJob.mutate(root, info, uid)

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

        not_included = ["David Phillips", "Leo Sprague", "Colin Baggott", "Robert Stapleton", "Brett Macpherson"]
        active_employees = []
        for employee in res:
            emp = Employee()
            if Employee.objects.filter(myob_uid=employee['UID']).exists():
                emp = Employee.objects.get(myob_uid=employee['UID'])

            emp.myob_uid = employee['UID']
            emp.name = employee['FirstName'].strip() + " " + employee['LastName'].strip()
            emp.isActive = employee['IsActive']
            emp.save()

            if emp.isActive and not emp.name in not_included:
                active_employees.append(emp)

        return self(success=True, employees=active_employees)
    
class GetPayrollCategories(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        env.read_env(env.str('ENV_PATH', '../myob/.env'))

        if MyobUser.objects.filter(id=uid).exists():
            checkTokenAuth(uid, info.context.user)
            user = MyobUser.objects.get(id=uid)

            payroll_types = ['wage', 'entitlement', 'deduction', 'expense', 'superannuation', 'tax', 'taxtable']
            for prt in payroll_types:
                url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Payroll/PayrollCategory/{prt}"
                headers = {                
                    'Authorization': f'Bearer {user.access_token}',
                    'x-myobapi-key': env('CLIENT_ID'),
                    'x-myobapi-version': 'v2',
                    'Accept-Encoding': 'gzip,deflate',
                }
                response = requests.request("GET", url, headers=headers)

                res = json.loads(response.text)
                res = res['Items']

                for category in res:
                    prc = PayrollCategory()
                    if PayrollCategory.objects.filter(myob_uid=category['UID']).exists():
                        prc = PayrollCategory.objects.get(myob_uid=category['UID'])

                    prc.myob_uid = category['UID']
                    prc.name = category['Name']
                    # prc.type = prt
                    prc.save()

        else:
            return self(success=False, message="MYOB Connection Error")

        return self(success=True, message="Payroll Categories Successfully Synced")

class MyobJobInputType(graphene.InputObjectType):
    id = graphene.String()
    myob_uid = graphene.String()
    name = graphene.String()
    number = graphene.String()

class WorkDayInputType(graphene.InputObjectType):
    id = graphene.String()
    date = graphene.String()
    hours = graphene.Float()
    work_type = graphene.String()
    job = MyobJobInputType()
    notes = graphene.String()
    allow_overtime = graphene.Boolean()

class WorkDayImportType(graphene.InputObjectType):
    id = graphene.String()
    date = graphene.String()
    hours = graphene.Float()
    work_type = graphene.String()
    job = graphene.String()
    notes = graphene.String()
    allow_overtime = graphene.Boolean()

class TimesheetImportType(graphene.InputObjectType):
    name = graphene.String()
    work_days = graphene.List(WorkDayImportType)

class ImportTimesheets(graphene.Mutation):
    class Arguments:
        summary = graphene.List(TimesheetImportType)
        start_date = graphene.String()
        end_date = graphene.String()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, summary, start_date, end_date):       
        start_date = parse_date_to_string(start_date)
        end_date = parse_date_to_string(end_date)

        for sheet in summary:
            employee = Employee.objects.get(name=sheet['name'])
            if not Timesheet.objects.filter(start_date=start_date, end_date=end_date, employee=employee).exists():
                timesheet = Timesheet()
                timesheet.employee = employee
                timesheet.start_date = start_date
                timesheet.end_date = end_date
                timesheet.save()
            else:
                timesheet = Timesheet.objects.get(start_date=start_date, end_date=end_date, employee=employee)
                # Don't change anything if its been sent to MYOB
                if timesheet.sent_to_myob: continue

            for day in sheet['work_days']:
                work_date = parse_date_to_string(day['date'])
                work_day = WorkDay()

                if WorkDay.objects.filter(timesheet = timesheet, date=work_date).exists():
                    work_day = WorkDay.objects.get(timesheet = timesheet, date=work_date)

                work_day.timesheet = timesheet
                work_day.date = work_date
                work_day.hours = day['hours']
                work_day.work_type = day['work_type']
                work_day.notes = day['notes']
                isWeekend = parse_date(work_date).weekday() >= 5
                work_day.allow_overtime = employee.pay_basis == "Hourly" or isWeekend

                if " - " in day['job']:
                    if MyobJob.objects.filter(number=day['job'].split(" - ")[0]).exists():
                        work_day.job = MyobJob.objects.get(number=day['job'].split(" - ")[0])
                elif MyobJob.objects.filter(number=day['job']).exists():
                    work_day.job = MyobJob.objects.get(number=day['job'])
                else:
                    work_day.job = None

                work_day.save()

        # Add basic timesheets in for certain employees
        directors = ['Leo Sprague', 'Robert Stapleton', 'Colin Baggott', "Brett Macpherson"]
        for director in directors:
            
            employee = Employee.objects.get(name=director)
            if not Employee.objects.filter(name=director).exists():
                continue

            if not Timesheet.objects.filter(start_date=start_date, end_date=end_date, employee=employee).exists():
                timesheet = Timesheet()
                timesheet.employee = employee
                timesheet.start_date = start_date
                timesheet.end_date = end_date
                timesheet.save()
            else:
                continue
                # timesheet = Timesheet.objects.get(start_date=start_date, end_date=end_date, employee=Employee.objects.get(name=director))

            for day in summary[0]['work_days']:
                work_date = parse_date_to_string(day['date'])
                work_day = WorkDay()

                if WorkDay.objects.filter(timesheet=timesheet, date=work_date).exists():
                    work_day = WorkDay.objects.get(timesheet=timesheet, date=work_date)

                work_day.timesheet = timesheet
                work_day.date = work_date

                day_of_work = datetime.strptime(work_date, "%Y-%m-%d").weekday()
                if day_of_work < 5:
                    work_day.hours = 8
                    work_day.work_type = "Normal"
                else:
                    work_day.hours = 0
                    work_day.work_type = ""

                work_day.job = None
                work_day.notes = ""
                work_day.allow_overtime = employee.pay_basis == "Hourly"
                work_day.save()

        
        return self(success=True)

def parse_date(dateString):
    dateString = dateString.strip().title()
    for fmt in ('%d/%m/%Y', '%e/%m/%Y', "%Y-%m-%d"):
        try:
            return datetime.strptime(dateString, fmt)
        except ValueError:
            pass

    return ""

def parse_date_to_string(dateString):
    dateString = dateString.strip().title()
    for fmt in ('%d/%m/%Y', '%e/%m/%Y', "%Y-%m-%d"):
        try:
            return datetime.strptime(dateString, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return ""

class EmployeeInputType(graphene.InputObjectType):
    id = graphene.String()
    name = graphene.String()
    pay_basis = graphene.String()
    myob_uid = graphene.String()

class TimesheetInputType(graphene.InputObjectType):
    id = graphene.String()
    start_date = graphene.String()
    end_date = graphene.String()
    employee = EmployeeInputType()
    workday_set = graphene.List(WorkDayInputType)
    sent_to_myob = graphene.Boolean()

class UpdateTimesheet(graphene.Mutation):
    class Arguments:
        timesheet = TimesheetInputType()

    success = graphene.Boolean()

    @classmethod
    @login_required
    def mutate(self, root, info, timesheet):

        sheet = Timesheet.objects.get(id = timesheet.id)
        employee = sheet.employee
        employee.pay_basis = timesheet.employee.pay_basis
        employee.save()
        
        for workday in timesheet.workday_set:
            day = WorkDay.objects.get(id=workday.id)
            day.hours = workday.hours
            day.work_type = workday.work_type
            day.allow_overtime = workday.allow_overtime
            day.save()

        sheet.save()

        return self(success=True)

class GetMyobJob(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    details = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        env.read_env(env.str('ENV_PATH', '../myob/.env'))

        if not MyobUser.objects.filter(id=uid).exists():
            return self(success=False, message="MYOB Connection Error - Not User Assigned")
        
        if not checkTokenAuth(uid,info.context.user):
            return self(success=False, message="MYOB Authentication Error")
        user = MyobUser.objects.get(id=uid)

        LastJobSync = SyncSettings.objects.get(id=1)

        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/GeneralLedger/Job?$filter=LastModified gt datetime'{LastJobSync.jobs}'"
        headers = {                
            'Authorization': f'Bearer {user.access_token}',
            'x-myobapi-key': env('CLIENT_ID'),
            'x-myobapi-version': 'v2',
            'Accept-Encoding': 'gzip,deflate',
        }
        # response = requests.request("GET", url, headers=headers)
        response = getAllData(url, headers)
        res = response['Items']

        # Update the pay basis for employees to ensure correct pay
        for j in res:
            if MyobJob.objects.filter(myob_uid=j['UID']).exists():
                job = MyobJob.objects.get(myob_uid=j['UID'])
            else:
                job = MyobJob()
                job.myob_uid = j['UID']

            job.number = j['Number']
            job.name = j['Name']
            job.save()

        LastJobSync.jobs = datetime.now()
        LastJobSync.save()

        return self(success=True)    

def getAllData(url, headers):
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

class GetPayrollDetails(graphene.Mutation):
    class Arguments:
        uid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    details = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid):
        env = environ.Env()
        env.read_env(env.str('ENV_PATH', '../myob/.env'))

        if not MyobUser.objects.filter(id=uid).exists():
            return self(success=False, message="MYOB Connection Error - Not User Assigned")
        
        if not checkTokenAuth(uid, info.context.user):
            return self(success=False, message="MYOB Authentication Error")
        user = MyobUser.objects.get(id=uid)

        url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Contact/EmployeePayrollDetails"
        headers = {                
            'Authorization': f'Bearer {user.access_token}',
            'x-myobapi-key': env('CLIENT_ID'),
            'x-myobapi-version': 'v2',
            'Accept-Encoding': 'gzip,deflate',
        }
        response = requests.request("GET", url, headers=headers)

        if not response.status_code == 200:
           return self(success=False, message="Error Fetching MYOB Payroll Data") 

        res = json.loads(response.text)
        res = res['Items']

        # Update the pay basis for employees to ensure correct pay
        for employee in res:
            if Employee.objects.filter(myob_uid=employee['Employee']['UID']):
                emp = Employee.objects.get(myob_uid=employee['Employee']['UID'])
                #emp.pay_basis = employee['Wage']['PayBasis']
                emp.save()

        return self(success=True, message="Successfully Retrieved Payroll Details", 
                    details=json.dumps(res))    

class ClearAllTimesheetExamples(graphene.Mutation):
    success = graphene.Boolean()

    @classmethod
    @login_required
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
        start_date = graphene.String()
        end_date = graphene.String()

    success = graphene.Boolean()
    submissionError = graphene.Boolean()
    message = graphene.String()
    timesheets = graphene.List(TimesheetType)
    # debug = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, uid, timesheets, start_date, end_date):
        env = environ.Env()
        env.read_env(env.str('ENV_PATH', '../myob/.env'))

        if not MyobUser.objects.filter(id=uid).exists():
            return self(success=False, message="MYOB Connection Error - Not User Assigned")
        
        if not checkTokenAuth(uid, info.context.user):
            return self(success=False, message="MYOB Authentication Error")
        
        user = MyobUser.objects.get(id=uid)
        processed = []

        all_timesheet_data = []
        submissionError = False
        message = ""
        failed = ""

        # Ensure times are always 0 for start and end date. Daylight savings can cause issues
        start_date = start_date.split("T")[0] + "T00:00:00.000Z"
        end_date = end_date.split("T")[0] + "T00:00:00.000Z"

        for timesheet in timesheets:
            timesheet_data = []
            if not Timesheet.objects.filter(id=timesheet.id).exists():
                print("Timesheet not found:", timesheet.id, " ", timesheet)
                return self(success=False, timesheets=processed, message="Payroll Category cannot be found. Please Sync. If issue persists, contact developer.")

            sheet = Timesheet.objects.get(id = timesheet.id)

            # Skip if the timesheet has already been processed
            if sheet.sent_to_myob:
                processed.append(sheet)
                continue

            payroll_categories = {
                "Normal": ['Base Hourly', 'Overtime (1.5x)', 'Overtime (2x)'],
                "SICK": 'Personal Leave Pay', 
                "AL":'Annual Leave Pay',
                "PH": ['Base Hourly', 'Overtime (2x)'],
                "LWP": 'Leave Without Pay',
            }

            print(sheet.employee.name)
            timesheet_lines = []
            for workday in timesheet.workday_set:
                worktype = workday.work_type
                
                if worktype in ["", "Normal"] and workday.hours == 0:
                    continue

                # Default to normal pay if there is no worktype selected
                if worktype == "":
                    worktype == "Normal" 

                # Get the payroll category
                if not (worktype == "Normal" or worktype == "PH"):
                    prc = payroll_categories[worktype]
                else:
                    prc = payroll_categories[worktype]
                    prc = prc[0]

                if not PayrollCategory.objects.filter(name=prc).exists():
                    print(prc, "Does not exists as a PayrollCategory")
                    return self(success=False, timesheets=processed, message="Payroll Category cannot be found. Please Sync. If issue persists, contact developer.")

                prc_uid = PayrollCategory.objects.get(name=prc).myob_uid

                # Calculate overtime
                if workday.allow_overtime:
                    # Reset variables
                    normal = 0
                    overtime = 0
                    timehalf = 0
                    doubletime = 0
                    workday_normal = {}
                    workday_timehalf = {}
                    workday_doubletime = {}

                    if worktype == "PH" or datetime.strptime(workday.date, "%Y-%m-%d").weekday() == 6: # Sunday:
                        # Add 2x Overtime for working on public holiday
                        prc_uid = PayrollCategory.objects.get(name=payroll_categories[worktype][1]).myob_uid
                        timesheet_lines = add_to_timesheets(timesheet_lines, workday, prc_uid)

                    elif datetime.strptime(workday.date, "%Y-%m-%d").weekday() == 5: # Saturday
                        if workday.hours > 2:
                            timehalf = 2
                            doubletime = workday.hours - 2
                        else:
                            timehalf = workday.hours

                        if timehalf > 0:
                            prc_uid = PayrollCategory.objects.get(name=payroll_categories[worktype][1]).myob_uid
                            workday_timehalf = workday.copy()
                            workday_timehalf['hours'] = timehalf
                            timesheet_lines = add_to_timesheets(timesheet_lines, workday_timehalf, prc_uid)

                        if doubletime > 0:
                            prc_uid = PayrollCategory.objects.get(name=payroll_categories[worktype][2]).myob_uid
                            workday_doubletime = workday.copy()
                            workday_doubletime['hours'] = doubletime
                            timesheet_lines = add_to_timesheets(timesheet_lines, workday_doubletime, prc_uid)

                    elif workday.hours > 8:
                        normal = 8
                        overtime = workday.hours - 8
                        if overtime > 2:
                            timehalf = 2
                            doubletime = overtime - 2
                        else:
                            timehalf = overtime

                        # Add normal timesheet lines
                        workday_normal = workday.copy()
                        workday_normal['hours'] = normal
                        
                        prc_uid = PayrollCategory.objects.get(name=prc).myob_uid
                        timesheet_lines = add_to_timesheets(timesheet_lines, workday_normal, prc_uid)

                        # Add timehalf timesheet lines
                        if timehalf > 0:
                            prc_uid = PayrollCategory.objects.get(name=payroll_categories[worktype][1]).myob_uid
                            workday_timehalf = workday.copy()
                            workday_timehalf['hours'] = timehalf
                            timesheet_lines = add_to_timesheets(timesheet_lines, workday_timehalf, prc_uid)

                        # Add doubletime timesheet lines
                        if doubletime > 0:
                            prc_uid = PayrollCategory.objects.get(name=payroll_categories[worktype][2]).myob_uid
                            workday_doubletime = workday.copy()
                            workday_doubletime['hours'] = doubletime
                            timesheet_lines = add_to_timesheets(timesheet_lines, workday_doubletime, prc_uid)
                    
                    else: # Add Normal Day
                        timesheet_lines = add_to_timesheets(timesheet_lines, workday, prc_uid)
    
                else:
                    # Default 8 hrs for normal weekday salary work
                    if worktype == "Normal" and timesheet.employee.pay_basis == "Salary" and datetime.strptime(workday.date, "%Y-%m-%d").weekday() < 5:
                        workday['hours'] = 8

                    # Add Normal Day
                    timesheet_lines = add_to_timesheets(timesheet_lines, workday, prc_uid)

            if len(timesheet_lines) <= 0:
                return self(success=True, message="No timesheets to process")

            # Send timesheet to myob
            timesheet_data = {
                'Employee': {
                    'UID': sheet.employee.myob_uid 
                },
                'StartDate': start_date,
                'EndDate': end_date,
                'Lines': timesheet_lines
            }

            all_timesheet_data.append(timesheet_data)

            url = f"{env('COMPANY_FILE_URL')}/{env('COMPANY_FILE_ID')}/Payroll/Timesheet/{sheet.employee.myob_uid}"
            headers = {                
                'Authorization': f'Bearer {user.access_token}',
                'x-myobapi-key': env('CLIENT_ID'),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            }
            response = requests.request("PUT", url, headers=headers, data=json.dumps(timesheet_data))

            print(response)
            print(response.text)
            if response.status_code != 200:
                print(timesheet_data)

            if response.status_code == 200:
                sheet.sent_to_myob = True
                sheet.save()
            else:
                submissionError = True
                failed += sheet.employee.name + ", "

            processed.append(sheet)

        if submissionError:
            message = "Timesheets Submitted. Errors when submitting for: " + failed[:-2]
        else:
            message = "Timesheets successfully submitted to MYOB"

        return self(success=True, message=message, timesheets=processed, submissionError=submissionError) #, debug=json.dumps(all_timesheet_data)

def add_to_timesheets(timesheet_lines, workday, prc_uid):   
    lines_idx = check_pay_category_exists(prc_uid, timesheet_lines)

    # Add data to myob timesheet lines
    if lines_idx == -1:
        job = {'UID': workday['job'].myob_uid} if workday['job'] else None

        # Create a new line
        timesheet_lines.append({
            'PayrollCategory': {
                'UID': prc_uid
            },
            'Notes': workday['notes'],
            'Entries': [{
                'Date': workday['date'],
                'Hours': workday['hours'],
                'Job': job
            }]
        })
    else:
        job = {'UID': workday['job'].myob_uid} if workday['job'] else None

        # Append timesheet to line entries
        timesheet_lines[lines_idx]['Entries'].append({
            'Date': workday['date'],
            'Hours': workday['hours'],
            'Job': job
        })

    return timesheet_lines

# Check if pay category exists in a list
def check_pay_category_exists(pay_category, list):
    for i, dictionary in enumerate(list):
        for val in dictionary.values():
            if type(val) is dict:
                if 'UID' in val:
                    if pay_category == val['UID']:
                        return i
    return -1

class Query(graphene.ObjectType):
    timesheets = graphene.List(TimesheetType, end_date=graphene.String())
    @login_required
    def resolve_timesheets(root, info, end_date=None, **kwargs):
        if end_date:
            return Timesheet.objects.filter(end_date=end_date).order_by('id')

        return Timesheet.objects.all().order_by('id')
    
    employees = graphene.List(EmployeeType)
    # @login_required
    def resolve_employees(root, info, **kwargs):
        return Employee.objects.filter(isActive=True).order_by('name')  

    work_days = graphene.List(WorkDayType)
    @login_required
    def resolve_work_days(root, info, **kwargs):
        return WorkDay.objects.all().order_by('date')
    
    payroll_categories = graphene.List(PayrollCategoryType)
    @login_required
    def resolve_payroll_categories(root, info, **kwargs):
        return PayrollCategory.objects.all().order_by('id')
    
    myob_jobs = graphene.List(MyobJobType)
    @login_required
    def resolve_myob_jobs(root, info, **kwargs):
        return MyobJob.objects.all().order_by('id')

    sync_settings = graphene.List(SyncSettingsType)
    @login_required
    def resolve_sync_settings(root, info, **kwargs):
        return SyncSettings.objects.all().order_by('id')

class QuickMutate(graphene.Mutation):
    success = graphene.Boolean()
    
    @classmethod
    @login_required
    def mutate(self, root, info):
        work_days = WorkDay.objects.all()
        for day in work_days:
            if day.id in [836, 838, 839]:
                day.hours = 8
                day.save()

        return self(success=True)

class Mutation(graphene.ObjectType):
    get_myob_payroll_categories = GetPayrollCategories.Field()
    get_payroll_details = GetPayrollDetails.Field()
    get_myob_employees = GetEmployees.Field()
    
    delete_all_timesheets = ClearAllTimesheetExamples.Field()
    # get_employee_count = GetEmployeeCount.Field()
    
    import_timesheets = ImportTimesheets.Field()
    submit_timesheets = SubmitTimesheets.Field()
    update_timesheet = UpdateTimesheet.Field()


    quick_mutate = QuickMutate.Field()

   
