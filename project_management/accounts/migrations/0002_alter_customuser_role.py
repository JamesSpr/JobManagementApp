# Generated by Django 4.0 on 2024-01-19 00:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(choices=[('GUS', 'General User'), ('SMU', 'Site Manager'), ('PMU', 'Project Manager'), ('EST', 'Estimator'), ('ADM', 'Administrator'), ('DEV', 'Developer')], default='GUS', max_length=3),
        ),
    ]
