# Generated by Django 4.0 on 2023-11-02 04:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_remittanceadvice_amount'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='other_id',
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AlterField(
            model_name='job',
            name='po',
            field=models.CharField(max_length=20),
        ),
        migrations.AlterField(
            model_name='job',
            name='sr',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]