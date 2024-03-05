# Timesheet Script
from exchange_email import ExchangeEmail
from datetime import datetime


def save_timesheets_for_period(email, start, end):
    email.check_folder_structure()

    email.account.inbox.refresh()   
    for email in email.account.inbox.filter():
        pass


if __name__ == '__main__':
    """ Connects to an exchange email server and saves relevant timesheet emails within a two week period"""

    email = ExchangeEmail()
    email.connect()

    today = datetime.now()
    start_day = today - datetime.timedelta(days=14)

    start = datetime(start_day.year, start_day.month, start_day.day, 0, 0, tzinfo=email.account.default_timezone)
    end = datetime(today.year, today.month, today.day, today.hour, today.minute, tzinfo=email.account.default_timezone)
    
    save_timesheets_for_period(email, start, end)