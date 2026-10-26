import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  UserPlus,
  X,
  Download,
  RefreshCw,
  Award,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Trash2
} from 'lucide-react';
import { AppState, Student, WeeklyDutyRoster, DutyDayAssignment, EmulationRecord } from '../types';
import { getSchoolWeekMeta, getCurrentSchoolWeekInfo } from '../utils/dateWeekUtils';
import {
  getOrGenerateWeeklyDutyRoster,
  buildWeeklyDutyRoster,
  getDefaultDutyTeamForWeek
} from '../utils/dutyRosterUtils';
import { hasPermission, isTeacher, isReadOnly } from '../utils/permissionUtils';

interface WeeklyDutyRosterPanelProps {
  appState: AppState;
  selectedWeek: number;
  onSelectWeek?: (week: number) => void;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onShowToast?: (msg: string) => void;
  compactMode?: boolean;
}

export const WeeklyDutyRosterPanel: React.FC<WeeklyDutyRosterPanelProps> = ({
  appState,
  selectedWeek,
  onSelectWeek,
  onUpdateState,
  onShowToast,
  compactMode = false,
}) => {
  const { students, weeklyDutyRosters, currentUser } = appState;
  const latestWeekInfo = useMemo(() => getCurrentSchoolWeekInfo(), [appState.todayDate, appState.currentEmulationWeek]);
  const activeCurrentWeek =
    appState.currentEmulationWeek && appState.currentEmulationWeek >= latestWeekInfo.currentWeek
      ? appState.currentEmulationWeek
      : latestWeekInfo.currentWeek;

  const weekMeta = useMemo(() => getSchoolWeekMeta(selectedWeek), [selectedWeek]);

  const currentRoster: WeeklyDutyRoster = useMemo(
    () =>
      getOrGenerateWeeklyDutyRoster(
        selectedWeek,
        students,
        weeklyDutyRosters,
        activeCurrentWeek
      ),
    [selectedWeek, students, weeklyDutyRosters, activeCurrentWeek]
  );

  const [addingDayIdx, setAddingDayIdx] = useState<number | null>(null);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [editingTasksText, setEditingTasksText] = useState<string>('');
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [showRotationMatrix, setShowRotationMatrix] = useState<boolean>(false);
  const [localToast, setLocalToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => {
        setLocalToast((prev) => (prev === msg ? null : prev));
      }, 3500);
    }
  };

  const isGVCN = isTeacher(appState);
  const readOnly = isReadOnly(appState);
  const canChangeDutyTeam = isGVCN || hasPermission(appState, 'canRecordEmulation');
  const canEditRoster =
    isGVCN ||
    hasPermission(appState, 'canRecordEmulation', currentRoster.teamId) ||
    hasPermission(appState, 'canToggleTasks');

  const saveRosterForWeek = (updatedRoster: WeeklyDutyRoster) => {
    if (!canEditRoster && !canChangeDutyTeam) return;
    onUpdateState((prev) => ({
      ...prev,
      weeklyDutyRosters: {
        ...(prev.weeklyDutyRosters || {}),
        [selectedWeek]: updatedRoster,
      },
    }));
  };

  // All members of the assigned duty team (including any excluded ones, for dropdown re-selection)
  const allTeamMembers = useMemo(
    () => students.filter((s) => s.teamId === currentRoster.teamId),
    [students, currentRoster.teamId]
  );

  const excludedIdSet = useMemo(
    () => new Set(currentRoster.excludedStudentIds || []),
    [currentRoster.excludedStudentIds]
  );

  // Active members shown in the weekly duty participant list
  const dutyTeamMembers = useMemo(
    () => allTeamMembers.filter((s) => !excludedIdSet.has(s.id)),
    [allTeamMembers, excludedIdSet]
  );

  // Map studentId -> Student
  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};
    students.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  // Map studentId -> list of day labels they are on duty this week
  const memberDutyDaysMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    currentRoster.days.forEach((d) => {
      d.studentIds.forEach((id) => {
        if (!map[id]) map[id] = [];
        map[id].push(d.dayLabel);
      });
    });
    return map;
  }, [currentRoster]);

  // Members in the active duty list who currently have no assigned days (when list changes)
  const unassignedMembers = useMemo(
    () => dutyTeamMembers.filter((m) => (memberDutyDaysMap[m.id] || []).length === 0),
    [dutyTeamMembers, memberDutyDaysMap]
  );

  // Remove a student completely from this week's duty roster list
  const handleRemoveMemberFromWeeklyRoster = (studentId: string) => {
    if (!canEditRoster) return;
    const studentName = studentMap[studentId]?.fullName || 'Học sinh';
    const currentExcluded = currentRoster.excludedStudentIds || [];
    const nextExcluded = currentExcluded.includes(studentId)
      ? currentExcluded
      : [...currentExcluded, studentId];
    const updatedDays = currentRoster.days.map((d) => ({
      ...d,
      studentIds: d.studentIds.filter((id) => id !== studentId),
    }));
    saveRosterForWeek({
      ...currentRoster,
      excludedStudentIds: nextExcluded,
      days: updatedDays,
    });
    notify(`Đã xóa ${studentName} khỏi danh sách trực nhật Tuần ${selectedWeek}.`);
  };

  // Remove all unassigned members from this week's duty participant list
  const handleRemoveAllUnassignedMembers = () => {
    if (!canEditRoster || unassignedMembers.length === 0) return;
    const unassignedIds = unassignedMembers.map((m) => m.id);
    const currentExcluded = currentRoster.excludedStudentIds || [];
    const nextExcluded = Array.from(new Set([...currentExcluded, ...unassignedIds]));
    saveRosterForWeek({
      ...currentRoster,
      excludedStudentIds: nextExcluded,
    });
    notify(
      `Đã xóa ${unassignedIds.length} học sinh chưa phân công khỏi danh sách trực nhật Tuần ${selectedWeek}.`
    );
  };

  // Switch the duty team for this week and auto-distribute its members
  const handleChangeDutyTeam = (newTeamId: number) => {
    if (!canChangeDutyTeam) return;
    const regenerated = buildWeeklyDutyRoster(
      selectedWeek,
      students,
      newTeamId,
      activeCurrentWeek
    );
    saveRosterForWeek(regenerated);
    notify(
      `Đã chuyển phân công trực nhật Tuần ${selectedWeek} sang Tổ ${newTeamId} (${regenerated.supervisorName})!`
    );
  };

  // Auto-redistribute members of the current duty team
  const handleAutoRedistribute = () => {
    if (!canChangeDutyTeam && !canEditRoster) return;
    const regenerated = buildWeeklyDutyRoster(
      selectedWeek,
      students,
      currentRoster.teamId,
      activeCurrentWeek
    );
    saveRosterForWeek(regenerated);
    notify(
      `Đã tự động phân công lại danh sách học sinh Tổ ${currentRoster.teamId} trực nhật từ Thứ Hai đến Thứ Bảy!`
    );
  };

  // Remove a student from a specific day
  const handleRemoveStudentFromDay = (dayIdx: number, studentId: string) => {
    if (!canEditRoster) return;
    const studentName = studentMap[studentId]?.fullName || 'Học sinh';
    const updatedDays = currentRoster.days.map((d, idx) =>
      idx === dayIdx
        ? { ...d, studentIds: d.studentIds.filter((id) => id !== studentId) }
        : d
    );
    saveRosterForWeek({ ...currentRoster, days: updatedDays });
    notify(`Đã xóa ${studentName} khỏi lịch trực nhật ${currentRoster.days[dayIdx].dayLabel}.`);
  };

  // Add a student to a specific day
  const handleAddStudentToDay = (dayIdx: number) => {
    if (!canEditRoster || !selectedStudentToAdd) return;
    const day = currentRoster.days[dayIdx];
    if (day.studentIds.includes(selectedStudentToAdd)) {
      setAddingDayIdx(null);
      return;
    }
    const studentName = studentMap[selectedStudentToAdd]?.fullName || 'Học sinh';
    const updatedDays = currentRoster.days.map((d, idx) =>
      idx === dayIdx
        ? { ...d, studentIds: [...d.studentIds, selectedStudentToAdd] }
        : d
    );
    const nextExcluded = (currentRoster.excludedStudentIds || []).filter(
      (id) => id !== selectedStudentToAdd
    );
    saveRosterForWeek({
      ...currentRoster,
      excludedStudentIds: nextExcluded,
      days: updatedDays,
    });
    setAddingDayIdx(null);
    setSelectedStudentToAdd('');
    notify(`Đã thêm ${studentName} vào lịch trực nhật ${day.dayLabel} (${day.dateStr}).`);
  };

  // Open edit tasks/notes for a day
  const handleStartEditDay = (dayIdx: number, day: DutyDayAssignment) => {
    setEditingDayIdx(dayIdx);
    setEditingTasksText(day.tasks.join('\n'));
    setEditingNoteText(day.note || '');
  };

  const handleSaveEditDay = (dayIdx: number) => {
    const tasksList = editingTasksText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    const updatedDays = currentRoster.days.map((d, idx) =>
      idx === dayIdx
        ? {
            ...d,
            tasks: tasksList.length > 0 ? tasksList : d.tasks,
            note: editingNoteText.trim(),
          }
        : d
    );
    saveRosterForWeek({ ...currentRoster, days: updatedDays });
    setEditingDayIdx(null);
    notify(`Đã cập nhật nội dung trực nhật ${currentRoster.days[dayIdx].dayLabel}.`);
  };

  // Toggle status & optionally award/deduct emulation points for students on duty that day
  const handleEvaluateDutyDay = (
    dayIdx: number,
    newStatus: 'done' | 'pending' | 'reminded',
    awardDelta: number = 0
  ) => {
    if (!canEditRoster) return;
    const targetDay = currentRoster.days[dayIdx];
    const updatedDays = currentRoster.days.map((d, idx) =>
      idx === dayIdx
        ? {
            ...d,
            status: newStatus,
            note:
              newStatus === 'done'
                ? 'Hoàn thành tốt trực nhật lớp học sạch sẽ'
                : newStatus === 'reminded'
                ? 'Cần nhắc nhở vệ sinh trực nhật kỹ hơn'
                : 'Thực hiện trực nhật đầu giờ và cuối buổi học',
          }
        : d
    );

    const assignedStudents = targetDay.studentIds
      .map((id) => studentMap[id])
      .filter(Boolean);

    const newEmulationRecords: EmulationRecord[] =
      awardDelta !== 0
        ? assignedStudents.map((st) => ({
            id: `emu-duty-${Date.now()}-${st.id}-${Math.random().toString(36).slice(2, 5)}`,
            week: selectedWeek,
            date: latestWeekInfo.todayISO,
            teamId: st.teamId,
            studentId: st.id,
            studentName: st.fullName,
            type: awardDelta > 0 ? 'plus' : 'minus',
            points: awardDelta,
            criteria:
              awardDelta > 0
                ? `Vệ sinh trực nhật sạch sẽ (${targetDay.dayLabel} ${targetDay.dateStr})`
                : `Nhắc nhở trực nhật vệ sinh (${targetDay.dayLabel} ${targetDay.dateStr})`,
            note: `Chấm trực nhật ${targetDay.dayLabel} (${targetDay.dateStr})`,
            recordedBy:
              currentUser && currentUser.role !== 'guest'
                ? `${currentUser.name} (${currentUser.roleTitle})`
                : 'GVCN Trần Văn Tiến',
          }))
        : [];

    onUpdateState((prev) => ({
      ...prev,
      weeklyDutyRosters: {
        ...(prev.weeklyDutyRosters || {}),
        [selectedWeek]: {
          ...currentRoster,
          days: updatedDays,
        },
      },
      emulationRecords:
        newEmulationRecords.length > 0
          ? [...newEmulationRecords, ...prev.emulationRecords]
          : prev.emulationRecords,
    }));

    if (awardDelta > 0 && assignedStudents.length > 0) {
      notify(
        `Đã xác nhận hoàn thành trực nhật ${targetDay.dayLabel} và cộng +${awardDelta}đ thi đua cho ${assignedStudents
          .map((s) => s.fullName)
          .join(', ')}!`
      );
    } else if (awardDelta < 0 && assignedStudents.length > 0) {
      notify(
        `Đã nhắc nhở trực nhật ${targetDay.dayLabel} (${awardDelta}đ) đối với ${assignedStudents
          .map((s) => s.fullName)
          .join(', ')}.`
      );
    } else {
      notify(`Đã cập nhật trạng thái trực nhật ${targetDay.dayLabel}.`);
    }
  };

  // Export Weekly Duty Roster to Excel
  const handleExportDutyExcel = () => {
    const headers = [
      'Tuần học',
      'Thứ',
      'Ngày tháng',
      'Tổ trực nhật',
      'Danh sách học sinh trực nhật',
      'Nhiệm vụ vệ sinh cụ thể',
      'Trạng thái',
      'Ghi chú / Nhận xét',
    ];

    const rows = currentRoster.days.map((d) => {
      const names = d.studentIds
        .map((id) => studentMap[id]?.fullName)
        .filter(Boolean)
        .join(', ');
      const statusLabel =
        d.status === 'done'
          ? 'Đã hoàn thành'
          : d.status === 'reminded'
          ? 'Cần nhắc nhở'
          : 'Đang thực hiện';

      return [
        `Tuần ${selectedWeek}`,
        d.dayLabel,
        d.dateStr,
        `Tổ ${currentRoster.teamId}`,
        names || 'Chưa phân công',
        d.tasks.join('; '),
        statusLabel,
        d.note || '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 34 },
      { wch: 46 },
      { wch: 16 },
      { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `TrucNhat_Tuan${selectedWeek}`);
    XLSX.writeFile(
      wb,
      `Danh_Sach_Hoc_Sinh_Truc_Nhat_Tuan_${selectedWeek}_Lop_${appState.className}.xlsx`
    );
  };

  const doneDaysCount = currentRoster.days.filter((d) => d.status === 'done').length;

  return (
    <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden space-y-0">
      {/* Local Toast if no parent handler */}
      {localToast && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{localToast}</span>
          </div>
          <button onClick={() => setLocalToast(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-blue-50/60 border-b border-[#D8E7FA] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-[#17365D]">
                Danh sách Học sinh Trực nhật Hàng tuần — Tuần {selectedWeek} ({weekMeta.label})
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px]">
                Tổ trực: Tổ {currentRoster.teamId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 font-bold text-[11px] font-mono">
                Hoàn thành: {doneDaysCount}/6 ngày
              </span>
            </div>
            <p className="text-xs text-[#66809F] mt-1">
              Phụ trách đôn đốc & kiểm tra: <strong className="text-[#17365D]">{currentRoster.supervisorName}</strong> • Phân công học sinh trực từ Thứ Hai đến Thứ Bảy
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-xs">
            <span className="font-bold text-[#66809F]">Tổ trực tuần {selectedWeek}:</span>
            {canChangeDutyTeam ? (
              <select
                value={currentRoster.teamId}
                onChange={(e) => handleChangeDutyTeam(Number(e.target.value))}
                className="font-extrabold text-emerald-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value={1}>Tổ 1</option>
                <option value={2}>Tổ 2</option>
                <option value={3}>Tổ 3</option>
                <option value={4}>Tổ 4</option>
              </select>
            ) : (
              <span className="font-extrabold text-emerald-800">Tổ {currentRoster.teamId}</span>
            )}
          </div>

          {canChangeDutyTeam && (
            <button
              onClick={handleAutoRedistribute}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Phân bổ lại danh sách học sinh trong tổ đều vào 6 ngày trong tuần"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Phân công tự động</span>
            </button>
          )}

          <button
            onClick={() => setShowRotationMatrix((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#0B438A] border border-blue-200 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-[#1677E8]" />
            <span>Lịch 35 tuần</span>
            {showRotationMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExportDutyExcel}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Collapsible 35-Week Team Duty Rotation Matrix */}
      {showRotationMatrix && (
        <div className="p-4 bg-slate-50 border-b border-[#D8E7FA] space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-[#17365D] uppercase flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#1677E8]" />
              Bảng xoay vòng Tổ trực nhật cả năm học (Tuần 1 – Tuần 35)
            </h4>
            <span className="text-[11px] text-[#66809F]">
              Nhấn vào tuần bất kỳ để xem danh sách học sinh trực nhật của tuần đó
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-7 gap-2 max-h-52 overflow-y-auto pr-1">
            {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
              const meta = getSchoolWeekMeta(w);
              const savedTeam = weeklyDutyRosters?.[w]?.teamId || getDefaultDutyTeamForWeek(w);
              const isSelected = w === selectedWeek;
              const isCurrent = w === activeCurrentWeek;
              return (
                <button
                  key={w}
                  onClick={() => {
                    if (onSelectWeek) onSelectWeek(w);
                  }}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#1677E8] text-white border-[#1677E8] shadow-xs'
                      : isCurrent
                      ? 'bg-emerald-50 border-emerald-300 text-[#17365D]'
                      : 'bg-white border-gray-200 hover:border-blue-300 text-[#17365D]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span>Tuần {w}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Tổ {savedTeam}
                    </span>
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 truncate ${
                      isSelected ? 'text-blue-100' : 'text-[#66809F]'
                    }`}
                  >
                    {meta.startDate.slice(0, 5)} – {meta.endDate.slice(0, 5)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary of Members in the Duty Team */}
      {!compactMode && (
        <div className="px-4 sm:px-5 py-3.5 bg-[#F8FAFC] border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-extrabold text-[#17365D] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              Danh sách thành viên Tổ {currentRoster.teamId} tham gia trực nhật Tuần {selectedWeek} (
              {canEditRoster
                ? dutyTeamMembers.length
                : dutyTeamMembers.filter((m) => (memberDutyDaysMap[m.id] || []).length > 0).length}{' '}
              học sinh):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {canEditRoster && unassignedMembers.length > 0 && (
                <button
                  onClick={handleRemoveAllUnassignedMembers}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-bold text-[11px] transition-colors cursor-pointer"
                  title="Xóa toàn bộ học sinh chưa được phân công ngày trực khỏi danh sách tuần này"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa {unassignedMembers.length} HS chưa phân công</span>
                </button>
              )}
              <span className="text-[11px] text-[#66809F]">
                Mỗi học sinh trong tổ được phân công trực nhật theo ngày cụ thể bên dưới
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(canEditRoster
              ? dutyTeamMembers
              : dutyTeamMembers.filter((m) => (memberDutyDaysMap[m.id] || []).length > 0)
            ).map((member) => {
              const assignedDays = memberDutyDaysMap[member.id] || [];
              return (
                <div
                  key={member.id}
                  className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border shadow-2xs text-xs transition-colors ${
                    assignedDays.length === 0
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-[#D8E7FA]'
                  }`}
                >
                  <img
                    src={member.avatar}
                    alt={member.fullName}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover border border-emerald-200 shrink-0"
                  />
                  <span className="font-bold text-[#17365D]">{member.fullName}</span>
                  {member.roleInClass !== 'Thành viên' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-[#1677E8]">
                      {member.roleInClass}
                    </span>
                  )}
                  {assignedDays.length > 0 ? (
                    <div className="inline-flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10.5px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {assignedDays.join(', ')}
                      </span>
                      {canEditRoster && (
                        <button
                          onClick={() => handleRemoveMemberFromWeeklyRoster(member.id)}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-gray-400 hover:text-white hover:bg-red-500 transition-colors cursor-pointer"
                          title={`Xóa ${member.fullName} khỏi danh sách trực nhật Tuần ${selectedWeek}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    canEditRoster && (
                      <button
                        onClick={() => handleRemoveMemberFromWeeklyRoster(member.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-bold text-[10.5px] transition-colors cursor-pointer"
                        title={`Xóa ${member.fullName} khỏi danh sách trực nhật Tuần ${selectedWeek}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Duty Schedule Table (Monday -> Saturday) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F4F9FF] border-b border-[#D8E7FA] text-[#0B438A] font-extrabold uppercase text-[10.5px]">
            <tr>
              <th className="py-3 px-4 w-36">Thứ / Ngày</th>
              <th className="py-3 px-4 min-w-[260px]">Học sinh trực nhật trong ngày</th>
              <th className="py-3 px-4 min-w-[250px]">Nhiệm vụ vệ sinh & Trực lớp</th>
              <th className="py-3 px-3 w-36 text-center">Trạng thái</th>
              <th className="py-3 px-4 w-48 text-right">Chấm trực nhật nhanh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentRoster.days.map((day, dayIdx) => {
              const isToday = day.dateStr === latestWeekInfo.todayVN;
              const assignedStudents = day.studentIds
                .map((id) => studentMap[id])
                .filter(Boolean);

              return (
                <tr
                  key={day.dayIndex}
                  className={`hover:bg-blue-50/30 transition-colors ${
                    isToday ? 'bg-amber-50/40' : ''
                  }`}
                >
                  {/* Day & Date */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-[#17365D]">
                          {day.dayLabel}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-extrabold text-[9.5px] uppercase">
                            Hôm nay
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-[#66809F] mt-0.5">
                        {day.dateStr}
                      </span>
                      <span className="text-[10.5px] text-emerald-700 font-bold mt-1">
                        Tổ {currentRoster.teamId} phụ trách
                      </span>
                    </div>
                  </td>

                  {/* Assigned Students List */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-2">
                      {assignedStudents.length === 0 ? (
                        <p className="text-gray-400 italic text-xs">
                          Chưa có học sinh phân công ngày này
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {assignedStudents.map((st, idx) => (
                            <div
                              key={st.id}
                              className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-2.5 py-1.5 shadow-2xs group"
                            >
                              <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0B438A] font-mono font-bold text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <img
                                src={st.avatar}
                                alt={st.fullName}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover border border-blue-100 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-[#17365D] leading-tight">
                                  {st.fullName}
                                </div>
                                <div className="text-[10px] text-[#66809F]">
                                  Tổ {st.teamId} • {st.roleInClass}
                                </div>
                              </div>
                              {canEditRoster && (
                                <button
                                  onClick={() => handleRemoveStudentFromDay(dayIdx, st.id)}
                                  className="text-gray-300 hover:text-red-500 p-0.5 transition-colors"
                                  title={`Xóa ${st.fullName} khỏi ngày ${day.dayLabel}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Student to Day inline selector */}
                      {canEditRoster && (
                        addingDayIdx === dayIdx ? (
                          <div className="flex items-center gap-1.5 pt-1">
                            <select
                              value={selectedStudentToAdd}
                              onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                              className="px-2.5 py-1 rounded-lg border border-blue-300 bg-white text-xs font-semibold text-[#17365D] focus:outline-hidden"
                            >
                              <option value="">-- Chọn học sinh thêm vào {day.dayLabel} --</option>
                              <optgroup label={`Thành viên Tổ ${currentRoster.teamId} (Tổ trực tuần này)`}>
                                {allTeamMembers
                                  .filter((s) => !day.studentIds.includes(s.id))
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.fullName} (Tổ {s.teamId} - {s.roleInClass})
                                    </option>
                                  ))}
                              </optgroup>
                              <optgroup label="Học sinh các tổ khác">
                                {students
                                  .filter(
                                    (s) =>
                                      s.teamId !== currentRoster.teamId &&
                                      !day.studentIds.includes(s.id)
                                  )
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.fullName} (Tổ {s.teamId})
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                            <button
                              onClick={() => handleAddStudentToDay(dayIdx)}
                              className="px-2.5 py-1 rounded-lg bg-[#1677E8] text-white font-bold text-xs hover:bg-[#0B438A]"
                            >
                              Thêm
                            </button>
                            <button
                              onClick={() => {
                                setAddingDayIdx(null);
                                setSelectedStudentToAdd('');
                              }}
                              className="p-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingDayIdx(dayIdx);
                              const firstAvailable = allTeamMembers.find(
                                (s) => !day.studentIds.includes(s.id)
                              );
                              setSelectedStudentToAdd(firstAvailable?.id || '');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1677E8] hover:text-[#0B438A] bg-blue-50/70 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>+ Thêm học sinh trực</span>
                          </button>
                        )
                      )}
                    </div>
                  </td>

                  {/* Daily Cleaning Tasks */}
                  <td className="py-3.5 px-4 align-top">
                    {editingDayIdx === dayIdx ? (
                      <div className="space-y-2">
                        <label className="block text-[10.5px] font-bold text-[#17365D]">
                          Nhiệm vụ (mỗi dòng 1 việc):
                        </label>
                        <textarea
                          rows={3}
                          value={editingTasksText}
                          onChange={(e) => setEditingTasksText(e.target.value)}
                          className="w-full p-2 rounded-lg border border-blue-300 text-xs focus:outline-hidden"
                        />
                        <input
                          type="text"
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          placeholder="Ghi chú nhận xét..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSaveEditDay(dayIdx)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Lưu
                          </button>
                          <button
                            onClick={() => setEditingDayIdx(null)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 group">
                        <ul className="space-y-1 text-[#17365D]">
                          {day.tasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-1.5 leading-snug">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                        {day.note && (
                          <p className="text-[11px] text-[#66809F] italic">
                            Ghi chú: {day.note}
                          </p>
                        )}
                        {canEditRoster && (
                          <button
                            onClick={() => handleStartEditDay(dayIdx, day)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gray-400 hover:text-[#1677E8] pt-0.5"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa công việc</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="py-3.5 px-3 align-top text-center">
                    {day.status === 'done' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đã hoàn thành
                      </span>
                    ) : day.status === 'reminded' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        Cần nhắc nhở
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Chưa trực / Chờ
                      </span>
                    )}
                  </td>

                  {/* Quick Evaluation & Emulation Points */}
                  <td className="py-3.5 px-4 align-top text-right">
                    {canEditRoster ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleEvaluateDutyDay(dayIdx, 'done', 2)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold text-[11px] transition-colors"
                            title="Xác nhận hoàn thành tốt trực nhật & Cộng +2đ thi đua cho mỗi học sinh trực ngày này"
                          >
                            ✓ Tốt (+2đ)
                          </button>
                          <button
                            onClick={() => handleEvaluateDutyDay(dayIdx, 'reminded', -2)}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 font-bold text-[11px] transition-colors"
                            title="Nhắc nhở trực nhật & Trừ -2đ thi đua"
                          >
                            Nhắc (-2đ)
                          </button>
                        </div>
                        {day.status !== 'pending' && (
                          <button
                            onClick={() => handleEvaluateDutyDay(dayIdx, 'pending', 0)}
                            className="text-[10.5px] text-gray-400 hover:text-gray-600 underline"
                          >
                            Đặt lại trạng thái chờ
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">
                        {readOnly ? 'Chỉ xem' : 'Chưa phân quyền'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
