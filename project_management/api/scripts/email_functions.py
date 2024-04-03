import graphene
import os
import math
from django.utils import timezone
from datetime import date, datetime
from ..models import Job, Estimate, EstimateHeader
from graphql_jwt.decorators import login_required
import base64
import re
from .file_processing import compress_image_for_mail

import sys
sys.path.append("...")
from accounts.models import CustomUser

EMAIL_STYLE = """<body style="font-size:11pt; font-family:'Aptos (Body)'; color: rgb(0,0,0)">"""
JOBS_PATH = r'C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Jobs'

from exchangelib import OAUTH2, OAuth2Credentials, Identity, Account, DELEGATE, Configuration, Message, HTMLBody, FileAttachment, CalendarItem
from exchangelib.items import (
    MeetingRequest,
    MeetingCancellation,
    SEND_TO_NONE,
    SEND_TO_ALL_AND_SAVE_COPY,
)
import environ

class ExchangeEmail():

    email_account = None

    def create_calendar_item(self, start, end, subject, body, attendees=[]):
        if self.email_account.calendar.filter(subject=subject).exists():
            item = self.email_account.calendar.get(subject=subject)
            item.start = start
            item.end = end
            item.body = HTMLBody(f"{EMAIL_STYLE}{body}</body>")
            item.required_attendees = attendees
        else:
            item = CalendarItem(
                account = self.email_account,
                folder = self.email_account.calendar,
                start = start,
                end = end,
                subject = subject,
                body = HTMLBody(f"{EMAIL_STYLE}{body}</body>"),
                required_attendees=attendees
            )

        item.save(send_meeting_invitations=SEND_TO_NONE)

    def update_calendar_event(self, old, job, old_date, new_date):
        for calendar_item in self.email_account.calendar.filter(subject=old):
            job_string = f"<b>Job</b>: {str(job)}"
            location = f"<b>Location</b>: {job.location.name}, {job.location.address}, {job.location.locality} {job.location.state} {job.location.postcode}"
            description = f"<b>Description</b>: {job.description}".replace('\n', '<br>') if job.description else ""
            priority = f"<b>Priority</b>: {job.priority} " if job.priority else ""
            received_date = f"<b>Received On</b>: {job.date_issued.strftime('%d/%m/%y @ %H:%M')} " if job.date_issued else ""
            overdue_date = f"<b>Overdue Date</b>: {job.overdue_date.strftime('%d/%m/%y @ %H:%M')} " if job.overdue_date else ""
            special_instructions = f"<b>Special Instructions</b>: {job.special_instructions}" if job.special_instructions else ""
            detailed_locaton = f"<b>Detailed Location</b>: {job.detailed_location}" if job.detailed_location else ""
            requester = f"<b>Requestor</b>: {job.requester.first_name} {job.requester.last_name} - {job.requester.phone}" if job.requester.first_name else ""
            poc = f"<b>POC</b>: {job.poc_name} - {job.poc_phone}" if job.poc_name or job.poc_phone else ""
            alt_poc = f"<b>ALT POC</b>: {job.alt_poc_name} - {job.alt_poc_phone}" if job.alt_poc_name or job.alt_poc_phone else ""
            bsafe_link = f"<br><a href='{job.bsafe_link}'>BSAFE Link</a>" if job.bsafe_link else ""
            
            event_body = f"""<p style="margin: 6px 0px">{job_string}</p>
                            <p style="margin: 6px 0px">{location}</p>
                            <p style="margin: 6px 0px">{priority}</p>
                            <p style="margin: 6px 0px">{received_date}</p>
                            <p style="margin: 6px 0px">{overdue_date}</p>
                            <p style="margin: 6px 0px">{detailed_locaton}</p>
                            <p style="margin: 6px 0px">{description}</p>
                            <p style="margin: 6px 0px">{special_instructions}</p>
                            <p style="margin: 6px 0px"></p>
                            <p style="margin: 6px 0px">{requester}</p>
                            <p style="margin: 6px 0px">{poc}</p>
                            <p style="margin: 6px 0px">{alt_poc}</p>
                            <p style="margin: 6px 0px"></p>
                            <p style="margin: 6px 0px">{bsafe_link}</p>
                        """

            if calendar_item.start == old_date:
                calendar_item.start = new_date
                calendar_item.end = new_date
                calendar_item.subject = str(job)
                calendar_item.body = HTMLBody(f"{EMAIL_STYLE}{event_body}</body>")
                calendar_item.save(send_meeting_invitations=SEND_TO_NONE)

    def send_email(self, to, cc, subject, body, attachments, settings):
        if self.email_account is None:
            raise RuntimeError("Email account not connected")

        m = Message(
            account = self.email_account,
            to_recipients=to,
            cc_recipients=cc,
            subject=subject,
            importance="High" if settings and settings.urgent else "Normal",
            body=HTMLBody(f"{EMAIL_STYLE}{body}{html_signature}</body>"),
        )

        for attachment in attachments:
            m.attach(attachment)

        signature_images = [
            'image001.png',
            'image002.png',
            'image003.png',
            'image004.png',
            'image005.png'
        ]
        for img in signature_images:
            with open(f"{os.path.dirname(os.path.realpath(__file__))}\email_resources\{img}", "rb") as f:
                img_attachment = FileAttachment(name=img, content=f.read(), is_inline=True, content_id=img)
            m.attach(img_attachment)

        m.send_and_save()

    def connect(self):
        if self.email_account is not None:
            return
        
        env = environ.Env()
        environ.Env.read_env()

        credentials = OAuth2Credentials(
            client_id=env('CLIENT_ID'),
            client_secret=env('CLIENT_SECRET'),
            tenant_id=env('TENANT_ID'),
            identity=Identity(primary_smtp_address=env('EMAIL'))
        )
        config = Configuration(server=env('SERVER'), credentials=credentials, auth_type=OAUTH2)
        self.email_account = Account(
            primary_smtp_address=env('EMAIL'),
            config=config,
            autodiscover=False,
            access_type=DELEGATE,
        )

class EmailSettings(graphene.InputObjectType):
    urgent = graphene.Boolean()
    calendar = graphene.Boolean()

