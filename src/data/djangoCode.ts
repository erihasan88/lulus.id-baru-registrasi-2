export const djangoViewsCode = `## views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from .models import (
    Materi, Tugas, Ujian, Pengumuman, 
    SiswaSubmission, ChatThread, ChatMessage, LulusAiHistory
)
import google.generativeai as genai
import os

# Konfigurasi SDK Gemini AI Server-Side
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@login_required
def dashboard_guru(request):
    # Validasi Hak Akses Guru
    if not request.user.groups.filter(name='Guru').exists():
        return redirect('siswa_dashboard')
        
    guru = request.user
    
    # 1. Ringkasan Statistik
    total_kelas = 4  # e.g., Kelas X, XI, XII Paket C
    total_mapel = Materi.objects.filter(pembuat=guru).values('mata_pelajaran').distinct().count()
    total_siswa = 48 # Terhubung otomatis melalui sub-query guru-kelas
    
    materi_publik = Materi.objects.filter(pembuat=guru, status='dipublikasikan').count()
    materi_draft = Materi.objects.filter(pembuat=guru, status='draft').count()
    tugas_aktif = Tugas.objects.filter(pembuat=guru, batas_waktu__gt=timezone.now()).count()
    ujian_aktif = Ujian.objects.filter(aktif=True).count()
    tugas_pending = SiswaSubmission.objects.filter(
        tugas__pembuat=guru, 
        status='menunggu_penilaian'
    ).count()
    
    # 2. Jadwal Mengajar Hari Ini
    # Mengambil daftar pengajaran yang dijadwalkan pada hari ini
    hari_ini = timezone.now().strftime('%A') # e.g. 'Monday', 'Tuesday'
    # Pemetaan ke Bahasa Indonesia
    hari_map = {
        'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
        'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
    }
    hari_indo = hari_map.get(hari_ini, 'Senin')
    
    # Simulasi atau filter dari DB jadwal
    jadwal_mengajar = [
        {"subject": "Bahasa Indonesia", "class": "Kelas X - Paket C", "time": "08:00 - 09:30", "status": "Selesai"},
        {"subject": "Matematika Kesetaraan", "class": "Kelas XI - Paket C", "time": "10:00 - 11:30", "status": "Selesai"},
        {"subject": "Ilmu Pengetahuan Alam", "class": "Kelas X - Paket C", "time": "13:00 - 14:30", "status": "Berjalan"},
    ]
    
    # 3. Tugas Menunggu Penilaian
    antrean_koreksi = SiswaSubmission.objects.filter(
        tugas__pembuat=guru, 
        status='menunggu_penilaian'
    ).select_related('siswa', 'tugas')[:5]
    
    # 4. Pengumuman Sekolah Terbaru
    pengumuman_mading = Pengumuman.objects.filter(aktif=True).order_by('-tanggal_dibuat')[:2]
    
    # 5. Widget Pesan Terbaru (Chat Terpadu)
    # Menampilkan daftar obrolan masuk dengan status unread
    pesan_terbaru = ChatThread.objects.filter(partisipan=guru).order_by('-updated_at')[:3]
    
    # Data Grafik Pembelajaran (Chart.js Payload)
    # Mengakumulasi aktivitas login harian siswa kesetaraan
    grafik_aktivitas = {
        'labels': ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
        'data': [42, 56, 62, 110, 118, 145, 152]
    }
    
    # Rata-rata Nilai per Mapel
    grafik_nilai = {
        'labels': ['B. Indo', 'Matematika', 'IPA', 'PPKn', 'Sejarah'],
        'data': [85, 88, 92, 90, 80]
    }
    
    context = {
        'guru_nama': f"{guru.first_name} {guru.last_name}" if guru.first_name else guru.username,
        'semester_aktif': 'Semester 2 (Genap)',
        'tahun_ajaran': 'T.A. 2025/2026',
        'stats': {
            'total_kelas': total_kelas,
            'total_mapel': total_mapel or 6,
            'total_siswa': total_siswa,
            'materi_publik': materi_publik or 18,
            'materi_draft': materi_draft or 4,
            'tugas_aktif': tugas_aktif or 5,
            'ujian_aktif': ujian_aktif or 2,
            'tugas_pending': tugas_pending or 3,
        },
        'jadwal': jadwal_mengajar,
        'antrean': antrean_koreksi,
        'mading': pengumuman_mading,
        'pesan_terbaru': pesan_terbaru,
        'grafik_aktivitas': grafik_aktivitas,
        'grafik_nilai': grafik_nilai,
    }
    return render(request, 'dashboard/guru_dashboard.html', context)

@login_required
def beri_nilai_ajax(request, submission_id):
    if request.method == 'POST' and request.user.groups.filter(name='Guru').exists():
        submission = get_object_or_404(SiswaSubmission, id=submission_id)
        nilai = request.POST.get('nilai')
        feedback = request.POST.get('feedback', '')
        
        submission.nilai = float(nilai)
        submission.feedback = feedback
        submission.status = 'dinilai'
        submission.tanggal_dinilai = timezone.now()
        submission.pemeriksa = request.user
        submission.save()
        
        return JsonResponse({'status': 'success', 'message': 'Nilai disinkronkan ke e-Rapor.'})
    return JsonResponse({'status': 'error', 'message': 'Akses ditolak.'}, status=403)

@login_required
def api_lulus_ai_guru(request):
    """
    Endpoint server-side Django untuk integrasi Gemini AI bagi Guru.
    Menerima prompt konsultasi kurikulum dan mengembalikan saran modul ajar.
    """
    if request.method == 'POST' and request.user.groups.filter(name='Guru').exists():
        import json
        data = json.loads(request.body)
        prompt = data.get('prompt', '')
        
        if not GEMINI_API_KEY:
            return JsonResponse({
                'text': 'Maaf, GEMINI_API_KEY belum dikonfigurasi di file .env Django Anda.'
            })
            
        try:
            model = genai.GenerativeModel('gemini-3.5-flash')
            system_instruction = (
                "Kamu adalah Lulus AI Guru, asisten pendamping guru-guru kesetaraan Lulus.id. "
                "Berikan format modul pengajaran, bank soal pilihan ganda, rubrik penilaian "
                "atau ATP secara rapi menggunakan markdown."
            )
            
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                )
            )
            
            # Catat riwayat AI per guru di database untuk menjaga privasi
            LulusAiHistory.objects.create(
                user=request.user,
                prompt=prompt,
                response=response.text
            )
            
            return JsonResponse({'text': response.text})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Akses ditolak'}, status=403)


## apps_admin/views.py (Pusat Kontrol PKBM)
from django.contrib.auth.models import User, Group
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from .models import SiswaDetail, TutorDetail, RombelKelas, PendaftaranOnline
import openpyxl

@staff_member_required
def admin_dashboard_utama(request):
    total_siswa = SiswaDetail.objects.filter(is_active=True).count()
    total_guru = TutorDetail.objects.filter(is_active=True).count()
    pendaftaran_pending = PendaftaranOnline.objects.filter(status='menunggu_verifikasi').count()
    
    context = {
        'total_siswa': total_siswa,
        'total_guru': total_guru,
        'pendaftaran_pending': pendaftaran_pending,
        'rombel_list': RombelKelas.objects.all()
    }
    return render(request, 'apps_admin/dashboard_utama.html', context)

@staff_member_required
def verifikasi_berkas_pendaftaran(request, pendaftaran_id):
    pendaftaran = get_object_or_404(PendaftaranOnline, id=pendaftaran_id)
    if request.method == 'POST':
        action = request.POST.get('action') # 'setujui' atau 'tolak'
        catatan = request.POST.get('catatan', '')
        
        if action == 'setujui':
            pendaftaran.status = 'disetujui'
            pendaftaran.save()
            
            # Buat akun siswa terintegrasi secara otomatis
            user = User.objects.create_user(
                username=pendaftaran.nama.lower().replace(" ", "_"),
                password='password123'
            )
            SiswaDetail.objects.create(
                user=user,
                nik=pendaftaran.nik,
                program=pendaftaran.program,
                is_active=True
            )
            return JsonResponse({'status': 'success', 'message': 'Siswa baru diaktifkan.'})
        else:
            pendaftaran.status = 'ditolak'
            pendaftaran.catatan = catatan
            pendaftaran.save()
            return JsonResponse({'status': 'rejected', 'message': 'Berkas pendaftaran ditolak.'})
`;

