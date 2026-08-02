import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class StudentRegistration(models.Model):
    REGISTRATION_STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('MENUNGGU_VERIFIKASI', 'Menunggu Verifikasi'),
        ('PERBAIKAN_DOKUMEN', 'Perbaikan Dokumen'),
        ('KLARIFIKASI_DATA', 'Klarifikasi Data'),
        ('DITERIMA', 'Diterima'),
        ('DITOLAK_PERMANEN', 'Ditolak Permanen'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='registration')
    program_paket = models.CharField(max_length=50, choices=[('Paket A', 'Paket A'), ('Paket B', 'Paket B'), ('Paket C', 'Paket C')])
    tipe_kelas = models.CharField(max_length=50, choices=[('Reguler', 'Reguler'), ('Karyawan', 'Karyawan')])
    registration_status = models.CharField(max_length=30, choices=REGISTRATION_STATUS_CHOICES, default='MENUNGGU_VERIFIKASI')
    biodata = models.JSONField(help_text="Menyimpan data pendaftaran lengkap (alamat, ortu, dll)")
    dokumen = models.JSONField(help_text="Menyimpan path/nama file dokumen (foto, kk, ktp, ijazah)")
    catatan_admin = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pendaftaran {self.user.username} - {self.program_paket} ({self.registration_status})"


class PaymentInvoice(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('NONE', 'Belum Ada Tagihan'),
        ('UNPAID', 'Belum Dibayar'),
        ('WAITING_CONFIRMATION', 'Menunggu Konfirmasi'),
        ('PAID', 'Lunas'),
        ('EXPIRED', 'Kedaluwarsa'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.OneToOneField(StudentRegistration, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='UNPAID')
    metode_pembayaran = models.CharField(max_length=50, blank=True, null=True)
    bukti_transfer = models.CharField(max_length=255, blank=True, null=True, help_text="Path bukti transfer yang diunggah")
    expired_at = models.DateTimeField()
    paid_at = models.DateTimeField(blank=True, null=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='verified_invoices')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.invoice_number} - {self.payment_status} (Rp {self.amount})"


class RejectionLog(models.Model):
    CATEGORY_CHOICES = [
        ('PERBAIKAN_DOKUMEN', 'Perbaikan Dokumen'),
        ('KLARIFIKASI_DATA', 'Klarifikasi Data'),
        ('DITOLAK_PERMANEN', 'Ditolak Permanen'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.ForeignKey(StudentRegistration, on_delete=models.CASCADE, related_name='rejection_logs')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    reason = models.TextField()
    rejected_fields = models.JSONField(default=list, blank=True, help_text="Daftar field yang bermasalah (e.g., ['kk', 'ijazah'])")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rejection_logs')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Penolakan {self.registration.id} - Kategori: {self.category}"


class AcademicYear(models.Model):
    SEMESTER_CHOICES = [
        ('Ganjil', 'Ganjil'),
        ('Genap', 'Genap'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nama = models.CharField(max_length=20)  # contoh: 2026/2027
    semester = models.CharField(max_length=10, choices=SEMESTER_CHOICES)
    tanggal_mulai = models.DateField()
    tanggal_selesai = models.DateField()
    aktif = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.aktif:
            AcademicYear.objects.filter(aktif=True).exclude(id=self.id).update(aktif=False)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nama} - {self.semester}"


class Teacher(models.Model):
    STATUS_CHOICES = [
        ('Aktif', 'Aktif'),
        ('Nonaktif', 'Nonaktif'),
    ]

    REKENING_TYPE_CHOICES = [
        ('Bank', 'Bank'),
        ('DANA', 'DANA'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='teacher_profile'
    )

    nama = models.CharField(max_length=150)
    nip = models.CharField(max_length=50, blank=True, null=True)

    mapels = models.JSONField(default=list, blank=True)
    kelas_list = models.JSONField(default=list, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Aktif'
    )

    rekening_type = models.CharField(
        max_length=20,
        choices=REKENING_TYPE_CHOICES,
        blank=True,
        null=True
    )

    rekening_nomor = models.CharField(max_length=100, blank=True, null=True)
    rekening_nama = models.CharField(max_length=150, blank=True, null=True)

    is_wali_kelas = models.BooleanField(default=False)

    tanda_tangan = models.TextField(blank=True, null=True)
    qr_tanda_tangan = models.TextField(blank=True, null=True)
    photo = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nama


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('guru', 'Guru'),
        ('siswa', 'Siswa'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    nama_lengkap = models.CharField(max_length=150)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='siswa'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nama_lengkap} - {self.role}"




class MataPelajaran(models.Model):
    JENJANG_CHOICES = [
        ('Paket A', 'Paket A'),
        ('Paket B', 'Paket B'),
        ('Paket C', 'Paket C'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    nama = models.CharField(max_length=150)
    kode = models.CharField(max_length=50, blank=True, null=True)

    paket = models.CharField(
        max_length=20,
        choices=JENJANG_CHOICES
    )

    status = models.CharField(
        max_length=20,
        default='Aktif'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nama



class Fase(models.Model):
    JENJANG_CHOICES = [
        ('Paket A', 'Paket A'),
        ('Paket B', 'Paket B'),
        ('Paket C', 'Paket C'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    nama = models.CharField(max_length=100)
    
    paket = models.CharField(
        max_length=20,
        choices=JENJANG_CHOICES
    )

    status = models.CharField(
        max_length=20,
        default='Aktif'
    )

    keterangan = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nama} - {self.paket}"
