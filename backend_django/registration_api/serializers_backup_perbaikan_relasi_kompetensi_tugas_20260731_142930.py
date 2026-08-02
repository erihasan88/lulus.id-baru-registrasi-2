from .models import StudentGrade, StudentBill, PaymentSetting, PaymentMethodSetting, ManualPaymentSetting, Competency, StudentCompetency, CapaianPembelajaran, ChatConversation, ChatParticipant, ChatMessage, IdentitasLembaga, MateriPembelajaran, TugasPembelajaran
from .models import AcademicTranscript
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StudentRegistration, PaymentInvoice, RejectionLog, AcademicYear, Teacher, Fase, MataPelajaran, Rombel, ProgramBelajar, BebanBelajar, Announcement, UserProfile

from .models import AcademicDocument
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
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    invoice = PaymentInvoiceSerializer(read_only=True)
    rejection_logs = RejectionLogSerializer(many=True, read_only=True)
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = StudentRegistration
        fields = ['user_id', 
            'id', 'username', 'email', 'program_paket', 'tipe_kelas',
            'registration_status', 'biodata', 'dokumen', 'catatan_admin',
            'invoice', 'rejection_logs', 'created_at', 'updated_at'
        ]


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = [
            'id',
            'nama',
            'semester',
            'tanggal_mulai',
            'tanggal_selesai',
            'aktif',
            'created_at',
            'updated_at'
        ]


class TeacherSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = Teacher
        fields = [
            'id',
            'user_id',
            'nama',
            'nip',
            'mapels',
            'kelas_list',
            'status',
            'rekening_type',
            'rekening_nomor',
            'rekening_nama',
            'is_wali_kelas',
            'tanda_tangan',
            'qr_tanda_tangan',
            'photo',
            'created_at',
            'updated_at'
        ]






class CapaianPembelajaranSerializer(serializers.ModelSerializer):
    mata_pelajaran_nama = serializers.ReadOnlyField(
        source='mata_pelajaran.nama'
    )

    class Meta:
        model = CapaianPembelajaran
        fields = [
            'id',
            'mata_pelajaran',
            'mata_pelajaran_nama',
            'kode_cp',
            'deskripsi',
            'fase',
            'tahun',
            'aktif',
            'created_at',
            'updated_at'
        ]

class MataPelajaranSerializer(serializers.ModelSerializer):
    class Meta:
        model = MataPelajaran
        fields = '__all__'


class FaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fase
        fields = '__all__'


class RombelSerializer(serializers.ModelSerializer):
    fase_detail = FaseSerializer(source='fase', read_only=True)

    class Meta:
        model = Rombel
        fields = [
            'id',
            'nama_rombel',
            'fase',
            'fase_detail',
            'sistem_belajar',
            'tahun_ajaran',
            'wali_tutor',
            'beban_belajar',
            'status',
            'created_at',
            'updated_at',
        ]

class ProgramBelajarSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramBelajar
        fields = '__all__'


class BebanBelajarSerializer(serializers.ModelSerializer):
    program_belajar_nama = serializers.CharField(
        source='program_belajar.nama',
        read_only=True
    )
    paket = serializers.CharField(
        source='program_belajar.paket',
        read_only=True
    )
    jalur = serializers.CharField(
        source='program_belajar.jalur',
        read_only=True
    )

    class Meta:
        model = BebanBelajar
        fields = '__all__'



