# Generated by Django 4.0 on 2023-07-18 01:51

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timesheets', '0008_workday_overtime'),
    ]

    operations = [
        migrations.RenameField(
            model_name='workday',
            old_name='overtime',
            new_name='allow_overtime',
        ),
    ]
