from exchangelib import Credentials, Account, DELEGATE, Configuration, Message, HTMLBody, Folder
from exchangelib.items import (
    MeetingRequest,
    MeetingCancellation,
    SEND_TO_NONE,
    SEND_TO_ALL_AND_SAVE_COPY,
)

from enum import Enum
import environ

class ExchangeEmail():

    account = None

    class Importance(Enum):
        HIGH = "High"
        NORMAL = "Normal"
        LOW = "Low"

    def connect(self):
        """ Connect to the exchange email server
        
            Reads .env file which contains the following exchange details
            - Server
            - Email
            - Credentails
            - Password

        """

        if self.account is not None:
            return 
        
        env = environ.Env()
        environ.Env.read_env()

        credentials = Credentials(username=env('CREDENTIALS'), password=env('PASSWORD'))
        config = Configuration(server=env("SERVER"), credentials=credentials)
        self.account = Account(
            primary_smtp_address=env('EMAIL'),
            config=config,
            autodiscover=False,
            access_type=DELEGATE,
        )



    def send_email(self, to, cc, subject, body, importance=Importance.NORMAL):        
        """ Send an email from a connected account

            Parameters
            ----------
            to: string
            cc: string
            subject: string
            body: string
            importance: Enum

        """

        if self.account is None:
            raise RuntimeError("Email account not connected")
        
        m = Message(
            account = self.account,
            to_recipients=to,
            cc_recipients=cc,
            subject=subject,
            importance=importance,
            body=HTMLBody(body),
        )

        m.send_and_save()

    
    def check_folder_structure(self):
        if self.account is None:
            raise RuntimeError("Email account not connected")
        
        self.account.root.refresh()

        if not "Timesheets" in [x.name for x in self.account.inbox.children]:
            new_folder = Folder(parent=self.account.inbox, name="Timesheets")
            new_folder.save()

        self.account.inbox.refresh()