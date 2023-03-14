# Generated by Django 4.0 on 2023-01-07 12:54

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0034_rename_process_date_bill_invoice_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='bill',
            name='process_date',
            field=models.DateField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