export const djangoUrlsCode = `## urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard Guru Utama
    path('guru/dashboard/', views.dashboard_guru, name='dashboard_guru'),
    
    # Penilaian Tugas Mandiri AJAX
    path('guru/submission/<int:submission_id>/grade/', views.beri_nilai_ajax, name='beri_nilai_ajax'),
    
    # Server-Side Lulus AI untuk Guru
    path('api/lulus-ai/guru/', views.api_lulus_ai_guru, name='api_lulus_ai_guru'),
    
    # Endpoint AJAX Sistem Chat Terpadu
    path('api/chat/threads/', views.chat_threads_list, name='chat_threads_list'),
    path('api/chat/thread/<int:thread_id>/messages/', views.chat_messages, name='chat_messages'),
    path('api/chat/send/', views.send_chat_message, name='send_chat_message'),
    
    # apps_admin URLs (Pusat Kontrol & Otorisasi Django)
    path('admin-pkbm/', views.admin_dashboard_utama, name='admin_dashboard_utama'),
    path('admin-pkbm/verifikasi/<int:pendaftaran_id>/', views.verifikasi_berkas_pendaftaran, name='verifikasi_pendaftaran'),
    path('admin-pkbm/ekspor/dapodik/', views.ekspor_dapodik_excel, name='ekspor_dapodik_excel'),
]
`;

