# Generated by Django 4.0 on 2023-01-07 05:14

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_bill_jobbill'),
    ]

    operations = [
        migrations.AddField(
            model_name='bill',
            name='job',
            field=models.ForeignKey(default='', on_delete=django.db.models.deletion.PROTECT, to='api.job'),
            preserve_default=False,
        ),
        migrations.DeleteModel(
            name='JobBill',
        ),
    ]