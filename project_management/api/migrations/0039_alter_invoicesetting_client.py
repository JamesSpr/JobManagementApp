# Generated by Django 4.0 on 2024-03-07 23:42

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0038_invoicesetting'),
    ]

    operations = [
        migrations.AlterField(
            model_name='invoicesetting',
            name='client',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.client'),
        ),
    ]