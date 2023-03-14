from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Job, Location, EstimateHeader, EstimateItem, Contractor
from .serliaizers import CreateJobSerializer, JobSerializer, LocationSerializer, EstimateHeaderSerializer, EstimateItemSerializer, ContractorsSerializer, LocationNamesSerializer


# Jobs
class JobView(generics.ListAPIView):
    queryset = Job.objects.all()
    serializer_class = JobSerializer

class GetJob(APIView):
    serlializer_class = JobSerializer
    lookup_url_kwarg = 'id'

    def get(self, request, format=None, *args, **kwargs):
        id = request.GET.get(self.lookup_url_kwarg)
        if id != None:
            if id.isdigit():
                job = Job.objects.filter(id=id)
                if len(job) > 0:
                    data = JobSerializer(job[0]).data
                    return Response(data, status=status.HTTP_200_OK)
            else:
                if "PO" in id:
                    job = Job.objects.filter(po=id[2:])
                elif "SR" in id:
                    job = Job.objects.filter(sr=id[2:])
                elif "VP" in id:
                    job = Job.objects.filter(rfq=id[2:])
                elif "RFQ" in id:
                    job = Job.objects.filter(rqf=id[3:])

                if len(job) > 0:
                    data = JobSerializer(job[0]).data
                    return Response(data, status=status.HTTP_200_OK)

            return Response({'Job not found': 'Invalid job code'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'Bad request': 'job parameter not found in request'}, status=status.HTTP_400_BAD_REQUEST)

class CreateJobView(APIView):
    serializer_class = CreateJobSerializer

    def post(self, request, format=None):
       
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid(): 
            po = serializer.data.get('po')
            sr = serializer.data.get('sr')
            rfq = serializer.data.get('rfq')
            location = Location.objects.get(id=serializer.data.get('location'))
            building = serializer.data.get('building')
            title = serializer.data.get('title')
            priority = serializer.data.get('priority')
            date_issued = serializer.data.get('date_issued')
            overdue_date = serializer.data.get('overdue_date')
            description = serializer.data.get('description')
            bsafe_link = serializer.data.get('bsafe_link')            

            # Check if Job already exists
            if Job.objects.filter(po=po).exists() and Job.objects.filter(sr=sr).exists():
                job = Job.objects.filter(po=po)[0] if Job.objects.filter(po=po).exists() else Job.objects.filter(sr=sr)[0]
                return Response(JobSerializer(job).data, status=status.HTTP_409_CONFLICT)
            else:
                new_job = Job(po=po, sr=sr, rfq=rfq, priority=priority, location=location, building=building, title=title, description=description, date_issued=date_issued, overdue_date=overdue_date, bsafe_link=bsafe_link)
                new_job.save()

            return Response(JobSerializer(new_job).data, status=status.HTTP_201_CREATED)
        
        return Response({'Bad request': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class LocationView(generics.ListAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


class CreateLocationView(APIView):
    serializer_class = LocationSerializer

    def post(self, request, format=None):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            id = serializer.data.get('id')
            name = serializer.data.get('name')
            address = serializer.data.get('address')
            locality = serializer.data.get('locality')
            postcode = serializer.data.get('postcode')
            state = serializer.data.get('state')
            bgis_region = serializer.data.get('bgis_region')
        
            # Check if Location already exists
            queryset = Location.objects.filter(id=id) 
            if queryset.exists():
                location = queryset[0]
            else:
                location = Location(id=id, name=name, address=address, locality=locality, postcode=postcode, state=state, bgis_region=bgis_region)
                location.save()

            return Response(LocationSerializer(location).data, status=status.HTTP_201_CREATED)


class GetLocation(APIView):
    serializer_class = LocationNamesSerializer
    lookup_url_kwarg = 'id'

    def get(self, request, format=None):
        id = request.GET.get(self.lookup_url_kwarg)
        if id != None:
            if id == "0":
                locations = Location.objects.values('id', 'name')
                data = LocationNamesSerializer(locations, many=True)
                return Response(data.data, status = status.HTTP_200_OK)

            return Response({'Invalid ID': "lookup not found"}, status = status.HTTP_404_NOT_FOUND)

        return Response({'Bad Request': "Job paramater not found in request"}, status = status.HTTP_400_BAD_REQUEST)

class EstimateHeaderView(generics.ListAPIView):
    queryset = EstimateHeader.objects.all()
    serializer_class = EstimateHeaderSerializer

class EstimateItemView(generics.ListAPIView):
    queryset = EstimateItem.objects.all()
    serializer_class = EstimateItemSerializer

class ContractorsView(generics.ListAPIView):
    queryset = Contractor.objects.all()
    serializer_class = ContractorsSerializer

