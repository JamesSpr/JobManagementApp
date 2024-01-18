from django.db import models
from django.db.models.deletion import CASCADE, PROTECT, RESTRICT
from accounts.models import CustomUser
import datetime

MAX_ID_SIZE = 20

# CHOICES
# Australian States and Territories
STATE_CHOICES = [
    ('NSW', 'New South Wales'),
    ('QLD', 'Queensland'),
    ('VIC', 'Victoria'),
    ('TAS', 'Tasmania'),
    ('WA', 'Western Australia'),
    ('SA', 'South Australia'),
    ("ACT", 'Australian Capital Territory'),
    ("NT", 'Nothern Territory'),
]

# Estimate Item Type
ESTIMATE_ITEM_TYPE = [
    ('', ''),
    ('quote', 'Quote'),
    ('quantity', 'Quantity'),
    ('item', 'Item'),
    ('hours', 'Hours'),
    ('days', 'Days'),
    ('weeks', 'Weeks'),
    ('m', 'Meter'),
    ('m2', 'Sqauare Meter'),
    ('m3', 'Cubed Meter'),
    ('kg', 'Kilogram'),
    ('tonne', 'Tonne'),
    ('bag', 'Bag'),
]

# MODELS
# Contractor Companies
class Client(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=50, blank=True, null=True)
    myob_uid = models.CharField(max_length=36, blank=True, null=True)

    @classmethod
    def get_default_id(cls):
        client, created = cls.objects.get_or_create(name='BGIS')
        return client.id

    def __str__(self):
        return self.name

