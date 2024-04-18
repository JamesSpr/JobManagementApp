import environ
import os
import requests
import json
from datetime import datetime, timedelta

from django.utils import timezone
from exchangelib import FileAttachment
from openpyxl import load_workbook
from openpyxl.worksheet.datavalidation import DataValidation
from typing import List

from timesheets.scripts.exchange_email import ExchangeEmail
from timesheets.models import Timesheet, Employee
from myob.models import MyobUser
from myob.schema import myob_get

def run():
    """ Connects to an exchange email server and sends emails about timesheets"""   
    env = environ.Env()
    environ.Env.read_env()

    email = ExchangeEmail()
    email.connect()

    date = datetime.now()
    today = date.strftime("%A")

    # Get the active employees from MYOB
    employees = get_active_myob_employees()
    employee_emails = get_emails_from_myob_employees(employees)
    employee_emails = ['james@aurify.com.au']

    with open(os.path.join(env("SHAREPOINT_DOCUMENTS_PATH"), "Aurify Timesheet.xlsx"), "rb") as f:
        timesheet_template = FileAttachment(name="Aurify Timesheet.xlsx", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.template", content=f.read())

    # Remind timesheets are due on Friday and Sunday
    if today == "Friday":
        subject = "Timesheets are due"
        body = """<p>Hi Team,</p>
        <p>Timesheets are due</p>
        <p>If you have not already, please complete your timesheet and reply to this email or send to <a href='mailto:HR@aurify.com.au'>HR@aurify.com.au</a></p>"""
        email.send_email(to=None, cc=None, bcc=employee_emails, subject=subject, attachments=[timesheet_template], body=body)

        return
    
    if today == "Sunday":
        pay_period = get_pay_period()
        timesheets = Timesheet.objects.filter(end_date=pay_period)
        employees_who_have_submitted_timesheets = [timesheet.employee for timesheet in timesheets]
        
        for employee in employees:
            emp = Employee.objects.get(myob_uid=employee['UID'])
            if not emp in employees_who_have_submitted_timesheets:
                if employee['Addresses'][0]['Email'] != "":
                    subject = "Reminder: Submit your Timesheet"
                    body = """<p>Hi """ + f"{employee['FirstName']}" + """,</p>
                    <p>We have not yet received your timesheet.</p>
                    <p>If you have not already, please complete your timesheet and reply to this email or send to <a href='mailto:HR@aurify.com.au'>HR@aurify.com.au</a></p>"""
                    email.send_email(to=[employee['Addresses'][0]['Email']], cc=None, bcc=None, subject=subject, attachments=[timesheet_template], body=body)
            
        return

    ## If within the first week days of a new pay period, we will be processing the previous pay period
    pay_period = get_pay_period()
    if (pay_period - date.date()).days > 7:
        pay_period = pay_period - timedelta(days=14)
        timesheets = Timesheet.objects.filter(end_date=pay_period)
        employees_who_have_submitted_timesheets = [timesheet.employee for timesheet in timesheets]
        remaining_employees = []
        for employee in employees:
            emp = Employee.objects.get(myob_uid=employee['UID'])
            if not emp in employees_who_have_submitted_timesheets:
                if employee['Addresses'][0]['Email'] != "":
                    remaining_employees.append(employee)
        
        if len(remaining_employees) > 0:
            # Final Reminder
            for employee in remaining_employees:
                subject = "Reminder: Submit your Timesheet Today"
                body = """<p>Hi """ + f"{employee['FirstName']}" + """,</p>
                <p>We need to process timesheets and have not yet received yours.</p>
                <p>If you have not already, please complete your timesheet and reply to this email or send to <a href='mailto:HR@aurify.com.au'>HR@aurify.com.au</a></p>"""
                email.send_email(to=[employee['Addresses'][0]['Email']], cc=None, bcc=None, subject=subject, attachments=[timesheet_template], body=body, importance=email.Importance.HIGH)
                
            return
        
        # Completion Reminder to Director
        subject = "Timesheets are ready to be processed."
        body = f"""<p>Hi Leo,</p>
        <p>The timesheets are ready to be processed.</p>
        <p><a href="https://maintenance.aurify.com.au/timesheets/{pay_period.strftime("%Y-%m-%d")}">Click here to access the periods timesheets.</a></p>"""
        email.send_email(to=["leo@aurify.com.au"], cc=None, bcc=None, subject=subject, attachments=[], body=body, importance=email.Importance.HIGH)
        
        # Turn off task scheduler


        # Send a new timesheet once everyone has submitted
        pay_period = get_pay_period()

        # Create new timesheet folder
        pay_period_folder_name = f"WE{pay_period.day:02d}-{pay_period.month:02d}"
        save_folder = os.path.join(env("TIMESHEET_SAVE_PATH"), str(datetime.now().year), pay_period_folder_name)
        if not os.path.exists(save_folder):
            os.mkdir(save_folder)

        # Create new timesheet template
        timesheet_template = create_new_timesheet_template(env, employees, pay_period)

        # Send timesheet template to all active employees
        subject = "Aurify Timesheet"
        body = """<p>Hi Team,</p>
        <p>Here is the new timesheet for this pay period</p>
        <p>Please fill out the attached timesheet, ensuring all details are correct and send to <a href='mailto:HR@aurify.com.au'>HR@aurify.com.au</a> at the end of the fortnight</p>
        <p>Note, a reminder email will be sent near the end of the fortnight with an updated job list.</p>"""
        email.send_email(to=None, cc=None, bcc=employee_emails, subject=subject, attachments=[timesheet_template], body=body)

    return
    

    
def get_authenticated_myob_user(myob_env):
    user = MyobUser.objects.get(id="ed779660-a0de-4c7b-b1d2-810d8ca03750")

    if timezone.now() >= (user.access_expires_at - timedelta(minutes=2)):
        
        link = "https://secure.myob.com/oauth2/v1/authorize"
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        payload = {
            'client_id': myob_env('CLIENT_ID'),
            'client_secret': myob_env('CLIENT_SECRET'),
            'refresh_token': user.refresh_token,
            'grant_type':'refresh_token',
        }
        # print(payload)
        response = requests.post(link, data=payload, headers=headers)

        if not response.status_code == 200:
            print(response.status_code, response.text)
            raise ConnectionError("Bad Connection with MYOB")

        res = json.loads(response.text)

        user.access_token = res['access_token']
        user.refresh_token = res['refresh_token']
        user.access_expires_at = timezone.now() + timedelta(seconds=int(res['expires_in']))
        user.save()
        
        print('MYOB Auth Refreshed By', user.username)
        return user
    else:
        print('MYOB Auth Active')
        return user


def get_active_myob_employees():
    myob_env = environ.Env()
    environ.Env.read_env("./myob/.env")
    
    myob_user = get_authenticated_myob_user(myob_env)

    endpoint = "Contact/Employee"
    myob_employees = myob_get(myob_user, endpoint, all=True)['Items']

    employees = []
    for employee in myob_employees:
        if employee['IsActive']:
            employees.append(employee)

    return employees

def get_pay_period():
    # Get the current or next pay period based off todays date
    latest_timesheet = Timesheet.objects.latest('end_date')
    next_period = latest_timesheet.end_date

    if latest_timesheet.end_date < datetime.now().date():
        two_weeks = timedelta(days=14)
        next_period = latest_timesheet.end_date + two_weeks

    return next_period

def get_emails_from_myob_employees(employees):
    emails = []
    
    for employee in employees:
        # print(employee)
        if employee['Addresses'][0]['Email'] != "":
            emails.append(employee['Addresses'][0]['Email'])
        else:
            print(employee['FirstName'], employee['LastName'], "does not have email configured correctly in MYOB")

    return emails

def create_new_timesheet_template(env: environ.Env, employees: List[str], pay_period: datetime) -> FileAttachment:
    # Modify the timesheet template
    template = os.path.join(env("SHAREPOINT_DOCUMENTS_PATH"), "Aurify Timesheet Template.xltx")
    workbook = load_workbook(template)
    
    selection_sheet = workbook['Selections']    
    sheet = workbook['Aurify Time Sheet']
    sheet.protection.disable()

    # Delete existing employee and job selection options
    selection_sheet.delete_cols(5, 3)

    # Update the Employee Data Validation
    for i, employee in enumerate(employees):
        selection_sheet[f"E{i+1}"] = f"""{employee['FirstName']} {employee['LastName']}"""

    employee_dv = DataValidation(type="list", formula1=f"=Selections!$E$1:$E${len(employees)}")
    sheet.add_data_validation(employee_dv)
    employee_dv.add("E4")

    # Update the Jobs Data Validation
    selection_sheet["G1"] = "Aurify Head Office"
    selection_sheet["G2"] = "Maintenance Works"

    num_jobs = 2
    for i, job in enumerate(os.listdir(env('PROJECTS_PATH'))):
        selection_sheet[f"G{i+3}"] = job
        num_jobs += 1

    job_dv = DataValidation(type="list", formula1=f"=Selections!$G$1:$G${num_jobs}")
    sheet.add_data_validation(job_dv)
    job_dv.add("K7:K20")
    
    time_dv = DataValidation(type="list", formula1=f"=Selections!$C$1:$C$2")
    sheet.add_data_validation(time_dv)
    time_dv.add("G7:G20")
    time_dv.add("I7:I20")

    pay_type_dv = DataValidation(type="list", formula1=f"=Selections!$A$1:$A$5")
    sheet.add_data_validation(pay_type_dv)
    pay_type_dv.add("L7:L20")

    # Update the Dates
    for i in range(20, 6, -1):
        sheet[f"E{i}"] = (pay_period + timedelta(days=i-20)).strftime("%d/%m/%Y")

    sheet.protection.enable()

    workbook.save(template)

    workbook.template = False
    workbook.save(os.path.join(env("SHAREPOINT_DOCUMENTS_PATH"), "Aurify Timesheet.xlsx"))

    workbook.close()

    with open(os.path.join(env("SHAREPOINT_DOCUMENTS_PATH"), "Aurify Timesheet.xlsx"), "rb") as f:
        timesheet_template = FileAttachment(name="Aurify Timesheet.xlsx", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.template", content=f.read())

    return timesheet_template