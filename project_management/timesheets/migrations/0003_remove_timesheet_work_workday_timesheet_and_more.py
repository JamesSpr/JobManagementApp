# Generated by Django 4.0 on 2023-07-13 04:38

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('timesheets', '0002_alter_timesheet_employee'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='timesheet',
            name='work',
        ),
        migrations.AddField(
            model_name='workday',
            name='timesheet',
            field=models.ForeignKey(default='', on_delete=django.db.models.deletion.PROTECT, to='timesheets.timesheet'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='workday',
            name='id',
            field=models.AutoField(primary_key=True, serialize=False, unique=True),
        ),
    ]