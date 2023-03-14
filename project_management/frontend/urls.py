from django.urls import path
from django.contrib.staticfiles.storage import staticfiles_storage
from django.views.generic.base import RedirectView
from .views import index

urlpatterns = [
    path("favicon.ico", RedirectView.as_view(url=staticfiles_storage.url("images/favicon.png"))),
    path('login', index, name="login"),
    path('signup', index, name="signup"),
    path('activate/<token>', index, name="account-activation"),
    path('password-reset/<token>', index, name="password-reset"),
    path('', index, name="home"),
    path('clients', index, name="clients"),
    path('contacts', index, name="contact-client-select"),
    path('contacts/<str:client>', index, name="client-contacts"),
    path('locations', index, name="location-client-select"),
    path('locations/<str:client>', index, name="client-locations"),
    path('regions', index, name="region-client-select"),
    path('regions/<str:client>', index, name="client-regions"),
    path('contractors', index, name="contractors"),
    path('bills', index, name="bills"),
    path('invoices', index, name="invoices"),
    path('invoices/update/<str:input>', index, name="invoices-update"),
    path('analytics', index, name="analytics"),
    path('job', index, name="jobs"),
    path('job/approved/<str:input>', index, name="jobs-approved"),
    path('job/create/<str:input>', index, name="job-create"),
    path('job/edit/<str:id>', index, name="job-edit"),
    path('test/job/edit/<str:id>', index, name="job-edit"),
    path('job/view/<str:id>', index, name="job-view"),
    path('missing', index, name="missing"),
    path('unauthorized', index, name="unauthorized"),
    path('settings', index, name="settings"),
    path('myaccount', index, name="my-account"),
    path('myob', index, name="myob-integration"),

    path('wizard', index, name="wizard"),
    path('wizard/quote', index, name="wizard-quote"),
]
handler404 = 'frontend.views.handler404'