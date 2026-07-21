from django.urls import path
from . import views

urlpatterns = [
    # Student endpoints
    path('me/', views.StudentRegistrationMeView.as_view(), name='registration-me'),
    path('me/submit/', views.StudentRegistrationSubmitView.as_view(), name='registration-submit'),
    path('invoice/me/', views.PaymentInvoiceMeView.as_view(), name='invoice-me'),
    path('invoice/upload-proof/', views.PaymentInvoiceUploadProofView.as_view(), name='invoice-upload-proof'),

    # Admin endpoints
    path('admin/registrations/', views.AdminRegistrationListView.as_view(), name='admin-registrations-list'),
    path('admin/registrations/<uuid:pk>/', views.AdminRegistrationDetailView.as_view(), name='admin-registration-detail'),
    path('admin/registrations/<uuid:pk>/verify/', views.AdminRegistrationDetailView.as_view(), name='admin-registration-verify'),
    path('admin/payment/<uuid:pk>/verify/', views.AdminPaymentVerifyView.as_view(), name='admin-payment-verify'),
]