class Region(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    client = models.ForeignKey(Client, on_delete=PROTECT)
    short_name = models.CharField(max_length=30, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=80, blank=True, null=True)
    bill_to_address = models.CharField(max_length=256)

    def __str__(self):
        return self.name

# Client Employees/Contacts
class ClientContact(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    position = models.CharField(max_length=50)
    phone = models.CharField(max_length=12)
    email = models.EmailField(max_length=80)
    region = models.ForeignKey(Region, on_delete=PROTECT, null=True)
    client = models.ForeignKey(Client, on_delete=PROTECT)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.first_name + " " + self.last_name

# Site Locations
class Location(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    client_ref = models.CharField(blank=True, null=True, max_length=32)
    name = models.CharField(max_length=64)
    address = models.CharField(max_length=128)
    locality = models.CharField(max_length=64)
    state = models.CharField(max_length=3, choices=STATE_CHOICES, default='NSW')
    postcode = models.CharField(max_length=4, default='0000')
    client = models.ForeignKey(Client, on_delete=PROTECT)
    region = models.ForeignKey(Region, on_delete=PROTECT)

    def __str__(self):
        return self.name

    def getFullAddress(self):
        return self.address.strip() + ", " + self.locality.strip() + " " + self.state.strip() + " " + self.postcode.strip()

# Contractor Companies
class Contractor(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=38, blank=True, null=True)
    name = models.CharField(max_length=200)
    abn = models.CharField(max_length=16)
    bsb = models.CharField(max_length=10)
    bank_account_name = models.CharField(max_length=52)
    bank_account_number = models.CharField(max_length=24)

    def __str__(self):
        return self.name

# Job Details
class Job(models.Model):
    # State Of Job
    JOB_STATE = [
        ('INS', 'Inspection/Quote Required'),
        ('SUB', 'Quote Submitted'),
        ('APP', 'Quote Approved'),
        ('QAR', 'Quote Approval Required'),
        ('UND', 'Works Underway'),
        ('CLO', 'Close Out Required'),
        ('INV', 'Invoicing'),
        ('BSA', 'BSAFE Submission'),
        ('PAY', 'Awaiting Payment'),
        ('FIN', 'Finalised'),
        ('CAN', 'Cancelled'),
        ('PRO', 'Project'),
    ]

    id = models.AutoField(primary_key=True, unique=True)
    
    client = models.ForeignKey(Client, on_delete=models.PROTECT, default=Client.get_default_id)
    requester = models.ForeignKey(ClientContact, on_delete=models.PROTECT, blank=True, null=True,)
    myob_uid = models.CharField(max_length=36, blank=True, null=True)

    stage = models.CharField(max_length=3, default='INS', choices=JOB_STATE, editable=False)
    po = models.CharField(max_length=MAX_ID_SIZE, blank=False)
    sr = models.CharField(max_length=MAX_ID_SIZE, blank=True)
    other_id = models.CharField(max_length=MAX_ID_SIZE*2, blank=True)
    priority = models.CharField(max_length=4, blank=True)
    location = models.ForeignKey(Location, on_delete=models.PROTECT, null=True, blank=True)
    building = models.CharField(max_length=64, blank=True)
    detailed_location = models.CharField(max_length=255, blank=True) 
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(max_length=255, blank=True)
    special_instructions = models.TextField(max_length=255, blank=True)
    scope = models.TextField(max_length=500, blank=True)
    poc_name = models.CharField(max_length=75, blank=True)
    poc_phone = models.CharField(max_length=75, blank=True)
    poc_email = models.EmailField(blank=True)
    alt_poc_name = models.CharField(max_length=75, blank=True)
    alt_poc_phone = models.CharField(max_length=75, blank=True)
    alt_poc_email = models.EmailField(blank=True)
    date_issued = models.DateTimeField(blank=True, null=True)
    inspection_date = models.DateTimeField(blank=True, null=True)
    inspection_by = models.ForeignKey(CustomUser, on_delete=PROTECT, blank=True, null=True, related_name="inspector")
    inspection_notes = models.TextField(max_length=500, blank=True)    
    commencement_date = models.DateTimeField(blank=True, null=True)
    completion_date = models.DateTimeField(blank=True, null=True)
    total_hours = models.DecimalField(blank=True, max_digits=10, decimal_places=2, default=0.0)
    site_manager = models.ForeignKey(CustomUser, on_delete=PROTECT, blank=True, null=True, related_name="site_manager")
    work_notes = models.TextField(blank=True, max_length=500)
    close_out_date = models.DateTimeField(blank=True, null=True)
    close_out_reference = models.CharField(max_length=20, blank=True)
    approval_date = models.DateField(blank=True, null=True)
    overdue_date = models.DateTimeField(blank=True, null=True)
    opportunity_type = models.CharField(default='Commercial', max_length=24)
    bsafe_link = models.CharField(blank=True, max_length=515)
    work_type = models.CharField(max_length=24, default="Reactive Maintenance")
    cancelled = models.BooleanField(default=False)
    cancel_reason = models.CharField(max_length=255, blank=True)

    def __str__(self):
        identifier = self.po

        if self.po == '':
            if "VP" in self.other_id:
                identifier = self.other_id
            elif self.sr != '':
                identifier = self.sr
            elif self.other_id != '':
                identifier = self.other_id
        
        building = self.building + " "
        if not self.building == "" and str(self.building)[0].isdigit():
            building = "B" + self.building + " "
        if self.building == "":
            building = ""

        return str(identifier) + " - " + str(self.location) + " - "  + str(building) + str(self.title)
    
    def save(self, *args, **kwargs):
        self.work_type = "Commercial"
        self.opportunity_type = "Reactive Maintenance"

        if self.cancelled:
            self.stage = "CAN"
        elif self.work_type == "PRO":
            self.stage = "PRO"
        elif Invoice.objects.filter(job=self).exists():
            inv = Invoice.objects.filter(job=self)[0]

            if inv.date_paid:
                self.stage = "FIN"
            elif inv.date_issued:
                self.stage = "PAY"
            else:
                self.stage = 'BSA'
        elif (self.completion_date and self.commencement_date) and not self.close_out_date:
            if Estimate.objects.filter(job_id=self).exclude(approval_date__isnull=False).exists() and not Estimate.objects.filter(job_id=self).exclude(approval_date__isnull=True).exists():
                self.stage= 'QAR'
        elif self.close_out_date:
            self.stage = 'INV'
        elif self.completion_date:
            self.stage = 'CLO'
        elif self.commencement_date:
            self.stage = 'UND'
        elif Estimate.objects.filter(job_id=self).exclude(approval_date=None).exists():
            self.stage = 'APP'
        elif Estimate.objects.filter(job_id=self).exclude(issue_date=None).exists():
            self.stage = 'SUB'
        else:
            self.stage = "INS"
        
        super(Job, self).save(*args, **kwargs)

class RemittanceAdvice(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=36)
    img_uid = models.CharField(max_length=36)
    amount = models.DecimalField(max_digits=13, default='0.00', decimal_places=2)
    date = models.DateField()
    client = models.ForeignKey(Client, on_delete=PROTECT)

# Invoices
class Invoice(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=36, blank=True, null=True)
    job = models.ForeignKey(Job, on_delete=PROTECT, null=True)
    number = models.CharField(max_length=13, blank=True, null=True)
    amount = models.DecimalField(max_digits=13, default='0.00', decimal_places=2)
    date_created = models.DateField(auto_now_add=True)
    date_issued = models.DateField(blank=True, null=True)
    date_paid = models.DateField(blank=True, null=True)
    remittance = models.ForeignKey(RemittanceAdvice, on_delete=PROTECT, null=True)
    
    def __str__(self):
        return "Invoice " + self.number + " for " + str(self.job)

class Bill(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=36, blank=True, null=True)
    job = models.ForeignKey(Job, on_delete=PROTECT)
    supplier = models.ForeignKey(Contractor, on_delete=PROTECT)
    bill_type = models.CharField(max_length=16, default="subcontractor")
    process_date = models.DateField(default=datetime.date.today)
    invoice_date = models.DateField()
    invoice_number = models.CharField(max_length=13, blank=True, null=True)
    amount = models.DecimalField(max_digits=13, default='0.00', decimal_places=2)
    thumbnail_path = models.CharField(max_length=512, blank=True)
    file_path = models.CharField(max_length=512, blank=True)

    def __str__(self):
        return self.supplier.name + " Invoice #" + self.invoice_number + " for " + str(self.job)

class ContractorContact(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    company = models.ForeignKey(Contractor, on_delete=PROTECT)
    contact = models.CharField(max_length=60)
    address = models.CharField(max_length=100)
    locality = models.CharField(max_length=50)
    state = models.CharField(max_length=3, choices=STATE_CHOICES, default='NSW')
    postcode = models.CharField(max_length=4)
    phone1 = models.CharField(max_length=12)
    phone2 = models.CharField(max_length=12)
    phone3 = models.CharField(max_length=12)
    fax = models.CharField(max_length=12)
    email = models.EmailField(max_length=80)
    website = models.EmailField(max_length=80)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.contact

# Progress Claims
class ProgressClaim(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    job_id = models.ForeignKey(Job, on_delete=PROTECT) # Do not allow a job to be deleted if there is a progress claim attached to it
    client = models.ForeignKey(Contractor, on_delete=PROTECT)
    claim_percentage = models.DecimalField(max_digits=5, default=0.00, decimal_places=2)
    note = models.CharField(max_length=200)
    myob_uid = models.CharField(max_length=36, blank=True, null=True)

# Purchase Orders
class PurchaseOrder(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    job_id = models.ForeignKey(Job, on_delete=PROTECT) # Do not allow a job to be deleted if there is a progress claim attached to it
    client = models.ForeignKey(Contractor, on_delete=PROTECT)
    note = models.CharField(max_length=200)
    order_date = models.DateField(default=datetime.date.today)
    myob_uid = models.CharField(max_length=36, blank=True, null=True)

# Estimate
class Estimate(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    job_id = models.ForeignKey(Job, on_delete=CASCADE)
    name = models.CharField(max_length=50, default='') 
    description = models.CharField(max_length=100, default='')
    price = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)
    quote_by = models.ForeignKey(CustomUser, on_delete=PROTECT)
    issue_date = models.DateField(blank=True, null=True)
    approval_date = models.DateField(blank=True, null=True)
    scope = models.TextField(max_length=500, blank=True)

    def __str__(self):
        return str(self.job_id) + " : " + self.name
        
# Estimate Header Item
class EstimateHeader(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    estimate_id = models.ForeignKey(Estimate, on_delete=CASCADE)
    description = models.CharField(max_length=255, default='')
    markup = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)
    gross = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)

    def __str__(self):
        return str(self.estimate_id) + " : " + self.description 

# Estimate Line Item
class EstimateItem(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    header_id = models.ForeignKey(EstimateHeader, on_delete=CASCADE)
    description = models.CharField(max_length=50, default='')
    quantity = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)
    item_type = models.CharField(max_length=10, choices=ESTIMATE_ITEM_TYPE, default='', blank=True) 
    rate = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)
    extension = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)
    markup = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)
    gross = models.DecimalField(max_digits=10, default='0.00', decimal_places=2)

    def __str__(self):
        return str(self.header_id) + " - " + self.description


class Insurance(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    description = models.CharField(max_length=80)
    issue_date = models.DateField()
    start_date = models.DateField()
    expiry_date = models.DateField()
    active = models.BooleanField(default=True)
    filename = models.CharField(max_length=255)
    thumbnail = models.CharField(max_length=64)
