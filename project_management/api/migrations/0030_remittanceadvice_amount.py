# Generated by Django 4.0 on 2023-10-17 10:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0029_remittanceadvice_img_uid'),
    ]

    operations = [
        migrations.AddField(
            model_name='remittanceadvice',
            name='amount',
            field=models.DecimalField(decimal_places=2, default='0.00', max_digits=13),
        ),
    ]
