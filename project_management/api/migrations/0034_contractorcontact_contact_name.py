# Generated by Django 4.0 on 2024-01-24 02:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0033_contractorcontact_country'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractorcontact',
            name='contact_name',
            field=models.CharField(default='', max_length=25),
            preserve_default=False,
        ),
    ]