# Generated by Django 4.0 on 2022-08-02 01:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_alter_clientregion_email'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clientregion',
            name='email',
            field=models.EmailField(blank=True, max_length=80, null=True),
        ),
    ]
