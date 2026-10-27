import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlarmClock,
  Save,
  Download,
  Search,
  Check,
  Lock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  History,
  LayoutList,
  LayoutGrid,
  Sparkles,
  X
} from 'lucide-react';
import { AppState, AttendanceStatus, Student, StudentAttendanceDetail } from '../types';
import { hasPermission, isReadOnly, isTeacher } from '../utils/permissionUtils';
import {
  getCurrentSchoolWeekInfo,
  getDateMetaVN,
  getSchoolWeekMeta,
  getWeekDaysForWeek,
  formatDateISO,
} from '../utils/dateWeekUtils';

interface AttendanceManagerProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

const EXCUSED_REASON_PRESETS = ['Ốm / Sốt', 'Đi khám bệnh', 'Việc gia đình', 'Xin phép từ tối qua'];
const UNEXCUSED_REASON_PRESETS = ['Chưa rõ lý do', 'Liên hệ PH chưa được', 'Ngủ quên'];
const LATE_REASON_PRESETS = ['Hỏng xe', 'Mưa lớn / Kẹt xe', 'Đi học muộn', 'Quên khăn quàng quay về lấy'];

function shiftDateISO(dateISO: string, deltaDays: number): string {
  const parts = (dateISO || '').split('-').map(Number);
  const d =
    parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();
  d.setDate(d.getDate() + deltaDays);
  return formatDateISO(d);
}

function buildDefaultRecords(students: Student[]): Record<string, StudentAttendanceDetail> {
  const def: Record<string, StudentAttendanceDetail> = {};
  students.forEach((s) => {
    def[s.id] = { status: 'present' };
  });
  return def;
}

