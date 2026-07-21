import datetime
from django.utils import timezone
from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import StudentRegistration, PaymentInvoice, RejectionLog
from .serializers import StudentRegistrationSerializer, PaymentInvoiceSerializer, RejectionLogSerializer

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
