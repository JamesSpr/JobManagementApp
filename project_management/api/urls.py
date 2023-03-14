from django.urls import path
from . import views

urlpatterns = [
    path('job', views.JobView.as_view()),
    path('create-job', views.CreateJobView.as_view()),
    path('get-job', views.GetJob.as_view()),
    path('location', views.LocationView.as_view()),
    path('create-location', views.CreateLocationView.as_view()),
    path('get-locations', views.GetLocation.as_view()), 
    path('estimateheader', views.EstimateHeaderView.as_view()),
    path('estimateitem', views.EstimateItemView.as_view()),
    path('contractors', views.ContractorsView.as_view()),
    # path('contractorcontacts', views.ContractorContactsView.as_view()),
]