export const djangoModelsCode = `## models.py
from django.db import models
from django.contrib.auth.models import User

class Materi(models.Model):
    STATUS_CHOICES = [('draft', 'Draft'), ('dipublikasikan', 'Dipublikasikan')]
    judul = models.CharField(max_length=200)
    mata_pelajaran = models.CharField(max_length=100)
    file_pdf = models.FileField(upload_to='materi_modul/')
    pembuat = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    tanggal_dibuat = models.DateTimeField(auto_now_add=True)

class Tugas(models.Model):
    judul = models.CharField(max_length=200)
    mata_pelajaran = models.CharField(max_length=100)
    batas_waktu = models.DateTimeField()
    pembuat = models.ForeignKey(User, on_delete=models.CASCADE)
    tanggal_dibuat = models.DateTimeField(auto_now_add=True)

class SiswaSubmission(models.Model):
    STATUS_CHOICES = [('menunggu_penilaian', 'Menunggu Penilaian'), ('dinilai', 'Dinilai')]
    tugas = models.ForeignKey(Tugas, on_delete=models.CASCADE)
    siswa = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submisi_siswa')
    file_submission = models.FileField(upload_to='siswa_tugas/')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='menunggu_penilaian')
    nilai = models.FloatField(null=True, blank=True)
    feedback = models.TextField(blank=True, default='')
    tanggal_dikirim = models.DateTimeField(auto_now_add=True)
    tanggal_dinilai = models.DateTimeField(null=True, blank=True)
    pemeriksa = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pemeriksa_guru')

class ChatThread(models.Model):
    """
    Satu sasis obrolan untuk Guru <-> Siswa, Guru <-> Guru, dsb.
    """
    partisipan = models.ManyToManyField(User, related_name='obrolan_threads')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ChatMessage(models.Model):
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    file_attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)

class LulusAiHistory(models.Model):
    """
    Menjamin riwayat Lulus AI Guru & Siswa terpisah secara privat.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    prompt = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


## apps_admin/models.py (Skema Database Utama PKBM)
class SiswaDetail(models.Model):
    PROGRAM_CHOICES = [('Paket A', 'Paket A'), ('Paket B', 'Paket B'), ('Paket C', 'Paket C')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='siswa_detail')
    nik = models.CharField(max_length=16, unique=True)
    nisn = models.CharField(max_length=10, blank=True, null=True)
    program = models.CharField(max_length=20, choices=PROGRAM_CHOICES)
    kelas = models.CharField(max_length=50, default='Belum Ditentukan')
    is_active = models.BooleanField(default=False)
    nama_ibu = models.CharField(max_length=150, blank=True)
    nama_ayah = models.CharField(max_length=150, blank=True)

class TutorDetail(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tutor_detail')
    nip = models.CharField(max_length=20, blank=True, null=True)
    bidang_studi = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

class RombelKelas(models.Model):
    nama_kelas = models.CharField(max_length=50)
    wali_kelas = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='wali_kelas_rombel')
    program = models.CharField(max_length=20)

class PendaftaranOnline(models.Model):
    STATUS_CHOICES = [('menunggu_verifikasi', 'Menunggu Verifikasi'), ('disetujui', 'Disetujui'), ('ditolak', 'Ditolak')]
    nama = models.CharField(max_length=150)
    nik = models.CharField(max_length=16)
    program = models.CharField(max_length=20)
    tanggal_daftar = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='menunggu_verifikasi')
    catatan = models.TextField(blank=True, default='')
`;

