# Generated by Django 4.0 on 2023-03-16 02:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_alter_job_alt_poc_name_alter_job_alt_poc_phone_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='building',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AlterField(
            model_name='job',
            name='work_type',
            field=models.CharField(default='Reactive Maintenance', max_length=24),
        ),
    ]