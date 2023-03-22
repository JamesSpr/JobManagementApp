# Generated by Django 4.0 on 2023-03-21 11:25

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0002_transaction_source_transaction_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Sync',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('sync_type', models.CharField(choices=[('ACC', 'Account'), ('TRA', 'Transaction')], max_length=3)),
                ('sync_date_time', models.DateTimeField(default=datetime.datetime(2023, 3, 21, 22, 25, 37, 668993))),
            ],
        ),
    ]