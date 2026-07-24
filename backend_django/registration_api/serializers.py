from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StudentRegistration, PaymentInvoice, RejectionLog

User = get_user_model()

class RejectionLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = RejectionLog
        fields = ['id', 'registration', 'category', 'reason', 'rejected_fields', 'created_by_name', 'created_at']


class PaymentInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentInvoice
        fields = [
            'id', 'registration', 'invoice_number', 'amount', 'payment_status',
            'metode_pembayaran', 'bukti_transfer', 'expired_at', 'paid_at', 'created_at'
        ]


class StudentRegistrationSerializer(serializers.ModelSerializer):
    invoice = PaymentInvoiceSerializer(read_only=True)
    rejection_logs = RejectionLogSerializer(many=True, read_only=True)
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = StudentRegistration
        fields = [
            'id', 'username', 'email', 'program_paket', 'tipe_kelas',
            'registration_status', 'biodata', 'dokumen', 'catatan_admin',
            'invoice', 'rejection_logs', 'created_at', 'updated_at'
        ]