function computeSummary(
  students: Student[],
  records: Record<string, StudentAttendanceDetail>
) {
  let present = 0;
  let excused = 0;
  let unexcused = 0;
  let late = 0;

  students.forEach((s) => {
    const st = records[s.id]?.status || 'present';
    if (st === 'present') present++;
    else if (st === 'excused') excused++;
    else if (st === 'unexcused') unexcused++;
    else if (st === 'late') late++;
  });

  return { total: students.length, present, excused, unexcused, late };
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  appState,
  onUpdateState,
}) => {
  const { students, attendanceHistory, currentUser } = appState;
  const isGVCN = isTeacher(appState);
  const isTeamLeader = currentUser?.role.startsWith('team_leader_');
  const userTeamId = currentUser?.teamId;

  const latestWeekInfo = useMemo(() => getCurrentSchoolWeekInfo(), [appState.todayDate]);
  const realTodayISO = latestWeekInfo.todayISO;

  const [selectedDate, setSelectedDate] = useState<string>(appState.todayDate || realTodayISO);
  const [selectedWeekForStrip, setSelectedWeekForStrip] = useState<number>(() => {
    const meta = getDateMetaVN(appState.todayDate || realTodayISO);
    return meta.weekNumber;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | number>(userTeamId || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'teams'>('list');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Keep week strip in sync when selectedDate changes
  useEffect(() => {
    const meta = getDateMetaVN(selectedDate);
    setSelectedWeekForStrip(meta.weekNumber);
  }, [selectedDate]);

  // Current day records (from attendanceHistory or default all present)
  const localRecords = useMemo<Record<string, StudentAttendanceDetail>>(() => {
    const saved = attendanceHistory[selectedDate]?.records;
    if (saved && Object.keys(saved).length > 0) {
      const merged: Record<string, StudentAttendanceDetail> = {};
      students.forEach((s) => {
        merged[s.id] = saved[s.id] || { status: 'present' };
      });
      return merged;
    }
    return buildDefaultRecords(students);
  }, [selectedDate, attendanceHistory, students]);

  const isDateExplicitlySaved = Boolean(attendanceHistory[selectedDate]);

  // Recalculate summary for selectedDate
  const summary = useMemo(
    () => computeSummary(students, localRecords),
    [students, localRecords]
  );

  // Team-by-team attendance breakdown for selectedDate
  const teamAttendanceStats = useMemo(() => {
    return [1, 2, 3, 4].map((tId) => {
      const teamMembers = students.filter((s) => s.teamId === tId);
      const tSum = computeSummary(teamMembers, localRecords);
      return {
        teamId: tId,
        ...tSum,
      };
    });
  }, [students, localRecords]);

  // Students who are absent or late on selectedDate
  const notableStudents = useMemo(() => {
    return students
      .filter((s) => {
        const st = localRecords[s.id]?.status || 'present';
        return st !== 'present';
      })
      .map((s) => ({
        student: s,
        detail: localRecords[s.id] || { status: 'present' as AttendanceStatus },
      }));
  }, [students, localRecords]);

  const canTakeAttendanceAny = hasPermission(appState, 'canTakeAttendance');
  const readOnly = isReadOnly(appState);

  // Persist records for selectedDate immediately to AppState
  const persistDayRecords = (
    nextRecords: Record<string, StudentAttendanceDetail>,
    toastText?: string
  ) => {
    const nextSummary = computeSummary(students, nextRecords);
    onUpdateState((prev) => ({
      ...prev,
      attendanceHistory: {
        ...prev.attendanceHistory,
        [selectedDate]: {
          date: selectedDate,
          records: nextRecords,
          summary: nextSummary,
        },
      },
      todayDate: realTodayISO,
    }));
    if (toastText) {
      showToast(toastText);
    }
  };

  // Update single student status & auto-save
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    const student = students.find((s) => s.id === studentId);
    if (!hasPermission(appState, 'canTakeAttendance', student?.teamId)) {
      showToast(
        'Bạn không có quyền điểm danh cho học sinh này (chỉ xem hoặc không thuộc tổ phụ trách).'
      );
      return;
    }

    const prevDetail = localRecords[studentId] || { status: 'present' };
    const nextRecords: Record<string, StudentAttendanceDetail> = {
      ...localRecords,
      [studentId]: {
        ...prevDetail,
        status,
        reason: status === 'present' ? '' : prevDetail.reason || '',
        timeArrived: status === 'late' ? prevDetail.timeArrived || '07:20' : undefined,
      },
    };

    const statusLabel =
      status === 'present'
        ? 'Có mặt'
        : status === 'excused'
        ? 'Nghỉ có phép'
        : status === 'unexcused'
        ? 'Nghỉ không phép'
        : 'Đi trễ';

    persistDayRecords(
      nextRecords,
      student ? `Đã cập nhật điểm danh em ${student.fullName}: ${statusLabel}` : undefined
    );
  };

  const handleSetReason = (studentId: string, reason: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!hasPermission(appState, 'canTakeAttendance', student?.teamId)) return;

    const nextRecords: Record<string, StudentAttendanceDetail> = {
      ...localRecords,
      [studentId]: {
        ...(localRecords[studentId] || { status: 'excused' }),
        reason,
      },
    };
    persistDayRecords(nextRecords);
  };

  const handleSetTime = (studentId: string, time: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!hasPermission(appState, 'canTakeAttendance', student?.teamId)) return;

    const nextRecords: Record<string, StudentAttendanceDetail> = {
      ...localRecords,
      [studentId]: {
        ...(localRecords[studentId] || { status: 'late' }),
        timeArrived: time,
      },
    };
    persistDayRecords(nextRecords);
  };

  // Mark all present in class
  const handleMarkAllPresent = () => {
    if (!canTakeAttendanceAny) {
      showToast('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản có quyền điểm danh!');
      return;
    }
    const updated = { ...localRecords };
    students.forEach((s) => {
      if (hasPermission(appState, 'canTakeAttendance', s.teamId)) {
        updated[s.id] = { status: 'present' };
      }
    });
    persistDayRecords(updated, `Đã đánh dấu tất cả học sinh có mặt đầy đủ ngày ${selectedDateMeta.dateVN}!`);
  };

  // Mark a specific team all present
  const handleMarkTeamPresent = (tId: number) => {
    if (!hasPermission(appState, 'canTakeAttendance', tId)) {
      showToast(`Bạn không có quyền điểm danh cho Tổ ${tId}.`);
      return;
    }
    const updated = { ...localRecords };
    students
      .filter((s) => s.teamId === tId)
      .forEach((s) => {
        updated[s.id] = { status: 'present' };
      });
    persistDayRecords(updated, `Đã đánh dấu 100% thành viên Tổ ${tId} có mặt ngày ${selectedDateMeta.dateVN}!`);
  };

  // Explicit Save button
  const handleSaveAttendance = () => {
    if (!canTakeAttendanceAny) {
      showToast('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản có quyền để lưu điểm danh!');
      return;
    }
    persistDayRecords(
      localRecords,
      `Đã lưu sổ điểm danh ngày ${selectedDateMeta.dayName}, ${selectedDateMeta.dateVN}!`
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Export daily attendance to Excel
  const handleExportDailyExcel = () => {
    const meta = getDateMetaVN(selectedDate);
    const headers = [
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Tổ',
      'Chức vụ',
      'Ngày điểm danh',
      'Trạng thái chuyên cần',
      'Giờ đến (nếu trễ)',
      'Lý do / Ghi chú',
      'Họ tên Phụ huynh',
      'SĐT Phụ huynh',
    ];

    const statusTextMap: Record<AttendanceStatus, string> = {
      present: 'Có mặt',
      excused: 'Nghỉ có phép',
      unexcused: 'Nghỉ không phép',
      late: 'Đi trễ',
    };

    const rows = students.map((s, index) => {
      const rec = localRecords[s.id] || { status: 'present' };
      return [
        index + 1,
        s.code,
        s.fullName,
        `Tổ ${s.teamId}`,
        s.roleInClass || 'Thành viên',
        `${meta.dayName}, ${meta.dateVN}`,
        statusTextMap[rec.status || 'present'],
        rec.timeArrived || '',
        rec.reason || '',
        s.parentName || '',
        s.parentPhone || '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 24 },
      { wch: 8 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
      { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DiemDanhNgay');
    XLSX.writeFile(wb, `Diem_Danh_Lop_${appState.className}_Ngay_${selectedDate}.xlsx`);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !searchQuery.trim() ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      const currentStatus = localRecords[s.id]?.status || 'present';
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
      const matchesTeam = teamFilter === 'all' || s.teamId === teamFilter;
      return matchesSearch && matchesStatus && matchesTeam;
    });
  }, [students, searchQuery, localRecords, statusFilter, teamFilter]);

  const selectedDateMeta = useMemo(() => getDateMetaVN(selectedDate), [selectedDate]);
  const stripWeekMeta = useMemo(() => getSchoolWeekMeta(selectedWeekForStrip), [selectedWeekForStrip]);
  const stripWeekDays = useMemo(() => getWeekDaysForWeek(selectedWeekForStrip), [selectedWeekForStrip]);

  // Sorted attendance history dates (newest first)
  const recordedHistoryDates = useMemo(() => {
    return Object.keys(attendanceHistory || {})
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 14);
  }, [attendanceHistory]);

  const renderStudentRow = (s: Student, idx: number) => {
    const current = localRecords[s.id] || { status: 'present' };
    const canTakeThisStudent = hasPermission(appState, 'canTakeAttendance', s.teamId);

    const rowBg =
      current.status === 'unexcused'
        ? 'bg-red-50/40 hover:bg-red-50/70'
        : current.status === 'excused'
        ? 'bg-amber-50/35 hover:bg-amber-50/60'
        : current.status === 'late'
        ? 'bg-purple-50/35 hover:bg-purple-50/60'
        : 'hover:bg-blue-50/30';

    return (
      <tr key={s.id} className={`transition-colors ${rowBg}`}>
        <td className="py-2.5 px-3 text-center text-[#66809F] font-mono font-bold w-10">
          {idx + 1}
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2.5">
            <img
              src={s.avatar}
              alt={s.fullName}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-blue-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[#17365D] truncate">{s.fullName}</span>
                {s.roleInClass && s.roleInClass !== 'Thành viên' && (
                  <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#1677E8] border border-blue-200 text-[10px] font-bold">
                    {s.roleInClass}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10.5px] text-[#66809F] mt-0.5">
                <span className="font-mono">{s.code}</span>
                {s.parentPhone && (
                  <span className="inline-flex items-center gap-0.5 text-gray-500">
                    • <Phone className="w-2.5 h-2.5" /> {s.parentPhone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="py-2.5 px-3">
          <span className="px-2 py-0.5 rounded-lg bg-blue-50/80 text-[#0B438A] border border-blue-100 font-bold text-[11px]">
            Tổ {s.teamId}
          </span>
        </td>
        <td className="py-2.5 px-3 text-center">
          <div
            className={`inline-flex items-center p-1 bg-gray-100/90 rounded-xl gap-1 ${
              !canTakeThisStudent ? 'cursor-not-allowed opacity-85' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => handleSetStatus(s.id, 'present')}
              disabled={!canTakeThisStudent}
              title={!canTakeThisStudent ? 'Chỉ xem' : 'Đánh dấu Có mặt'}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                current.status === 'present'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-gray-600 hover:text-black hover:bg-white/60'
              } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
            >
              Có mặt
            </button>
            <button
              type="button"
              onClick={() => handleSetStatus(s.id, 'excused')}
              disabled={!canTakeThisStudent}
              title={!canTakeThisStudent ? 'Chỉ xem' : 'Đánh dấu Nghỉ có phép'}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                current.status === 'excused'
                  ? 'bg-[#F59E0B] text-white shadow-xs'
                  : 'text-gray-600 hover:text-black hover:bg-white/60'
              } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
            >
              Nghỉ phép
            </button>
            <button
              type="button"
              onClick={() => handleSetStatus(s.id, 'unexcused')}
              disabled={!canTakeThisStudent}
              title={!canTakeThisStudent ? 'Chỉ xem' : 'Đánh dấu Nghỉ không phép'}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                current.status === 'unexcused'
                  ? 'bg-[#EF4444] text-white shadow-xs'
                  : 'text-gray-600 hover:text-black hover:bg-white/60'
              } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
            >
              Không phép
            </button>
            <button
              type="button"
              onClick={() => handleSetStatus(s.id, 'late')}
              disabled={!canTakeThisStudent}
              title={!canTakeThisStudent ? 'Chỉ xem' : 'Đánh dấu Đi trễ'}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                current.status === 'late'
                  ? 'bg-[#8B5CF6] text-white shadow-xs'
                  : 'text-gray-600 hover:text-black hover:bg-white/60'
              } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
            >
              Đi trễ
            </button>
          </div>
        </td>
        <td className="py-2.5 px-3 min-w-[240px]">
          {current.status === 'excused' && (
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Nhập lý do nghỉ có phép..."
                disabled={!canTakeThisStudent}
                value={current.reason || ''}
                onChange={(e) => handleSetReason(s.id, e.target.value)}
                className={`w-full px-2.5 py-1 rounded-lg border text-xs ${
                  !canTakeThisStudent
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                    : 'bg-white border-amber-300 text-[#17365D] focus:outline-hidden focus:ring-2 focus:ring-amber-400'
                }`}
              />
              {canTakeThisStudent && (
                <div className="flex flex-wrap gap-1">
                  {EXCUSED_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSetReason(s.id, preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                        current.reason === preset
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {current.status === 'unexcused' && (
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Ghi chú (chưa xin phép / liên hệ PH)..."
                disabled={!canTakeThisStudent}
                value={current.reason || ''}
                onChange={(e) => handleSetReason(s.id, e.target.value)}
                className={`w-full px-2.5 py-1 rounded-lg border text-xs ${
                  !canTakeThisStudent
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                    : 'bg-white border-red-300 text-[#17365D] focus:outline-hidden focus:ring-2 focus:ring-red-400'
                }`}
              />
              {canTakeThisStudent && (
                <div className="flex flex-wrap gap-1">
                  {UNEXCUSED_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSetReason(s.id, preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                        current.reason === preset
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {current.status === 'late' && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  disabled={!canTakeThisStudent}
                  value={current.timeArrived || '07:20'}
                  onChange={(e) => handleSetTime(s.id, e.target.value)}
                  className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold ${
                    !canTakeThisStudent
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                      : 'bg-white border-purple-300 text-purple-900'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Lý do đi trễ..."
                  disabled={!canTakeThisStudent}
                  value={current.reason || ''}
                  onChange={(e) => handleSetReason(s.id, e.target.value)}
                  className={`w-full px-2.5 py-1 rounded-lg border text-xs ${
                    !canTakeThisStudent
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                      : 'bg-white border-purple-300 text-[#17365D] focus:outline-hidden focus:ring-2 focus:ring-purple-400'
                  }`}
                />
              </div>
              {canTakeThisStudent && (
                <div className="flex flex-wrap gap-1">
                  {LATE_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSetReason(s.id, preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                        current.reason === preset
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {current.status === 'present' && (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10.5px] font-semibold inline-flex items-center gap-1">
              <Check className="w-3 h-3" /> Đi học đúng giờ
            </span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header: Daily Attendance Title, Date Navigator & Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#1677E8] text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-[#17365D]">
                Điểm danh Học sinh Theo Ngày ({appState.className})
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B438A] border border-blue-200 font-extrabold text-[11px]">
                {selectedDateMeta.dayName}, {selectedDateMeta.dateVN}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                Tuần {selectedDateMeta.weekNumber}/35 (HK {selectedDateMeta.semester === 1 ? 'I' : 'II'})
              </span>
              {selectedDate === realTodayISO && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10.5px]">
                  ● Hôm nay
                </span>
              )}
            </div>
            <p className="text-xs text-[#66809F] mt-1">
              Mọi thay đổi trạng thái điểm danh hoặc lý do nghỉ đều được <strong>tự động lưu</strong> theo từng ngày học
            </p>
          </div>
        </div>

        {/* Date Picker & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
          {/* Date Stepper */}
          <div className="flex items-center gap-1.5 bg-blue-50/60 p-1 rounded-xl border border-[#CDE2FC]">
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => shiftDateISO(prev, -1))}
              className="w-7 h-7 rounded-lg bg-white hover:bg-blue-100 text-[#17365D] flex items-center justify-center shadow-2xs transition-colors"
              title="Ngày hôm trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg font-extrabold text-[#0B438A] bg-transparent focus:outline-hidden cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => shiftDateISO(prev, 1))}
              className="w-7 h-7 rounded-lg bg-white hover:bg-blue-100 text-[#17365D] flex items-center justify-center shadow-2xs transition-colors"
              title="Ngày tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {selectedDate !== realTodayISO && (
              <button
                type="button"
                onClick={() => setSelectedDate(realTodayISO)}
                className="px-2.5 py-1 rounded-lg bg-[#1677E8] text-white text-[11px] font-bold hover:bg-[#0B438A] transition-colors"
              >
                Hôm nay ({latestWeekInfo.todayVN.slice(0, 5)})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isTeamLeader && userTeamId && (
              <button
                type="button"
                onClick={() => handleMarkTeamPresent(userTeamId)}
                className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-[#1677E8] flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-[#1677E8]" />
                Đủ cả Tổ {userTeamId}
              </button>
            )}

            <button
              type="button"
              onClick={handleMarkAllPresent}
              disabled={!canTakeAttendanceAny}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                canTakeAttendanceAny
                  ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              {!canTakeAttendanceAny ? (
                <Lock className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              )}
              Tất cả có mặt
            </button>

            <button
              type="button"
              onClick={handleExportDailyExcel}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Xuất danh sách điểm danh ngày đang chọn ra file Excel"
            >
              <Download className="w-3.5 h-3.5 text-[#1677E8]" />
              <span>Xuất Excel ngày</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={!canTakeAttendanceAny}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                canTakeAttendanceAny
                  ? 'bg-[#1677E8] hover:bg-[#0B438A] shadow-blue-500/20 cursor-pointer'
                  : 'bg-gray-400 opacity-60 cursor-not-allowed'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Đã lưu sổ ngày {selectedDateMeta.shortDateVN}!
                </>
              ) : (
                <>
                  {!canTakeAttendanceAny ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Lưu điểm danh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 6-Day School Week Strip (Thứ Hai -> Thứ Bảy) for Quick Daily Switching */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E7FA] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#17365D]">
              Chọn nhanh các ngày học trong tuần:
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={selectedWeekForStrip <= 1}
                onClick={() => {
                  const prevW = Math.max(1, selectedWeekForStrip - 1);
                  setSelectedWeekForStrip(prevW);
                  const days = getWeekDaysForWeek(prevW);
                  if (days[0]) setSelectedDate(days[0].dateISO);
                }}
                className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-[#17365D]"
                title="Tuần trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={selectedWeekForStrip}
                onChange={(e) => {
                  const nextW = Number(e.target.value);
                  setSelectedWeekForStrip(nextW);
                  const days = getWeekDaysForWeek(nextW);
                  if (days[0]) setSelectedDate(days[0].dateISO);
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-extrabold text-[#0B438A] focus:outline-hidden"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                  const m = getSchoolWeekMeta(w);
                  return (
                    <option key={w} value={w}>
                      Tuần {w} ({m.label}) {w === latestWeekInfo.currentWeek ? '★ [Hiện tại]' : ''}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                disabled={selectedWeekForStrip >= 35}
                onClick={() => {
                  const nextW = Math.min(35, selectedWeekForStrip + 1);
                  setSelectedWeekForStrip(nextW);
                  const days = getWeekDaysForWeek(nextW);
                  if (days[0]) setSelectedDate(days[0].dateISO);
                }}
                className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-[#17365D]"
                title="Tuần kế tiếp"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[11px] text-[#66809F] hidden sm:inline">
              ({stripWeekMeta.label})
            </span>
          </div>

          <span className="text-[11px] text-[#66809F] font-medium">
            {isDateExplicitlySaved ? (
              <span className="text-emerald-700 font-bold">
                ✓ Ngày {selectedDateMeta.dateVN} đã được ghi nhận vào sổ chuyên cần
              </span>
            ) : (
              <span>
                Ngày {selectedDateMeta.dateVN} đang ở trạng thái mặc định (100% có mặt)
              </span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {stripWeekDays.map((dayItem) => {
            const isSelected = dayItem.dateISO === selectedDate;
            const isToday = dayItem.dateISO === realTodayISO;
            const savedRecord = attendanceHistory[dayItem.dateISO];
            const daySum = savedRecord?.summary || {
              total: students.length,
              present: students.length,
              excused: 0,
              unexcused: 0,
              late: 0,
            };
            const absentCount = daySum.excused + daySum.unexcused;

            return (
              <button
                key={dayItem.dateISO}
                type="button"
                onClick={() => setSelectedDate(dayItem.dateISO)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-[#1677E8] text-white border-[#1677E8] shadow-sm ring-2 ring-blue-200'
                    : isToday
                    ? 'bg-amber-50/70 hover:bg-amber-100/70 text-[#17365D] border-amber-300'
                    : 'bg-gray-50/70 hover:bg-blue-50/60 text-[#17365D] border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold">{dayItem.dayName}</span>
                  {isToday && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-extrabold ${
                        isSelected ? 'bg-amber-300 text-slate-900' : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      Hôm nay
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      isSelected ? 'text-blue-100' : 'text-[#66809F]'
                    }`}
                  >
                    {dayItem.dateVN}
                  </span>
                  {savedRecord && (
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Đã lưu
                    </span>
                  )}
                </div>

                <div className="pt-1 border-t border-black/5 flex items-center justify-between text-[10.5px] font-bold">
                  <span>
                    Có mặt: {daySum.present}/{daySum.total}
                  </span>
                  {(absentCount > 0 || daySum.late > 0) && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9.5px] ${
                        isSelected
                          ? 'bg-amber-300 text-slate-900'
                          : absentCount > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {absentCount > 0 ? `Vắng ${absentCount}` : ''}
                      {absentCount > 0 && daySum.late > 0 ? ' • ' : ''}
                      {daySum.late > 0 ? `Trễ ${daySum.late}` : ''}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* View-Only Banner */}
      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Giao diện đang ở chế độ Chỉ xem:</strong> Phụ huynh và học sinh có thể theo dõi chuyên cần theo từng ngày. Để thực hiện điểm danh, vui lòng đăng nhập tài khoản <strong>Giáo viên chủ nhiệm</strong> hoặc <strong>Cán sự lớp / Tổ trưởng</strong>.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full shrink-0">
            Chỉ xem
          </span>
        </div>
      )}

      {/* Role permission info banner */}
      {!readOnly && currentUser && currentUser.role !== 'teacher' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#1677E8]" />
            <span>
              Đang điểm danh với quyền <strong>{currentUser.roleTitle} ({currentUser.name})</strong>:
              {isTeamLeader && userTeamId
                ? ` Bạn phụ trách điểm danh hàng ngày cho ${students.filter((s) => s.teamId === userTeamId).length} thành viên Tổ ${userTeamId}.`
                : ' Bạn phụ trách điểm danh và theo dõi sĩ số toàn lớp.'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full shrink-0">
            {isTeamLeader ? `Phạm vi: Tổ ${userTeamId}` : 'Phạm vi: Toàn lớp'}
          </span>
        </div>
      )}

      {/* Summary KPI Cards (Clickable to filter by status) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
          className={`bg-white rounded-xl p-4 border flex items-center gap-3 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'present' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-[#D8E7FA]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-white shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F] font-semibold">
              Có mặt ({selectedDateMeta.shortDateVN})
            </p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">
              {summary.present}/{summary.total}
            </h3>
            <p className="text-[10.5px] font-bold text-[#10B981]">
              {summary.total > 0 ? ((summary.present / summary.total) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'excused' ? 'all' : 'excused')}
          className={`bg-white rounded-xl p-4 border flex items-center gap-3 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'excused' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-[#D8E7FA]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center text-white shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F] font-semibold">Nghỉ có phép</p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">
              {summary.excused}
            </h3>
            <p className="text-[10.5px] font-bold text-[#F59E0B]">
              {summary.total > 0 ? ((summary.excused / summary.total) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'unexcused' ? 'all' : 'unexcused')}
          className={`bg-white rounded-xl p-4 border flex items-center gap-3 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'unexcused' ? 'border-red-500 ring-2 ring-red-100' : 'border-[#D8E7FA]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#EF4444] flex items-center justify-center text-white shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F] font-semibold">Nghỉ không phép</p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">
              {summary.unexcused}
            </h3>
            <p className="text-[10.5px] font-bold text-[#EF4444]">
              {summary.total > 0 ? ((summary.unexcused / summary.total) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
          className={`bg-white rounded-xl p-4 border flex items-center gap-3 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'late' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-[#D8E7FA]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shrink-0">
            <AlarmClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F] font-semibold">Đi học trễ</p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">
              {summary.late}
            </h3>
            <p className="text-[10.5px] font-bold text-[#8B5CF6]">
              {summary.total > 0 ? ((summary.late / summary.total) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      </div>

      {/* 4 Teams Quick Attendance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {teamAttendanceStats.map((tStat) => {
          const isTeamSelected = teamFilter === tStat.teamId;
          const canEditThisTeam = hasPermission(appState, 'canTakeAttendance', tStat.teamId);
          const allPresent = tStat.present === tStat.total;

          return (
            <div
              key={tStat.teamId}
              className={`bg-white rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-2.5 ${
                isTeamSelected ? 'border-[#1677E8] ring-2 ring-blue-100' : 'border-[#D8E7FA]'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setTeamFilter(teamFilter === tStat.teamId ? 'all' : tStat.teamId)
                  }
                  className="flex items-center gap-2 text-left cursor-pointer"
                >
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#1677E8] font-black text-xs flex items-center justify-center border border-blue-200">
                    T{tStat.teamId}
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#17365D]">
                      Tổ {tStat.teamId}
                    </h4>
                    <span className="text-[10.5px] text-[#66809F]">
                      Có mặt: <strong className="text-[#0B438A]">{tStat.present}/{tStat.total}</strong>
                    </span>
                  </div>
                </button>

                {allPresent ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    ✓ Đủ 100%
                  </span>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {tStat.excused > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        P: {tStat.excused}
                      </span>
                    )}
                    {tStat.unexcused > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                        KP: {tStat.unexcused}
                      </span>
                    )}
                    {tStat.late > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                        Trễ: {tStat.late}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {canEditThisTeam && !allPresent && (
                <button
                  type="button"
                  onClick={() => handleMarkTeamPresent(tStat.teamId)}
                  className="w-full py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Đánh dấu đủ cả Tổ {tStat.teamId}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Highlight Box: Absent or Late Students Today (if any) */}
      {notableStudents.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-extrabold text-[#17365D] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>
                Danh sách học sinh vắng / đi trễ ngày {selectedDateMeta.dateVN} ({notableStudents.length} học sinh)
              </span>
            </h3>
            <span className="text-[11px] text-[#66809F]">
              GVCN có thể đối chiếu nhanh lý do và số điện thoại phụ huynh để liên lạc
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {notableStudents.map(({ student, detail }) => {
              const badgeColor =
                detail.status === 'excused'
                  ? 'bg-amber-500 text-white'
                  : detail.status === 'unexcused'
                  ? 'bg-red-600 text-white'
                  : 'bg-purple-600 text-white';
              const badgeText =
                detail.status === 'excused'
                  ? 'Nghỉ có phép'
                  : detail.status === 'unexcused'
                  ? 'Không phép'
                  : `Đi trễ (${detail.timeArrived || '07:20'})`;

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-xl p-2.5 border border-amber-200/80 shadow-2xs flex items-start justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <img
                      src={student.avatar}
                      alt={student.fullName}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#17365D]">{student.fullName}</span>
                        <span className="text-[10px] font-bold text-[#0B438A] bg-blue-50 px-1.5 py-0.2 rounded">
                          Tổ {student.teamId}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#66809F] mt-0.5 truncate">
                        Lý do: <strong>{detail.reason || 'Chưa ghi lý do'}</strong>
                      </p>
                      {student.parentPhone && (
                        <p className="text-[10.5px] text-[#0B438A] font-semibold mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#1677E8]" />
                          <span>
                            PH {student.parentName}: <strong>{student.parentPhone}</strong>
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Filter & Student Attendance Checklist */}
      <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tên hoặc mã học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#D8E7FA] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1677E8]"
              />
            </div>

            {/* View mode toggle: Danh sách lớp vs Chia theo 4 Tổ */}
            <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-[#1677E8] shadow-2xs' : 'text-[#66809F]'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Danh sách chung</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('teams')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'teams' ? 'bg-white text-[#1677E8] shadow-2xs' : 'text-[#66809F]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Chia theo 4 Tổ</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Team filter chips */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
              <span className="text-[11px] font-bold text-[#66809F] mr-1 hidden md:inline">Tổ:</span>
              <button
                type="button"
                onClick={() => setTeamFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  teamFilter === 'all'
                    ? 'bg-[#1677E8] text-white shadow-2xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cả lớp
              </button>
              {[1, 2, 3, 4].map((tId) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setTeamFilter(tId)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    teamFilter === tId
                      ? 'bg-[#1677E8] text-white shadow-2xs'
                      : userTeamId === tId
                      ? 'bg-blue-100 text-[#0B438A] border border-blue-300 font-extrabold'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Tổ {tId}
                </button>
              ))}
            </div>

            {/* Status filter chips */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-50 text-[#1677E8] font-bold'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Tất cả ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('present')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'present'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Có mặt ({summary.present})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('excused')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'excused'
                  ? 'bg-amber-100 text-amber-800 font-bold'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Có phép ({summary.excused})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unexcused')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'unexcused'
                  ? 'bg-red-100 text-red-800 font-bold'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Không phép ({summary.unexcused})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('late')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'late'
                  ? 'bg-purple-100 text-purple-800 font-bold'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Đi trễ ({summary.late})
            </button>
          </div>
        </div>

        {/* Mode 1: Combined Class Table */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="py-3 px-3 text-center w-10">STT</th>
                  <th className="py-3 px-3">Họ và tên học sinh</th>
                  <th className="py-3 px-3">Tổ</th>
                  <th className="py-3 px-3 text-center">Trạng thái điểm danh ({selectedDateMeta.dateVN})</th>
                  <th className="py-3 px-3">Lý do nghỉ / Giờ đến & Gợi ý nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#66809F]">
                      Không có học sinh nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => renderStudentRow(s, idx))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Mode 2: Grouped by 4 Teams */
          <div className="p-4 space-y-5 bg-slate-50/50">
            {[1, 2, 3, 4]
              .filter((tId) => teamFilter === 'all' || teamFilter === tId)
              .map((tId) => {
                const teamMembers = filteredStudents.filter((s) => s.teamId === tId);
                const tStat = teamAttendanceStats.find((x) => x.teamId === tId);

                return (
                  <div
                    key={tId}
                    className="bg-white rounded-2xl border border-[#D8E7FA] overflow-hidden shadow-2xs"
                  >
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50/80 to-white border-b border-[#D8E7FA] flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#1677E8] text-white font-black text-xs flex items-center justify-center">
                          T{tId}
                        </span>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#17365D]">
                            Danh sách điểm danh Tổ {tId} ({selectedDateMeta.dateVN})
                          </h4>
                          {tStat && (
                            <p className="text-[11px] text-[#66809F]">
                              Có mặt: <strong>{tStat.present}/{tStat.total}</strong> • Có phép: {tStat.excused} • Không phép: {tStat.unexcused} • Đi trễ: {tStat.late}
                            </p>
                          )}
                        </div>
                      </div>

                      {hasPermission(appState, 'canTakeAttendance', tId) && (
                        <button
                          type="button"
                          onClick={() => handleMarkTeamPresent(tId)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đủ cả Tổ {tId}
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-10">STT</th>
                            <th className="py-2.5 px-3">Thành viên Tổ {tId}</th>
                            <th className="py-2.5 px-3">Tổ</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái điểm danh</th>
                            <th className="py-2.5 px-3">Lý do nghỉ / Giờ đến</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {teamMembers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-5 text-center text-[#66809F]">
                                Không có học sinh nào trong Tổ {tId} theo bộ lọc này.
                              </td>
                            </tr>
                          ) : (
                            teamMembers.map((s, idx) => renderStudentRow(s, idx))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Attendance History Log by Date */}
      <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1677E8]" />
            <div>
              <h3 className="text-sm font-extrabold text-[#17365D]">
                Nhật ký các ngày đã lưu điểm danh ({recordedHistoryDates.length} ngày gần nhất)
              </h3>
              <p className="text-[11px] text-[#66809F]">
                Nhấn vào bất kỳ ngày nào bên dưới để mở lại bảng điểm danh chi tiết của ngày đó
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10.5px]">
              <tr>
                <th className="py-2.5 px-3.5">Ngày học</th>
                <th className="py-2.5 px-3.5">Tuần</th>
                <th className="py-2.5 px-3.5 text-center">Có mặt</th>
                <th className="py-2.5 px-3.5 text-center">Nghỉ có phép</th>
                <th className="py-2.5 px-3.5 text-center">Không phép</th>
                <th className="py-2.5 px-3.5 text-center">Đi trễ</th>
                <th className="py-2.5 px-3.5">Học sinh vắng / đi trễ trong ngày</th>
                <th className="py-2.5 px-3.5 text-right">Xem ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recordedHistoryDates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#66809F]">
                    Chưa có lịch sử ngày điểm danh nào được lưu.
                  </td>
                </tr>
              ) : (
                recordedHistoryDates.map((dISO) => {
                  const rec = attendanceHistory[dISO];
                  if (!rec) return null;
                  const meta = getDateMetaVN(dISO);
                  const isCurrentSelected = dISO === selectedDate;

                  const absentOrLateNames = students
                    .filter((s) => {
                      const st = rec.records?.[s.id]?.status;
                      return st && st !== 'present';
                    })
                    .map((s) => {
                      const detail = rec.records[s.id];
                      const tag =
                        detail.status === 'excused'
                          ? 'P'
                          : detail.status === 'unexcused'
                          ? 'KP'
                          : 'Trễ';
                      return `${s.fullName} (${tag})`;
                    });

                  return (
                    <tr
                      key={dISO}
                      onClick={() => setSelectedDate(dISO)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                        isCurrentSelected ? 'bg-blue-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 font-bold text-[#17365D]">
                        {meta.dayName}, {meta.dateVN}
                        {dISO === realTodayISO && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px]">
                            Hôm nay
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[#0B438A] font-bold">
                        Tuần {meta.weekNumber}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700">
                        {rec.summary.present}/{rec.summary.total}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-amber-600">
                        {rec.summary.excused}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-red-600">
                        {rec.summary.unexcused}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-purple-600">
                        {rec.summary.late}
                      </td>
                      <td className="py-2.5 px-3.5 text-[#66809F]">
                        {absentOrLateNames.length === 0 ? (
                          <span className="text-emerald-700 font-semibold">Đi học đầy đủ 100%</span>
                        ) : (
                          <span className="text-[#17365D] font-medium">
                            {absentOrLateNames.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(dISO);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-[11px]"
                        >
                          Mở ngày {meta.shortDateVN}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
