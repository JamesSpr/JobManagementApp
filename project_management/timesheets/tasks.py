import environ
import os
from datetime import datetime, timedelta

from celery import shared_task
from exchangelib import FileAttachment, Folder
from django_celery_beat.models import PeriodicTask

from timesheets.scripts.timesheet_emails import get_active_myob_employees, get_emails_from_myob_employees, get_pay_period, create_new_timesheet_template
from timesheets.scripts.save_timesheets import get_employee_timesheets_from_email, get_timesheet_data, process_timesheet
from timesheets.scripts.exchange_email import ExchangeEmail
from timesheets.models import Timesheet, Employee


env = environ.Env()
environ.Env.read_env()
email = ExchangeEmail()

@shared_task
def restart_processing_timesheet():
    # Turn on task scheduler
    task = PeriodicTask.objects.get(name="Process Timesheets")
    task.enabled = True
    task.save()

@shared_task    
def process_timesheets():
    email.connect()
    email.account.inbox.refresh()

    if email.account.inbox.all().count() > 0:

        date = datetime.now()
        today = date.date()
        pay_period = get_pay_period()

        ## If within the first week days of a new pay period, we will be processing the previous pay period
        if (pay_period - today).days > 7:
            pay_period = get_pay_period() - timedelta(days=14)

        employees = get_active_myob_employees()
        timesheets = get_employee_timesheets_from_email(env, email, employees, pay_period)

        for timesheet in timesheets:
            data = get_timesheet_data(timesheet)
            process_timesheet(data, pay_period - timedelta(days=13), pay_period)

        # Check remaining submissions
        timesheets = Timesheet.objects.filter(end_date=pay_period)
        employees_who_have_submitted_timesheets = [timesheet.employee for timesheet in timesheets]
        remaining_employees = []
        for employee in employees:
            emp = Employee.objects.get(myob_uid=employee['UID'])
            if not emp in employees_who_have_submitted_timesheets:
                if employee['Addresses'][0]['Email'] != "":
                    remaining_employees.append(employee)

        if len(remaining_employees) > 0:
            return
        
        # Completion Reminder to Director
        subject = "Timesheets are ready to be processed."
        body = f"""<p>Hi Leo,</p>
        <p>The timesheets are ready to be processed.</p>
        <p><a href="https://maintenance.aurify.com.au/timesheets/{pay_period.strftime("%Y-%m-%d")}">Click here to access the periods timesheets.</a></p>"""
        email.send_email(to=["leo@aurify.com.au"], cc=None, bcc=["james@aurify.com.au"], subject=subject, attachments=[], body=body, importance=email.Importance.HIGH)
        
        # Turn off task scheduler
        task = PeriodicTask.objects.get(name="Process Timesheets")
        task.enabled = False
        task.save()

        employees = get_active_myob_employees()
        employee_emails = get_emails_from_myob_employees(employees)

        # Send a new timesheet once everyone has submitted
        pay_period = get_pay_period()
        if (pay_period - today).days < 7:
            pay_period = get_pay_period() + timedelta(days=14)

        # Create new timesheet folder
        ## Outlook
        folder = email.account.inbox // "Timesheets"
        if folder != None:
            print(folder)
            return folder
            
        new_folder = Folder(parent=email.account.inbox, name="Timesheets")
        new_folder.save()
        
        ## OS
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


@shared_task
def timesheet_emails():
    """ Connects to an exchange email server and sends emails about timesheets"""   

    email.connect()

    date = datetime.now()
    today = date.strftime("%A")

    # Get the active employees from MYOB
    employees = get_active_myob_employees()
    employee_emails = get_emails_from_myob_employees(employees)
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
        
        if len(remaining_employees) == 0:
            return
        
        # Final Reminder
        for employee in remaining_employees:
            subject = "Reminder: Submit your Timesheet Today"
            body = """<p>Hi """ + f"{employee['FirstName']}" + """,</p>
            <p>We need to process timesheets and have not yet received yours.</p>
            <p>If you have not already, please complete your timesheet and reply to this email or send to <a href='mailto:HR@aurify.com.au'>HR@aurify.com.au</a></p>"""
            email.send_email(to=[employee['Addresses'][0]['Email']], cc=None, bcc=None, subject=subject, attachments=[timesheet_template], body=body, importance=email.Importance.HIGH)

    return
    