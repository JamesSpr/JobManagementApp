# Generated by Django 4.0 on 2023-07-13 04:35

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('timesheets', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timesheet',
            name='employee',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='timesheets.employee'),
        ),
    ]
