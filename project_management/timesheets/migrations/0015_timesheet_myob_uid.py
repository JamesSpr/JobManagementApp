# Generated by Django 4.0 on 2023-07-19 07:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timesheets', '0014_alter_payrollcategory_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='timesheet',
            name='myob_uid',
            field=models.CharField(max_length=38, null=True),
        ),
    ]
