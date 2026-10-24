import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  UserCheck,
  Edit,
  Trash2,
  X,
  Phone,
  Home,
  BookOpen,
  Award,
  CalendarCheck,
  MessageSquare,
  Sparkles,
  Save,
  FileSpreadsheet,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  ClipboardPaste,
  FileDown,
  Check,
  Lock,
  Eye,
  RotateCcw
} from 'lucide-react';
import { AppState, Student, SemesterTerm, SubjectGrades } from '../types';
import { initialStudents } from '../mockData';
import {
  evaluateStudentTT22,
  normalizeStudentTT22,
  defaultEvaluatedSubjects,
  getStudentSemesterRecord
} from '../utils/tt22Evaluation';
import { hasPermission, isReadOnly, isTeacher } from '../utils/permissionUtils';

interface StudentManagementProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  selectedStudentId?: string | null;
  onCloseStudentDetail?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  appState,
  onUpdateState,
  selectedStudentId,
  onCloseStudentDetail,
}) => {
  const { students } = appState;
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [awardFilter, setAwardFilter] = useState<string>('all');
  const [activeStudent, setActiveStudent] = useState<Student | null>(
    selectedStudentId ? students.find((s) => s.id === selectedStudentId) || null : null
  );
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'academics' | 'conduct' | 'parents'>('info');
  const [detailTerm, setDetailTerm] = useState<SemesterTerm>('caNam');

  // Add / Edit modal state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Partial<Student> | null>(null);

  // Delete confirmation modals & status notice (iframe-safe, replaces window.confirm/alert)
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string; code: string } | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  // Excel Import Modal state
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [excelImportSource, setExcelImportSource] = useState<'file' | 'paste'>('file');
  const [importedPreview, setImportedPreview] = useState<Student[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default avatars list for new students
  const defaultAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  ];

  // Helper to normalize column names
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Convert raw row object into Student
  const convertRowToStudent = (row: Record<string, any>, index: number, baseIndex: number): Student | null => {
    // Find matching keys
    let fullName = '';
    let code = '';
    let dateOfBirth = '15/08/2010';
    let gender: 'Nam' | 'Nữ' = 'Nam';
    let teamId = ((index % 4) + 1);
    let roleInClass = 'Thành viên';
    let parentName = '';
    let parentPhone = '';
    let parentJob = '';
    let address = '';
    let notes = '';

    for (const [rawK, val] of Object.entries(row)) {
      const k = normalizeKey(rawK);
      const strVal = String(val || '').trim();
      if (!strVal) continue;

      if (k.includes('hoten') || k === 'ten' || k.includes('hovaten') || k.includes('name')) {
        fullName = strVal;
      } else if (k.includes('mahs') || k.includes('mahocsinh') || k === 'ma' || k.includes('code')) {
        code = strVal;
      } else if (k.includes('ngaysinh') || k.includes('dob') || k.includes('birth')) {
        dateOfBirth = strVal;
      } else if (k.includes('gioitinh') || k === 'phai' || k === 'gender') {
        gender = strVal.toLowerCase().includes('nữ') || strVal.toLowerCase().includes('nu') || strVal.toLowerCase() === 'f' ? 'Nữ' : 'Nam';
      } else if (k === 'to' || k.includes('tohoc') || k.includes('team')) {
        const parsedTeam = parseInt(strVal.replace(/[^0-9]/g, ''));
        if (parsedTeam >= 1 && parsedTeam <= 4) teamId = parsedTeam;
      } else if (k.includes('chucvu') || k.includes('vaitro') || k.includes('role')) {
        roleInClass = strVal;
      } else if (k.includes('phuhuynh') || k.includes('hotenph') || k.includes('cha') || k.includes('me')) {
        parentName = strVal;
      } else if (k.includes('sdt') || k.includes('dienthoai') || k.includes('phone') || k.includes('lienhe')) {
        parentPhone = strVal;
      } else if (k.includes('nghenghiep') || k.includes('job')) {
        parentJob = strVal;
      } else if (k.includes('diachi') || k.includes('address') || k.includes('quequan')) {
        address = strVal;
      } else if (k.includes('ghichu') || k.includes('note')) {
        notes = strVal;
      }
    }

    if (!fullName) return null;

    const num = baseIndex + index + 1;
    const finalCode = code || `HS9A2-${String(num).padStart(2, '0')}`;
    const avatar = defaultAvatars[index % defaultAvatars.length];

    const studentObj: Student = {
      id: `hs-import-${Date.now()}-${index}`,
      code: finalCode,
      fullName,
      dateOfBirth,
      gender,
      avatar,
      address,
      teamId,
      roleInClass,
      parentName: parentName || `Phụ huynh em ${fullName}`,
      parentPhone: parentPhone || '09' + Math.floor(10000000 + Math.random() * 90000000),
      parentJob,
      academicRank: '',
      conductRank: 'Tốt',
      awardTitle: '',
      gpa: 0,
      notes: notes || 'Nhập từ file Excel',
      subjects: {},
      evaluatedSubjects: {},
    };

    return normalizeStudentTT22(studentObj);
  };

  // Download official Excel template
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        'STT': 1,
        'Mã học sinh': 'HS9A2-01',
        'Họ và tên': 'Nguyễn Văn An',
        'Ngày sinh': '12/03/2010',
        'Giới tính': 'Nam',
        'Tổ': 1,
        'Chức vụ': 'Lớp trưởng',
        'Họ tên Phụ huynh': 'Nguyễn Văn Bình',
        'Số điện thoại': '0912345678',
        'Địa chỉ': 'Số 15 Phố Huế, Hoàn Kiếm, Hà Nội',
        'Ghi chú': 'Học sinh ngoan, chăm chỉ',
      },
      {
        'STT': 2,
        'Mã học sinh': 'HS9A2-02',
        'Họ và tên': 'Trần Thị Mai',
        'Ngày sinh': '25/08/2010',
        'Giới tính': 'Nữ',
        'Tổ': 2,
        'Chức vụ': 'Lớp phó học tập',
        'Họ tên Phụ huynh': 'Trần Văn Hải',
        'Số điện thoại': '0987654321',
        'Địa chỉ': 'Số 88 Giảng Võ, Ba Đình, Hà Nội',
        'Ghi chú': 'Học giỏi môn Tiếng Anh',
      },
      {
        'STT': 3,
        'Mã học sinh': 'HS9A2-03',
        'Họ và tên': 'Lê Hoàng Long',
        'Ngày sinh': '10/11/2010',
        'Giới tính': 'Nam',
        'Tổ': 3,
        'Chức vụ': 'Thành viên',
        'Họ tên Phụ huynh': 'Lê Hoàng Nam',
        'Số điện thoại': '0936123456',
        'Địa chỉ': 'Số 22 Cầu Giấy, Hà Nội',
        'Ghi chú': 'Năng động, chơi thể thao tốt',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã HS
      { wch: 24 }, // Họ tên
      { wch: 14 }, // Ngày sinh
      { wch: 10 }, // Giới tính
      { wch: 8 },  // Tổ
      { wch: 18 }, // Chức vụ
      { wch: 22 }, // Họ tên PH
      { wch: 16 }, // SĐT
      { wch: 32 }, // Địa chỉ
      { wch: 28 }, // Ghi chú
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh_Lop_9A2.xlsx');
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setImportError('Tệp Excel không có dữ liệu hoặc sheet đầu tiên đang trống!');
          setImportedPreview([]);
          return;
        }

        const baseIndex = importMode === 'append' ? students.length : 0;
        const parsedList: Student[] = [];

        rawJson.forEach((row, idx) => {
          const student = convertRowToStudent(row, idx, baseIndex);
          if (student) {
            parsedList.push(student);
          }
        });

        if (parsedList.length === 0) {
          setImportError('Không tìm thấy cột Họ và tên học sinh trong tệp Excel. Vui lòng kiểm tra lại tiêu đề cột!');
          setImportedPreview([]);
          return;
        }

        setImportedPreview(parsedList);
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setImportError(`Không thể đọc tệp Excel: ${err.message || 'Tệp bị lỗi định dạng'}`);
        setImportedPreview([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle paste parse
  const handleParsePaste = () => {
    setImportError(null);
    if (!pasteContent.trim()) {
      setImportError('Vui lòng dán dữ liệu từ bảng tính Excel vào ô bên dưới!');
      return;
    }

    const lines = pasteContent.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setImportError('Dữ liệu dán vào không hợp lệ!');
      return;
    }

    // Try to detect if first line is headers
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const firstRowParts = lines[0].split(delimiter).map((c) => c.trim());
    const isHeaderRow = firstRowParts.some((c) => {
      const norm = normalizeKey(c);
      return norm.includes('ten') || norm.includes('ma') || norm.includes('ho');
    });

    const dataLines = isHeaderRow ? lines.slice(1) : lines;
    const headers = isHeaderRow ? firstRowParts : ['Mã HS', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Tổ', 'Chức vụ', 'Họ tên Phụ huynh', 'Số điện thoại', 'Địa chỉ'];

    const baseIndex = importMode === 'append' ? students.length : 0;
    const parsedList: Student[] = [];

    dataLines.forEach((line, index) => {
      const cells = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rowObj: Record<string, any> = {};
      cells.forEach((val, cIdx) => {
        const headerKey = headers[cIdx] || `Cột ${cIdx + 1}`;
        rowObj[headerKey] = val;
      });

      // Fallback: If only 1-2 columns, assume first is name or code & name
      if (cells.length === 1 && cells[0]) {
        rowObj['Họ và tên'] = cells[0];
      } else if (cells.length === 2 && cells[1]) {
        rowObj['Mã HS'] = cells[0];
        rowObj['Họ và tên'] = cells[1];
      }

      const student = convertRowToStudent(rowObj, index, baseIndex);
      if (student) {
        parsedList.push(student);
      }
    });

    if (parsedList.length === 0) {
      setImportError('Không nhận diện được học sinh nào từ dữ liệu đã dán!');
      setImportedPreview([]);
      return;
    }

    setImportedPreview(parsedList);
    setImportFileName(`Dán trực tiếp (${parsedList.length} học sinh)`);
  };

  // Confirm import and save to appState
  const handleConfirmImport = () => {
    if (importedPreview.length === 0) return;

    onUpdateState((prev) => {
      let finalStudents: Student[];
      if (importMode === 'replace') {
        finalStudents = importedPreview;
      } else {
        // Append mode: merge while checking duplicate codes
        const existingCodes = new Set(prev.students.map((s) => s.code));
        const newOnes = importedPreview.map((s, i) => {
          if (existingCodes.has(s.code)) {
            return {
              ...s,
              code: `HS9A2-${String(prev.students.length + i + 1).padStart(2, '0')}`,
            };
          }
          return s;
        });
        finalStudents = [...prev.students, ...newOnes];
      }

      // Also ensure attendance record for today has entries for all students
      const currentTodayRec = prev.attendanceHistory[prev.todayDate];
      let updatedAttendanceHistory = prev.attendanceHistory;
      if (currentTodayRec) {
        const updatedRecords = { ...currentTodayRec.records };
        finalStudents.forEach((st) => {
          if (!updatedRecords[st.id]) {
            updatedRecords[st.id] = { status: 'present' };
          }
        });
        const presentCount = Object.values(updatedRecords).filter((r: any) => r.status === 'present').length;
        const excusedCount = Object.values(updatedRecords).filter((r: any) => r.status === 'excused').length;
        const unexcusedCount = Object.values(updatedRecords).filter((r: any) => r.status === 'unexcused').length;
        const lateCount = Object.values(updatedRecords).filter((r: any) => r.status === 'late').length;

        updatedAttendanceHistory = {
          ...prev.attendanceHistory,
          [prev.todayDate]: {
            ...currentTodayRec,
            records: updatedRecords,
            summary: {
              total: finalStudents.length,
              present: presentCount,
              excused: excusedCount,
              unexcused: unexcusedCount,
              late: lateCount,
            },
          },
        };
      }

      return {
        ...prev,
        students: finalStudents,
        attendanceHistory: updatedAttendanceHistory,
      };
    });

    const addedCount = importedPreview.length;
    setIsExcelImportOpen(false);
    setImportedPreview([]);
    setImportFileName('');
    setPasteContent('');
    setImportError(null);
    setStatusNotice({
      type: 'success',
      message: `Thành công! Đã thêm ${addedCount} học sinh vào lớp ${appState.className}!`,
    });
  };

  // Sync selectedStudentId prop if changed
  React.useEffect(() => {
    if (selectedStudentId) {
      const found = students.find((s) => s.id === selectedStudentId);
      if (found) setActiveStudent(found);
    }
  }, [selectedStudentId, students]);

  // Filter students by Search, Team, TT22 Rank, and Award
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentPhone.includes(searchQuery);
    const matchTeam = teamFilter === 'all' || s.teamId === teamFilter;
    const matchRank =
      rankFilter === 'all' ||
      s.academicRank === rankFilter ||
      (rankFilter === 'Tốt' && s.academicRank === 'Giỏi') ||
      (rankFilter === 'Đạt' && s.academicRank === 'Trung bình') ||
      (rankFilter === 'Chưa đạt' && s.academicRank === 'Yếu');
    const matchAward =
      awardFilter === 'all' ||
      (awardFilter === 'none' ? !s.awardTitle : s.awardTitle === awardFilter);
    return matchSearch && matchTeam && matchRank && matchAward;
  });

  const canManage = hasPermission(appState, 'canManageStudents');
  const readOnly = isReadOnly(appState);

  const showNotice = (type: 'success' | 'warning' | 'info', message: string) => {
    setStatusNotice({ type, message });
    setTimeout(() => {
      setStatusNotice((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Helper to ensure teacher account is active when performing management actions
  const ensureTeacherAccount = (prev: AppState) => {
    if (hasPermission(prev, 'canManageStudents')) return prev.currentUser;
    const teacherAcc = prev.userAccounts?.find((u) => u.role === 'teacher');
    return teacherAcc || prev.currentUser;
  };

  // Batch auto-evaluate all students under TT22
  const handleBatchEvaluateTT22 = () => {
    if (students.length === 0) {
      showNotice('warning', 'Danh sách học sinh hiện đang trống, chưa có dữ liệu để xếp loại TT22.');
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      currentUser: ensureTeacherAccount(prev),
      students: prev.students.map(normalizeStudentTT22),
    }));
    showNotice(
      'success',
      `Đã cập nhật và đồng bộ xếp loại học lực cho ${students.length} học sinh theo chuẩn Thông tư 22/2021/TT-BGDĐT!`
    );
  };

  const handleOpenAdd = () => {
    const newStudent: Student = {
      id: `hs-${Date.now()}`,
      code: `HS9A2-${String(students.length + 1).padStart(2, '0')}`,
      fullName: '',
      dateOfBirth: '15/08/2010',
      gender: 'Nam',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      address: '',
      teamId: 1,
      roleInClass: 'Thành viên',
      parentName: '',
      parentPhone: '',
      parentJob: '',
      academicRank: '',
      conductRank: 'Tốt',
      awardTitle: '',
      gpa: 0,
      notes: '',
      subjects: {},
      evaluatedSubjects: {},
    };
    setStudentToEdit(newStudent);
    setIsEditingModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setStudentToEdit({
      ...s,
      evaluatedSubjects: s.evaluatedSubjects || {},
    });
    setIsEditingModalOpen(true);
  };

  const handleSaveStudent = () => {
    if (!studentToEdit || !studentToEdit.fullName?.trim()) return;

    const normalized = normalizeStudentTT22(studentToEdit as Student);

    onUpdateState((prev) => {
      const exists = prev.students.some((s) => s.id === normalized.id);
      let updatedList = [];
      if (exists) {
        updatedList = prev.students.map((s) =>
          s.id === normalized.id ? normalized : s
        );
      } else {
        updatedList = [normalized, ...prev.students];
      }
      return {
        ...prev,
        currentUser: ensureTeacherAccount(prev),
        students: updatedList,
      };
    });

    if (activeStudent && activeStudent.id === normalized.id) {
      setActiveStudent(normalized);
    }
    setIsEditingModalOpen(false);
    setStudentToEdit(null);
    showNotice('success', `Đã lưu hồ sơ học sinh "${normalized.fullName}" thành công!`);
  };

  const handleDeleteStudent = (id: string, name: string, code: string = '') => {
    setStudentToDelete({ id, name, code });
  };

  const handleConfirmDeleteSingle = () => {
    if (!studentToDelete) return;
    const { id, name } = studentToDelete;
    onUpdateState((prev) => ({
      ...prev,
      currentUser: ensureTeacherAccount(prev),
      students: prev.students.filter((s) => s.id !== id),
    }));
    if (activeStudent?.id === id) {
      setActiveStudent(null);
    }
    setStudentToDelete(null);
    showNotice('success', `Đã xóa hồ sơ học sinh "${name}" khỏi danh sách lớp.`);
  };

  const handleOpenDeleteAll = () => {
    if (students.length === 0) {
      showNotice('info', 'Danh sách hồ sơ học sinh hiện đã trống (0 học sinh).');
      return;
    }
    setIsDeleteAllModalOpen(true);
  };

  const handleConfirmDeleteAll = () => {
    const count = students.length;
    onUpdateState((prev) => ({
      ...prev,
      currentUser: ensureTeacherAccount(prev),
      students: [],
    }));
    setActiveStudent(null);
    setIsDeleteAllModalOpen(false);
    showNotice('success', `Đã xóa toàn bộ ${count} hồ sơ học sinh khỏi danh sách lớp ${appState.className}.`);
  };

  const handleRestoreSampleStudents = () => {
    onUpdateState((prev) => ({
      ...prev,
      currentUser: ensureTeacherAccount(prev),
      students: initialStudents.map(normalizeStudentTT22),
    }));
    showNotice('success', `Đã khôi phục danh sách mẫu gồm ${initialStudents.length} hồ sơ học sinh lớp 9A2.`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Mã HS',
      'Họ và tên',
      'Ngày sinh',
      'Giới tính',
      'Tổ',
      'Chức vụ',
      'Học lực (TT22)',
      'Danh hiệu (TT22)',
      'Rèn luyện',
      'Điểm TB',
      'Phụ huynh',
      'SĐT',
      'Ghi chú',
    ];
    const rows = students.map((s) => [
      s.code,
      `"${s.fullName}"`,
      s.dateOfBirth,
      s.gender,
      `Tổ ${s.teamId}`,
      `"${s.roleInClass}"`,
      s.academicRank || '-',
      `"${s.awardTitle || ''}"`,
      s.conductRank || '-',
      s.academicRank ? s.gpa : '-',
      `"${s.parentName}"`,
      s.parentPhone,
      `"${s.notes || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_sach_hoc_sinh_TT22_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Status Notice Banner */}
      {statusNotice && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
            statusNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusNotice.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-blue-50 border-blue-200 text-[#0B438A]'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusNotice.message}</span>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-current"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top action toolbar */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#17365D]">Hồ sơ học sinh Lớp 9A2</h2>
          <p className="text-xs text-[#66809F] font-medium">
            Tổng cộng: <strong className="text-[#1677E8] font-bold">{students.length} học sinh</strong> (Nam:{' '}
            {students.filter((s) => s.gender === 'Nam').length} - Nữ:{' '}
            {students.filter((s) => s.gender === 'Nữ').length})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm họ tên, mã HS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border border-[#D8E7FA] text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1677E8]"
            />
          </div>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-gray-50 border border-[#D8E7FA] text-xs font-medium text-[#17365D] focus:outline-hidden"
          >
            <option value="all">Tất cả các tổ</option>
            <option value="1">Tổ 1</option>
            <option value="2">Tổ 2</option>
            <option value="3">Tổ 3</option>
            <option value="4">Tổ 4</option>
          </select>

          {/* Academic Rank Filter (TT22) */}
          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-50 border border-[#D8E7FA] text-xs font-medium text-[#17365D] focus:outline-hidden"
          >
            <option value="all">Tất cả học lực (TT22)</option>
            <option value="Tốt">Mức Tốt</option>
            <option value="Khá">Mức Khá</option>
            <option value="Đạt">Mức Đạt</option>
            <option value="Chưa đạt">Mức Chưa đạt</option>
          </select>

          {/* Award Title Filter */}
          <select
            value={awardFilter}
            onChange={(e) => setAwardFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-50 border border-[#D8E7FA] text-xs font-medium text-[#17365D] focus:outline-hidden"
          >
            <option value="all">Tất cả danh hiệu</option>
            <option value="Học sinh Xuất sắc">Học sinh Xuất sắc</option>
            <option value="Học sinh Giỏi">Học sinh Giỏi</option>
            <option value="none">Chưa có danh hiệu</option>
          </select>

          {/* Batch Evaluate TT22 Button */}
          <button
            onClick={handleBatchEvaluateTT22}
            title="Đồng bộ tính toán xếp loại cả lớp theo Thông tư 22"
            className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1677E8]" />
            <span>Xếp loại TT22</span>
          </button>

          {/* Export button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-white border border-[#D8E7FA] hover:bg-gray-50 text-xs font-semibold text-[#17365D] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#1677E8]" />
            Xuất Excel
          </button>

          {/* Add students from Excel button */}
          <button
            onClick={() => {
              setIsExcelImportOpen(true);
              setImportedPreview([]);
              setImportFileName('');
              setPasteContent('');
              setImportError(null);
            }}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Thêm bằng file Excel
          </button>

          {/* Add student button */}
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm học sinh
          </button>

          {/* Delete All Student Profiles button */}
          {students.length > 0 ? (
            <button
              onClick={handleOpenDeleteAll}
              title="Xóa tất cả danh sách hồ sơ học sinh trong lớp"
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-600/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa tất cả ({students.length})</span>
            </button>
          ) : (
            <button
              onClick={handleRestoreSampleStudents}
              title="Khôi phục danh sách 38 học sinh mẫu lớp 9A2"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục DS mẫu (38 HS)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10.5px]">
              <tr>
                <th className="py-3 px-3.5">STT</th>
                <th className="py-3 px-3.5">Mã HS</th>
                <th className="py-3 px-3.5">Họ và tên</th>
                <th className="py-3 px-3.5">Ngày sinh</th>
                <th className="py-3 px-3.5">Giới tính</th>
                <th className="py-3 px-3.5">Tổ</th>
                <th className="py-3 px-3.5">Chức vụ</th>
                <th className="py-3 px-3 text-center">Học lực (TT22)</th>
                <th className="py-3 px-3 text-center">Danh hiệu</th>
                <th className="py-3 px-3 text-center">Rèn luyện</th>
                <th className="py-3 px-3 text-center">Điểm TB</th>
                <th className="py-3 px-3.5">Phụ huynh / SĐT</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1677E8] flex items-center justify-center mx-auto">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-extrabold text-[#17365D]">
                        Danh sách hồ sơ học sinh hiện đang trống (0 học sinh)
                      </h3>
                      <p className="text-xs text-[#66809F]">
                        Thầy/cô có thể thêm học sinh mới thủ công, tải danh sách từ tệp Excel hoặc khôi phục danh sách mẫu lớp 9A2.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleOpenAdd}
                          className="px-3.5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm học sinh mới
                        </button>
                        <button
                          onClick={() => {
                            setIsExcelImportOpen(true);
                            setImportedPreview([]);
                            setImportFileName('');
                            setPasteContent('');
                            setImportError(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Thêm bằng file Excel
                        </button>
                        <button
                          onClick={handleRestoreSampleStudents}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Khôi phục DS mẫu (38 HS)
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-[#66809F]">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, index) => (
                  <tr
                    key={s.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="py-3 px-3.5 font-semibold text-[#66809F]">{index + 1}</td>
                    <td className="py-3 px-3.5 font-mono text-[#0B438A] font-semibold">{s.code}</td>
                    <td className="py-3 px-3.5">
                      <div
                        onClick={() => setActiveStudent(s)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <img
                          src={s.avatar}
                          alt={s.fullName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-blue-200"
                        />
                        <span className="font-bold text-[#17365D] group-hover:text-[#1677E8]">
                          {s.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-[#66809F] font-mono">{s.dateOfBirth}</td>
                    <td className="py-3 px-3.5 text-[#66809F]">{s.gender}</td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0B438A] font-semibold text-[11px]">
                        Tổ {s.teamId}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-[#66809F] font-medium">{s.roleInClass}</td>
                    
                    {/* Học lực TT22 */}
                    <td className="py-3 px-3 text-center">
                      {!s.academicRank ? (
                        <span className="text-gray-300 font-mono">-</span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-block ${
                            s.academicRank === 'Tốt' || s.academicRank === 'Giỏi'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : s.academicRank === 'Khá'
                              ? 'bg-blue-100 text-[#0B438A] border border-blue-200'
                              : s.academicRank === 'Đạt' || s.academicRank === 'Trung bình'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {s.academicRank === 'Giỏi' ? 'Tốt' : s.academicRank === 'Trung bình' ? 'Đạt' : s.academicRank === 'Yếu' ? 'Chưa đạt' : s.academicRank}
                        </span>
                      )}
                    </td>

                    {/* Danh hiệu khen thưởng TT22 */}
                    <td className="py-3 px-3 text-center">
                      {s.awardTitle === 'Học sinh Xuất sắc' ? (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-extrabold text-[10px] inline-flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3 text-white" /> Xuất sắc
                        </span>
                      ) : s.awardTitle === 'Học sinh Giỏi' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10.5px] inline-flex items-center gap-1">
                          <Award className="w-3 h-3 text-emerald-700" /> HS Giỏi
                        </span>
                      ) : (
                        <span className="text-gray-300 font-mono">-</span>
                      )}
                    </td>

                    {/* Rèn luyện */}
                    <td className="py-3 px-3 text-center font-semibold text-[#10B981]">
                      {s.conductRank || <span className="text-gray-300 font-mono font-normal">-</span>}
                    </td>
                    
                    {/* ĐTB */}
                    <td className="py-3 px-3 text-center font-bold text-[#17365D] font-mono tabular-nums">
                      {!s.academicRank && (!s.gpa || s.gpa === 0) ? (
                        <span className="text-gray-300 font-normal">-</span>
                      ) : (
                        s.gpa.toFixed(1)
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-[#66809F]">
                      <div className="leading-tight">
                        <span className="text-[#17365D] font-medium block">{s.parentName}</span>
                        <span className="text-[10.5px] font-mono text-gray-400">{s.parentPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveStudent(s)}
                          title="Xem hồ sơ chi tiết"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Chỉnh sửa thông tin"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id, s.fullName, s.code)}
                          title="Xóa hồ sơ học sinh"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Detail Modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#D8E7FA] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
              <div className="flex items-center gap-3.5">
                <img
                  src={activeStudent.avatar}
                  alt={activeStudent.fullName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#17365D]">
                      {activeStudent.fullName}
                    </h3>
                    <span className="text-xs font-mono font-bold text-[#1677E8] bg-blue-50 px-2 py-0.5 rounded-md">
                      {activeStudent.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#66809F]">
                    Tổ {activeStudent.teamId} • {activeStudent.roleInClass} • Ngày sinh: {activeStudent.dateOfBirth}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveStudent(null);
                  if (onCloseStudentDetail) onCloseStudentDetail();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1 px-5 border-b border-gray-100 bg-gray-50/50 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-[#1677E8] text-[#1677E8]'
                    : 'border-transparent text-[#66809F] hover:text-[#17365D]'
                }`}
              >
                Thông tin chung
              </button>
              <button
                onClick={() => setActiveTab('academics')}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'academics'
                    ? 'border-[#1677E8] text-[#1677E8]'
                    : 'border-transparent text-[#66809F] hover:text-[#17365D]'
                }`}
              >
                Bảng điểm môn học
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'attendance'
                    ? 'border-[#1677E8] text-[#1677E8]'
                    : 'border-transparent text-[#66809F] hover:text-[#17365D]'
                }`}
              >
                Lịch sử chuyên cần
              </button>
              <button
                onClick={() => setActiveTab('parents')}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'parents'
                    ? 'border-[#1677E8] text-[#1677E8]'
                    : 'border-transparent text-[#66809F] hover:text-[#17365D]'
                }`}
              >
                Liên hệ phụ huynh
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[#66809F] font-medium">Họ và tên:</span>
                    <p className="font-bold text-[#17365D] text-sm">{activeStudent.fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#66809F] font-medium">Giới tính:</span>
                    <p className="font-semibold text-[#17365D]">{activeStudent.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#66809F] font-medium">Địa chỉ gia đình:</span>
                    <p className="font-medium text-[#17365D]">{activeStudent.address || 'Đang cập nhật'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#66809F] font-medium">Họ tên Phụ huynh:</span>
                    <p className="font-semibold text-[#17365D]">{activeStudent.parentName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#66809F] font-medium">Số điện thoại liên lạc:</span>
                    <p className="font-bold text-[#1677E8] font-mono">{activeStudent.parentPhone}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#66809F] font-medium">Nghề nghiệp phụ huynh:</span>
                    <p className="font-medium text-[#17365D]">{activeStudent.parentJob || 'Chưa ghi'}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-100">
                    <span className="text-[#66809F] font-medium block mb-1">Ghi chú của GVCN:</span>
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[#17365D] font-medium leading-relaxed">
                      {activeStudent.notes || 'Học sinh chấp hành tốt quy định của trường lớp.'}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'academics' && (() => {
                const termRec = getStudentSemesterRecord(activeStudent, detailTerm);
                const tt22Res = evaluateStudentTT22(
                  termRec.subjects,
                  termRec.evaluatedSubjects,
                  termRec.conductRank,
                  termRec.awardTitle
                );

                return (
                  <div className="space-y-4">
                    {/* Semester Switcher Bar */}
                    <div className="flex items-center justify-between bg-blue-50/60 p-2 rounded-2xl border border-blue-200">
                      <span className="text-xs font-extrabold text-[#0B438A] flex items-center gap-1.5 pl-2">
                        <span>📅</span> Xem bảng điểm theo kỳ:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailTerm('hk1')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            detailTerm === 'hk1'
                              ? 'bg-[#1677E8] text-white shadow-xs'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          📘 Học kỳ 1
                        </button>
                        <button
                          onClick={() => setDetailTerm('hk2')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            detailTerm === 'hk2'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          📗 Học kỳ 2
                        </button>
                        <button
                          onClick={() => setDetailTerm('caNam')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            detailTerm === 'caNam'
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-xs'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          🏆 Cả năm
                        </button>
                      </div>
                    </div>

                    {/* Summary 4 Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 text-center">
                        <span className="text-[11px] text-[#66809F] block">
                          Điểm trung bình ({detailTerm === 'caNam' ? 'ĐTBmcn' : 'ĐTBm'})
                        </span>
                        <h4 className="text-xl font-black text-[#0B438A] mt-0.5">
                          {!termRec.academicRank && (!termRec.gpa || termRec.gpa === 0) ? '-' : termRec.gpa.toFixed(1)}
                        </h4>
                      </div>

                      <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-center">
                        <span className="text-[11px] text-[#66809F] block">Học lực (Thông tư 22)</span>
                        <h4 className="text-base font-extrabold text-emerald-800 mt-1">
                          {!termRec.academicRank
                            ? '-'
                            : termRec.academicRank === 'Giỏi'
                            ? 'Tốt'
                            : termRec.academicRank === 'Trung bình'
                            ? 'Đạt'
                            : termRec.academicRank === 'Yếu'
                            ? 'Chưa đạt'
                            : termRec.academicRank}
                        </h4>
                      </div>

                      <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 text-center">
                        <span className="text-[11px] text-[#66809F] block">Danh hiệu khen thưởng</span>
                        <h4 className="text-xs font-black text-amber-900 mt-1">
                          {termRec.awardTitle ? (
                            <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              {termRec.awardTitle}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </h4>
                      </div>

                      <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-center">
                        <span className="text-[11px] text-[#66809F] block">Rèn luyện / Hạnh kiểm</span>
                        <h4 className="text-base font-bold text-indigo-700 mt-1">{termRec.conductRank || '-'}</h4>
                      </div>
                    </div>

                    {/* TT22 Rule Reference Box */}
                    <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 rounded-2xl border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-[#17365D] text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Chuẩn đánh giá ({detailTerm === 'hk1' ? 'Học kỳ 1' : detailTerm === 'hk2' ? 'Học kỳ 2' : 'Cả năm'}) theo TT 22/2021/TT-BGDĐT:
                        </h5>
                        <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-blue-100 text-[#073B82] font-bold">
                          {termRec.academicRank ? `Kết quả: Mức ${termRec.academicRank}` : 'Chưa có kết quả (-)'}
                        </span>
                      </div>
                      
                      <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 text-[11px] leading-relaxed text-[#17365D]">
                        <strong>Nhận định xếp loại:</strong> {tt22Res.reason}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] text-[#66809F] pt-1">
                        <div className="p-2 rounded-xl bg-white/70 border border-gray-100">
                          <strong className="text-emerald-700 block mb-0.5">a) Mức Tốt:</strong>
                          Tất cả môn nhận xét đạt Đạt; tất cả môn điểm số ≥ 6.5, có ít nhất 06 môn đạt ≥ 8.0.
                        </div>
                        <div className="p-2 rounded-xl bg-white/70 border border-gray-100">
                          <strong className="text-blue-700 block mb-0.5">b) Mức Khá:</strong>
                          Tất cả môn nhận xét đạt Đạt; tất cả môn điểm số ≥ 5.0, có ít nhất 06 môn đạt ≥ 6.5.
                        </div>
                        <div className="p-2 rounded-xl bg-white/70 border border-gray-100">
                          <strong className="text-amber-700 block mb-0.5">c) Mức Đạt:</strong>
                          Có tối đa 01 môn nhận xét Chưa đạt; có ít nhất 06 môn điểm số ≥ 5.0; không có môn nào &lt; 3.5.
                        </div>
                        <div className="p-2 rounded-xl bg-white/70 border border-gray-100">
                          <strong className="text-purple-700 block mb-0.5">d) Khen thưởng:</strong>
                          Học lực Tốt đạt Học sinh Giỏi / Học sinh Xuất sắc (nếu có 6 môn ≥ 9.0); Còn lại để trống.
                        </div>
                      </div>
                    </div>

                    {/* 7 Scored Subjects */}
                    <div>
                      <h5 className="font-extrabold text-[#17365D] mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#1677E8]" />
                        Điểm số 7 môn học ({detailTerm === 'caNam' ? 'ĐTBmcn' : 'ĐTBm'}):
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {termRec.subjects &&
                          (['math', 'literature', 'english', 'naturalScience', 'historyGeography', 'informatics', 'civics'] as (keyof SubjectGrades)[]).map((subjectKey) => {
                            const score = termRec.subjects[subjectKey];
                            const hasScore = typeof score === 'number' && !isNaN(score);
                            const subjectNames: Record<string, string> = {
                              math: 'Toán học',
                              literature: 'Ngữ văn',
                              english: 'Tiếng Anh',
                              naturalScience: 'KHTN',
                              historyGeography: 'Lịch sử & Địa lý',
                              informatics: 'Tin học',
                              civics: 'GDCD',
                            };
                            const isHigh = hasScore && score >= 8.0;
                            const isMedium = hasScore && score >= 6.5;
                            const isPass = hasScore && score >= 5.0;
                            return (
                              <div
                                key={subjectKey}
                                className={`p-2.5 rounded-xl border text-center transition-all ${
                                  !hasScore
                                    ? 'bg-gray-50 border-gray-200 text-gray-400'
                                    : isHigh
                                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                    : isMedium
                                    ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                                    : isPass
                                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                                    : 'bg-red-50/60 border-red-200 text-red-900'
                                }`}
                              >
                                <span className="text-[11px] font-medium block mb-0.5 text-gray-600">
                                  {subjectNames[subjectKey] || subjectKey}
                                </span>
                                <span className="text-lg font-black font-mono">
                                  {hasScore ? score.toFixed(1) : '-'}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* 4 Evaluated Subjects */}
                    <div className="pt-2 border-t border-gray-100">
                      <h5 className="font-extrabold text-[#17365D] mb-2 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-purple-600" />
                        4 môn học đánh giá bằng nhận xét ({detailTerm === 'caNam' ? 'Cả năm' : detailTerm === 'hk1' ? 'HK1' : 'HK2'}):
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { key: 'physicalEducation', label: 'GD Thể chất' },
                          { key: 'art', label: 'Nghệ thuật' },
                          { key: 'experientialActivities', label: 'HĐ Trải nghiệm' },
                          { key: 'localEducation', label: 'GD Địa phương' },
                        ].map((sub) => {
                          const status = (termRec.evaluatedSubjects as any)?.[sub.key];
                          return (
                            <div key={sub.key} className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-200 flex items-center justify-between">
                              <span className="text-[11px] font-medium text-gray-700">{sub.label}</span>
                              {!status ? (
                                <span className="text-gray-300 font-mono font-bold">-</span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                  status === 'Đạt' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {status}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'attendance' && (
                <div className="space-y-3">
                  <p className="text-[#66809F]">Theo dõi số buổi chuyên cần trong học kỳ:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                      <span className="text-[#10B981] font-bold text-lg block">98%</span>
                      <span className="text-[11px] text-gray-600">Tỷ lệ đi học đầy đủ</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                      <span className="text-amber-600 font-bold text-lg block">01</span>
                      <span className="text-[11px] text-gray-600">Buổi nghỉ phép</span>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                      <span className="text-red-600 font-bold text-lg block">00</span>
                      <span className="text-[11px] text-gray-600">Nghỉ không phép</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'parents' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#17365D]">{activeStudent.parentName}</p>
                      <p className="text-xs text-[#66809F]">Phụ huynh của em {activeStudent.fullName}</p>
                    </div>
                    <a
                      href={`tel:${activeStudent.parentPhone}`}
                      className="px-3 py-1.5 rounded-lg bg-[#1677E8] text-white font-bold flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {activeStudent.parentPhone}
                    </a>
                  </div>

                  <p className="font-bold text-[#17365D] mt-2">Nhật ký phối hợp giáo dục gần nhất:</p>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                    <div className="flex justify-between text-[#66809F]">
                      <span>10/09/2026 • Gọi điện trao đổi</span>
                      <span className="text-emerald-600 font-semibold">Đã hoàn thành</span>
                    </div>
                    <p className="text-[#17365D]">
                      Trao đổi về việc tham gia hoạt động trải nghiệm đền Hùng và phối hợp đôn đốc học sinh ôn tập giữa kỳ I.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => handleOpenEdit(activeStudent)}
                className="px-4 py-2 rounded-xl bg-blue-50 text-[#1677E8] hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Sửa hồ sơ
              </button>
              <button
                onClick={() => setActiveStudent(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isEditingModalOpen && studentToEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#D8E7FA]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
              <h3 className="font-extrabold text-[#17365D] text-base">
                {students.some((s) => s.id === studentToEdit.id)
                  ? 'Chỉnh sửa thông tin học sinh'
                  : 'Thêm học sinh mới'}
              </h3>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Mã học sinh</label>
                  <input
                    type="text"
                    value={studentToEdit.code || ''}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#1677E8]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={studentToEdit.fullName || ''}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, fullName: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#1677E8]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Ngày sinh (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={studentToEdit.dateOfBirth || ''}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#1677E8]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Giới tính</label>
                  <select
                    value={studentToEdit.gender || 'Nam'}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Thuộc Tổ</label>
                  <select
                    value={studentToEdit.teamId || 1}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, teamId: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  >
                    <option value={1}>Tổ 1</option>
                    <option value={2}>Tổ 2</option>
                    <option value={3}>Tổ 3</option>
                    <option value={4}>Tổ 4</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Chức vụ trong lớp</label>
                  <input
                    type="text"
                    value={studentToEdit.roleInClass || 'Thành viên'}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, roleInClass: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Họ tên Phụ huynh</label>
                  <input
                    type="text"
                    value={studentToEdit.parentName || ''}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, parentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Số điện thoại liên lạc</label>
                  <input
                    type="text"
                    value={studentToEdit.parentPhone || ''}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-[#17365D] block mb-1">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    value={studentToEdit.address || ''}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-[#17365D] block mb-1">Ghi chú giáo dục</label>
                  <textarea
                    rows={2}
                    value={studentToEdit.notes || ''}
                    onChange={(e) => setStudentToEdit({ ...studentToEdit, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  ></textarea>
                </div>

                {/* TT22 Academic and Conduct Assessment */}
                <div className="col-span-2 p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3.5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#1677E8]" />
                      <span className="font-extrabold text-[#17365D] text-xs">
                        Đánh giá Học lực & Rèn luyện (Chuẩn Thông tư 22/2021/TT-BGDĐT)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!studentToEdit) return;
                        const res = evaluateStudentTT22(
                          studentToEdit.subjects || {},
                          studentToEdit.evaluatedSubjects || defaultEvaluatedSubjects,
                          studentToEdit.conductRank || 'Tốt',
                          studentToEdit.awardTitle
                        );
                        setStudentToEdit({
                          ...studentToEdit,
                          academicRank: res.academicRank,
                          awardTitle: res.awardTitle,
                          gpa: res.gpa,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1677E8] text-white hover:bg-[#0B438A] font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>⚡ Tự động xếp loại TT22</span>
                    </button>
                  </div>

                  {/* Row for Ranks & Award Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-[#17365D] block mb-1">
                        Học lực (TT22):
                      </label>
                      <select
                        value={studentToEdit.academicRank || ''}
                        onChange={(e) => setStudentToEdit({ ...studentToEdit, academicRank: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-blue-200 bg-white font-bold text-[#0B438A]"
                      >
                        <option value="">- (Chưa xếp loại)</option>
                        <option value="Tốt">Mức Tốt</option>
                        <option value="Khá">Mức Khá</option>
                        <option value="Đạt">Mức Đạt</option>
                        <option value="Chưa đạt">Mức Chưa đạt</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-[#17365D] block mb-1">
                        Danh hiệu khen thưởng:
                      </label>
                      <select
                        value={studentToEdit.awardTitle || ''}
                        onChange={(e) => setStudentToEdit({ ...studentToEdit, awardTitle: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-blue-200 bg-white font-bold text-amber-900"
                      >
                        <option value="">(Để trống - Chưa có danh hiệu)</option>
                        <option value="Học sinh Giỏi">Học sinh Giỏi</option>
                        <option value="Học sinh Xuất sắc">Học sinh Xuất sắc</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-[#17365D] block mb-1">
                        Hạnh kiểm / Rèn luyện:
                      </label>
                      <select
                        value={studentToEdit.conductRank || 'Tốt'}
                        onChange={(e) => setStudentToEdit({ ...studentToEdit, conductRank: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-blue-200 bg-white font-bold text-emerald-800"
                      >
                        <option value="Tốt">Tốt</option>
                        <option value="Khá">Khá</option>
                        <option value="Đạt">Đạt</option>
                        <option value="Chưa đạt">Chưa đạt</option>
                      </select>
                    </div>
                  </div>

                  {/* Scores Grid for 7 Scored Subjects */}
                  <div>
                    <span className="font-semibold text-[#17365D] block mb-1.5 text-[11px]">
                      Điểm số 7 môn đánh giá kết hợp nhận xét (ĐTBm - để trống nếu chưa có kết quả):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'math', label: 'Toán' },
                        { key: 'literature', label: 'Ngữ văn' },
                        { key: 'english', label: 'Tiếng Anh' },
                        { key: 'naturalScience', label: 'KHTN' },
                        { key: 'historyGeography', label: 'Sử - Địa' },
                        { key: 'informatics', label: 'Tin học' },
                        { key: 'civics', label: 'GDCD' },
                      ].map((sub) => {
                        const rawVal = (studentToEdit.subjects as any)?.[sub.key];
                        return (
                          <div key={sub.key} className="p-2 bg-white rounded-xl border border-blue-100 flex items-center justify-between">
                            <span className="font-medium text-gray-700 text-[11px]">{sub.label}:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              placeholder="-"
                              value={rawVal !== undefined && rawVal !== null && !isNaN(rawVal) ? rawVal : ''}
                              onChange={(e) => {
                                const str = e.target.value;
                                const nextSubjects = { ...(studentToEdit.subjects || {}) } as any;
                                if (str === '') {
                                  delete nextSubjects[sub.key];
                                } else {
                                  nextSubjects[sub.key] = Math.min(10, Math.max(0, parseFloat(str) || 0));
                                }
                                setStudentToEdit({
                                  ...studentToEdit,
                                  subjects: nextSubjects,
                                });
                              }}
                              className="w-14 px-1.5 py-0.5 rounded-lg border border-gray-200 text-center font-bold text-[#0B438A] placeholder:text-gray-300"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Evaluated Subjects: GDTC, Nghệ thuật, HĐTN-HN, GDĐP */}
                  <div className="pt-2 border-t border-blue-200/60">
                    <span className="font-semibold text-[#17365D] block mb-1.5 text-[11px]">
                      4 môn đánh giá hoàn toàn bằng nhận xét:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'physicalEducation', label: 'GD Thể chất' },
                        { key: 'art', label: 'Nghệ thuật' },
                        { key: 'experientialActivities', label: 'HĐTN - HN' },
                        { key: 'localEducation', label: 'GD Địa phương' },
                      ].map((sub) => (
                        <div key={sub.key} className="p-2 bg-white rounded-xl border border-blue-100 flex items-center justify-between">
                          <span className="font-medium text-gray-700 text-[11px]">{sub.label}:</span>
                          <select
                            value={(studentToEdit.evaluatedSubjects as any)?.[sub.key] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextEval = { ...(studentToEdit.evaluatedSubjects || {}) } as any;
                              if (!val) {
                                delete nextEval[sub.key];
                              } else {
                                nextEval[sub.key] = val;
                              }
                              setStudentToEdit({
                                ...studentToEdit,
                                evaluatedSubjects: nextEval,
                              });
                            }}
                            className="px-1.5 py-0.5 rounded-lg border border-gray-200 font-bold text-xs bg-gray-50"
                          >
                            <option value="">- (Trống)</option>
                            <option value="Đạt">Đạt</option>
                            <option value="Chưa đạt">Chưa đạt</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveStudent}
                className="px-4 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] font-bold text-xs text-white flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu học sinh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isExcelImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-[#D8E7FA] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-blue-50/40 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#17365D] flex items-center gap-2">
                    Thêm học sinh bằng file Excel
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono">
                      .XLSX / .CSV
                    </span>
                  </h3>
                  <p className="text-xs text-[#66809F]">
                    Tải danh sách học sinh từ bảng tính Excel vào hệ thống lớp {appState.className}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadExcelTemplate}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Tải tệp mẫu Excel có sẵn các cột chuẩn"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                  Tải file mẫu Excel
                </button>

                <button
                  onClick={() => setIsExcelImportOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Method Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                  onClick={() => setExcelImportSource('file')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors ${
                    excelImportSource === 'file'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
                  }`}
                >
                  <FileUp className="w-4 h-4" />
                  1. Tải tệp Excel lên (.xlsx, .xls, .csv)
                </button>
                <button
                  onClick={() => setExcelImportSource('paste')}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors ${
                    excelImportSource === 'paste'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  2. Sao chép & Dán trực tiếp từ Excel
                </button>
              </div>

              {/* Upload Input Area */}
              {excelImportSource === 'file' ? (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 mx-auto flex items-center justify-center shadow-xs border border-emerald-200 group-hover:scale-105 transition-transform mb-3">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#17365D] text-sm">
                      Nhấp để chọn tệp Excel hoặc kéo thả tệp vào đây
                    </p>
                    <p className="text-[#66809F] text-[11px] mt-1">
                      Hỗ trợ Microsoft Excel (.xlsx, .xls) và tệp CSV phân cách dấu phẩy/tab
                    </p>
                    {importFileName && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-xs font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Tệp đã chọn: {importFileName}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[#66809F]">
                    Mở file Excel của thầy/cô, quét chọn vùng dữ liệu học sinh, bấm <strong>Ctrl+C</strong> (Copy), sau đó bấm <strong>Ctrl+V</strong> vào khung dưới đây:
                  </p>
                  <textarea
                    rows={6}
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder="Dán dữ liệu học sinh từ Excel vào đây... (Ví dụ: Nguyễn Văn An	12/03/2010	Nam	1	0912345678)"
                    className="w-full p-3.5 rounded-xl border border-gray-200 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500"
                  ></textarea>
                  <div className="flex justify-end">
                    <button
                      onClick={handleParsePaste}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Phân tích dữ liệu đã dán
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {importError && (
                <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-red-700 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <p className="font-medium text-xs">{importError}</p>
                </div>
              )}

              {/* Preview of Imported Students */}
              {importedPreview.length > 0 && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                    <div>
                      <h4 className="font-extrabold text-[#0B438A] text-sm">
                        Đã nhận diện thành công: {importedPreview.length} học sinh
                      </h4>
                      <p className="text-[11px] text-[#66809F] mt-0.5">
                        Nam: {importedPreview.filter((s) => s.gender === 'Nam').length} • Nữ:{' '}
                        {importedPreview.filter((s) => s.gender === 'Nữ').length}
                      </p>
                    </div>

                    {/* Mode selection: append vs replace */}
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <label className="flex items-center gap-2 cursor-pointer text-[#17365D]">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Thêm nối tiếp (+{importedPreview.length} HS)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-[#17365D]">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-red-700">Ghi đè danh sách lớp</span>
                      </label>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 font-bold text-[#17365D] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">STT</th>
                          <th className="py-2.5 px-3">Mã HS</th>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Ngày sinh</th>
                          <th className="py-2.5 px-3">Giới tính</th>
                          <th className="py-2.5 px-3">Tổ</th>
                          <th className="py-2.5 px-3">Chức vụ</th>
                          <th className="py-2.5 px-3">Phụ huynh</th>
                          <th className="py-2.5 px-3">SĐT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importedPreview.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-semibold text-[#66809F]">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-blue-700 font-bold">{s.code}</td>
                            <td className="py-2 px-3 font-bold text-[#17365D]">{s.fullName}</td>
                            <td className="py-2 px-3 font-mono text-gray-500">{s.dateOfBirth}</td>
                            <td className="py-2 px-3">{s.gender}</td>
                            <td className="py-2 px-3">Tổ {s.teamId}</td>
                            <td className="py-2 px-3 text-gray-600">{s.roleInClass}</td>
                            <td className="py-2 px-3">{s.parentName}</td>
                            <td className="py-2 px-3 font-mono text-blue-600">{s.parentPhone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/60">
              <span className="text-[11px] text-[#66809F] italic">
                * Dữ liệu sau khi nhập sẽ được tự động lưu vào cơ sở dữ liệu và đồng bộ tức thì lên Dashboard.
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExcelImportOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
                >
                  Đóng
                </button>
                <button
                  disabled={importedPreview.length === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs text-white flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all"
                >
                  <Check className="w-4 h-4" />
                  Xác nhận thêm {importedPreview.length > 0 ? `${importedPreview.length} ` : ''}học sinh vào lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Single Student Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
            <div className="p-5 bg-red-50/70 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-900">Xác nhận xóa hồ sơ học sinh</h3>
                <p className="text-xs text-red-700">Thao tác xóa học sinh khỏi danh sách lớp {appState.className}</p>
              </div>
            </div>
            <div className="p-5 space-y-3 text-xs text-[#17365D]">
              <p className="leading-relaxed">
                Thầy/cô có chắc chắn muốn xóa hồ sơ học sinh{' '}
                <strong className="text-red-700 font-extrabold">{studentToDelete.name}</strong>
                {studentToDelete.code ? ` (${studentToDelete.code})` : ''} khỏi danh sách lớp không?
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white flex items-center gap-1.5 shadow-sm shadow-red-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete All Students Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-red-50 via-red-50/60 to-white border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-600/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-red-900">
                    Xóa tất cả danh sách hồ sơ học sinh
                  </h3>
                  <p className="text-xs text-red-700 font-medium">
                    Lớp {appState.className} • Hiện có {students.length} hồ sơ học sinh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-[#17365D]">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 leading-relaxed">
                <p className="font-bold text-sm mb-1">
                  Thầy/cô có chắc chắn muốn xóa toàn bộ {students.length} hồ sơ học sinh?
                </p>
                <p className="text-red-800">
                  Sau khi xóa tất cả, danh sách hồ sơ học sinh sẽ về trạng thái trống (0 học sinh) để thầy/cô có thể nhập danh sách lớp mới từ file Excel hoặc thêm thủ công.
                </p>
              </div>
              <p className="text-[11px] text-[#66809F] italic">
                * Lưu ý: Nếu cần thử nghiệm lại, thầy/cô vẫn có thể bấm nút "Khôi phục DS mẫu (38 HS)" bất cứ lúc nào.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white flex items-center gap-1.5 shadow-sm shadow-red-600/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Xác nhận xóa tất cả ({students.length} hồ sơ)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

