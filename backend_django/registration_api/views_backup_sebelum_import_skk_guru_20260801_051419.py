from django.contrib.auth import get_user_model
User = get_user_model()
import secrets
import datetime
import uuid
import re
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import views, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from pypdf import PdfReader
from django.shortcuts import get_object_or_404
from django.db import models, transaction
from .models import (
    Rombel,
    StudentRegistration,
    PaymentInvoice,
    RejectionLog,
    AcademicYear,
    Teacher,
    UserProfile,
    ProgramBelajar,
    Fase,
    MataPelajaran,
    Announcement,
    AcademicDocument,
    AcademicTranscript,
    StudentGrade,
    StudentBill,
    PaymentSetting,
    PaymentMethodSetting,
    ManualPaymentSetting,
    Competency, BebanBelajar,
    StudentCompetency,
    CapaianPembelajaran,
    ChatConversation,
    ChatParticipant,
    ChatMessage,
    IdentitasLembaga,
    StudentLearningActivity,
    MateriPembelajaran,
    TugasPembelajaran,
    PengumpulanTugasSiswa,
    BankSoalGuru,
    UjianCBTGuru,
    AgendaWajib,
    KehadiranAgenda,
    PengajuanIzinAgenda,
)
from .serializers import (
    StudentRegistrationSerializer,
    PaymentInvoiceSerializer,
    RejectionLogSerializer,
    AcademicYearSerializer,
    TeacherSerializer,
    FaseSerializer,
    MataPelajaranSerializer,
    RombelSerializer,
    ProgramBelajarSerializer,
    AnnouncementSerializer,
    AcademicDocumentSerializer,
    AcademicTranscriptSerializer,
    StudentGradeSerializer,
    StudentBillSerializer,
    PaymentSettingSerializer,
    PaymentMethodSettingSerializer,
    ManualPaymentSettingSerializer,
    ChatConversationSerializer,
    ChatMessageSerializer,
    CompetencySerializer, BebanBelajarSerializer,
    StudentCompetencySerializer,
    GuruStudentCompetencySerializer,
    CapaianPembelajaranSerializer,
    IdentitasLembagaSerializer,
    AdminProfileSerializer,
    MateriPembelajaranSerializer,
    TugasPembelajaranSerializer,
    PengumpulanTugasSiswaSerializer,
    PengumpulanTugasGradeSerializer,
    BankSoalGuruSerializer,
    UjianCBTGuruSerializer,
    AgendaWajibSerializer,
    KehadiranAgendaSerializer,
    PengajuanIzinAgendaSerializer,
)

class CustomLoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(
            username=username,
            password=password
        )

        if not user:
            return Response(
                {"detail": "Username atau password salah."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token, created = Token.objects.get_or_create(user=user)

        try:
            profile = user.profile
            role = profile.role
            nama_lengkap = profile.nama_lengkap
        except UserProfile.DoesNotExist:
            role = 'admin' if user.is_staff else 'siswa'
            nama_lengkap = user.get_full_name() or user.username

        if role == 'siswa':
            StudentLearningActivity.objects.get_or_create(
                student=user,
                activity_type='LOGIN',
                activity_date=timezone.localdate(),
                defaults={
                    'metadata': {
                        'source': 'custom_login'
                    }
                }
            )

        return Response({
            "token": token.key,
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "nama_lengkap": nama_lengkap,
                "role": role
            }
        })



class StudentRegistrationMeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        registration = StudentRegistration.objects.filter(user=request.user).first()
        if not registration:
            return Response({"detail": "Belum ada riwayat pendaftaran."}, status=status.HTTP_404_NOT_FOUND)
        serializer = StudentRegistrationSerializer(registration)
        return Response(serializer.data)

    def post(self, request):
        # Create or update draft
        registration, created = StudentRegistration.objects.get_or_create(
            user=request.user,
            defaults={
                'program_paket': request.data.get('program_paket', 'Paket C'),
                'tipe_kelas': request.data.get('tipe_kelas', 'Reguler'),
                'registration_status': 'DRAFT',
                'biodata': request.data.get('biodata', {}),
                'dokumen': request.data.get('dokumen', {})
            }
        )
        if not created:
            registration.program_paket = request.data.get('program_paket', registration.program_paket)
            registration.tipe_kelas = request.data.get('tipe_kelas', registration.tipe_kelas)
            registration.biodata = request.data.get('biodata', registration.biodata)
            registration.dokumen = request.data.get('dokumen', registration.dokumen)
            registration.save()
        
        serializer = StudentRegistrationSerializer(registration)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentRegistrationSubmitView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        registration = get_object_or_404(StudentRegistration, user=request.user)
        if registration.registration_status not in ['DRAFT', 'PERBAIKAN_DOKUMEN', 'KLARIFIKASI_DATA']:
            return Response(
                {"detail": f"Status pendaftaran saat ini ({registration.registration_status}) tidak dapat disubmit ulang."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate critical documents presence
        docs = registration.dokumen or {}
        required_docs = ['foto', 'kk', 'ktp', 'ijazah']
        missing_docs = [d for d in required_docs if not docs.get(d)]
        if missing_docs:
            return Response(
                {"detail": f"Dokumen wajib belum lengkap: {', '.join(missing_docs)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        registration.registration_status = 'MENUNGGU_VERIFIKASI'
        registration.save()
        
        serializer = StudentRegistrationSerializer(registration)
        return Response(serializer.data)


class PaymentInvoiceMeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        registration = get_object_or_404(StudentRegistration, user=request.user)
        invoice = getattr(registration, 'invoice', None)
        if not invoice:
            return Response({"detail": "Tagihan pembayaran belum diterbitkan."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PaymentInvoiceSerializer(invoice)
        return Response(serializer.data)


class PaymentInvoiceUploadProofView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        registration = get_object_or_404(StudentRegistration, user=request.user)
        invoice = getattr(registration, 'invoice', None)
        if not invoice:
            return Response({"detail": "Tagihan pembayaran belum diterbitkan."}, status=status.HTTP_404_NOT_FOUND)
        
        bukti = request.data.get('bukti_transfer')
        metode = request.data.get('metode_pembayaran', 'TRANSFER_MANUAL')
        if not bukti:
            return Response({"detail": "File bukti transfer wajib diunggah."}, status=status.HTTP_400_BAD_REQUEST)
        
        invoice.bukti_transfer = bukti
        invoice.metode_pembayaran = metode
        invoice.payment_status = 'WAITING_CONFIRMATION'
        invoice.save()
        
        serializer = PaymentInvoiceSerializer(invoice)
        return Response(serializer.data)


# ==========================================
# ADMIN VIEW ENDPOINTS
# ==========================================

class AdminRegistrationListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get('status')
        queryset = StudentRegistration.objects.all().order_by('-created_at')
        if status_filter:
            queryset = queryset.filter(registration_status=status_filter)
        
        serializer = StudentRegistrationSerializer(queryset, many=True)
        return Response(serializer.data)


class AdminRegistrationDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        registration = get_object_or_404(StudentRegistration, pk=pk)
        serializer = StudentRegistrationSerializer(registration)
        return Response(serializer.data)

    def patch(self, request, pk):
        registration = get_object_or_404(StudentRegistration, pk=pk)
        action = request.data.get('action') # 'ACCEPT' or 'REJECT'
        
        if action == 'ACCEPT':
            registration.registration_status = 'DITERIMA'
            registration.catatan_admin = request.data.get('catatan_admin', 'Berkas lengkap dan lolos seleksi.')
            registration.save()
            
            # Auto-generate Invoice
            is_karyawan = registration.tipe_kelas == 'Karyawan'
            amount = 150000 if is_karyawan else 100000
            
            # Generate unique invoice number: INV/YYYY/MM/[RAND_4_DIGIT]
            now = timezone.now()
            invoice_num = (
                f"INV/{now.year}/{now.strftime('%m')}/"
                f"{str(pk)[:8].upper()}"
            )
            
            PaymentInvoice.objects.update_or_create(
                registration=registration,
                defaults={
                    'invoice_number': invoice_num,
                    'amount': amount,
                    'payment_status': 'UNPAID',
                    'expired_at': now + datetime.timedelta(days=3)
                }
            )
            
        elif action == 'REJECT':
            category = request.data.get('category') # 'PERBAIKAN_DOKUMEN', 'KLARIFIKASI_DATA', 'DITOLAK_PERMANEN'
            reason = request.data.get('reason', 'Ada dokumen yang tidak sesuai.')
            rejected_fields = request.data.get('rejected_fields', [])
            
            if not category:
                return Response({"detail": "Kategori penolakan wajib disertakan."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Set registration status based on category choice
            registration.registration_status = category
            registration.catatan_admin = reason
            registration.save()
            
            # Create rejection log
            RejectionLog.objects.create(
                registration=registration,
                category=category,
                reason=reason,
                rejected_fields=rejected_fields,
                created_by=request.user
            )
            
        elif action == 'UPDATE_ACCOUNT':
            user = registration.user

            requested_username = request.data.get('username')
            requested_password = request.data.get('password')

            if requested_username is not None:
                requested_username = str(
                    requested_username
                ).strip()

                if not requested_username:
                    return Response(
                        {
                            "detail": (
                                "Username siswa tidak boleh kosong."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                duplicate = User.objects.filter(
                    username=requested_username
                ).exclude(pk=user.pk).exists()

                if duplicate:
                    return Response(
                        {
                            "detail": (
                                "Username siswa sudah digunakan "
                                "oleh akun lain."
                            )
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                user.username = requested_username

            if requested_password is not None:
                requested_password = str(
                    requested_password
                ).strip()

                if requested_password:
                    if len(requested_password) < 6:
                        return Response(
                            {
                                "detail": (
                                    "Password minimal 6 karakter."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    user.set_password(requested_password)

            user.save()

            biodata = registration.biodata or {}

            if requested_username is not None:
                biodata['nipd'] = requested_username

            if requested_password:
                biodata[
                    'password_awal_sementara'
                ] = requested_password

            registration.biodata = biodata
            registration.save(
                update_fields=[
                    'biodata',
                    'updated_at'
                ]
            )

            serializer = StudentRegistrationSerializer(
                registration
            )

            response_data = serializer.data
            response_data['detail'] = (
                'Akun login siswa berhasil diperbarui.'
            )

            return Response(response_data)

        elif action == 'RESET_PASSWORD_TANGGAL_LAHIR':
            user = registration.user
            biodata = registration.biodata or {}

            tanggal_lahir = str(
                biodata.get('tgl_lahir', '')
            ).strip()

            try:
                tanggal_lahir_obj = datetime.datetime.strptime(
                    tanggal_lahir[:10],
                    '%Y-%m-%d'
                )
            except (TypeError, ValueError):
                return Response(
                    {
                        "detail": (
                            "Tanggal lahir siswa tidak valid. "
                            "Password tidak dapat direset."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            password_baru = tanggal_lahir_obj.strftime(
                '%d%m%Y'
            )

            user.set_password(password_baru)
            user.save(update_fields=['password'])

            biodata[
                'password_awal_sementara'
            ] = password_baru

            registration.biodata = biodata
            registration.save(
                update_fields=[
                    'biodata',
                    'updated_at'
                ]
            )

            return Response(
                {
                    "detail": (
                        "Password berhasil direset "
                        "ke tanggal lahir siswa."
                    ),
                    "username": user.username,
                    "password_awal_sementara": password_baru
                }
            )

        else:
            return Response(
                {
                    "detail": (
                        "Aksi tidak dikenal. Gunakan "
                        "'ACCEPT', 'REJECT', "
                        "'UPDATE_ACCOUNT', atau "
                        "'RESET_PASSWORD_TANGGAL_LAHIR'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = StudentRegistrationSerializer(registration)
        return Response(serializer.data)


class AdminPaymentVerifyView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        invoice = get_object_or_404(PaymentInvoice, pk=pk)
        action = request.data.get('action') # 'APPROVE' or 'DECLINE'
        
        if action == 'APPROVE':
            if invoice.payment_status != 'WAITING_CONFIRMATION':
                return Response(
                    {"detail": "Pembayaran belum menunggu verifikasi."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            invoice.payment_status = 'PAID'
            invoice.paid_at = timezone.now()
            invoice.verified_by = request.user
            invoice.save()

            registration = invoice.registration
            registration.registration_status = 'MENUNGGU_PLOTTING_ROMBEL'
            registration.catatan_admin = (
                'Pembayaran telah diverifikasi. '
                'Menunggu plotting rombel.'
            )
            registration.save(
                update_fields=[
                    'registration_status',
                    'catatan_admin',
                    'updated_at'
                ]
            )

            # Akun belum aktif dan belum dibuatkan password final.
            registration.user.is_active = False
            registration.user.save(update_fields=['is_active'])

        elif action == 'DECLINE':
            invoice.payment_status = 'UNPAID'
            invoice.bukti_transfer = None
            invoice.paid_at = None
            invoice.verified_by = None
            invoice.save()
        else:
            return Response({"detail": "Aksi tidak dikenal. Gunakan 'APPROVE' atau 'DECLINE'."}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = PaymentInvoiceSerializer(invoice)
        return Response(serializer.data)


# ==========================================
# DASHBOARD SUMMARY ENDPOINT
# ==========================================

class DashboardSummaryView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        total_registrations = StudentRegistration.objects.count()

        pending = StudentRegistration.objects.filter(
            registration_status='MENUNGGU_VERIFIKASI'
        ).count()

        diterima = StudentRegistration.objects.filter(
            registration_status='DITERIMA'
        ).count()

        total_invoice = PaymentInvoice.objects.count()

        lunas = PaymentInvoice.objects.filter(
            payment_status='PAID'
        ).count()

        return Response({
            "total_pendaftaran": total_registrations,
            "menunggu_verifikasi": pending,
            "diterima": diterima,
            "total_tagihan": total_invoice,
            "pembayaran_lunas": lunas
        })


# ==========================================
# ADMIN SISWA ENDPOINT
# ==========================================

class AdminSiswaListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        registrations = StudentRegistration.objects.filter(
            registration_status='AKUN_AKTIF',
            invoice__payment_status='PAID',
            user__is_active=True
        ).order_by('-created_at')

        data = []

        for reg in registrations:
            biodata = reg.biodata or {}

            # Belum masuk Data Siswa sebelum plotting rombel selesai.
            if not biodata.get('kelas_plotted'):
                continue

            data.append({
                "id": str(reg.id),
                "nama": (
                    biodata.get("nama_lengkap")
                    or biodata.get("nama")
                    or reg.user.username
                ),
                "nik": biodata.get("nik", ""),
                "nisn": biodata.get("nisn", ""),
                "program": reg.program_paket,
                "kelas": (
                    biodata.get("rombel_nama")
                    or "Belum Ditentukan"
                ),
                "tipeKelas": reg.tipe_kelas,
                "username": reg.user.username,
                "status": "Aktif",

                "registration_status": reg.registration_status,
                "email": biodata.get("email") or reg.user.email or "",
                "tahun_ajaran": biodata.get("tahun_ajaran", ""),
                "biodata": biodata,
                "dokumen": reg.dokumen or {},
                "catatan_admin": reg.catatan_admin or "",
                "created_at": reg.created_at,
                "updated_at": reg.updated_at
            })

        return Response(data)


# ==========================================
# ADMIN TAHUN AJARAN
# ==========================================

class AcademicYearListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        years = AcademicYear.objects.all().order_by('-created_at')
        serializer = AcademicYearSerializer(years, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AcademicYearSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# ACADEMIC CONTEXT
# ==========================================

class AcademicContextView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        active_year = AcademicYear.objects.filter(
            aktif=True
        ).first()

        if not active_year:
            return Response({
                "tahun_ajaran": None,
                "semester": None
            })

        return Response({
            "tahun_ajaran": active_year.nama,
            "semester": active_year.semester,
            "tanggal_mulai": active_year.tanggal_mulai,
            "tanggal_selesai": active_year.tanggal_selesai
        })


# ==========================================
# ADMIN GURU ENDPOINT
# ==========================================

class TeacherListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        teachers = Teacher.objects.all().order_by('-created_at')
        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        from django.contrib.auth.models import User
        from django.utils.text import slugify

        data = request.data.copy()

        nama = str(data.get('nama', '')).strip()
        nip = str(data.get('nip', '') or '').strip()
        requested_username = str(data.pop('username', '') or '').strip()
        requested_password = str(
            data.pop('password', '')
            or data.pop('password_awal', '')
            or ''
        ).strip()

        if not nama:
            return Response(
                {"detail": "Nama guru wajib diisi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Username dapat dikirim frontend. Jika kosong, dibuat otomatis
        # dari NIP atau nama guru.
        if requested_username:
            username = requested_username
        else:
            username_base = slugify(nip or nama).replace('-', '.')
            username_base = username_base or 'guru'
            username = username_base
            nomor = 2

            while User.objects.filter(username=username).exists():
                username = f"{username_base}{nomor}"
                nomor += 1

        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Username guru sudah digunakan."},
                status=status.HTTP_409_CONFLICT
            )

        # Password dapat dikirim frontend.
        # Jika belum ada kolom password, backend membuat password awal.
        password_awal = requested_password or (
            nip if len(nip) >= 6 else 'Guru12345!'
        )

        serializer = TeacherSerializer(data=data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        guru_aktif = data.get('status', 'Aktif') == 'Aktif'

        user = User.objects.create_user(
            username=username,
            password=password_awal,
            is_active=guru_aktif
        )

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'nama_lengkap': nama,
                'role': 'guru'
            }
        )

        teacher = serializer.save(user=user)

        response_data = TeacherSerializer(teacher).data
        response_data.update({
            "detail": "Guru dan akun login berhasil dibuat.",
            "username": username,
            "password_awal": password_awal,
            "role": "guru"
        })

        return Response(
            response_data,
            status=status.HTTP_201_CREATED
        )


# ==========================================
# PUBLIC REGISTRATION
# ==========================================

class PublicRegistrationView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        email = str(request.data.get('email', '')).strip()
        program_paket = request.data.get('program_paket', 'Paket C')
        tipe_kelas = request.data.get('tipe_kelas', 'Reguler')
        biodata = request.data.get('biodata') or {}
        dokumen = request.data.get('dokumen') or {}
        registration_fee = request.data.get('registration_fee', 0)

        if program_paket not in ['Paket A', 'Paket B', 'Paket C']:
            return Response(
                {"detail": "Program pendidikan tidak valid."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if tipe_kelas not in ['Reguler', 'Karyawan']:
            return Response(
                {"detail": "Tipe kelas tidak valid."},
                status=status.HTTP_400_BAD_REQUEST
            )

        required_docs = ['foto', 'kk', 'ktp', 'ijazah']
        missing_docs = [
            key for key in required_docs
            if not dokumen.get(key)
        ]

        if missing_docs:
            return Response(
                {
                    "detail": (
                        "Dokumen wajib belum lengkap: "
                        + ", ".join(missing_docs)
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        tahun_masuk = timezone.localdate().year
        tahun_pendek = str(tahun_masuk)[-2:]

        program_code = {
            'Paket A': 'A',
            'Paket B': 'B',
            'Paket C': 'C',
        }[program_paket]

        kelas_code = {
            'Reguler': 'R',
            'Karyawan': 'K',
        }[tipe_kelas]

        nomor_urut_terbesar = 0

        for existing in StudentRegistration.objects.select_for_update().filter(
            created_at__year=tahun_masuk
        ):
            existing_biodata = existing.biodata or {}
            nomor = str(
                existing_biodata.get('nomor_urut_siswa', '')
            ).strip()

            if nomor.isdigit():
                nomor_urut_terbesar = max(
                    nomor_urut_terbesar,
                    int(nomor)
                )

        nomor_urut_siswa = nomor_urut_terbesar + 1

        nomor_registrasi = (
            f"{program_code}{kelas_code}-"
            f"{tahun_pendek}-"
            f"{nomor_urut_siswa:04d}"
        )

        biodata['tahun_masuk'] = tahun_masuk
        biodata['nomor_urut_siswa'] = nomor_urut_siswa
        biodata['no_registrasi'] = nomor_registrasi

        username = f"pending_{uuid.uuid4().hex[:12]}"

        user = User(
            username=username,
            email=email,
            is_active=False
        )
        user.set_unusable_password()
        user.save()

        nama_lengkap = (
            biodata.get('nama')
            or biodata.get('nama_lengkap')
            or username
        )

        UserProfile.objects.create(
            user=user,
            nama_lengkap=nama_lengkap,
            role='siswa'
        )

        registration = StudentRegistration.objects.create(
            user=user,
            program_paket=program_paket,
            tipe_kelas=tipe_kelas,
            registration_status='MENUNGGU_VERIFIKASI',
            biodata=biodata,
            dokumen=dokumen
        )

        try:
            amount = int(float(registration_fee or 0))
        except (TypeError, ValueError):
            amount = 0

        invoice = None

        if amount > 0:
            invoice = PaymentInvoice.objects.create(
                registration=registration,
                invoice_number=(
                    f"REG-{timezone.now():%Y%m%d}-"
                    f"{str(registration.id)[:8].upper()}"
                ),
                amount=amount,
                payment_status='UNPAID',
                expired_at=timezone.now() + datetime.timedelta(days=1)
            )

        return Response(
            {
                "success": True,
                "registration": StudentRegistrationSerializer(
                    registration
                ).data,
                "invoice": (
                    PaymentInvoiceSerializer(invoice).data
                    if invoice else None
                )
            },
            status=status.HTTP_201_CREATED
        )


class PublicDocumentUploadView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        from django.core.files.storage import default_storage
        import os

        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response(
                {"detail": "File wajib diunggah."},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
        extension = os.path.splitext(uploaded_file.name)[1].lower()

        if extension not in allowed_extensions:
            return Response(
                {"detail": "Format file tidak didukung."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if uploaded_file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Ukuran file maksimal 5 MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        header = uploaded_file.read(12)
        uploaded_file.seek(0)

        valid_signatures = {
            '.pdf': lambda data: data.startswith(b'%PDF-'),
            '.jpg': lambda data: data.startswith(b'\xff\xd8\xff'),
            '.jpeg': lambda data: data.startswith(b'\xff\xd8\xff'),
            '.png': lambda data: data.startswith(b'\x89PNG\r\n\x1a\n'),
        }

        if not valid_signatures[extension](header):
            return Response(
                {"detail": "Isi file tidak sesuai dengan format yang dipilih."},
                status=status.HTTP_400_BAD_REQUEST
            )

        filename = f"documents/{uuid.uuid4().hex}{extension}"
        saved_path = default_storage.save(filename, uploaded_file)

        return Response({
            "success": True,
            "file": {
                "originalName": uploaded_file.name,
                "filename": os.path.basename(saved_path),
                "size": uploaded_file.size,
                "url": request.build_absolute_uri(
                    default_storage.url(saved_path)
                )
            }
        })


class PublicRegistrationStatusView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, pk):
        registration = get_object_or_404(
            StudentRegistration,
            pk=pk
        )

        data = StudentRegistrationSerializer(registration).data

        if registration.registration_status != 'AKUN_AKTIF':
            data.pop('username', None)
        else:
            biodata = registration.biodata or {}

            data['username'] = registration.user.username
            data['password_awal'] = biodata.get(
                'password_awal_sementara',
                ''
            )
            data['rombel_nama'] = biodata.get(
                'rombel_nama',
                ''
            )
            data['nipd'] = biodata.get('nipd', '')
            data['no_registrasi'] = biodata.get(
                'no_registrasi',
                ''
            )
            data['status_akun'] = (
                'AKTIF'
                if registration.user.is_active
                else 'NONAKTIF'
            )

        return Response(data)


class PublicPaymentProofView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, pk):
        registration = get_object_or_404(
            StudentRegistration,
            pk=pk
        )
        invoice = getattr(registration, 'invoice', None)

        if registration.registration_status != 'DITERIMA':
            return Response(
                {"detail": "Berkas belum diterima oleh admin."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not invoice:
            return Response(
                {"detail": "Tagihan belum diterbitkan."},
                status=status.HTTP_404_NOT_FOUND
            )

        bukti = request.data.get('bukti_transfer')
        metode = request.data.get(
            'metode_pembayaran',
            'TRANSFER_MANUAL'
        )

        if not bukti:
            return Response(
                {"detail": "Bukti pembayaran wajib diunggah."},
                status=status.HTTP_400_BAD_REQUEST
            )

        invoice.bukti_transfer = bukti
        invoice.metode_pembayaran = metode
        invoice.payment_status = 'WAITING_CONFIRMATION'
        invoice.save()

        return Response(
            PaymentInvoiceSerializer(invoice).data
        )


class AdminRegistrationPlotRombelView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    @transaction.atomic
    def patch(self, request, pk):
        registration = get_object_or_404(
            StudentRegistration,
            pk=pk
        )

        if registration.registration_status != 'MENUNGGU_PLOTTING_ROMBEL':
            return Response(
                {
                    "detail": (
                        "Pendaftar belum berada pada tahap "
                        "menunggu penempatan rombel."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        invoice = getattr(registration, 'invoice', None)

        if not invoice or invoice.payment_status != 'PAID':
            return Response(
                {"detail": "Pembayaran belum diverifikasi lunas."},
                status=status.HTTP_400_BAD_REQUEST
            )

        rombel_id = request.data.get('rombel_id')

        if not rombel_id:
            return Response(
                {"detail": "Rombel wajib dipilih."},
                status=status.HTTP_400_BAD_REQUEST
            )

        rombel = get_object_or_404(
            Rombel,
            pk=rombel_id,
            status='Aktif'
        )

        if rombel.sistem_belajar != registration.tipe_kelas:
            return Response(
                {
                    "detail": (
                        f"Rombel ini untuk {rombel.sistem_belajar}, "
                        f"sedangkan siswa memilih "
                        f"{registration.tipe_kelas}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = registration.user
        biodata = registration.biodata or {}

        tahun_masuk = int(
            biodata.get(
                'tahun_masuk',
                registration.created_at.year
            )
        )
        tahun_pendek = str(tahun_masuk)[-2:]

        nomor_urut_siswa = int(
            biodata.get('nomor_urut_siswa') or 0
        )

        if nomor_urut_siswa <= 0:
            nomor_urut_terbesar = 0

            for existing in StudentRegistration.objects.select_for_update().filter(
                created_at__year=tahun_masuk
            ):
                existing_biodata = existing.biodata or {}
                nomor = str(
                    existing_biodata.get(
                        'nomor_urut_siswa',
                        ''
                    )
                ).strip()

                if nomor.isdigit():
                    nomor_urut_terbesar = max(
                        nomor_urut_terbesar,
                        int(nomor)
                    )

            nomor_urut_siswa = nomor_urut_terbesar + 1

        program_code = {
            'Paket A': 'A',
            'Paket B': 'B',
            'Paket C': 'C',
        }[registration.program_paket]

        kelas_code = {
            'Reguler': 'R',
            'Karyawan': 'K',
        }[registration.tipe_kelas]

        nomor_registrasi = (
            f"{program_code}{kelas_code}-"
            f"{tahun_pendek}-"
            f"{nomor_urut_siswa:04d}"
        )

        nipd = (
            f"{program_code}"
            f"{tahun_pendek}"
            f"{nomor_urut_siswa:04d}"
        )

        if User.objects.filter(
            username=nipd
        ).exclude(pk=user.pk).exists():
            return Response(
                {"detail": "NIPD sudah digunakan akun lain."},
                status=status.HTTP_409_CONFLICT
            )

        tanggal_lahir = str(
            biodata.get('tgl_lahir', '')
        ).strip()

        try:
            tanggal_lahir_obj = datetime.datetime.strptime(
                tanggal_lahir[:10],
                '%Y-%m-%d'
            )
        except (TypeError, ValueError):
            return Response(
                {
                    "detail": (
                        "Tanggal lahir tidak valid. "
                        "Gunakan format YYYY-MM-DD."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        password = tanggal_lahir_obj.strftime('%d%m%Y')

        user.username = nipd
        user.set_password(password)
        user.is_active = True
        user.save()

        biodata['tahun_masuk'] = tahun_masuk
        biodata['nomor_urut_siswa'] = nomor_urut_siswa
        biodata['no_registrasi'] = nomor_registrasi
        biodata['nipd'] = nipd
        biodata['kelas_plotted'] = True
        biodata['rombel_id'] = str(rombel.id)
        biodata['rombel_nama'] = rombel.nama_rombel
        biodata['tahun_ajaran_id'] = str(
            rombel.tahun_ajaran_id
        )
        biodata['plotting_at'] = timezone.now().isoformat()
        biodata['password_awal_sementara'] = password

        registration.biodata = biodata
        registration.registration_status = 'AKUN_AKTIF'
        registration.catatan_admin = (
            f'Akun aktif dan ditempatkan pada rombel '
            f'{rombel.nama_rombel}.'
        )
        registration.save()

        return Response({
            "detail": (
                "Penempatan rombel berhasil dan akun siswa aktif."
            ),
            "registration_id": str(registration.id),
            "nama": (
                biodata.get('nama')
                or biodata.get('nama_lengkap')
                or nipd
            ),
            "rombel": rombel.nama_rombel,
            "no_registrasi": nomor_registrasi,
            "nipd": nipd,
            "username": nipd,
            "password_awal": password,
            "status": registration.registration_status
        })


# ==========================================
# ENDPOINT ADMIN YANG DIPULIHKAN
# ==========================================

class AdminChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        password_lama = request.data.get('password_lama')
        password_baru = request.data.get('password_baru')

        if not password_lama or not password_baru:
            return Response(
                {
                    "detail": (
                        "Password lama dan password baru wajib diisi."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(password_lama):
            return Response(
                {"detail": "Password lama tidak sesuai."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password_baru == password_lama:
            return Response(
                {
                    "detail": (
                        "Password baru tidak boleh sama "
                        "dengan password lama."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password_baru) < 8:
            return Response(
                {
                    "detail": (
                        "Password baru minimal terdiri dari 8 karakter."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(password_baru)
        request.user.save()

        Token.objects.filter(user=request.user).delete()

        return Response({
            "detail": (
                "Password admin berhasil diubah. "
                "Silakan login kembali."
            )
        })


class FaseListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = Fase.objects.all().order_by('nama')
        return Response(
            FaseSerializer(queryset, many=True).data
        )

    def post(self, request):
        serializer = FaseSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class MataPelajaranListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = MataPelajaran.objects.all().order_by('nama')
        return Response(
            MataPelajaranSerializer(queryset, many=True).data
        )

    def post(self, request):
        serializer = MataPelajaranSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class MataPelajaranDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(MataPelajaran, pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(
            MataPelajaranSerializer(obj).data
        )

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = MataPelajaranSerializer(
            obj,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RombelListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = Rombel.objects.all().order_by('-created_at')
        return Response(
            RombelSerializer(queryset, many=True).data
        )

    def post(self, request):
        serializer = RombelSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class RombelDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(Rombel, pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(RombelSerializer(obj).data)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = RombelSerializer(
            obj,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(Teacher, pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        data = TeacherSerializer(obj).data

        if obj.user:
            data['username'] = obj.user.username
            data['email'] = obj.user.email
            data['role'] = 'guru'

        return Response(data)

    @transaction.atomic
    def patch(self, request, pk):
        from django.contrib.auth.models import User
        from django.utils.text import slugify

        obj = self.get_object(pk)
        data = request.data.copy()

        requested_username = data.pop('username', None)
        requested_password = (
            data.pop('password', None)
            or data.pop('password_baru', None)
        )
        requested_email = data.pop('email', None)

        serializer = TeacherSerializer(
            obj,
            data=data,
            partial=True
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        teacher = serializer.save()

        user = teacher.user

        # Memperbaiki guru lama yang belum memiliki akun User.
        if user is None:
            username_base = slugify(
                teacher.nip or teacher.nama
            ).replace('-', '.')
            username_base = username_base or 'guru'
            username = username_base
            nomor = 2

            while User.objects.filter(username=username).exists():
                username = f"{username_base}{nomor}"
                nomor += 1

            user = User.objects.create_user(
                username=username,
                password='Guru12345!',
                is_active=teacher.status == 'Aktif'
            )

            teacher.user = user
            teacher.save(update_fields=['user', 'updated_at'])

        if requested_username is not None:
            requested_username = str(requested_username).strip()

            if not requested_username:
                return Response(
                    {"detail": "Username tidak boleh kosong."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            duplicate = User.objects.filter(
                username=requested_username
            ).exclude(pk=user.pk).exists()

            if duplicate:
                return Response(
                    {"detail": "Username guru sudah digunakan."},
                    status=status.HTTP_409_CONFLICT
                )

            user.username = requested_username

        if requested_email is not None:
            user.email = str(requested_email).strip()

        if requested_password:
            user.set_password(str(requested_password))

        user.is_active = teacher.status == 'Aktif'
        user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'nama_lengkap': teacher.nama,
                'role': 'guru'
            }
        )

        response_data = TeacherSerializer(teacher).data
        response_data.update({
            'username': user.username,
            'email': user.email,
            'role': 'guru',
            'detail': 'Data guru dan akun login berhasil diperbarui.'
        })

        return Response(response_data)

    @transaction.atomic
    def delete(self, request, pk):
        obj = self.get_object(pk)
        user = obj.user

        obj.delete()

        if user:
            user.delete()

        return Response(
            {"detail": "Guru dan akun loginnya berhasil dihapus."},
            status=status.HTTP_200_OK
        )


class ProgramBelajarListView(views.APIView):

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = ProgramBelajar.objects.all().order_by(
            '-created_at'
        )
        return Response(
            ProgramBelajarSerializer(
                queryset,
                many=True
            ).data
        )

    def post(self, request):
        serializer = ProgramBelajarSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class ProgramBelajarDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(ProgramBelajar, pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(
            ProgramBelajarSerializer(obj).data
        )

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = ProgramBelajarSerializer(
            obj,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicRegistrationResubmitView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request, pk):
        registration = get_object_or_404(
            StudentRegistration,
            pk=pk
        )

        allowed_statuses = [
            'PERBAIKAN_DOKUMEN',
            'KLARIFIKASI_DATA',
        ]

        if registration.registration_status not in allowed_statuses:
            return Response(
                {
                    "detail": (
                        "Pendaftaran ini tidak berada pada tahap "
                        "perbaikan berkas."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        dokumen_baru = request.data.get('dokumen') or {}

        if not isinstance(dokumen_baru, dict):
            return Response(
                {"detail": "Format dokumen tidak valid."},
                status=status.HTTP_400_BAD_REQUEST
            )

        dokumen_lama = registration.dokumen or {}
        dokumen_lama.update(dokumen_baru)

        required_docs = ['foto', 'kk', 'ktp', 'ijazah']
        missing_docs = [
            item for item in required_docs
            if not dokumen_lama.get(item)
        ]

        if missing_docs:
            return Response(
                {
                    "detail": (
                        "Dokumen wajib belum lengkap: "
                        + ", ".join(missing_docs)
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        registration.dokumen = dokumen_lama
        registration.registration_status = 'MENUNGGU_VERIFIKASI'
        registration.catatan_admin = (
            'Berkas perbaikan telah dikirim dan menunggu '
            'pemeriksaan ulang admin.'
        )
        registration.save()

        return Response({
            "success": True,
            "detail": "Berkas perbaikan berhasil dikirim.",
            "registration_status": registration.registration_status
        })


class PublicAnnouncementListView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        target = request.query_params.get('target', 'Semua')
        today = timezone.localdate()

        queryset = Announcement.objects.filter(
            status='Aktif',
            tanggal_publikasi__lte=today
        ).filter(
            models.Q(tanggal_berakhir__isnull=True)
            | models.Q(tanggal_berakhir__gte=today)
        )

        if target == 'Siswa':
            queryset = queryset.filter(
                target__in=['Semua', 'Siswa']
            )
        elif target == 'Guru':
            queryset = queryset.filter(
                target__in=['Semua', 'Guru']
            )

        return Response(
            AnnouncementSerializer(
                queryset,
                many=True
            ).data
        )


class AdminAnnouncementListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = Announcement.objects.all()

        return Response(
            AnnouncementSerializer(
                queryset,
                many=True
            ).data
        )

    def post(self, request):
        serializer = AnnouncementSerializer(
            data=request.data
        )

        if serializer.is_valid():
            serializer.save(
                created_by=request.user,
                created_role='admin'
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class AdminAnnouncementDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(
            Announcement,
            pk=pk
        )

    def get(self, request, pk):
        announcement = self.get_object(pk)

        return Response(
            AnnouncementSerializer(
                announcement
            ).data
        )

    def patch(self, request, pk):
        announcement = self.get_object(pk)

        serializer = AnnouncementSerializer(
            announcement,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        announcement = self.get_object(pk)
        announcement.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ==========================================
# API PERPUSTAKAAN
# ==========================================
from django.db.models import F
from .models import LibraryBook
from .serializers import LibraryBookSerializer


class LibraryBookListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            books = LibraryBook.objects.all()
        else:
            books = LibraryBook.objects.filter(
                models.Q(status='PUBLISHED') |
                models.Q(uploaded_by=request.user)
            ).distinct()

        return Response(
            LibraryBookSerializer(
                books.order_by('-created_at'),
                many=True
            ).data
        )

    def post(self, request):
        serializer = LibraryBookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_admin = request.user.is_staff

        book = serializer.save(
            uploaded_by=request.user,
            uploaded_role='ADMIN' if is_admin else 'GURU',
            status='PUBLISHED' if is_admin else 'PENDING',
            approved_by=request.user if is_admin else None,
            published_at=timezone.now() if is_admin else None
        )

        return Response(
            LibraryBookSerializer(book).data,
            status=status.HTTP_201_CREATED
        )


class LibraryBookDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        return get_object_or_404(LibraryBook, pk=pk)

    def get(self, request, pk):
        book = self.get_object(pk)

        if not request.user.is_staff and book.status != 'PUBLISHED':
            return Response(
                {'detail': 'Buku belum tersedia.'},
                status=status.HTTP_403_FORBIDDEN
            )

        LibraryBook.objects.filter(pk=pk).update(
            views_count=F('views_count') + 1
        )
        book.refresh_from_db()

        return Response(LibraryBookSerializer(book).data)

    def patch(self, request, pk):
        book = self.get_object(pk)
        is_owner = book.uploaded_by_id == request.user.id

        if not request.user.is_staff and not is_owner:
            return Response(
                {'detail': 'Tidak berhak mengubah buku ini.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = LibraryBookSerializer(
            book,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        if request.user.is_staff:
            updated = serializer.save()
        else:
            updated = serializer.save(
                status='PENDING',
                approved_by=None,
                published_at=None,
                rejection_reason=''
            )

        return Response(LibraryBookSerializer(updated).data)

    def delete(self, request, pk):
        book = self.get_object(pk)

        if not request.user.is_staff:
            return Response(
                {'detail': 'Hanya admin yang dapat menghapus buku.'},
                status=status.HTTP_403_FORBIDDEN
            )

        book.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LibraryBookModerationView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        book = get_object_or_404(LibraryBook, pk=pk)

        action = request.data.get('action')
        reason = request.data.get('reason', '')

        if action == 'approve':
            book.status = 'PUBLISHED'
            book.approved_by = request.user
            book.published_at = timezone.now()
            book.rejection_reason = ''
        elif action == 'reject':
            book.status = 'REJECTED'
            book.approved_by = request.user
            book.rejection_reason = reason
        elif action == 'archive':
            book.status = 'ARCHIVED'
        elif action == 'draft':
            book.status = 'DRAFT'
        else:
            return Response(
                {'detail': 'Aksi tidak valid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        book.save()
        return Response(LibraryBookSerializer(book).data)


class LibraryBookDownloadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        book = get_object_or_404(
            LibraryBook,
            pk=pk,
            status='PUBLISHED'
        )

        LibraryBook.objects.filter(pk=pk).update(
            downloads_count=F('downloads_count') + 1
        )
        book.refresh_from_db()

        return Response({
            'url': book.file_url if book.source_type == 'PDF' else book.ebook_url,
            'downloads_count': book.downloads_count
        })




def get_public_institution_data():
    institution = IdentitasLembaga.objects.order_by('-updated_at').first()

    if institution is None:
        return {
            'namaPkbm': '',
            'namaYayasan': '',
            'npsn': '',
            'nomorIzinOperasional': '',
            'alamat': '',
            'kecamatan': '',
            'kabupaten': '',
            'provinsi': '',
            'kodePos': '',
            'nomorTelepon': '',
            'emailLembaga': '',
            'website': '',
            'logoPkbm': '',
            'logoYayasan': '',
            'atributPengesahanDigital': '',
            'namaKepalaSekolah': '',
            'nipKepalaSekolah': '',
            'namaPenandatangan': '',
        }

    return {
        'namaPkbm': institution.nama_pkbm,
        'namaYayasan': institution.nama_yayasan,
        'npsn': institution.npsn,
        'nomorIzinOperasional': institution.nomor_izin_operasional,
        'alamat': institution.alamat,
        'kecamatan': institution.kecamatan,
        'kabupaten': institution.kabupaten,
        'provinsi': institution.provinsi,
        'kodePos': institution.kode_pos,
        'nomorTelepon': institution.nomor_telepon,
        'emailLembaga': institution.email_lembaga,
        'website': institution.website,
        'logoPkbm': institution.logo_pkbm,
        'logoYayasan': institution.logo_yayasan,
        'atributPengesahanDigital': institution.atribut_pengesahan_digital,
        'namaKepalaSekolah': institution.nama_kepala_sekolah,
        'nipKepalaSekolah': institution.nip_kepala_sekolah,
        'namaPenandatangan': institution.nama_penandatangan,
    }


class PublicAcademicDocumentVerificationView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        code = (request.query_params.get('code') or '').strip()

        if not code:
            return Response(
                {
                    'found': False,
                    'detail': 'Kode verifikasi wajib diisi.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        document = AcademicDocument.objects.select_related('student').filter(
            verification_code__iexact=code
        ).first()

        if document is None:
            document = AcademicDocument.objects.select_related('student').filter(
                document_number__iexact=code
            ).first()

        if document is not None:
            if document.status not in ('PUBLISHED', 'REVOKED'):
                return Response(
                    {
                        'found': False,
                        'detail': 'Dokumen tidak ditemukan.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )

            student_name = (
                document.student.get_full_name()
                or document.student.username
            )

            return Response({
                'found': True,
                'source': 'ACADEMIC_DOCUMENT',
                'isValid': document.status == 'PUBLISHED',
                'status': document.status,
                'studentName': student_name,
                'documentType': document.document_type,
                'title': document.title,
                'documentNumber': document.document_number,
                'verificationCode': str(document.verification_code),
                'issueDate': document.issue_date,
                'tahunLulus': document.graduation_year,
                'verificationNotes': document.verification_notes or '',
                'revokedAt': document.revoked_at,
                'institution': get_public_institution_data(),
            })

        transcript = AcademicTranscript.objects.select_related('student').filter(
            verification_code__iexact=code
        ).first()

        if transcript is None:
            transcript = AcademicTranscript.objects.select_related('student').filter(
                document_number__iexact=code
            ).first()

        if transcript is not None:
            if transcript.status not in ('PUBLISHED', 'REVOKED'):
                return Response(
                    {
                        'found': False,
                        'detail': 'Dokumen tidak ditemukan.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )

            student_name = (
                transcript.student.get_full_name()
                or transcript.student.username
            )

            return Response({
                'found': True,
                'source': 'ACADEMIC_TRANSCRIPT',
                'isValid': transcript.status == 'PUBLISHED',
                'status': transcript.status,
                'studentName': student_name,
                'documentType': 'Transkrip Nilai',
                'title': 'Transkrip Nilai Hasil Belajar',
                'documentNumber': transcript.document_number,
                'verificationCode': str(transcript.verification_code),
                'issueDate': transcript.issue_date,
                'academicYear': transcript.academic_year,
                'semester': transcript.semester,
                'predicate': transcript.predicate,
                'institution': get_public_institution_data(),
            })

        return Response(
            {
                'found': False,
                'detail': 'Dokumen tidak ditemukan.'
            },
            status=status.HTTP_404_NOT_FOUND
        )


class AcademicDocumentListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            queryset = AcademicDocument.objects.all()
        else:
            queryset = AcademicDocument.objects.filter(
                student=request.user,
                status='PUBLISHED'
            )

        return Response(
            AcademicDocumentSerializer(queryset, many=True).data
        )

    def post(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat membuat dokumen."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        student_ref = data.get('student')

        try:
            student_user = User.objects.get(pk=student_ref)
        except Exception:
            registration = get_object_or_404(
                StudentRegistration,
                pk=student_ref
            )
            student_user = registration.user

        data['student'] = student_user.pk

        serializer = AcademicDocumentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcademicDocumentDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, request, pk):
        queryset = AcademicDocument.objects.all()

        if not request.user.is_staff:
            queryset = queryset.filter(
                student=request.user,
                status='PUBLISHED'
            )

        return get_object_or_404(queryset, pk=pk)

    def get(self, request, pk):
        document = self.get_object(request, pk)

        document.views_count += 1
        document.save(update_fields=['views_count'])

        return Response(
            AcademicDocumentSerializer(document).data
        )

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat mengubah dokumen."},
                status=status.HTTP_403_FORBIDDEN
            )

        document = get_object_or_404(AcademicDocument, pk=pk)
        serializer = AcademicDocumentSerializer(
            document,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat menghapus dokumen."},
                status=status.HTTP_403_FORBIDDEN
            )

        document = get_object_or_404(AcademicDocument, pk=pk)
        document.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class AcademicDocumentDownloadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        queryset = AcademicDocument.objects.all()

        if not request.user.is_staff:
            queryset = queryset.filter(
                student=request.user,
                status='PUBLISHED'
            )

        document = get_object_or_404(queryset, pk=pk)

        document.downloads_count += 1
        document.save(update_fields=['downloads_count'])

        return Response({
            "url": document.file_url,
            "downloads_count": document.downloads_count
        })


class AcademicTranscriptListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            queryset = AcademicTranscript.objects.all()
        else:
            queryset = AcademicTranscript.objects.filter(
                student=request.user,
                status='PUBLISHED'
            )

        return Response(
            AcademicTranscriptSerializer(queryset, many=True).data
        )

    def post(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat membuat transkrip."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        student_ref = data.get('student')

        try:
            student_user = User.objects.get(pk=student_ref)
        except Exception:
            registration = get_object_or_404(
                StudentRegistration,
                pk=student_ref
            )
            student_user = registration.user

        data['student'] = student_user.pk

        serializer = AcademicTranscriptSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcademicTranscriptDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, request, pk):
        queryset = AcademicTranscript.objects.all()

        if not request.user.is_staff:
            queryset = queryset.filter(
                student=request.user,
                status='PUBLISHED'
            )

        return get_object_or_404(queryset, pk=pk)

    def get(self, request, pk):
        transcript = self.get_object(request, pk)
        return Response(
            AcademicTranscriptSerializer(transcript).data
        )

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat mengubah transkrip."},
                status=status.HTTP_403_FORBIDDEN
            )

        transcript = get_object_or_404(AcademicTranscript, pk=pk)

        serializer = AcademicTranscriptSerializer(
            transcript,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat menghapus transkrip."},
                status=status.HTTP_403_FORBIDDEN
            )

        transcript = get_object_or_404(AcademicTranscript, pk=pk)
        transcript.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentGradePermissionMixin:
    """
    Aturan akses nilai:
    - Admin: seluruh siswa dan mapel.
    - Guru: hanya siswa dalam rombel dan mapel penugasannya.
    - Siswa: hanya membaca nilai miliknya sendiri.
    """

    def get_teacher(self, request):
        profile = getattr(request.user, 'profile', None)

        if not profile or profile.role != 'guru':
            return None

        teacher = getattr(request.user, 'teacher_profile', None)

        if not teacher or teacher.status != 'Aktif':
            return None

        return teacher

    def get_teacher_class_names(self, teacher):
        return {
            str(item).strip().lower()
            for item in (teacher.kelas_list or [])
            if str(item).strip()
        }

    def get_teacher_subject_names(self, teacher):
        return {
            str(item).strip().lower()
            for item in (teacher.mapels or [])
            if str(item).strip()
        }

    def get_teacher_student_user_ids(self, teacher):
        teacher_classes = self.get_teacher_class_names(teacher)

        if not teacher_classes:
            return []

        registrations = (
            StudentRegistration.objects
            .select_related('user')
            .filter(
                registration_status='AKUN_AKTIF',
                user__is_active=True
            )
        )

        allowed_user_ids = []

        for registration in registrations:
            biodata = (
                registration.biodata
                if isinstance(registration.biodata, dict)
                else {}
            )

            if not biodata.get('kelas_plotted'):
                continue

            rombel_nama = str(
                biodata.get('rombel_nama') or ''
            ).strip().lower()

            if rombel_nama in teacher_classes:
                allowed_user_ids.append(registration.user_id)

        return allowed_user_ids

    def resolve_student_user(self, student_ref):
        try:
            return User.objects.get(pk=student_ref)
        except (User.DoesNotExist, ValueError, TypeError):
            registration = get_object_or_404(
                StudentRegistration,
                pk=student_ref
            )
            return registration.user

    def validate_teacher_grade_scope(
        self,
        teacher,
        student_user,
        subject
    ):
        allowed_student_ids = self.get_teacher_student_user_ids(teacher)

        if student_user.id not in allowed_student_ids:
            return Response(
                {
                    'student': [
                        'Guru hanya dapat mengelola nilai siswa '
                        'dalam rombel yang diampu.'
                    ]
                },
                status=status.HTTP_403_FORBIDDEN
            )

        teacher_subjects = self.get_teacher_subject_names(teacher)

        if not teacher_subjects:
            return Response(
                {
                    'subject': [
                        'Guru belum memiliki penugasan mata pelajaran.'
                    ]
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if subject.nama.strip().lower() not in teacher_subjects:
            return Response(
                {
                    'subject': [
                        'Guru hanya dapat mengelola nilai untuk '
                        'mata pelajaran yang diampu.'
                    ]
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return None


class StudentGradeListCreateView(
    StudentGradePermissionMixin,
    views.APIView
):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = StudentGrade.objects.select_related(
            'student',
            'subject',
            'updated_by'
        )

        student_id = request.query_params.get('student')
        academic_year = request.query_params.get('academic_year')
        semester = request.query_params.get('semester')
        subject_id = request.query_params.get('subject')

        if request.user.is_staff:
            pass
        else:
            teacher = self.get_teacher(request)

            if teacher:
                allowed_student_ids = (
                    self.get_teacher_student_user_ids(teacher)
                )
                teacher_subjects = self.get_teacher_subject_names(
                    teacher
                )

                if not allowed_student_ids or not teacher_subjects:
                    queryset = queryset.none()
                else:
                    queryset = queryset.filter(
                        student_id__in=allowed_student_ids,
                        subject__nama__in=[
                            item
                            for item in teacher.mapels or []
                            if str(item).strip()
                        ]
                    )
            else:
                queryset = queryset.filter(student=request.user)

        if student_id:
            try:
                student_user = self.resolve_student_user(student_id)
                queryset = queryset.filter(student=student_user)
            except Exception:
                queryset = queryset.none()

        if academic_year:
            queryset = queryset.filter(
                academic_year=academic_year
            )

        if semester:
            queryset = queryset.filter(semester=semester)

        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)

        return Response(
            StudentGradeSerializer(queryset, many=True).data
        )

    @transaction.atomic
    def post(self, request):
        teacher = None

        if not request.user.is_staff:
            teacher = self.get_teacher(request)

            if teacher is None:
                return Response(
                    {
                        'detail': (
                            'Hanya admin atau guru aktif '
                            'yang dapat menginput nilai.'
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        data = request.data.copy()
        student_ref = data.get('student')
        subject_id = data.get('subject')

        if not student_ref:
            return Response(
                {'student': ['Siswa wajib dipilih.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not subject_id:
            return Response(
                {'subject': ['Mata pelajaran wajib dipilih.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        student_user = self.resolve_student_user(student_ref)
        subject = get_object_or_404(
            MataPelajaran,
            pk=subject_id
        )

        if teacher:
            error_response = self.validate_teacher_grade_scope(
                teacher,
                student_user,
                subject
            )

            if error_response:
                return error_response

        data['student'] = student_user.pk
        data['subject'] = subject.pk

        academic_year = data.get('academic_year')
        semester = data.get('semester')

        if not academic_year:
            return Response(
                {'academic_year': ['Tahun ajaran wajib diisi.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not semester:
            return Response(
                {'semester': ['Semester wajib diisi.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        existing = StudentGrade.objects.filter(
            student=student_user,
            subject=subject,
            academic_year=academic_year,
            semester=semester
        ).first()

        serializer = StudentGradeSerializer(
            existing,
            data=data,
            partial=bool(existing)
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)

        return Response(
            serializer.data,
            status=(
                status.HTTP_200_OK
                if existing
                else status.HTTP_201_CREATED
            )
        )


class StudentGradeDetailView(
    StudentGradePermissionMixin,
    views.APIView
):
    permission_classes = [permissions.IsAuthenticated]

    def get_grade(self, pk):
        return get_object_or_404(
            StudentGrade.objects.select_related(
                'student',
                'subject',
                'updated_by'
            ),
            pk=pk
        )

    def patch(self, request, pk):
        grade = self.get_grade(pk)
        teacher = None

        if not request.user.is_staff:
            teacher = self.get_teacher(request)

            if teacher is None:
                return Response(
                    {
                        'detail': (
                            'Hanya admin atau guru aktif '
                            'yang dapat mengubah nilai.'
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            error_response = self.validate_teacher_grade_scope(
                teacher,
                grade.student,
                grade.subject
            )

            if error_response:
                return error_response

        data = request.data.copy()

        if teacher:
            requested_student = data.get('student')
            requested_subject = data.get('subject')

            student_user = (
                self.resolve_student_user(requested_student)
                if requested_student
                else grade.student
            )

            subject = (
                get_object_or_404(
                    MataPelajaran,
                    pk=requested_subject
                )
                if requested_subject
                else grade.subject
            )

            error_response = self.validate_teacher_grade_scope(
                teacher,
                student_user,
                subject
            )

            if error_response:
                return error_response

            data['student'] = student_user.pk
            data['subject'] = subject.pk

        serializer = StudentGradeSerializer(
            grade,
            data=data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)

        return Response(serializer.data)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Hanya admin yang dapat menghapus nilai.'},
                status=status.HTTP_403_FORBIDDEN
            )

        grade = self.get_grade(pk)
        grade.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminStudentBillListCreateView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        bills = StudentBill.objects.select_related(
            'student',
            'verified_by'
        ).all()

        serializer = StudentBillSerializer(bills, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = StudentBillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class AdminStudentBillVerifyView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        bill = get_object_or_404(StudentBill, pk=pk)
        action = request.data.get('action')
        reason = request.data.get('reason', '')

        if action == 'APPROVE':
            if bill.status != 'WAITING_CONFIRMATION':
                return Response(
                    {"detail": "Tagihan belum menunggu verifikasi."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            bill.status = 'PAID'
            bill.paid_at = timezone.now()
            bill.verified_by = request.user
            bill.rejection_reason = ''

        elif action == 'DECLINE':
            bill.status = 'DECLINED'
            bill.paid_at = None
            bill.verified_by = request.user
            bill.rejection_reason = reason

        else:
            return Response(
                {"detail": "Gunakan action APPROVE atau DECLINE."},
                status=status.HTTP_400_BAD_REQUEST
            )

        bill.save()

        return Response(StudentBillSerializer(bill).data)


class PaymentSettingView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        setting, _ = PaymentSetting.objects.get_or_create(pk=1)
        return Response(PaymentSettingSerializer(setting).data)

    def patch(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat mengubah pengaturan biaya."},
                status=status.HTTP_403_FORBIDDEN
            )

        setting, _ = PaymentSetting.objects.get_or_create(pk=1)
        serializer = PaymentSettingSerializer(
            setting,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)

        return Response(serializer.data)


class PaymentMethodSettingListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        methods = PaymentMethodSetting.objects.all().order_by('created_at')
        return Response(
            PaymentMethodSettingSerializer(methods, many=True).data
        )

    def post(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat menambah metode pembayaran."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PaymentMethodSettingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class PaymentMethodSettingDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        method = get_object_or_404(PaymentMethodSetting, pk=pk)

        serializer = PaymentMethodSettingSerializer(
            method,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def delete(self, request, pk):
        method = get_object_or_404(PaymentMethodSetting, pk=pk)
        method.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class ManualPaymentSettingView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        setting, _ = ManualPaymentSetting.objects.get_or_create(pk=1)
        return Response(
            ManualPaymentSettingSerializer(setting).data
        )

    def patch(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Hanya admin yang dapat mengubah rekening pembayaran."},
                status=status.HTTP_403_FORBIDDEN
            )

        setting, _ = ManualPaymentSetting.objects.get_or_create(pk=1)

        serializer = ManualPaymentSettingSerializer(
            setting,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)

        return Response(serializer.data)




class CapaianPembelajaranListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cp = CapaianPembelajaran.objects.filter(
            aktif=True
        )

        serializer = CapaianPembelajaranSerializer(
            cp,
            many=True
        )

        return Response(serializer.data)


    def post(self, request):
        serializer = CapaianPembelajaranSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        cp = serializer.save()

        return Response(
            CapaianPembelajaranSerializer(cp).data,
            status=status.HTTP_201_CREATED
        )




class CapaianPembelajaranDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        cp = get_object_or_404(
            CapaianPembelajaran,
            id=pk
        )

        serializer = CapaianPembelajaranSerializer(
            cp,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(serializer.data)


    def delete(self, request, pk):
        cp = get_object_or_404(
            CapaianPembelajaran,
            id=pk
        )

        cp.delete()

        return Response(
            {
                "message": "Capaian Pembelajaran berhasil dihapus"
            },
            status=status.HTTP_204_NO_CONTENT
        )


class BebanBelajarListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = BebanBelajar.objects.select_related(
            'program_belajar'
        ).filter(aktif=True)

        return Response(
            BebanBelajarSerializer(items, many=True).data
        )

    def post(self, request):
        serializer = BebanBelajarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()

        return Response(
            BebanBelajarSerializer(item).data,
            status=status.HTTP_201_CREATED
        )


class BebanBelajarDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        item = get_object_or_404(BebanBelajar, id=pk)

        serializer = BebanBelajarSerializer(
            item,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def delete(self, request, pk):
        item = get_object_or_404(BebanBelajar, id=pk)
        item.aktif = False
        item.save(update_fields=['aktif'])

        return Response(status=status.HTTP_204_NO_CONTENT)


class CompetencyListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        competencies = Competency.objects.filter(aktif=True)

        serializer = CompetencySerializer(
            competencies,
            many=True
        )

        return Response(serializer.data)


    def post(self, request):
        serializer = CompetencySerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        competency = serializer.save()

        return Response(
            CompetencySerializer(competency).data,
            status=status.HTTP_201_CREATED
        )


class CompetencyDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        competency = get_object_or_404(
            Competency,
            id=pk
        )

        serializer = CompetencySerializer(
            competency,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def delete(self, request, pk):
        competency = get_object_or_404(
            Competency,
            id=pk
        )

        competency.aktif = False
        competency.save(update_fields=['aktif'])

        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentCompetencyListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        competencies = StudentCompetency.objects.all()

        serializer = StudentCompetencySerializer(
            competencies,
            many=True
        )

        return Response(serializer.data)


class StudentCompetencyUpdateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        competency = get_object_or_404(
            StudentCompetency,
            id=pk
        )

        serializer = StudentCompetencySerializer(
            competency,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)

        if hasattr(request.user, 'teacher_profile'):
            serializer.save(
                validated_by=request.user.teacher_profile
            )
        else:
            serializer.save()

        return Response(serializer.data)



def get_chat_role(user):
    if user.is_staff:
        return 'admin'

    profile = getattr(user, 'profile', None)
    if profile:
        return profile.role

    if hasattr(user, 'teacher_profile'):
        return 'guru'

    return 'siswa'


class ChatConversationListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = (
            ChatConversation.objects
            .filter(
                conversation_participants__user=request.user,
                is_active=True
            )
            .prefetch_related(
                'conversation_participants__user',
                'messages__sender'
            )
            .distinct()
            .order_by('-updated_at')
        )

        serializer = ChatConversationSerializer(
            conversations,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    def post(self, request):
        participant_user_id = request.data.get('participant_user_id')
        title = str(request.data.get('title', '')).strip()

        if not participant_user_id:
            return Response(
                {'detail': 'Penerima chat wajib dipilih.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            other_user = User.objects.get(id=participant_user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Pengguna tujuan tidak ditemukan.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if other_user.id == request.user.id:
            return Response(
                {'detail': 'Tidak dapat membuat chat dengan akun sendiri.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request_role = get_chat_role(request.user)
        other_role = get_chat_role(other_user)

        allowed_pairs = {
            frozenset(['admin', 'guru']),
            frozenset(['admin', 'siswa']),
            frozenset(['guru', 'siswa']),
        }

        if frozenset([request_role, other_role]) not in allowed_pairs:
            return Response(
                {'detail': 'Percakapan antar-role ini tidak diizinkan.'},
                status=status.HTTP_403_FORBIDDEN
            )

        existing = (
            ChatConversation.objects
            .filter(
                conversation_type='PRIVATE',
                conversation_participants__user=request.user
            )
            .filter(
                conversation_participants__user=other_user
            )
            .distinct()
            .first()
        )

        if existing:
            serializer = ChatConversationSerializer(
                existing,
                context={'request': request}
            )
            return Response(serializer.data)

        with transaction.atomic():
            conversation = ChatConversation.objects.create(
                conversation_type='PRIVATE',
                title=title,
                created_by=request.user
            )

            ChatParticipant.objects.create(
                conversation=conversation,
                user=request.user,
                role=request_role,
                last_read_at=timezone.now()
            )

            ChatParticipant.objects.create(
                conversation=conversation,
                user=other_user,
                role=other_role
            )

        serializer = ChatConversationSerializer(
            conversation,
            context={'request': request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class ChatMessageListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self, request, conversation_id):
        return get_object_or_404(
            ChatConversation.objects.filter(
                conversation_participants__user=request.user,
                is_active=True
            ).distinct(),
            id=conversation_id
        )

    def get(self, request, conversation_id):
        conversation = self.get_conversation(
            request,
            conversation_id
        )

        try:
            limit = int(request.query_params.get('limit', 50))
        except (TypeError, ValueError):
            limit = 50

        limit = max(1, min(limit, 50))

        messages = list(
            conversation.messages
            .filter(is_deleted=False)
            .select_related('sender', 'sender__profile')
            .order_by('-created_at')[:limit]
        )

        messages.reverse()

        serializer = ChatMessageSerializer(
            messages,
            many=True
        )

        return Response(serializer.data)

    def post(self, request, conversation_id):
        conversation = self.get_conversation(
            request,
            conversation_id
        )

        text_value = str(request.data.get('text', '')).strip()
        reply_to_id = request.data.get('reply_to')

        if not text_value:
            return Response(
                {'detail': 'Pesan tidak boleh kosong.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(text_value) > 4000:
            return Response(
                {'detail': 'Pesan maksimal 4.000 karakter.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reply_to = None
        if reply_to_id:
            reply_to = get_object_or_404(
                ChatMessage,
                id=reply_to_id,
                conversation=conversation,
                is_deleted=False
            )

        one_year_ago = timezone.now() - datetime.timedelta(days=365)

        conversation.messages.filter(
            created_at__lt=one_year_ago
        ).delete()

        message_count = conversation.messages.count()

        if message_count >= 5000:
            remove_count = message_count - 4999

            old_ids = list(
                conversation.messages
                .order_by('created_at')
                .values_list('id', flat=True)[:remove_count]
            )

            if old_ids:
                ChatMessage.objects.filter(id__in=old_ids).delete()

        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            text=text_value,
            reply_to=reply_to
        )

        ChatConversation.objects.filter(
            id=conversation.id
        ).update(updated_at=timezone.now())

        ChatParticipant.objects.filter(
            conversation=conversation,
            user=request.user
        ).update(last_read_at=timezone.now())

        return Response(
            ChatMessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )


class ChatConversationReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conversation_id):
        participant = get_object_or_404(
            ChatParticipant,
            conversation_id=conversation_id,
            user=request.user
        )

        participant.last_read_at = timezone.now()
        participant.save(update_fields=['last_read_at'])

        return Response({
            'detail': 'Percakapan ditandai sudah dibaca.',
            'last_read_at': participant.last_read_at,
        })


class ChatContactListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_display_name(self, user):
        profile = getattr(user, 'profile', None)
        if profile and profile.nama_lengkap:
            return profile.nama_lengkap

        teacher = getattr(user, 'teacher_profile', None)
        if teacher and teacher.nama:
            return teacher.nama

        registration = getattr(user, 'registration', None)
        if registration and isinstance(registration.biodata, dict):
            return (
                registration.biodata.get('nama_lengkap')
                or registration.biodata.get('nama')
                or user.get_full_name()
                or user.username
            )

        return user.get_full_name() or user.username

    def get(self, request):
        current_role = get_chat_role(request.user)

        users = (
            User.objects
            .exclude(id=request.user.id)
            .filter(is_active=True)
            .select_related(
                'profile',
                'teacher_profile',
                'registration'
            )
        )

        contacts = []

        for user in users:
            role = get_chat_role(user)

            allowed = False

            if current_role == 'admin':
                allowed = role in ('guru', 'siswa')
            elif current_role == 'guru':
                allowed = role in ('admin', 'siswa')
            elif current_role == 'siswa':
                allowed = role in ('admin', 'guru')

            if not allowed:
                continue

            extra = {}

            if role == 'guru':
                teacher = getattr(user, 'teacher_profile', None)
                if teacher:
                    extra = {
                        'mapels': teacher.mapels,
                        'kelas_list': teacher.kelas_list,
                        'status': teacher.status,
                    }

            elif role == 'siswa':
                registration = getattr(user, 'registration', None)
                if registration:
                    biodata = (
                        registration.biodata
                        if isinstance(registration.biodata, dict)
                        else {}
                    )

                    extra = {
                        'program': registration.program_paket,
                        'tipe_kelas': registration.tipe_kelas,
                        'kelas': (
                            biodata.get('kelas')
                            or biodata.get('rombel')
                            or ''
                        ),
                    }

            contacts.append({
                'user_id': user.id,
                'username': user.username,
                'nama': self.get_display_name(user),
                'role': role,
                **extra,
            })

        contacts.sort(
            key=lambda item: (
                item['role'],
                item['nama'].lower()
            )
        )

        return Response(contacts)




class ChatBroadcastCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Hanya Admin yang dapat mengirim broadcast.'},
                status=status.HTTP_403_FORBIDDEN
            )

        target = str(request.data.get('target', 'all')).lower()
        message_text = str(request.data.get('text', '')).strip()

        if target not in ('all', 'siswa', 'guru'):
            return Response(
                {'detail': 'Target broadcast tidak valid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not message_text:
            return Response(
                {'detail': 'Pesan broadcast tidak boleh kosong.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(message_text) > 4000:
            return Response(
                {'detail': 'Pesan maksimal 4.000 karakter.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        users = User.objects.filter(
            is_active=True
        ).exclude(id=request.user.id)

        recipients = []

        for user in users:
            role = get_chat_role(user)

            if target == 'all' and role in ('guru', 'siswa'):
                recipients.append((user, role))
            elif target == role:
                recipients.append((user, role))

        if not recipients:
            return Response(
                {'detail': 'Tidak ada penerima broadcast.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_title = {
            'all': 'Semua Guru dan Siswa',
            'siswa': 'Semua Siswa',
            'guru': 'Semua Guru',
        }

        with transaction.atomic():
            conversation = ChatConversation.objects.create(
                conversation_type='BROADCAST',
                title=f"Pengumuman Admin — {target_title[target]}",
                created_by=request.user
            )

            ChatParticipant.objects.create(
                conversation=conversation,
                user=request.user,
                role='admin',
                last_read_at=timezone.now()
            )

            ChatParticipant.objects.bulk_create([
                ChatParticipant(
                    conversation=conversation,
                    user=user,
                    role=role
                )
                for user, role in recipients
            ])

            message = ChatMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                text=message_text
            )

        return Response({
            'conversation': ChatConversationSerializer(
                conversation,
                context={'request': request}
            ).data,
            'message': ChatMessageSerializer(message).data,
            'recipient_count': len(recipients),
        }, status=status.HTTP_201_CREATED)

class IdentitasLembagaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        identitas, _ = IdentitasLembaga.objects.get_or_create(pk=1)
        serializer = IdentitasLembagaSerializer(identitas)
        return Response(serializer.data)

    def put(self, request):
        identitas, _ = IdentitasLembaga.objects.get_or_create(pk=1)
        serializer = IdentitasLembagaSerializer(
            identitas,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

# ==========================================
# PROFIL ADMIN
# ==========================================
class AdminProfileView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Akses khusus admin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AdminProfileSerializer(
            request.user,
            context={'request': request}
        )
        return Response(serializer.data)

    def patch(self, request):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Akses khusus admin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AdminProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'detail': 'Profil admin berhasil diperbarui.',
            'user': serializer.data
        })


# ==========================================
# GURU - PROFIL SAYA
# ==========================================

class GuruProfileMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get_teacher(self, request):
        try:
            teacher = request.user.teacher_profile
        except Teacher.DoesNotExist:
            return None

        if teacher.status != 'Aktif' or not request.user.is_active:
            return None

        return teacher

    def build_response(self, teacher):
        user = teacher.user

        return {
            'id': str(teacher.id),
            'user_id': user.id if user else None,
            'nama': teacher.nama,
            'nip': teacher.nip or '',
            'username': user.username if user else '',
            'email': user.email if user else '',
            'role': 'guru',
            'status': teacher.status,

            # Data penugasan hanya dibaca oleh guru, bukan diedit.
            'mapels': teacher.mapels or [],
            'kelas_list': teacher.kelas_list or [],
            'is_wali_kelas': teacher.is_wali_kelas,

            'rekening_type': teacher.rekening_type or 'Bank',
            'rekening_nomor': teacher.rekening_nomor or '',
            'rekening_nama': teacher.rekening_nama or '',
            'tanda_tangan': teacher.tanda_tangan or '',
            'qr_tanda_tangan': teacher.qr_tanda_tangan or '',
            'photo': teacher.photo or '',
        }

    def get(self, request):
        teacher = self.get_teacher(request)

        if teacher is None:
            return Response(
                {'detail': 'Profil guru aktif tidak ditemukan.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response(self.build_response(teacher))

    @transaction.atomic
    def patch(self, request):
        teacher = self.get_teacher(request)

        if teacher is None:
            return Response(
                {'detail': 'Profil guru aktif tidak ditemukan.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        user = teacher.user

        nama = data.get('nama')
        nip = data.get('nip')
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if nama is not None:
            nama = str(nama).strip()

            if not nama:
                return Response(
                    {'detail': 'Nama guru tidak boleh kosong.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            teacher.nama = nama

        if nip is not None:
            teacher.nip = str(nip).strip() or None

        if 'rekening_type' in data:
            rekening_type = str(data.get('rekening_type') or '').strip()

            if rekening_type and rekening_type not in ['Bank', 'DANA']:
                return Response(
                    {'detail': 'Metode rekening harus Bank atau DANA.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            teacher.rekening_type = rekening_type or None

        if 'rekening_nomor' in data:
            teacher.rekening_nomor = (
                str(data.get('rekening_nomor') or '').strip() or None
            )

        if 'rekening_nama' in data:
            teacher.rekening_nama = (
                str(data.get('rekening_nama') or '').strip() or None
            )

        if 'tanda_tangan' in data:
            teacher.tanda_tangan = data.get('tanda_tangan') or None

        if 'qr_tanda_tangan' in data:
            teacher.qr_tanda_tangan = data.get('qr_tanda_tangan') or None

        if 'photo' in data:
            teacher.photo = data.get('photo') or None

        # mapels, kelas_list, status dan wali kelas sengaja tidak diproses.
        # Penugasan akademik tetap menjadi wewenang admin.

        if user:
            if username is not None:
                username = str(username).strip()

                if not username:
                    return Response(
                        {'detail': 'Username tidak boleh kosong.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                duplicate = User.objects.filter(
                    username=username
                ).exclude(pk=user.pk).exists()

                if duplicate:
                    return Response(
                        {'detail': 'Username sudah digunakan.'},
                        status=status.HTTP_409_CONFLICT
                    )

                user.username = username

            if email is not None:
                user.email = str(email).strip()

            if password:
                user.set_password(str(password))

            user.save()

            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    'nama_lengkap': teacher.nama,
                    'role': 'guru'
                }
            )

        teacher.save()

        return Response({
            **self.build_response(teacher),
            'detail': 'Profil guru berhasil diperbarui.'
        })


class GuruStudentListView(views.APIView):
    """
    Daftar siswa aktif yang dapat diakses guru.

    Sumber penempatan kelas:
    StudentRegistration.biodata['rombel_nama']

    Sumber kelas guru:
    Teacher.kelas_list
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, 'profile', None)

        if not profile or profile.role != 'guru':
            return Response(
                {"detail": "Endpoint ini hanya dapat diakses guru."},
                status=status.HTTP_403_FORBIDDEN
            )

        teacher = getattr(request.user, 'teacher_profile', None)

        if not teacher:
            return Response(
                {"detail": "Profil guru tidak ditemukan."},
                status=status.HTTP_404_NOT_FOUND
            )

        teacher_classes = {
            str(item).strip().lower()
            for item in (teacher.kelas_list or [])
            if str(item).strip()
        }

        registrations = (
            StudentRegistration.objects
            .select_related('user')
            .filter(
                registration_status='AKUN_AKTIF',
                user__is_active=True
            )
            .order_by('biodata__nama', 'user__username')
        )

        data = []

        for registration in registrations:
            biodata = (
                registration.biodata
                if isinstance(registration.biodata, dict)
                else {}
            )

            if not biodata.get('kelas_plotted'):
                continue

            rombel_nama = str(
                biodata.get('rombel_nama') or ''
            ).strip()

            # Guru tanpa kelas tidak mendapatkan semua siswa secara otomatis.
            if not teacher_classes:
                continue

            if rombel_nama.lower() not in teacher_classes:
                continue

            data.append({
                "id": str(registration.id),
                "user_id": registration.user_id,
                "nama": (
                    biodata.get('nama_lengkap')
                    or biodata.get('nama')
                    or registration.user.username
                ),
                "username": registration.user.username,
                "email": (
                    biodata.get('email')
                    or registration.user.email
                    or ''
                ),
                "nisn": biodata.get('nisn', ''),
                "nik": biodata.get('nik', ''),
                "program": registration.program_paket,
                "tipe_kelas": registration.tipe_kelas,
                "kelas": rombel_nama,
                "rombel_id": biodata.get('rombel_id', ''),
                "tahun_ajaran_id": biodata.get(
                    'tahun_ajaran_id',
                    ''
                ),
                "status": registration.registration_status,
            })

        return Response(data)


class GuruMateriBaseView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_teacher(self, request):
        profile = getattr(request.user, 'profile', None)

        if not profile or profile.role != 'guru':
            return None, Response(
                {'detail': 'Endpoint ini hanya dapat diakses guru.'},
                status=status.HTTP_403_FORBIDDEN
            )

        teacher = getattr(request.user, 'teacher_profile', None)

        if not teacher:
            return None, Response(
                {'detail': 'Profil guru tidak ditemukan.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if teacher.status != 'Aktif':
            return None, Response(
                {'detail': 'Akun guru tidak aktif.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return teacher, None

    def validate_teacher_scope(self, teacher, serializer):
        mata_pelajaran = serializer.validated_data.get(
            'mata_pelajaran',
            getattr(serializer.instance, 'mata_pelajaran', None)
        )
        rombel = serializer.validated_data.get(
            'rombel',
            getattr(serializer.instance, 'rombel', None)
        )

        teacher_mapels = {
            str(item).strip().lower()
            for item in (teacher.mapels or [])
            if str(item).strip()
        }

        teacher_classes = {
            str(item).strip().lower()
            for item in (teacher.kelas_list or [])
            if str(item).strip()
        }

        if teacher_mapels:
            if mata_pelajaran.nama.strip().lower() not in teacher_mapels:
                return Response(
                    {
                        'mata_pelajaran': [
                            'Guru hanya dapat mengelola materi untuk '
                            'mata pelajaran yang diampu.'
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        if teacher_classes:
            if rombel.nama_rombel.strip().lower() not in teacher_classes:
                return Response(
                    {
                        'rombel': [
                            'Guru hanya dapat mengelola materi untuk '
                            'rombel yang diampu.'
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        if rombel.status != 'Aktif':
            return Response(
                {'rombel': ['Rombel yang dipilih tidak aktif.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        return None


class GuruMateriOptionsView(GuruMateriBaseView):
    """
    Pilihan mapel, rombel, dan kompetensi untuk form materi guru.
    Hanya mengirim data sesuai penugasan guru yang login.
    """

    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        teacher_mapels = {
            str(item).strip().lower()
            for item in (teacher.mapels or [])
            if str(item).strip()
        }

        teacher_classes = {
            str(item).strip().lower()
            for item in (teacher.kelas_list or [])
            if str(item).strip()
        }

        mapel_queryset = MataPelajaran.objects.filter(
            status='Aktif'
        ).order_by('nama')

        if teacher_mapels:
            mapel_queryset = [
                item
                for item in mapel_queryset
                if item.nama.strip().lower() in teacher_mapels
            ]
        else:
            mapel_queryset = []

        rombel_queryset = (
            Rombel.objects
            .select_related('fase', 'tahun_ajaran')
            .filter(status='Aktif')
            .order_by('nama_rombel')
        )

        if teacher_classes:
            rombel_queryset = [
                item
                for item in rombel_queryset
                if item.nama_rombel.strip().lower() in teacher_classes
            ]
        else:
            rombel_queryset = []

        mapel_ids = [item.id for item in mapel_queryset]

        kompetensi_queryset = (
            Competency.objects
            .filter(
                aktif=True,
                subject_id__in=mapel_ids
            )
            .select_related('subject', 'cp')
            .order_by('subject__nama', 'nama_kompetensi')
        )

        return Response({
            'mapel': [
                {
                    'id': str(item.id),
                    'nama': item.nama,
                    'paket': item.paket,
                    'kelas': item.kelas,
                    'semester': item.semester,
                    'tahun_ajaran': item.tahun_ajaran,
                }
                for item in mapel_queryset
            ],
            'rombel': [
                {
                    'id': str(item.id),
                    'nama_rombel': item.nama_rombel,
                    'paket': item.fase.paket,
                    'fase': item.fase.nama,
                    'sistem_belajar': item.sistem_belajar,
                    'tahun_ajaran_id': str(item.tahun_ajaran_id),
                    'tahun_ajaran': item.tahun_ajaran.nama,
                    'semester': item.tahun_ajaran.semester,
                }
                for item in rombel_queryset
            ],
            'kompetensi': [
                {
                    'id': str(item.id),
                    'subject': str(item.subject_id),
                    'mata_pelajaran_nama': item.subject.nama,
                    'nama_kompetensi': item.nama_kompetensi,
                    'bobot_skk': item.bobot_skk,
                    'semester': item.semester,
                }
                for item in kompetensi_queryset
            ],
        })


class GuruMateriListCreateView(GuruMateriBaseView):
    """
    GET  : daftar materi milik guru yang login.
    POST : membuat materi baru milik guru yang login.
    """

    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        queryset = (
            MateriPembelajaran.objects
            .select_related(
                'guru',
                'mata_pelajaran',
                'kompetensi',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran'
            )
            .filter(guru=teacher)
        )

        status_filter = request.query_params.get('status')
        rombel_id = request.query_params.get('rombel')
        mata_pelajaran_id = request.query_params.get('mata_pelajaran')

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if rombel_id:
            queryset = queryset.filter(rombel_id=rombel_id)

        if mata_pelajaran_id:
            queryset = queryset.filter(
                mata_pelajaran_id=mata_pelajaran_id
            )

        serializer = MateriPembelajaranSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    def post(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        serializer = MateriPembelajaranSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        materi = serializer.save(guru=teacher)

        response_serializer = MateriPembelajaranSerializer(
            materi,
            context={'request': request}
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )


class GuruMateriDetailView(GuruMateriBaseView):
    """
    GET    : detail materi milik guru.
    PUT    : memperbarui seluruh data materi.
    PATCH  : memperbarui sebagian data materi.
    DELETE : menghapus materi milik guru.
    """

    def get_object(self, teacher, pk):
        return get_object_or_404(
            MateriPembelajaran.objects.select_related(
                'guru',
                'mata_pelajaran',
                'kompetensi',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran'
            ),
            pk=pk,
            guru=teacher
        )

    def get(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        materi = self.get_object(teacher, pk)

        serializer = MateriPembelajaranSerializer(
            materi,
            context={'request': request}
        )
        return Response(serializer.data)

    def update_materi(self, request, pk, partial):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        materi = self.get_object(teacher, pk)

        serializer = MateriPembelajaranSerializer(
            materi,
            data=request.data,
            partial=partial,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        materi = serializer.save()

        return Response(
            MateriPembelajaranSerializer(
                materi,
                context={'request': request}
            ).data
        )

    def put(self, request, pk):
        return self.update_materi(
            request,
            pk,
            partial=False
        )

    def patch(self, request, pk):
        return self.update_materi(
            request,
            pk,
            partial=True
        )

    def delete(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        materi = self.get_object(teacher, pk)
        materi.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class GuruTugasListCreateView(GuruMateriBaseView):
    """
    GET  : daftar tugas milik guru yang login.
    POST : membuat tugas baru milik guru yang login.
    """

    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        queryset = (
            TugasPembelajaran.objects
            .select_related(
                'guru',
                'mata_pelajaran',
                'kompetensi',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran'
            )
            .filter(guru=teacher)
        )

        status_filter = request.query_params.get('status')
        rombel_id = request.query_params.get('rombel')
        mata_pelajaran_id = request.query_params.get(
            'mata_pelajaran'
        )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if rombel_id:
            queryset = queryset.filter(rombel_id=rombel_id)

        if mata_pelajaran_id:
            queryset = queryset.filter(
                mata_pelajaran_id=mata_pelajaran_id
            )

        serializer = TugasPembelajaranSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    def post(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        serializer = TugasPembelajaranSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        tugas = serializer.save(guru=teacher)

        return Response(
            TugasPembelajaranSerializer(
                tugas,
                context={'request': request}
            ).data,
            status=status.HTTP_201_CREATED
        )


class GuruTugasDetailView(GuruMateriBaseView):
    """
    GET    : detail tugas milik guru.
    PUT    : memperbarui seluruh data tugas.
    PATCH  : memperbarui sebagian data tugas.
    DELETE : menghapus tugas milik guru.
    """

    def get_object(self, teacher, pk):
        return get_object_or_404(
            TugasPembelajaran.objects.select_related(
                'guru',
                'mata_pelajaran',
                'kompetensi',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran'
            ),
            pk=pk,
            guru=teacher
        )

    def get(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        tugas = self.get_object(teacher, pk)

        return Response(
            TugasPembelajaranSerializer(
                tugas,
                context={'request': request}
            ).data
        )

    def update_tugas(self, request, pk, partial):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        tugas = self.get_object(teacher, pk)

        serializer = TugasPembelajaranSerializer(
            tugas,
            data=request.data,
            partial=partial,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        tugas = serializer.save()

        return Response(
            TugasPembelajaranSerializer(
                tugas,
                context={'request': request}
            ).data
        )

    def put(self, request, pk):
        return self.update_tugas(
            request,
            pk,
            partial=False
        )

    def patch(self, request, pk):
        return self.update_tugas(
            request,
            pk,
            partial=True
        )

    def delete(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        tugas = self.get_object(teacher, pk)
        tugas.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

class SiswaTugasListView(views.APIView):
    """
    Daftar tugas aktif sesuai rombel siswa yang sedang login.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, 'profile', None)

        if not profile or profile.role != 'siswa':
            return Response(
                {'detail': 'Endpoint ini hanya dapat diakses siswa.'},
                status=status.HTTP_403_FORBIDDEN
            )

        registration = getattr(request.user, 'registration', None)

        if not registration:
            return Response(
                {'detail': 'Data pendaftaran siswa tidak ditemukan.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if registration.registration_status != 'AKUN_AKTIF':
            return Response(
                {'detail': 'Akun siswa belum aktif.'},
                status=status.HTTP_403_FORBIDDEN
            )

        biodata = (
            registration.biodata
            if isinstance(registration.biodata, dict)
            else {}
        )

        if not biodata.get('kelas_plotted'):
            return Response([])

        rombel_id = biodata.get('rombel_id')

        if not rombel_id:
            return Response([])

        queryset = (
            TugasPembelajaran.objects
            .select_related(
                'guru',
                'materi',
                'mata_pelajaran',
                'kompetensi',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran'
            )
            .filter(
                rombel_id=rombel_id,
                status='PUBLISHED'
            )
            .order_by('batas_pengumpulan', 'nomor_pertemuan')
        )

        data = []

        for tugas in queryset:
            submission = (
                PengumpulanTugasSiswa.objects
                .filter(
                    tugas=tugas,
                    siswa=request.user
                )
                .first()
            )

            item = TugasPembelajaranSerializer(
                tugas,
                context={'request': request}
            ).data

            item['submission'] = (
                PengumpulanTugasSiswaSerializer(
                    submission,
                    context={'request': request}
                ).data
                if submission
                else None
            )

            data.append(item)

        return Response(data)


class SiswaTugasSubmitView(views.APIView):
    """
    Siswa mengirim atau memperbarui jawaban tugas.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        profile = getattr(request.user, 'profile', None)

        if not profile or profile.role != 'siswa':
            return Response(
                {'detail': 'Endpoint ini hanya dapat diakses siswa.'},
                status=status.HTTP_403_FORBIDDEN
            )

        registration = getattr(request.user, 'registration', None)

        if (
            not registration or
            registration.registration_status != 'AKUN_AKTIF'
        ):
            return Response(
                {'detail': 'Akun siswa belum aktif.'},
                status=status.HTTP_403_FORBIDDEN
            )

        biodata = (
            registration.biodata
            if isinstance(registration.biodata, dict)
            else {}
        )

        rombel_id = biodata.get('rombel_id')

        tugas = get_object_or_404(
            TugasPembelajaran.objects.select_related(
                'rombel',
                'mata_pelajaran'
            ),
            pk=pk,
            rombel_id=rombel_id,
            status='PUBLISHED'
        )

        existing = PengumpulanTugasSiswa.objects.filter(
            tugas=tugas,
            siswa=request.user
        ).first()

        if existing and existing.status == 'GRADED':
            return Response(
                {
                    'detail': (
                        'Tugas yang sudah dinilai tidak dapat '
                        'dikirim ulang kecuali guru meminta revisi.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()

        if 'text' in data and 'jawaban_teks' not in data:
            data['jawaban_teks'] = data.get('text', '')

        data['tugas'] = str(tugas.id)

        serializer = PengumpulanTugasSiswaSerializer(
            existing,
            data=data,
            partial=bool(existing),
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        submission = serializer.save(
            siswa=request.user,
            status='SUBMITTED',
            nilai=None,
            feedback_guru='',
            dinilai_oleh=None,
            dinilai_pada=None
        )

        return Response(
            PengumpulanTugasSiswaSerializer(
                submission,
                context={'request': request}
            ).data,
            status=(
                status.HTTP_200_OK
                if existing
                else status.HTTP_201_CREATED
            )
        )


class GuruSubmissionListView(GuruMateriBaseView):
    """
    Daftar submission siswa dari seluruh tugas milik guru.
    """

    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        queryset = (
            PengumpulanTugasSiswa.objects
            .select_related(
                'siswa',
                'siswa__profile',
                'tugas',
                'tugas__guru',
                'tugas__mata_pelajaran',
                'tugas__rombel',
                'tugas__rombel__tahun_ajaran',
                'dinilai_oleh'
            )
            .filter(tugas__guru=teacher)
        )

        tugas_id = request.query_params.get('tugas')
        status_filter = request.query_params.get('status')
        rombel_id = request.query_params.get('rombel')
        mata_pelajaran_id = request.query_params.get(
            'mata_pelajaran'
        )

        if tugas_id:
            queryset = queryset.filter(tugas_id=tugas_id)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if rombel_id:
            queryset = queryset.filter(
                tugas__rombel_id=rombel_id
            )

        if mata_pelajaran_id:
            queryset = queryset.filter(
                tugas__mata_pelajaran_id=mata_pelajaran_id
            )

        return Response(
            PengumpulanTugasSiswaSerializer(
                queryset,
                many=True,
                context={'request': request}
            ).data
        )


class GuruSubmissionGradeView(GuruMateriBaseView):
    """
    Guru memberikan nilai, feedback, atau meminta revisi.
    """

    @transaction.atomic
    def post(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        submission = get_object_or_404(
            PengumpulanTugasSiswa.objects.select_related(
                'tugas',
                'tugas__guru',
                'tugas__mata_pelajaran',
                'tugas__rombel',
                'siswa'
            ),
            pk=pk,
            tugas__guru=teacher
        )

        data = request.data.copy()

        if 'grade' in data and 'nilai' not in data:
            data['nilai'] = data.get('grade')

        if 'feedback' in data and 'feedback_guru' not in data:
            data['feedback_guru'] = data.get('feedback', '')

        if not data.get('status'):
            data['status'] = 'GRADED'

        serializer = PengumpulanTugasGradeSerializer(
            submission,
            data=data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        submission = serializer.save(
            dinilai_oleh=request.user,
            dinilai_pada=timezone.now()
        )

        return Response(
            PengumpulanTugasSiswaSerializer(
                submission,
                context={'request': request}
            ).data
        )


class GuruBankSoalListCreateView(GuruMateriBaseView):
    """
    GET  : daftar bank soal milik guru yang login.
    POST : membuat bank soal baru.
    """

    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        queryset = (
            BankSoalGuru.objects
            .select_related(
                'guru',
                'mata_pelajaran',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran',
                'materi',
                'kompetensi'
            )
            .filter(guru=teacher)
        )

        mata_pelajaran_id = request.query_params.get(
            'mata_pelajaran'
        )
        rombel_id = request.query_params.get('rombel')
        jenis_soal = request.query_params.get('jenis_soal')
        status_filter = request.query_params.get('status')

        if mata_pelajaran_id:
            queryset = queryset.filter(
                mata_pelajaran_id=mata_pelajaran_id
            )

        if rombel_id:
            queryset = queryset.filter(
                rombel_id=rombel_id
            )

        if jenis_soal:
            queryset = queryset.filter(
                jenis_soal=jenis_soal
            )

        if status_filter:
            queryset = queryset.filter(
                status=status_filter
            )

        serializer = BankSoalGuruSerializer(
            queryset,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    def post(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        serializer = BankSoalGuruSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        bank_soal = serializer.save(
            guru=teacher
        )

        return Response(
            BankSoalGuruSerializer(
                bank_soal,
                context={'request': request}
            ).data,
            status=status.HTTP_201_CREATED
        )



class GuruBankSoalImportFormatView(GuruMateriBaseView):
    """
    Membaca PDF dengan format baku Lulus.id dan mengembalikan
    daftar soal untuk ditinjau sebelum disimpan ke Bank Soal.
    """

    parser_classes = [MultiPartParser, FormParser]

    @staticmethod
    def clean_value(value):
        return re.sub(r'\s+', ' ', (value or '').strip())

    @classmethod
    def extract_section(cls, block, name, next_names):
        next_pattern = '|'.join(re.escape(item) for item in next_names)

        pattern = (
            rf'\[{re.escape(name)}\]\s*'
            rf'(.*?)'
            rf'(?=\[(?:{next_pattern})(?::[^\]]*)?\]|\Z)'
        )

        match = re.search(
            pattern,
            block,
            flags=re.IGNORECASE | re.DOTALL
        )

        return match.group(1).strip() if match else ''

    @classmethod
    def parse_questions(cls, text):
        normalized = (
            text.replace('\r\n', '\n')
            .replace('\r', '\n')
        )

        blocks = re.split(
            r'(?=\[JENIS\s*:)',
            normalized,
            flags=re.IGNORECASE
        )

        questions = []
        errors = []

        for index, block in enumerate(blocks, start=1):
            if not re.search(
                r'\[JENIS\s*:',
                block,
                flags=re.IGNORECASE
            ):
                continue

            jenis_match = re.search(
                r'\[JENIS\s*:\s*([^\]]+)\]',
                block,
                flags=re.IGNORECASE
            )
            judul_match = re.search(
                r'\[JUDUL\s*:\s*([^\]]+)\]',
                block,
                flags=re.IGNORECASE
            )
            jawaban_inline = re.search(
                r'\[JAWABAN\s*:\s*([^\]]+)\]',
                block,
                flags=re.IGNORECASE
            )
            bobot_match = re.search(
                r'\[BOBOT\s*:\s*([^\]]+)\]',
                block,
                flags=re.IGNORECASE
            )
            kesulitan_match = re.search(
                r'\[KESULITAN\s*:\s*([^\]]+)\]',
                block,
                flags=re.IGNORECASE
            )

            jenis_raw = cls.clean_value(
                jenis_match.group(1) if jenis_match else ''
            ).upper().replace(' ', '_')

            if jenis_raw in ('PILIHAN_GANDA', 'PG'):
                jenis = 'PILIHAN_GANDA'
            elif jenis_raw in ('ESAI', 'ESSAY'):
                jenis = 'ESAI'
            else:
                errors.append(
                    f'Blok {index}: nilai [JENIS] tidak dikenali.'
                )
                continue

            judul = cls.clean_value(
                judul_match.group(1) if judul_match else ''
            )

            pertanyaan = cls.extract_section(
                block,
                'PERTANYAAN',
                [
                    'PILIHAN',
                    'JAWABAN',
                    'PEMBAHASAN',
                    'BOBOT',
                    'KESULITAN'
                ]
            )

            pilihan_text = cls.extract_section(
                block,
                'PILIHAN',
                [
                    'JAWABAN',
                    'PEMBAHASAN',
                    'BOBOT',
                    'KESULITAN'
                ]
            )

            pembahasan = cls.extract_section(
                block,
                'PEMBAHASAN',
                ['BOBOT', 'KESULITAN']
            )

            jawaban = cls.clean_value(
                jawaban_inline.group(1)
                if jawaban_inline
                else cls.extract_section(
                    block,
                    'JAWABAN',
                    ['PEMBAHASAN', 'BOBOT', 'KESULITAN']
                )
            )

            pilihan = []

            if jenis == 'PILIHAN_GANDA':
                for line in pilihan_text.splitlines():
                    line = line.strip()

                    match = re.match(
                        r'^([A-D])[\.\)]\s*(.+)$',
                        line,
                        flags=re.IGNORECASE
                    )

                    if match:
                        pilihan.append(
                            {
                                'label': match.group(1).upper(),
                                'text': cls.clean_value(match.group(2))
                            }
                        )

                if len(pilihan) < 2:
                    errors.append(
                        f'Blok {index}: pilihan jawaban belum lengkap.'
                    )
                    continue

                jawaban = jawaban.upper().strip()

                if jawaban not in [item['label'] for item in pilihan]:
                    errors.append(
                        f'Blok {index}: jawaban benar tidak sesuai pilihan.'
                    )
                    continue

            try:
                bobot = int(
                    cls.clean_value(
                        bobot_match.group(1)
                        if bobot_match
                        else '10'
                    )
                )
            except ValueError:
                bobot = 10

            kesulitan = cls.clean_value(
                kesulitan_match.group(1)
                if kesulitan_match
                else 'SEDANG'
            ).upper()

            if kesulitan not in ('MUDAH', 'SEDANG', 'SULIT'):
                kesulitan = 'SEDANG'

            if not judul:
                errors.append(f'Blok {index}: [JUDUL] belum diisi.')
                continue

            if not pertanyaan:
                errors.append(
                    f'Blok {index}: [PERTANYAAN] belum diisi.'
                )
                continue

            if not jawaban:
                errors.append(
                    f'Blok {index}: [JAWABAN] belum diisi.'
                )
                continue

            questions.append(
                {
                    'id': index,
                    'judul': judul,
                    'jenis_soal': jenis,
                    'pertanyaan': pertanyaan.strip(),
                    'pilihan_jawaban': [
                        item['text'] for item in pilihan
                    ],
                    'jawaban_benar': jawaban,
                    'pembahasan': pembahasan.strip(),
                    'bobot': max(1, bobot),
                    'tingkat_kesulitan': kesulitan
                }
            )

        return questions, errors

    def post(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response(
                {'detail': 'File PDF belum dipilih.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if uploaded_file.size > 15 * 1024 * 1024:
            return Response(
                {'detail': 'Ukuran file maksimal 15 MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not uploaded_file.name.lower().endswith('.pdf'):
            return Response(
                {
                    'detail': (
                        'Tahap awal hanya mendukung PDF '
                        'format baku Lulus.id.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reader = PdfReader(uploaded_file)
            pages = []

            for page in reader.pages:
                pages.append(page.extract_text() or '')

            extracted_text = '\n'.join(pages).strip()
        except Exception as exc:
            return Response(
                {
                    'detail': (
                        'PDF gagal dibaca. Pastikan file tidak rusak '
                        'dan teks dapat diseleksi.'
                    ),
                    'error': str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not extracted_text:
            return Response(
                {
                    'detail': (
                        'Tidak ada teks yang dapat dibaca dari PDF. '
                        'PDF hasil scan belum didukung.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        questions, errors = self.parse_questions(extracted_text)

        if not questions:
            return Response(
                {
                    'detail': (
                        'Tidak ada soal yang berhasil dikenali. '
                        'Periksa kembali format penanda dalam PDF.'
                    ),
                    'errors': errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                'jumlah_soal': len(questions),
                'questions': questions,
                'errors': errors
            },
            status=status.HTTP_200_OK
        )

class GuruBankSoalDetailView(GuruMateriBaseView):
    """
    GET    : detail soal milik guru.
    PUT    : memperbarui seluruh data soal.
    PATCH  : memperbarui sebagian data soal.
    DELETE : menghapus soal milik guru.
    """

    def get_object(self, teacher, pk):
        return get_object_or_404(
            BankSoalGuru.objects.select_related(
                'guru',
                'mata_pelajaran',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran',
                'materi',
                'kompetensi'
            ),
            pk=pk,
            guru=teacher
        )

    def get(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        bank_soal = self.get_object(
            teacher,
            pk
        )

        return Response(
            BankSoalGuruSerializer(
                bank_soal,
                context={'request': request}
            ).data
        )

    def update_bank_soal(
        self,
        request,
        pk,
        partial
    ):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        bank_soal = self.get_object(
            teacher,
            pk
        )

        serializer = BankSoalGuruSerializer(
            bank_soal,
            data=request.data,
            partial=partial,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        bank_soal = serializer.save()

        return Response(
            BankSoalGuruSerializer(
                bank_soal,
                context={'request': request}
            ).data
        )

    def put(self, request, pk):
        return self.update_bank_soal(
            request,
            pk,
            partial=False
        )

    def patch(self, request, pk):
        return self.update_bank_soal(
            request,
            pk,
            partial=True
        )

    def delete(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        bank_soal = self.get_object(
            teacher,
            pk
        )

        bank_soal.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

class GuruUjianCBTListCreateView(GuruMateriBaseView):
    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        queryset = (
            UjianCBTGuru.objects
            .select_related(
                'guru',
                'mata_pelajaran',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran'
            )
            .prefetch_related('soal')
            .filter(guru=teacher)
        )

        serializer = UjianCBTGuruSerializer(
            queryset,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    def post(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        serializer = UjianCBTGuruSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        ujian = serializer.save(guru=teacher)

        BankSoalGuru.objects.filter(
            id__in=ujian.soal.values_list('id', flat=True)
        ).update(
            jumlah_digunakan=models.F('jumlah_digunakan') + 1
        )

        return Response(
            UjianCBTGuruSerializer(
                ujian,
                context={'request': request}
            ).data,
            status=status.HTTP_201_CREATED
        )


class GuruUjianCBTDetailView(GuruMateriBaseView):
    def get_object(self, teacher, pk):
        return get_object_or_404(
            UjianCBTGuru.objects
            .select_related(
                'guru',
                'mata_pelajaran',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran'
            )
            .prefetch_related('soal'),
            pk=pk,
            guru=teacher
        )

    def get(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        ujian = self.get_object(teacher, pk)

        return Response(
            UjianCBTGuruSerializer(
                ujian,
                context={'request': request}
            ).data
        )

    def update_ujian(self, request, pk, partial):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        ujian = self.get_object(teacher, pk)
        old_soal_ids = set(
            ujian.soal.values_list('id', flat=True)
        )

        serializer = UjianCBTGuruSerializer(
            ujian,
            data=request.data,
            partial=partial,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        ujian = serializer.save()

        new_soal_ids = set(
            ujian.soal.values_list('id', flat=True)
        )

        added_ids = new_soal_ids - old_soal_ids
        removed_ids = old_soal_ids - new_soal_ids

        if added_ids:
            BankSoalGuru.objects.filter(
                id__in=added_ids
            ).update(
                jumlah_digunakan=models.F('jumlah_digunakan') + 1
            )

        if removed_ids:
            for soal in BankSoalGuru.objects.filter(id__in=removed_ids):
                soal.jumlah_digunakan = max(
                    0,
                    soal.jumlah_digunakan - 1
                )
                soal.save(update_fields=['jumlah_digunakan'])

        return Response(
            UjianCBTGuruSerializer(
                ujian,
                context={'request': request}
            ).data
        )

    def put(self, request, pk):
        return self.update_ujian(
            request,
            pk,
            partial=False
        )

    def patch(self, request, pk):
        return self.update_ujian(
            request,
            pk,
            partial=True
        )

    def delete(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        ujian = self.get_object(teacher, pk)
        soal_ids = list(
            ujian.soal.values_list('id', flat=True)
        )

        ujian.delete()

        for soal in BankSoalGuru.objects.filter(id__in=soal_ids):
            soal.jumlah_digunakan = max(
                0,
                soal.jumlah_digunakan - 1
            )
            soal.save(update_fields=['jumlah_digunakan'])

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ==========================================
# GURU - AGENDA WAJIB
# ==========================================

class GuruAgendaWajibBaseView(GuruMateriBaseView):
    def get_agenda(self, teacher, pk):
        return get_object_or_404(
            AgendaWajib.objects.select_related(
                'guru',
                'mata_pelajaran',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran',
                'tahun_ajaran'
            ),
            pk=pk,
            guru=teacher
        )

    def validate_agenda_scope(self, teacher, serializer):
        scope_error = self.validate_teacher_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        rombel = serializer.validated_data.get(
            'rombel',
            getattr(serializer.instance, 'rombel', None)
        )

        tahun_ajaran = serializer.validated_data.get(
            'tahun_ajaran',
            getattr(serializer.instance, 'tahun_ajaran', None)
        )

        if (
            rombel
            and tahun_ajaran
            and rombel.tahun_ajaran_id != tahun_ajaran.id
        ):
            return Response(
                {
                    'tahun_ajaran': [
                        'Tahun ajaran agenda harus sesuai dengan '
                        'tahun ajaran rombel.'
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return None


class GuruAgendaWajibListCreateView(
    GuruAgendaWajibBaseView
):
    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        queryset = (
            AgendaWajib.objects
            .select_related(
                'guru',
                'mata_pelajaran',
                'rombel',
                'rombel__fase',
                'rombel__tahun_ajaran',
                'tahun_ajaran'
            )
            .prefetch_related('kehadiran')
            .filter(guru=teacher)
        )

        serializer = AgendaWajibSerializer(
            queryset,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        serializer = AgendaWajibSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_agenda_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        agenda = serializer.save(guru=teacher)

        return Response(
            AgendaWajibSerializer(
                agenda,
                context={'request': request}
            ).data,
            status=status.HTTP_201_CREATED
        )


class GuruAgendaWajibDetailView(
    GuruAgendaWajibBaseView
):
    def get(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        agenda = self.get_agenda(teacher, pk)

        return Response(
            AgendaWajibSerializer(
                agenda,
                context={'request': request}
            ).data
        )

    @transaction.atomic
    def patch(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        agenda = self.get_agenda(teacher, pk)

        serializer = AgendaWajibSerializer(
            agenda,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_error = self.validate_agenda_scope(
            teacher,
            serializer
        )

        if scope_error:
            return scope_error

        agenda = serializer.save()

        return Response(
            AgendaWajibSerializer(
                agenda,
                context={'request': request}
            ).data
        )

    @transaction.atomic
    def delete(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        agenda = self.get_agenda(teacher, pk)
        agenda.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class GuruAgendaWajibStudentsView(
    GuruAgendaWajibBaseView
):
    def get_student_registrations(self, agenda):
        registrations = (
            StudentRegistration.objects
            .select_related(
                'user',
                'user__profile'
            )
            .filter(
                registration_status='AKUN_AKTIF',
                user__is_active=True
            )
            .order_by(
                'biodata__nama_lengkap',
                'biodata__nama',
                'user__username'
            )
        )

        agenda_rombel_id = str(agenda.rombel_id)
        agenda_rombel_name = (
            agenda.rombel.nama_rombel or ''
        ).strip().lower()

        result = []

        for registration in registrations:
            biodata = (
                registration.biodata
                if isinstance(registration.biodata, dict)
                else {}
            )

            student_rombel_id = str(
                biodata.get('rombel_id') or ''
            ).strip()

            student_rombel_name = str(
                biodata.get('rombel_nama') or ''
            ).strip().lower()

            same_rombel = (
                student_rombel_id == agenda_rombel_id
                or (
                    agenda_rombel_name
                    and student_rombel_name == agenda_rombel_name
                )
            )

            if same_rombel:
                result.append(registration)

        return result

    def get(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        agenda = self.get_agenda(teacher, pk)

        registrations = self.get_student_registrations(
            agenda
        )

        attendance_map = {
            item.siswa_id: item
            for item in (
                KehadiranAgenda.objects
                .select_related(
                    'siswa',
                    'siswa__profile'
                )
                .filter(agenda=agenda)
            )
        }

        students = []

        for registration in registrations:
            biodata = (
                registration.biodata
                if isinstance(registration.biodata, dict)
                else {}
            )

            attendance = attendance_map.get(
                registration.user_id
            )

            students.append({
                'registration_id': str(registration.id),
                'user_id': registration.user_id,
                'nama': (
                    biodata.get('nama_lengkap')
                    or biodata.get('nama')
                    or registration.user.get_full_name()
                    or registration.user.username
                ),
                'username': registration.user.username,
                'nisn': biodata.get('nisn', ''),
                'kelas': agenda.rombel.nama_rombel,
                'kehadiran': (
                    KehadiranAgendaSerializer(
                        attendance,
                        context={'request': request}
                    ).data
                    if attendance
                    else None
                ),
            })

        return Response({
            'agenda': AgendaWajibSerializer(
                agenda,
                context={'request': request}
            ).data,
            'students': students,
        })


class GuruAgendaWajibAttendanceView(
    GuruAgendaWajibStudentsView
):
    def get(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        agenda = self.get_agenda(teacher, pk)

        queryset = (
            KehadiranAgenda.objects
            .select_related(
                'agenda',
                'siswa',
                'siswa__profile',
                'dicatat_oleh'
            )
            .filter(agenda=agenda)
        )

        return Response(
            KehadiranAgendaSerializer(
                queryset,
                many=True,
                context={'request': request}
            ).data
        )

    @transaction.atomic
    def post(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        agenda = self.get_agenda(teacher, pk)

        records = request.data.get('records')

        if not isinstance(records, list):
            return Response(
                {
                    'records': [
                        'Data kehadiran harus berupa daftar.'
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = {
            'HADIR',
            'IZIN',
            'SAKIT',
            'ALFA',
        }

        allowed_students = {
            registration.user_id
            for registration in (
                self.get_student_registrations(agenda)
            )
        }

        saved_records = []
        errors = []

        for index, record in enumerate(records):
            if not isinstance(record, dict):
                errors.append({
                    'index': index,
                    'detail': 'Format catatan tidak valid.'
                })
                continue

            try:
                siswa_id = int(record.get('siswa'))
            except (TypeError, ValueError):
                errors.append({
                    'index': index,
                    'siswa': ['ID siswa tidak valid.']
                })
                continue

            attendance_status = str(
                record.get('status') or ''
            ).strip().upper()

            if siswa_id not in allowed_students:
                errors.append({
                    'index': index,
                    'siswa': [
                        'Siswa tidak terdaftar pada rombel agenda.'
                    ]
                })
                continue

            if attendance_status not in valid_statuses:
                errors.append({
                    'index': index,
                    'status': [
                        'Status harus HADIR, IZIN, SAKIT, atau ALFA.'
                    ]
                })
                continue

            attendance, created = (
                KehadiranAgenda.objects.update_or_create(
                    agenda=agenda,
                    siswa_id=siswa_id,
                    defaults={
                        'status': attendance_status,
                        'catatan_guru': str(
                            record.get('catatan_guru') or ''
                        ).strip(),
                        'dicatat_oleh': request.user,
                    }
                )
            )

            saved_records.append(attendance)

        if errors:
            transaction.set_rollback(True)

            return Response(
                {
                    'detail': (
                        'Sebagian data kehadiran tidak valid. '
                        'Tidak ada data yang disimpan.'
                    ),
                    'errors': errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'detail': 'Kehadiran berhasil disimpan.',
            'records': KehadiranAgendaSerializer(
                saved_records,
                many=True,
                context={'request': request}
            ).data,
        })


class GuruPengajuanIzinListView(
    GuruAgendaWajibBaseView
):
    def get(self, request):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        queryset = (
            PengajuanIzinAgenda.objects
            .select_related(
                'agenda',
                'agenda__guru',
                'agenda__mata_pelajaran',
                'agenda__rombel',
                'siswa',
                'siswa__profile',
                'diverifikasi_oleh'
            )
            .filter(agenda__guru=teacher)
        )

        status_filter = request.query_params.get('status')
        agenda_id = request.query_params.get('agenda')

        if status_filter:
            queryset = queryset.filter(
                status=status_filter
            )

        if agenda_id:
            queryset = queryset.filter(
                agenda_id=agenda_id
            )

        return Response(
            PengajuanIzinAgendaSerializer(
                queryset,
                many=True,
                context={'request': request}
            ).data
        )


class GuruPengajuanIzinVerifyView(
    GuruAgendaWajibStudentsView
):
    @transaction.atomic
    def patch(self, request, pk):
        teacher, error_response = self.get_teacher(request)

        if error_response:
            return error_response

        pengajuan = get_object_or_404(
            PengajuanIzinAgenda.objects
            .select_related(
                'agenda',
                'agenda__guru',
                'agenda__rombel',
                'siswa'
            ),
            pk=pk,
            agenda__guru=teacher
        )

        verification_status = str(
            request.data.get('status') or ''
        ).strip().upper()

        if verification_status not in {
            'DISETUJUI',
            'DITOLAK',
        }:
            return Response(
                {
                    'status': [
                        'Status harus DISETUJUI atau DITOLAK.'
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_students = {
            registration.user_id
            for registration in self.get_student_registrations(
                pengajuan.agenda
            )
        }

        if pengajuan.siswa_id not in allowed_students:
            return Response(
                {
                    'detail': (
                        'Siswa tidak terdaftar pada rombel agenda.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        pengajuan.status = verification_status
        pengajuan.catatan_verifikasi = str(
            request.data.get('catatan_verifikasi') or ''
        ).strip()
        pengajuan.diverifikasi_oleh = request.user
        pengajuan.diverifikasi_pada = timezone.now()

        pengajuan.save(
            update_fields=[
                'status',
                'catatan_verifikasi',
                'diverifikasi_oleh',
                'diverifikasi_pada',
                'updated_at',
            ]
        )

        if verification_status == 'DISETUJUI':
            KehadiranAgenda.objects.update_or_create(
                agenda=pengajuan.agenda,
                siswa=pengajuan.siswa,
                defaults={
                    'status': pengajuan.jenis,
                    'catatan_guru': (
                        pengajuan.catatan_verifikasi
                        or pengajuan.alasan
                    ),
                    'dicatat_oleh': request.user,
                }
            )

        return Response(
            PengajuanIzinAgendaSerializer(
                pengajuan,
                context={'request': request}
            ).data
        )

