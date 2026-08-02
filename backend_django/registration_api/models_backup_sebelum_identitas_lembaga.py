import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()

class StudentRegistration(models.Model):
    REGISTRATION_STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('MENUNGGU_VERIFIKASI', 'Menunggu Verifikasi'),
        ('PERBAIKAN_DOKUMEN', 'Perbaikan Dokumen'),
        ('KLARIFIKASI_DATA', 'Klarifikasi Data'),
        ('DITERIMA', 'Berkas Diterima / Menunggu Pembayaran'),
        ('MENUNGGU_PLOTTING_ROMBEL', 'Menunggu Plotting Rombel'),
        ('AKUN_AKTIF', 'Akun Aktif'),
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

    SISTEM_BELAJAR_CHOICES = [
        ('Reguler', 'Reguler'),
        ('Karyawan', 'Karyawan'),
    ]

    SEMESTER_CHOICES = [
        ('Ganjil', 'Ganjil'),
        ('Genap', 'Genap'),
    ]

    STATUS_CHOICES = [
        ('Aktif', 'Aktif'),
        ('Tidak Aktif', 'Tidak Aktif'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    nama = models.CharField(max_length=150)
    kode = models.CharField(max_length=50, blank=True, default='')

    paket = models.CharField(
        max_length=20,
        choices=JENJANG_CHOICES
    )

    fase = models.CharField(
        max_length=20,
        blank=True,
        default=''
    )

    kategori = models.CharField(
        max_length=50,
        default='Umum'
    )

    kkm = models.PositiveIntegerField(default=75)

    bobot_skk = models.PositiveIntegerField(default=4)

    is_wajib = models.BooleanField(default=True)

    sistem_belajar = models.CharField(
        max_length=20,
        choices=SISTEM_BELAJAR_CHOICES,
        default='Reguler'
    )

    kelas = models.CharField(
        max_length=50,
        blank=True,
        default=''
    )

    semester = models.CharField(
        max_length=10,
        choices=SEMESTER_CHOICES,
        default='Ganjil'
    )

    tahun_ajaran = models.CharField(
        max_length=20,
        blank=True,
        default=''
    )

    cp_id = models.CharField(
        max_length=100,
        blank=True,
        default=''
    )

    capaian_utama = models.TextField(
        blank=True,
        default=''
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Aktif'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['paket', 'nama']
        constraints = [
            models.UniqueConstraint(
                fields=['kode', 'paket', 'sistem_belajar'],
                name='unique_mapel_code_program'
            )
        ]

    def __str__(self):
        return f"{self.kode} - {self.nama} ({self.paket})"


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



class Rombel(models.Model):
    SISTEM_BELAJAR_CHOICES = [
        ('Reguler', 'Reguler'),
        ('Karyawan', 'Karyawan'),
    ]

    STATUS_CHOICES = [
        ('Aktif', 'Aktif'),
        ('Nonaktif', 'Nonaktif'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    nama_rombel = models.CharField(max_length=150)

    fase = models.ForeignKey(
        Fase,
        on_delete=models.CASCADE,
        related_name='rombels'
    )

    sistem_belajar = models.CharField(
        max_length=20,
        choices=SISTEM_BELAJAR_CHOICES
    )

    tahun_ajaran = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='rombels'
    )

    wali_tutor = models.ForeignKey(
        Teacher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rombels_wali'
    )

    beban_belajar = models.JSONField(
        default=dict,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Aktif'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nama_rombel

class ProgramBelajar(models.Model):
    JENJANG_CHOICES = [
        ('Paket A', 'Paket A'),
        ('Paket B', 'Paket B'),
        ('Paket C', 'Paket C'),
    ]

    JALUR_CHOICES = [
        ('Reguler', 'Reguler'),
        ('Karyawan', 'Karyawan'),
    ]

    STATUS_CHOICES = [
        ('Aktif', 'Aktif'),
        ('Nonaktif', 'Nonaktif'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    nama = models.CharField(
        max_length=150
    )

    paket = models.CharField(
        max_length=20,
        choices=JENJANG_CHOICES
    )

    jalur = models.CharField(
        max_length=20,
        choices=JALUR_CHOICES
    )

    target_total_skk = models.PositiveIntegerField(
        help_text="Jumlah total SKK yang harus dicapai siswa"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Aktif'
    )

    keterangan = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ['paket', 'jalur', 'nama']
        constraints = [
            models.UniqueConstraint(
                fields=['paket', 'jalur', 'nama'],
                name='unique_program_belajar'
            )
        ]

    def __str__(self):
        return f"{self.nama} - {self.paket} ({self.jalur})"



class BebanBelajar(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    program_belajar = models.ForeignKey(
        ProgramBelajar,
        on_delete=models.CASCADE,
        related_name='beban_belajar'
    )

    fase = models.CharField(
        max_length=20
    )

    semester = models.CharField(
        max_length=20
    )

    target_skk = models.PositiveIntegerField(
        default=0
    )

    tahun_berlaku = models.CharField(
        max_length=20
    )

    aktif = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ['program_belajar', 'semester']
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'program_belajar',
                    'fase',
                    'semester',
                    'tahun_berlaku'
                ],
                name='unique_beban_belajar_program_semester'
            )
        ]

    def __str__(self):
        return (
            f"{self.program_belajar.nama} - "
            f"{self.semester} - {self.target_skk} SKK"
        )

class Announcement(models.Model):
    CATEGORY_CHOICES = [
        ('PENGUMUMAN', 'Pengumuman'),
        ('PENTING', 'Penting'),
        ('INFO', 'Info'),
    ]

    PRIORITY_CHOICES = [
        ('Tinggi', 'Tinggi'),
        ('Sedang', 'Sedang'),
        ('Rendah', 'Rendah'),
    ]

    TARGET_CHOICES = [
        ('Semua', 'Semua'),
        ('Siswa', 'Siswa'),
        ('Guru', 'Guru'),
    ]

    STATUS_CHOICES = [
        ('Aktif', 'Aktif'),
        ('Draft', 'Draft'),
        ('Terjadwal', 'Terjadwal'),
        ('Nonaktif', 'Nonaktif'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    judul = models.CharField(max_length=255)
    isi = models.TextField()

    gambar = models.TextField(
        blank=True,
        default=''
    )

    lampiran_pdf = models.TextField(
        blank=True,
        default=''
    )

    kategori = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='PENGUMUMAN'
    )

    prioritas = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='Sedang'
    )

    target = models.CharField(
        max_length=20,
        choices=TARGET_CHOICES,
        default='Semua'
    )

    tanggal_publikasi = models.DateField()

    tanggal_berakhir = models.DateField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Aktif'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements_created'
    )

    created_role = models.CharField(
        max_length=20,
        default='admin'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = [
            '-tanggal_publikasi',
            '-created_at'
        ]

    def __str__(self):
        return self.judul

class LibraryBook(models.Model):
    SOURCE_CHOICES = [
        ('PDF', 'Upload PDF'),
        ('LINK', 'Link Ebook'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Menunggu Persetujuan Admin'),
        ('PUBLISHED', 'Publik'),
        ('ARCHIVED', 'Arsip'),
        ('REJECTED', 'Ditolak'),
    ]

    PROGRAM_CHOICES = [
        ('SEMUA', 'Semua Program'),
        ('PAKET_A', 'Paket A'),
        ('PAKET_B', 'Paket B'),
        ('PAKET_C', 'Paket C'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    judul = models.CharField(max_length=255)
    penulis = models.CharField(max_length=255, blank=True, default='')
    kategori = models.CharField(max_length=100)
    mata_pelajaran = models.CharField(max_length=150, blank=True, default='')
    program = models.CharField(
        max_length=20,
        choices=PROGRAM_CHOICES,
        default='SEMUA'
    )
    kelas = models.CharField(max_length=150, blank=True, default='Semua Kelas')
    deskripsi = models.TextField(blank=True, default='')

    cover_url = models.TextField(blank=True, default='')
    source_type = models.CharField(
        max_length=10,
        choices=SOURCE_CHOICES,
        default='PDF'
    )
    file_url = models.TextField(blank=True, default='')
    ebook_url = models.TextField(blank=True, default='')

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT'
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='library_books_uploaded'
    )
    uploaded_role = models.CharField(max_length=20, default='ADMIN')

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='library_books_approved'
    )
    rejection_reason = models.TextField(blank=True, default='')

    views_count = models.PositiveIntegerField(default=0)
    downloads_count = models.PositiveIntegerField(default=0)

    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Buku Perpustakaan'
        verbose_name_plural = 'Buku Perpustakaan'

    def __str__(self):
        return self.judul


class AcademicDocument(models.Model):
    DOCUMENT_TYPES = [
        ('IJAZAH', 'Ijazah'),
        ('SKL', 'SKL'),
        ('TRANSKRIP', 'Transkrip Nilai'),
        ('SERTIFIKAT', 'Sertifikat'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Publish'),
        ('REVOKED', 'Dicabut'),
        ('ARCHIVED', 'Arsip'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='academic_documents'
    )
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES
    )
    title = models.CharField(max_length=255)
    document_number = models.CharField(
        max_length=100,
        unique=True
    )
    issue_date = models.DateField(null=True, blank=True)
    graduation_year = models.CharField(
        max_length=20,
        blank=True,
        default=''
    )
    file_url = models.TextField()
    verification_code = models.CharField(
        max_length=100,
        unique=True,
        default=uuid.uuid4
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT'
    )
    downloads_count = models.PositiveIntegerField(default=0)
    views_count = models.PositiveIntegerField(default=0)
    verification_notes = models.TextField(blank=True, default='')
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_academic_documents'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.document_number}"

class AcademicTranscript(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Publish'),
        ('REVOKED', 'Dicabut'),
        ('REPLACED', 'Diganti'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='academic_transcripts'
    )
    academic_year = models.CharField(max_length=20)
    semester = models.CharField(max_length=50)
    document_number = models.CharField(max_length=100, unique=True)
    verification_code = models.CharField(
        max_length=100,
        unique=True,
        default=uuid.uuid4
    )
    subjects = models.JSONField(default=list)
    kkm = models.DecimalField(max_digits=5, decimal_places=2, default=75)
    total_score = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    average_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    predicate = models.CharField(max_length=50, blank=True)
    issue_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_transcripts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.document_number} - {self.student.username}"

class StudentGrade(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='student_grades'
    )
    subject = models.ForeignKey(
        MataPelajaran,
        on_delete=models.CASCADE,
        related_name='student_grades'
    )
    academic_year = models.CharField(max_length=20)
    semester = models.CharField(max_length=50)
    final_grade = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )
    kkm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=75
    )
    status = models.CharField(
        max_length=30,
        default='BELUM_TUNTAS'
    )
    teacher_notes = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_student_grades'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (
            'student',
            'subject',
            'academic_year',
            'semester',
        )
        ordering = ['subject__nama']

    def __str__(self):
        return f"{self.student.username} - {self.subject} - {self.final_grade}"

class StudentBill(models.Model):
    BILL_TYPES = [
        ('PENDAFTARAN', 'Pendaftaran'),
        ('SPP', 'SPP Bulanan'),
    ]

    STATUS_CHOICES = [
        ('UNPAID', 'Belum Dibayar'),
        ('WAITING_CONFIRMATION', 'Menunggu Verifikasi'),
        ('PAID', 'Lunas'),
        ('DECLINED', 'Ditolak'),
        ('EXPIRED', 'Kedaluwarsa'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_bills'
    )
    bill_type = models.CharField(
        max_length=20,
        choices=BILL_TYPES
    )
    title = models.CharField(max_length=150)
    month = models.PositiveSmallIntegerField(null=True, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='UNPAID'
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        default=''
    )
    payment_proof = models.TextField(
        blank=True,
        default=''
    )
    rejection_reason = models.TextField(
        blank=True,
        default=''
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_student_bills'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'bill_type', 'month', 'year'],
                name='unique_student_monthly_bill'
            )
        ]

    def __str__(self):
        return f"{self.student.username} - {self.title}"


class PaymentSetting(models.Model):
    DISCOUNT_TYPES = [
        ('NONE', 'Tanpa Keringanan'),
        ('DISCOUNT', 'Diskon Persen'),
        ('SCHOLARSHIP', 'Beasiswa'),
    ]

    reg_fee_reguler = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=100000
    )
    reg_fee_karyawan = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=150000
    )
    spp_reguler = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=20000
    )
    spp_karyawan = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=100000
    )

    discount_type_reguler = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPES,
        default='NONE'
    )
    discount_value_reguler = models.PositiveSmallIntegerField(default=0)

    discount_type_karyawan = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPES,
        default='NONE'
    )
    discount_value_karyawan = models.PositiveSmallIntegerField(default=0)

    spp_discount_type_reguler = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPES,
        default='NONE'
    )
    spp_discount_value_reguler = models.PositiveSmallIntegerField(default=0)

    spp_discount_type_karyawan = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPES,
        default='NONE'
    )
    spp_discount_value_karyawan = models.PositiveSmallIntegerField(default=0)

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_payment_settings'
    )
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return 'Pengaturan Biaya Lulus.id'


