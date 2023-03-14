# Generated by Django 4.0 on 2023-01-23 22:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_alter_company_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='myob_access',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='company',
            name='logo',
            field=models.ImageField(null=True, upload_to='company_logos'),
        ),
    ]
