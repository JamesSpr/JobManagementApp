# Generated by Django 4.0 on 2023-07-19 03:48

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timesheets', '0012_rename_type_payrollcategory_pr_type'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='payrollcategory',
            name='pr_type',
        ),
    ]
