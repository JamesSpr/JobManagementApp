# Generated by Django 4.0 on 2022-08-05 00:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_job_cancel_reason_job_cancelled_alter_job_bsafe_link_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='work_type',
            field=models.CharField(choices=[('RM', 'Reactive Maintenance'), ('PRO', 'Project')], default=1, max_length=3),
            preserve_default=False,
        ),
    ]