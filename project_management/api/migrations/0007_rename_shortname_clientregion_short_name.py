# Generated by Django 4.0 on 2022-08-02 01:09

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_alter_clientregion_email'),
    ]

    operations = [
        migrations.RenameField(
            model_name='clientregion',
            old_name='shortName',
            new_name='short_name',
        ),
    ]
