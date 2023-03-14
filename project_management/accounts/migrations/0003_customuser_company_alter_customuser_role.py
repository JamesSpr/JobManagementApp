# Generated by Django 4.0 on 2022-07-29 06:11

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_company_customuser_signature_alter_customuser_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='company',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.RESTRICT, to='accounts.company'),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(choices=[('GUS', 'General User'), ('SMU', 'Site Manager'), ('PMU', 'Project Manager'), ('EST', 'Estimator'), ('ADM', 'Administrator'), ('DEV', 'Developer')], default='GUS', max_length=3),
        ),
    ]