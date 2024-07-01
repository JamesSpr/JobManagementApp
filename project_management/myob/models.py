from django.db import models

# Create your models here.
class MyobUser(models.Model):
    id = models.CharField(max_length=36, primary_key=True, unique=True)
    username = models.CharField(max_length=125, blank=True,)
    access_token = models.CharField(max_length=2048, blank=True)
    access_expires_at = models.DateTimeField(auto_now_add=True)
    refresh_token = models.CharField(max_length=2048, blank=True)

class CompanyFile(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    company_name = models.CharField(max_length=36, blank=False, unique=True)
    file_id = models.CharField(max_length=36, unique=True, blank=False, null=False)