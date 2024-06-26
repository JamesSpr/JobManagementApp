# Generated by Django 4.0 on 2024-03-07 23:41

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0037_client_abn'),
    ]

    operations = [
        migrations.CreateModel(
            name='InvoiceSetting',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('name', models.CharField(max_length=64)),
                ('file_location', models.CharField(max_length=64)),
                ('rule', models.CharField(max_length=128)),
                ('active', models.BooleanField(default=True)),
                ('default', models.BooleanField(default=False)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='api.client')),
            ],
        ),
    ]
