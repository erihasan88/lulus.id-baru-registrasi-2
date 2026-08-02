from django.urls import path
from . import views

urlpatterns = [
    path('token/login/', views.CustomLoginView.as_view(), name='token-login'),
    path('admin/stats/', views.DashboardSummaryView.as_view(), name='admin-stats'),
    # Student endpoints
    path('me/', views.StudentRegistrationMeView.as_view(), name='registration-me'),
    path('me/submit/', views.StudentRegistrationSubmitView.as_view(), name='registration-submit'),
    path('invoice/me/', views.PaymentInvoiceMeView.as_view(), name='invoice-me'),
    path('invoice/upload-proof/', views.PaymentInvoiceUploadProofView.as_view(), name='invoice-upload-proof'),

    # Academic context
    path('academic-context/', views.AcademicContextView.as_view(), name='academic-context'),

    # Admin endpoints
    path('admin/guru/', views.TeacherListView.as_view(), name='teacher-list'),

    path('admin/fase/', views.FaseListView.as_view(), name='fase-list'),
    path('admin/mapel/', views.MataPelajaranListView.as_view(), name='mapel-list'),

    path('admin/rombel/', views.RombelListView.as_view(), name='rombel-list'),
    path('admin/rombel/<uuid:pk>/', views.RombelDetailView.as_view(), name='rombel-detail'),

    path('admin/mapel/<uuid:pk>/', views.MataPelajaranDetailView.as_view(), name='mapel-detail'),

    path('admin/guru/<uuid:pk>/', views.TeacherDetailView.as_view(), name='teacher-detail'),
    path('admin/tahun-ajaran/', views.AcademicYearListView.as_view(), name='academic-year-list'),
    path('admin/siswa/', views.AdminSiswaListView.as_view(), name='admin-siswa-list'),
    path('admin/registrations/', views.AdminRegistrationListView.as_view(), name='admin-registrations-list'),
    path('admin/registrations/<uuid:pk>/', views.AdminRegistrationDetailView.as_view(), name='admin-registration-detail'),
    path('admin/registrations/<uuid:pk>/verify/', views.AdminRegistrationDetailView.as_view(), name='admin-registration-verify'),
    path('admin/payment/<uuid:pk>/verify/', views.AdminPaymentVerifyView.as_view(), name='admin-payment-verify'),

    path(
        'admin/program-belajar/',
        views.ProgramBelajarListView.as_view(),
        name='program-belajar-list'
    ),
    path(
        'admin/program-belajar/<uuid:pk>/',
        views.ProgramBelajarDetailView.as_view(),
        name='program-belajar-detail'
    ),
]
