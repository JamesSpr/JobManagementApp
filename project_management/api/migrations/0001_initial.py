# Generated by Django 4.0 on 2022-07-27 05:22

import api.models
import datetime
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Client',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('name', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='ClientContact',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('title', models.CharField(blank=True, max_length=20)),
                ('first_name', models.CharField(max_length=50)),
                ('last_name', models.CharField(max_length=50)),
                ('position', models.CharField(max_length=50)),
                ('phone', models.CharField(max_length=12)),
                ('email', models.EmailField(max_length=80)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.client')),
            ],
        ),
        migrations.CreateModel(
            name='Contractor',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('name', models.CharField(max_length=100)),
                ('address', models.CharField(max_length=100)),
                ('locality', models.CharField(max_length=50)),
                ('postcode', models.CharField(max_length=4)),
                ('state', models.CharField(choices=[('NSW', 'New South Wales'), ('QLD', 'Queensland'), ('VIC', 'Victoria'), ('TAS', 'Tasmania'), ('WA', 'Western Australia'), ('SA', 'South Australia'), ('ACT', 'Australian Capital Territory'), ('NT', 'Nothern Territory')], default='NSW', max_length=3)),
                ('abn', models.CharField(max_length=11, verbose_name='ABN')),
                ('bank_account_name', models.CharField(max_length=50, verbose_name='Account Name')),
                ('bsb', models.CharField(max_length=6, verbose_name='BSB')),
                ('bank_account_number', models.CharField(max_length=17, verbose_name='Account Number')),
            ],
        ),
        migrations.CreateModel(
            name='Employee',
            fields=[
                ('id', models.CharField(max_length=4, primary_key=True, serialize=False, unique=True)),
                ('first_name', models.CharField(max_length=63, verbose_name='First Name')),
                ('last_name', models.CharField(max_length=63, verbose_name='Last Name')),
                ('role', models.CharField(blank=True, max_length=31)),
                ('is_active', models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name='Estimate',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('name', models.CharField(default='', max_length=20)),
                ('description', models.CharField(default='', max_length=100)),
                ('price', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('issue_date', models.DateField(blank=True, null=True)),
                ('approval_date', models.DateField(blank=True, null=True)),
                ('approved', models.BooleanField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='EstimateHeader',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('description', models.CharField(default='', max_length=50)),
                ('markup', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('gross', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('estimate_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.estimate')),
            ],
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('invoice_number', models.CharField(max_length=20, primary_key=True, serialize=False, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name='Job',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('stage', models.CharField(choices=[('INS', 'Inspection Required'), ('QUO', 'Quote Required'), ('SUB', 'Quote Submitted'), ('APP', 'Quote Approved'), ('UND', 'Works Underway'), ('INV', 'Invoicing'), ('PAY', 'Awaiting Payment'), ('COM', 'Completed'), ('CAN', 'Cancelled'), ('PRO', 'Project')], default='INS', editable=False, max_length=3, verbose_name='Stage')),
                ('po', models.CharField(default='TBC', max_length=10, verbose_name='Purchase Order Number')),
                ('sr', models.CharField(blank=True, max_length=10, verbose_name='Service Request Number')),
                ('other_id', models.CharField(blank=True, max_length=10, verbose_name='Other Identifying Number')),
                ('priority', models.CharField(blank=True, max_length=4)),
                ('building', models.CharField(blank=True, max_length=20)),
                ('detailed_location', models.CharField(blank=True, max_length=50)),
                ('title', models.CharField(blank=True, max_length=50)),
                ('description', models.TextField(blank=True, max_length=255)),
                ('special_instructions', models.TextField(blank=True, max_length=255)),
                ('scope', models.TextField(blank=True, max_length=500)),
                ('poc_name', models.CharField(blank=True, max_length=50)),
                ('poc_phone', models.CharField(blank=True, max_length=50)),
                ('poc_email', models.EmailField(blank=True, max_length=254)),
                ('alt_poc_name', models.CharField(blank=True, max_length=50)),
                ('alt_poc_phone', models.CharField(blank=True, max_length=50)),
                ('alt_poc_email', models.EmailField(blank=True, max_length=254)),
                ('date_issued', models.DateField(blank=True, null=True)),
                ('inspection_date', models.DateField(blank=True, null=True)),
                ('inspection_notes', models.TextField(blank=True, max_length=500)),
                ('commencement_date', models.DateField(blank=True, null=True)),
                ('completion_date', models.DateField(blank=True, null=True)),
                ('total_hours', models.IntegerField(blank=True, default=0)),
                ('work_notes', models.TextField(blank=True, max_length=500)),
                ('close_out_date', models.DateField(blank=True, null=True)),
                ('close_out_reference', models.CharField(blank=True, max_length=10)),
                ('approval_date', models.DateField(blank=True, null=True)),
                ('invoice_date', models.DateField(blank=True, null=True)),
                ('paid_date', models.DateField(blank=True, null=True)),
                ('overdue_date', models.DateField(blank=True, null=True)),
                ('opportunity_type', models.CharField(choices=[('RES', 'Residential'), ('COM', 'Commercial')], default='COM', max_length=3)),
                ('bsafe_link', models.CharField(blank=True, max_length=256, verbose_name='BSAFE Link')),
                ('client', models.ForeignKey(default=api.models.Client.get_default_id, on_delete=django.db.models.deletion.PROTECT, to='api.client')),
                ('inspection_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='inspector', to='api.employee')),
                ('invoice', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='api.invoice')),
            ],
        ),
        migrations.CreateModel(
            name='Location',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('base_id', models.CharField(blank=True, max_length=4, null=True)),
                ('name', models.CharField(max_length=50, verbose_name='Base Name')),
                ('address', models.CharField(max_length=100)),
                ('locality', models.CharField(max_length=50)),
                ('state', models.CharField(choices=[('NSW', 'New South Wales'), ('QLD', 'Queensland'), ('VIC', 'Victoria'), ('TAS', 'Tasmania'), ('WA', 'Western Australia'), ('SA', 'South Australia'), ('ACT', 'Australian Capital Territory'), ('NT', 'Nothern Territory')], default='NSW', max_length=3)),
                ('postcode', models.CharField(default='0000', max_length=4)),
                ('bgis_region', models.CharField(blank=True, choices=[('RIC', 'Richmond Area'), ('SCM', 'Sydney City Metro'), ('FBE', 'Fleet Base East'), ('HOLS', 'Holsworthy Barracks'), ('SMA', 'Singleton Military Area')], max_length=4, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='PurchaseOrder',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('note', models.CharField(max_length=200)),
                ('order_date', models.DateField(default=datetime.date.today)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='api.contractor')),
                ('job_id', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='api.job')),
            ],
        ),
        migrations.CreateModel(
            name='ProgressClaim',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('claim_percentage', models.DecimalField(decimal_places=2, default=0.0, max_digits=5)),
                ('note', models.CharField(max_length=200)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='api.contractor')),
                ('job_id', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='api.job')),
            ],
        ),
        migrations.AddField(
            model_name='job',
            name='location',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='api.location'),
        ),
        migrations.AddField(
            model_name='job',
            name='requester',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='api.clientcontact'),
        ),
        migrations.AddField(
            model_name='job',
            name='site_manager',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='site_manager', to='api.employee'),
        ),
        migrations.CreateModel(
            name='EstimateItem',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, unique=True)),
                ('description', models.CharField(default='', max_length=50)),
                ('quantity', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('item_type', models.CharField(blank=True, choices=[('', ''), ('item', 'Item'), ('quote', 'Quote'), ('quantity', 'Quantity'), ('hours', 'Hours'), ('m', 'Meter'), ('m2', 'Sqauare Meter'), ('m3', 'Cubed Meter'), ('kg', 'Kilogram'), ('tonne', 'Tonne')], default='', max_length=10)),
                ('rate', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('extension', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('markup', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('gross', models.DecimalField(decimal_places=2, default='0.00', max_digits=10)),
                ('header_id', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.estimateheader')),
            ],
        ),
        migrations.AddField(
            model_name='estimate',
            name='job_id',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.job'),
        ),
    ]
