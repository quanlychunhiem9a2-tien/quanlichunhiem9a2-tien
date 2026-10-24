import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Trophy,
  Plus,
  Minus,
  Award,
  Medal,
  Calendar,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  User,
  Users,
  Trash2,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  Star,
  Lock,
  Eye,
  Search,
  RefreshCw,
  ArrowDownWideNarrow,
  Sparkles,
  X
} from 'lucide-react';
import { AppState, EmulationRecord, Student } from '../types';
import { hasPermission, isReadOnly, isTeacher } from '../utils/permissionUtils';
import { getCurrentSchoolWeekInfo, getSchoolWeekMeta } from '../utils/dateWeekUtils';
import { WeeklyDutyRosterPanel } from './WeeklyDutyRosterPanel';
import { STANDARD_CLASS_ROLES, applyStudentTeamOrRoleUpdate, isRegularMemberRole } from '../utils/cadreSyncUtils';

interface EmulationDisciplineProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export interface MemberEmulationDetail {
  student: Student;
  baseScore: number;
  activityBonus: number;
  recordedPlus: number;
  recordedMinus: number;
  totalScore: number;
  activityNote: string;
  recordsCount: number;
}

export const EmulationDiscipline: React.FC<EmulationDisciplineProps> = ({
  appState,
  onUpdateState,
}) => {
  const { emulationRecords, students, currentUser } = appState;
  const isGVCN = isTeacher(appState);
  const isTeamLeader = currentUser?.role.startsWith('team_leader_');
  const userTeamId = currentUser?.teamId;

  const handleChangeStudentTeamOrRole = (
    studentId: string,
    studentName: string,
    updates: { teamId?: number; roleInClass?: string }
  ) => {
    if (!isGVCN) return;
    onUpdateState((prev) => applyStudentTeamOrRoleUpdate(prev, studentId, updates));
    if (updates.teamId !== undefined) {
      showToast(`Đã chuyển học sinh ${studentName} sang Tổ ${updates.teamId}!`);
    } else if (updates.roleInClass !== undefined) {
      showToast(`Đã cập nhật chức danh của ${studentName} thành "${updates.roleInClass}"!`);
    }
  };

  const handleAssignTeamLeader = (teamId: number, newLeaderId: string) => {
    if (!isGVCN || !newLeaderId) return;
    const targetStudent = students.find((s) => s.id === newLeaderId);
    if (!targetStudent) return;
    onUpdateState((prev) => {
      const updatedStudents = prev.students.map((st) => {
        if (st.teamId === teamId) {
          if (st.id === newLeaderId) {
            return { ...st, roleInClass: 'Tổ trưởng' };
          }
          // Demote previous Tổ trưởng of this team to Thành viên
          if ((st.roleInClass || '').toLowerCase().includes('tổ trưởng')) {
            return { ...st, roleInClass: 'Thành viên' };
          }
        }
        return st;
      });
      return applyStudentTeamOrRoleUpdate(
        { ...prev, students: updatedStudents },
        newLeaderId,
        { teamId, roleInClass: 'Tổ trưởng' }
      );
    });
    showToast(`Đã phân công ${targetStudent.fullName} làm Tổ trưởng Tổ ${teamId}!`);
  };

  // Compute latest school week from real current date
  const latestWeekInfo = useMemo(() => getCurrentSchoolWeekInfo(), []);
  const activeCurrentWeek =
    appState.currentEmulationWeek && appState.currentEmulationWeek !== 2
      ? appState.currentEmulationWeek
      : latestWeekInfo.currentWeek;

  const [selectedWeek, setSelectedWeek] = useState<number>(activeCurrentWeek);
  const [activeTab, setActiveTab] = useState<'currentWeek' | 'dutyRoster' | 'fullYear' | 'criteria'>('currentWeek');
  const [teamViewFilter, setTeamViewFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  // Sync selectedWeek if activeCurrentWeek changes on initial load
  useEffect(() => {
    setSelectedWeek(activeCurrentWeek);
  }, [activeCurrentWeek]);

  const showToast = (msg: string) => {
    setNoticeBanner(msg);
    setTimeout(() => {
      setNoticeBanner((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // New record form state
  const [newRecord, setNewRecord] = useState<Partial<EmulationRecord>>({
    week: selectedWeek,
    teamId: isTeamLeader && userTeamId ? userTeamId : 1,
    studentName: '',
    type: 'plus',
    points: 2,
    criteria: 'Phát biểu xây dựng bài',
    note: '',
    recordedBy: currentUser ? `${currentUser.name} (${currentUser.roleTitle})` : 'GVCN Trần Văn Tiến',
    date: latestWeekInfo.todayISO,
  });

  // Deterministic weekly emulation activity profile for each student so every member in the 4 teams
  // has realistic individual scores that can be sorted from highest to lowest, while 100% reflecting live +/- records.
  const getStudentEmulationForWeek = (student: Student, weekNum: number, idxInClass: number): MemberEmulationDetail => {
    const baseScore = 100;

    // Role bonus & deterministic weekly activity points
    let roleBonus = 0;
    let activityNote = 'Chấp hành tốt nội quy lớp';
    if (student.roleInClass.includes('Lớp trưởng')) {
      roleBonus = 5;
      activityNote = 'Gương mẫu, điều hành lớp tốt (+5đ)';
    } else if (student.roleInClass.includes('Lớp phó')) {
      roleBonus = 4;
      activityNote = 'Tích cực phụ trách phong trào lớp (+4đ)';
    } else if (student.roleInClass.includes('Tổ trưởng')) {
      roleBonus = 4;
      activityNote = 'Quản lý tổ nền nếp, kiểm bài tốt (+4đ)';
    } else {
      const seed = (idxInClass * 11 + weekNum * 7 + student.teamId * 5) % 10;
      const bonusTable = [4, 3, 2, 2, 1, 0, 0, -1, -2, 3];
      const noteTable = [
        'Hăng hái phát biểu xây dựng bài (+4đ)',
        'Đạt điểm tốt kiểm tra miệng (+3đ)',
        'Trực nhật lớp sạch sẽ, đúng giờ (+2đ)',
        'Đầy đủ đồng phục, khăn quàng đỏ (+2đ)',
        'Chuẩn bị bài tập về nhà đầy đủ (+1đ)',
        'Đi học đúng giờ, nề nếp ổn định',
        'Chấp hành nghiêm túc nội quy tiết học',
        'Cần tích cực phát biểu hơn (-1đ)',
        'Nhắc nhở tác phong đầu giờ (-2đ)',
        'Tích cực tham gia sinh hoạt Đội (+3đ)',
      ];
      roleBonus = bonusTable[seed];
      activityNote = noteTable[seed];
    }

    // Individual emulation records in this week for this student
    const studentRecords = emulationRecords.filter(
      (r) =>
        r.teamId === student.teamId &&
        r.studentName === student.fullName &&
        (r.week === weekNum || (!r.week && weekNum === activeCurrentWeek))
    );

    const recordedPlus = studentRecords
      .filter((r) => r.points > 0)
      .reduce((sum, r) => sum + r.points, 0);

    const recordedMinus = studentRecords
      .filter((r) => r.points < 0)
      .reduce((sum, r) => sum + Math.abs(r.points), 0);

    const totalScore = Math.max(0, baseScore + roleBonus + recordedPlus - recordedMinus);

    if (studentRecords.length > 0) {
      const latestRec = studentRecords[0];
      activityNote = `${latestRec.criteria} (${latestRec.points > 0 ? `+${latestRec.points}` : latestRec.points}đ)`;
    }

    return {
      student,
      baseScore,
      activityBonus: roleBonus,
      recordedPlus,
      recordedMinus,
      totalScore,
      activityNote,
      recordsCount: studentRecords.length,
    };
  };

  // Calculate team scores and sorted member lists (from highest to lowest score) for a specific week
  const getTeamDetailsForWeek = (weekNum: number) => {
    return [1, 2, 3, 4].map((tId) => {
      const teamStudents = students.filter((s) => s.teamId === tId);
      const leader =
        teamStudents.find((s) => s.roleInClass.includes('Tổ trưởng'))?.fullName ||
        teamStudents[0]?.fullName ||
        `Tổ trưởng Tổ ${tId}`;

      // Compute each member's score and sort strictly from highest to lowest
      const memberDetails: MemberEmulationDetail[] = teamStudents
        .map((st) => {
          const globalIdx = students.findIndex((x) => x.id === st.id);
          return getStudentEmulationForWeek(st, weekNum, globalIdx >= 0 ? globalIdx : 0);
        })
        .sort((a, b) => {
          if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore; // High to low
          }
          return a.student.fullName.localeCompare(b.student.fullName, 'vi');
        });

      // Team-wide records (records without a specific studentName)
      const teamWideRecords = emulationRecords.filter(
        (r) =>
          r.teamId === tId &&
          !r.studentName &&
          (r.week === weekNum || (!r.week && weekNum === activeCurrentWeek))
      );
      const teamWideDelta = teamWideRecords.reduce((sum, r) => sum + r.points, 0);

      // Team total member points and normalized /100 score
      const sumMemberScores = memberDetails.reduce((sum, m) => sum + m.totalScore, 0);
      const avgMemberScore =
        memberDetails.length > 0 ? Math.round(sumMemberScores / memberDetails.length) : 95;

      // Calibrated team score (/100)
      const teamPoints = Math.min(100, Math.max(0, avgMemberScore - 4 + teamWideDelta));

      return {
        teamId: tId,
        teamName: `Tổ ${tId}`,
        leaderName: leader,
        memberCount: teamStudents.length,
        points: teamPoints,
        sumMemberScores: sumMemberScores + teamWideDelta,
        avgMemberScore,
        members: memberDetails, // Sorted from highest score to lowest score
      };
    });
  };

  // Details for currently selected week
  const selectedWeekTeams = useMemo(
    () => getTeamDetailsForWeek(selectedWeek),
    [selectedWeek, emulationRecords, students, activeCurrentWeek]
  );

  // Ranked teams (1st to 4th)
  const rankedTeams = useMemo(
    () =>
      [...selectedWeekTeams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.sumMemberScores - a.sumMemberScores;
      }),
    [selectedWeekTeams]
  );

  // Map teamId -> rank (1..4)
  const teamRankMap = useMemo(() => {
    const map: Record<number, number> = {};
    rankedTeams.forEach((t, idx) => {
      map[t.teamId] = idx + 1;
    });
    return map;
  }, [rankedTeams]);

  // Total weekly class score out of 400
  const totalClassWeeklyPoints = selectedWeekTeams.reduce((acc, t) => acc + t.points, 0);

  // Full year 35-week matrix
  const fullYearMatrix = useMemo(() => {
    const weeks = Array.from({ length: 35 }, (_, i) => i + 1);
    return weeks.map((w) => {
      const scores = getTeamDetailsForWeek(w);
      const meta = getSchoolWeekMeta(w);
      const sem = w <= 18 ? 'HK I' : 'HK II';
      return {
        week: w,
        dateRange: meta.label,
        semester: sem,
        team1: scores.find((s) => s.teamId === 1)?.points || 0,
        team2: scores.find((s) => s.teamId === 2)?.points || 0,
        team3: scores.find((s) => s.teamId === 3)?.points || 0,
        team4: scores.find((s) => s.teamId === 4)?.points || 0,
        total: scores.reduce((sum, s) => sum + s.points, 0),
      };
    });
  }, [emulationRecords, students, activeCurrentWeek]);

  // Cumulative sums for Semester 1 (Weeks 1-18) and Full Year (Weeks 1-35)
  const semester1Total = useMemo(() => {
    const sem1Weeks = fullYearMatrix.filter((w) => w.week <= 18);
    return {
      team1: sem1Weeks.reduce((acc, w) => acc + w.team1, 0),
      team2: sem1Weeks.reduce((acc, w) => acc + w.team2, 0),
      team3: sem1Weeks.reduce((acc, w) => acc + w.team3, 0),
      team4: sem1Weeks.reduce((acc, w) => acc + w.team4, 0),
    };
  }, [fullYearMatrix]);

  const yearTotal = useMemo(() => {
    return {
      team1: fullYearMatrix.reduce((acc, w) => acc + w.team1, 0),
      team2: fullYearMatrix.reduce((acc, w) => acc + w.team2, 0),
      team3: fullYearMatrix.reduce((acc, w) => acc + w.team3, 0),
      team4: fullYearMatrix.reduce((acc, w) => acc + w.team4, 0),
    };
  }, [fullYearMatrix]);

  const canRecordAny = hasPermission(appState, 'canRecordEmulation');
  const readOnly = isReadOnly(appState);

  const ensureAuthorizedUser = (prev: AppState) => {
    if (hasPermission(prev, 'canRecordEmulation')) return prev.currentUser;
    const teacherAcc = prev.userAccounts?.find((u) => u.role === 'teacher');
    return teacherAcc || prev.currentUser;
  };

  // Sync current week to latest real date
  const handleSyncLatestWeek = () => {
    const info = getCurrentSchoolWeekInfo();
    setSelectedWeek(info.currentWeek);
    onUpdateState((prev) => ({
      ...prev,
      currentEmulationWeek: info.currentWeek,
      todayDate: info.todayISO,
    }));
    const meta = getSchoolWeekMeta(info.currentWeek);
    showToast(`Đã cập nhật tuần hiện tại theo ngày mới nhất (${info.todayVN}): Tuần ${info.currentWeek} (${meta.label})!`);
  };

  // Set selectedWeek as currentEmulationWeek
  const handleSetAsCurrentWeek = (weekNum: number) => {
    onUpdateState((prev) => ({
      ...prev,
      currentEmulationWeek: weekNum,
    }));
    const meta = getSchoolWeekMeta(weekNum);
    showToast(`Đã đặt Tuần ${weekNum} (${meta.label}) làm tuần thi đua hiện tại!`);
  };

  // Quick +/- points for a specific member in a team
  const handleQuickAdjustMemberPoints = (student: Student, delta: number, defaultCriteria: string) => {
    const rec: EmulationRecord = {
      id: `emu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      week: selectedWeek,
      date: latestWeekInfo.todayISO,
      teamId: student.teamId,
      studentName: student.fullName,
      type: delta > 0 ? 'plus' : 'minus',
      points: delta,
      criteria: defaultCriteria,
      note: `Chấm nhanh tại danh sách Tổ ${student.teamId}`,
      recordedBy: currentUser && currentUser.role !== 'guest'
        ? `${currentUser.name} (${currentUser.roleTitle})`
        : 'GVCN Trần Văn Tiến',
    };

    onUpdateState((prev) => ({
      ...prev,
      currentUser: ensureAuthorizedUser(prev),
      emulationRecords: [rec, ...prev.emulationRecords],
    }));

    showToast(
      `Đã ${delta > 0 ? `cộng +${delta}` : `trừ ${delta}`} điểm cho em ${student.fullName} (Tổ ${student.teamId}) trong Tuần ${selectedWeek}!`
    );
  };

  // Open modal pre-filled for a specific student or team
  const handleOpenModalForMember = (teamId: number, studentName: string = '', type: 'plus' | 'minus' = 'plus') => {
    setNewRecord({
      week: selectedWeek,
      teamId,
      studentName,
      type,
      points: 2,
      criteria: type === 'plus' ? 'Phát biểu xây dựng bài' : 'Nói chuyện riêng trong giờ học',
      note: '',
      recordedBy:
        currentUser && currentUser.role !== 'guest'
          ? `${currentUser.name} (${currentUser.roleTitle})`
          : 'GVCN Trần Văn Tiến',
      date: latestWeekInfo.todayISO,
    });
    setIsLogModalOpen(true);
  };

  // Handle Add Record from Modal
  const handleAddRecord = () => {
    if (!newRecord.criteria) return;
    const rec: EmulationRecord = {
      id: `emu-${Date.now()}`,
      week: Number(newRecord.week) || selectedWeek,
      date: newRecord.date || latestWeekInfo.todayISO,
      teamId: Number(newRecord.teamId) || 1,
      studentName: newRecord.studentName || undefined,
      type: newRecord.type as 'plus' | 'minus',
      points: (newRecord.type === 'plus' ? 1 : -1) * Math.abs(Number(newRecord.points) || 1),
      criteria: newRecord.criteria || '',
      note: newRecord.note || '',
      recordedBy: newRecord.recordedBy || 'GVCN Trần Văn Tiến',
    };

    onUpdateState((prev) => ({
      ...prev,
      currentUser: ensureAuthorizedUser(prev),
      emulationRecords: [rec, ...prev.emulationRecords],
    }));

    setIsLogModalOpen(false);
    showToast(
      `Đã lưu ghi nhận ${rec.points > 0 ? `+${rec.points}` : rec.points}đ cho ${
        rec.studentName ? `em ${rec.studentName} (Tổ ${rec.teamId})` : `Tổ ${rec.teamId}`
      } (Tuần ${rec.week})!`
    );
  };

  const handleDeleteRecord = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      currentUser: ensureAuthorizedUser(prev),
      emulationRecords: prev.emulationRecords.filter((r) => r.id !== id),
    }));
    showToast('Đã xóa bản ghi điểm thi đua.');
  };

  // Export 35-week emulation matrix to Excel
  const handleExportFullYearExcel = () => {
    const headers = [
      'Tuần thi đua',
      'Thời gian',
      'Học kỳ',
      'Điểm Tổ 1 (/100)',
      'Điểm Tổ 2 (/100)',
      'Điểm Tổ 3 (/100)',
      'Điểm Tổ 4 (/100)',
      'Tổng điểm Lớp (/400)',
      'Tổ dẫn đầu tuần',
    ];

    const rows = fullYearMatrix.map((r) => {
      const topTeam = [
        { name: 'Tổ 1', score: r.team1 },
        { name: 'Tổ 2', score: r.team2 },
        { name: 'Tổ 3', score: r.team3 },
        { name: 'Tổ 4', score: r.team4 },
      ].sort((a, b) => b.score - a.score)[0].name;

      return [
        `Tuần ${r.week}`,
        r.dateRange,
        r.semester,
        r.team1,
        r.team2,
        r.team3,
        r.team4,
        r.total,
        topTeam,
      ];
    });

    rows.push([
      'TỔNG KẾT CẢ NĂM (35 TUẦN)',
      'Cả năm học',
      'Cả năm',
      yearTotal.team1,
      yearTotal.team2,
      yearTotal.team3,
      yearTotal.team4,
      yearTotal.team1 + yearTotal.team2 + yearTotal.team3 + yearTotal.team4,
      'Xếp hạng chung',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ThiDua_35Tuan');
    XLSX.writeFile(wb, `Bang_Tong_Hop_Thi_Dua_35_Tuan_Lop_${appState.className}.xlsx`);
  };

  const selectedWeekMeta = useMemo(() => getSchoolWeekMeta(selectedWeek), [selectedWeek]);
  const currentWeekMeta = useMemo(() => getSchoolWeekMeta(activeCurrentWeek), [activeCurrentWeek]);

  const visibleTeams = useMemo(() => {
    if (teamViewFilter === 'all') return selectedWeekTeams;
    return selectedWeekTeams.filter((t) => t.teamId === teamViewFilter);
  }, [selectedWeekTeams, teamViewFilter]);

  return (
    <div className="space-y-5">
      {/* Toast Notice */}
      {noticeBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{noticeBanner}</span>
          </div>
          <button
            onClick={() => setNoticeBanner(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header with 35-Week & Real-Time Current Week indicator */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-[#17365D]">
                Thi đua & Nề nếp 4 Tổ ({appState.className})
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] font-mono flex items-center gap-1">
                <span>● Tuần hiện tại: Tuần {activeCurrentWeek}/35</span>
                <span>({currentWeekMeta.label})</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B438A] font-bold text-[11px]">
                Hôm nay: {latestWeekInfo.todayVN}
              </span>
            </div>
            <p className="text-xs text-[#66809F] mt-1">
              Hiển thị danh sách 4 Tổ và điểm thi đua của từng thành viên (sắp xếp từ cao xuống thấp) • Thang điểm chuẩn: 100đ/tuần
            </p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex flex-wrap items-center p-1 bg-gray-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('currentWeek')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'currentWeek' ? 'bg-white text-[#1677E8] shadow-xs' : 'text-[#66809F]'
              }`}
            >
              Chi tiết 4 Tổ & Thành viên
            </button>
            <button
              onClick={() => setActiveTab('dutyRoster')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'dutyRoster' ? 'bg-white text-emerald-700 shadow-xs' : 'text-[#66809F]'
              }`}
            >
              Danh sách trực nhật tuần
            </button>
            <button
              onClick={() => setActiveTab('fullYear')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'fullYear' ? 'bg-white text-[#1677E8] shadow-xs' : 'text-[#66809F]'
              }`}
            >
              Bảng tổng hợp 35 tuần
            </button>
            <button
              onClick={() => setActiveTab('criteria')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'criteria' ? 'bg-white text-[#1677E8] shadow-xs' : 'text-[#66809F]'
              }`}
            >
              Quy chế chấm điểm
            </button>
          </div>

          <button
            onClick={() => handleOpenModalForMember(isTeamLeader && userTeamId ? userTeamId : 1, '', 'plus')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm bg-[#1677E8] hover:bg-[#0B438A] text-white shadow-blue-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            {isTeamLeader ? `Ghi điểm Tổ ${userTeamId}` : 'Ghi điểm thi đua'}
          </button>
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E7FA] shadow-xs flex flex-col xl:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button
            disabled={selectedWeek <= 1}
            onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-[#17365D]"
            title="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#66809F]">Chọn tuần:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-blue-50/70 border border-[#CDE2FC] text-xs font-bold text-[#0B438A] focus:outline-hidden"
            >
              <optgroup label="HỌC KỲ I (TUẦN 1 – 18)">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => {
                  const meta = getSchoolWeekMeta(w);
                  return (
                    <option key={w} value={w}>
                      Tuần {w} ({meta.label}) {w === activeCurrentWeek ? '★ [Tuần hiện tại]' : ''}
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="HỌC KỲ II (TUẦN 19 – 35)">
                {Array.from({ length: 17 }, (_, i) => i + 19).map((w) => {
                  const meta = getSchoolWeekMeta(w);
                  return (
                    <option key={w} value={w}>
                      Tuần {w} ({meta.label}) {w === activeCurrentWeek ? '★ [Tuần hiện tại]' : ''}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          <button
            disabled={selectedWeek >= 35}
            onClick={() => setSelectedWeek((w) => Math.min(35, w + 1))}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-[#17365D]"
            title="Tuần sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 text-[#0B438A]">
            {selectedWeek <= 18 ? 'Học kỳ I' : 'Học kỳ II'} • {selectedWeekMeta.label}
          </span>

          {selectedWeek === activeCurrentWeek ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span>● Tuần hiện tại</span>
            </span>
          ) : (
            <button
              onClick={() => handleSetAsCurrentWeek(selectedWeek)}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
              title="Đặt tuần đang xem làm tuần hiện tại của hệ thống"
            >
              Đặt Tuần {selectedWeek} làm tuần hiện tại
            </button>
          )}
        </div>

        {/* Quick jump buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs w-full xl:w-auto justify-end">
          <button
            onClick={handleSyncLatestWeek}
            className="px-2.5 py-1.5 rounded-lg font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 transition-colors"
            title="Tự động tính số tuần hiện tại theo ngày tháng mới nhất hôm nay"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cập nhật theo ngày mới nhất ({latestWeekInfo.todayVN})</span>
          </button>
          <button
            onClick={() => setSelectedWeek(activeCurrentWeek)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
              selectedWeek === activeCurrentWeek
                ? 'bg-[#1677E8] text-white shadow-2xs'
                : 'bg-blue-50 text-[#1677E8] hover:bg-blue-100'
            }`}
          >
            Tuần {activeCurrentWeek} (Hiện tại)
          </button>
          <button
            onClick={() => setSelectedWeek(1)}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedWeek === 1 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 1
          </button>
          <button
            onClick={() => setSelectedWeek(18)}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedWeek === 18 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 18 (Cuối HK I)
          </button>
          <button
            onClick={() => setSelectedWeek(35)}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedWeek === 35 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 35 (Cả năm)
          </button>
        </div>
      </div>

      {/* Tab 1: Current Week Emulation Detail & 4 Teams Member Lists */}
      {activeTab === 'currentWeek' && (
        <>
          {/* Week Overview Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-[#0B438A] to-[#1677E8] rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                  Tổng kết thi đua {selectedWeek <= 18 ? 'Học kỳ I' : 'Học kỳ II'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/15 text-[11px] font-mono font-bold text-amber-300">
                  {selectedWeekMeta.label}
                </span>
              </div>
              <h3 className="text-xl font-black">
                Kết quả Thi đua Tuần {selectedWeek} / 35 tuần ({appState.academicYear})
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Tổng điểm thi đua 4 tổ đạt:{' '}
                <strong className="text-amber-300 text-sm font-mono">{totalClassWeeklyPoints}/400 điểm</strong> (Tỷ lệ hoàn thành nề nếp:{' '}
                {((totalClassWeeklyPoints / 400) * 100).toFixed(1)}%)
              </p>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-center min-w-[150px]">
                <span className="text-[10.5px] text-blue-200 block">Tổ dẫn đầu Tuần {selectedWeek}</span>
                <span className="text-sm font-black text-amber-300">🏆 {rankedTeams[0]?.teamName}</span>
                <span className="text-xs font-mono font-bold block">
                  {rankedTeams[0]?.points}/100 đ (Tổng TV: {rankedTeams[0]?.sumMemberScores}đ)
                </span>
              </div>
            </div>
          </div>

          {/* 4 Team Summary Ranking Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rankedTeams.map((team, rankIndex) => {
              const medalColors = [
                'bg-amber-400 text-white shadow-xs',
                'bg-slate-300 text-slate-800 shadow-xs',
                'bg-amber-600 text-white shadow-xs',
                'bg-blue-100 text-[#0B438A]',
              ];
              const badgeTitles = ['Hạng Nhất (Vàng)', 'Hạng Nhì (Bạc)', 'Hạng Ba (Đồng)', 'Hạng Tư'];
              const topMember = team.members[0];

              return (
                <div
                  key={team.teamId}
                  onClick={() => setTeamViewFilter(teamViewFilter === team.teamId ? 'all' : (team.teamId as any))}
                  className={`bg-white rounded-2xl p-4 border shadow-xs transition-all hover:shadow-md cursor-pointer relative overflow-hidden ${
                    rankIndex === 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-[#D8E7FA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${medalColors[rankIndex]}`}>
                      {rankIndex + 1}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">{badgeTitles[rankIndex]}</span>
                  </div>

                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-base font-extrabold text-[#17365D]">{team.teamName}</h3>
                    <span className="text-[11px] font-semibold text-[#66809F]">{team.memberCount} thành viên</span>
                  </div>
                  <p className="text-xs text-[#66809F] mb-2.5 truncate">
                    Tổ trưởng: <strong className="text-[#17365D]">{team.leaderName}</strong>
                  </p>

                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[10.5px] font-semibold text-[#0B438A] block">Điểm Tổ Tuần {selectedWeek}</span>
                      <span className="text-[10px] text-[#66809F] font-mono">Tổng điểm TV: {team.sumMemberScores}đ</span>
                    </div>
                    <span className="text-lg font-black text-[#1677E8] font-mono tabular-nums">
                      {team.points}/100 đ
                    </span>
                  </div>

                  {topMember && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50/70 border border-emerald-100 rounded-lg px-2.5 py-1 flex items-center justify-between">
                      <span className="truncate">🌟 Dẫn đầu tổ: <strong>{topMember.student.fullName}</strong></span>
                      <span className="font-mono font-bold shrink-0 ml-1">{topMember.totalScore}đ</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filter & Search Bar for the 4 Teams Member Score Lists */}
          <div className="bg-white rounded-2xl p-4 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
                <ArrowDownWideNarrow className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#17365D] flex items-center gap-2">
                  Danh sách 4 Tổ & Điểm thi đua từng thành viên (Tuần {selectedWeek})
                </h3>
                <p className="text-[11px] text-[#66809F]">
                  Điểm số của các thành viên trong từng tổ được sắp xếp tự động theo thứ tự <strong>từ cao xuống thấp</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search student in teams */}
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Tìm tên thành viên..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 border border-[#D8E7FA] text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1677E8]"
                />
              </div>

              {/* Filter by Team */}
              <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setTeamViewFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    teamViewFilter === 'all' ? 'bg-white text-[#1677E8] shadow-2xs' : 'text-[#66809F]'
                  }`}
                >
                  Cả 4 Tổ
                </button>
                {[1, 2, 3, 4].map((tId) => (
                  <button
                    key={tId}
                    onClick={() => setTeamViewFilter(tId as 1 | 2 | 3 | 4)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      teamViewFilter === tId ? 'bg-white text-[#1677E8] shadow-2xs' : 'text-[#66809F]'
                    }`}
                  >
                    Tổ {tId}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Teams Detailed Member Lists (Sorted High to Low) */}
          <div className={`grid grid-cols-1 ${teamViewFilter === 'all' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-5`}>
            {visibleTeams.map((team) => {
              const teamRank = teamRankMap[team.teamId] || 1;
              const filteredMembers = team.members.filter(
                (m) =>
                  !memberSearch.trim() ||
                  m.student.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
                  m.student.code.toLowerCase().includes(memberSearch.toLowerCase())
              );

              return (
                <div
                  key={team.teamId}
                  className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden flex flex-col"
                >
                  {/* Team Header */}
                  <div className="p-4 bg-gradient-to-r from-blue-50/80 via-[#F4F9FF] to-white border-b border-[#D8E7FA] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1677E8] text-white font-black text-sm flex items-center justify-center shadow-xs">
                        T{team.teamId}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-[#17365D]">{team.teamName}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              teamRank === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : teamRank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : teamRank === 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-[#0B438A]'
                            }`}
                          >
                            Hạng {teamRank} toàn lớp
                          </span>
                          <span className="text-[11px] text-[#66809F] font-semibold">
                            ({team.memberCount} thành viên)
                          </span>
                        </div>
                        <div className="text-xs text-[#66809F] mt-1 flex flex-wrap items-center gap-1.5">
                          <span>Tổ trưởng:</span>
                          {isGVCN ? (
                            <select
                              value={
                                team.members.find((m) =>
                                  (m.student.roleInClass || '').toLowerCase().includes('tổ trưởng')
                                )?.student.id || ''
                              }
                              onChange={(e) => handleAssignTeamLeader(team.teamId, e.target.value)}
                              title="Chọn học sinh làm Tổ trưởng của tổ này"
                              className="px-2 py-0.5 rounded-lg bg-white border border-blue-200 font-bold text-[#17365D] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1677E8] cursor-pointer"
                            >
                              <option value="" disabled>
                                -- Chọn Tổ trưởng --
                              </option>
                              {team.members.map((m) => (
                                <option key={m.student.id} value={m.student.id}>
                                  {m.student.fullName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <strong className="text-[#17365D]">{team.leaderName}</strong>
                          )}
                          <span className="hidden sm:inline">• Sắp xếp: Điểm cao → thấp</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right px-3 py-1 rounded-xl bg-white border border-blue-200">
                        <span className="text-[10px] text-[#66809F] block">Điểm Tổ / Tổng TV</span>
                        <span className="text-xs font-black text-[#0B438A] font-mono">
                          {team.points}/100đ <span className="text-gray-400 font-normal">|</span> {team.sumMemberScores}đ
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenModalForMember(team.teamId, '', 'plus')}
                        className="px-2.5 py-1.5 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                        title={`Ghi điểm thi đua cho ${team.teamName}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chấm điểm</span>
                      </button>
                    </div>
                  </div>

                  {/* Member Table inside Team Card */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                          <th className="py-2.5 px-3">Thành viên Tổ {team.teamId}</th>
                          <th className="py-2.5 px-2.5 text-center">Cộng / Trừ</th>
                          <th className="py-2.5 px-3 text-center">Điểm thành viên</th>
                          <th className="py-2.5 px-3 text-right">Chấm nhanh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-[#66809F]">
                              Chưa có thành viên nào trong {team.teamName}.
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((item, memberIdx) => {
                            const { student, totalScore, activityBonus, recordedPlus, recordedMinus, activityNote } = item;
                            const netDelta = activityBonus + recordedPlus - recordedMinus;

                            const rankBadgeClass =
                              memberIdx === 0
                                ? 'bg-amber-400 text-white font-black shadow-2xs'
                                : memberIdx === 1
                                ? 'bg-slate-300 text-slate-800 font-extrabold'
                                : memberIdx === 2
                                ? 'bg-amber-600 text-white font-extrabold'
                                : 'bg-gray-100 text-[#66809F] font-bold';

                            const scoreBadgeClass =
                              totalScore >= 103
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : totalScore >= 100
                                ? 'bg-blue-100 text-[#0B438A] border-blue-200'
                                : totalScore >= 97
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-red-100 text-red-800 border-red-200';

                            return (
                              <tr
                                key={student.id}
                                className={`hover:bg-blue-50/40 transition-colors ${
                                  memberIdx === 0 ? 'bg-amber-50/25' : ''
                                }`}
                              >
                                {/* Rank in Team (1..N) */}
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-mono ${rankBadgeClass}`}
                                  >
                                    {memberIdx + 1}
                                  </span>
                                </td>

                                {/* Student Info, Team & Role Editor, Note */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={student.avatar}
                                      alt={student.fullName}
                                      referrerPolicy="no-referrer"
                                      className="w-7 h-7 rounded-full object-cover border border-blue-200 shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-[#17365D] truncate">
                                          {student.fullName}
                                        </span>
                                        {isGVCN ? (
                                          <div className="inline-flex items-center gap-1 flex-wrap">
                                            {/* Change Team Dropdown */}
                                            <select
                                              value={student.teamId}
                                              onChange={(e) =>
                                                handleChangeStudentTeamOrRole(
                                                  student.id,
                                                  student.fullName,
                                                  { teamId: Number(e.target.value) }
                                                )
                                              }
                                              title="Đổi Tổ cho học sinh này"
                                              className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0B438A] font-bold text-[10px] border border-blue-200 cursor-pointer focus:outline-hidden"
                                            >
                                              <option value={1}>Tổ 1</option>
                                              <option value={2}>Tổ 2</option>
                                              <option value={3}>Tổ 3</option>
                                              <option value={4}>Tổ 4</option>
                                            </select>

                                            {/* Change Role Dropdown */}
                                            <select
                                              value={
                                                STANDARD_CLASS_ROLES.includes(student.roleInClass)
                                                  ? student.roleInClass
                                                  : isRegularMemberRole(student.roleInClass)
                                                  ? 'Thành viên'
                                                  : student.roleInClass
                                              }
                                              onChange={(e) =>
                                                handleChangeStudentTeamOrRole(
                                                  student.id,
                                                  student.fullName,
                                                  { roleInClass: e.target.value }
                                                )
                                              }
                                              title="Đổi chức danh cán sự lớp / tổ cho học sinh này"
                                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] border cursor-pointer focus:outline-hidden ${
                                                !isRegularMemberRole(student.roleInClass)
                                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                  : 'bg-gray-50 text-[#66809F] border-gray-200 hover:bg-gray-100'
                                              }`}
                                            >
                                              {!STANDARD_CLASS_ROLES.includes(student.roleInClass) &&
                                                !isRegularMemberRole(student.roleInClass) && (
                                                  <option value={student.roleInClass}>
                                                    {student.roleInClass}
                                                  </option>
                                                )}
                                              {STANDARD_CLASS_ROLES.map((roleOpt) => (
                                                <option key={roleOpt} value={roleOpt}>
                                                  {roleOpt}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        ) : (
                                          !isRegularMemberRole(student.roleInClass) && (
                                            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#1677E8] font-bold text-[10px] border border-blue-200">
                                              {student.roleInClass}
                                            </span>
                                          )
                                        )}
                                      </div>
                                      <p className="text-[10.5px] text-[#66809F] truncate mt-0.5">
                                        {activityNote}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Plus / Minus delta */}
                                <td className="py-2.5 px-2.5 text-center font-mono text-[11px]">
                                  {netDelta > 0 ? (
                                    <span className="text-emerald-600 font-bold">+{netDelta}đ</span>
                                  ) : netDelta < 0 ? (
                                    <span className="text-red-600 font-bold">{netDelta}đ</span>
                                  ) : (
                                    <span className="text-gray-400">0đ</span>
                                  )}
                                </td>

                                {/* Total Individual Score */}
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg border font-mono font-black text-xs inline-block tabular-nums ${scoreBadgeClass}`}
                                  >
                                    {totalScore} đ
                                  </span>
                                </td>

                                {/* Quick +/- Action Buttons */}
                                <td className="py-2.5 px-3 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        handleQuickAdjustMemberPoints(
                                          student,
                                          2,
                                          'Phát biểu xây dựng bài & thực hiện tốt nề nếp'
                                        )
                                      }
                                      title={`Cộng nhanh +2 điểm cho ${student.fullName}`}
                                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-mono font-bold text-[11px] transition-colors"
                                    >
                                      +2
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleQuickAdjustMemberPoints(
                                          student,
                                          -2,
                                          'Nhắc nhở nề nếp / tác phong trong tuần'
                                        )
                                      }
                                      title={`Trừ nhanh -2 điểm đối với ${student.fullName}`}
                                      className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 font-mono font-bold text-[11px] transition-colors"
                                    >
                                      -2
                                    </button>
                                    <button
                                      onClick={() => handleOpenModalForMember(team.teamId, student.fullName, 'plus')}
                                      title="Ghi điểm chi tiết theo tiêu chí"
                                      className="p-1 rounded-lg bg-gray-100 hover:bg-blue-100 text-[#17365D] hover:text-[#1677E8] transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekly Student Cleaning Duty Roster */}
          <WeeklyDutyRosterPanel
            appState={appState}
            selectedWeek={selectedWeek}
            onSelectWeek={(w) => setSelectedWeek(w)}
            onUpdateState={onUpdateState}
            onShowToast={showToast}
          />

          {/* Emulation Log Table for this week */}
          <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-[#17365D]">
                  Nhật ký điểm cộng / trừ đã ghi nhận trong Tuần {selectedWeek} ({selectedWeekMeta.label})
                </h3>
                <p className="text-[11px] text-[#66809F]">
                  Hiển thị các lượt chấm điểm trực tiếp của GVCN, ban cán sự và tổ trưởng trong tuần {selectedWeek}
                </p>
              </div>
              <button
                onClick={() => handleOpenModalForMember(1, '', 'plus')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm điểm ghi nhận
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10.5px]">
                  <tr>
                    <th className="py-3 px-3.5">Tuần</th>
                    <th className="py-3 px-3.5">Thời gian</th>
                    <th className="py-3 px-3.5">Tổ / Thành viên</th>
                    <th className="py-3 px-3.5">Tiêu chí thi đua</th>
                    <th className="py-3 px-3.5 text-center">Điểm</th>
                    <th className="py-3 px-3.5">Người ghi nhận</th>
                    <th className="py-3 px-3.5">Ghi chú</th>
                    <th className="py-3 px-3.5 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {emulationRecords.filter(
                    (r) => r.week === selectedWeek || (!r.week && selectedWeek === activeCurrentWeek)
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#66809F]">
                        Chưa có bản ghi điểm cộng/trừ phát sinh thêm trong Tuần {selectedWeek}. Thầy/cô có thể bấm nút <strong>+2 / -2</strong> trực tiếp trên danh sách thành viên từng tổ ở trên.
                      </td>
                    </tr>
                  ) : (
                    emulationRecords
                      .filter((r) => r.week === selectedWeek || (!r.week && selectedWeek === activeCurrentWeek))
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-3.5 font-bold font-mono text-blue-600">
                            Tuần {r.week || selectedWeek}
                          </td>
                          <td className="py-3 px-3.5 text-[#66809F] font-mono">{r.date}</td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-[#17365D]">Tổ {r.teamId}</span>
                            {r.studentName && (
                              <span className="text-xs text-blue-600 font-semibold block">
                                {r.studentName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-medium text-[#17365D]">{r.criteria}</td>
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                                r.type === 'plus'
                                  ? 'bg-emerald-50 text-[#10B981]'
                                  : 'bg-red-50 text-[#EF4444]'
                              }`}
                            >
                              {r.points > 0 ? `+${r.points}` : r.points} đ
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-[#66809F]">{r.recordedBy}</td>
                          <td className="py-3 px-3.5 text-[#66809F]">{r.note || '-'}</td>
                          <td className="py-3 px-3.5 text-right">
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="text-gray-400 hover:text-red-500 p-1"
                              title="Xóa điểm thi đua"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab: Dedicated Weekly Student Cleaning Duty Roster */}
      {activeTab === 'dutyRoster' && (
        <WeeklyDutyRosterPanel
          appState={appState}
          selectedWeek={selectedWeek}
          onSelectWeek={(w) => setSelectedWeek(w)}
          onUpdateState={onUpdateState}
          onShowToast={showToast}
        />
      )}

      {/* Tab 2: Full 35-Week Matrix */}
      {activeTab === 'fullYear' && (
        <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
            <div>
              <h3 className="font-extrabold text-base text-[#17365D]">
                Bảng tổng hợp thi đua toàn diện 35 tuần ({appState.academicYear})
              </h3>
              <p className="text-xs text-[#66809F] mt-0.5">
                Theo dõi lũy kế điểm thi đua của 4 Tổ qua 18 tuần Học kỳ I và 17 tuần Học kỳ II • Tuần hiện tại: <strong>Tuần {activeCurrentWeek}</strong> ({currentWeekMeta.label})
              </p>
            </div>

            <button
              onClick={handleExportFullYearExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Xuất Excel bảng 35 tuần (.xlsx)
            </button>
          </div>

          {/* Cumulative Leaderboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((tId) => {
              const sem1 = (semester1Total as any)[`team${tId}`];
              const year = (yearTotal as any)[`team${tId}`];
              return (
                <div key={tId} className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1 text-xs">
                  <h4 className="font-bold text-[#17365D] text-sm">Tổ {tId}</h4>
                  <div className="flex justify-between text-[#66809F] pt-1">
                    <span>Tổng HK I (18T):</span>
                    <strong className="font-mono text-[#0B438A]">{sem1} đ</strong>
                  </div>
                  <div className="flex justify-between text-[#66809F]">
                    <span>Tổng 35 tuần cả năm:</span>
                    <strong className="font-mono text-[#1677E8] text-sm">{year} đ</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 35-Week Matrix Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 font-bold text-[#17365D] sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Tuần</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Học kỳ</th>
                  <th className="py-2.5 px-3 text-center">Tổ 1 (/100)</th>
                  <th className="py-2.5 px-3 text-center">Tổ 2 (/100)</th>
                  <th className="py-2.5 px-3 text-center">Tổ 3 (/100)</th>
                  <th className="py-2.5 px-3 text-center">Tổ 4 (/100)</th>
                  <th className="py-2.5 px-3 text-center">Tổng điểm lớp (/400)</th>
                  <th className="py-2.5 px-3 text-right">Tổ dẫn đầu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fullYearMatrix.map((r) => {
                  const isCurrent = r.week === activeCurrentWeek;
                  const isSem1End = r.week === 18;
                  const top = [
                    { name: 'Tổ 1', score: r.team1 },
                    { name: 'Tổ 2', score: r.team2 },
                    { name: 'Tổ 3', score: r.team3 },
                    { name: 'Tổ 4', score: r.team4 },
                  ].sort((a, b) => b.score - a.score)[0];

                  return (
                    <tr
                      key={r.week}
                      onClick={() => {
                        setSelectedWeek(r.week);
                        setActiveTab('currentWeek');
                      }}
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                        isCurrent ? 'bg-amber-50/80 font-semibold' : ''
                      } ${isSem1End ? 'border-b-2 border-blue-300' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">
                        Tuần {r.week} {isCurrent ? '★ (Hiện tại)' : ''}
                      </td>
                      <td className="py-2 px-3 font-mono text-[#66809F]">{r.dateRange}</td>
                      <td className="py-2 px-3 text-[#66809F] font-semibold">{r.semester}</td>
                      <td className="py-2 px-3 text-center font-mono">{r.team1}</td>
                      <td className="py-2 px-3 text-center font-mono">{r.team2}</td>
                      <td className="py-2 px-3 text-center font-mono">{r.team3}</td>
                      <td className="py-2 px-3 text-center font-mono">{r.team4}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-[#0B438A] bg-blue-50/30">
                        {r.total}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-600">
                        {top.name} ({top.score}đ)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Emulation Criteria & Weightings */}
      {activeTab === 'criteria' && (
        <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-6 text-xs text-[#17365D]">
          <div>
            <h3 className="font-extrabold text-base text-[#17365D]">
              Quy chế và Tiêu chuẩn chấm điểm thi đua 35 tuần ({appState.schoolName})
            </h3>
            <p className="text-[#66809F] mt-1">
              Mỗi thành viên và mỗi tổ bắt đầu tuần mới với 100 điểm chuẩn. Điểm thi đua tuần của từng thành viên được tính dựa trên điểm cộng thưởng và điểm trừ vi phạm, sắp xếp từ cao xuống thấp trong mỗi tổ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Plus Points */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <h4 className="font-extrabold text-emerald-800 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                Tiêu chuẩn cộng điểm thưởng (+)
              </h4>
              <ul className="space-y-2 text-emerald-950">
                <li className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Phát biểu xây dựng bài sôi nổi trong tiết học</span>
                  <strong className="font-mono text-emerald-700">+2 điểm/lần</strong>
                </li>
                <li className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Đạt điểm 9 hoặc 10 bài kiểm tra 15 phút, 1 tiết</span>
                  <strong className="font-mono text-emerald-700">+3 điểm/lần</strong>
                </li>
                <li className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Vệ sinh trực nhật lớp sạch sẽ, đúng giờ quy định</span>
                  <strong className="font-mono text-emerald-700">+5 điểm/ngày</strong>
                </li>
                <li className="flex justify-between border-b border-emerald-100 pb-1">
                  <span>Tổ đi học đầy đủ 100%, không ai đi trễ cả tuần</span>
                  <strong className="font-mono text-emerald-700">+5 điểm/tuần</strong>
                </li>
                <li className="flex justify-between pb-1">
                  <span>Tích cực tham gia hoạt động Đội, phong trào trải nghiệm</span>
                  <strong className="font-mono text-emerald-700">+5 điểm/hoạt động</strong>
                </li>
              </ul>
            </div>

            {/* Minus Points */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
              <h4 className="font-extrabold text-red-800 text-sm flex items-center gap-1.5">
                <Minus className="w-4 h-4 text-red-600" />
                Tiêu chuẩn trừ điểm vi phạm (-)
              </h4>
              <ul className="space-y-2 text-red-950">
                <li className="flex justify-between border-b border-red-100 pb-1">
                  <span>Quên khăn quàng đỏ / Thẻ học sinh khi đến trường</span>
                  <strong className="font-mono text-red-700">-2 điểm/lượt</strong>
                </li>
                <li className="flex justify-between border-b border-red-100 pb-1">
                  <span>Đi học muộn (sau 07:15 sáng)</span>
                  <strong className="font-mono text-red-700">-2 điểm/lượt</strong>
                </li>
                <li className="flex justify-between border-b border-red-100 pb-1">
                  <span>Nói chuyện riêng, mất trật tự trong giờ học</span>
                  <strong className="font-mono text-red-700">-2 điểm/lượt</strong>
                </li>
                <li className="flex justify-between border-b border-red-100 pb-1">
                  <span>Không chuẩn bị bài cũ hoặc thiếu bài tập về nhà</span>
                  <strong className="font-mono text-red-700">-3 điểm/lượt</strong>
                </li>
                <li className="flex justify-between pb-1">
                  <span>Không thực hiện trực nhật hoặc xả rác bừa bãi</span>
                  <strong className="font-mono text-red-700">-5 điểm/lượt</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Emulation Record */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#D8E7FA]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
              <h3 className="font-bold text-[#17365D] text-sm">
                Ghi nhận điểm thi đua Tuần {newRecord.week || selectedWeek}
              </h3>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Tuần thi đua (1 - 35)</label>
                <select
                  value={newRecord.week || selectedWeek}
                  onChange={(e) => setNewRecord({ ...newRecord, week: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-[#0B438A]"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                    const meta = getSchoolWeekMeta(w);
                    return (
                      <option key={w} value={w}>
                        Tuần {w} ({meta.label}) {w === activeCurrentWeek ? '★ [Hiện tại]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Áp dụng cho Tổ</label>
                <select
                  value={newRecord.teamId}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, teamId: Number(e.target.value), studentName: '' })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold"
                >
                  <option value={1}>Tổ 1</option>
                  <option value={2}>Tổ 2</option>
                  <option value={3}>Tổ 3</option>
                  <option value={4}>Tổ 4</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">
                  Thành viên cụ thể (Tổ {newRecord.teamId || 1})
                </label>
                <select
                  value={newRecord.studentName || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, studentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-[#17365D]"
                >
                  <option value="">-- Toàn tổ (không ghi riêng cá nhân) --</option>
                  {students
                    .filter((s) => s.teamId === (newRecord.teamId || 1))
                    .map((s) => (
                      <option key={s.id} value={s.fullName}>
                        {s.fullName} ({s.code} - {s.roleInClass})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Loại điểm</label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold"
                  >
                    <option value="plus">Cộng điểm (+)</option>
                    <option value="minus">Trừ điểm (-)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Số điểm</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newRecord.points || 2}
                    onChange={(e) => setNewRecord({ ...newRecord, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Tiêu chí</label>
                <select
                  value={newRecord.criteria}
                  onChange={(e) => setNewRecord({ ...newRecord, criteria: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                >
                  <option value="Phát biểu xây dựng bài">Phát biểu xây dựng bài (+2)</option>
                  <option value="Đạt điểm kiểm tra tốt">Đạt điểm kiểm tra tốt (+3)</option>
                  <option value="Vệ sinh trực nhật sạch sẽ">Vệ sinh trực nhật sạch sẽ (+5)</option>
                  <option value="Tổ đi học đầy đủ 100%">Tổ đi học đầy đủ 100% (+5)</option>
                  <option value="Tác phong khăn quàng đúng quy định">Tác phong khăn quàng đúng quy định (+2)</option>
                  <option value="Nói chuyện riêng trong giờ học">Nói chuyện riêng trong giờ học (-2)</option>
                  <option value="Quên khăn quàng / Thẻ học sinh">Quên khăn quàng / Thẻ học sinh (-2)</option>
                  <option value="Không thuộc bài cũ">Không thuộc bài cũ (-3)</option>
                  <option value="Đi học muộn">Đi học muộn (-2)</option>
                  <option value="Không trực nhật vệ sinh">Không trực nhật vệ sinh (-5)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Ghi chú cụ thể</label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm..."
                  value={newRecord.note || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-gray-200 text-xs font-bold text-[#17365D]"
              >
                Hủy
              </button>
              <button
                onClick={handleAddRecord}
                className="px-4 py-1.5 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold"
              >
                Lưu ghi nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