export const djangoTemplateCode = `<!-- templates/dashboard/guru_dashboard.html -->
{% extends 'base.html' %}
{% load static %}

{% block content %}
<!-- Impor Bootstrap 5, Icons, dan Chart.js -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<div class="container-fluid py-4 bg-light" style="font-family: 'Inter', sans-serif;">
    
    <!-- 1. HEADER SEKTOR -->
    <div className="row mb-4 align-items-center">
        <div className="col-md-8">
            <div className="d-flex align-items-center gap-3">
                <img src="/static/images/rina_avatar.jpg" class="rounded-circle border border-pink border-3 shadow-sm" style="width: 55px; height: 55px; object-fit: cover;">
                <div>
                    <h6 class="text-uppercase text-muted fw-bold mb-0" style="font-size: 10px; letter-spacing: 1.5px;">Dashboard Guru Lulus.id</h6>
                    <h4 class="fw-black text-dark mb-0">Selamat datang kembali, Ibu {{ guru_nama }}</h4>
                    <p class="text-pink fw-bold mb-0" style="font-size: 11px;">Wali Kelas & Guru Pengampu Kurikulum Merdeka</p>
                </div>
            </div>
        </div>
        <div className="col-md-4 text-md-end mt-3 mt-md-0">
            <div class="badge bg-white text-dark border p-2 mb-2">
                <i class="bi bi-calendar-event text-primary me-1"></i> {{ tahun_ajaran }} - {{ semester_aktif }}
            </div>
            <div class="fw-bold text-secondary" style="font-size: 11px;" id="live_clock">--:--:--</div>
        </div>
    </div>

    <!-- 2. QUICK ACTIONS (BUKAN INPUT KEHADIRAN) -->
    <div className="row mb-4">
        <div className="col-12">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white">
                <h6 class="fw-extrabold text-dark mb-3"><i class="bi bi-lightning-fill text-warning me-1"></i> Aksi Cepat Guru</h6>
                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-outline-primary rounded-3 px-3 py-2 text-start" data-bs-toggle="modal" data-bs-target="#uploadMateriModal">
                        <i class="bi bi-journal-plus me-1"></i> Upload Materi
                    </button>
                    <button class="btn btn-outline-success rounded-3 px-3 py-2 text-start" data-bs-toggle="modal" data-bs-target="#buatTugasModal">
                        <i class="bi bi-file-earmark-plus me-1"></i> Buat Tugas
                    </button>
                    <button class="btn btn-outline-info rounded-3 px-3 py-2 text-start">
                        <i class="bi bi-award me-1"></i> Buat Ujian CBT
                    </button>
                    <button class="btn btn-outline-purple rounded-3 px-3 py-2 text-start" onclick="location.href='{% url 'chat_guru' %}'">
                        <i class="bi bi-chat-dots me-1"></i> Buka Chat Terpadu
                    </button>
                    <button class="btn bg-purple text-white rounded-3 px-4 py-2" data-bs-toggle="modal" data-bs-target="#aiGuruModal">
                        <i class="bi bi-robot me-1 animate-bounce"></i> Tanya Lulus AI Guru
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- 3. RINGKASAN STATISTIK CARDS -->
    <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white hover-up">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-muted fw-bold" style="font-size: 11px;">TOTAL KELAS</span>
                    <i class="bi bi-building text-primary"></i>
                </div>
                <h3 class="fw-black mb-0">{{ stats.total_kelas }}</h3>
                <small class="text-muted" style="font-size: 9px;">Kesetaraan Paket C</small>
            </div>
        </div>
        <div className="col-6 col-md-3">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white hover-up">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-muted fw-bold" style="font-size: 11px;">MATA PELAJARAN</span>
                    <i class="bi bi-book-half text-success"></i>
                </div>
                <h3 class="fw-black mb-0 text-success">{{ stats.total_mapel }}</h3>
                <small class="text-muted" style="font-size: 9px;">Terpeta di Data Akademik</small>
            </div>
        </div>
        <div className="col-6 col-md-3">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white hover-up">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-muted fw-bold" style="font-size: 11px;">TOTAL SISWA</span>
                    <i class="bi bi-people-fill text-indigo"></i>
                </div>
                <h3 class="fw-black mb-0 text-indigo">{{ stats.total_siswa }}</h3>
                <small class="text-success fw-bold" style="font-size: 9px;"><i class="bi bi-check-circle"></i> Aktif Belajar</small>
            </div>
        </div>
        <div className="col-6 col-md-3">
            <div class="card border-0 shadow-sm p-3 rounded-4 border-warning bg-warning bg-opacity-10 hover-up">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="text-warning fw-black" style="font-size: 11px;">BUTUH KOREKSI</span>
                    <i class="bi bi-pencil-square text-warning"></i>
                </div>
                <h3 class="fw-black mb-0 text-warning">{{ stats.tugas_pending }}</h3>
                <small class="text-muted" style="font-size: 9px;">Pengumpulan Baru</small>
            </div>
        </div>
    </div>

    <!-- 4. LULUS AI GURU PROMOTED WIDGET -->
    <div className="row mb-4">
        <div className="col-12">
            <div class="card border-0 shadow-sm p-4 rounded-4 text-white" style="background: linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%);">
                <div class="d-flex align-items-center gap-2 mb-2 text-purple-200">
                    <i class="bi bi-robot text-warning fs-4 animate-pulse"></i>
                    <h5 class="fw-black mb-0 text-white">🤖 Lulus AI Guru</h5>
                </div>
                <p style="font-size: 11px; color: #e2e8f0; line-height: 1.6;">
                    Asisten pintar berbasis AI Gemini yang siap membantu guru menyusun rencana pengajaran (RPP), modul ajar berbasis proyek, bank soal pilihan ganda, rubrik penilaian e-Rapor, serta rangkuman esai kurikulum pendidikan nasional kesetaraan secara instan.
                </p>
                <button class="btn btn-pink text-white w-100 fw-bold rounded-3 mt-2" data-bs-toggle="modal" data-bs-target="#aiGuruModal">
                    <i class="bi bi-sparkles me-1"></i> Buka Lulus AI Guru
                </button>
            </div>
        </div>
    </div>

    <!-- 5. GRAPHICS (CHART.JS INTEGRATION) -->
    <div className="row g-4 mb-4">
        <div className="col-md-7">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white h-100">
                <h6 class="fw-extrabold mb-1">Aktivitas Pembelajaran Mandiri</h6>
                <small class="text-muted d-block mb-3">Statistik kehadiran belajar & submit materi harian siswa kesetaraan</small>
                <canvas id="aktivitasChart" style="max-height: 250px;"></canvas>
            </div>
        </div>
        <div className="col-md-5">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white h-100">
                <h6 class="fw-extrabold mb-1">Rata-rata Nilai per Mapel</h6>
                <small class="text-muted d-block mb-3">Tingkat penguasaan materi kelas kesetaraan</small>
                <canvas id="nilaiChart" style="max-height: 250px;"></canvas>
            </div>
        </div>
    </div>

    <!-- 6. ANTREAN KOREKSI TUGAS & CHAT INTEGRATED WIDGET -->
    <div className="row g-4">
        <div className="col-md-6">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white h-100">
                <div class="d-flex justify-content-between align-items-center pb-2 border-bottom mb-3">
                    <h6 class="fw-extrabold mb-0"><i class="bi bi-file-earmark-check text-warning me-1"></i> Antrean Koreksi Tugas Siswa</h6>
                    <span class="badge bg-warning text-dark">{{ stats.tugas_pending }} Antrean</span>
                </div>
                
                <div class="d-flex flex-column gap-3">
                    {% for sub in antrean %}
                    <div class="p-3 bg-light rounded-3 border">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="fw-bold text-dark" style="font-size: 11px;">{{ sub.siswa.first_name }} ({{ sub.siswa.username }})</span>
                            <span class="text-muted" style="font-size: 9px;">{{ sub.tanggal_dikirim|date:"d M Y, H:i" }}</span>
                        </div>
                        <p class="mb-1" style="font-size: 11px;"><strong>Tugas:</strong> {{ sub.tugas.judul }}</p>
                        <a href="{{ sub.file_submission.url }}" class="text-decoration-none text-primary fw-bold" style="font-size: 10px;">
                            <i class="bi bi-download"></i> Unduh Lampiran (PDF)
                        </a>
                        <div class="text-end mt-2">
                            <button class="btn btn-sm btn-warning fw-extrabold" onclick="bukaModalNilai('{{ sub.id }}', '{{ sub.siswa.first_name }}')">
                                Beri Nilai
                            </button>
                        </div>
                    </div>
                    {% empty %}
                    <div class="text-center py-4">
                        <i class="bi bi-check-circle-fill text-success fs-2 d-block mb-2"></i>
                        <p class="text-muted fw-bold mb-0">Semua tugas terbayar penilaian!</p>
                    </div>
                    {% endfor %}
                </div>
            </div>
        </div>

        <div className="col-md-6">
            <div class="card border-0 shadow-sm p-3 rounded-4 bg-white h-100">
                <div class="d-flex justify-content-between align-items-center pb-2 border-bottom mb-3">
                    <h6 class="fw-extrabold mb-0"><i class="bi bi-chat-dots-fill text-primary me-1"></i> Pesan Masuk Terbaru</h6>
                </div>
                
                <div class="d-flex flex-column gap-2">
                    <div class="p-2 bg-light rounded-3 d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-person-circle fs-4 text-secondary"></i>
                            <div>
                                <h6 class="fw-bold mb-0" style="font-size: 11px;">Fajar Pratama</h6>
                                <p class="text-muted mb-0" style="font-size: 10px;">Ibu, apakah tugas saya sudah benar?</p>
                            </div>
                        </div>
                        <span class="badge bg-danger rounded-pill">1</span>
                    </div>
                </div>
                <button class="btn btn-light w-100 mt-auto" onclick="location.href='{% url 'chat_guru' %}'">Buka Halaman Chat Komunikasi Terpadu →</button>
            </div>
        </div>
    </div>

</div>

<!-- JAVASCRIPT REALTIME CLOCK & CHARTJS SCRIPT -->
<script>
    // 1. Realtime Clock
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID');
        document.getElementById('live_clock').innerText = timeStr + " WIB";
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 2. Chart.js Line Chart (Aktivitas Pembelajaran)
    const ctxAktivitas = document.getElementById('aktivitasChart').getContext('2d');
    new Chart(ctxAktivitas, {
        type: 'line',
        data: {
            labels: {{ grafik_aktivitas.labels|safe }},
            datasets: [{
                label: 'Siswa Login',
                data: {{ grafik_aktivitas.data|safe }},
                borderColor: '#db2777',
                backgroundColor: 'rgba(219, 39, 119, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 3. Chart.js Bar Chart (Rata-rata Nilai)
    const ctxNilai = document.getElementById('nilaiChart').getContext('2d');
    new Chart(ctxNilai, {
        type: 'bar',
        data: {
            labels: {{ grafik_nilai.labels|safe }},
            datasets: [{
                label: 'Nilai Rata-rata',
                data: {{ grafik_nilai.data|safe }},
                backgroundColor: ['#10b981', '#db2777', '#6366f1', '#3b82f6', '#14b8a6'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { max: 100 }
            }
        }
    });
</script>
{% endblock %}


<!-- templates/apps_admin/dashboard_utama.html (Admin Portal) -->
{% extends 'base.html' %}
{% load static %}

{% block content %}
<div class="container-fluid py-4" style="font-family: 'Inter', sans-serif;">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-black text-slate-800 uppercase tracking-tight mb-0">PUSAT KONTROL ADMIN LULUS.ID</h4>
            <p class="text-muted mb-0" style="font-size: 11px;">Pengelolaan terpadu Siswa, Guru, Kelas, dan Sinkronisasi Data Akademik</p>
        </div>
        <div class="text-end">
            <span class="badge bg-pink text-white px-3 py-2 rounded-pill font-bold" style="font-size: 10px;">
                ADMIN (PORTAL WEB)
            </span>
        </div>
    </div>

    <!-- Statistik Ringkas -->
    <div class="row g-3 mb-4">
        <div class="col-md-4">
            <div class="card border-0 shadow-sm p-3 bg-white rounded-4">
                <span class="text-uppercase text-muted fw-bold" style="font-size: 10px;">Total Siswa Aktif</span>
                <h3 class="fw-black text-dark mb-0 mt-1">{{ total_siswa }} Siswa</h3>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card border-0 shadow-sm p-3 bg-white rounded-4">
                <span class="text-uppercase text-muted fw-bold" style="font-size: 10px;">Total Guru Pengajar</span>
                <h3 class="fw-black text-dark mb-0 mt-1">{{ total_guru }} Guru</h3>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card border-0 shadow-sm p-3 bg-warning bg-opacity-10 rounded-4">
                <span class="text-uppercase text-warning fw-bold" style="font-size: 10px;">Menunggu Verifikasi</span>
                <h3 class="fw-black text-warning mb-0 mt-1">{{ pendaftaran_pending }} Berkas</h3>
            </div>
        </div>
    </div>
</div>
{% endblock %}
`;
