from django.shortcuts import render
from django.http.response import HttpResponseRedirect

# Create your views here.
def index(request, *args, **kwargs):
    return render(request, 'frontend/index.html')

def handler404(request, *args, **kwargs): 
    return HttpResponseRedirect('missing/')