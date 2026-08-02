import datetime
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from django.utils import timezone
from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import StudentRegistration, PaymentInvoice, RejectionLog, AcademicYear, Teacher, UserProfile
from .serializers import StudentRegistrationSerializer, PaymentInvoiceSerializer, RejectionLogSerializer, AcademicYearSerializer, TeacherSerializer


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
        serializer = TeacherSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
