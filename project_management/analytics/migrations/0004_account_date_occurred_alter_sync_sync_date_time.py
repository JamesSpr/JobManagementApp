# Generated by Django 4.0 on 2023-03-21 19:56

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0003_sync'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='date_occurred',
            field=models.DateField(default=datetime.date(2023, 3, 22)),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='sync',
            name='sync_date_time',
            field=models.DateTimeField(default=datetime.datetime(2023, 3, 22, 6, 56, 29, 221142)),
        ),
    ]
