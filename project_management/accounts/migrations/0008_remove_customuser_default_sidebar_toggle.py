# Generated by Django 4.0 on 2022-08-03 09:37

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_customuser_default_pagination_amount_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='default_sidebar_toggle',
        ),
    ]