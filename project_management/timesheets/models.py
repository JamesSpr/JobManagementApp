from django.db import models

# Create your models here.
class WorkDay(models.Model):
    date = models.DateField()
    hours = models.DecimalField(max_digits=4, default=0.00, decimal_places=2)
    work_type = models.CharField(max_length=32)
    job = models.CharField(max_length=32, blank=True)
    notes = models.CharField(max_length=255, blank=True)

class Timesheet(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    employee = models.CharField(max_length=128)
    work = models.ForeignKey(WorkDay, on_delete=models.PROTECT)
    start_date = models.DateField()
    end_date = models.DateField()

class Employee(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=38, unique=True)
    name = models.CharField(max_length=32)