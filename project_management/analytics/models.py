from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from datetime import datetime

# Create your models here.
class Sync(models.Model):
    MODEL_CHOICES = [
        ('ACC', 'Account'),
        ('TRA', 'Transaction'),
    ]

    id = models.AutoField(primary_key=True, unique=True)
    sync_type = models.CharField(max_length=3, choices=MODEL_CHOICES)
    sync_date_time = models.DateTimeField(default=datetime.now())


class Account(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=36, blank=True)
    display_id = models.CharField(max_length=12)
    name = models.CharField(max_length=60, blank=True, null=True)
    level = models.IntegerField()
    current_balance = models.DecimalField(max_digits=13, default='0.00', decimal_places=2)


class Transaction(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=36, blank=True)
    display_id = models.CharField(max_length=12)
    description = models.CharField(max_length=255, blank=True, null=True)
    journal_type = models.CharField(max_length=255, blank=True, null=True)
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=13, default='0.00', decimal_places=2)
    is_credit = models.BooleanField()
    job_uid = models.CharField(max_length=36, blank=True)
    job_number = models.CharField(max_length=30, blank=True)
    source_transaction_type = models.CharField(max_length=30, blank=True)
    date_occurred = models.DateField()

