# Timesheet App
Django app for timesheet functionality with MYOB

## Requirements
 - MYOB Django App
 - exchangelib
 - celery

### MYOB Setup
#### Employees
 - Correct contact emails as this is where the timesheets and reminders are sent to
 - Blank standard pay settings found in the payroll details of the employee
 - Wage categories selected for the relevant payment options:
    - Annual Leave Pay
    - Base Hourly
    - Leave Without Pay
    - Personal Leave Pay

## Scheduling - Windows Task Scheduler
Call the python functions in the script folder at the desired times:
 - New Timesheet: Beginning and End of timesheet period
 - Save Timesheets: Over the weekend when the timesheets are expected to be submitted.
 - Reminder Emails: On the saturday & sunday before the timesheets are meant to be processed


## Bad
 - Hardcoded myob user as it is run as a script