class AnnouncementSerializer(serializers.ModelSerializer):
    lampiranPdf = serializers.CharField(
        source='lampiran_pdf',
        required=False,
        allow_blank=True
    )

    tanggalPublikasi = serializers.DateField(
        source='tanggal_publikasi'
    )

    tanggalBerakhir = serializers.DateField(
        source='tanggal_berakhir',
        required=False,
        allow_null=True
    )

    createdBy = serializers.SerializerMethodField()
    createdRole = serializers.CharField(
        source='created_role',
        read_only=True
    )

    createdAt = serializers.DateTimeField(
        source='created_at',
        read_only=True
    )

    updatedAt = serializers.DateTimeField(
        source='updated_at',
        read_only=True
    )

    class Meta:
        model = Announcement
        fields = [
            'id',
            'judul',
            'isi',
            'gambar',
            'lampiranPdf',
            'kategori',
            'prioritas',
            'target',
            'tanggalPublikasi',
            'tanggalBerakhir',
            'status',
            'createdBy',
            'createdRole',
            'createdAt',
            'updatedAt',
        ]

    def get_createdBy(self, obj):
        if not obj.created_by:
            return 'Admin'

        profile = getattr(obj.created_by, 'profile', None)

        if profile and getattr(profile, 'nama_lengkap', None):
            return profile.nama_lengkap

        return (
            obj.created_by.get_full_name()
            or obj.created_by.username
        )


# ==========================================
# PERPUSTAKAAN
# ==========================================
from .models import LibraryBook


class LibraryBookSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LibraryBook
        fields = [
            'id',
            'judul',
            'penulis',
            'kategori',
            'mata_pelajaran',
            'program',
            'kelas',
            'deskripsi',
            'cover_url',
            'source_type',
            'file_url',
            'ebook_url',
            'status',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_role',
            'approved_by',
            'approved_by_name',
            'rejection_reason',
            'views_count',
            'downloads_count',
            'published_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_role',
            'approved_by',
            'approved_by_name',
            'views_count',
            'downloads_count',
            'published_at',
            'created_at',
            'updated_at',
        ]

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return ''
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def get_approved_by_name(self, obj):
        if not obj.approved_by:
            return ''
        return obj.approved_by.get_full_name() or obj.approved_by.username

    def validate(self, attrs):
        source_type = attrs.get(
            'source_type',
            getattr(self.instance, 'source_type', 'PDF')
        )

        file_url = attrs.get(
            'file_url',
            getattr(self.instance, 'file_url', '')
        )

        ebook_url = attrs.get(
            'ebook_url',
            getattr(self.instance, 'ebook_url', '')
        )

        if source_type == 'PDF' and not file_url:
            raise serializers.ValidationError({
                'file_url': 'Alamat file PDF wajib diisi.'
            })

        if source_type == 'LINK' and not ebook_url:
            raise serializers.ValidationError({
                'ebook_url': 'Link ebook wajib diisi.'
            })

        return attrs


class AcademicDocumentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_username = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AcademicDocument
        fields = [
            'id',
            'student',
            'student_name',
            'student_username',
            'document_type',
            'title',
            'document_number',
            'issue_date',
            'graduation_year',
            'file_url',
            'verification_code',
            'status',
            'downloads_count',
            'views_count',
            'verification_notes',
            'revoked_at',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'verification_code',
            'downloads_count',
            'views_count',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_student_username(self, obj):
        return obj.student.username

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ''
        return (
            obj.created_by.get_full_name()
            or obj.created_by.username
        )


class AcademicTranscriptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_username = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AcademicTranscript
        fields = [
            'id',
            'student',
            'student_name',
            'student_username',
            'academic_year',
            'semester',
            'document_number',
            'verification_code',
            'subjects',
            'kkm',
            'total_score',
            'average_score',
            'predicate',
            'issue_date',
            'status',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'verification_code',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_student_username(self, obj):
        return obj.student.username

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ''
        return obj.created_by.get_full_name() or obj.created_by.username


class StudentGradeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentGrade
        fields = [
            'id', 'student', 'student_name',
            'subject', 'subject_name',
            'academic_year', 'semester',
            'final_grade', 'kkm', 'status',
            'teacher_notes', 'updated_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'updated_by',
            'created_at', 'updated_at',
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_subject_name(self, obj):
        return getattr(obj.subject, 'nama', str(obj.subject))


class StudentBillSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_username = serializers.ReadOnlyField(source='student.username')
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentBill
        fields = [
            'id',
            'student',
            'student_name',
            'student_username',
            'bill_type',
            'title',
            'month',
            'year',
            'amount',
            'due_date',
            'status',
            'payment_method',
            'payment_proof',
            'rejection_reason',
            'paid_at',
            'verified_by',
            'verified_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'verified_by',
            'verified_by_name',
            'paid_at',
            'created_at',
            'updated_at',
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_verified_by_name(self, obj):
        if not obj.verified_by:
            return ''
        return obj.verified_by.get_full_name() or obj.verified_by.username


class PaymentSettingSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentSetting
        fields = [
            'id',
            'reg_fee_reguler',
            'reg_fee_karyawan',
            'spp_reguler',
            'spp_karyawan',
            'discount_type_reguler',
            'discount_value_reguler',
            'discount_type_karyawan',
            'discount_value_karyawan',
            'spp_discount_type_reguler',
            'spp_discount_value_reguler',
            'spp_discount_type_karyawan',
            'spp_discount_value_karyawan',
            'updated_by',
            'updated_by_name',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'updated_by',
            'updated_by_name',
            'updated_at',
        ]

    def get_updated_by_name(self, obj):
        if not obj.updated_by:
            return ''
        return obj.updated_by.get_full_name() or obj.updated_by.username


class PaymentMethodSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethodSetting
        fields = [
            'id',
            'name',
            'provider',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]


class ManualPaymentSettingSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ManualPaymentSetting
        fields = [
            'id',
            'nama_bank',
            'no_rekening',
            'pemilik_rekening',
            'qris_url',
            'instruksi',
            'updated_by',
            'updated_by_name',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'updated_by',
            'updated_by_name',
            'updated_at',
        ]

    def get_updated_by_name(self, obj):
        if not obj.updated_by:
            return ''
        return obj.updated_by.get_full_name() or obj.updated_by.username


class CompetencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Competency
        fields = '__all__'


class StudentCompetencySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentCompetency
        fields = '__all__'



class ChatParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    nama = serializers.SerializerMethodField()

    class Meta:
        model = ChatParticipant
        fields = [
            'id',
            'user_id',
            'username',
            'nama',
            'role',
            'last_read_at',
            'joined_at',
        ]

    def get_nama(self, obj):
        profile = getattr(obj.user, 'profile', None)
        if profile and profile.nama_lengkap:
            return profile.nama_lengkap

        teacher = getattr(obj.user, 'teacher_profile', None)
        if teacher and teacher.nama:
            return teacher.nama

        registration = getattr(obj.user, 'registration', None)
        if registration and isinstance(registration.biodata, dict):
            return (
                registration.biodata.get('nama_lengkap')
                or registration.biodata.get('nama')
                or obj.user.get_full_name()
                or obj.user.username
            )

        return obj.user.get_full_name() or obj.user.username


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'conversation',
            'sender_id',
            'sender_name',
            'sender_role',
            'text',
            'reply_to',
            'is_deleted',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'conversation',
            'sender_id',
            'sender_name',
            'sender_role',
            'is_deleted',
            'created_at',
        ]

    def get_sender_name(self, obj):
        profile = getattr(obj.sender, 'profile', None)
        if profile and profile.nama_lengkap:
            return profile.nama_lengkap

        teacher = getattr(obj.sender, 'teacher_profile', None)
        if teacher and teacher.nama:
            return teacher.nama

        registration = getattr(obj.sender, 'registration', None)
        if registration and isinstance(registration.biodata, dict):
            return (
                registration.biodata.get('nama_lengkap')
                or registration.biodata.get('nama')
                or obj.sender.get_full_name()
                or obj.sender.username
            )

        return obj.sender.get_full_name() or obj.sender.username

    def get_sender_role(self, obj):
        if obj.sender.is_staff:
            return 'admin'

        profile = getattr(obj.sender, 'profile', None)
        if profile:
            return profile.role

        if hasattr(obj.sender, 'teacher_profile'):
            return 'guru'

        return 'siswa'


class ChatConversationSerializer(serializers.ModelSerializer):
    participants = ChatParticipantSerializer(
        source='conversation_participants',
        many=True,
        read_only=True
    )
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            'id',
            'conversation_type',
            'title',
            'participants',
            'last_message',
            'unread_count',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def get_last_message(self, obj):
        message = obj.messages.filter(is_deleted=False).order_by('-created_at').first()
        if not message:
            return None
        return ChatMessageSerializer(message).data

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0

        participant = obj.conversation_participants.filter(
            user=request.user
        ).first()

        messages = obj.messages.filter(
            is_deleted=False
        ).exclude(sender=request.user)

        if participant and participant.last_read_at:
            messages = messages.filter(
                created_at__gt=participant.last_read_at
            )

        return messages.count()

class IdentitasLembagaSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentitasLembaga
        fields = [
            'id',
            'nama_pkbm',
            'nama_yayasan',
            'npsn',
            'nomor_izin_operasional',
            'alamat',
            'kecamatan',
            'kabupaten',
            'provinsi',
            'kode_pos',
            'nomor_telepon',
            'email_lembaga',
            'website',
            'logo_pkbm',
            'logo_yayasan',
            'atribut_pengesahan_digital',
            'nama_kepala_sekolah',
            'nip_kepala_sekolah',
            'nama_penandatangan',
            'updated_at',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'updated_at',
            'created_at',
        ]

# ==========================================
# PROFIL ADMIN
# ==========================================
class AdminProfileSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(
        required=False,
        allow_blank=True
    )
    nama_lengkap = serializers.CharField(max_length=150)
    role = serializers.CharField(read_only=True)

    def validate_username(self, value):
        user = self.context['request'].user

        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError(
                'Username sudah digunakan.'
            )

        return value

    def update(self, instance, validated_data):
        profile, _ = UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'nama_lengkap': (
                    instance.get_full_name()
                    or instance.username
                ),
                'role': 'admin'
            }
        )

        instance.username = validated_data.get(
            'username',
            instance.username
        )
        instance.email = validated_data.get(
            'email',
            instance.email
        )
        instance.save(update_fields=['username', 'email'])

        profile.nama_lengkap = validated_data.get(
            'nama_lengkap',
            profile.nama_lengkap
        )
        profile.role = 'admin'
        profile.save(
            update_fields=[
                'nama_lengkap',
                'role',
                'updated_at'
            ]
        )

        return instance

    def to_representation(self, instance):
        profile, _ = UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'nama_lengkap': (
                    instance.get_full_name()
                    or instance.username
                ),
                'role': 'admin'
            }
        )

        return {
            'id': str(instance.id),
            'username': instance.username,
            'email': instance.email,
            'nama_lengkap': profile.nama_lengkap,
            'role': profile.role,
        }


