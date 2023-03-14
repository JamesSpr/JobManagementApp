from rest_framework import serializers
from .models import Job, Location, EstimateHeader, EstimateItem, Contractor

# Jobs
class JobSerializer(serializers.ModelSerializer):
    location = serializers.SlugRelatedField(read_only=True, slug_field='name')
    date_issued = serializers.DateField(format="%d/%m/%Y")
    overdue_date = serializers.DateField(format="%d/%m/%Y")

    class Meta:
        model = Job
        fields = '__all__'
                  
class CreateJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ('po', 'sr', 'rfq', 'location', 'building', 'title', 'priority', 'date_issued', 'overdue_date', 'description', 'bsafe_link')

# Locations
class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class LocationNamesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ('id', 'name')

class EstimateHeaderSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateHeader
        fields = '__all__'

class EstimateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateItem
        fields = '__all__'

class ContractorsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = '__all__'
