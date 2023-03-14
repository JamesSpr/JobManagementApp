from django.contrib import admin
from .models import Job, Location, Estimate, EstimateHeader, EstimateItem, Client

# Register your models here.
class JobAdmin(admin.ModelAdmin):
    list_display = '__all__'

class LocationAdmin(admin.ModelAdmin):
    list_display = '__all__'

class EstimateAdmin(admin.ModelAdmin):
    list_display = '__all__'

class EstimateHeaderAdmin(admin.ModelAdmin):
    list_display = '__all__'

class EstimateItemAdmin(admin.ModelAdmin):
    list_display = '__all__'

class ClientAdmin(admin.ModelAdmin):
    list_display = '__all__'

admin.site.register(Job)
admin.site.register(Location)
admin.site.register(Estimate)
admin.site.register(EstimateHeader)
admin.site.register(EstimateItem)
admin.site.register(Client)
