import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  UserPlus,
  Calendar,
  Save,
  ShieldAlert,
} from 'lucide-react';
import {
  AppState,
  ConductRankTT22,
  NavPage,
  Student,
  WeeklyExemplaryRecord,
  WeeklyExemplaryStudentItem,
} from '../types';
import { getSchoolWeekMeta } from '../utils/dateWeekUtils';
import { isTeacher } from '../utils/permissionUtils';

interface WeeklyExemplaryStudentsCardProps {
  appState: AppState;
  activeCurrentWeek: number;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onNavigate: (page: NavPage) => void;
  onSelectStudent: (studentId: string) => void;
}

const CONTENT_PRESETS = [
  'Tích cực phát biểu xây dựng bài',
  'Đạt nhiều điểm 9, 10 trong tuần',
  'Gương mẫu thực hiện tốt nề nếp',
  'Hoàn thành xuất sắc nhiệm vụ lớp',
  'Thực hiện tốt trực nhật & chuyên cần',
  'Có nhiều tiến bộ vượt bậc trong tuần',
];

const CONDUCT_OPTIONS: ConductRankTT22[] = ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'];

const NOTE_PRESETS = [
  'Ban cán sự lớp, gương mẫu',
  'Phụ trách đôn đốc học tập',
  'Tổ trưởng nề nếp, tích cực',
  'Tuyên dương trước lớp giờ Sinh hoạt',
  'Chuyên cần đầy đủ, đúng giờ',
  'Tích cực hỗ trợ bạn bè trong tổ',
];

