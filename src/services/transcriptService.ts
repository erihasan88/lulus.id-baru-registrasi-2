import { AcademicTranscript, TranscriptSubject } from '../interfaces/academicTranscript';
import { Student, Subject } from '../types';

const STORAGE_KEY = 'lulus_transcripts';

// Initial default transcripts if none exist in localStorage
const createInitialTranscripts = (
  students: Student[],
  subjects: Subject[]
): AcademicTranscript[] => {
  return [];
};

export const transcriptService = {
  // Django REST Framework simulation: GET /api/transcripts/
  getTranscripts: (students: Student[] = [], subjects: Subject[] = []): AcademicTranscript[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing transcripts:', e);
      }
    }
    const initial = createInitialTranscripts(students, subjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  },

  // Save all transcripts (Django DRF equivalent: POST / PUT database batch)
  saveTranscripts: (transcripts: AcademicTranscript[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transcripts));
  },

  // GET /api/transcripts/?student_id={studentId}
  getTranscriptByStudentId: (studentId: string, students: Student[] = [], subjects: Subject[] = []): AcademicTranscript[] => {
    const all = transcriptService.getTranscripts(students, subjects);
    return all.filter(t => t.studentId === studentId);
  },

  // GET /api/transcripts/{id}/
  getTranscriptById: (id: string, students: Student[] = [], subjects: Subject[] = []): AcademicTranscript | undefined => {
    const all = transcriptService.getTranscripts(students, subjects);
    return all.find(t => t.id === id);
  },

  // POST /api/transcripts/
  createTranscript: (transcript: AcademicTranscript, students: Student[] = [], subjects: Subject[] = []): AcademicTranscript => {
    const all = transcriptService.getTranscripts(students, subjects);
    all.push(transcript);
    transcriptService.saveTranscripts(all);
    return transcript;
  },

  // PATCH /api/transcripts/{id}/
  updateTranscript: (id: string, updatedFields: Partial<AcademicTranscript>, students: Student[] = [], subjects: Subject[] = []): AcademicTranscript | undefined => {
    const all = transcriptService.getTranscripts(students, subjects);
    const index = all.findIndex(t => t.id === id);
    if (index !== -1) {
      const updated = {
        ...all[index],
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };
      all[index] = updated;
      transcriptService.saveTranscripts(all);
      return updated;
    }
    return undefined;
  },

  // DELETE /api/transcripts/{id}/
  deleteTranscript: (id: string, students: Student[] = [], subjects: Subject[] = []): boolean => {
    const all = transcriptService.getTranscripts(students, subjects);
    const filtered = all.filter(t => t.id !== id);
    if (filtered.length !== all.length) {
      transcriptService.saveTranscripts(filtered);
      return true;
    }
    return false;
  },

  // GET /api/verification/{code}/
  getTranscriptByVerificationCode: (code: string, students: Student[] = [], subjects: Subject[] = []): AcademicTranscript | undefined => {
    const all = transcriptService.getTranscripts(students, subjects);
    return all.find(t => t.verificationCode === code || t.verificationCode.toLowerCase() === code.toLowerCase());
  },

  // Helper to dynamically auto-calculate and generate draft transcript for a student
  generateTranscriptForStudent: (
    student: Student,
    studentSubjects: Subject[],
    academicYear: string,
    semester: string,
    creatorName: string = 'Administrator Lulus.id'
  ): AcademicTranscript => {
    const mappedSubjects: TranscriptSubject[] = studentSubjects
      .filter(sub => !sub.isMateri && (!sub.program || sub.program === student.program))
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        category: sub.category || 'Mata Pelajaran Wajib',
        kkm: sub.kkm || 75,
        score: sub.grade || 75,
        status: (sub.grade || 75) >= (sub.kkm || 75) ? 'Lulus' : 'Perlu Perbaikan'
      }));

    const totalScore = mappedSubjects.reduce((sum, s) => sum + s.score, 0);
    const averageScore = mappedSubjects.length > 0 ? Number((totalScore / mappedSubjects.length).toFixed(1)) : 0;
    const predicate = averageScore >= 90 ? 'Sangat Baik' : averageScore >= 80 ? 'Baik' : averageScore >= 75 ? 'Cukup' : 'Kurang';

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const currentYear = new Date().getFullYear();
    const documentNumber = `DN-${randomSuffix}/PKBM-AGR/${currentYear}`;
    const verificationCode = `TRK-${currentYear}-${randomSuffix}`;

    return {
      id: `TRK-${student.id}-${Date.now()}`,
      studentId: student.id,
      studentName: student.nama,
      nisn: student.nisn || '0000000000',
      nipd: student.nik || `NIPD-${student.id}`,
      program: (student.program as 'Paket A' | 'Paket B' | 'Paket C') || 'Paket C',
      kelas: student.kelas || 'Belum Ditentukan',
      tahunAjaran: academicYear,
      semester,
      subjects: mappedSubjects,
      kkm: 75,
      score: totalScore,
      status: 'Draft',
      averageScore,
      predicate,
      documentNumber,
      issueDate: new Date().toISOString().split('T')[0],
      verificationCode,
      createdBy: creatorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
};
