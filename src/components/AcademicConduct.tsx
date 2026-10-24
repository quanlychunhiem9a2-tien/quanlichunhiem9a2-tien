import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  GraduationCap,
  Sparkles,
  Download,
  Upload,
  Search,
  Filter,
  Check,
  Award,
  AlertCircle,
  TrendingUp,
  Save,
  MessageSquare,
  Edit2,
  CheckCircle2,
  HelpCircle,
  Calculator,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  X,
  FileDown,
  Lock,
  Eye,
  Trash2
} from 'lucide-react';
import {
  AppState,
  Student,
  SemesterTerm,
  SemesterRecord,
  SubjectGrades,
  EvaluatedSubjects,
  AcademicRankTT22,
  ConductRankTT22
} from '../types';
import { sendAIChatMessage } from '../api';
import { sampleDemoStudentGrades } from '../mockData';
import {
  evaluateStudentTT22,
  normalizeStudentTT22,
  defaultEvaluatedSubjects,
  computeYearFromSemesters,
  getStudentSemesterRecord
} from '../utils/tt22Evaluation';
import { hasPermission, isReadOnly, isTeacher } from '../utils/permissionUtils';

interface AcademicConductProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const AcademicConduct: React.FC<AcademicConductProps> = ({
  appState,
  onUpdateState,
}) => {
  const { students } = appState;

  // Active term: 'hk1' (Học kỳ 1), 'hk2' (Học kỳ 2), 'caNam' (Cả năm)
  const [activeTerm, setActiveTerm] = useState<SemesterTerm>('hk1');

  // Filter & Search
  const [filterType, setFilterType] = useState<'all' | 'unscored' | 'tot' | 'kha' | 'dat' | 'chuaDat' | 'excellent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Comment
  const [selectedStudentForAI, setSelectedStudentForAI] = useState<Student | null>(null);
  const [aiComment, setAiComment] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Edit grade modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [modalTerm, setModalTerm] = useState<SemesterTerm>('hk1');
  const [modalRecord, setModalRecord] = useState<SemesterRecord | null>(null);

  // Inline table edit mode
  const [isInlineMode, setIsInlineMode] = useState(false);
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, SemesterRecord>>({});

  // Excel import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vietnamese subject title mapping
  const vietnameseSubjects: Record<keyof SubjectGrades, string> = {
    math: 'Toán học',
    literature: 'Ngữ văn',
    english: 'Tiếng Anh',
    naturalScience: 'KHTN',
    historyGeography: 'Lịch sử & ĐL',
    informatics: 'Tin học',
    civics: 'GDCD',
  };

  const vietnameseEvaluatedSubjects: Record<keyof EvaluatedSubjects, string> = {
    physicalEducation: 'Thể dục',
    art: 'Mỹ thuật',
    experientialActivities: 'HĐTN-HN',
    localEducation: 'GDĐP',
  };

  // Helper to check if a record has any entered scores
  const hasStudentScores = (rec: SemesterRecord): boolean => {
    return Object.values(rec.subjects || {}).some(
      (v) => typeof v === 'number' && !isNaN(v)
    );
  };

  // Helper to get active record for student
  const getActiveRecord = (student: Student): SemesterRecord => {
    if (isInlineMode && inlineDrafts[student.id]) {
      return inlineDrafts[student.id];
    }
    return getStudentSemesterRecord(student, activeTerm);
  };

  // Filtered students based on active term's record
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());

    const rec = getActiveRecord(s);
    const hasScores = hasStudentScores(rec);
    const isTot = hasScores && (rec.academicRank === 'Tốt' || rec.academicRank === 'Giỏi');
    const isKha = hasScores && rec.academicRank === 'Khá';
    const isDat = hasScores && (rec.academicRank === 'Đạt' || rec.academicRank === 'Trung bình');
    const isChuaDat = hasScores && (rec.academicRank === 'Chưa đạt' || rec.academicRank === 'Yếu');

    if (filterType === 'unscored') return matchesSearch && !hasScores;
    if (filterType === 'tot') return matchesSearch && isTot;
    if (filterType === 'kha') return matchesSearch && isKha;
    if (filterType === 'dat') return matchesSearch && isDat;
    if (filterType === 'chuaDat') return matchesSearch && isChuaDat;
    if (filterType === 'excellent')
      return matchesSearch && hasScores && (rec.awardTitle === 'Học sinh Xuất sắc' || rec.awardTitle === 'Học sinh Giỏi');
    return matchesSearch;
  });

  // Calculate term-specific stats for header badges
  const termStats = {
    total: students.length,
    hasScores: students.filter((s) => hasStudentScores(getActiveRecord(s))).length,
    unscored: students.filter((s) => !hasStudentScores(getActiveRecord(s))).length,
    tot: students.filter((s) => {
      const r = getActiveRecord(s);
      return hasStudentScores(r) && (r.academicRank === 'Tốt' || r.academicRank === 'Giỏi');
    }).length,
    kha: students.filter((s) => {
      const r = getActiveRecord(s);
      return hasStudentScores(r) && r.academicRank === 'Khá';
    }).length,
    dat: students.filter((s) => {
      const r = getActiveRecord(s);
      return hasStudentScores(r) && (r.academicRank === 'Đạt' || r.academicRank === 'Trung bình');
    }).length,
    chuaDat: students.filter((s) => {
      const r = getActiveRecord(s);
      return hasStudentScores(r) && (r.academicRank === 'Chưa đạt' || r.academicRank === 'Yếu');
    }).length,
    excellent: students.filter((s) => {
      const r = getActiveRecord(s);
      return hasStudentScores(r) && (r.awardTitle === 'Học sinh Xuất sắc' || r.awardTitle === 'Học sinh Giỏi');
    }).length,
  };

  const canEditAcademics = hasPermission(appState, 'canManageAcademics');
  const readOnly = isReadOnly(appState);

  // ==================== INLINE EDITING HANDLERS ====================
  const handleToggleInlineMode = () => {
    if (!canEditAcademics) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản Giáo viên chủ nhiệm hoặc Cán sự lớp được ủy quyền!');
      return;
    }
    if (!isInlineMode) {
      // Initialize drafts for current active term
      const drafts: Record<string, SemesterRecord> = {};
      students.forEach((s) => {
        drafts[s.id] = JSON.parse(JSON.stringify(getStudentSemesterRecord(s, activeTerm)));
      });
      setInlineDrafts(drafts);
      setIsInlineMode(true);
    } else {
      setIsInlineMode(false);
      setInlineDrafts({});
    }
  };

  const handleInlineScoreChange = (studentId: string, subjectKey: keyof SubjectGrades, value: number | undefined) => {
    const cur = inlineDrafts[studentId] || getStudentSemesterRecord(students.find((s) => s.id === studentId)!, activeTerm);
    const updatedSubjects: SubjectGrades = { ...cur.subjects };
    if (value === undefined || isNaN(value)) {
      delete updatedSubjects[subjectKey];
    } else {
      updatedSubjects[subjectKey] = Math.min(10, Math.max(0, value));
    }
    const evalRes = evaluateStudentTT22(updatedSubjects, cur.evaluatedSubjects, cur.conductRank, cur.awardTitle);
    setInlineDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...cur,
        subjects: updatedSubjects,
        gpa: evalRes.gpa,
        academicRank: evalRes.academicRank,
        awardTitle: evalRes.awardTitle,
      },
    }));
  };

  const handleInlineEvaluatedChange = (
    studentId: string,
    evalKey: keyof EvaluatedSubjects,
    val: 'Đạt' | 'Chưa đạt' | ''
  ) => {
    const cur = inlineDrafts[studentId] || getStudentSemesterRecord(students.find((s) => s.id === studentId)!, activeTerm);
    const updatedEvaluated: EvaluatedSubjects = { ...cur.evaluatedSubjects };
    if (!val) {
      delete updatedEvaluated[evalKey];
    } else {
      updatedEvaluated[evalKey] = val;
    }
    const evalRes = evaluateStudentTT22(cur.subjects, updatedEvaluated, cur.conductRank, cur.awardTitle);
    setInlineDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...cur,
        evaluatedSubjects: updatedEvaluated,
        gpa: evalRes.gpa,
        academicRank: evalRes.academicRank,
        awardTitle: evalRes.awardTitle,
      },
    }));
  };

  const handleInlineConductChange = (studentId: string, val: ConductRankTT22) => {
    const cur = inlineDrafts[studentId] || getStudentSemesterRecord(students.find((s) => s.id === studentId)!, activeTerm);
    const evalRes = evaluateStudentTT22(cur.subjects, cur.evaluatedSubjects, val, cur.awardTitle);
    setInlineDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...cur,
        conductRank: val,
        academicRank: evalRes.academicRank,
        awardTitle: evalRes.awardTitle,
      },
    }));
  };

  // ==================== DEMO GRADES & CLEAR GRADES ====================
  const handleLoadDemoGrades = () => {
    onUpdateState((prev) => {
      const teacherAcc = prev.userAccounts?.find((u) => u.role === 'teacher');
      const activeUser = hasPermission(prev, 'canManageAcademics') ? prev.currentUser : teacherAcc || prev.currentUser;
      return {
        ...prev,
        currentUser: activeUser,
        students: prev.students.map((s) => {
          const demo = (sampleDemoStudentGrades as Record<string, any>)[s.id] || sampleDemoStudentGrades['hs-01'];
          if (!demo) return s;
          const evalRes = evaluateStudentTT22(demo.subjects, demo.evaluatedSubjects, demo.conductRank, demo.awardTitle);
          const newRec: SemesterRecord = {
            subjects: { ...demo.subjects },
            evaluatedSubjects: { ...demo.evaluatedSubjects },
            gpa: evalRes.gpa,
            academicRank: evalRes.academicRank,
            conductRank: demo.conductRank,
            awardTitle: evalRes.awardTitle,
            notes: 'Đã nạp điểm mẫu minh họa theo TT22.',
          };
          let updated = { ...s };
          if (activeTerm === 'hk1') {
            updated.semester1 = newRec;
            if (updated.semester2 && hasStudentScores(updated.semester2)) {
              updated.yearOverall = computeYearFromSemesters(newRec, updated.semester2);
            }
          } else if (activeTerm === 'hk2') {
            updated.semester2 = newRec;
            if (updated.semester1 && hasStudentScores(updated.semester1)) {
              updated.yearOverall = computeYearFromSemesters(updated.semester1, newRec);
            }
          } else {
            updated.yearOverall = newRec;
          }

          updated.academicRank = newRec.academicRank;
          updated.conductRank = newRec.conductRank;
          updated.awardTitle = newRec.awardTitle;
          updated.gpa = newRec.gpa;
          updated.subjects = newRec.subjects;
          updated.evaluatedSubjects = newRec.evaluatedSubjects;

          return normalizeStudentTT22(updated);
        }),
      };
    });
    if (isInlineMode) {
      setIsInlineMode(false);
      setInlineDrafts({});
    }
  };

  const handleClearTermGrades = () => {
    onUpdateState((prev) => {
      const teacherAcc = prev.userAccounts?.find((u) => u.role === 'teacher');
      const activeUser = hasPermission(prev, 'canManageAcademics') ? prev.currentUser : teacherAcc || prev.currentUser;
      return {
        ...prev,
        currentUser: activeUser,
        students: prev.students.map((s) => {
          const emptyRec: SemesterRecord = {
            subjects: {},
            evaluatedSubjects: {},
            gpa: 0,
            academicRank: '',
            conductRank: 'Tốt',
            awardTitle: '',
            notes: '',
          };
          let updated = { ...s };
          if (activeTerm === 'hk1') {
            updated.semester1 = emptyRec;
            if (updated.semester2) {
              updated.yearOverall = computeYearFromSemesters(emptyRec, updated.semester2);
            }
          } else if (activeTerm === 'hk2') {
            updated.semester2 = emptyRec;
            if (updated.semester1) {
              updated.yearOverall = computeYearFromSemesters(updated.semester1, emptyRec);
            }
          } else {
            updated.yearOverall = emptyRec;
          }

          updated.academicRank = '';
          updated.conductRank = 'Tốt';
          updated.awardTitle = '';
          updated.gpa = 0;
          updated.subjects = {};
          updated.evaluatedSubjects = {};

          return normalizeStudentTT22(updated);
        }),
      };
    });
    if (isInlineMode) {
      setIsInlineMode(false);
      setInlineDrafts({});
    }
  };

  const handleSaveInlineBatch = () => {
    if (!canEditAcademics) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản Giáo viên chủ nhiệm hoặc Cán sự học tập để lưu điểm!');
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        const draft = inlineDrafts[s.id];
        if (!draft) return s;

        let updatedStudent = { ...s };
        if (activeTerm === 'hk1') {
          updatedStudent.semester1 = draft;
          // Auto update whole year if semester 2 exists
          if (updatedStudent.semester2) {
            updatedStudent.yearOverall = computeYearFromSemesters(draft, updatedStudent.semester2);
          }
        } else if (activeTerm === 'hk2') {
          updatedStudent.semester2 = draft;
          if (updatedStudent.semester1) {
            updatedStudent.yearOverall = computeYearFromSemesters(updatedStudent.semester1, draft);
          }
        } else {
          updatedStudent.yearOverall = draft;
        }

        // Update overall student properties based on active term
        updatedStudent.academicRank = draft.academicRank;
        updatedStudent.conductRank = draft.conductRank;
        updatedStudent.awardTitle = draft.awardTitle;
        updatedStudent.gpa = draft.gpa;
        updatedStudent.subjects = draft.subjects;
        updatedStudent.evaluatedSubjects = draft.evaluatedSubjects;

        return normalizeStudentTT22(updatedStudent);
      }),
    }));

    setIsInlineMode(false);
    setInlineDrafts({});
    const termLabel = activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm';
    alert(`Đã lưu thành công toàn bộ điểm và xếp loại cho ${termLabel}!`);
  };

  // ==================== AUTO COMPUTE WHOLE YEAR ====================
  const handleAutoComputeWholeYear = () => {
    if (!canEditAcademics) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản Giáo viên chủ nhiệm để tính toán tổng kết Cả năm!');
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        const sem1 = getStudentSemesterRecord(s, 'hk1');
        const sem2 = getStudentSemesterRecord(s, 'hk2');
        const yearRec = computeYearFromSemesters(sem1, sem2);

        return {
          ...s,
          semester1: sem1,
          semester2: sem2,
          yearOverall: yearRec,
          academicRank: yearRec.academicRank,
          conductRank: yearRec.conductRank,
          awardTitle: yearRec.awardTitle,
          gpa: yearRec.gpa,
          subjects: yearRec.subjects,
          evaluatedSubjects: yearRec.evaluatedSubjects,
        };
      }),
    }));

    alert(`Đã hoàn tất tính toán tổng kết Cả năm cho toàn bộ ${students.length} học sinh theo Thông tư 22!\nCông thức: ĐTBmcn = (HK1 + 2×HK2)/3.`);
  };

  // ==================== EDIT MODAL HANDLERS ====================
  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setModalTerm(activeTerm);
    const rec = getStudentSemesterRecord(student, activeTerm);
    setModalRecord(JSON.parse(JSON.stringify(rec)));
  };

  const handleSwitchModalTerm = (term: SemesterTerm) => {
    if (!editingStudent) return;
    setModalTerm(term);
    const rec = getStudentSemesterRecord(editingStudent, term);
    setModalRecord(JSON.parse(JSON.stringify(rec)));
  };

  const handleModalAutoComputeFromSemesters = () => {
    if (!editingStudent) return;
    const sem1 = getStudentSemesterRecord(editingStudent, 'hk1');
    const sem2 = getStudentSemesterRecord(editingStudent, 'hk2');
    const yearRec = computeYearFromSemesters(sem1, sem2);
    setModalRecord(yearRec);
  };

  const handleSaveModalRecord = () => {
    if (!canEditAcademics) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản Giáo viên hoặc Cán sự lớp để chỉnh sửa!');
      return;
    }
    if (!editingStudent || !modalRecord) return;

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        if (s.id !== editingStudent.id) return s;

        let updated = { ...s };
        if (modalTerm === 'hk1') {
          updated.semester1 = modalRecord;
          if (updated.semester2) {
            updated.yearOverall = computeYearFromSemesters(modalRecord, updated.semester2);
          }
        } else if (modalTerm === 'hk2') {
          updated.semester2 = modalRecord;
          if (updated.semester1) {
            updated.yearOverall = computeYearFromSemesters(updated.semester1, modalRecord);
          }
        } else {
          updated.yearOverall = modalRecord;
        }

        // If modal was editing the currently active term, sync base student props
        if (modalTerm === activeTerm) {
          updated.academicRank = modalRecord.academicRank;
          updated.conductRank = modalRecord.conductRank;
          updated.awardTitle = modalRecord.awardTitle;
          updated.gpa = modalRecord.gpa;
          updated.subjects = modalRecord.subjects;
          updated.evaluatedSubjects = modalRecord.evaluatedSubjects;
        }

        return normalizeStudentTT22(updated);
      }),
    }));

    const termLabel = modalTerm === 'hk1' ? 'Học kỳ 1' : modalTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm';
    alert(`Đã cập nhật bảng điểm ${termLabel} cho em ${editingStudent.fullName}!`);
    setEditingStudent(null);
    setModalRecord(null);
  };

  // ==================== AI COMMENT HANDLER ====================
  const handleGenerateAIComment = async (student: Student) => {
    setSelectedStudentForAI(student);
    setIsGeneratingAI(true);
    setAiComment('');

    const rec = getActiveRecord(student);
    const termLabel = activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm';

    const context = {
      term: termLabel,
      fullName: student.fullName,
      code: student.code,
      academicRank: rec.academicRank,
      awardTitle: rec.awardTitle,
      conductRank: rec.conductRank,
      gpa: rec.gpa,
      subjects: rec.subjects,
      notes: rec.notes,
    };

    const prompt = `Hãy viết một đoạn nhận xét ${termLabel} hoàn chỉnh, chuẩn mực sư phạm theo Thông tư 22/2021/TT-BGDĐT cho học sinh ${student.fullName}.
Học lực: ${rec.academicRank}, Danh hiệu: ${rec.awardTitle || 'Chưa có'}, Rèn luyện/Hạnh kiểm: ${rec.conductRank}, ĐTB: ${rec.gpa}.
Nhận xét gồm 3 phần:
1. Đánh giá kết quả học tập (ưu điểm các môn thế mạnh, điểm cần khắc phục).
2. Đánh giá phẩm chất, năng lực, hạnh kiểm, nề nếp.
3. Lời khuyên và biện pháp rèn luyện trong giai đoạn tiếp theo.`;

    const res = await sendAIChatMessage(prompt, 'comment', context);
    setAiComment(res);
    setIsGeneratingAI(false);
  };

  const handleApplyComment = () => {
    if (!canEditAcademics) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập để lưu nhận xét!');
      return;
    }
    if (!selectedStudentForAI || !aiComment) return;

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        if (s.id !== selectedStudentForAI.id) return s;
        let updated = { ...s };
        const rec = getStudentSemesterRecord(s, activeTerm);
        const updatedRec = { ...rec, notes: aiComment.slice(0, 300) };

        if (activeTerm === 'hk1') updated.semester1 = updatedRec;
        else if (activeTerm === 'hk2') updated.semester2 = updatedRec;
        else updated.yearOverall = updatedRec;

        updated.notes = aiComment.slice(0, 300);
        return updated;
      }),
    }));

    alert(`Đã lưu nhận xét ${activeTerm === 'hk1' ? 'HK1' : activeTerm === 'hk2' ? 'HK2' : 'Cả năm'} cho em ${selectedStudentForAI.fullName}!`);
    setSelectedStudentForAI(null);
  };

  // ==================== EXCEL IMPORT & EXPORT ====================
  const handleExportExcel = () => {
    const termTitle = activeTerm === 'hk1' ? 'HOC_KY_1' : activeTerm === 'hk2' ? 'HOC_KY_2' : 'CA_NAM';
    const rows = filteredStudents.map((s, idx) => {
      const rec = getActiveRecord(s);
      return {
        'STT': idx + 1,
        'Mã học sinh': s.code,
        'Họ và tên': s.fullName,
        'Tổ': s.teamId,
        'Toán': rec.subjects.math,
        'Ngữ văn': rec.subjects.literature,
        'Tiếng Anh': rec.subjects.english,
        'KHTN': rec.subjects.naturalScience,
        'Lịch sử & ĐL': rec.subjects.historyGeography,
        'Tin học': rec.subjects.informatics,
        'GDCD': rec.subjects.civics,
        'GD Thể chất': rec.evaluatedSubjects.physicalEducation,
        'Nghệ thuật': rec.evaluatedSubjects.art,
        'HĐTN-HN': rec.evaluatedSubjects.experientialActivities,
        'GD địa phương': rec.evaluatedSubjects.localEducation,
        'ĐTB': rec.gpa,
        'Học lực (TT22)': rec.academicRank,
        'Rèn luyện': rec.conductRank,
        'Danh hiệu': rec.awardTitle || '',
        'Ghi chú': rec.notes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Bang_diem_${termTitle}_${appState.className}_${appState.academicYear.replace('/', '-')}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const sample = students.slice(0, 5).map((s) => ({
      'Mã học sinh': s.code,
      'Họ và tên': s.fullName,
      'Toán': 8.5,
      'Ngữ văn': 8.0,
      'Tiếng Anh': 8.2,
      'KHTN': 7.8,
      'Lịch sử & ĐL': 8.0,
      'Tin học': 9.0,
      'GDCD': 8.5,
      'GD Thể chất': 'Đạt',
      'Nghệ thuật': 'Đạt',
      'HĐTN-HN': 'Đạt',
      'GD địa phương': 'Đạt',
      'Rèn luyện': 'Tốt',
      'Danh hiệu': '',
    }));
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_nhap_diem');
    XLSX.writeFile(wb, `Mau_nhap_diem_${activeTerm.toUpperCase()}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          setImportError('Tệp rỗng hoặc không đúng định dạng bảng dữ liệu.');
          return;
        }

        setImportPreviewData(data);
      } catch (err: any) {
        setImportError(`Lỗi khi đọc file: ${err.message || 'Không thể xử lý tệp'}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyImportGrades = () => {
    if (!canEditAcademics) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản có thẩm quyền để nhập điểm từ Excel!');
      return;
    }
    if (!importPreviewData.length) return;

    let matchCount = 0;
    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        // Find matching row by code or name
        const match: any = importPreviewData.find((row: any) => {
          const codeVal = String(row['Mã học sinh'] || row['Ma HS'] || row['Mã HS'] || row['Code'] || '').trim();
          const nameVal = String(row['Họ và tên'] || row['Họ tên'] || row['Tên'] || '').trim().toLowerCase();
          return (codeVal && codeVal.toLowerCase() === s.code.toLowerCase()) || (nameVal && nameVal === s.fullName.toLowerCase());
        });

        if (!match) return s;
        matchCount++;

        const parseNum = (val: any, fallback: number | undefined): number | undefined => {
          if (val === undefined || val === null || String(val).trim() === '') return fallback;
          const n = parseFloat(String(val).replace(',', '.'));
          return isNaN(n) ? fallback : Math.min(10, Math.max(0, n));
        };

        const currentRec = getStudentSemesterRecord(s, activeTerm);
        const newSubjects: SubjectGrades = {};
        const rawSubjects: Record<string, number | undefined> = {
          math: parseNum(match['Toán'] ?? match['Toan'], currentRec.subjects.math),
          literature: parseNum(match['Ngữ văn'] ?? match['Ngu van'] ?? match['Văn'], currentRec.subjects.literature),
          english: parseNum(match['Tiếng Anh'] ?? match['Ngoại ngữ'] ?? match['Anh'], currentRec.subjects.english),
          naturalScience: parseNum(match['KHTN'] ?? match['Khoa học tự nhiên'], currentRec.subjects.naturalScience),
          historyGeography: parseNum(match['Lịch sử & ĐL'] ?? match['LS & ĐL'] ?? match['Lịch sử và Địa lý'], currentRec.subjects.historyGeography),
          informatics: parseNum(match['Tin học'] ?? match['Tin'], currentRec.subjects.informatics),
          civics: parseNum(match['GDCD'] ?? match['Công dân'], currentRec.subjects.civics),
        };
        Object.entries(rawSubjects).forEach(([k, v]) => {
          if (v !== undefined) newSubjects[k] = v;
        });

        const parseComment = (val: any, fallback?: string): 'Đạt' | 'Chưa đạt' | undefined => {
          if (val === undefined || val === null || String(val).trim() === '') {
            return fallback === 'Đạt' || fallback === 'Chưa đạt' ? fallback : undefined;
          }
          const str = String(val).trim().toLowerCase();
          return str.includes('chưa') || str.includes('không') ? 'Chưa đạt' : 'Đạt';
        };

        const newEvaluated: EvaluatedSubjects = {};
        const rawEvaluated: Record<string, 'Đạt' | 'Chưa đạt' | undefined> = {
          physicalEducation: parseComment(match['GD Thể chất'] ?? match['Thể dục'], currentRec.evaluatedSubjects.physicalEducation),
          art: parseComment(match['Nghệ thuật'] ?? match['Mỹ thuật'], currentRec.evaluatedSubjects.art),
          experientialActivities: parseComment(match['HĐTN-HN'] ?? match['HĐTN'], currentRec.evaluatedSubjects.experientialActivities),
          localEducation: parseComment(match['GD địa phương'] ?? match['GDĐP'], currentRec.evaluatedSubjects.localEducation),
        };
        Object.entries(rawEvaluated).forEach(([k, v]) => {
          if (v !== undefined) (newEvaluated as any)[k] = v;
        });

        const conductVal = String(match['Rèn luyện'] ?? match['Hạnh kiểm'] ?? currentRec.conductRank ?? 'Tốt').trim();
        const validConduct: ConductRankTT22 =
          conductVal === 'Tốt' || conductVal === 'Khá' || conductVal === 'Đạt' || conductVal === 'Chưa đạt'
            ? conductVal
            : (currentRec.conductRank || 'Tốt');

        const evalRes = evaluateStudentTT22(newSubjects, newEvaluated, validConduct, match['Danh hiệu'] || currentRec.awardTitle);

        const newRec: SemesterRecord = {
          subjects: newSubjects,
          evaluatedSubjects: newEvaluated,
          gpa: evalRes.gpa,
          academicRank: evalRes.academicRank,
          conductRank: validConduct,
          awardTitle: evalRes.awardTitle,
          notes: currentRec.notes,
        };

        let updated = { ...s };
        if (activeTerm === 'hk1') {
          updated.semester1 = newRec;
          if (updated.semester2) updated.yearOverall = computeYearFromSemesters(newRec, updated.semester2);
        } else if (activeTerm === 'hk2') {
          updated.semester2 = newRec;
          if (updated.semester1) updated.yearOverall = computeYearFromSemesters(updated.semester1, newRec);
        } else {
          updated.yearOverall = newRec;
        }

        updated.academicRank = newRec.academicRank;
        updated.conductRank = newRec.conductRank;
        updated.awardTitle = newRec.awardTitle;
        updated.gpa = newRec.gpa;
        updated.subjects = newRec.subjects;
        updated.evaluatedSubjects = newRec.evaluatedSubjects;

        return normalizeStudentTT22(updated);
      }),
    }));

    const termLabel = activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm';
    alert(`Đã nhập điểm thành công cho ${matchCount} học sinh trong ${termLabel}!`);
    setIsImportModalOpen(false);
    setImportPreviewData([]);
    setImportFileName('');
  };

  return (
    <div className="space-y-5">
      {/* ================= TOP SEMESTER SELECTOR BANNER ================= */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#17365D]">Quản lý Học tập & Rèn luyện</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0B438A] border border-blue-200">
                  Thông tư 22/2021/TT-BGDĐT
                </span>
              </div>
              <p className="text-xs text-[#66809F] mt-0.5">
                {activeTerm === 'hk1' && '📘 Đang làm việc với bảng điểm & kết quả rèn luyện Học kỳ 1'}
                {activeTerm === 'hk2' && '📗 Đang làm việc với bảng điểm & kết quả rèn luyện Học kỳ 2'}
                {activeTerm === 'caNam' && '🏆 Đang tổng kết Cả năm: ĐTBmcn = (HK1 + 2×HK2)/3'}
              </p>
            </div>
          </div>

          {/* 3 Semester Tabs */}
          <div className="flex items-center bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTerm('hk1');
                if (isInlineMode) setIsInlineMode(false);
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTerm === 'hk1'
                  ? 'bg-white text-[#1677E8] shadow-sm'
                  : 'text-[#66809F] hover:text-[#17365D]'
              }`}
            >
              <span>📘</span> Học kỳ 1
            </button>
            <button
              onClick={() => {
                setActiveTerm('hk2');
                if (isInlineMode) setIsInlineMode(false);
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTerm === 'hk2'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-[#66809F] hover:text-[#17365D]'
              }`}
            >
              <span>📗</span> Học kỳ 2
            </button>
            <button
              onClick={() => {
                setActiveTerm('caNam');
                if (isInlineMode) setIsInlineMode(false);
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTerm === 'caNam'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm'
                  : 'text-[#66809F] hover:text-[#17365D]'
              }`}
            >
              <span>🏆</span> Cả năm
            </button>
          </div>
        </div>

        {/* Toolbar & Actions */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          {/* Filters by TT22 status */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'all'
                  ? 'bg-[#1677E8] text-white shadow-xs'
                  : 'bg-gray-100 text-[#17365D] hover:bg-gray-200'
              }`}
            >
              Tất cả ({termStats.total})
            </button>
            {termStats.unscored > 0 && (
              <button
                onClick={() => setFilterType('unscored')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filterType === 'unscored'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Chưa có điểm ({termStats.unscored})
              </button>
            )}
            <button
              onClick={() => setFilterType('tot')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'tot'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Mức Tốt ({termStats.tot})
            </button>
            <button
              onClick={() => setFilterType('kha')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'kha'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-[#0B438A] hover:bg-blue-100'
              }`}
            >
              Mức Khá ({termStats.kha})
            </button>
            <button
              onClick={() => setFilterType('dat')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'dat'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Mức Đạt ({termStats.dat})
            </button>
            <button
              onClick={() => setFilterType('chuaDat')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                filterType === 'chuaDat'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              Chưa đạt ({termStats.chuaDat})
            </button>
            <button
              onClick={() => setFilterType('excellent')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1 ${
                filterType === 'excellent'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-xs'
                  : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Khen thưởng ({termStats.excellent})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTerm === 'caNam' && (
              <button
                onClick={handleAutoComputeWholeYear}
                title={canEditAcademics ? "Tính lại điểm trung bình cả năm từ HK1 và HK2 theo công thức TT22" : "Cần đăng nhập GVCN để tính điểm Cả năm"}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                  canEditAcademics
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white'
                    : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {!canEditAcademics ? <Lock className="w-3.5 h-3.5 text-gray-400" /> : <Calculator className="w-3.5 h-3.5" />}
                ⚡ Tự động tính Cả năm
              </button>
            )}

            <button
              onClick={handleToggleInlineMode}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isInlineMode
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                  : canEditAcademics
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}
            >
              {!canEditAcademics ? <Lock className="w-3.5 h-3.5 text-gray-400" /> : <Edit2 className="w-3.5 h-3.5" />}
              {isInlineMode ? 'Đóng nhập trực tiếp' : '✏️ Nhập điểm trực tiếp'}
            </button>

            {canEditAcademics && (
              <button
                onClick={handleLoadDemoGrades}
                title="Nạp bảng điểm mẫu minh họa đầy đủ 7 môn cho cả lớp để kiểm tra"
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                ⚡ Nạp điểm mẫu
              </button>
            )}

            {canEditAcademics && termStats.hasScores > 0 && (
              <button
                onClick={handleClearTermGrades}
                title="Xóa sạch toàn bộ điểm của học kỳ này về trạng thái ban đầu để trống (-)"
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Xóa để trống (-)
              </button>
            )}

            <button
              onClick={() => {
                if (!canEditAcademics) {
                  alert('Chế độ Chỉ xem: Vui lòng đăng nhập tài khoản Giáo viên chủ nhiệm hoặc Cán sự lớp để nhập file Excel!');
                  return;
                }
                setIsImportModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D8E7FA] hover:bg-gray-50 text-[#17365D] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {!canEditAcademics ? <Lock className="w-3.5 h-3.5 text-gray-400" /> : <Upload className="w-3.5 h-3.5 text-[#1677E8]" />}
              Nhập Excel
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D8E7FA] hover:bg-gray-50 text-[#17365D] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#1677E8]" />
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Read-Only Notice for Visitors */}
        {readOnly && (
          <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Giao diện đang ở chế độ Chỉ xem:</strong> Khách truy cập có thể tra cứu điểm số 3 học kỳ của học sinh theo TT22. Để thêm, sửa hoặc nhập điểm từ Excel, vui lòng đăng nhập tài khoản Giáo viên chủ nhiệm hoặc Cán sự học tập ở góc trên bên phải.
              </span>
            </div>
          </div>
        )}

        {/* Inline Mode Active Notification Bar */}
        {isInlineMode && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>
                <strong>Chế độ nhập điểm trực tiếp đang BẬT:</strong> Bạn có thể gõ trực tiếp điểm 7 môn và chọn môn nhận xét trên từng dòng của {activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleInlineMode}
                className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveInlineBatch}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu tất cả thay đổi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= EMPTY TERM NOTICE BANNER ================= */}
      {termStats.hasScores === 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 rounded-2xl border border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1677E8] flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-[#0B438A] text-sm">
                Bảng điểm {activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'} hiện đang để trống (-)
              </p>
              <p className="text-[11px] text-[#66809F] mt-0.5">
                Các môn học chưa có kết quả điểm số nên giao diện ban đầu hiển thị để trống (ký hiệu <code>-</code>). ĐTBm và xếp loại học lực theo Thông tư 22 sẽ tự động tính toán ngay khi thầy cô nhập điểm.
              </p>
            </div>
          </div>
          {canEditAcademics && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleInlineMode}
                className="px-3 py-1.5 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white font-bold text-xs shadow-xs"
              >
                ✏️ Nhập trực tiếp
              </button>
              <button
                onClick={handleLoadDemoGrades}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                ⚡ Nạp điểm mẫu
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= TT22 MINISTRY STANDARDS CARD ================= */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 rounded-2xl p-4 border border-blue-200 text-xs text-[#17365D] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-[#0B438A] flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Quy định đánh giá định kỳ ({activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}) theo Thông tư 22/2021/TT-BGDĐT:
          </span>
          <span className="text-[11px] font-bold text-[#1677E8]">Điều 8, Điều 9 & Điều 15</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
          <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 leading-snug">
            <strong className="text-emerald-700 block mb-1">a) Mức Tốt:</strong>
            • Tất cả môn nhận xét đạt mức <strong>Đạt</strong>.<br />
            • Tất cả môn điểm số có ĐTBm ≥ <strong>6.5</strong>, trong đó có ít nhất <strong>06 môn đạt ≥ 8.0</strong>.
          </div>
          <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 leading-snug">
            <strong className="text-blue-700 block mb-1">b) Mức Khá:</strong>
            • Tất cả môn nhận xét đạt mức <strong>Đạt</strong>.<br />
            • Tất cả môn điểm số có ĐTBm ≥ <strong>5.0</strong>, trong đó có ít nhất <strong>06 môn đạt ≥ 6.5</strong>.
          </div>
          <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 leading-snug">
            <strong className="text-amber-700 block mb-1">c) Mức Đạt:</strong>
            • Nhiều nhất 01 môn nhận xét Chưa đạt.<br />
            • Có ít nhất 06 môn điểm số ≥ <strong>5.0</strong>, không có môn nào dưới <strong>3.5</strong>.
          </div>
          <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 leading-snug">
            <strong className="text-purple-700 block mb-1">d) Khen thưởng:</strong>
            • <strong>Học sinh Xuất sắc:</strong> Rèn luyện Tốt + Học lực Tốt + ít nhất 6 môn ≥ 9.0.<br />
            • <strong>Học sinh Giỏi:</strong> Rèn luyện Tốt + Học lực Tốt.<br />
            • Còn lại để trống.
          </div>
        </div>
      </div>

      {/* ================= TABLE OF GRADES BY SEMESTER ================= */}
      <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Tìm học sinh trong ${activeTerm === 'hk1' ? 'HK1' : activeTerm === 'hk2' ? 'HK2' : 'Cả năm'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#D8E7FA] focus:outline-hidden focus:ring-2 focus:ring-[#1677E8]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#66809F]">
              Đang xem danh sách: <strong className="text-[#17365D]">{activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}</strong> (
              {filteredStudents.length}/{students.length} học sinh)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3 min-w-[170px]">Học sinh</th>
                <th className="py-3 px-1 text-center" title="Toán học">Toán</th>
                <th className="py-3 px-1 text-center" title="Ngữ văn">Văn</th>
                <th className="py-3 px-1 text-center" title="Ngoại ngữ">Anh</th>
                <th className="py-3 px-1 text-center" title="Khoa học tự nhiên">KHTN</th>
                <th className="py-3 px-1 text-center" title="Lịch sử & Địa lý">LS-ĐL</th>
                <th className="py-3 px-1 text-center" title="Tin học">Tin</th>
                <th className="py-3 px-1 text-center" title="Giáo dục công dân">GDCD</th>
                <th className="py-3 px-1 text-center" title="Giáo dục thể chất">Thể dục</th>
                <th className="py-3 px-1 text-center" title="Nghệ thuật">Mỹ thuật</th>
                <th className="py-3 px-1 text-center" title="Hoạt động trải nghiệm, hướng nghiệp">HĐTN</th>
                <th className="py-3 px-1 text-center" title="Giáo dục địa phương">GDĐP</th>
                <th className="py-3 px-2 text-center bg-blue-50/50">ĐTBm</th>
                <th className="py-3 px-2 text-center">Học lực (TT22)</th>
                <th className="py-3 px-2 text-center">Danh hiệu</th>
                <th className="py-3 px-2 text-center">Rèn luyện</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.map((s) => {
                const rec = getActiveRecord(s);
                const hasScores = hasStudentScores(rec);

                return (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Student Info */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={s.avatar}
                          alt={s.fullName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                        <div className="truncate">
                          <span className="font-bold text-[#17365D] block truncate">{s.fullName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">Tổ {s.teamId} • {s.code}</span>
                        </div>
                      </div>
                    </td>

                    {/* 7 Scored Subjects */}
                    {(['math', 'literature', 'english', 'naturalScience', 'historyGeography', 'informatics', 'civics'] as (keyof SubjectGrades)[]).map((subjKey) => {
                      const val = rec.subjects?.[subjKey];
                      const hasVal = typeof val === 'number' && !isNaN(val);
                      return (
                        <td key={subjKey} className="py-2 px-1 text-center font-mono">
                          {isInlineMode ? (
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              placeholder="-"
                              value={hasVal ? val : ''}
                              onChange={(e) => {
                                const str = e.target.value.trim();
                                if (str === '') {
                                  handleInlineScoreChange(s.id, subjKey, undefined);
                                } else {
                                  const parsed = parseFloat(str);
                                  handleInlineScoreChange(s.id, subjKey, isNaN(parsed) ? undefined : parsed);
                                }
                              }}
                              className="w-12 px-1 py-0.5 text-center text-[11px] font-bold font-mono border border-blue-200 rounded-md bg-white focus:ring-1 focus:ring-blue-500 placeholder:text-gray-300"
                            />
                          ) : (
                            <span
                              className={`font-semibold ${
                                !hasVal
                                  ? 'text-gray-300 font-normal'
                                  : val >= 8.0
                                  ? 'text-emerald-700'
                                  : val < 5.0
                                  ? 'text-rose-600'
                                  : 'text-gray-700'
                              }`}
                            >
                              {hasVal ? val.toFixed(1) : '-'}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* 4 Evaluated (Comment) Subjects */}
                    {(['physicalEducation', 'art', 'experientialActivities', 'localEducation'] as (keyof EvaluatedSubjects)[]).map((evalKey) => {
                      const val = rec.evaluatedSubjects?.[evalKey];
                      return (
                        <td key={evalKey} className="py-2 px-1 text-center">
                          {isInlineMode ? (
                            <select
                              value={val || ''}
                              onChange={(e) =>
                                handleInlineEvaluatedChange(s.id, evalKey, e.target.value as any)
                              }
                              className="text-[10px] py-0.5 px-1 border border-gray-200 rounded bg-white font-semibold"
                            >
                              <option value="">-</option>
                              <option value="Đạt">Đạt</option>
                              <option value="Chưa đạt">C.Đạt</option>
                            </select>
                          ) : (
                            <span
                              className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                                val === 'Đạt'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : val === 'Chưa đạt'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'text-gray-300 font-mono font-normal'
                              }`}
                            >
                              {val === 'Đạt' ? 'Đ' : val === 'Chưa đạt' ? 'CĐ' : '-'}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* GPA */}
                    <td className="py-2.5 px-2 text-center font-mono bg-blue-50/50">
                      {hasScores && rec.gpa > 0 ? (
                        <span className="font-black text-[#0B438A]">{rec.gpa.toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-300 font-normal">-</span>
                      )}
                    </td>

                    {/* Academic Rank TT22 */}
                    <td className="py-2.5 px-2 text-center">
                      {!hasScores || !rec.academicRank ? (
                        <span className="text-gray-300 font-mono text-[11px]">-</span>
                      ) : rec.academicRank === 'Chưa đủ môn' ? (
                        <span className="px-1.5 py-0.5 rounded-md font-semibold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                          Chưa đủ môn
                        </span>
                      ) : rec.academicRank === 'Chưa đánh giá' ? (
                        <span className="text-gray-300 font-mono text-[11px]">-</span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-block ${
                            rec.academicRank === 'Tốt' || rec.academicRank === 'Giỏi'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.academicRank === 'Khá'
                              ? 'bg-blue-100 text-[#0B438A]'
                              : rec.academicRank === 'Đạt' || rec.academicRank === 'Trung bình'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {rec.academicRank === 'Giỏi' ? 'Tốt' : rec.academicRank === 'Trung bình' ? 'Đạt' : rec.academicRank === 'Yếu' ? 'Chưa đạt' : rec.academicRank}
                        </span>
                      )}
                    </td>

                    {/* Award Title */}
                    <td className="py-2.5 px-2 text-center">
                      {!hasScores || !rec.awardTitle ? (
                        <span className="text-gray-300 font-mono">-</span>
                      ) : rec.awardTitle === 'Học sinh Xuất sắc' ? (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-extrabold text-[10px] inline-flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-2.5 h-2.5 text-white" /> Xuất sắc
                        </span>
                      ) : rec.awardTitle === 'Học sinh Giỏi' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                          <Award className="w-2.5 h-2.5 text-emerald-700" /> HS Giỏi
                        </span>
                      ) : (
                        <span className="text-gray-300 font-mono">-</span>
                      )}
                    </td>

                    {/* Conduct */}
                    <td className="py-2.5 px-2 text-center">
                      {isInlineMode ? (
                        <select
                          value={rec.conductRank || 'Tốt'}
                          onChange={(e) => handleInlineConductChange(s.id, e.target.value as any)}
                          className="text-[10px] py-0.5 px-1 border border-gray-200 rounded font-bold text-emerald-800 bg-white"
                        >
                          <option value="Tốt">Tốt</option>
                          <option value="Khá">Khá</option>
                          <option value="Đạt">Đạt</option>
                          <option value="Chưa đạt">Chưa đạt</option>
                        </select>
                      ) : (
                        <span className="font-bold text-emerald-700 text-[11px]">{rec.conductRank || 'Tốt'}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          title={canEditAcademics ? `Chỉnh sửa điểm (${activeTerm === 'hk1' ? 'HK1' : activeTerm === 'hk2' ? 'HK2' : 'Cả năm'})` : `Xem chi tiết bảng điểm (${activeTerm === 'hk1' ? 'HK1' : activeTerm === 'hk2' ? 'HK2' : 'Cả năm'})`}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#1677E8] transition-colors"
                        >
                          {canEditAcademics ? <Edit2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                        <button
                          onClick={() => handleGenerateAIComment(s)}
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-[10.5px] flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          Nhận xét
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= EDIT GRADES MODAL (BY SEMESTER) ================= */}
      {editingStudent && modalRecord && (() => {
        const liveEval = evaluateStudentTT22(
          modalRecord.subjects,
          modalRecord.evaluatedSubjects,
          modalRecord.conductRank,
          modalRecord.awardTitle
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-[#D8E7FA] my-8 animate-in fade-in">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                <div>
                  <h3 className="font-extrabold text-[#17365D] text-sm flex items-center gap-2">
                    {canEditAcademics ? 'Cập nhật điểm & Xếp loại TT22' : 'Bảng điểm & Xếp loại TT22 (Chỉ xem)'}: {editingStudent.fullName}
                    {!canEditAcademics && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                        Chỉ xem
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#66809F] mt-0.5">
                    {editingStudent.code} • Tổ {editingStudent.teamId}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingStudent(null);
                    setModalRecord(null);
                  }}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                >
                  ✕
                </button>
              </div>

              {!canEditAcademics && (
                <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Chế độ xem:</strong> Bạn đang xem bảng điểm học sinh. Để chỉnh sửa điểm hoặc danh hiệu, vui lòng đăng nhập tài khoản Giáo viên chủ nhiệm hoặc Cán sự học tập.
                  </span>
                </div>
              )}

              {/* Semester Switcher Tabs Inside Modal */}
              <div className="px-5 pt-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSwitchModalTerm('hk1')}
                    className={`px-3 py-1.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                      modalTerm === 'hk1'
                        ? 'bg-white text-[#1677E8] border-[#1677E8] shadow-2xs'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    📘 Học kỳ 1
                  </button>
                  <button
                    onClick={() => handleSwitchModalTerm('hk2')}
                    className={`px-3 py-1.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                      modalTerm === 'hk2'
                        ? 'bg-white text-emerald-600 border-emerald-600 shadow-2xs'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    📗 Học kỳ 2
                  </button>
                  <button
                    onClick={() => handleSwitchModalTerm('caNam')}
                    className={`px-3 py-1.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                      modalTerm === 'caNam'
                        ? 'bg-white text-amber-600 border-amber-500 shadow-2xs'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    🏆 Cả năm
                  </button>
                </div>

                {modalTerm === 'caNam' && (
                  <button
                    onClick={handleModalAutoComputeFromSemesters}
                    className="mb-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Calculator className="w-3 h-3" />
                    Lấy điểm tự động (HK1 + 2×HK2)/3
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* Live TT22 Evaluation Card */}
                <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#0B438A] text-xs">
                      Kết quả tính toán {modalTerm === 'hk1' ? 'HK1' : modalTerm === 'hk2' ? 'HK2' : 'Cả năm'}:
                    </span>
                    <span className="font-mono text-sm font-black text-[#0B438A]">
                      ĐTB: {hasStudentScores(modalRecord) && liveEval.gpa > 0 ? liveEval.gpa.toFixed(1) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasStudentScores(modalRecord) || !liveEval.academicRank ? (
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-gray-100 text-gray-600">
                        Học lực: Chưa đánh giá (Để trống)
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                          liveEval.academicRank === 'Tốt'
                            ? 'bg-emerald-100 text-emerald-800'
                            : liveEval.academicRank === 'Khá'
                            ? 'bg-blue-100 text-[#0B438A]'
                            : liveEval.academicRank === 'Đạt'
                            ? 'bg-amber-100 text-amber-800'
                            : liveEval.academicRank === 'Chưa đủ môn'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        Học lực: {liveEval.academicRank}
                      </span>
                    )}

                    {liveEval.awardTitle && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-amber-950 font-extrabold text-xs inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {liveEval.awardTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#66809F] leading-tight">{liveEval.reason}</p>
                </div>

                {/* 7 Scored subjects */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-[#17365D]">
                      Điểm số 7 môn học ({modalTerm === 'caNam' ? 'ĐTBmcn' : 'ĐTBm'}):
                    </label>
                    <span className="text-[11px] text-[#66809F]">Để trống (-) nếu chưa có điểm</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['math', 'literature', 'english', 'naturalScience', 'historyGeography', 'informatics', 'civics'] as (keyof SubjectGrades)[]).map((k) => {
                      const currentVal = modalRecord.subjects[k];
                      const hasVal = typeof currentVal === 'number' && !isNaN(currentVal);
                      return (
                        <div key={k} className="p-2 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <span className="text-[#17365D] font-medium text-[11px]">
                            {vietnameseSubjects[k] || k}
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="-"
                            disabled={!canEditAcademics}
                            value={hasVal ? currentVal : ''}
                            onChange={(e) => {
                              const str = e.target.value.trim();
                              const updatedSubjects: SubjectGrades = { ...modalRecord.subjects };
                              if (str === '') {
                                delete updatedSubjects[k];
                              } else {
                                const parsed = parseFloat(str);
                                if (isNaN(parsed)) {
                                  delete updatedSubjects[k];
                                } else {
                                  updatedSubjects[k] = Math.min(10, Math.max(0, parsed));
                                }
                              }
                              const autoEval = evaluateStudentTT22(
                                updatedSubjects,
                                modalRecord.evaluatedSubjects,
                                modalRecord.conductRank,
                                modalRecord.awardTitle
                              );
                              setModalRecord({
                                ...modalRecord,
                                subjects: updatedSubjects,
                                academicRank: autoEval.academicRank,
                                awardTitle: autoEval.awardTitle,
                                gpa: autoEval.gpa,
                              });
                            }}
                            className={`w-16 px-2 py-1 rounded-lg border font-mono font-bold text-center text-[#0B438A] placeholder:text-gray-300 ${
                              !canEditAcademics ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 focus:ring-1 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4 Comment-evaluated subjects */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-[#17365D]">
                      Môn đánh giá bằng nhận xét ({modalTerm === 'hk1' ? 'HK1' : modalTerm === 'hk2' ? 'HK2' : 'Cả năm'}):
                    </label>
                    <span className="text-[11px] text-[#66809F]">Chọn (-) nếu chưa đánh giá</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['physicalEducation', 'art', 'experientialActivities', 'localEducation'] as (keyof EvaluatedSubjects)[]).map((k) => {
                      const currentVal = modalRecord.evaluatedSubjects[k];
                      return (
                        <div key={k} className="p-2 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <span className="text-[#17365D] font-medium text-[11px]">
                            {vietnameseEvaluatedSubjects[k] || k}
                          </span>
                          <select
                            value={currentVal || ''}
                            disabled={!canEditAcademics}
                            onChange={(e) => {
                              const val = e.target.value as 'Đạt' | 'Chưa đạt' | '';
                              const updatedEval: EvaluatedSubjects = { ...modalRecord.evaluatedSubjects };
                              if (!val) {
                                delete updatedEval[k];
                              } else {
                                updatedEval[k] = val;
                              }
                              const autoEval = evaluateStudentTT22(
                                modalRecord.subjects,
                                updatedEval,
                                modalRecord.conductRank,
                                modalRecord.awardTitle
                              );
                              setModalRecord({
                                ...modalRecord,
                                evaluatedSubjects: updatedEval,
                                academicRank: autoEval.academicRank,
                                awardTitle: autoEval.awardTitle,
                                gpa: autoEval.gpa,
                              });
                            }}
                            className={`px-2 py-1 rounded-lg border text-xs font-bold ${
                              !canEditAcademics
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                                : currentVal === 'Đạt'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : currentVal === 'Chưa đạt'
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-white text-gray-500 border-gray-200'
                            }`}
                          >
                            <option value="">(Để trống)</option>
                            <option value="Đạt">Đạt</option>
                            <option value="Chưa đạt">Chưa đạt</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conduct and Award Title Selectors */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="font-semibold text-[#17365D] block mb-1">
                      Kết quả Rèn luyện ({modalTerm === 'hk1' ? 'HK1' : modalTerm === 'hk2' ? 'HK2' : 'Cả năm'}):
                    </label>
                    <select
                      value={modalRecord.conductRank}
                      disabled={!canEditAcademics}
                      onChange={(e) => {
                        const newConduct = e.target.value as ConductRankTT22;
                        const autoEval = evaluateStudentTT22(
                          modalRecord.subjects,
                          modalRecord.evaluatedSubjects,
                          newConduct,
                          modalRecord.awardTitle
                        );
                        setModalRecord({
                          ...modalRecord,
                          conductRank: newConduct,
                          academicRank: autoEval.academicRank,
                          awardTitle: autoEval.awardTitle,
                        });
                      }}
                      className={`w-full px-3 py-2 rounded-xl border font-bold ${
                        !canEditAcademics ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white text-emerald-800 border-gray-200'
                      }`}
                    >
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[#17365D] block mb-1">Danh hiệu khen thưởng:</label>
                    <select
                      value={modalRecord.awardTitle || ''}
                      disabled={!canEditAcademics}
                      onChange={(e) => setModalRecord({ ...modalRecord, awardTitle: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border font-bold ${
                        !canEditAcademics ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white text-amber-900 border-gray-200'
                      }`}
                    >
                      <option value="">(Để trống - Chưa có)</option>
                      <option value="Học sinh Giỏi">Học sinh Giỏi</option>
                      <option value="Học sinh Xuất sắc">Học sinh Xuất sắc</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <span className="text-[11px] text-[#66809F]">
                  Đang xem: <strong>{modalTerm === 'hk1' ? 'Học kỳ 1' : modalTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingStudent(null);
                      setModalRecord(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-xs font-bold text-[#17365D]"
                  >
                    {canEditAcademics ? 'Hủy' : 'Đóng'}
                  </button>
                  {canEditAcademics && (
                    <button
                      onClick={handleSaveModalRecord}
                      className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu điểm & Xếp loại
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= AI COMMENT MODAL ================= */}
      {selectedStudentForAI && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1677E8] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#17365D] text-sm">
                    Gợi ý nhận xét AI ({activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}) cho: {selectedStudentForAI.fullName}
                  </h3>
                  <p className="text-[11px] text-[#66809F]">
                    {selectedStudentForAI.code} • Tổ {selectedStudentForAI.teamId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForAI(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              {isGeneratingAI ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-[#1677E8] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-[#66809F] font-medium">
                    Trợ lý AI đang soạn thảo nhận xét sư phạm theo TT22...
                  </p>
                </div>
              ) : (
                <>
                  <label className="text-xs font-semibold text-[#17365D] block">
                    Nội dung nhận xét sổ theo dõi / học bạ (có thể chỉnh sửa trước khi áp dụng):
                  </label>
                  <textarea
                    rows={6}
                    value={aiComment}
                    onChange={(e) => setAiComment(e.target.value)}
                    className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/30 text-xs text-[#17365D] leading-relaxed focus:ring-2 focus:ring-[#1677E8]"
                  ></textarea>
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => setSelectedStudentForAI(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
              >
                Hủy
              </button>
              <button
                disabled={isGeneratingAI || !aiComment || !canEditAcademics}
                onClick={handleApplyComment}
                title={!canEditAcademics ? "Cần đăng nhập tài khoản có quyền chỉnh sửa để lưu nhận xét" : undefined}
                className="px-4 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] disabled:opacity-50 font-bold text-xs text-white flex items-center gap-1.5 shadow-sm"
              >
                {!canEditAcademics ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                Lưu vào nhận xét {activeTerm === 'hk1' ? 'HK1' : activeTerm === 'hk2' ? 'HK2' : 'Cả năm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXCEL IMPORT MODAL ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#17365D] text-sm">
                    Nhập điểm từ file Excel / CSV ({activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'})
                  </h3>
                  <p className="text-[11px] text-[#66809F]">
                    Cập nhật tự động điểm 7 môn, 4 môn nhận xét và hạnh kiểm vào {activeTerm === 'hk1' ? 'HK1' : activeTerm === 'hk2' ? 'HK2' : 'Cả năm'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreviewData([]);
                  setImportFileName('');
                }}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Instructions & Template download */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
                <div className="space-y-1">
                  <p className="font-bold text-[#0B438A]">Định dạng các cột trong file:</p>
                  <p className="text-[11px] text-[#66809F]">
                    File cần có cột <strong>Mã học sinh</strong> (hoặc <strong>Họ và tên</strong>), các môn: Toán, Ngữ văn, Ngoại ngữ, KHTN, Lịch sử & ĐL, Tin học, GDCD.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-[#1677E8] font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <FileDown className="w-3.5 h-3.5" /> Tải file mẫu
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-[#1677E8] bg-blue-50/20 hover:bg-blue-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#1677E8] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-bold text-[#17365D]">
                  {importFileName ? importFileName : 'Nhấp vào đây để chọn tệp Excel (.xlsx, .xls, .csv)'}
                </p>
                <p className="text-[11px] text-[#66809F]">Hỗ trợ bảng điểm xuất từ vnEdu, SMAS hoặc file Excel tùy biến</p>
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {importError}
                </div>
              )}

              {/* Data Preview */}
              {importPreviewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17365D]">Xem trước dữ liệu ({importPreviewData.length} dòng):</span>
                    <span className="text-[11px] text-emerald-600 font-bold">✓ Tệp đã được đọc thành công</span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-48 text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-gray-100 text-[#17365D] sticky top-0">
                        <tr>
                          {Object.keys(importPreviewData[0]).slice(0, 8).map((k) => (
                            <th key={k} className="p-2 border-b whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importPreviewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).slice(0, 8).map((v: any, vIdx) => (
                              <td key={vIdx} className="p-2 whitespace-nowrap font-mono">{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-[11px] text-[#66809F]">
                Dữ liệu sẽ được cập nhật vào: <strong>{activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportPreviewData([]);
                    setImportFileName('');
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
                >
                  Hủy
                </button>
                <button
                  disabled={!importPreviewData.length}
                  onClick={handleApplyImportGrades}
                  className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] disabled:opacity-50 font-bold text-xs text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Áp dụng vào {activeTerm === 'hk1' ? 'Học kỳ 1' : activeTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
