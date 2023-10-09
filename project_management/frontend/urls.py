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
    path('clients', index, name="client-select"),
    path('client/<str:client>', index, name="client"),
    path('contractors', index, name="contractors"),
    path('bills', index, name="bills"),
    path('bills/<str:id>', index, name="bill-edit"),
    path('invoices', index, name="invoices"),
    path('invoices/update/<str:input>', index, name="invoices-update"),
    path('analytics', index, name="analytics"),
    path('financials', index, name="financials"),
    path('job', index, name="jobs"),
    # path('job/approved/<str:input>', index, name="jobs-approved"),
    path('job/create/<str:input>', index, name="job-create"),
    path('job/edit/<str:id>', index, name="job-edit"),
    path('job/view/<str:id>', index, name="job-view"),
    path('missing', index, name="missing"),
    path('unauthorized', index, name="unauthorized"),
    path('settings', index, name="settings"),
    path('admin', index, name="admin"),
    path('myaccount', index, name="my-account"),
    path('myob', index, name="myob-integration"),
    path('timesheets', index, name="timesheets"),
    path('timesheets/<str:endDate>', index, name="timesheets"),

    path('wizard', index, name="wizard"),
    path('wizard/quote', index, name="wizard-quote"),
]
handler404 = 'frontend.views.handler404'