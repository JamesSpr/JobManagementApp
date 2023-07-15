from django.db import models

# Create your models here.
class Employee(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=38, unique=True)
    name = models.CharField(max_length=32)

class Timesheet(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT)
    start_date = models.DateField()
    end_date = models.DateField()
    sent_to_myob = models.BooleanField(default=False)

class WorkDay(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    timesheet = models.ForeignKey(Timesheet, on_delete=models.PROTECT)
    date = models.DateField()
    hours = models.DecimalField(max_digits=4, default=0.00, decimal_places=2)
    work_type = models.CharField(max_length=32)
    job = models.CharField(max_length=32, blank=True)
    notes = models.CharField(max_length=255, blank=True)