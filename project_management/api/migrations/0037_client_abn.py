# Generated by Django 4.0 on 2024-02-28 22:18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0036_expense_process_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='abn',
            field=models.CharField(default='', max_length=16),
            preserve_default=False,
        ),
    ]
