# Generated by Django 4.0 on 2023-04-17 03:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_alter_clientcontact_region_alter_job_stage'),
    ]

    operations = [
        migrations.AddField(
            model_name='estimate',
            name='scope',
            field=models.TextField(blank=True, max_length=500),
        ),
    ]