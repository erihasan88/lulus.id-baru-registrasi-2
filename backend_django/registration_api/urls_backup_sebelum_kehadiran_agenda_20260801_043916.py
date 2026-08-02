from django.urls import path
from . import views

urlpatterns = [
    path(
        'public/verify-document/',
        views.PublicAcademicDocumentVerificationView.as_view(),
        name='public-academic-document-verification'
    ),

    path('institution-settings/', views.IdentitasLembagaView.as_view(), name='institution-settings'),
    path('student-grades/', views.StudentGradeListCreateView.as_view()),
    path('student-grades/<int:pk>/', views.StudentGradeDetailView.as_view()),

    path('academic-transcripts/', views.AcademicTranscriptListCreateView.as_view()),
    path('academic-transcripts/<uuid:pk>/', views.AcademicTranscriptDetailView.as_view()),

    path('academic-documents/', views.AcademicDocumentListCreateView.as_view()),
    path('academic-documents/<uuid:pk>/', views.AcademicDocumentDetailView.as_view()),
    path('academic-documents/<uuid:pk>/download/', views.AcademicDocumentDownloadView.as_view()),

    path(
        'mading/public/',
        views.PublicAnnouncementListView.as_view(),
        name='public-mading-list'
    ),
    path(
        'admin/mading/',
        views.AdminAnnouncementListView.as_view(),
        name='admin-mading-list'
    ),
    path(
        'admin/mading/<uuid:pk>/',
        views.AdminAnnouncementDetailView.as_view(),
        name='admin-mading-detail'
    ),
    path('token/login/', views.CustomLoginView.as_view(), name='token-login'),
    path(
        'registration/public/register/',
        views.PublicRegistrationView.as_view(),
        name='public-registration'
    ),
    path(
        'registration/public/status/<uuid:pk>/',
        views.PublicRegistrationStatusView.as_view(),
        name='public-registration-status'
    ),
    path(
        'registration/public/status/<uuid:pk>/upload-proof/',
        views.PublicPaymentProofView.as_view(),
        name='public-payment-proof'
    ),

    path(
        'registration/public/status/<uuid:pk>/resubmit/',
        views.PublicRegistrationResubmitView.as_view(),
        name='public-registration-resubmit'
    ),
    path(
        'documents/upload',
        views.PublicDocumentUploadView.as_view(),
        name='public-document-upload'
    ),
    path('admin/stats/', views.DashboardSummaryView.as_view(), name='admin-stats'),
    path(
        'admin/change-password/',
        views.AdminChangePasswordView.as_view(),
        name='admin-change-password'
    ),
    path(
        'admin/profile/',
        views.AdminProfileView.as_view(),
        name='admin-profile'
    ),
    # Student endpoints
    path('me/', views.StudentRegistrationMeView.as_view(), name='registration-me'),
    path('me/submit/', views.StudentRegistrationSubmitView.as_view(), name='registration-submit'),
    path('invoice/me/', views.PaymentInvoiceMeView.as_view(), name='invoice-me'),
    path('invoice/upload-proof/', views.PaymentInvoiceUploadProofView.as_view(), name='invoice-upload-proof'),

    # Academic context
    path('academic-context/', views.AcademicContextView.as_view(), name='academic-context'),

    # Guru endpoints
    path(
        'guru/me/',
        views.GuruProfileMeView.as_view(),
        name='guru-profile-me'
    ),
    path(
        'guru/students/',
        views.GuruStudentListView.as_view(),
        name='guru-student-list'
    ),
    path(
        'guru/materi/options/',
        views.GuruMateriOptionsView.as_view(),
        name='guru-materi-options'
    ),
    path(
        'guru/materi/',
        views.GuruMateriListCreateView.as_view(),
        name='guru-materi-list-create'
    ),
    path(
        'guru/materi/<uuid:pk>/',
        views.GuruMateriDetailView.as_view(),
        name='guru-materi-detail'
    ),

    path(
        'guru/tugas/',
        views.GuruTugasListCreateView.as_view(),
        name='guru-tugas-list-create'
    ),
    path(
        'guru/tugas/<uuid:pk>/',
        views.GuruTugasDetailView.as_view(),
        name='guru-tugas-detail'
    ),

    path(
        'siswa/tasks/',
        views.SiswaTugasListView.as_view(),
        name='siswa-task-list'
    ),
    path(
        'siswa/tasks/<uuid:pk>/submit/',
        views.SiswaTugasSubmitView.as_view(),
        name='siswa-task-submit'
    ),
    path(
        'guru/submissions/',
        views.GuruSubmissionListView.as_view(),
        name='guru-submission-list'
    ),
    path(
        'guru/submissions/<uuid:pk>/grade/',
        views.GuruSubmissionGradeView.as_view(),
        name='guru-submission-grade'
    ),

    path(
        'guru/bank-soal/',
        views.GuruBankSoalListCreateView.as_view(),
        name='guru-bank-soal-list-create'
    ),
    path(
        'guru/bank-soal/import-format/',
        views.GuruBankSoalImportFormatView.as_view(),
        name='guru-bank-soal-import-format'
    ),
    path(
        'guru/bank-soal/<uuid:pk>/',
        views.GuruBankSoalDetailView.as_view(),
        name='guru-bank-soal-detail'
    ),

    path(
        'guru/ujian-cbt/',
        views.GuruUjianCBTListCreateView.as_view(),
        name='guru-ujian-cbt-list-create'
    ),
    path(
        'guru/ujian-cbt/<uuid:pk>/',
        views.GuruUjianCBTDetailView.as_view(),
        name='guru-ujian-cbt-detail'
    ),

    path(
        'guru/agenda-wajib/',
        views.GuruAgendaWajibListCreateView.as_view(),
        name='guru-agenda-wajib-list-create'
    ),
    path(
        'guru/agenda-wajib/<uuid:pk>/',
        views.GuruAgendaWajibDetailView.as_view(),
        name='guru-agenda-wajib-detail'
    ),

    # Admin endpoints
    path('admin/guru/', views.TeacherListView.as_view(), name='teacher-list'),

    path('admin/fase/', views.FaseListView.as_view(), name='fase-list'),
    path('admin/mapel/', views.MataPelajaranListView.as_view(), name='mapel-list'),
    path('admin/skk/cp/', views.CapaianPembelajaranListView.as_view(), name='skk-cp-list'),
    path('admin/skk/cp/<uuid:pk>/', views.CapaianPembelajaranDetailView.as_view(), name='skk-cp-detail'),
    path('admin/skk/beban-belajar/', views.BebanBelajarListView.as_view(), name='skk-beban-belajar-list'),
    path('admin/skk/beban-belajar/<uuid:pk>/', views.BebanBelajarDetailView.as_view(), name='skk-beban-belajar-detail'),
    path('admin/skk/competencies/', views.CompetencyListView.as_view(), name='skk-competency-list'),
    path('admin/skk/competencies/<uuid:pk>/', views.CompetencyDetailView.as_view(), name='skk-competency-detail'),
    path('skk/student-competencies/', views.StudentCompetencyListView.as_view(), name='student-competency-list'),
    path('skk/student-competencies/<uuid:pk>/', views.StudentCompetencyUpdateView.as_view(), name='student-competency-update'),

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
        'payment-settings/',
        views.PaymentSettingView.as_view(),
        name='payment-settings'
    ),
    path(
        'payment-methods/',
        views.PaymentMethodSettingListCreateView.as_view(),
        name='payment-method-list-create'
    ),
    path(
        'payment-methods/<uuid:pk>/',
        views.PaymentMethodSettingDetailView.as_view(),
        name='payment-method-detail'
    ),
    path(
        'manual-payment-settings/',
        views.ManualPaymentSettingView.as_view(),
        name='manual-payment-settings'
    ),

    path(
        'admin/student-bills/',
        views.AdminStudentBillListCreateView.as_view(),
        name='admin-student-bill-list-create'
    ),
    path(
        'admin/student-bills/<uuid:pk>/verify/',
        views.AdminStudentBillVerifyView.as_view(),
        name='admin-student-bill-verify'
    ),

    path(
        'admin/registrations/<uuid:pk>/plot-rombel/',
        views.AdminRegistrationPlotRombelView.as_view(),
        name='admin-registration-plot-rombel'
    ),

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
    # Perpustakaan
    path(
        'library/books/',
        views.LibraryBookListCreateView.as_view(),
        name='library-book-list-create'
    ),
    path(
        'library/books/<uuid:pk>/',
        views.LibraryBookDetailView.as_view(),
        name='library-book-detail'
    ),
    path(
        'library/books/<uuid:pk>/moderate/',
        views.LibraryBookModerationView.as_view(),
        name='library-book-moderate'
    ),
    path(
        'library/books/<uuid:pk>/download/',
        views.LibraryBookDownloadView.as_view(),
        name='library-book-download'
    ),


    # Chat Admin, Guru, dan Siswa
    path(
        'chat/conversations/',
        views.ChatConversationListCreateView.as_view(),
        name='chat-conversation-list-create'
    ),
    path(
        'chat/conversations/<uuid:conversation_id>/messages/',
        views.ChatMessageListCreateView.as_view(),
        name='chat-message-list-create'
    ),
    path(
        'chat/conversations/<uuid:conversation_id>/read/',
        views.ChatConversationReadView.as_view(),
        name='chat-conversation-read'
    ),


    path(
        'chat/contacts/',
        views.ChatContactListView.as_view(),
        name='chat-contact-list'
    ),


    path(
        'chat/broadcast/',
        views.ChatBroadcastCreateView.as_view(),
        name='chat-broadcast-create'
    ),

]
