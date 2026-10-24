import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlarmClock,
  ChevronRight,
  Sun,
  Bot,
  UserPlus,
  ClipboardList,
  FileText,
  Sparkles,
  Download,
  Calendar,
  Volume2,
  BookOpen,
  Lock,
  Eye
} from 'lucide-react';
import { AppState, NavPage, Task } from '../types';
import { isReadOnly, isTeacher, hasPermission } from '../utils/permissionUtils';
import { getCurrentSchoolWeekInfo } from '../utils/dateWeekUtils';

interface DashboardOverviewProps {
  appState: AppState;
  onNavigate: (page: NavPage) => void;
  onToggleTask: (taskId: string) => void;
  onOpenQuickAction: (actionType: 'invite' | 'plan' | 'report' | 'comment' | 'export') => void;
  onSelectStudent: (studentId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  appState,
  onNavigate,
  onToggleTask,
  onOpenQuickAction,
  onSelectStudent,
}) => {
  const { students, attendanceHistory, todayDate, tasks, notices, currentUser } = appState;
  const latestWeekInfo = getCurrentSchoolWeekInfo();
  const activeCurrentWeek =
    appState.currentEmulationWeek && appState.currentEmulationWeek !== 2
      ? appState.currentEmulationWeek
      : latestWeekInfo.currentWeek;
  const readOnly = isReadOnly(appState);
  const isGVCN = isTeacher(appState);
  const canToggle = hasPermission(appState, 'canToggleTasks');

  // Calculate live stats from today's attendance
  const todayRecord = attendanceHistory[todayDate] || {
    summary: { total: students.length, present: 0, excused: 0, unexcused: 0, late: 0 },
    records: {},
  };

  const totalStudents = students.length || 38;
  const maleCount = students.filter((s) => s.gender === 'Nam').length;
  const femaleCount = students.filter((s) => s.gender === 'Nữ').length;

  const presentCount = todayRecord.summary.present;
  const excusedCount = todayRecord.summary.excused;
  const unexcusedCount = todayRecord.summary.unexcused;
  const lateCount = todayRecord.summary.late;

  const presentPct = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';
  const excusedPct = totalStudents > 0 ? ((excusedCount / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';
  const unexcusedPct = totalStudents > 0 ? ((unexcusedCount / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';
  const latePct = totalStudents > 0 ? ((lateCount / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';

  // Academic breakdown (Thông tư 22/2021/TT-BGDĐT)
  const rankGood = students.filter((s) => s.academicRank === 'Tốt' || s.academicRank === 'Giỏi').length;
  const rankFair = students.filter((s) => s.academicRank === 'Khá').length;
  const rankAverage = students.filter((s) => s.academicRank === 'Đạt' || s.academicRank === 'Trung bình').length;
  const rankWeak = students.filter((s) => s.academicRank === 'Chưa đạt' || s.academicRank === 'Yếu').length;
  const countExcellentAward = students.filter((s) => s.awardTitle === 'Học sinh Xuất sắc').length;
  const countGoodAward = students.filter((s) => s.awardTitle === 'Học sinh Giỏi').length;

  const rankGoodPct = totalStudents > 0 ? ((rankGood / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';
  const rankFairPct = totalStudents > 0 ? ((rankFair / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';
  const rankAvgPct = totalStudents > 0 ? ((rankAverage / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';
  const rankWeakPct = totalStudents > 0 ? ((rankWeak / totalStudents) * 100).toFixed(1).replace('.', ',') : '0';

  // Weekly attendance data
  const weekDays = [
    { label: 'Thứ 2 (08/09)', key: '2026-09-08' },
    { label: 'Thứ 3 (09/09)', key: '2026-09-09' },
    { label: 'Thứ 4 (10/09)', key: '2026-09-10' },
    { label: 'Thứ 5 (11/09)', key: '2026-09-11' },
    { label: 'Thứ 6 (12/09)', key: '2026-09-12' },
  ];

  // Top 5 exemplary students
  const topStudents = students.slice(0, 5);

  return (
    <div className="space-y-5 pb-8">
      {/* 1. Welcome Banner */}
      <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="z-10 space-y-2 max-w-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-xs">
              <Sun className="w-5 h-5 animate-spin-slow" />
            </div>
            <h1 className="text-xl lg:text-2xl font-extrabold text-[#17365D] tracking-tight">
              {readOnly ? (
                `Cổng Thông Tin Lớp ${appState.className} (Chế độ xem)`
              ) : isGVCN ? (
                `Chào mừng thầy ${appState.teacherName}!`
              ) : (
                `Xin chào ${currentUser?.name} (${currentUser?.roleTitle})!`
              )}
            </h1>
          </div>
          <p className="text-sm text-[#66809F] font-medium leading-relaxed">
            {readOnly ? (
              <span>
                Hệ thống đang hiển thị ở <strong>chế độ Chỉ xem</strong>. Phụ huynh, học sinh và khách có thể theo dõi dữ liệu lớp. Để nhập hoặc chỉnh sửa, vui lòng đăng nhập tài khoản Giáo viên hoặc Cán sự lớp.
              </span>
            ) : isGVCN ? (
              `Chúc thầy một ngày làm việc hiệu quả. ${appState.className} luôn là tập thể đoàn kết, tiến bộ!`
            ) : (
              `Bạn đang làm việc với các quyền hạn được Giáo viên chủ nhiệm ủy quyền theo dõi nề nếp và học tập của lớp.`
            )}
          </p>
        </div>

        {/* UNESCO Quote Banner with School Artwork */}
        <div className="relative z-10 w-full md:w-auto shrink-0 flex items-center gap-4 bg-gradient-to-r from-blue-50/80 to-[#EDF5FF] border border-[#CDE2FC] rounded-xl p-3.5 pr-5">
          <div className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0 border border-blue-200 overflow-hidden shadow-xs flex items-center justify-center bg-blue-100">
            <img
              src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80"
              alt="Khuôn viên trường học"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-[#0B438A] leading-snug">
              &ldquo;Học để biết - Học để làm<br />
              Học để chung sống<br />
              Học để tự khẳng định mình&rdquo;
            </p>
            <span className="text-[11px] font-semibold text-[#1677E8] block mt-0.5">
              — UNESCO —
            </span>
          </div>
        </div>

        {/* Background light glow */}
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 2. Top 5 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Stat 1: Total Students */}
        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-[#1677E8] flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Tổng số học sinh</p>
            <h3 className="text-2xl font-black text-[#17365D] tracking-tight">{totalStudents}</h3>
            <p className="text-[11px] text-[#66809F] font-medium">
              (Nam: {maleCount} - Nữ: {femaleCount})
            </p>
          </div>
        </div>

        {/* Stat 2: Present Today */}
        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-[#10B981] flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Đi học đầy đủ</p>
            <h3 className="text-2xl font-black text-[#17365D] tracking-tight">{presentCount}</h3>
            <p className="text-[11px] text-[#10B981] font-bold">{presentPct}%</p>
          </div>
        </div>

        {/* Stat 3: Excused */}
        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B] flex items-center justify-center text-white shrink-0 shadow-sm shadow-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Nghỉ phép</p>
            <h3 className="text-2xl font-black text-[#17365D] tracking-tight">{excusedCount}</h3>
            <p className="text-[11px] text-[#F59E0B] font-bold">{excusedPct}%</p>
          </div>
        </div>

        {/* Stat 4: Unexcused */}
        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center text-white shrink-0 shadow-sm shadow-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Nghỉ không phép</p>
            <h3 className="text-2xl font-black text-[#17365D] tracking-tight">{unexcusedCount}</h3>
            <p className="text-[11px] text-[#EF4444] font-bold">{unexcusedPct}%</p>
          </div>
        </div>

        {/* Stat 5: Late */}
        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5 col-span-2 sm:col-span-1 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shrink-0 shadow-sm shadow-purple-500/20">
            <AlarmClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Đi trễ</p>
            <h3 className="text-2xl font-black text-[#17365D] tracking-tight">{lateCount}</h3>
            <p className="text-[11px] text-[#8B5CF6] font-bold">{latePct}%</p>
          </div>
        </div>
      </div>

      {/* 3. Middle 3-Column Visual Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Weekly Attendance Bar Chart */}
        <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1677E8]" />
              <h3 className="text-sm font-bold text-[#17365D]">Tình hình chuyên cần tuần này</h3>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#1677E8] hover:text-[#073B82] flex items-center gap-0.5"
            >
              Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 py-3 text-[11px] font-medium text-[#66809F]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1677E8]"></span> Đi học
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Nghỉ phép
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> Nghỉ không phép
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span> Đi trễ
            </span>
          </div>

          {/* Crisp Custom SVG Bar Chart */}
          <div className="pt-2">
            <div className="h-44 w-full flex items-end justify-between gap-2 px-2 border-b border-gray-200 pb-1">
              {weekDays.map((d) => {
                const dayRecord = attendanceHistory[d.key]?.summary || {
                  total: 38,
                  present: 35,
                  excused: 2,
                  unexcused: 1,
                  late: 0,
                };
                const max = 40;
                const pHeight = Math.round((dayRecord.present / max) * 130);
                const eHeight = Math.max(4, Math.round((dayRecord.excused / max) * 130));
                const uHeight = Math.max(4, Math.round((dayRecord.unexcused / max) * 130));
                const lHeight = Math.max(4, Math.round((dayRecord.late / max) * 130));

                return (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex items-end justify-center gap-1 h-36">
                      {/* Present Bar */}
                      <div
                        style={{ height: `${pHeight}px` }}
                        className="w-3 rounded-t-sm bg-[#1677E8] transition-all group-hover:brightness-110"
                        title={`Có mặt: ${dayRecord.present}`}
                      ></div>
                      {/* Excused Bar */}
                      {dayRecord.excused > 0 && (
                        <div
                          style={{ height: `${eHeight}px` }}
                          className="w-2.5 rounded-t-sm bg-[#10B981]"
                          title={`Nghỉ phép: ${dayRecord.excused}`}
                        ></div>
                      )}
                      {/* Unexcused Bar */}
                      {dayRecord.unexcused > 0 && (
                        <div
                          style={{ height: `${uHeight}px` }}
                          className="w-2.5 rounded-t-sm bg-[#F59E0B]"
                          title={`Không phép: ${dayRecord.unexcused}`}
                        ></div>
                      )}
                      {/* Late Bar */}
                      {dayRecord.late > 0 && (
                        <div
                          style={{ height: `${lHeight}px` }}
                          className="w-2.5 rounded-t-sm bg-[#8B5CF6]"
                          title={`Đi trễ: ${dayRecord.late}`}
                        ></div>
                      )}
                    </div>
                    <span className="text-[10.5px] font-medium text-[#66809F] text-center leading-tight whitespace-nowrap">
                      {d.label.split(' ')[0]}<br />
                      <span className="text-[9.5px] text-gray-400">{d.label.split(' ')[1]}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 px-1 pt-1 font-mono">
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>
        </div>

        {/* Card 2: Academic Results Doughnut Chart */}
        <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1677E8]" />
              <h3 className="text-sm font-bold text-[#17365D]">Kết quả học tập</h3>
            </div>
            <button
              onClick={() => onNavigate('academics')}
              className="text-xs font-semibold text-[#1677E8] hover:text-[#073B82] flex items-center gap-0.5"
            >
              Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 py-4">
            {/* SVG Doughnut */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#EBF3FD" strokeWidth="14" />
                {/* Segment 1: Giỏi (green 39.5%) -> 38 * 2 * PI = 238.76. Giỏi = 0.395 * 238.76 = 94.3 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="14"
                  strokeDasharray="94.3 238.76"
                  strokeDashoffset="0"
                />
                {/* Segment 2: Khá (blue 47.4%) -> 0.474 * 238.76 = 113.1 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#1677E8"
                  strokeWidth="14"
                  strokeDasharray="113.1 238.76"
                  strokeDashoffset="-94.3"
                />
                {/* Segment 3: Trung bình (amber 10.5%) -> 0.105 * 238.76 = 25 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="14"
                  strokeDasharray="25 238.76"
                  strokeDashoffset="-207.4"
                />
                {/* Segment 4: Yếu (red 2.6%) -> 0.026 * 238.76 = 6.2 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#EF4444"
                  strokeWidth="14"
                  strokeDasharray="6.2 238.76"
                  strokeDashoffset="-232.4"
                />
              </svg>
              {/* Center Doughnut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[11px] font-semibold text-[#66809F]">Học lực</span>
                <span className="text-sm font-extrabold text-[#17365D]">9A2</span>
              </div>
            </div>

            {/* Doughnut Legend (Thông tư 22) */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 font-medium text-[#17365D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Mức Tốt
                </span>
                <span className="font-bold text-[#17365D] font-mono tabular-nums">
                  {rankGood} <span className="text-gray-400 font-normal">({rankGoodPct}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 font-medium text-[#17365D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1677E8]"></span> Mức Khá
                </span>
                <span className="font-bold text-[#17365D] font-mono tabular-nums">
                  {rankFair} <span className="text-gray-400 font-normal">({rankFairPct}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 font-medium text-[#17365D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> Mức Đạt
                </span>
                <span className="font-bold text-[#17365D] font-mono tabular-nums">
                  {rankAverage} <span className="text-gray-400 font-normal">({rankAvgPct}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 font-medium text-[#17365D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Chưa đạt
                </span>
                <span className="font-bold text-[#17365D] font-mono tabular-nums">
                  {rankWeak} <span className="text-gray-400 font-normal">({rankWeakPct}%)</span>
                </span>
              </div>
              
              {/* Award summary badge */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <span className="text-[#66809F]">Khen thưởng:</span>
                <span className="font-bold text-amber-700">
                  {countExcellentAward} Xuất sắc • {countGoodAward} Giỏi
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Emulation / Team Standings */}
        <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">🏆</span>
              <h3 className="text-sm font-bold text-[#17365D]">Thi đua - Nề nếp</h3>
              <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-blue-100 text-[#0B438A] font-bold font-mono">
                Tuần {activeCurrentWeek}/35
              </span>
            </div>
            <button
              onClick={() => onNavigate('emulation')}
              className="text-xs font-semibold text-[#1677E8] hover:text-[#073B82] flex items-center gap-0.5"
            >
              Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center py-2">
            {/* Radial score gauge */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#E2EFFF" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#0284C7"
                  strokeWidth="10"
                  strokeDasharray="230 238"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#66809F] font-medium">Tuần {activeCurrentWeek}/35</span>
                <span className="text-sm font-extrabold text-[#0B438A] font-mono">385/400</span>
              </div>
            </div>

            {/* Quick breakdown stats */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[#10B981] font-semibold text-[11.5px]">
                <span>↑</span> Tổng điểm thi đua
              </div>
              <div className="text-[11.5px] text-[#17365D]">
                <span className="w-2 h-2 inline-block rounded-full bg-[#10B981] mr-1"></span>
                Khá: 18 <span className="text-gray-400">(47,4%)</span>
              </div>
              <div className="text-[11.5px] text-[#17365D]">
                <span className="w-2 h-2 inline-block rounded-full bg-[#F59E0B] mr-1"></span>
                Trung bình: 4 <span className="text-gray-400">(10,5%)</span>
              </div>
              <div className="text-[11.5px] text-[#17365D]">
                <span className="w-2 h-2 inline-block rounded-full bg-[#EF4444] mr-1"></span>
                Yếu: 1 <span className="text-gray-400">(2,6%)</span>
              </div>
            </div>
          </div>

          {/* Team rankings 1 to 4 */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[11px] font-bold text-[#66809F] uppercase tracking-wider mb-1.5">
              Xếp hạng tổ
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <span className="flex items-center gap-1.5 font-bold text-[#17365D]">
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  Tổ 1
                </span>
                <span className="font-bold text-amber-700 font-mono">98 điểm</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-1.5 font-bold text-[#17365D]">
                  <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">2</span>
                  Tổ 2
                </span>
                <span className="font-bold text-slate-700 font-mono">96 điểm</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/40 border border-amber-100/60">
                <span className="flex items-center gap-1.5 font-bold text-[#17365D]">
                  <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  Tổ 3
                </span>
                <span className="font-bold text-amber-900 font-mono">95 điểm</span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="flex items-center gap-1.5 font-bold text-[#17365D]">
                  <span className="w-4 h-4 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-[10px] font-bold">4</span>
                  Tổ 4
                </span>
                <span className="font-bold text-gray-700 font-mono">94 điểm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lower Two-Column Grid + Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card: Exemplary Students Table */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 font-bold">★</span>
                <h3 className="text-sm font-bold text-[#17365D]">Danh sách học sinh tiêu biểu</h3>
              </div>
              <button
                onClick={() => onNavigate('students')}
                className="text-xs font-semibold text-[#1677E8] hover:text-[#073B82] flex items-center gap-0.5"
              >
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs mt-2">
                <thead>
                  <tr className="border-b border-gray-100 text-[#66809F] font-semibold">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Ngày sinh</th>
                    <th className="py-2.5 px-3">Học lực</th>
                    <th className="py-2.5 px-3">Hạnh kiểm</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topStudents.map((s, idx) => (
                    <tr
                      key={s.id}
                      onClick={() => onSelectStudent(s.id)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-semibold text-[#66809F]">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
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
                      <td className="py-2.5 px-3 text-[#66809F] font-mono">{s.dateOfBirth}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            s.academicRank === 'Giỏi' ? 'text-[#10B981]' : 'text-[#1677E8]'
                          }`}
                        >
                          {s.academicRank}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#10B981]">
                        {s.conductRank}
                      </td>
                      <td className="py-2.5 px-3 text-[#66809F] truncate max-w-[160px]">
                        {s.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 text-right">
              <button
                onClick={() => onNavigate('students')}
                className="text-xs font-semibold text-[#1677E8] hover:underline"
              >
                Xem toàn bộ danh sách →
              </button>
            </div>
          </div>

          {/* Card: Tasks To-Do */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1677E8]" />
                <h3 className="text-sm font-bold text-[#17365D]">Công việc cần làm</h3>
              </div>
              <button
                onClick={() => onNavigate('plans')}
                className="text-xs font-semibold text-[#1677E8] hover:text-[#073B82] flex items-center gap-0.5"
              >
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gray-100 mt-2">
              {tasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    if (!canToggle) {
                      alert('Chế độ Chỉ xem: Hãy đăng nhập tài khoản có thẩm quyền để cập nhật trạng thái công việc!');
                      return;
                    }
                    onToggleTask(t.id);
                  }}
                  className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-blue-50/40 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      disabled={!canToggle}
                      onChange={() => {
                        if (!canToggle) return;
                        onToggleTask(t.id);
                      }}
                      className="w-4 h-4 rounded text-[#1677E8] focus:ring-[#1677E8] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span
                      className={`text-xs font-medium ${
                        t.completed
                          ? 'line-through text-gray-400'
                          : 'text-[#17365D] group-hover:text-[#1677E8]'
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                        t.priority === 'Quan trọng'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-[11px] text-[#66809F] font-mono tabular-nums">
                      {t.dueDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-5">
          {/* Card: New Notifications */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#1677E8]" />
                <h3 className="text-sm font-bold text-[#17365D]">Thông báo mới</h3>
              </div>
              <button
                onClick={() => onNavigate('parents')}
                className="text-xs font-semibold text-[#1677E8] hover:text-[#073B82] flex items-center gap-0.5"
              >
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gray-100 mt-2">
              {notices.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onNavigate('parents')}
                  className="py-3 flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 p-2 rounded-xl transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1677E8] shrink-0 mt-0.5">
                    {n.iconType === 'megaphone' && <Volume2 className="w-4 h-4" />}
                    {n.iconType === 'calendar' && <Calendar className="w-4 h-4" />}
                    {n.iconType === 'users' && <Users className="w-4 h-4" />}
                    {n.iconType === 'document' && <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#17365D] group-hover:text-[#1677E8] truncate">
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-[#66809F] mt-0.5 leading-snug">
                      {n.timeInfo}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {n.relativeTime}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1677E8] shrink-0 mt-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Card: AI Assistant Prompt Box */}
          <div className="bg-gradient-to-br from-[#1677E8] to-[#0A438C] rounded-2xl p-5 text-white shadow-md shadow-blue-500/10 relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Trợ lý AI GVCN</h3>
                <p className="text-[11px] text-blue-100">
                  Hỗ trợ soạn thảo, tổng hợp và phân tích dữ liệu lớp
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-xs text-blue-50 mb-3.5 space-y-1.5">
              <p className="font-semibold text-white">Thầy cần hỗ trợ gì hôm nay?</p>
              <p className="text-[11.5px] text-blue-100/90 leading-relaxed">
                Ví dụ: soạn thư mời họp phụ huynh, tổng hợp tình hình lớp, viết nhận xét học sinh...
              </p>
            </div>

            <button
              onClick={() => onNavigate('ai')}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-[#0B438A] hover:bg-blue-50 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#1677E8]" />
              Bắt đầu trò chuyện
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-2">
        <button
          onClick={() => onOpenQuickAction('invite')}
          className="bg-white rounded-xl p-3.5 border border-[#D8E7FA] shadow-xs hover:border-[#1677E8] hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 group-hover:bg-[#1677E8] group-hover:text-white transition-colors">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#17365D]">Tạo thư mời</h4>
              <p className="text-[11px] text-[#66809F]">Dành cho phụ huynh</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1677E8] shrink-0" />
        </button>

        <button
          onClick={() => onOpenQuickAction('plan')}
          className="bg-white rounded-xl p-3.5 border border-[#D8E7FA] shadow-xs hover:border-[#1677E8] hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 group-hover:bg-[#1677E8] group-hover:text-white transition-colors">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#17365D]">Tạo kế hoạch</h4>
              <p className="text-[11px] text-[#66809F]">Chủ nhiệm lớp</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1677E8] shrink-0" />
        </button>

        <button
          onClick={() => onOpenQuickAction('report')}
          className="bg-white rounded-xl p-3.5 border border-[#D8E7FA] shadow-xs hover:border-[#1677E8] hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 group-hover:bg-[#1677E8] group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#17365D]">Tạo báo cáo</h4>
              <p className="text-[11px] text-[#66809F]">Theo mẫu có sẵn</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1677E8] shrink-0" />
        </button>

        <button
          onClick={() => onOpenQuickAction('comment')}
          className="bg-white rounded-xl p-3.5 border border-[#D8E7FA] shadow-xs hover:border-[#1677E8] hover:shadow-md transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 group-hover:bg-[#1677E8] group-hover:text-white transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#17365D]">Tạo nhận xét</h4>
              <p className="text-[11px] text-[#66809F]">Bằng AI</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1677E8] shrink-0" />
        </button>

        <button
          onClick={() => onOpenQuickAction('export')}
          className="bg-white rounded-xl p-3.5 border border-[#D8E7FA] shadow-xs hover:border-[#1677E8] hover:shadow-md transition-all flex items-center justify-between text-left col-span-2 sm:col-span-1 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 group-hover:bg-[#1677E8] group-hover:text-white transition-colors">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#17365D]">Xuất dữ liệu</h4>
              <p className="text-[11px] text-[#66809F]">Word / Excel / PDF</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1677E8] shrink-0" />
        </button>
      </div>
    </div>
  );
};
