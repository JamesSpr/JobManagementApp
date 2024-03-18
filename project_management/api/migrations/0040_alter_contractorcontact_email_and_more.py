# Generated by Django 4.0 on 2024-03-18 06:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0039_alter_invoicesetting_client'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contractorcontact',
            name='email',
            field=models.EmailField(max_length=80, null=True),
        ),
        migrations.AlterField(
            model_name='contractorcontact',
            name='fax',
            field=models.CharField(max_length=12, null=True),
        ),
        migrations.AlterField(
            model_name='contractorcontact',
            name='phone1',
            field=models.CharField(max_length=12, null=True),
        ),
        migrations.AlterField(
            model_name='contractorcontact',
            name='phone2',
            field=models.CharField(max_length=12, null=True),
        ),
        migrations.AlterField(
            model_name='contractorcontact',
            name='phone3',
            field=models.CharField(max_length=12, null=True),
        ),
        migrations.AlterField(
            model_name='contractorcontact',
            name='website',
            field=models.EmailField(max_length=80, null=True),
        ),
    ]
