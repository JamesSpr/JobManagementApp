from django.db import models

# Create your models here.
class MyobUser(models.Model):
    id = models.CharField(max_length=36, primary_key=True, unique=True)
    username = models.CharField(max_length=125, blank=True,)
    access_token = models.CharField(max_length=512, blank=True)
    access_expires_at = models.DateTimeField(auto_now_add=True)
    refresh_token = models.CharField(max_length=512, blank=True)

