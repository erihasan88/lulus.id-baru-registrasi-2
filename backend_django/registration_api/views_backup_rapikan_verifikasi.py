import datetime
import uuid
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.utils import timezone
from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import StudentRegistration, PaymentInvoice, RejectionLog, AcademicYear, Teacher, UserProfile, ProgramBelajar
from .serializers import (
    StudentRegistrationSerializer,
    PaymentInvoiceSerializer,
    RejectionLogSerializer,
    AcademicYearSerializer,
    TeacherSerializer,
    FaseSerializer,
    MataPelajaranSerializer,
    RombelSerializer,
    ProgramBelajarSerializer
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
            amount = 500000 if is_karyawan else 300000
            
            # Generate unique invoice number: INV/YYYY/MM/[RAND_4_DIGIT]
            now = timezone.now()
            invoice_num = f"INV/{now.year}/{now.strftime('%m')}/{pk[:4].upper()}"
            
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
            
        else:
            return Response({"detail": "Aksi tidak dikenal. Gunakan 'ACCEPT' atau 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = StudentRegistrationSerializer(registration)
        return Response(serializer.data)


class AdminPaymentVerifyView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        invoice = get_object_or_404(PaymentInvoice, pk=pk)
        action = request.data.get('action') # 'APPROVE' or 'DECLINE'
        
        if action == 'APPROVE':
            invoice.payment_status = 'PAID'
            invoice.paid_at = timezone.now()
            invoice.verified_by = request.user
            invoice.save()
            
            # Transition Student Registration status to active
            registration = invoice.registration
            # Once invoice is PAID and registration is DITERIMA, the student is qualified for Orientation
            registration.save()
            
        elif action == 'DECLINE':
            invoice.payment_status = 'UNPAID' # Return to unpaid so they can re-upload proof
            invoice.bukti_transfer = None # Clear bad proof
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
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        registrations = StudentRegistration.objects.filter(
            registration_status='DITERIMA'
        ).order_by('-created_at')

        data = []

        for reg in registrations:
            biodata = reg.biodata or {}

            data.append({
                "id": str(reg.id),
                "nama": biodata.get("nama_lengkap") or biodata.get("nama") or reg.user.username,
                "nik": biodata.get("nik", ""),
                "nisn": biodata.get("nisn", ""),
                "program": reg.program_paket,
                "kelas": reg.tipe_kelas,
                "status": "Aktif"
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
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        teachers = Teacher.objects.all().order_by('-created_at')
        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy()

        nama = data.get('nama')
        nip = data.get('nip', '')
        mapels = data.get('mapels', [])
        kelas_list = data.get('kelas_list', [])

        if not nama:
            return Response(
                {"detail": "Nama guru wajib diisi"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate username otomatis
        base_username = nama.lower().replace(" ", ".")
        username = base_username
        counter = 1

        while User.objects.filter(username=username).exists():
            counter += 1
            username = f"{base_username}{counter}"

        # Password awal
        password_awal = "Lulus@2026"

        # Buat akun login guru
        user = User.objects.create_user(
            username=username,
            password=password_awal
        )

        # Buat profile guru
        UserProfile.objects.create(
            user=user,
            nama_lengkap=nama,
            role="guru"
        )

        # Buat data guru
        teacher = Teacher.objects.create(
            user=user,
            nama=nama,
            nip=nip,
            mapels=mapels,
            kelas_list=kelas_list,
            status=data.get('status', 'Aktif'),
            is_wali_kelas=data.get('is_wali_kelas', False)
        )

        serializer = TeacherSerializer(teacher)

        return Response(
            {
                "teacher": serializer.data,
                "akun": {
                    "username": username,
                    "password_awal": password_awal,
                    "role": "guru"
                }
            },
            status=status.HTTP_201_CREATED
        )



# ==========================================
# ADMIN GURU DETAIL ENDPOINT
# ==========================================

class TeacherDetailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk):
        return get_object_or_404(Teacher, id=pk)

    def get(self, request, pk):
        teacher = self.get_object(pk)
        serializer = TeacherSerializer(teacher)
        return Response(serializer.data)

    def put(self, request, pk):
        teacher = self.get_object(pk)
        serializer = TeacherSerializer(
            teacher,
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
        teacher = self.get_object(pk)
        teacher.delete()
        return Response(
            {"message": "Guru berhasil dihapus"},
            status=status.HTTP_200_OK
        )




# ==========================================
# MASTER MATA PELAJARAN
# ==========================================

class MataPelajaranListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import MataPelajaran

        data = MataPelajaran.objects.all().order_by('nama')
        serializer = MataPelajaranSerializer(data, many=True)
        return Response(serializer.data)

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
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk):
        from .models import MataPelajaran
        return get_object_or_404(MataPelajaran, id=pk)

    def put(self, request, pk):
        mapel = self.get_object(pk)
        serializer = MataPelajaranSerializer(
            mapel,
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
        mapel = self.get_object(pk)
        mapel.delete()

        return Response(
            {"detail": "Mata pelajaran berhasil dihapus"},
            status=status.HTTP_204_NO_CONTENT
        )



# ==========================================
# MASTER ROMBEL
# ==========================================

class RombelListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import Rombel

        rombels = Rombel.objects.all().order_by('-created_at')
        serializer = RombelSerializer(rombels, many=True)

        return Response(serializer.data)

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
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk):
        from .models import Rombel
        return get_object_or_404(Rombel, id=pk)

    def put(self, request, pk):
        rombel = self.get_object(pk)

        serializer = RombelSerializer(
            rombel,
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
        rombel = self.get_object(pk)
        rombel.delete()

        return Response(
            {"detail": "Rombel berhasil dihapus"},
            status=status.HTTP_204_NO_CONTENT
        )


# ==========================================
# MASTER FASE
# ==========================================

class FaseListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import Fase

        fases = Fase.objects.all().order_by('nama')
        serializer = FaseSerializer(fases, many=True)

        return Response(serializer.data)

# ==========================================
# ADMIN PROGRAM BELAJAR
# ==========================================

class ProgramBelajarListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        programs = ProgramBelajar.objects.all()

        paket = request.query_params.get('paket')
        jalur = request.query_params.get('jalur')
        status_program = request.query_params.get('status')

        if paket:
            programs = programs.filter(paket=paket)

        if jalur:
            programs = programs.filter(jalur=jalur)

        if status_program:
            programs = programs.filter(status=status_program)

        serializer = ProgramBelajarSerializer(programs, many=True)
        return Response(serializer.data)

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
    permission_classes = [permissions.AllowAny]

    def get_object(self, pk):
        return get_object_or_404(ProgramBelajar, pk=pk)

    def get(self, request, pk):
        program = self.get_object(pk)
        serializer = ProgramBelajarSerializer(program)
        return Response(serializer.data)

    def patch(self, request, pk):
        program = self.get_object(pk)

        serializer = ProgramBelajarSerializer(
            program,
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

    def put(self, request, pk):
        program = self.get_object(pk)

        serializer = ProgramBelajarSerializer(
            program,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        program = self.get_object(pk)
        program.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )



class AdminChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        password_lama = request.data.get('password_lama', '')
        password_baru = request.data.get('password_baru', '')
        konfirmasi_password = request.data.get('konfirmasi_password', '')

        if not password_lama or not password_baru or not konfirmasi_password:
            return Response(
                {"detail": "Seluruh kolom password wajib diisi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(password_lama):
            return Response(
                {"detail": "Password lama tidak sesuai."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password_baru != konfirmasi_password:
            return Response(
                {"detail": "Konfirmasi password baru tidak cocok."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password_baru) < 8:
            return Response(
                {"detail": "Password baru minimal 8 karakter."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password_baru == password_lama:
            return Response(
                {"detail": "Password baru tidak boleh sama dengan password lama."},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(password_baru)
        request.user.save()

        # Hapus token lama agar sesi lain otomatis tidak berlaku.
        Token.objects.filter(user=request.user).delete()

        return Response({
            "detail": "Password admin berhasil diubah. Silakan login kembali."
        })


class PublicRegistrationView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        email = str(request.data.get('email', '')).strip()

        # Akun internal sementara. Belum dapat digunakan login.
        username = f"pending_{uuid.uuid4().hex[:12]}"
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

        registration_data = StudentRegistrationSerializer(
            registration
        ).data

        invoice_data = (
            PaymentInvoiceSerializer(invoice).data
            if invoice else None
        )

        return Response(
            {
                "success": True,
                "registration": registration_data,
                "invoice": invoice_data
            },
            status=status.HTTP_201_CREATED
        )


class PublicDocumentUploadView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        from django.core.files.storage import default_storage
        import os
        import uuid

        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response(
                {"detail": "File wajib diunggah."},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_types = [
            'application/pdf',
            'image/jpeg',
            'image/png'
        ]

        if uploaded_file.content_type not in allowed_types:
            return Response(
                {"detail": "File harus PDF, JPG, JPEG, atau PNG."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if uploaded_file.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Ukuran file maksimal 5 MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        extension = os.path.splitext(uploaded_file.name)[1].lower()
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