# ==========================================
# MATERI PEMBELAJARAN
# ==========================================
class MateriPembelajaranSerializer(serializers.ModelSerializer):
    guru_nama = serializers.ReadOnlyField(
        source='guru.nama'
    )
    mata_pelajaran_nama = serializers.ReadOnlyField(
        source='mata_pelajaran.nama'
    )
    kompetensi_nama = serializers.ReadOnlyField(
        source='kompetensi.nama_kompetensi'
    )
    bobot_skk = serializers.ReadOnlyField(
        source='kompetensi.bobot_skk'
    )
    rombel_nama = serializers.ReadOnlyField(
        source='rombel.nama_rombel'
    )
    tahun_ajaran = serializers.ReadOnlyField(
        source='rombel.tahun_ajaran.nama'
    )
    semester = serializers.ReadOnlyField(
        source='rombel.tahun_ajaran.semester'
    )

    class Meta:
        model = MateriPembelajaran
        fields = [
            'id',
            'guru',
            'guru_nama',
            'mata_pelajaran',
            'mata_pelajaran_nama',
            'kompetensi',
            'kompetensi_nama',
            'bobot_skk',
            'rombel',
            'rombel_nama',
            'tahun_ajaran',
            'semester',
            'judul',
            'isi',
            'nomor_pertemuan',
            'video_url',
            'file_modul',
            'file_lampiran',
            'tanggal_publikasi',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'guru',
            'guru_nama',
            'mata_pelajaran_nama',
            'kompetensi_nama',
            'bobot_skk',
            'rombel_nama',
            'tahun_ajaran',
            'semester',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        mata_pelajaran = attrs.get(
            'mata_pelajaran',
            getattr(self.instance, 'mata_pelajaran', None)
        )
        kompetensi = attrs.get(
            'kompetensi',
            getattr(self.instance, 'kompetensi', None)
        )
        rombel = attrs.get(
            'rombel',
            getattr(self.instance, 'rombel', None)
        )

        if kompetensi and mata_pelajaran:
            if kompetensi.subject_id != mata_pelajaran.id:
                raise serializers.ValidationError({
                    'kompetensi': (
                        'Kompetensi harus berasal dari mata pelajaran '
                        'yang dipilih.'
                    )
                })

        if mata_pelajaran and rombel:
            if (
                mata_pelajaran.paket
                and rombel.fase.paket
                and mata_pelajaran.paket != rombel.fase.paket
            ):
                raise serializers.ValidationError({
                    'rombel': (
                        'Rombel tidak sesuai dengan paket mata pelajaran.'
                    )
                })

        return attrs

class TugasPembelajaranSerializer(serializers.ModelSerializer):
    guru_nama = serializers.CharField(
        source='guru.nama',
        read_only=True
    )
    mata_pelajaran_nama = serializers.CharField(
        source='mata_pelajaran.nama',
        read_only=True
    )
    kompetensi_nama = serializers.CharField(
        source='kompetensi.nama',
        read_only=True
    )
    bobot_skk = serializers.IntegerField(
        source='kompetensi.bobot_skk',
        read_only=True
    )
    rombel_nama = serializers.CharField(
        source='rombel.nama_rombel',
        read_only=True
    )
    program = serializers.CharField(
        source='rombel.program_paket',
        read_only=True
    )
    semester = serializers.CharField(
        source='rombel.semester',
        read_only=True
    )
    tahun_ajaran = serializers.CharField(
        source='rombel.tahun_ajaran.nama',
        read_only=True
    )

    class Meta:
        model = TugasPembelajaran
        fields = [
            'id',
            'guru',
            'guru_nama',
            'mata_pelajaran',
            'mata_pelajaran_nama',
            'kompetensi',
            'kompetensi_nama',
            'bobot_skk',
            'rombel',
            'rombel_nama',
            'program',
            'semester',
            'tahun_ajaran',
            'judul',
            'deskripsi',
            'nomor_pertemuan',
            'video_url',
            'file_lampiran',
            'tanggal_mulai',
            'batas_pengumpulan',
            'nilai_maksimum',
            'bobot_nilai',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'guru',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        mata_pelajaran = attrs.get(
            'mata_pelajaran',
            getattr(self.instance, 'mata_pelajaran', None)
        )
        kompetensi = attrs.get(
            'kompetensi',
            getattr(self.instance, 'kompetensi', None)
        )
        rombel = attrs.get(
            'rombel',
            getattr(self.instance, 'rombel', None)
        )
        tanggal_mulai = attrs.get(
            'tanggal_mulai',
            getattr(self.instance, 'tanggal_mulai', None)
        )
        batas_pengumpulan = attrs.get(
            'batas_pengumpulan',
            getattr(self.instance, 'batas_pengumpulan', None)
        )

        if kompetensi and kompetensi.mata_pelajaran_id != mata_pelajaran.id:
            raise serializers.ValidationError({
                'kompetensi':
                    'Kompetensi tidak sesuai dengan mata pelajaran.'
            })

        if (
            rombel and
            mata_pelajaran and
            hasattr(mata_pelajaran, 'program_paket') and
            mata_pelajaran.program_paket and
            mata_pelajaran.program_paket != rombel.program_paket
        ):
            raise serializers.ValidationError({
                'mata_pelajaran':
                    'Program mata pelajaran tidak sesuai dengan rombel.'
            })

        if (
            tanggal_mulai and
            batas_pengumpulan and
            batas_pengumpulan < tanggal_mulai
        ):
            raise serializers.ValidationError({
                'batas_pengumpulan':
                    'Batas pengumpulan tidak boleh sebelum tanggal mulai.'
            })

        return attrs