class AllocateJobEmail(graphene.Mutation):
    class Arguments:
        jobs = graphene.List(graphene.String)
        recipient = graphene.List(graphene.String)
        attachments = graphene.List(graphene.String)
        attachmentNames = graphene.List(graphene.String)
        settings = EmailSettings()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, jobs, recipient, attachments, attachmentNames, settings):
        count = 0

        email = ExchangeEmail()
        email.connect()

        if jobs:
            for job_id in jobs:
                job_id = int(job_id)
                job = Job.objects.get(id = job_id)

                if not job:
                    return cls(success=False, message="Could not find Job. ID = " + str(job_id))

                job_string = f"<b>Job</b>: {str(job)}"
                location = f"<b>Location</b>: {job.location.name}, {job.location.address}, {job.location.locality} {job.location.state} {job.location.postcode}"
                description = f"<b>Description</b>: {job.description}".replace('\n', '<br>') if job.description else ""
                priority = f"<b>Priority</b>: {job.priority} " if job.priority else ""
                received_date = f"<b>Received On</b>: {job.date_issued.strftime('%d/%m/%y @ %H:%M')} " if job.date_issued else ""
                overdue_date = f"<b>Overdue Date</b>: {job.overdue_date.strftime('%d/%m/%y @ %H:%M')} " if job.overdue_date else ""
                special_instructions = f"<b>Special Instructions</b>: {job.special_instructions}" if job.special_instructions else ""
                detailed_locaton = f"<b>Detailed Location</b>: {job.detailed_location}" if job.detailed_location else ""
                requester = f"<b>Requestor</b>: {job.requester.first_name} {job.requester.last_name} - {job.requester.phone}" if job.requester.first_name else ""
                poc = f"<b>POC</b>: {job.poc_name} - {job.poc_phone}" if job.poc_name or job.poc_phone else ""
                alt_poc = f"<b>ALT POC</b>: {job.alt_poc_name} - {job.alt_poc_phone}" if job.alt_poc_name or job.alt_poc_phone else ""
                bsafe_link = f"<br><a href='{job.bsafe_link}'>BSAFE Link</a>" if job.bsafe_link else ""
                
                # mail = outlook.CreateItem(0)
                mail_attachments = []
                for i, attachment in enumerate(attachments):
                    imgAttachment = False
                    if "image" in attachment:
                        imgAttachment = True

                    attachment = re.sub("data:(.*);base64,", "", attachment)
                    file = base64.b64decode(attachment, validate=True)
                    with open(os.path.join(JOBS_PATH, str(job), attachmentNames[i]), 'wb') as f:
                        f.write(file)

                    if imgAttachment:
                        if attachmentNames[i].lower().endswith('png'):
                            attachmentNames[i] = attachmentNames[i][:-4]
                            attachmentNames[i] = attachmentNames[i] + ".jpg"

                        mail_attachments.append(FileAttachment(name=attachmentNames[i], content=compress_image_for_mail(file, attachmentNames[i])))
                    else:
                        mail_attachments.append(FileAttachment(name=attachmentNames[i], content=file))

                addressee = "All"
                if len(recipient) == 1:
                    addressee = recipient[0].split("@")[0].capitalize()

                priority_title =  " " + job.priority if not job.priority == "" else "" 

                mailTo = recipient
                mailSubject = f"NEW{priority_title}: {str(job)}"
                mailBody = f"""<p>Hi {addressee},</p>
                                </p>
                                <p>We have received this new work request. Could you please inspect and provide details/quote</p>
                                </p>
                                <p style="margin: 6px 0px">{job_string}</p>
                                <p style="margin: 6px 0px">{location}</p>
                                <p style="margin: 6px 0px">{priority}</p>
                                <p style="margin: 6px 0px">{received_date}</p>
                                <p style="margin: 6px 0px">{overdue_date}</p>
                                <p style="margin: 6px 0px">{detailed_locaton}</p>
                                <p style="margin: 6px 0px">{description}</p>
                                <p style="margin: 6px 0px">{special_instructions}</p>
                                </p>
                                <p style="margin: 6px 0px">{requester}</p>
                                <p style="margin: 6px 0px">{poc}</p>
                                <p style="margin: 6px 0px">{alt_poc}</p>
                                </p>
                                <p style="margin: 6px 0px">{bsafe_link}</p>
                                </p>
                                """
                
                eventSubject = f"{str(job)}"
                eventBody = f"""<p style="margin: 6px 0px">{job_string}</p>
                                <p style="margin: 6px 0px">{location}</p>
                                <p style="margin: 6px 0px">{priority}</p>
                                <p style="margin: 6px 0px">{received_date}</p>
                                <p style="margin: 6px 0px">{overdue_date}</p>
                                <p style="margin: 6px 0px">{detailed_locaton}</p>
                                <p style="margin: 6px 0px">{description}</p>
                                <p style="margin: 6px 0px">{special_instructions}</p>
                                </p>
                                <p style="margin: 6px 0px">{requester}</p>
                                <p style="margin: 6px 0px">{poc}</p>
                                <p style="margin: 6px 0px">{alt_poc}</p>
                                </p>
                                <p style="margin: 6px 0px">{bsafe_link}</p>
                                """
                

                # mail.Send()        
                if settings.calendar:
                    eventDate = job.overdue_date.replace(tzinfo=timezone.get_current_timezone())
                    email.create_calendar_item(start=eventDate, end=eventDate, subject=eventSubject, body=eventBody, attendees=mailTo)
                email.send_email(to=mailTo, cc=[], subject=mailSubject, body=mailBody, attachments=mail_attachments, settings=settings)
                count += 1

                job = ""
                # mail = ""

        return AllocateJobEmail(success=True, message=f"{count} Emails Sent")

