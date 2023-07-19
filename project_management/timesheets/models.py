from django.db import models

# Create your models here.
class Employee(models.Model):
    PAY_BASIS_CHOICES = [("Salary", "Salary"), ("Hourly", "Hourly")]

    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=38, unique=True)
    name = models.CharField(max_length=32)
    pay_basis = models.CharField(max_length=6, default="Salary", choices=PAY_BASIS_CHOICES)
    isActive = models.BooleanField(default=True)

class Timesheet(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT)
    start_date = models.DateField()
    end_date = models.DateField()
    myob_uid = models.CharField(max_length=38, null=True)
    sent_to_myob = models.BooleanField(default=False)

class PayrollCategory(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    myob_uid = models.CharField(max_length=38, unique=True)
    name = models.CharField(max_length=255)

    # pr_type = models.CharField(max_length=255, choices=PAYROLL_TYPES, default="wage")
    # PAYROLL_TYPES = [
    #     ("wage", "Wage"),
    #     ("entitlement", "Entitlement"),
    #     ("deduction", "Deduction"),
    #     ("expense", "Expense"),
    #     ("superannuation", "Superannuation"),
    #     ("tax", "Tax"),
    #     ("taxtable", "Tax Table"),
    # ]

class WorkDay(models.Model):
    WORK_TYPE_CHOICES = [
        ("Normal", "Normal"),
        ("SICK", "Sick Leave"),
        ("AL", "Annual Leave"),
        ("PH", "Public Holiday"),
        ("LWP", "Leave Without Pay"),
        ("", "No Hours")
    ]

    id = models.AutoField(primary_key=True, unique=True)
    timesheet = models.ForeignKey(Timesheet, on_delete=models.PROTECT)
    date = models.DateField()
    hours = models.DecimalField(max_digits=4, default=0.00, decimal_places=2)
    work_type = models.CharField(max_length=32)
    job = models.CharField(max_length=32, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    allow_overtime = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.pk:
            if self.timesheet.employee.pay_basis == "Hourly":
                # Dont allow it by default for other days
                if self.work_type == "Normal":
                    self.allow_overtime = True

        super(WorkDay, self).save(*args, **kwargs)