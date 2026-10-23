import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlarmClock,
  Save,
  Download,
  Search,
  Filter,
  Check,
  RotateCcw,
  Lock,
  Eye
} from 'lucide-react';
import { AppState, AttendanceStatus, StudentAttendanceDetail } from '../types';
import { hasPermission, isReadOnly, isTeacher } from '../utils/permissionUtils';

interface AttendanceManagerProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  appState,
  onUpdateState,
}) => {
  const { students, attendanceHistory, todayDate, currentUser } = appState;
  const isTeamLeader = currentUser?.role.startsWith('team_leader_');
  const userTeamId = currentUser?.teamId;

  const [selectedDate, setSelectedDate] = useState(todayDate || '2026-09-11');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | number>(userTeamId || 'all');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Current working day record
  const currentDayRecord = attendanceHistory[selectedDate] || {
    date: selectedDate,
    records: students.reduce((acc, s) => {
      acc[s.id] = { status: 'present' };
      return acc;
    }, {} as Record<string, StudentAttendanceDetail>),
    summary: { total: students.length, present: students.length, excused: 0, unexcused: 0, late: 0 },
  };

  const [localRecords, setLocalRecords] = useState<Record<string, StudentAttendanceDetail>>(
    currentDayRecord.records || {}
  );

  // Sync if selectedDate changes
  React.useEffect(() => {
    const rec = attendanceHistory[selectedDate]?.records;
    if (rec) {
      setLocalRecords(rec);
    } else {
      // Default to all present
      const def: Record<string, StudentAttendanceDetail> = {};
      students.forEach((s) => {
        def[s.id] = { status: 'present' };
      });
      setLocalRecords(def);
    }
  }, [selectedDate, attendanceHistory, students]);

  // Recalculate summary
  const summary = React.useMemo(() => {
    let present = 0;
    let excused = 0;
    let unexcused = 0;
    let late = 0;

    students.forEach((s) => {
      const st = localRecords[s.id]?.status || 'present';
      if (st === 'present') present++;
      else if (st === 'excused') excused++;
      else if (st === 'unexcused') unexcused++;
      else if (st === 'late') late++;
    });

    return { total: students.length, present, excused, unexcused, late };
  }, [students, localRecords]);

  const canTakeAttendanceAny = hasPermission(appState, 'canTakeAttendance');
  const readOnly = isReadOnly(appState);

  // Update single student
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    const student = students.find((s) => s.id === studentId);
    if (!hasPermission(appState, 'canTakeAttendance', student?.teamId)) {
      alert('Bạn không có quyền điểm danh cho học sinh này (chỉ xem hoặc không thuộc phạm vi phụ trách).');
      return;
    }

    setLocalRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        status,
        reason: status === 'present' ? '' : prev[studentId]?.reason || '',
        timeArrived: status === 'late' ? prev[studentId]?.timeArrived || '07:30' : undefined,
      },
    }));
  };

  const handleSetReason = (studentId: string, reason: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!hasPermission(appState, 'canTakeAttendance', student?.teamId)) return;

    setLocalRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'excused' }),
        reason,
      },
    }));
  };

  const handleSetTime = (studentId: string, time: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!hasPermission(appState, 'canTakeAttendance', student?.teamId)) return;

    setLocalRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'late' }),
        timeArrived: time,
      },
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    if (!canTakeAttendanceAny) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản có thẩm quyền điểm danh!');
      return;
    }
    const updated: Record<string, StudentAttendanceDetail> = {};
    students.forEach((s) => {
      updated[s.id] = { status: 'present' };
    });
    setLocalRecords(updated);
  };

  // Save to state
  const handleSaveAttendance = () => {
    if (!canTakeAttendanceAny) {
      alert('Hệ thống đang ở chế độ Chỉ xem. Vui lòng đăng nhập tài khoản có thẩm quyền để lưu điểm danh!');
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      attendanceHistory: {
        ...prev.attendanceHistory,
        [selectedDate]: {
          date: selectedDate,
          records: localRecords,
          summary,
        },
      },
      // If saving for today, also update todayDate
      todayDate: selectedDate,
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const currentStatus = localRecords[s.id]?.status || 'present';
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
    const matchesTeam = teamFilter === 'all' || s.teamId === teamFilter;
    return matchesSearch && matchesStatus && matchesTeam;
  });

  const handleMarkTeamPresent = (tId: number) => {
    const updated = { ...localRecords };
    students.filter((s) => s.teamId === tId).forEach((s) => {
      updated[s.id] = { status: 'present' };
    });
    setLocalRecords(updated);
  };

  return (
    <div className="space-y-5">
      {/* Date selector & quick controls header */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#17365D]">Điểm danh & Chuyên cần</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#66809F]">Ngày điểm danh:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[#D8E7FA] font-bold text-[#0B438A] bg-blue-50/50"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isTeamLeader && userTeamId && (
            <button
              onClick={() => handleMarkTeamPresent(userTeamId)}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-[#1677E8] flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-[#1677E8]" />
              Cả Tổ {userTeamId} có mặt
            </button>
          )}

          <button
            onClick={handleMarkAllPresent}
            disabled={!canTakeAttendanceAny}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              canTakeAttendanceAny
                ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#17365D]'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            {!canTakeAttendanceAny ? <Lock className="w-3.5 h-3.5 text-gray-400" /> : <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
            Đánh dấu tất cả có mặt
          </button>

          <button
            onClick={handleSaveAttendance}
            disabled={!canTakeAttendanceAny}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
              canTakeAttendanceAny
                ? 'bg-[#1677E8] hover:bg-[#0B438A] shadow-blue-500/20'
                : 'bg-gray-400 opacity-60 cursor-not-allowed'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                Đã lưu thành công!
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

      {/* View-Only Banner */}
      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Giao diện đang ở chế độ Chỉ xem:</strong> Khách truy cập có thể theo dõi tỷ lệ chuyên cần và danh sách sĩ số. Để thực hiện điểm danh hoặc lưu thay đổi, vui lòng đăng nhập tài khoản <strong>Giáo viên chủ nhiệm</strong> hoặc <strong>Cán sự nề nếp / Tổ trưởng</strong>.
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
                ? ` Bạn phụ trách theo dõi chuyên cần đầu giờ cho ${students.filter((s) => s.teamId === userTeamId).length} học sinh Tổ ${userTeamId}.`
                : ' Bạn phụ trách theo dõi chuyên cần và tổng hợp báo cáo sĩ số toàn lớp.'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full shrink-0">
            {isTeamLeader ? `Phạm vi: Tổ ${userTeamId}` : 'Phạm vi: Toàn lớp'}
          </span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-white shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F]">Có mặt hôm nay</p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">
              {summary.present}/{summary.total}
            </h3>
            <p className="text-[10.5px] font-bold text-[#10B981]">
              {((summary.present / summary.total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center text-white shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F]">Nghỉ có phép</p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">{summary.excused}</h3>
            <p className="text-[10.5px] font-bold text-[#F59E0B]">
              {((summary.excused / summary.total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EF4444] flex items-center justify-center text-white shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F]">Nghỉ không phép</p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">{summary.unexcused}</h3>
            <p className="text-[10.5px] font-bold text-[#EF4444]">
              {((summary.unexcused / summary.total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shrink-0">
            <AlarmClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-[#66809F]">Đi trễ</p>
            <h3 className="text-xl font-black text-[#17365D] font-mono tabular-nums">{summary.late}</h3>
            <p className="text-[10.5px] font-bold text-[#8B5CF6]">
              {((summary.late / summary.total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Student Checklist Table */}
      <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#D8E7FA] focus:outline-hidden focus:ring-2 focus:ring-[#1677E8]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto text-xs">
            {/* Team filter chips */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
              <span className="text-[11px] font-bold text-[#66809F] mr-1 hidden md:inline">Lọc theo:</span>
              <button
                onClick={() => setTeamFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
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
                  onClick={() => setTeamFilter(tId)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                    teamFilter === tId
                      ? 'bg-[#1677E8] text-white shadow-2xs'
                      : userTeamId === tId
                      ? 'bg-blue-100 text-[#0B438A] border border-blue-300 font-extrabold'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={userTeamId === tId ? 'Tổ bạn phụ trách' : `Tổ ${tId}`}
                >
                  Tổ {tId} {userTeamId === tId ? '(Của tôi)' : ''}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-50 text-[#1677E8]'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Tất cả ({students.length})
            </button>
            <button
              onClick={() => setStatusFilter('present')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'present'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Có mặt ({summary.present})
            </button>
            <button
              onClick={() => setStatusFilter('excused')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'excused'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Có phép ({summary.excused})
            </button>
            <button
              onClick={() => setStatusFilter('unexcused')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'unexcused'
                  ? 'bg-red-50 text-red-700'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Không phép ({summary.unexcused})
            </button>
            <button
              onClick={() => setStatusFilter('late')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === 'late'
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-[#66809F] hover:bg-gray-100'
              }`}
            >
              Đi trễ ({summary.late})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10.5px]">
              <tr>
                <th className="py-3 px-3.5">STT</th>
                <th className="py-3 px-3.5">Học sinh</th>
                <th className="py-3 px-3.5">Tổ</th>
                <th className="py-3 px-3.5 text-center">Trạng thái điểm danh</th>
                <th className="py-3 px-3.5">Lý do nghỉ / Giờ đến</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.map((s, idx) => {
                const current = localRecords[s.id] || { status: 'present' };
                const canTakeThisStudent = hasPermission(appState, 'canTakeAttendance', s.teamId);
                return (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5 px-3.5 text-[#66809F] font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={s.avatar}
                          alt={s.fullName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <span className="font-bold text-[#17365D] block">{s.fullName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{s.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#66809F]">Tổ {s.teamId}</td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className={`inline-flex items-center p-1 bg-gray-100/80 rounded-xl gap-1 ${!canTakeThisStudent ? 'cursor-not-allowed opacity-85' : ''}`}>
                        <button
                          onClick={() => handleSetStatus(s.id, 'present')}
                          disabled={!canTakeThisStudent}
                          title={!canTakeThisStudent ? "Chỉ xem (Cần đăng nhập GVCN hoặc cán sự có quyền)" : undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            current.status === 'present'
                              ? 'bg-[#10B981] text-white shadow-xs'
                              : 'text-gray-600 hover:text-black'
                          } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
                        >
                          Có mặt
                        </button>
                        <button
                          onClick={() => handleSetStatus(s.id, 'excused')}
                          disabled={!canTakeThisStudent}
                          title={!canTakeThisStudent ? "Chỉ xem (Cần đăng nhập GVCN hoặc cán sự có quyền)" : undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            current.status === 'excused'
                              ? 'bg-[#F59E0B] text-white shadow-xs'
                              : 'text-gray-600 hover:text-black'
                          } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
                        >
                          Nghỉ phép
                        </button>
                        <button
                          onClick={() => handleSetStatus(s.id, 'unexcused')}
                          disabled={!canTakeThisStudent}
                          title={!canTakeThisStudent ? "Chỉ xem (Cần đăng nhập GVCN hoặc cán sự có quyền)" : undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            current.status === 'unexcused'
                              ? 'bg-[#EF4444] text-white shadow-xs'
                              : 'text-gray-600 hover:text-black'
                          } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
                        >
                          Không phép
                        </button>
                        <button
                          onClick={() => handleSetStatus(s.id, 'late')}
                          disabled={!canTakeThisStudent}
                          title={!canTakeThisStudent ? "Chỉ xem (Cần đăng nhập GVCN hoặc cán sự có quyền)" : undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            current.status === 'late'
                              ? 'bg-[#8B5CF6] text-white shadow-xs'
                              : 'text-gray-600 hover:text-black'
                          } ${!canTakeThisStudent ? 'cursor-not-allowed' : ''}`}
                        >
                          Đi trễ
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      {current.status === 'excused' && (
                        <input
                          type="text"
                          placeholder="Nhập lý do nghỉ có phép..."
                          disabled={!canTakeThisStudent}
                          value={current.reason || ''}
                          onChange={(e) => handleSetReason(s.id, e.target.value)}
                          className={`w-full px-2.5 py-1 rounded-lg border text-xs ${
                            !canTakeThisStudent ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-amber-50/40 border-amber-200 text-[#17365D]'
                          }`}
                        />
                      )}
                      {current.status === 'unexcused' && (
                        <input
                          type="text"
                          placeholder="Ghi chú (chưa xin phép/chưa liên lạc được)..."
                          disabled={!canTakeThisStudent}
                          value={current.reason || ''}
                          onChange={(e) => handleSetReason(s.id, e.target.value)}
                          className={`w-full px-2.5 py-1 rounded-lg border text-xs ${
                            !canTakeThisStudent ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-red-50/40 border-red-200 text-[#17365D]'
                          }`}
                        />
                      )}
                      {current.status === 'late' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            disabled={!canTakeThisStudent}
                            value={current.timeArrived || '07:30'}
                            onChange={(e) => handleSetTime(s.id, e.target.value)}
                            className={`px-2 py-1 rounded-lg border text-xs font-mono ${
                              !canTakeThisStudent ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-purple-50/40 border-purple-200'
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="Lý do đi trễ..."
                            disabled={!canTakeThisStudent}
                            value={current.reason || ''}
                            onChange={(e) => handleSetReason(s.id, e.target.value)}
                            className={`w-full px-2.5 py-1 rounded-lg border text-xs ${
                              !canTakeThisStudent ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-purple-50/40 border-purple-200 text-[#17365D]'
                            }`}
                          />
                        </div>
                      )}
                      {current.status === 'present' && (
                        <span className="text-gray-400 text-[11px] italic">Đúng giờ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