class CloseOutEmail(graphene.Mutation):
    class Arguments:
        jobid = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()
    time = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, jobid):
        count = 0

        email = ExchangeEmail()
        email.connect()

        job = Job.objects.get(id = jobid)
        if not job:
            return cls(success=False, message="Job Not Found")

        if not job.location:
            return cls(success=False, message="Please Ensure Job Location Is Not Empty")

        if not job.inspection_date:
            return cls(success=False, message="Please Ensure Job Inspection Date Is Not Empty")

        if not job.completion_date:
            return cls(success=False, message="Please Ensure Job Completion Date Is Not Empty")

        if job.total_hours == 0:
            return cls(success=False, message="Job's Hours must not be 0")

        if not job.scope:
            return cls(success=False, message="Please Ensure Job Scope of Works Is Not Empty")

        # scope = job.scope.replace('\n', '<br>') if '\n' in job.scope else job.scope

        finishTime = 7 + job.total_hours
        if finishTime >= 15:
            finishTime = "15:00"
        else:
            finishTime = str(math.ceil(finishTime) ).zfill(2) + ":00"

        mailTo = [job.location.region.email]
        mailCC = ["Colin@aurify.com.au", "James@aurify.com.au", "Safiya@aurify.com.au"]
        mailSubject = "Close out: " + str(job)
        mailHTMLBody = f"""<p>Hi {job.location.region.short_name} EMOS,</p>
        </p>
        <p style="margin: 6px 0px">All works have been completed for {job.po}. Details Below:</p>
        <p style="margin: 6px 0px"><b>Initial Inspection Date</b>: {job.inspection_date.strftime('%d/%m/%y')}</p>
        <p style="margin: 6px 0px"><b>Works Start Date</b>: {job.commencement_date.strftime('%d/%m/%y')}</p>
        <p style="margin: 6px 0px"><b>Start Time:</b> 07:00</p>
        <p style="margin: 6px 0px"><b>Works Completion Date</b>: {job.completion_date.strftime('%d/%m/%y')}</p> 
        <p style="margin: 6px 0px"><b>Finish Time</b>: {finishTime}</p>
        <p style="margin: 6px 0px"><b>Total Hours</b>: {job.total_hours}</p>
        <p style="margin: 6px 0px"><b>Scope of Works</b>: {job.scope}</p>
        </p>"""

        email.send_email(to=mailTo, cc=mailCC, subject=mailSubject, body=mailHTMLBody, attachments=[], settings=None)

        closeout_datetime = datetime.today().replace(tzinfo=timezone.get_current_timezone())
        job.close_out_date = closeout_datetime
        job.save()

        return cls(success=True, message=f"Close Out Email Sent", time=closeout_datetime.strftime('%Y-%m-%dT%H:%M'))

class EmailQuote(graphene.Mutation):
    class Arguments:
        job_id = graphene.String()
        selected_estimate = graphene.String()
        userId = graphene.String()

    success = graphene.Boolean()
    message = graphene.String()

    @classmethod
    @login_required
    def mutate(cls, root, info, job_id, selected_estimate, userId):
        
        job = Job.objects.get(id=job_id)
        estimate = Estimate.objects.get(job_id=job_id, name=selected_estimate)
        estimate_headers = EstimateHeader.objects.filter(estimate_id=estimate)
        user = CustomUser.objects.get(id=userId)
        # print("Creating Quote for", job)
        # print("Selected Estimate", estimate.name)
    
        # Check to see if file already exists# Save to dropbox
        # This will have to be removed when we move to pdf only quotes
        if not os.path.exists(os.path.join(JOBS_PATH, str(job).strip(), "Estimates", str(estimate.name).strip(), 'Aurify Quote ' + str(estimate.name).strip() + '.docx')):
            return EmailQuote(success=False, message="Quote Does Not Exists")

        return EmailQuote(success=True, message=f"Quote Sent to {job.location.region.email}")



