# Generated by Django 4.0 on 2023-03-21 10:18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='source_transaction_type',
            field=models.CharField(blank=True, max_length=30),
        ),
    ]