import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Trophy,
  Plus,
  Minus,
  Award,
  Medal,
  Calendar,
  CheckCircle,
  AlertTriangle,
  User,
  Trash2,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  Star,
  Lock,
  Eye
} from 'lucide-react';
import { AppState, EmulationRecord, Student } from '../types';
import { hasPermission, isReadOnly, isTeacher } from '../utils/permissionUtils';

interface EmulationDisciplineProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const EmulationDiscipline: React.FC<EmulationDisciplineProps> = ({
  appState,
  onUpdateState,
}) => {
  const { emulationRecords, students, currentEmulationWeek = 2, currentUser } = appState;
  const isTeamLeader = currentUser?.role.startsWith('team_leader_');
  const userTeamId = currentUser?.teamId;

  const [selectedWeek, setSelectedWeek] = useState<number>(currentEmulationWeek);
  const [activeTab, setActiveTab] = useState<'currentWeek' | 'fullYear' | 'criteria'>('currentWeek');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

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
    date: '2026-09-11',
  });

  // Calculate scores for a specific week (base 100 points per team)
  const getTeamScoresForWeek = (weekNum: number) => {
    return [1, 2, 3, 4].map((tId) => {
      const leader =
        students.find((s) => s.teamId === tId && s.roleInClass.includes('Tổ trưởng'))?.fullName ||
        `Học sinh Tổ ${tId}`;
      const members = students.filter((s) => s.teamId === tId).length;

      // Filter records specifically for this week
      const recordsForWeek = emulationRecords.filter((r) => r.teamId === tId && (r.week === weekNum || (!r.week && weekNum === 2)));
      const delta = recordsForWeek.reduce((sum, r) => sum + r.points, 0);

      // Base preset calibration for Week 2: T1: 98, T2: 96, T3: 95, T4: 94 (Sum = 385/400)
      // Week 1: T1: 97, T2: 98, T3: 96, T4: 95 (Sum = 386/400)
      let basePreset = 100;
      if (weekNum === 2) {
        const presets: Record<number, number> = { 1: 93, 2: 91, 3: 97, 4: 90 };
        basePreset = presets[tId] || 95;
      } else if (weekNum === 1) {
        const presets: Record<number, number> = { 1: 94, 2: 95, 3: 96, 4: 95 };
        basePreset = presets[tId] || 95;
      } else {
        // Pseudo simulation based on team strength for upcoming weeks
        const pseudoVariance = ((weekNum * 7 + tId * 13) % 7) - 3;
        basePreset = 96 + pseudoVariance;
      }

      const totalPoints = Math.min(100, Math.max(0, basePreset + delta));

      return {
        teamId: tId,
        teamName: `Tổ ${tId}`,
        leaderName: leader,
        memberCount: members,
        points: totalPoints,
      };
    });
  };

  // Scores for selected week
  const selectedWeekTeamScores = useMemo(() => getTeamScoresForWeek(selectedWeek), [selectedWeek, emulationRecords, students]);
  const rankedTeams = useMemo(() => [...selectedWeekTeamScores].sort((a, b) => b.points - a.points), [selectedWeekTeamScores]);

  // Total weekly class score out of 400
  const totalClassWeeklyPoints = selectedWeekTeamScores.reduce((acc, t) => acc + t.points, 0);

  // Full year 35-week matrix
  const fullYearMatrix = useMemo(() => {
    const weeks = Array.from({ length: 35 }, (_, i) => i + 1);
    return weeks.map((w) => {
      const scores = getTeamScoresForWeek(w);
      const sem = w <= 18 ? 'HK I' : 'HK II';
      return {
        week: w,
        semester: sem,
        team1: scores.find((s) => s.teamId === 1)?.points || 0,
        team2: scores.find((s) => s.teamId === 2)?.points || 0,
        team3: scores.find((s) => s.teamId === 3)?.points || 0,
        team4: scores.find((s) => s.teamId === 4)?.points || 0,
        total: scores.reduce((sum, s) => sum + s.points, 0),
      };
    });
  }, [emulationRecords, students]);

  // Cumulative sums for Semester 1 (Weeks 1-18) and Semester 2 (Weeks 19-35)
  const semester1Total = useMemo(() => {
    const sem1Weeks = fullYearMatrix.filter((w) => w.week <= 18);
    const sumT1 = sem1Weeks.reduce((acc, w) => acc + w.team1, 0);
    const sumT2 = sem1Weeks.reduce((acc, w) => acc + w.team2, 0);
    const sumT3 = sem1Weeks.reduce((acc, w) => acc + w.team3, 0);
    const sumT4 = sem1Weeks.reduce((acc, w) => acc + w.team4, 0);
    return { team1: sumT1, team2: sumT2, team3: sumT3, team4: sumT4 };
  }, [fullYearMatrix]);

  const yearTotal = useMemo(() => {
    const sumT1 = fullYearMatrix.reduce((acc, w) => acc + w.team1, 0);
    const sumT2 = fullYearMatrix.reduce((acc, w) => acc + w.team2, 0);
    const sumT3 = fullYearMatrix.reduce((acc, w) => acc + w.team3, 0);
    const sumT4 = fullYearMatrix.reduce((acc, w) => acc + w.team4, 0);
    return { team1: sumT1, team2: sumT2, team3: sumT3, team4: sumT4 };
  }, [fullYearMatrix]);

  const canRecordAny = hasPermission(appState, 'canRecordEmulation');
  const readOnly = isReadOnly(appState);

  // Handle Add Record
  const handleAddRecord = () => {
    if (!hasPermission(appState, 'canRecordEmulation', Number(newRecord.teamId))) {
      alert('Bạn không có quyền ghi điểm thi đua cho Tổ này (chỉ xem hoặc không thuộc phạm vi phụ trách).');
      return;
    }
    if (!newRecord.criteria) return;
    const rec: EmulationRecord = {
      id: `emu-${Date.now()}`,
      week: Number(newRecord.week) || selectedWeek,
      date: newRecord.date || '2026-09-11',
      teamId: Number(newRecord.teamId) || 1,
      studentName: newRecord.studentName || undefined,
      type: newRecord.type as 'plus' | 'minus',
      points: (newRecord.type === 'plus' ? 1 : -1) * Math.abs(Number(newRecord.points) || 1),
      criteria: newRecord.criteria || '',
      note: newRecord.note || '',
      recordedBy: newRecord.recordedBy || 'GVCN',
    };

    onUpdateState((prev) => ({
      ...prev,
      emulationRecords: [rec, ...prev.emulationRecords],
    }));

    setIsLogModalOpen(false);
  };

  const handleDeleteRecord = (id: string) => {
    if (!canRecordAny) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản có thẩm quyền để xóa điểm thi đua!');
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      emulationRecords: prev.emulationRecords.filter((r) => r.id !== id),
    }));
  };

  // Export 35-week emulation matrix to Excel
  const handleExportFullYearExcel = () => {
    const headers = [
      'Tuần thi đua',
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
        r.semester,
        r.team1,
        r.team2,
        r.team3,
        r.team4,
        r.total,
        topTeam,
      ];
    });

    // Summary row
    rows.push([
      'TỔNG KẾT CẢ NĂM (35 TUẦN)',
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
      { wch: 18 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ThiDua_35Tuan');
    XLSX.writeFile(wb, `Bang_Tong_Hop_Thi_Dua_35_Tuan_Lop_${appState.className}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Top Header with 35-Week indicator */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#17365D]">
                Thi đua & Nề nếp (Kế hoạch 35 tuần năm học 2026 - 2027)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0B438A] font-bold text-[11px] font-mono">
                35 Tuần thi đua
              </span>
            </div>
            <p className="text-xs text-[#66809F] mt-0.5">
              Học kỳ I: Tuần 1 – 18 (18 tuần) • Học kỳ II: Tuần 19 – 35 (17 tuần) • Thang điểm chuẩn: 100đ/tổ/tuần (400đ/lớp)
            </p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('currentWeek')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'currentWeek' ? 'bg-white text-[#1677E8] shadow-xs' : 'text-[#66809F]'
              }`}
            >
              Chi tiết tuần
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
            onClick={() => {
              if (!canRecordAny) {
                alert('Chế độ Chỉ xem: Vui lòng đăng nhập tài khoản Giáo viên hoặc Cán sự nề nếp / Tổ trưởng để ghi điểm thi đua!');
                return;
              }
              setNewRecord({
                ...newRecord,
                week: selectedWeek,
                teamId: isTeamLeader && userTeamId ? userTeamId : 1,
                recordedBy: currentUser ? `${currentUser.name} (${currentUser.roleTitle})` : 'GVCN Trần Văn Tiến',
              });
              setIsLogModalOpen(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all shrink-0 ${
              canRecordAny
                ? 'bg-[#1677E8] hover:bg-[#0B438A] text-white shadow-blue-500/20'
                : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {!canRecordAny ? <Lock className="w-4 h-4 text-gray-400" /> : <Plus className="w-4 h-4" />}
            {isTeamLeader ? `Ghi điểm Tổ ${userTeamId}` : 'Ghi điểm thi đua'}
          </button>
        </div>
      </div>

      {/* Read-only banner */}
      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Giao diện đang ở chế độ Chỉ xem:</strong> Bạn có thể theo dõi xếp hạng thi đua 35 tuần và điểm số các tổ. Để ghi nhận điểm cộng/trừ hoặc sửa đổi kết quả, vui lòng đăng nhập tài khoản <strong>Giáo viên chủ nhiệm</strong> hoặc <strong>Ban cán sự / Tổ trưởng</strong>.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full shrink-0">
            Chỉ xem
          </span>
        </div>
      )}

      {/* Role permission info banner */}
      {!readOnly && currentUser && currentUser.role !== 'teacher' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>
              Đang nhập điểm thi đua với quyền <strong>{currentUser.roleTitle} ({currentUser.name})</strong>:
              {isTeamLeader && userTeamId
                ? ` Bạn được ủy quyền ghi nhận điểm cộng/trừ cho thành viên thuộc Tổ ${userTeamId}.`
                : ' Bạn được ủy quyền ghi nhận điểm thi đua cho cả 4 tổ.'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
            {isTeamLeader ? `Phạm vi: Tổ ${userTeamId}` : 'Phạm vi: Toàn lớp'}
          </span>
        </div>
      )}

      {/* Week Selector Bar (Only on currentWeek tab or fullYear) */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
              <optgroup label="HỌC KỲ I (18 TUẦN)">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w === 2 ? '(Tuần hiện tại)' : ''} - Tháng {w <= 4 ? '9' : w <= 8 ? '10' : w <= 13 ? '11' : w <= 17 ? '12' : '1'}
                  </option>
                ))}
              </optgroup>
              <optgroup label="HỌC KỲ II (17 TUẦN)">
                {Array.from({ length: 17 }, (_, i) => i + 19).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} - Tháng {w <= 22 ? '2' : w <= 26 ? '3' : w <= 30 ? '4' : '5'}
                  </option>
                ))}
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

          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 text-[#0B438A] ml-2">
            {selectedWeek <= 18 ? 'Học kỳ I' : 'Học kỳ II'}
          </span>

          {selectedWeek === 2 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
              ● Đang diễn ra
            </span>
          )}
        </div>

        {/* Quick jump */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setSelectedWeek(2)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedWeek === 2 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 2 (Hiện tại)
          </button>
          <button
            onClick={() => setSelectedWeek(1)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedWeek === 1 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 1
          </button>
          <button
            onClick={() => setSelectedWeek(9)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedWeek === 9 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 9 (Giữa kỳ I)
          </button>
          <button
            onClick={() => setSelectedWeek(18)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedWeek === 18 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 18 (Cuối HK I)
          </button>
          <button
            onClick={() => setSelectedWeek(35)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedWeek === 35 ? 'bg-[#1677E8] text-white' : 'bg-gray-100 text-[#66809F] hover:bg-gray-200'
            }`}
          >
            Tuần 35 (Tổng kết năm)
          </button>
        </div>
      </div>

      {/* Tab 1: Current Week Emulation Detail */}
      {activeTab === 'currentWeek' && (
        <>
          {/* Week Overview Card */}
          <div className="bg-gradient-to-r from-blue-900 via-[#0B438A] to-[#1677E8] rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Tổng kết thi đua {selectedWeek <= 18 ? 'Học kỳ I' : 'Học kỳ II'}
              </span>
              <h3 className="text-xl font-black">
                Kết quả Tuần {selectedWeek} / 35 tuần năm học 2026 - 2027
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Tổng điểm thi đua cả lớp đạt: <strong className="text-amber-300 text-sm font-mono">{totalClassWeeklyPoints}/400 điểm</strong> (Tỷ lệ hoàn thành nề nếp:{' '}
                {((totalClassWeeklyPoints / 400) * 100).toFixed(1)}%)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-center">
                <span className="text-[10.5px] text-blue-200 block">Tổ dẫn đầu Tuần {selectedWeek}</span>
                <span className="text-sm font-black text-amber-300">🏆 {rankedTeams[0]?.teamName}</span>
                <span className="text-xs font-mono font-bold block">{rankedTeams[0]?.points} điểm</span>
              </div>
            </div>
          </div>

          {/* 4 Team Cards for Selected Week */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rankedTeams.map((team, rankIndex) => {
              const medalColors = [
                'bg-amber-400 text-white shadow-xs',
                'bg-slate-300 text-slate-800 shadow-xs',
                'bg-amber-600 text-white shadow-xs',
                'bg-blue-100 text-[#0B438A]',
              ];
              const badgeTitles = ['Hạng Nhất (Vàng)', 'Hạng Nhì (Bạc)', 'Hạng Ba (Đồng)', 'Hạng Tư'];

              return (
                <div
                  key={team.teamId}
                  className={`bg-white rounded-2xl p-5 border shadow-xs transition-all hover:shadow-md relative overflow-hidden ${
                    rankIndex === 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-[#D8E7FA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${medalColors[rankIndex]}`}>
                      {rankIndex + 1}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">{badgeTitles[rankIndex]}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#17365D] mb-1">{team.teamName}</h3>
                  <p className="text-xs text-[#66809F] mb-3">
                    Tổ trưởng: <strong className="text-[#17365D]">{team.leaderName}</strong> ({team.memberCount} thành viên)
                  </p>

                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0B438A]">Điểm Tuần {selectedWeek}:</span>
                    <span className="text-xl font-black text-[#1677E8] font-mono tabular-nums">
                      {team.points}/100 đ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Emulation Log Table for this week */}
          <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-[#17365D]">
                  Nhật ký điểm cộng / trừ của Tuần {selectedWeek}
                </h3>
                <p className="text-[11px] text-[#66809F]">
                  Hiển thị các ghi nhận thực tế của ban cán sự và cờ đỏ trong tuần {selectedWeek}
                </p>
              </div>
              {canRecordAny && (
                <button
                  onClick={() => {
                    setNewRecord({ ...newRecord, week: selectedWeek });
                    setIsLogModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm điểm ghi nhận
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10.5px]">
                  <tr>
                    <th className="py-3 px-3.5">Tuần</th>
                    <th className="py-3 px-3.5">Thời gian</th>
                    <th className="py-3 px-3.5">Tổ / Học sinh</th>
                    <th className="py-3 px-3.5">Tiêu chí thi đua</th>
                    <th className="py-3 px-3.5 text-center">Điểm</th>
                    <th className="py-3 px-3.5">Người ghi nhận</th>
                    <th className="py-3 px-3.5">Ghi chú</th>
                    <th className="py-3 px-3.5 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {emulationRecords.filter((r) => r.week === selectedWeek || (!r.week && selectedWeek === 2)).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#66809F]">
                        Chưa có bản ghi điểm cộng/trừ nào trong Tuần {selectedWeek}.
                      </td>
                    </tr>
                  ) : (
                    emulationRecords
                      .filter((r) => r.week === selectedWeek || (!r.week && selectedWeek === 2))
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-3.5 font-bold font-mono text-blue-600">
                            Tuần {r.week || selectedWeek}
                          </td>
                          <td className="py-3 px-3.5 text-[#66809F] font-mono">{r.date}</td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-[#17365D]">Tổ {r.teamId}</span>
                            {r.studentName && (
                              <span className="text-xs text-blue-600 block">({r.studentName})</span>
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
                            {canRecordAny && (
                              <button
                                onClick={() => handleDeleteRecord(r.id)}
                                className="text-gray-400 hover:text-red-500 p-1"
                                title="Xóa điểm thi đua"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* Tab 2: Full 35-Week Matrix */}
      {activeTab === 'fullYear' && (
        <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
            <div>
              <h3 className="font-extrabold text-base text-[#17365D]">
                Bảng tổng hợp thi đua toàn diện 35 tuần năm học 2026 - 2027
              </h3>
              <p className="text-xs text-[#66809F] mt-0.5">
                Theo dõi lũy kế điểm thi đua của 4 Tổ qua 18 tuần Học kỳ I và 17 tuần Học kỳ II
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
                  const isCurrent = r.week === 2;
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
                        isCurrent ? 'bg-amber-50/70 font-semibold' : ''
                      } ${isSem1End ? 'border-b-2 border-blue-300' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">
                        Tuần {r.week} {isCurrent ? '★' : ''}
                      </td>
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
              Quy chế và Tiêu chuẩn chấm điểm thi đua 35 tuần (Trường TH&THCS Võ Thị Sáu)
            </h3>
            <p className="text-[#66809F] mt-1">
              Thang điểm tối đa mỗi tổ trong 1 tuần là 100 điểm. Điểm tổng kết tuần được tính dựa trên điểm cộng thưởng và điểm trừ vi phạm.
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
              <h3 className="font-bold text-[#17365D] text-sm">Ghi nhận điểm thi đua tuần {newRecord.week || selectedWeek}</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-black">✕</button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Tuần thi đua (1 - 35)</label>
                <select
                  value={newRecord.week || selectedWeek}
                  onChange={(e) => setNewRecord({ ...newRecord, week: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-[#0B438A]"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w} ({w <= 18 ? 'Học kỳ I' : 'Học kỳ II'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Áp dụng cho Tổ</label>
                {isTeamLeader && userTeamId ? (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 font-bold text-[#0B438A] flex items-center justify-between">
                    <span>Tổ {userTeamId}</span>
                    <span className="text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-medium">
                      Đã khóa theo quyền Tổ trưởng Tổ {userTeamId}
                    </span>
                  </div>
                ) : (
                  <select
                    value={newRecord.teamId}
                    onChange={(e) => setNewRecord({ ...newRecord, teamId: Number(e.target.value), studentName: '' })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold"
                  >
                    <option value={1}>Tổ 1</option>
                    <option value={2}>Tổ 2</option>
                    <option value={3}>Tổ 3</option>
                    <option value={4}>Tổ 4</option>
                  </select>
                )}
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">
                  Cá nhân học sinh ({isTeamLeader && userTeamId ? `Tổ ${userTeamId}` : `Tổ ${newRecord.teamId || 1}`})
                </label>
                <div className="space-y-1.5">
                  <select
                    value={newRecord.studentName || ''}
                    onChange={(e) => setNewRecord({ ...newRecord, studentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="">-- Toàn tổ (không ghi cho riêng cá nhân) --</option>
                    {students
                      .filter((s) => s.teamId === (isTeamLeader && userTeamId ? userTeamId : (newRecord.teamId || 1)))
                      .map((s) => (
                        <option key={s.id} value={s.fullName}>
                          {s.fullName} ({s.code} - {s.roleInClass})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Loại điểm</label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
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
                    max="10"
                    value={newRecord.points || 2}
                    onChange={(e) => setNewRecord({ ...newRecord, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono"
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
              <button onClick={() => setIsLogModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-xs font-bold">Hủy</button>
              <button onClick={handleAddRecord} className="px-4 py-1.5 rounded-lg bg-[#1677E8] text-white text-xs font-bold">Lưu ghi nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