html_signature = """<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" xmlns="http://www.w3.org/TR/REC-html40"><head><meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15"><meta name=Originator content="Microsoft Word 15"><link rel=File-List href="cid:filelist.xml"><link rel=Edit-Time-Data href="cid:editdata.mso"><!--[if !mso]><style>v\:* {behavior:url(#default#VML);}
o\:* {behavior:url(#default#VML);}
w\:* {behavior:url(#default#VML);}
.shape {behavior:url(#default#VML);}
</style><![endif]--><!--[if gte mso 9]><xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
</o:OfficeDocumentSettings>
</xml><![endif]--><link rel=themeData href="~~themedata~~"><link rel=colorSchemeMapping href="~~colorschememapping~~"><!--[if gte mso 9]><xml>
<w:WordDocument>
<w:TrackMoves>false</w:TrackMoves>
<w:TrackFormatting/>
<w:EnvelopeVis/>
<w:PunctuationKerning/>
<w:ValidateAgainstSchemas/>
<w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
<w:IgnoreMixedContent>false</w:IgnoreMixedContent>
<w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
<w:DoNotPromoteQF/>
<w:LidThemeOther>EN-GB</w:LidThemeOther>
<w:LidThemeAsian>X-NONE</w:LidThemeAsian>
<w:LidThemeComplexScript>X-NONE</w:LidThemeComplexScript>
<w:Compatibility>
<w:BreakWrappedTables/>
<w:SnapToGridInCell/>
<w:WrapTextWithPunct/>
<w:UseAsianBreakRules/>
<w:DontGrowAutofit/>
<w:SplitPgBreakAndParaMark/>
<w:EnableOpenTypeKerning/>
<w:DontFlipMirrorIndents/>
<w:OverrideTableStyleHps/>
</w:Compatibility>
<m:mathPr>
<m:mathFont m:val="Cambria Math"/>
<m:brkBin m:val="before"/>
<m:brkBinSub m:val="&#45;-"/>
<m:smallFrac m:val="off"/>
<m:dispDef/>
<m:lMargin m:val="0"/>
<m:rMargin m:val="0"/>
<m:defJc m:val="centerGroup"/>
<m:wrapIndent m:val="1440"/>
<m:intLim m:val="subSup"/>
<m:naryLim m:val="undOvr"/>
</m:mathPr></w:WordDocument>
</xml><![endif]--><!--[if gte mso 9]><xml>
<w:LatentStyles DefLockedState="false" DefUnhideWhenUsed="false" DefSemiHidden="false" DefQFormat="false" DefPriority="99" LatentStyleCount="376">
<w:LsdException Locked="false" Priority="0" QFormat="true" Name="Normal"/>
<w:LsdException Locked="false" Priority="9" QFormat="true" Name="heading 1"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 2"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 3"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 4"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 5"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 6"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 7"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 8"/>
<w:LsdException Locked="false" Priority="9" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="heading 9"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 5"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 6"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 7"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 8"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index 9"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 1"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 2"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 3"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 4"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 5"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 6"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 7"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 8"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" Name="toc 9"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Normal Indent"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="footnote text"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="annotation text"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="header"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="footer"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="index heading"/>
<w:LsdException Locked="false" Priority="35" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="caption"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="table of figures"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="envelope address"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="envelope return"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="footnote reference"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="annotation reference"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="line number"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="page number"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="endnote reference"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="endnote text"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="table of authorities"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="macro"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="toa heading"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Bullet"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Number"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List 5"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Bullet 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Bullet 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Bullet 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Bullet 5"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Number 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Number 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Number 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Number 5"/>
<w:LsdException Locked="false" Priority="10" QFormat="true" Name="Title"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Closing"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Signature"/>
<w:LsdException Locked="false" Priority="1" SemiHidden="true" UnhideWhenUsed="true" Name="Default Paragraph Font"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text Indent"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Continue"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Continue 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Continue 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Continue 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="List Continue 5"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Message Header"/>
<w:LsdException Locked="false" Priority="11" QFormat="true" Name="Subtitle"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Salutation"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Date"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text First Indent"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text First Indent 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Note Heading"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text Indent 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Body Text Indent 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Block Text"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Hyperlink"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="FollowedHyperlink"/>
<w:LsdException Locked="false" Priority="22" QFormat="true" Name="Strong"/>
<w:LsdException Locked="false" Priority="20" QFormat="true" Name="Emphasis"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Document Map"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Plain Text"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="E-mail Signature"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Top of Form"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Bottom of Form"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Normal (Web)"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Acronym"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Address"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Cite"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Code"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Definition"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Keyboard"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Preformatted"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Sample"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Typewriter"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="HTML Variable"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Normal Table"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="annotation subject"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="No List"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Outline List 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Outline List 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Outline List 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Simple 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Simple 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Simple 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Classic 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Classic 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Classic 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Classic 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Colorful 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Colorful 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Colorful 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Columns 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Columns 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Columns 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Columns 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Columns 5"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 5"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 6"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 7"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Grid 8"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 4"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 5"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 6"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 7"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table List 8"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table 3D effects 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table 3D effects 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table 3D effects 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Contemporary"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Elegant"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Professional"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Subtle 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Subtle 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Web 1"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Web 2"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Web 3"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Balloon Text"/>
<w:LsdException Locked="false" Priority="39" Name="Table Grid"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Table Theme"/>
<w:LsdException Locked="false" SemiHidden="true" Name="Placeholder Text"/>
<w:LsdException Locked="false" Priority="1" QFormat="true" Name="No Spacing"/>
<w:LsdException Locked="false" Priority="60" Name="Light Shading"/>
<w:LsdException Locked="false" Priority="61" Name="Light List"/>
<w:LsdException Locked="false" Priority="62" Name="Light Grid"/>
<w:LsdException Locked="false" Priority="63" Name="Medium Shading 1"/>
<w:LsdException Locked="false" Priority="64" Name="Medium Shading 2"/>
<w:LsdException Locked="false" Priority="65" Name="Medium List 1"/>
<w:LsdException Locked="false" Priority="66" Name="Medium List 2"/>
<w:LsdException Locked="false" Priority="67" Name="Medium Grid 1"/>
<w:LsdException Locked="false" Priority="68" Name="Medium Grid 2"/>
<w:LsdException Locked="false" Priority="69" Name="Medium Grid 3"/>
<w:LsdException Locked="false" Priority="70" Name="Dark List"/>
<w:LsdException Locked="false" Priority="71" Name="Colorful Shading"/>
<w:LsdException Locked="false" Priority="72" Name="Colorful List"/>
<w:LsdException Locked="false" Priority="73" Name="Colorful Grid"/>
<w:LsdException Locked="false" Priority="60" Name="Light Shading Accent 1"/>
<w:LsdException Locked="false" Priority="61" Name="Light List Accent 1"/>
<w:LsdException Locked="false" Priority="62" Name="Light Grid Accent 1"/>
<w:LsdException Locked="false" Priority="63" Name="Medium Shading 1 Accent 1"/>
<w:LsdException Locked="false" Priority="64" Name="Medium Shading 2 Accent 1"/>
<w:LsdException Locked="false" Priority="65" Name="Medium List 1 Accent 1"/>
<w:LsdException Locked="false" SemiHidden="true" Name="Revision"/>
<w:LsdException Locked="false" Priority="34" QFormat="true" Name="List Paragraph"/>
<w:LsdException Locked="false" Priority="29" QFormat="true" Name="Quote"/>
<w:LsdException Locked="false" Priority="30" QFormat="true" Name="Intense Quote"/>
<w:LsdException Locked="false" Priority="66" Name="Medium List 2 Accent 1"/>
<w:LsdException Locked="false" Priority="67" Name="Medium Grid 1 Accent 1"/>
<w:LsdException Locked="false" Priority="68" Name="Medium Grid 2 Accent 1"/>
<w:LsdException Locked="false" Priority="69" Name="Medium Grid 3 Accent 1"/>
<w:LsdException Locked="false" Priority="70" Name="Dark List Accent 1"/>
<w:LsdException Locked="false" Priority="71" Name="Colorful Shading Accent 1"/>
<w:LsdException Locked="false" Priority="72" Name="Colorful List Accent 1"/>
<w:LsdException Locked="false" Priority="73" Name="Colorful Grid Accent 1"/>
<w:LsdException Locked="false" Priority="60" Name="Light Shading Accent 2"/>
<w:LsdException Locked="false" Priority="61" Name="Light List Accent 2"/>
<w:LsdException Locked="false" Priority="62" Name="Light Grid Accent 2"/>
<w:LsdException Locked="false" Priority="63" Name="Medium Shading 1 Accent 2"/>
<w:LsdException Locked="false" Priority="64" Name="Medium Shading 2 Accent 2"/>
<w:LsdException Locked="false" Priority="65" Name="Medium List 1 Accent 2"/>
<w:LsdException Locked="false" Priority="66" Name="Medium List 2 Accent 2"/>
<w:LsdException Locked="false" Priority="67" Name="Medium Grid 1 Accent 2"/>
<w:LsdException Locked="false" Priority="68" Name="Medium Grid 2 Accent 2"/>
<w:LsdException Locked="false" Priority="69" Name="Medium Grid 3 Accent 2"/>
<w:LsdException Locked="false" Priority="70" Name="Dark List Accent 2"/>
<w:LsdException Locked="false" Priority="71" Name="Colorful Shading Accent 2"/>
<w:LsdException Locked="false" Priority="72" Name="Colorful List Accent 2"/>
<w:LsdException Locked="false" Priority="73" Name="Colorful Grid Accent 2"/>
<w:LsdException Locked="false" Priority="60" Name="Light Shading Accent 3"/>
<w:LsdException Locked="false" Priority="61" Name="Light List Accent 3"/>
<w:LsdException Locked="false" Priority="62" Name="Light Grid Accent 3"/>
<w:LsdException Locked="false" Priority="63" Name="Medium Shading 1 Accent 3"/>
<w:LsdException Locked="false" Priority="64" Name="Medium Shading 2 Accent 3"/>
<w:LsdException Locked="false" Priority="65" Name="Medium List 1 Accent 3"/>
<w:LsdException Locked="false" Priority="66" Name="Medium List 2 Accent 3"/>
<w:LsdException Locked="false" Priority="67" Name="Medium Grid 1 Accent 3"/>
<w:LsdException Locked="false" Priority="68" Name="Medium Grid 2 Accent 3"/>
<w:LsdException Locked="false" Priority="69" Name="Medium Grid 3 Accent 3"/>
<w:LsdException Locked="false" Priority="70" Name="Dark List Accent 3"/>
<w:LsdException Locked="false" Priority="71" Name="Colorful Shading Accent 3"/>
<w:LsdException Locked="false" Priority="72" Name="Colorful List Accent 3"/>
<w:LsdException Locked="false" Priority="73" Name="Colorful Grid Accent 3"/>
<w:LsdException Locked="false" Priority="60" Name="Light Shading Accent 4"/>
<w:LsdException Locked="false" Priority="61" Name="Light List Accent 4"/>
<w:LsdException Locked="false" Priority="62" Name="Light Grid Accent 4"/>
<w:LsdException Locked="false" Priority="63" Name="Medium Shading 1 Accent 4"/>
<w:LsdException Locked="false" Priority="64" Name="Medium Shading 2 Accent 4"/>
<w:LsdException Locked="false" Priority="65" Name="Medium List 1 Accent 4"/>
<w:LsdException Locked="false" Priority="66" Name="Medium List 2 Accent 4"/>
<w:LsdException Locked="false" Priority="67" Name="Medium Grid 1 Accent 4"/>
<w:LsdException Locked="false" Priority="68" Name="Medium Grid 2 Accent 4"/>
<w:LsdException Locked="false" Priority="69" Name="Medium Grid 3 Accent 4"/>
<w:LsdException Locked="false" Priority="70" Name="Dark List Accent 4"/>
<w:LsdException Locked="false" Priority="71" Name="Colorful Shading Accent 4"/>
<w:LsdException Locked="false" Priority="72" Name="Colorful List Accent 4"/>
<w:LsdException Locked="false" Priority="73" Name="Colorful Grid Accent 4"/>
<w:LsdException Locked="false" Priority="60" Name="Light Shading Accent 5"/>
<w:LsdException Locked="false" Priority="61" Name="Light List Accent 5"/>
<w:LsdException Locked="false" Priority="62" Name="Light Grid Accent 5"/>
<w:LsdException Locked="false" Priority="63" Name="Medium Shading 1 Accent 5"/>
<w:LsdException Locked="false" Priority="64" Name="Medium Shading 2 Accent 5"/>
<w:LsdException Locked="false" Priority="65" Name="Medium List 1 Accent 5"/>
<w:LsdException Locked="false" Priority="66" Name="Medium List 2 Accent 5"/>
<w:LsdException Locked="false" Priority="67" Name="Medium Grid 1 Accent 5"/>
<w:LsdException Locked="false" Priority="68" Name="Medium Grid 2 Accent 5"/>
<w:LsdException Locked="false" Priority="69" Name="Medium Grid 3 Accent 5"/>
<w:LsdException Locked="false" Priority="70" Name="Dark List Accent 5"/>
<w:LsdException Locked="false" Priority="71" Name="Colorful Shading Accent 5"/>
<w:LsdException Locked="false" Priority="72" Name="Colorful List Accent 5"/>
<w:LsdException Locked="false" Priority="73" Name="Colorful Grid Accent 5"/>
<w:LsdException Locked="false" Priority="60" Name="Light Shading Accent 6"/>
<w:LsdException Locked="false" Priority="61" Name="Light List Accent 6"/>
<w:LsdException Locked="false" Priority="62" Name="Light Grid Accent 6"/>
<w:LsdException Locked="false" Priority="63" Name="Medium Shading 1 Accent 6"/>
<w:LsdException Locked="false" Priority="64" Name="Medium Shading 2 Accent 6"/>
<w:LsdException Locked="false" Priority="65" Name="Medium List 1 Accent 6"/>
<w:LsdException Locked="false" Priority="66" Name="Medium List 2 Accent 6"/>
<w:LsdException Locked="false" Priority="67" Name="Medium Grid 1 Accent 6"/>
<w:LsdException Locked="false" Priority="68" Name="Medium Grid 2 Accent 6"/>
<w:LsdException Locked="false" Priority="69" Name="Medium Grid 3 Accent 6"/>
<w:LsdException Locked="false" Priority="70" Name="Dark List Accent 6"/>
<w:LsdException Locked="false" Priority="71" Name="Colorful Shading Accent 6"/>
<w:LsdException Locked="false" Priority="72" Name="Colorful List Accent 6"/>
<w:LsdException Locked="false" Priority="73" Name="Colorful Grid Accent 6"/>
<w:LsdException Locked="false" Priority="19" QFormat="true" Name="Subtle Emphasis"/>
<w:LsdException Locked="false" Priority="21" QFormat="true" Name="Intense Emphasis"/>
<w:LsdException Locked="false" Priority="31" QFormat="true" Name="Subtle Reference"/>
<w:LsdException Locked="false" Priority="32" QFormat="true" Name="Intense Reference"/>
<w:LsdException Locked="false" Priority="33" QFormat="true" Name="Book Title"/>
<w:LsdException Locked="false" Priority="37" SemiHidden="true" UnhideWhenUsed="true" Name="Bibliography"/>
<w:LsdException Locked="false" Priority="39" SemiHidden="true" UnhideWhenUsed="true" QFormat="true" Name="TOC Heading"/>
<w:LsdException Locked="false" Priority="41" Name="Plain Table 1"/>
<w:LsdException Locked="false" Priority="42" Name="Plain Table 2"/>
<w:LsdException Locked="false" Priority="43" Name="Plain Table 3"/>
<w:LsdException Locked="false" Priority="44" Name="Plain Table 4"/>
<w:LsdException Locked="false" Priority="45" Name="Plain Table 5"/>
<w:LsdException Locked="false" Priority="40" Name="Grid Table Light"/>
<w:LsdException Locked="false" Priority="46" Name="Grid Table 1 Light"/>
<w:LsdException Locked="false" Priority="47" Name="Grid Table 2"/>
<w:LsdException Locked="false" Priority="48" Name="Grid Table 3"/>
<w:LsdException Locked="false" Priority="49" Name="Grid Table 4"/>
<w:LsdException Locked="false" Priority="50" Name="Grid Table 5 Dark"/>
<w:LsdException Locked="false" Priority="51" Name="Grid Table 6 Colorful"/>
<w:LsdException Locked="false" Priority="52" Name="Grid Table 7 Colorful"/>
<w:LsdException Locked="false" Priority="46" Name="Grid Table 1 Light Accent 1"/>
<w:LsdException Locked="false" Priority="47" Name="Grid Table 2 Accent 1"/>
<w:LsdException Locked="false" Priority="48" Name="Grid Table 3 Accent 1"/>
<w:LsdException Locked="false" Priority="49" Name="Grid Table 4 Accent 1"/>
<w:LsdException Locked="false" Priority="50" Name="Grid Table 5 Dark Accent 1"/>
<w:LsdException Locked="false" Priority="51" Name="Grid Table 6 Colorful Accent 1"/>
<w:LsdException Locked="false" Priority="52" Name="Grid Table 7 Colorful Accent 1"/>
<w:LsdException Locked="false" Priority="46" Name="Grid Table 1 Light Accent 2"/>
<w:LsdException Locked="false" Priority="47" Name="Grid Table 2 Accent 2"/>
<w:LsdException Locked="false" Priority="48" Name="Grid Table 3 Accent 2"/>
<w:LsdException Locked="false" Priority="49" Name="Grid Table 4 Accent 2"/>
<w:LsdException Locked="false" Priority="50" Name="Grid Table 5 Dark Accent 2"/>
<w:LsdException Locked="false" Priority="51" Name="Grid Table 6 Colorful Accent 2"/>
<w:LsdException Locked="false" Priority="52" Name="Grid Table 7 Colorful Accent 2"/>
<w:LsdException Locked="false" Priority="46" Name="Grid Table 1 Light Accent 3"/>
<w:LsdException Locked="false" Priority="47" Name="Grid Table 2 Accent 3"/>
<w:LsdException Locked="false" Priority="48" Name="Grid Table 3 Accent 3"/>
<w:LsdException Locked="false" Priority="49" Name="Grid Table 4 Accent 3"/>
<w:LsdException Locked="false" Priority="50" Name="Grid Table 5 Dark Accent 3"/>
<w:LsdException Locked="false" Priority="51" Name="Grid Table 6 Colorful Accent 3"/>
<w:LsdException Locked="false" Priority="52" Name="Grid Table 7 Colorful Accent 3"/>
<w:LsdException Locked="false" Priority="46" Name="Grid Table 1 Light Accent 4"/>
<w:LsdException Locked="false" Priority="47" Name="Grid Table 2 Accent 4"/>
<w:LsdException Locked="false" Priority="48" Name="Grid Table 3 Accent 4"/>
<w:LsdException Locked="false" Priority="49" Name="Grid Table 4 Accent 4"/>
<w:LsdException Locked="false" Priority="50" Name="Grid Table 5 Dark Accent 4"/>
<w:LsdException Locked="false" Priority="51" Name="Grid Table 6 Colorful Accent 4"/>
<w:LsdException Locked="false" Priority="52" Name="Grid Table 7 Colorful Accent 4"/>
<w:LsdException Locked="false" Priority="46" Name="Grid Table 1 Light Accent 5"/>
<w:LsdException Locked="false" Priority="47" Name="Grid Table 2 Accent 5"/>
<w:LsdException Locked="false" Priority="48" Name="Grid Table 3 Accent 5"/>
<w:LsdException Locked="false" Priority="49" Name="Grid Table 4 Accent 5"/>
<w:LsdException Locked="false" Priority="50" Name="Grid Table 5 Dark Accent 5"/>
<w:LsdException Locked="false" Priority="51" Name="Grid Table 6 Colorful Accent 5"/>
<w:LsdException Locked="false" Priority="52" Name="Grid Table 7 Colorful Accent 5"/>
<w:LsdException Locked="false" Priority="46" Name="Grid Table 1 Light Accent 6"/>
<w:LsdException Locked="false" Priority="47" Name="Grid Table 2 Accent 6"/>
<w:LsdException Locked="false" Priority="48" Name="Grid Table 3 Accent 6"/>
<w:LsdException Locked="false" Priority="49" Name="Grid Table 4 Accent 6"/>
<w:LsdException Locked="false" Priority="50" Name="Grid Table 5 Dark Accent 6"/>
<w:LsdException Locked="false" Priority="51" Name="Grid Table 6 Colorful Accent 6"/>
<w:LsdException Locked="false" Priority="52" Name="Grid Table 7 Colorful Accent 6"/>
<w:LsdException Locked="false" Priority="46" Name="List Table 1 Light"/>
<w:LsdException Locked="false" Priority="47" Name="List Table 2"/>
<w:LsdException Locked="false" Priority="48" Name="List Table 3"/>
<w:LsdException Locked="false" Priority="49" Name="List Table 4"/>
<w:LsdException Locked="false" Priority="50" Name="List Table 5 Dark"/>
<w:LsdException Locked="false" Priority="51" Name="List Table 6 Colorful"/>
<w:LsdException Locked="false" Priority="52" Name="List Table 7 Colorful"/>
<w:LsdException Locked="false" Priority="46" Name="List Table 1 Light Accent 1"/>
<w:LsdException Locked="false" Priority="47" Name="List Table 2 Accent 1"/>
<w:LsdException Locked="false" Priority="48" Name="List Table 3 Accent 1"/>
<w:LsdException Locked="false" Priority="49" Name="List Table 4 Accent 1"/>
<w:LsdException Locked="false" Priority="50" Name="List Table 5 Dark Accent 1"/>
<w:LsdException Locked="false" Priority="51" Name="List Table 6 Colorful Accent 1"/>
<w:LsdException Locked="false" Priority="52" Name="List Table 7 Colorful Accent 1"/>
<w:LsdException Locked="false" Priority="46" Name="List Table 1 Light Accent 2"/>
<w:LsdException Locked="false" Priority="47" Name="List Table 2 Accent 2"/>
<w:LsdException Locked="false" Priority="48" Name="List Table 3 Accent 2"/>
<w:LsdException Locked="false" Priority="49" Name="List Table 4 Accent 2"/>
<w:LsdException Locked="false" Priority="50" Name="List Table 5 Dark Accent 2"/>
<w:LsdException Locked="false" Priority="51" Name="List Table 6 Colorful Accent 2"/>
<w:LsdException Locked="false" Priority="52" Name="List Table 7 Colorful Accent 2"/>
<w:LsdException Locked="false" Priority="46" Name="List Table 1 Light Accent 3"/>
<w:LsdException Locked="false" Priority="47" Name="List Table 2 Accent 3"/>
<w:LsdException Locked="false" Priority="48" Name="List Table 3 Accent 3"/>
<w:LsdException Locked="false" Priority="49" Name="List Table 4 Accent 3"/>
<w:LsdException Locked="false" Priority="50" Name="List Table 5 Dark Accent 3"/>
<w:LsdException Locked="false" Priority="51" Name="List Table 6 Colorful Accent 3"/>
<w:LsdException Locked="false" Priority="52" Name="List Table 7 Colorful Accent 3"/>
<w:LsdException Locked="false" Priority="46" Name="List Table 1 Light Accent 4"/>
<w:LsdException Locked="false" Priority="47" Name="List Table 2 Accent 4"/>
<w:LsdException Locked="false" Priority="48" Name="List Table 3 Accent 4"/>
<w:LsdException Locked="false" Priority="49" Name="List Table 4 Accent 4"/>
<w:LsdException Locked="false" Priority="50" Name="List Table 5 Dark Accent 4"/>
<w:LsdException Locked="false" Priority="51" Name="List Table 6 Colorful Accent 4"/>
<w:LsdException Locked="false" Priority="52" Name="List Table 7 Colorful Accent 4"/>
<w:LsdException Locked="false" Priority="46" Name="List Table 1 Light Accent 5"/>
<w:LsdException Locked="false" Priority="47" Name="List Table 2 Accent 5"/>
<w:LsdException Locked="false" Priority="48" Name="List Table 3 Accent 5"/>
<w:LsdException Locked="false" Priority="49" Name="List Table 4 Accent 5"/>
<w:LsdException Locked="false" Priority="50" Name="List Table 5 Dark Accent 5"/>
<w:LsdException Locked="false" Priority="51" Name="List Table 6 Colorful Accent 5"/>
<w:LsdException Locked="false" Priority="52" Name="List Table 7 Colorful Accent 5"/>
<w:LsdException Locked="false" Priority="46" Name="List Table 1 Light Accent 6"/>
<w:LsdException Locked="false" Priority="47" Name="List Table 2 Accent 6"/>
<w:LsdException Locked="false" Priority="48" Name="List Table 3 Accent 6"/>
<w:LsdException Locked="false" Priority="49" Name="List Table 4 Accent 6"/>
<w:LsdException Locked="false" Priority="50" Name="List Table 5 Dark Accent 6"/>
<w:LsdException Locked="false" Priority="51" Name="List Table 6 Colorful Accent 6"/>
<w:LsdException Locked="false" Priority="52" Name="List Table 7 Colorful Accent 6"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Mention"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Smart Hyperlink"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Hashtag"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Unresolved Mention"/>
<w:LsdException Locked="false" SemiHidden="true" UnhideWhenUsed="true" Name="Smart Link"/>
</w:LatentStyles>
</xml><![endif]--><style><!--
/* Font Definitions */
@font-face
        {font-family:"Cambria Math";
        panose-1:2 4 5 3 5 4 6 3 2 4;
        mso-font-charset:0;
        mso-generic-font-family:roman;
        mso-font-pitch:variable;
        mso-font-signature:-536869121 1107305727 33554432 0 415 0;}
@font-face
        {font-family:Calibri;
        panose-1:2 15 5 2 2 2 4 3 2 4;
        mso-font-charset:0;
        mso-generic-font-family:swiss;
        mso-font-pitch:variable;
        mso-font-signature:-469750017 -1073732485 9 0 511 0;}
/* Style Definitions */
p.MsoNormal, li.MsoNormal, div.MsoNormal
        {mso-style-unhide:no;
        mso-style-qformat:yes;
        mso-style-parent:"";
        margin:0cm;
        mso-pagination:widow-orphan;
        font-size:11.0pt;
        font-family:"Calibri",sans-serif;
        mso-ascii-font-family:Calibri;
        mso-ascii-theme-font:minor-latin;
        mso-fareast-font-family:Calibri;
        mso-fareast-theme-font:minor-latin;
        mso-hansi-font-family:Calibri;
        mso-hansi-theme-font:minor-latin;
        mso-bidi-font-family:"Aptos (Body)";
        mso-bidi-theme-font:minor-bidi;
        mso-font-kerning:1.0pt;
        mso-ligatures:standardcontextual;
        mso-ansi-language:EN-GB;
        mso-fareast-language:EN-US;}
a:link, span.MsoHyperlink
        {mso-style-noshow:yes;
        mso-style-priority:99;
        color:#0563C1;
        mso-themecolor:hyperlink;
        text-decoration:underline;
        text-underline:single;}
a:visited, span.MsoHyperlinkFollowed
        {mso-style-noshow:yes;
        mso-style-priority:99;
        color:#954F72;
        mso-themecolor:followedhyperlink;
        text-decoration:underline;
        text-underline:single;}
span.EmailStyle17
        {mso-style-type:personal-compose;
        mso-style-noshow:yes;
        mso-style-unhide:no;
        mso-ansi-font-size:11.0pt;
        mso-bidi-font-size:11.0pt;
        font-family:"Calibri",sans-serif;
        mso-ascii-font-family:Calibri;
        mso-ascii-theme-font:minor-latin;
        mso-fareast-font-family:Calibri;
        mso-fareast-theme-font:minor-latin;
        mso-hansi-font-family:Calibri;
        mso-hansi-theme-font:minor-latin;
        mso-bidi-font-family:"Aptos (Body)";
        mso-bidi-theme-font:minor-bidi;
        color:windowtext;}
.MsoChpDefault
        {mso-style-type:export-only;
        mso-default-props:yes;
        font-family:"Calibri",sans-serif;
        mso-ascii-font-family:Calibri;
        mso-ascii-theme-font:minor-latin;
        mso-fareast-font-family:Calibri;
        mso-fareast-theme-font:minor-latin;
        mso-hansi-font-family:Calibri;
        mso-hansi-theme-font:minor-latin;
        mso-bidi-font-family:"Aptos (Body)";
        mso-bidi-theme-font:minor-bidi;
        mso-ansi-language:EN-GB;
        mso-fareast-language:EN-US;}
@page WordSection1
        {size:612.0pt 792.0pt;
        margin:72.0pt 72.0pt 72.0pt 72.0pt;
        mso-header-margin:36.0pt;
        mso-footer-margin:36.0pt;
        mso-paper-source:0;}
div.WordSection1
        {page:WordSection1;}
--></style><!--[if gte mso 10]><style>/* Style Definitions */
table.MsoNormalTable
        {mso-style-name:"Table Normal";
        mso-tstyle-rowband-size:0;
        mso-tstyle-colband-size:0;
        mso-style-noshow:yes;
        mso-style-priority:99;
        mso-style-parent:"";
        mso-padding-alt:0cm 5.4pt 0cm 5.4pt;
        mso-para-margin:0cm;
        mso-pagination:widow-orphan;
        font-size:11.0pt;
        font-family:"Calibri",sans-serif;
        mso-ascii-font-family:Calibri;
        mso-ascii-theme-font:minor-latin;
        mso-hansi-font-family:Calibri;
        mso-hansi-theme-font:minor-latin;
        mso-bidi-font-family:"Aptos (Body)";
        mso-bidi-theme-font:minor-bidi;
        mso-font-kerning:1.0pt;
        mso-ligatures:standardcontextual;
        mso-ansi-language:EN-GB;
        mso-fareast-language:EN-US;}
</style><![endif]--></head><body lang=EN-AU link="#0563C1" vlink="#954F72" style='tab-interval:36.0pt;word-wrap:break-word'><p></p><div class=WordSection1><p class=MsoNormal><span lang=EN-GB></span></p><p class=MsoNormal><span lang=EN-GB></span></p><p class=MsoNormal><a name="_MailAutoSig"><span lang=EN-GB style='mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>Regards,<span style='mso-font-kerning:0pt;mso-ligatures:none'><o:p></o:p></span></span></a></p><p class=MsoNormal><span 
style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>Administration<o:p></o:p></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-fareast-language:EN-AU;mso-no-proof:yes'>Maintenance Division<o:p></o:p></span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:12.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>P </span></b></span><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>(02) 9737 8808&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b><o:p></o:p></b></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>E</span></b></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></b></span><span style='mso-bookmark:_MailAutoSig'></span><a href="mailto:maintenance@aurify.com.au"><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;mso-bidi-font-family:Calibri;color:black;mso-themecolor:text1;mso-fareast-language:EN-AU;mso-no-proof:yes'>maintenance@aurify.com.au</span></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> //</span></b></span><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>W</span></b></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Times 
New Roman";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></b></span>
<span style='mso-bookmark:_MailAutoSig'></span><a href="http://www.aurify.com.au/"><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;mso-bidi-font-family:Calibri;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>www.aurify.com.au</span></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p></o:p></span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>A</span></b></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></b></span><span style='mso-bookmark:_MailAutoSig'></span><a href="https://g.page/aurifyconstructions?share"><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;mso-bidi-font-family:Calibri;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>Unit 12/6 Chaplin Drive, Lane Cove West, NSW 2066</span></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> <o:p></o:p></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></b></span></p><table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 style='border-collapse:collapse;mso-yfti-tbllook:1184;mso-padding-alt:0cm 0cm 0cm 0cm'><tr style='mso-yfti-irow:0;mso-yfti-firstrow:yes;mso-yfti-lastrow:yes'><td width=312 valign=top style='width:233.75pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'></span><a href="http://www.aurify.com.au/"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:12.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
<img data-imagetype="AttachmentByCid" border=0 width=277 height=84 src="cid:image001.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:12.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp;</span></b></span></p></td><span style='mso-bookmark:_MailAutoSig'></span><td width=104 style='width:77.7pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'></span><a href="https://www.facebook.com/AurifyAu/"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
<img data-imagetype="AttachmentByCid" border=0 width=30 height=30  src="cid:image002.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp;</span></b></span><a href="https://www.instagram.com/aurify__/"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
<img data-imagetype="AttachmentByCid" border=0 width=30 height=30  src="cid:image003.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp;</span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'></span><a href="https://www.linkedin.com/company/aurifyau"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
<img data-imagetype="AttachmentByCid" border=0 width=30 height=30  src="cid:image004.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp;</span></b></span><a href="https://twitter.com/Aurify__"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
<img data-imagetype="AttachmentByCid" border=0 width=30 height=30  src="cid:image005.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp;</span></b></span><span style='mso-bookmark:_MailAutoSig'><span style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p></o:p></span></span></p></td><span style='mso-bookmark:_MailAutoSig'></span></tr></table><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#4D4D4F;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></i></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>The information transmitted by this email is intended only for the person or entity to which it is addressed. This email may contain proprietary, business-confidential, and/or privileged material. <o:p></o:p></span></i></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Times 
New Roman";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>If you are not the intended recipient of this message, be aware that any use, review, retransmission, distribution, reproduction, or any action taken in reliance upon this message is strictly prohibited. <o:p></o:p></span></i></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>If you received this in error, please contact the sender and delete the material from all computers.<o:p></o:p></span></i></span></p><span style='mso-bookmark:_MailAutoSig'></span><p class=MsoNormal><span lang=EN-GB><o:p>&nbsp;</o:p></span></p></div></body></html>"""