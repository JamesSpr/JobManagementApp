# Generated by Django 4.0 on 2023-04-20 02:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_estimate_scope'),
    ]

    operations = [
        migrations.CreateModel(
            name='Insurance',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('description', models.CharField(max_length=80)),
                ('start_date', models.DateField()),
                ('expiry_date', models.DateField()),
                ('active', models.BooleanField(default=True)),
                ('filename', models.CharField(max_length=255)),
                ('thumbnail', models.CharField(max_length=64)),
            ],
        ),
    ]
