# Generated by Django 4.0 on 2023-01-19 05:56

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0035_bill_process_date'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bill',
            name='invoice_date',
            field=models.DateField(),
        ),
        migrations.AlterField(
            model_name='bill',
            name='process_date',
            field=models.DateField(default=datetime.date.today),
        ),
    ]
