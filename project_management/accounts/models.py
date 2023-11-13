from tkinter import CASCADE
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class MyAccountManager(BaseUserManager):
    def create_user(self, email, password=None):
        if not email:
            raise ValueError("Users must have an email address")

        if '@aurify.com.au' in email:
            user.company = Company.objects.get(id="1")

        user = self.model(
            email=self.normalize_email(email),
        )

        user.username = user.email
        user.role = 'GUS'
        user.company = Company.objects.get(name="Aurify")
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password):
        user = self.create_user(
            email=self.normalize_email(email),
        )

        if '@aurify.com.au' in email:
            user.company = Company.objects.get(id="1")
        
        user.username = user.email
        user.role = 'DEV'
        user.company = Company.objects.get(name="Aurify")
        user.set_password(password)
        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)

        return user

class Company(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    name = models.CharField(max_length=63, verbose_name="Company Name")
    logo_path = models.CharField(max_length=255, blank=True)
    myob_account = models.ForeignKey('myob.MyobUser', on_delete=models.PROTECT, null=True)

class CustomUser(AbstractBaseUser):
    USER_ROLES = [
        ('GUS', 'General User'),
        ('SMU', 'Site Manager'),
        ('PMU', 'Project Manager'),
        ('EST', 'Estimator'),
        ('ADM', 'Administrator'),
        ('DEV', 'Developer'),
    ]

    email = models.EmailField(blank=False, unique=True, max_length=255, verbose_name="email")
    username = models.CharField(blank=True, max_length=255)
    first_name = models.CharField(blank=True, max_length=63)
    last_name = models.CharField(blank=True, max_length=63)
    phone = models.CharField(blank=True, max_length=12)
    position = models.CharField(blank=True, max_length=31) 
    role = models.CharField(default='GUS', choices=USER_ROLES, max_length=3) 
    profile_icon = models.ImageField(null=True)
    signature = models.ImageField(null=True)
    company = models.ForeignKey(Company, on_delete=models.RESTRICT, null=True)
    refresh_token = models.CharField(max_length=1023, blank=True)
    myob_user = models.ForeignKey('myob.MyobUser', on_delete=models.PROTECT, null=True)
    date_joined = models.DateTimeField(verbose_name="Date joined", auto_now_add=True)
    last_login = models.DateTimeField(verbose_name="Last login", auto_now=True)
    is_active = models.BooleanField(default=True)
    myob_access = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    #Preferences
    default_pagination_amount = models.IntegerField(default=30)

    objects = MyAccountManager()
    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    
    def has_perm(self, perm, obj=None):
        return self.is_admin
        
    def has_module_perms(self, app_label):
        return self.is_admin

    @classmethod
    def safe_get_by_id(self, id):
        try:
            return self.objects.get(id=id)
        except self.DoesNotExist:
            return None
