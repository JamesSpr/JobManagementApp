# Generated by Django 4.0 on 2024-01-19 03:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_remove_contractorcontact_contact_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractorcontact',
            name='country',
            field=models.CharField(default='Australia', max_length=50),
        ),
    ]