class PaymentMethodSetting(models.Model):
    PROVIDER_CHOICES = [
        ('qris', 'QRIS'),
        ('bca', 'BCA'),
        ('mandiri', 'Mandiri'),
        ('bni', 'BNI'),
        ('gopay', 'GoPay'),
        ('ovo', 'OVO'),
        ('lainnya', 'Lainnya'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=150)
    provider = models.CharField(
        max_length=30,
        choices=PROVIDER_CHOICES
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ManualPaymentSetting(models.Model):
    nama_bank = models.CharField(max_length=100, blank=True, default='')
    no_rekening = models.CharField(max_length=100, blank=True, default='')
    pemilik_rekening = models.CharField(max_length=150, blank=True, default='')
    qris_url = models.TextField(blank=True, default='')
    instruksi = models.TextField(blank=True, default='')
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_manual_payment_settings'
    )
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return 'Pengaturan Pembayaran Manual'




class CapaianPembelajaran(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    mata_pelajaran = models.ForeignKey(
        MataPelajaran,
        on_delete=models.CASCADE,
        related_name='capaian_pembelajaran'
    )

    kode_cp = models.CharField(
        max_length=50
    )

    deskripsi = models.TextField()

    fase = models.CharField(
        max_length=20,
        blank=True,
        default=''
    )

    tahun = models.CharField(
        max_length=10,
        default='2025'
    )

    aktif = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.kode_cp} - {self.mata_pelajaran.nama}"


class Competency(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    subject = models.ForeignKey(
        MataPelajaran,
        on_delete=models.CASCADE,
        related_name='competencies'
    )

    cp = models.ForeignKey(
        CapaianPembelajaran,
        on_delete=models.CASCADE,
        related_name='competencies',
        null=True,
        blank=True
    )

    nama_kompetensi = models.TextField()

    bobot_skk = models.PositiveIntegerField(
        default=1
    )

    semester = models.CharField(
        max_length=20,
        blank=True,
        default=''
    )

    aktif = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.subject.nama} - {self.nama_kompetensi}"


class StudentCompetency(models.Model):

    STATUS_CHOICES = [
        ('belum', 'Belum Tercapai'),
        ('proses', 'Dalam Proses'),
        ('tercapai', 'Tercapai'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='student_competencies'
    )

    competency = models.ForeignKey(
        Competency,
        on_delete=models.CASCADE,
        related_name='student_results'
    )

    grade = models.ForeignKey(
        StudentGrade,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='belum'
    )

    nilai = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )

    bukti = models.TextField(
        blank=True,
        default=''
    )

    catatan_guru = models.TextField(
        blank=True,
        default=''
    )

    validated_by = models.ForeignKey(
        Teacher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_skk'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.student.username} - {self.competency.nama_kompetensi}"


class ChatConversation(models.Model):
    TYPE_CHOICES = [
        ('PRIVATE', 'Percakapan Pribadi'),
        ('BROADCAST', 'Broadcast Admin'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    conversation_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='PRIVATE'
    )

    title = models.CharField(
        max_length=200,
        blank=True,
        default=''
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_chat_conversations'
    )

    participants = models.ManyToManyField(
        User,
        through='ChatParticipant',
        related_name='chat_conversations'
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['conversation_type', 'updated_at']),
        ]

    def __str__(self):
        return self.title or f"Chat {self.id}"


class ChatParticipant(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('guru', 'Guru'),
        ('siswa', 'Siswa'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='conversation_participants'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_participations'
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )

    last_read_at = models.DateTimeField(
        null=True,
        blank=True
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['conversation', 'user'],
                name='unique_chat_participant'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'conversation']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class ChatMessage(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_chat_messages'
    )

    text = models.TextField(
        max_length=4000
    )

    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )

    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
        ]

    def __str__(self):
        return f"{self.sender.username}: {self.text[:50]}"

