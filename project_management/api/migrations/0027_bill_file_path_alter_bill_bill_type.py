# Generated by Django 4.0 on 2023-10-07 00:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_remove_bill_img_path_bill_bill_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='bill',
            name='file_path',
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AlterField(
            model_name='bill',
            name='bill_type',
            field=models.CharField(default='subcontractor', max_length=16),
        ),
    ]