function getConductColorClass(conduct: string) {
  if (conduct === 'Tốt') return 'text-[#10B981] bg-emerald-50 border-emerald-200';
  if (conduct === 'Khá') return 'text-[#1677E8] bg-blue-50 border-blue-200';
  if (conduct === 'Đạt') return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function getDefaultWeeklyRecord(weekNumber: number, students: Student[]): WeeklyExemplaryRecord {
  const defaultItems: WeeklyExemplaryStudentItem[] = [
    {
      studentId: students[0]?.id || 'hs-01',
      content: 'Hoàn thành xuất sắc nhiệm vụ lớp',
      conductRank: students[0]?.conductRank || 'Tốt',
      commendationNote: students[0]?.notes || 'Ban cán sự lớp, gương mẫu',
    },
    {
      studentId: students[1]?.id || 'hs-02',
      content: 'Đạt nhiều điểm 9, 10 trong tuần',
      conductRank: students[1]?.conductRank || 'Tốt',
      commendationNote: students[1]?.notes || 'Phụ trách đôn đốc học tập',
    },
    {
      studentId: students[2]?.id || 'hs-03',
      content: 'Gương mẫu thực hiện tốt nề nếp',
      conductRank: students[2]?.conductRank || 'Tốt',
      commendationNote: students[2]?.notes || 'Tổ trưởng nề nếp, tích cực',
    },
    {
      studentId: students[3]?.id || 'hs-04',
      content: 'Tích cực phát biểu xây dựng bài',
      conductRank: students[3]?.conductRank || 'Tốt',
      commendationNote: students[3]?.notes || 'Chuyên cần đầy đủ, tích cực xây dựng bài',
    },
    {
      studentId: students[4]?.id || 'hs-05',
      content: 'Thực hiện tốt trực nhật & chuyên cần',
      conductRank: students[4]?.conductRank || 'Tốt',
      commendationNote: students[4]?.notes || 'Gương mẫu trong hoạt động tập thể và trực nhật',
    },
  ].filter((item) => students.some((s) => s.id === item.studentId));

  return {
    weekNumber,
    teacherComment: `Tuyên dương các học sinh tiêu biểu Tuần ${weekNumber} có ý thức rèn luyện tốt, tích cực học tập và gương mẫu trong hoạt động tập thể lớp.`,
    items: defaultItems,
  };
}

export const WeeklyExemplaryStudentsCard: React.FC<WeeklyExemplaryStudentsCardProps> = ({
  appState,
  activeCurrentWeek,
  onUpdateState,
  onNavigate,
  onSelectStudent,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(activeCurrentWeek || 1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<string | null>(null);

  // Draft state inside modal
  const [draftItems, setDraftItems] = useState<WeeklyExemplaryStudentItem[]>([]);
  const [draftTeacherComment, setDraftTeacherComment] = useState('');
  const [studentIdToAdd, setStudentIdToAdd] = useState('');
  const [contentToAdd, setContentToAdd] = useState('Tích cực phát biểu xây dựng bài');
  const [conductToAdd, setConductToAdd] = useState<ConductRankTT22>('Tốt');
  const [noteToAdd, setNoteToAdd] = useState('Ban cán sự lớp, gương mẫu');
  const [filterTeam, setFilterTeam] = useState<number | 'all'>('all');

  useEffect(() => {
    if (activeCurrentWeek && activeCurrentWeek >= 1 && activeCurrentWeek <= 35) {
      setSelectedWeek(activeCurrentWeek);
    }
  }, [activeCurrentWeek]);

  const isGVCN = isTeacher(appState);
  const weekMeta = getSchoolWeekMeta(selectedWeek);

  const currentWeekRecord: WeeklyExemplaryRecord =
    appState.weeklyExemplaryStudents?.[selectedWeek] ||
    getDefaultWeeklyRecord(selectedWeek, appState.students);

  const exemplaryRows = currentWeekRecord.items
    .map((item) => {
      const student = appState.students.find((s) => s.id === item.studentId);
      if (!student) return null;
      return {
        student,
        content: item.content || item.badgeTitle || 'Tích cực học tập và rèn luyện nề nếp',
        conductRank: (item.conductRank || student.conductRank || 'Tốt') as ConductRankTT22,
        commendationNote: item.commendationNote || student.notes || '',
      };
    })
    .filter(Boolean) as {
    student: Student;
    content: string;
    conductRank: ConductRankTT22;
    commendationNote: string;
  }[];

  // Cho phép GVCN đổi nhanh Hạnh kiểm trực tiếp ngay trên bảng ngoài giao diện web
  const handleQuickChangeConduct = (studentId: string, newConduct: ConductRankTT22) => {
    if (!isGVCN) return;
    const updatedItems = currentWeekRecord.items.map((item) =>
      item.studentId === studentId ? { ...item, conductRank: newConduct } : item
    );
    const updatedRecord: WeeklyExemplaryRecord = {
      ...currentWeekRecord,
      weekNumber: selectedWeek,
      updatedAt: new Date().toISOString(),
      items: updatedItems,
    };

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((st) =>
        st.id === studentId ? { ...st, conductRank: newConduct } : st
      ),
      weeklyExemplaryStudents: {
        ...(prev.weeklyExemplaryStudents || {}),
        [selectedWeek]: updatedRecord,
      },
    }));
  };

  const handleOpenEditModal = () => {
    if (!isGVCN) {
      setPermissionNotice(
        'Chỉ Giáo viên chủ nhiệm (GVCN) mới có quyền cập nhật danh sách Học sinh tiêu biểu hàng tuần. Vui lòng đăng nhập tài khoản GVCN ở góc trên bên phải.'
      );
      setTimeout(() => setPermissionNotice(null), 5000);
      return;
    }

    const normalizedDraft = currentWeekRecord.items.map((item) => {
      const st = appState.students.find((s) => s.id === item.studentId);
      return {
        ...item,
        content: item.content || item.badgeTitle || 'Tích cực phát biểu xây dựng bài',
        conductRank: item.conductRank || st?.conductRank || 'Tốt',
        commendationNote: item.commendationNote ?? st?.notes ?? '',
      };
    });

    setDraftItems(normalizedDraft);
    setDraftTeacherComment(
      currentWeekRecord.teacherComment ||
        `Tuyên dương các học sinh tiêu biểu Tuần ${selectedWeek} có ý thức rèn luyện tốt, tích cực học tập và gương mẫu trong hoạt động tập thể lớp.`
    );

    const existingIds = new Set(currentWeekRecord.items.map((i) => i.studentId));
    const firstAvailable = appState.students.find((s) => !existingIds.has(s.id));
    setStudentIdToAdd(firstAvailable?.id || '');
    if (firstAvailable) {
      setConductToAdd((firstAvailable.conductRank as ConductRankTT22) || 'Tốt');
      setNoteToAdd(firstAvailable.notes || 'Tuyên dương trước lớp giờ Sinh hoạt');
    }
    setShowEditModal(true);
  };

  const handleAddStudentToDraft = () => {
    if (!studentIdToAdd) return;
    if (draftItems.some((i) => i.studentId === studentIdToAdd)) return;

    const st = appState.students.find((s) => s.id === studentIdToAdd);
    const updated: WeeklyExemplaryStudentItem[] = [
      ...draftItems,
      {
        studentId: studentIdToAdd,
        content: contentToAdd.trim() || 'Tích cực phát biểu xây dựng bài',
        conductRank: conductToAdd || st?.conductRank || 'Tốt',
        commendationNote: noteToAdd.trim() || st?.notes || '',
      },
    ];
    setDraftItems(updated);

    const existingIds = new Set(updated.map((i) => i.studentId));
    const nextAvailable = appState.students.find((s) => !existingIds.has(s.id));
    setStudentIdToAdd(nextAvailable?.id || '');
    if (nextAvailable) {
      setConductToAdd((nextAvailable.conductRank as ConductRankTT22) || 'Tốt');
      setNoteToAdd(nextAvailable.notes || 'Tuyên dương trước lớp giờ Sinh hoạt');
    }
  };

  const handleAutoSuggestFromEmulation = () => {
    const weekPlusRecords = (appState.emulationRecords || []).filter(
      (r) => r.week === selectedWeek && r.type === 'plus' && r.studentId
    );
    const allPlusRecords = (appState.emulationRecords || []).filter(
      (r) => r.type === 'plus' && r.studentId
    );
    const source = weekPlusRecords.length > 0 ? weekPlusRecords : allPlusRecords;

    const addedIds = new Set(draftItems.map((i) => i.studentId));
    const newItems = [...draftItems];

    for (const rec of source) {
      if (rec.studentId && !addedIds.has(rec.studentId)) {
        const st = appState.students.find((s) => s.id === rec.studentId);
        addedIds.add(rec.studentId);
        newItems.push({
          studentId: rec.studentId,
          content: rec.note || `Tích cực trong tiêu chí ${rec.criteria}`,
          conductRank: st?.conductRank || 'Tốt',
          commendationNote: st?.notes || `Cộng +${rec.points} điểm thi đua (${rec.criteria})`,
        });
      }
    }
    setDraftItems(newItems);
  };

  const handleCopyPreviousWeek = () => {
    const prevWeek = Math.max(1, selectedWeek - 1);
    const prevRecord =
      appState.weeklyExemplaryStudents?.[prevWeek] ||
      getDefaultWeeklyRecord(prevWeek, appState.students);
    setDraftItems(prevRecord.items.map((item) => ({ ...item })));
  };

  const handleSaveWeeklyExemplary = () => {
    const updatedRecord: WeeklyExemplaryRecord = {
      weekNumber: selectedWeek,
      updatedAt: new Date().toISOString(),
      teacherComment: draftTeacherComment.trim(),
      items: draftItems,
    };

    // Đồng bộ luôn hạnh kiểm mới của các học sinh trong tuần vào hồ sơ học sinh
    const conductMap = new Map<string, ConductRankTT22>();
    draftItems.forEach((item) => {
      if (item.conductRank) {
        conductMap.set(item.studentId, item.conductRank as ConductRankTT22);
      }
    });

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((st) =>
        conductMap.has(st.id) ? { ...st, conductRank: conductMap.get(st.id)! } : st
      ),
      weeklyExemplaryStudents: {
        ...(prev.weeklyExemplaryStudents || {}),
        [selectedWeek]: updatedRecord,
      },
    }));

    setShowEditModal(false);
    setSaveSuccessBanner(
      `Đã cập nhật danh sách Học sinh tiêu biểu Tuần ${selectedWeek} (${draftItems.length} học sinh) và đồng bộ lên giao diện web!`
    );
    setTimeout(() => setSaveSuccessBanner(null), 4000);
  };

  const availableStudentsForAdd = appState.students.filter((s) => {
    const notInList = !draftItems.some((item) => item.studentId === s.id);
    const matchesTeam = filterTeam === 'all' || s.teamId === filterTeam;
    return notInList && matchesTeam;
  });

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs space-y-3">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-blue-500 font-bold text-base">★</span>
          <h3 className="text-sm font-extrabold text-[#17365D]">
            Danh sách học sinh tiêu biểu tuần
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
            Tuần {selectedWeek}
          </span>
        </div>

        {/* Week Selector + GVCN Update Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week switcher */}
          <div className="flex items-center bg-[#F0F6FE] border border-[#CDE1FA] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
              disabled={selectedWeek <= 1}
              className="p-1.5 rounded-lg text-[#0B438A] hover:bg-white disabled:opacity-40 transition-colors"
              title="Tuần trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-[#0B438A] px-2 py-1 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                const meta = getSchoolWeekMeta(w);
                return (
                  <option key={w} value={w}>
                    Tuần {w} ({meta.startDate.slice(0, 5)} - {meta.endDate.slice(0, 5)})
                    {w === activeCurrentWeek ? ' • Hiện tại' : ''}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={() => setSelectedWeek((w) => Math.min(35, w + 1))}
              disabled={selectedWeek >= 35}
              className="p-1.5 rounded-lg text-[#0B438A] hover:bg-white disabled:opacity-40 transition-colors"
              title="Tuần kế tiếp"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* GVCN Update Button */}
          {isGVCN ? (
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="px-3 py-1.5 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Cập nhật danh sách tuần</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] border border-blue-200 text-xs font-semibold flex items-center gap-1 transition-all"
              title="Dành cho Giáo viên chủ nhiệm cập nhật hàng tuần"
            >
              <Award className="w-3.5 h-3.5" />
              <span>GVCN cập nhật hàng tuần</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="text-xs font-semibold text-[#1677E8] hover:text-[#073B82] flex items-center gap-0.5 ml-1"
          >
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-bar: Week dates & Teacher commendation comment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-50/70 via-blue-50/40 to-amber-50/50 border border-amber-200/70 text-xs">
        <div className="flex items-start sm:items-center gap-2 text-[#17365D]">
          <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-[#0B438A]">
              Tuần {selectedWeek} ({weekMeta.startDate} – {weekMeta.endDate}):
            </strong>{' '}
            {currentWeekRecord.teacherComment ||
              `Tuyên dương các gương mặt tiêu biểu của lớp trong Tuần ${selectedWeek}.`}
          </span>
        </div>

        {currentWeekRecord.updatedAt && (
          <span className="text-[10.5px] text-[#66809F] shrink-0 font-mono">
            Cập nhật: {new Date(currentWeekRecord.updatedAt).toLocaleDateString('vi-VN')}
          </span>
        )}
      </div>

      {/* Notices */}
      {permissionNotice && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{permissionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPermissionNotice(null)}
            className="text-amber-700 hover:text-amber-950 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {saveSuccessBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessBanner}</span>
        </div>
      )}

      {/* Exemplary Students Table */}
      <div className="overflow-x-auto">
        {exemplaryRows.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#66809F] space-y-2">
            <p className="font-semibold text-[#17365D]">
              Chưa có học sinh nào trong danh sách tuyên dương Tuần {selectedWeek}.
            </p>
            {isGVCN && (
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="px-3.5 py-2 rounded-xl bg-[#1677E8] text-white font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Chọn học sinh tuyên dương Tuần {selectedWeek}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs mt-1">
            <thead>
              <tr className="border-b border-gray-100 text-[#66809F] font-semibold">
                <th className="py-2.5 px-3 w-12">STT</th>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Ngày sinh</th>
                <th className="py-2.5 px-3">Nội dung</th>
                <th className="py-2.5 px-3">Hạnh kiểm</th>
                <th className="py-2.5 px-3">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exemplaryRows.map(({ student: s, content, conductRank, commendationNote }, idx) => (
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
                        className="w-7 h-7 rounded-full object-cover border border-blue-200 shrink-0"
                      />
                      <span className="font-bold text-[#17365D] group-hover:text-[#1677E8]">
                        {s.fullName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[#66809F] font-mono whitespace-nowrap">
                    {s.dateOfBirth}
                  </td>
                  <td className="py-2.5 px-3 text-[#17365D] font-medium">
                    {content}
                  </td>
                  <td
                    className="py-2.5 px-3"
                    onClick={(e) => {
                      if (isGVCN) e.stopPropagation();
                    }}
                  >
                    {isGVCN ? (
                      <select
                        value={conductRank}
                        onChange={(e) =>
                          handleQuickChangeConduct(s.id, e.target.value as ConductRankTT22)
                        }
                        title="GVCN có thể thay đổi trực tiếp hạnh kiểm"
                        className={`px-2 py-0.5 rounded-lg border font-bold text-xs cursor-pointer focus:outline-none ${getConductColorClass(
                          conductRank
                        )}`}
                      >
                        {CONDUCT_OPTIONS.map((c) => (
                          <option key={c} value={c} className="bg-white text-[#17365D]">
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`font-semibold ${
                          conductRank === 'Tốt'
                            ? 'text-[#10B981]'
                            : conductRank === 'Khá'
                            ? 'text-[#1677E8]'
                            : conductRank === 'Đạt'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {conductRank}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[#66809F] max-w-[220px]">
                    {commendationNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-gray-50 text-xs">
        <span className="text-[11px] text-[#66809F]">
          {isGVCN
            ? '💡 Thầy/Cô có thể đổi nhanh Hạnh kiểm ngay trên bảng hoặc bấm "Cập nhật danh sách tuần" để chỉnh sửa Nội dung và Ghi chú.'
            : '💡 Danh sách học sinh tiêu biểu được Giáo viên chủ nhiệm bình xét và cập nhật hàng tuần.'}
        </span>
        <button
          type="button"
          onClick={() => onNavigate('students')}
          className="text-xs font-semibold text-[#1677E8] hover:underline shrink-0"
        >
          Xem toàn bộ danh sách →
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: GVCN CẬP NHẬT DANH SÁCH HỌC SINH TIÊU BIỂU CỦA TUẦN */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-blue-100 shadow-2xl p-6 space-y-5 my-8 text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#17365D]">
                    Cập nhật Học sinh tiêu biểu – Tuần {selectedWeek} ({weekMeta.startDate} – {weekMeta.endDate})
                  </h3>
                  <p className="text-xs text-[#66809F]">
                    Chỉnh sửa Nội dung tuyên dương, Hạnh kiểm và Ghi chú hiển thị trên giao diện web
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Week Selector & Quick Import Tools */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1677E8]" />
                <span className="font-bold text-[#17365D]">Tuần tuyên dương:</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => {
                    const nextW = Number(e.target.value);
                    setSelectedWeek(nextW);
                    const rec =
                      appState.weeklyExemplaryStudents?.[nextW] ||
                      getDefaultWeeklyRecord(nextW, appState.students);
                    setDraftItems([...rec.items]);
                    setDraftTeacherComment(rec.teacherComment || '');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 font-bold text-[#0B438A]"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                    const m = getSchoolWeekMeta(w);
                    return (
                      <option key={w} value={w}>
                        Tuần {w} ({m.startDate} – {m.endDate})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoSuggestFromEmulation}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gợi ý từ điểm cộng Thi đua</span>
                </button>

                {selectedWeek > 1 && (
                  <button
                    type="button"
                    onClick={handleCopyPreviousWeek}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-[#17365D] border border-gray-200 font-bold flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#1677E8]" />
                    <span>Sao chép từ Tuần {selectedWeek - 1}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Teacher General Weekly Message */}
            <div>
              <label className="font-bold text-[#17365D] block mb-1">
                Lời khen / Thông điệp tuyên dương tuần của GVCN:
              </label>
              <input
                type="text"
                value={draftTeacherComment}
                onChange={(e) => setDraftTeacherComment(e.target.value)}
                placeholder="VD: Tuyên dương các bạn có tinh thần xung phong phát biểu bài và giữ gìn nề nếp lớp xuất sắc..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium text-[#17365D]"
              />
            </div>

            {/* Add a Student to Weekly Honor Roll */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-[#17365D] flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Thêm học sinh vào Danh sách tiêu biểu Tuần {selectedWeek}
                </h4>

                <div className="flex items-center gap-1">
                  {(['all', 1, 2, 3, 4] as const).map((t) => (
                    <button
                      key={String(t)}
                      type="button"
                      onClick={() => setFilterTeam(t)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        filterTeam === t
                          ? 'bg-[#1677E8] text-white'
                          : 'bg-white text-[#66809F] border border-gray-200'
                      }`}
                    >
                      {t === 'all' ? 'Cả lớp' : `Tổ ${t}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-[#66809F] block mb-1">
                    Chọn học sinh:
                  </label>
                  <select
                    value={studentIdToAdd}
                    onChange={(e) => {
                      const id = e.target.value;
                      setStudentIdToAdd(id);
                      const st = appState.students.find((s) => s.id === id);
                      if (st) {
                        setConductToAdd((st.conductRank as ConductRankTT22) || 'Tốt');
                        setNoteToAdd(st.notes || '');
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white font-bold text-[#17365D]"
                  >
                    <option value="">-- Chọn học sinh --</option>
                    {availableStudentsForAdd.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} (Tổ {s.teamId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="text-[11px] font-semibold text-[#66809F] block mb-1">
                    Nội dung tuyên dương:
                  </label>
                  <input
                    type="text"
                    value={contentToAdd}
                    onChange={(e) => setContentToAdd(e.target.value)}
                    placeholder="VD: Tích cực phát biểu xây dựng bài..."
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white font-medium text-[#17365D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-[#66809F] block mb-1">
                    Hạnh kiểm:
                  </label>
                  <select
                    value={conductToAdd}
                    onChange={(e) => setConductToAdd(e.target.value as ConductRankTT22)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white font-bold text-[#10B981]"
                  >
                    {CONDUCT_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-[#66809F] block mb-1">
                    Ghi chú:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={noteToAdd}
                      onChange={(e) => setNoteToAdd(e.target.value)}
                      placeholder="Ghi chú thêm..."
                      className="flex-1 px-2.5 py-2 rounded-xl border border-gray-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddStudentToDraft}
                      disabled={!studentIdToAdd}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shrink-0 disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Content & Note Presets */}
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] text-[#66809F] font-semibold">Mẫu Nội dung nhanh:</span>
                  {CONTENT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setContentToAdd(preset)}
                      className="px-2 py-0.5 rounded-lg bg-white hover:bg-blue-50 text-[#0B438A] border border-gray-200 text-[10.5px] font-medium transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] text-[#66809F] font-semibold">Mẫu Ghi chú nhanh:</span>
                  {NOTE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNoteToAdd(preset)}
                      className="px-2 py-0.5 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-gray-200 text-[10.5px] font-medium transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Draft List of Students in this Week */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#17365D]">
                  Danh sách học sinh tiêu biểu Tuần {selectedWeek} ({draftItems.length} học sinh):
                </span>
                {draftItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftItems([])}
                    className="text-[11px] text-red-600 hover:underline font-semibold"
                  >
                    Xóa trống danh sách tuần này
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-2xl bg-white">
                {draftItems.length === 0 ? (
                  <div className="p-6 text-center text-[#66809F]">
                    Chưa có học sinh nào trong danh sách. Hãy chọn học sinh ở khung phía trên và bấm <strong>+ Thêm</strong>.
                  </div>
                ) : (
                  draftItems.map((item, index) => {
                    const st = appState.students.find((s) => s.id === item.studentId);
                    if (!st) return null;
                    return (
                      <div
                        key={item.studentId}
                        className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:bg-blue-50/30"
                      >
                        {/* Student Info */}
                        <div className="sm:col-span-3 flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0B438A] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <img
                            src={st.avatar}
                            alt={st.fullName}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-[#17365D] truncate">{st.fullName}</p>
                            <p className="text-[10.5px] text-[#66809F]">
                              {st.dateOfBirth} • Tổ {st.teamId}
                            </p>
                          </div>
                        </div>

                        {/* Nội dung */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-[#66809F] block sm:hidden mb-0.5">
                            Nội dung:
                          </label>
                          <input
                            type="text"
                            value={item.content || item.badgeTitle || ''}
                            onChange={(e) => {
                              const next = [...draftItems];
                              next[index] = { ...next[index], content: e.target.value };
                              setDraftItems(next);
                            }}
                            placeholder="Nhập nội dung tuyên dương..."
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-[#17365D]"
                          />
                        </div>

                        {/* Hạnh kiểm */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-[#66809F] block sm:hidden mb-0.5">
                            Hạnh kiểm:
                          </label>
                          <select
                            value={item.conductRank || st.conductRank || 'Tốt'}
                            onChange={(e) => {
                              const next = [...draftItems];
                              next[index] = {
                                ...next[index],
                                conductRank: e.target.value as ConductRankTT22,
                              };
                              setDraftItems(next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-emerald-50/60 font-bold text-[#10B981] text-xs"
                          >
                            {CONDUCT_OPTIONS.map((c) => (
                              <option key={c} value={c} className="bg-white text-[#17365D]">
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Ghi chú + Xóa */}
                        <div className="sm:col-span-3 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={item.commendationNote}
                            onChange={(e) => {
                              const next = [...draftItems];
                              next[index] = { ...next[index], commendationNote: e.target.value };
                              setDraftItems(next);
                            }}
                            placeholder="Ghi chú..."
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-[#66809F]"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setDraftItems(draftItems.filter((i) => i.studentId !== item.studentId))
                            }
                            className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 shrink-0"
                            title="Xóa khỏi tuần này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveWeeklyExemplary}
                className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Lưu & Công bố Tuần {selectedWeek}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
