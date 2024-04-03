
from exchangelib import OAUTH2, OAuth2Credentials, Identity, Account, DELEGATE, Configuration, Message, HTMLBody, FileAttachment, Folder
from exchangelib.items import (
    MeetingRequest,
    MeetingCancellation,
    SEND_TO_NONE,
    SEND_TO_ALL_AND_SAVE_COPY,
)
import os

from typing import List
from enum import Enum
import environ

EMAIL_STYLE = """<body style="font-size:11pt; font-family:'Aptos (Body)'; color: rgb(0,0,0)">"""

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

        credentials = OAuth2Credentials(
            client_id=env('EMAIL_CLIENT_ID'),
            client_secret=env('EMAIL_CLIENT_SECRET'),
            tenant_id=env('EMAIL_TENANT_ID'),
            identity=Identity(primary_smtp_address=env('HR_EMAIL'))
        )
        config = Configuration(server=env('EMAIL_SERVER'), credentials=credentials, auth_type=OAUTH2)
        self.account = Account(
            primary_smtp_address=env('HR_EMAIL'),
            config=config,
            autodiscover=False,
            access_type=DELEGATE,
        )

    def send_email(self, to: List[str], cc: List[str], bcc: List[str], subject: str, body: str, attachments: List[FileAttachment], importance: Importance = Importance.NORMAL):        
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
            bcc_recipients=bcc,
            subject=subject,
            importance=importance.value,
            body=HTMLBody(f"{EMAIL_STYLE}{body}</p>{html_signature}</body>"),
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
            with open(f"{os.path.dirname(os.path.realpath(__file__))}\email_resources\{img.split('@')[0]}", "rb") as f:
                img_attachment = FileAttachment(name=img, content=f.read(), is_inline=True, content_id=img)
            m.attach(img_attachment)

        m.send_and_save()

    def reply(self, email, subject, body):
        reply = email.create_reply(subject, HTMLBody(f"{EMAIL_STYLE}{body}</p>{html_signature}</body>"))
        saved_reply = reply.save(self.account.drafts)

        msg = self.account.inbox.get(id=saved_reply.id)

        # Attach Signature Images to reply
        signature_images = [
            'image001.png',
            'image002.png',
            'image003.png',
            'image004.png',
            'image005.png'
        ]
        for img in signature_images:
            with open(f"{os.path.dirname(os.path.realpath(__file__))}\email_resources\{img.split('@')[0]}", "rb") as f:
                img_attachment = FileAttachment(name=img, content=f.read(), is_inline=True, content_id=img)

            msg.attach(img_attachment)

        msg.send_and_save()
    
    def get_timesheet_folder(self):
        if self.account is None:
            raise RuntimeError("Email account not connected")
        
        self.account.root.refresh()

        for x in self.account.inbox.children:
            if x.name == "Timesheets":
                return x
            
        new_folder = Folder(parent=self.account.inbox, name="Timesheets")
        new_folder.save()

        return new_folder
    
html_signature =  """<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" xmlns="http://www.w3.org/TR/REC-html40"><head><meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15"><meta name=Originator content="Microsoft Word 15"><link rel=File-List href="cid:filelist.xml"><link rel=Edit-Time-Data href="cid:editdata.mso"><!--[if !mso]><style>v\:* {behavior:url(#default#VML);}
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
        style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>HR<o:p></o:p></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-fareast-language:EN-AU;mso-no-proof:yes'>Automated Email<o:p></o:p></span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:12.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>P </span></b></span><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>(02) 9737 8808&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b><o:p></o:p></b></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>E</span></b></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></b></span><span style='mso-bookmark:_MailAutoSig'></span><a href="mailto:HR@aurify.com.au"><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;mso-bidi-font-family:Calibri;color:black;mso-themecolor:text1;mso-fareast-language:EN-AU;mso-no-proof:yes'>HR@aurify.com.au</span></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> //</span></b></span><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>W</span></b></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></b></span><span style='mso-bookmark:_MailAutoSig'></span><a href="http://www.aurify.com.au/"><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;mso-bidi-font-family:Calibri;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>www.aurify.com.au</span></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p></o:p></span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>A</span></b></span><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> </span></b></span><span style='mso-bookmark:_MailAutoSig'></span><a href="https://g.page/aurifyconstructions?share"><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;mso-bidi-font-family:Calibri;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>Unit 12/6 Chaplin Drive, Lane Cove West, NSW 2066</span></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><span lang=EN-GB style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'> <o:p></o:p></span></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><b><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></b></span></p><table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 style='border-collapse:collapse;mso-yfti-tbllook:1184;mso-padding-alt:0cm 0cm 0cm 0cm'><tr style='mso-yfti-irow:0;mso-yfti-firstrow:yes;mso-yfti-lastrow:yes'><td width=312 valign=top style='width:233.75pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'></span><a href="http://www.aurify.com.au/"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:12.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
        <img data-imagetype="AttachmentByCid" border=0 width=277 height=84 src="cid:image001.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:12.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p></o:p></span></b></span></p></td><span style='mso-bookmark:_MailAutoSig'></span><td width=104 style='width:77.7pt;padding:0cm 5.4pt 0cm 5.4pt'><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'></span><a href="https://www.facebook.com/AurifyAu/"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
        <img data-imagetype="AttachmentByCid" border=0 width=30 height=30 src="cid:image002.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp; </span></b></span><a href="https://www.instagram.com/aurify__/"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
        <img data-imagetype="AttachmentByCid" border=0 width=30 height=30 src="cid:image003.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p></o:p></span></b></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'></span><a href="https://www.linkedin.com/company/aurifyau"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
        <img data-imagetype="AttachmentByCid" border=0 width=30 height=30 src="cid:image004.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp;&nbsp;</span></b></span><a href="https://twitter.com/Aurify__"><span style='mso-bookmark:_MailAutoSig'><b style='mso-bidi-font-weight:normal'><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:blue;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes;text-decoration:none;text-underline:none'>
        <img data-imagetype="AttachmentByCid" border=0 width=30 height=30 src="cid:image005.png"></span></b></span><span style='mso-bookmark:_MailAutoSig'></span></a><span style='mso-bookmark:_MailAutoSig'><b><span style='font-size:20.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#38D430;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'>&nbsp;</span></b></span><span style='mso-bookmark:_MailAutoSig'><span style='font-size:10.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-ansi-language:EN-AU;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p></o:p></span></span></p></td><span style='mso-bookmark:_MailAutoSig'></span></tr></table><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i>
        <span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:#4D4D4F;mso-fareast-language:EN-AU;mso-no-proof:yes'><o:p>&nbsp;</o:p></span></i></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>The information transmitted by this email is intended only for the person or entity to which it is addressed. This email may contain proprietary, business-confidential, and/or privileged material. <o:p></o:p></span></i></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>If you are not the intended recipient of this message, be aware that any use, review, retransmission, distribution, reproduction, or any action taken in reliance upon this message is strictly prohibited. <o:p></o:p></span></i></span></p><p class=MsoNormal><span style='mso-bookmark:_MailAutoSig'><i><span lang=EN-GB style='font-size:9.0pt;mso-fareast-font-family:"Aptos (Body)";mso-fareast-theme-font:minor-fareast;color:black;mso-fareast-language:EN-AU;mso-no-proof:yes'>If you received this in error, please contact the sender and delete the material from all computers.<o:p></o:p></span></i></span></p><span style='mso-bookmark:_MailAutoSig'></span><p class=MsoNormal><span lang=EN-GB><o:p>&nbsp;</o:p></span></p></div></body></html>"""
