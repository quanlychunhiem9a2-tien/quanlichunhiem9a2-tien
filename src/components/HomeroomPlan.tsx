import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Copy,
  Trash2,
  Edit3,
  Printer,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Share2,
  Eye,
  ShieldCheck,
  HeartHandshake,
  ListTodo,
  BookmarkCheck,
  FileText,
  X,
  Search,
  CheckCheck,
  RotateCcw,
  Lock
} from 'lucide-react';
import { AppState, HomeroomPlan, SpecialStudentConcern } from '../types';
import { sendAIChatMessage } from '../api';
import { hasPermission, isReadOnly, isTeacher as isTeacherUtil } from '../utils/permissionUtils';
import { getCurrentSchoolWeekInfo, getSchoolWeekMeta } from '../utils/dateWeekUtils';
import { WeeklyDutyRosterPanel } from './WeeklyDutyRosterPanel';

interface HomeroomPlanProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

// 35 Weeks calendar calculation for School Year 2026-2027 aligned with the latest date
export const getWeekMeta = (weekNum: number) => {
  const baseMeta = getSchoolWeekMeta(weekNum);
  const startDate = baseMeta.startDate;
  const endDate = baseMeta.endDate;
  const semester: 1 | 2 = baseMeta.semester;

  const themes: Record<number, string> = {
    1: 'Chào năm học mới & Ổn định nề nếp lớp học',
    2: 'Phát động phong trào thi đua "Hoa điểm tốt"',
    3: 'Thực hiện An toàn giao thông & Văn hóa học đường',
    4: 'Đại hội Chi đội & Kiện toàn Ban cán sự lớp',
    5: 'Chăm ngoan học giỏi – Vâng lời thầy cô',
    6: 'Phát động phong trào đôi bạn cùng tiến môn Toán - Anh',
    7: 'Ôn tập chuẩn bị kiểm tra giữa học kỳ I',
    8: 'Kiểm tra giữa học kỳ I nghiêm túc, chất lượng',
    9: 'Thi đua lập thành tích chào mừng Ngày Nhà giáo VN 20/11',
    10: 'Học tốt, rèn nghiêm – Tri ân thầy cô giáo',
    11: 'Tuần lễ hoa điểm mười dâng tặng thầy cô',
    12: 'Giữ gìn vệ sinh môi trường & Trường học thân thiện',
    13: 'Kỷ niệm ngày thành lập QĐND Việt Nam 22/12',
    14: 'Thi đua "Anh bộ đội Cụ Hồ" – Rèn luyện tác phong kỷ luật',
    15: 'Tập trung ôn tập toàn diện cuối học kỳ I',
    16: 'Kiểm tra đánh giá cuối học kỳ I',
    17: 'Hoàn thành chương trình HK I & Tổng kết thi đua nề nếp',
    18: 'Sơ kết học kỳ I & Họp Phụ huynh học sinh học kỳ I',
    19: 'Khởi động Học kỳ II – Quyết tâm bứt phá học tập',
    20: 'Mừng Đảng quang vinh – Mừng Xuân Bính Ngọ 2027',
    21: 'Đón Tết an toàn, tiết kiệm và văn minh',
    22: 'Duy trì nề nếp kỷ cương trường lớp sau kỳ nghỉ Tết',
    23: 'Xây dựng tinh thần tự học & Định hướng thi vào lớp 10 THPT',
    24: 'Thi đua chào mừng Ngày Quốc tế Phụ nữ 08/03',
    25: 'Thi đua tiến bước lên Đoàn – Chào mừng 26/03',
    26: 'Ngày hội thiếu nhi tiến bước lên Đoàn & Hội thao',
    27: 'Ôn tập kiểm tra đánh giá giữa học kỳ II',
    28: 'Kiểm tra giữa học kỳ II',
    29: 'Thi đua chào mừng Giải phóng miền Nam 30/04 & 01/05',
    30: 'Rèn luyện kỹ năng sống & Phòng chống tai nạn thương tích',
    31: 'Thi đua kỷ niệm Ngày sinh Chủ tịch Hồ Chí Minh 19/05',
    32: 'Ôn tập tổng lực & Giai đoạn nước rút thi vào lớp 10 THPT',
    33: 'Kiểm tra đánh giá cuối năm học kỳ II',
    34: 'Tổng kết đánh giá rèn luyện học tập cả năm theo Thông tư 22',
    35: 'Tổng kết năm học 2026 - 2027 & Bàn giao học sinh về sinh hoạt hè',
  };

  return {
    startDate,
    endDate,
    label: `${startDate} – ${endDate}`,
    semester,
    theme: themes[weekNum] || `Chủ điểm thi đua Tuần ${weekNum}`,
  };
};

export const HomeroomPlanComponent: React.FC<HomeroomPlanProps> = ({
  appState,
  onUpdateState,
}) => {
  const { plans, students, teacherName, className, schoolName, academicYear, currentUser } = appState;
  const readOnly = isReadOnly(appState);
  const isTeacher = isTeacherUtil(appState);
  const canCreatePlan = hasPermission(appState, 'canCreateOfficialPlan');
  const canProposeTask = hasPermission(appState, 'canProposePlanTask');
  const canToggleTask = hasPermission(appState, 'canToggleTasks');
  const canUseAI = hasPermission(appState, 'canUseAI');

  // Selected week (1 to 35). Default to current week based on latest date
  const latestWeekInfo = useMemo(() => getCurrentSchoolWeekInfo(), [appState.todayDate, appState.currentEmulationWeek]);
  const defaultCurrentWeek =
    appState.currentEmulationWeek && appState.currentEmulationWeek >= latestWeekInfo.currentWeek
      ? appState.currentEmulationWeek
      : latestWeekInfo.currentWeek;
  const [selectedWeek, setSelectedWeek] = useState<number>(defaultCurrentWeek);
  const [semesterFilter, setSemesterFilter] = useState<'all' | 'hk1' | 'hk2'>('all');
  const [showMatrixModal, setShowMatrixModal] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSpecialStudentModalOpen, setIsSpecialStudentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Edit form state
  const [formWeek, setFormWeek] = useState<number>(2);
  const [formTitle, setFormTitle] = useState('');
  const [formTheme, setFormTheme] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formGoals, setFormGoals] = useState<string[]>([]);
  const [formMeasures, setFormMeasures] = useState<string[]>([]);
  const [formTasks, setFormTasks] = useState<HomeroomPlan['tasks']>([]);
  const [formCoordination, setFormCoordination] = useState({
    subjectTeachers: '',
    parents: '',
    youthUnion: '',
  });
  const [newGoalInput, setNewGoalInput] = useState('');
  const [newMeasureInput, setNewMeasureInput] = useState('');

  // Task inputs
  const [newTaskInput, setNewTaskInput] = useState({
    day: 'Thứ Ba',
    content: '',
    responsible: currentUser?.teamId
      ? `Tổ ${currentUser.teamId} & ${currentUser.name}`
      : currentUser?.category === 'Ban cán sự'
      ? `${currentUser.roleTitle} & Ban cán sự`
      : 'Ban cán sự & GVCN',
  });

  // Special student modal state
  const [specialStudentInput, setSpecialStudentInput] = useState({
    studentId: students[0]?.id || '',
    reason: '',
    actionPlan: '',
  });

  // AI Generator state
  const [aiFocusPrompt, setAiFocusPrompt] = useState('Ổn định nề nếp, tăng cường chất lượng học tập');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiResultPreview, setAiResultPreview] = useState<HomeroomPlan | null>(null);

  // Review notes editing state
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [reviewNoteText, setReviewNoteText] = useState('');

  // Active plan for selected week
  const activePlan = useMemo(() => {
    return plans.find((p) => p.weekNumber === selectedWeek);
  }, [plans, selectedWeek]);

  // Weeks list with plan status
  const weeksList = useMemo(() => {
    const list = [];
    for (let w = 1; w <= 35; w++) {
      const plan = plans.find((p) => p.weekNumber === w);
      const meta = getWeekMeta(w);
      const doneCount = plan?.tasks.filter((t) => t.done).length || 0;
      const totalTasks = plan?.tasks.length || 0;
      const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
      list.push({
        weekNumber: w,
        meta,
        hasPlan: !!plan,
        plan,
        progress,
        totalTasks,
        doneCount,
      });
    }
    return list;
  }, [plans]);

  const filteredWeeks = useMemo(() => {
    if (semesterFilter === 'hk1') return weeksList.filter((w) => w.weekNumber <= 18);
    if (semesterFilter === 'hk2') return weeksList.filter((w) => w.weekNumber >= 19);
    return weeksList;
  }, [weeksList, semesterFilter]);

  // Open Create Modal with auto-filled default template for selected week
  const handleOpenCreateModal = (targetWeek = selectedWeek) => {
    if (!canCreatePlan) return;
    const meta = getWeekMeta(targetWeek);
    setFormWeek(targetWeek);
    setFormTitle(`Kế hoạch công tác chủ nhiệm Tuần ${targetWeek} (${meta.label})`);
    setFormTheme(meta.theme);
    setFormStartDate(meta.startDate);
    setFormEndDate(meta.endDate);
    setFormGoals([
      'Duy trì sĩ số chuyên cần, chấn chỉnh nề nếp xếp hàng và truy bài 15 phút đầu giờ',
      'Đẩy mạnh phong trào học tập, nâng cao chất lượng giờ học chính khóa',
      'Thực hiện tốt phong trào Đội và giữ gìn vệ sinh lớp học sạch đẹp',
    ]);
    setFormMeasures([
      'Phân công ban cán sự lớp và cờ đỏ kiểm tra đồng phục, khăn quàng đỏ',
      'Đôn đốc mô hình "Đôi bạn cùng tiến", giúp đỡ các bạn học lực còn yếu',
      'Thường xuyên liên hệ với phụ huynh các em cần lưu ý qua Zalo/điện thoại',
    ]);
    setFormTasks([
      { id: `t1-${Date.now()}`, day: `Thứ Hai (${meta.startDate})`, content: 'Chào cờ đầu tuần, sinh hoạt chủ điểm theo kế hoạch Liên đội', responsible: 'GVCN & Toàn thể HS', done: false },
      { id: `t2-${Date.now() + 1}`, day: 'Thứ Ba', content: 'Kiểm tra sách vở, phân công đôi bạn cùng tiến môn Toán & Tiếng Anh', responsible: 'Lớp phó học tập', done: false },
      { id: `t3-${Date.now() + 2}`, day: 'Thứ Tư', content: 'Trao đổi với giáo viên bộ môn về tình hình học tập và chuẩn bị bài', responsible: 'GVCN', done: false },
      { id: `t4-${Date.now() + 3}`, day: 'Thứ Năm', content: 'Tổng vệ sinh phòng học 302 và chăm sóc bồn hoa chi đội', responsible: 'Tổ trực nhật', done: false },
      { id: `t5-${Date.now() + 4}`, day: 'Thứ Sáu', content: 'Rà soát sổ theo dõi thi đua 4 tổ, chấm điểm chuyên cần', responsible: 'Ban cán sự lớp', done: false },
      { id: `t6-${Date.now() + 5}`, day: `Thứ Bảy (${meta.endDate})`, content: 'Tiết sinh hoạt lớp: Tổng kết thi đua tuần, tuyên dương học sinh tiêu biểu', responsible: 'GVCN & Cả lớp', done: false },
    ]);
    setFormCoordination({
      subjectTeachers: 'Thống nhất việc theo dõi bài vở và giao bài tập vừa sức cho học sinh',
      parents: 'Nhắc nhở học sinh ôn bài ở nhà và chấp hành quy định an toàn giao thông',
      youthUnion: 'Thực hiện đầy đủ các phong trào thi đua do Liên đội phát động',
    });
    setIsCreatingNew(true);
    setIsEditModalOpen(true);
  };

  // Open Edit Modal for existing plan
  const handleOpenEditModal = (plan: HomeroomPlan) => {
    if (!canCreatePlan) return;
    setFormWeek(plan.weekNumber || selectedWeek);
    setFormTitle(plan.title);
    setFormTheme(plan.theme || getWeekMeta(plan.weekNumber || selectedWeek).theme);
    setFormStartDate(plan.startDate);
    setFormEndDate(plan.endDate);
    setFormGoals([...plan.goals]);
    setFormMeasures([...plan.measures]);
    setFormTasks([...plan.tasks]);
    setFormCoordination({
      subjectTeachers: plan.coordination?.subjectTeachers || '',
      parents: plan.coordination?.parents || '',
      youthUnion: plan.coordination?.youthUnion || '',
    });
    setIsCreatingNew(false);
    setIsEditModalOpen(true);
  };

  // Save Plan (Create or Update)
  const handleSavePlan = () => {
    if (!canCreatePlan) return;
    const meta = getWeekMeta(formWeek);
    const planToSave: HomeroomPlan = {
      id: isCreatingNew ? `plan-w${formWeek}-${Date.now()}` : (activePlan?.id || `plan-w${formWeek}`),
      title: formTitle.trim() || `Kế hoạch công tác chủ nhiệm Tuần ${formWeek}`,
      period: 'Tuần',
      weekNumber: formWeek,
      semester: meta.semester,
      theme: formTheme.trim() || meta.theme,
      startDate: formStartDate || meta.startDate,
      endDate: formEndDate || meta.endDate,
      goals: formGoals.length > 0 ? formGoals : ['Duy trì nề nếp chuyên cần và kỷ luật lớp học'],
      measures: formMeasures.length > 0 ? formMeasures : ['Phân công Ban cán sự đôn đốc các tổ'],
      tasks: formTasks,
      specialStudents: activePlan?.specialStudents || [],
      coordination: formCoordination,
      reviewNotes: activePlan?.reviewNotes || '',
    };

    onUpdateState((prev) => {
      // Remove any plan with this weekNumber to avoid duplicates, then add
      const filtered = prev.plans.filter((p) => p.weekNumber !== formWeek && p.id !== planToSave.id);
      return {
        ...prev,
        plans: [planToSave, ...filtered].sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0)),
      };
    });

    setSelectedWeek(formWeek);
    setIsEditModalOpen(false);
  };

  // Delete Plan
  const handleDeletePlan = (planId: string) => {
    if (!isTeacher) {
      alert(`Chỉ Giáo viên chủ nhiệm mới có quyền xóa toàn bộ kế hoạch tuần chính thức. Với vai trò ${currentUser?.roleTitle || 'cán sự'}, bạn có thể đề xuất công việc và cập nhật tiến độ công việc được giao.`);
      return;
    }
    if (!window.confirm(`Thầy/Cô có chắc chắn muốn xóa kế hoạch Tuần ${selectedWeek}?`)) return;
    onUpdateState((prev) => ({
      ...prev,
      plans: prev.plans.filter((p) => p.id !== planId),
    }));
  };

  // Copy plan from previous week
  const handleCopyFromPreviousWeek = () => {
    if (!canCreatePlan || selectedWeek <= 1) return;
    const prevWeekNum = selectedWeek - 1;
    const prevPlan = plans.find((p) => p.weekNumber === prevWeekNum);
    if (!prevPlan) {
      return;
    }

    const currentMeta = getWeekMeta(selectedWeek);
    const newCopiedPlan: HomeroomPlan = {
      id: `plan-w${selectedWeek}-${Date.now()}`,
      title: `Kế hoạch công tác chủ nhiệm Tuần ${selectedWeek} (${currentMeta.label})`,
      period: 'Tuần',
      weekNumber: selectedWeek,
      semester: currentMeta.semester,
      theme: currentMeta.theme,
      startDate: currentMeta.startDate,
      endDate: currentMeta.endDate,
      goals: [...prevPlan.goals],
      measures: [...prevPlan.measures],
      tasks: prevPlan.tasks.map((t, idx) => ({
        ...t,
        id: `t-copy-${Date.now()}-${idx}`,
        done: false, // Reset completion status
      })),
      specialStudents: prevPlan.specialStudents ? [...prevPlan.specialStudents] : [],
      coordination: prevPlan.coordination ? { ...prevPlan.coordination } : undefined,
      reviewNotes: '',
    };

    onUpdateState((prev) => ({
      ...prev,
      plans: [...prev.plans.filter((p) => p.weekNumber !== selectedWeek), newCopiedPlan],
    }));
  };

  // Toggle task done
  const handleToggleTask = (taskId: string) => {
    if (!canToggleTask || !activePlan) return;
    onUpdateState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === activePlan.id
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
            }
          : p
      ),
    }));
  };

  // Add individual task
  const handleAddTask = () => {
    if ((!canCreatePlan && !canProposeTask) || !activePlan || !newTaskInput.content.trim()) return;
    const newTask = {
      id: `pt-${Date.now()}`,
      day: newTaskInput.day.trim(),
      content: newTaskInput.content.trim(),
      responsible: newTaskInput.responsible.trim() || 'Ban cán sự & GVCN',
      done: false,
    };

    onUpdateState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === activePlan.id ? { ...p, tasks: [...p.tasks, newTask] } : p
      ),
    }));

    setNewTaskInput({ day: 'Thứ Ba', content: '', responsible: 'Ban cán sự & GVCN' });
    setIsNewTaskModalOpen(false);
  };

  // Delete individual task
  const handleDeleteTask = (taskId: string) => {
    if (!canCreatePlan || !activePlan) return;
    onUpdateState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === activePlan.id
          ? {
              ...p,
              tasks: p.tasks.filter((t) => t.id !== taskId),
            }
          : p
      ),
    }));
  };

  // Add special student concern
  const handleAddSpecialStudent = () => {
    if (!canCreatePlan || !activePlan || !specialStudentInput.studentId || !specialStudentInput.reason.trim()) return;
    const selectedStd = students.find((s) => s.id === specialStudentInput.studentId);
    if (!selectedStd) return;

    const newConcern: SpecialStudentConcern = {
      studentId: selectedStd.id,
      studentName: selectedStd.fullName,
      reason: specialStudentInput.reason.trim(),
      actionPlan: specialStudentInput.actionPlan.trim() || 'Động viên, phối hợp gia đình và bạn cùng bàn kèm cặp',
    };

    onUpdateState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === activePlan.id
          ? {
              ...p,
              specialStudents: [...(p.specialStudents || []), newConcern],
            }
          : p
      ),
    }));

    setSpecialStudentInput({ studentId: students[0]?.id || '', reason: '', actionPlan: '' });
    setIsSpecialStudentModalOpen(false);
  };

  // Remove special student concern
  const handleRemoveSpecialStudent = (studentId: string) => {
    if (!canCreatePlan || !activePlan) return;
    onUpdateState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === activePlan.id
          ? {
              ...p,
              specialStudents: (p.specialStudents || []).filter((s) => s.studentId !== studentId),
            }
          : p
      ),
    }));
  };

  // Save review notes
  const handleSaveReviewNotes = () => {
    if (!canCreatePlan || !activePlan) return;
    onUpdateState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === activePlan.id ? { ...p, reviewNotes: reviewNoteText } : p
      ),
    }));
    setIsEditingReview(false);
  };

  // AI Generator with Gemini
  const handleGenerateAIPlan = async () => {
    if (!canCreatePlan || !canUseAI) return;
    setIsGeneratingAI(true);
    const meta = getWeekMeta(selectedWeek);

    const prompt = `Bạn là trợ lý đắc lực cho thầy Trần Văn Tiến - Giáo viên chủ nhiệm lớp 9A2, Trường Tiểu học & THCS Võ Thị Sáu.
Hãy soạn Kế hoạch công tác chủ nhiệm chi tiết cho:
- Tuần: ${selectedWeek} (Năm học 2026 - 2027)
- Học kỳ: ${meta.semester}
- Thời gian: Từ ${meta.startDate} đến ${meta.endDate}
- Chủ điểm tuần: ${meta.theme}
- Yêu cầu trọng tâm của GVCN: "${aiFocusPrompt}"

Yêu cầu định dạng trả lời:
Hãy trả về JSON hợp lệ theo đúng cấu trúc sau (không bọc text ngoài JSON nếu có thể):
{
  "title": "Kế hoạch công tác chủ nhiệm Tuần ${selectedWeek}",
  "theme": "${meta.theme}",
  "goals": [
    "Mục tiêu 1",
    "Mục tiêu 2",
    "Mục tiêu 3"
  ],
  "measures": [
    "Biện pháp 1",
    "Biện pháp 2",
    "Biện pháp 3"
  ],
  "tasks": [
    { "day": "Thứ Hai (${meta.startDate})", "content": "Chào cờ...", "responsible": "GVCN & Cả lớp" },
    { "day": "Thứ Ba", "content": "...", "responsible": "Lớp phó học tập" },
    { "day": "Thứ Tư", "content": "...", "responsible": "GVCN" },
    { "day": "Thứ Năm", "content": "...", "responsible": "Tổ trực nhật" },
    { "day": "Thứ Sáu", "content": "...", "responsible": "Ban cán sự lớp" },
    { "day": "Thứ Bảy (${meta.endDate})", "content": "Sinh hoạt lớp...", "responsible": "GVCN & Cả lớp" }
  ],
  "coordination": {
    "subjectTeachers": "Phối hợp với GV môn...",
    "parents": "Thông báo phụ huynh...",
    "youthUnion": "Thực hiện phong trào..."
  }
}`;

    try {
      const response = await sendAIChatMessage(prompt, 'plan', {
        className: '9A2',
        teacher: 'Trần Văn Tiến',
        week: selectedWeek,
      });

      // Parse JSON from response
      let parsedData: any = null;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Could not parse strict JSON, building structured plan from text');
      }

      const generatedPlan: HomeroomPlan = {
        id: `plan-w${selectedWeek}-${Date.now()}`,
        title: parsedData?.title || `Kế hoạch công tác chủ nhiệm Tuần ${selectedWeek} (${meta.label})`,
        period: 'Tuần',
        weekNumber: selectedWeek,
        semester: meta.semester,
        theme: parsedData?.theme || meta.theme,
        startDate: meta.startDate,
        endDate: meta.endDate,
        goals: parsedData?.goals && Array.isArray(parsedData.goals) && parsedData.goals.length > 0
          ? parsedData.goals
          : [
              `Duy trì nề nếp chuyên cần và tác phong học sinh theo chủ điểm: ${meta.theme}`,
              'Nâng cao ý thức tự học, không có học sinh vi phạm quy chế truy bài',
              'Đẩy mạnh tinh thần đoàn kết, giúp đỡ bạn bè cùng tiến bộ',
            ],
        measures: parsedData?.measures && Array.isArray(parsedData.measures) && parsedData.measures.length > 0
          ? parsedData.measures
          : [
              'Phân công ban cán sự và cờ đỏ giám sát nề nếp từng buổi học',
              'Họp ban cán sự đầu tuần để thống nhất nhiệm vụ trọng tâm',
              'Liên hệ trao đổi với phụ huynh các em cần lưu ý đặc biệt',
            ],
        tasks: parsedData?.tasks && Array.isArray(parsedData.tasks) && parsedData.tasks.length > 0
          ? parsedData.tasks.map((t: any, idx: number) => ({
              id: `ai-task-${Date.now()}-${idx}`,
              day: t.day || `Thứ ${idx + 2}`,
              content: t.content || 'Thực hiện công tác nề nếp',
              responsible: t.responsible || 'Ban cán sự & GVCN',
              done: false,
            }))
          : [
              { id: `t1-${Date.now()}`, day: `Thứ Hai (${meta.startDate})`, content: 'Chào cờ đầu tuần, phổ biến nhiệm vụ trọng tâm theo chủ điểm', responsible: 'GVCN & Cả lớp', done: false },
              { id: `t2-${Date.now() + 1}`, day: 'Thứ Ba', content: 'Kiểm tra nề nếp chuẩn bị bài ở nhà và sinh hoạt 15 phút đầu giờ', responsible: 'Lớp phó học tập', done: false },
              { id: `t3-${Date.now() + 2}`, day: 'Thứ Tư', content: 'Trao đổi với giáo viên bộ môn Văn, Toán, Ngoại ngữ', responsible: 'GVCN', done: false },
              { id: `t4-${Date.now() + 3}`, day: 'Thứ Năm', content: 'Vệ sinh phòng học sạch sẽ, kiểm tra thiết bị quạt điện', responsible: 'Tổ trực nhật', done: false },
              { id: `t5-${Date.now() + 4}`, day: 'Thứ Sáu', content: 'Rà soát sổ theo dõi thi đua các tổ, chuẩn bị nội dung sinh hoạt', responsible: 'Lớp trưởng & Bí thư', done: false },
              { id: `t6-${Date.now() + 5}`, day: `Thứ Bảy (${meta.endDate})`, content: 'Tiết sinh hoạt lớp: Tổng kết tuần, xếp loại thi đua tổ', responsible: 'GVCN & Chi đội 9A2', done: false },
            ],
        coordination: parsedData?.coordination || {
          subjectTeachers: 'Thường xuyên trao đổi với các GV bộ môn để kịp thời uốn nắn học sinh',
          parents: 'Nhắc nhở phụ huynh phối hợp quản lý thời gian tự học của con',
          youthUnion: 'Tham gia đầy đủ các hoạt động phong trào do Liên đội phát động',
        },
        reviewNotes: '',
      };

      setAiResultPreview(generatedPlan);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo kế hoạch bằng AI. Vui lòng thử lại!');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Apply AI result
  const handleApplyAIPlan = () => {
    if (!canCreatePlan || !aiResultPreview) return;
    onUpdateState((prev) => ({
      ...prev,
      plans: [
        aiResultPreview,
        ...prev.plans.filter((p) => p.weekNumber !== aiResultPreview.weekNumber),
      ].sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0)),
    }));
    setSelectedWeek(aiResultPreview.weekNumber || selectedWeek);
    setIsAIModalOpen(false);
    setAiResultPreview(null);
  };

  // Copy plan text to clipboard for Zalo/BGH
  const handleCopyPlanText = (plan: HomeroomPlan) => {
    const text = `KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM TUẦN ${plan.weekNumber}
NĂM HỌC ${academicYear} - TRƯỜNG TH&THCS VÕ THỊ SÁU
LỚP: ${className} | GVCN: ${teacherName}
Thời gian: ${plan.startDate} – ${plan.endDate}
Chủ điểm: ${plan.theme || 'Chủ điểm thi đua'}

I. MỤC TIÊU TRỌNG TÂM:
${plan.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

II. BIỆN PHÁP THỰC HIỆN:
${plan.measures.map((m, i) => `${i + 1}. ${m}`).join('\n')}

III. LỊCH CÔNG TÁC CHI TIẾT:
${plan.tasks.map((t) => `• ${t.day}: ${t.content} (Phụ trách: ${t.responsible}) [${t.done ? 'Đã xong' : 'Chưa xong'}]`).join('\n')}

IV. HỌC SINH CẦN LƯU Ý:
${(plan.specialStudents || []).map((s) => `• ${s.studentName}: ${s.reason} -> ${s.actionPlan}`).join('\n') || 'Không có học sinh cá biệt'}

V. ĐÁNH GIÁ RÚT KINH NGHIỆM:
${plan.reviewNotes || 'Đang thực hiện trong tuần'}`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Task statistics
  const totalTasks = activePlan?.tasks.length || 0;
  const completedTasks = activePlan?.tasks.filter((t) => t.done).length || 0;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentMeta = getWeekMeta(selectedWeek);

  return (
    <div className="space-y-5">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1677E8] to-[#073B82] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#17365D]">Kế Hoạch Chủ Nhiệm Từng Tuần</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0B438A] text-[11px] font-bold">
                Chuẩn 35 Tuần Năm Học
              </span>
            </div>
            <p className="text-xs text-[#66809F] mt-0.5">
              Lập mục tiêu, biện pháp, lịch công tác Thứ 2 – Thứ 7 và theo dõi học sinh lớp 9A2
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setShowMatrixModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Xem danh sách 35 tuần năm học"
          >
            <Calendar className="w-4 h-4 text-[#1677E8]" />
            Ma trận 35 tuần
          </button>

          {canCreatePlan && canUseAI && (
            <button
              onClick={() => {
                setAiFocusPrompt(currentMeta.theme);
                setAiResultPreview(null);
                setIsAIModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              <Sparkles className="w-4 h-4" />
              AI Soạn kế hoạch tuần
            </button>
          )}

          {canCreatePlan ? (
            <button
              onClick={() => handleOpenCreateModal(selectedWeek)}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all bg-[#1677E8] hover:bg-blue-600 text-white shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Tạo kế hoạch tuần mới
            </button>
          ) : canProposeTask && activePlan ? (
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all bg-[#1677E8] hover:bg-blue-600 text-white shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Đề xuất công việc tuần
            </button>
          ) : null}
        </div>
      </div>

      {/* Read-Only Notice Banner */}
      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Giao diện đang ở chế độ Chỉ xem:</strong> Khách truy cập có thể xem kế hoạch công tác chủ nhiệm 35 tuần và các nhiệm vụ của lớp. Để lập kế hoạch, phân công hoặc cập nhật tiến độ công việc, vui lòng đăng nhập tài khoản <strong>Giáo viên chủ nhiệm</strong> hoặc <strong>Ban cán sự</strong>.
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full shrink-0">
            Chỉ xem
          </span>
        </div>
      )}

      {/* Role permission info banner */}
      {!readOnly && !isTeacher && currentUser && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#1677E8]" />
            <span>
              Đang tham gia xây dựng kế hoạch với quyền <strong>{currentUser.roleTitle} ({currentUser.name})</strong>:
              {currentUser.teamId
                ? ` Bạn được ủy quyền đề xuất nhiệm vụ công việc và báo cáo hoàn thành cho Tổ ${currentUser.teamId}.`
                : ' Bạn được ủy quyền đề xuất công việc tuần và theo dõi nề nếp chung của lớp.'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full shrink-0">
            {currentUser.teamId ? `Quyền Tổ trưởng Tổ ${currentUser.teamId}` : 'Quyền Ban cán sự'}
          </span>
        </div>
      )}

      {/* Week Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            disabled={selectedWeek <= 1}
            onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Tuần trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="appearance-none bg-blue-50/80 border border-blue-200 text-[#0B438A] font-extrabold text-sm rounded-xl px-4 py-2 pr-9 cursor-pointer hover:bg-blue-100/70 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#1677E8]"
            >
              {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => {
                const plan = plans.find((p) => p.weekNumber === w);
                const meta = getWeekMeta(w);
                return (
                  <option key={w} value={w}>
                    Tuần {w}: {meta.startDate} – {meta.endDate} {plan ? '✓ (Đã có KH)' : '○ (Chưa có)'} {w <= 18 ? '[HK I]' : '[HK II]'}
                  </option>
                );
              })}
            </select>
            <Calendar className="w-4 h-4 text-[#1677E8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            disabled={selectedWeek >= 35}
            onClick={() => setSelectedWeek((prev) => Math.min(35, prev + 1))}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Tuần sau"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
            {selectedWeek <= 18 ? 'Học kỳ I' : 'Học kỳ II'}
          </span>
        </div>

        {/* Current Week Metadata & Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <span className="text-[11px] font-bold text-[#66809F] block">Thời gian học tập:</span>
            <span className="text-xs font-mono font-bold text-[#17365D]">
              {currentMeta.startDate} đến {currentMeta.endDate}
            </span>
          </div>

          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            {activePlan ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Đã lập kế hoạch
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Chưa lập kế hoạch
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: If Plan Exists */}
      {activePlan ? (
        <div className="space-y-5">
          {/* Main Plan Card Header */}
          <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-extrabold text-xs">
                    Tuần {activePlan.weekNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0B438A] font-bold text-xs border border-blue-200">
                    {activePlan.semester === 1 ? 'Học kỳ I' : 'Học kỳ II'}
                  </span>
                  <span className="text-xs text-[#66809F] font-mono">
                    ({currentMeta.startDate} – {currentMeta.endDate})
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#17365D] tracking-tight">{activePlan.title}</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50/70 px-3 py-1.5 rounded-xl border border-indigo-100 inline-flex">
                  <BookmarkCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Chủ điểm tuần: <strong className="font-bold">{activePlan.theme || currentMeta.theme}</strong></span>
                </div>
              </div>

              {/* Action Buttons for Plan */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleCopyPlanText(activePlan)}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Sao chép toàn bộ nội dung kế hoạch"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedText ? 'Đã sao chép' : 'Sao chép'}
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="In kế hoạch theo mẫu Sổ Chủ Nhiệm"
                >
                  <Printer className="w-4 h-4 text-[#1677E8]" />
                  In kế hoạch
                </button>

                {canCreatePlan && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(activePlan)}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Sửa kế hoạch
                    </button>

                    <button
                      onClick={() => handleDeletePlan(activePlan.id)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                      title="Xóa kế hoạch tuần này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Task Progress Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl p-3.5 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {taskProgress}%
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#0B438A]">Tiến độ thực hiện nhiệm vụ tuần:</h4>
                  <p className="text-[11px] text-[#66809F]">
                    Đã hoàn thành <strong>{completedTasks}/{totalTasks}</strong> công việc đã đề ra trong tuần
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-48 bg-white rounded-full h-2.5 overflow-hidden border border-blue-200">
                <div
                  className="bg-gradient-to-r from-[#1677E8] to-[#10B981] h-full transition-all duration-300"
                  style={{ width: `${taskProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Goals & Measures Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Goals */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#0B438A] uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1677E8]" />
                    Mục tiêu trọng tâm
                  </h4>
                  <span className="text-[11px] text-[#66809F] font-semibold">{activePlan.goals.length} mục tiêu</span>
                </div>
                <ul className="space-y-2 text-[#17365D]">
                  {activePlan.goals.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-blue-100/60 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-md bg-blue-100 text-[#1677E8] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Measures */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-emerald-800 uppercase text-[11px] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Biện pháp thực hiện
                  </h4>
                  <span className="text-[11px] text-[#66809F] font-semibold">{activePlan.measures.length} biện pháp</span>
                </div>
                <ul className="space-y-2 text-[#17365D]">
                  {activePlan.measures.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100/60 leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Weekly Timetable of Tasks */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-[#17365D] flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-[#1677E8]" />
                    Lịch công tác chi tiết trong tuần (Thứ Hai – Thứ Bảy):
                  </h4>
                  <p className="text-xs text-[#66809F]">
                    Đánh dấu tick vào công việc khi đã hoàn thành để cập nhật tiến độ
                  </p>
                </div>
                {(canCreatePlan || canProposeTask) && (
                  <button
                    onClick={() => {
                      if (currentUser?.teamId) {
                        setNewTaskInput({
                          day: 'Thứ Ba',
                          content: '',
                          responsible: `Tổ ${currentUser.teamId} & ${currentUser.name}`,
                        });
                      } else if (currentUser?.category === 'Ban cán sự') {
                        setNewTaskInput({
                          day: 'Thứ Ba',
                          content: '',
                          responsible: `${currentUser.roleTitle} & Ban cán sự`,
                        });
                      } else {
                        setNewTaskInput({
                          day: 'Thứ Ba',
                          content: '',
                          responsible: 'Ban cán sự & GVCN',
                        });
                      }
                      setIsNewTaskModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {currentUser?.teamId
                      ? `Đề xuất việc Tổ ${currentUser.teamId}`
                      : !isTeacher
                      ? 'Đề xuất công việc'
                      : 'Thêm công việc'}
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {activePlan.tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    Chưa có công việc nào trong tuần này.
                  </div>
                ) : (
                  activePlan.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-blue-50/40 text-xs ${
                        task.done ? 'bg-gray-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={!canToggleTask}
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            task.done
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : canToggleTask
                              ? 'border-gray-300 hover:border-[#1677E8] bg-white cursor-pointer'
                              : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                          }`}
                        >
                          {task.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <span className="font-bold text-[#0B438A] block mb-0.5">{task.day}</span>
                          <span className={`font-medium ${task.done ? 'line-through text-gray-400' : 'text-[#17365D]'}`}>
                            {task.content}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-md bg-gray-100 text-[#66809F] font-semibold text-[11px]">
                          Phụ trách: {task.responsible}
                        </span>
                        {canCreatePlan && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Xóa công việc"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Special Students to Monitor this Week */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-[#17365D] flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-600" />
                    Học sinh cần quan tâm / theo dõi đặc biệt trong tuần:
                  </h4>
                  <p className="text-xs text-[#66809F]">
                    Lưu ý các em có học lực yếu, hay đi trễ, gia cảnh đặc biệt hoặc cần bồi dưỡng thêm
                  </p>
                </div>
                {canCreatePlan && (
                  <button
                    onClick={() => setIsSpecialStudentModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm học sinh cần lưu ý
                  </button>
                )}
              </div>

              {(!activePlan.specialStudents || activePlan.specialStudents.length === 0) ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center text-xs text-gray-500">
                  Chưa có học sinh nào cần theo dõi đặc biệt trong tuần này.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activePlan.specialStudents.map((item) => (
                    <div
                      key={item.studentId}
                      className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#17365D]">{item.studentName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Cần quan tâm
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium">
                          <strong className="text-gray-900">Vấn đề:</strong> {item.reason}
                        </p>
                        <p className="text-emerald-700 font-medium">
                          <strong className="text-emerald-900">Biện pháp:</strong> {item.actionPlan}
                        </p>
                      </div>
                      {canCreatePlan && (
                        <button
                          onClick={() => handleRemoveSpecialStudent(item.studentId)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                          title="Xóa khỏi danh sách"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coordination Section */}
            {activePlan.coordination && (
              <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3 text-xs">
                <h4 className="font-extrabold text-[#17365D] uppercase text-[11px] flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-[#1677E8]" />
                  Phối hợp công tác trong tuần
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-gray-200/80">
                    <span className="font-bold text-[#0B438A] block mb-1">Với Giáo viên Bộ môn:</span>
                    <p className="text-gray-600 leading-relaxed font-medium">
                      {activePlan.coordination.subjectTeachers || 'Trao đổi định kỳ về tình hình làm bài và nề nếp học tập.'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200/80">
                    <span className="font-bold text-[#0B438A] block mb-1">Với Phụ huynh học sinh:</span>
                    <p className="text-gray-600 leading-relaxed font-medium">
                      {activePlan.coordination.parents || 'Cập nhật tình hình học tập và chuyên cần qua sổ liên lạc Zalo.'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200/80">
                    <span className="font-bold text-[#0B438A] block mb-1">Với Tổng phụ trách Đội:</span>
                    <p className="text-gray-600 leading-relaxed font-medium">
                      {activePlan.coordination.youthUnion || 'Tham gia đầy đủ các phong trào thi đua do Liên đội phát động.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Self-Reflection & End-of-week Evaluation */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-indigo-900 uppercase text-[11px] flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  Đánh giá kết quả & Tự rút kinh nghiệm cuối tuần của GVCN
                </h4>
                {canCreatePlan && (
                  !isEditingReview ? (
                    <button
                      onClick={() => {
                        setReviewNoteText(activePlan.reviewNotes || '');
                        setIsEditingReview(true);
                      }}
                      className="text-[#1677E8] font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {activePlan.reviewNotes ? 'Sửa đánh giá' : 'Viết đánh giá cuối tuần'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditingReview(false)}
                        className="px-2.5 py-1 rounded-md bg-gray-200 text-gray-700 font-bold text-[11px]"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveReviewNotes}
                        className="px-3 py-1 rounded-md bg-[#1677E8] text-white font-bold text-[11px]"
                      >
                        Lưu đánh giá
                      </button>
                    </div>
                  )
                )}
              </div>

              {isEditingReview ? (
                <textarea
                  rows={3}
                  value={reviewNoteText}
                  onChange={(e) => setReviewNoteText(e.target.value)}
                  placeholder="Ghi lại những ưu điểm, tồn tại cần khắc phục và định hướng cho tuần tiếp theo..."
                  className="w-full p-3 rounded-xl border border-indigo-200 bg-white text-xs text-[#17365D] focus:ring-2 focus:ring-[#1677E8]"
                ></textarea>
              ) : (
                <p className="text-gray-700 italic leading-relaxed bg-white/80 p-3 rounded-xl border border-indigo-100">
                  {activePlan.reviewNotes || 'Chưa có ghi chép đánh giá cuối tuần.'}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: If No Plan for Selected Week */
        <div className="bg-white rounded-2xl border border-dashed border-[#D8E7FA] p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1677E8] flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-[#17365D]">
              Chưa có kế hoạch cho Tuần {selectedWeek}
            </h3>
            <p className="text-xs text-[#66809F]">
              Thời gian: <strong>{currentMeta.startDate} – {currentMeta.endDate}</strong> ({currentMeta.semester === 1 ? 'Học kỳ I' : 'Học kỳ II'})
            </p>
            <p className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg inline-block mt-2">
              Chủ điểm gợi ý: {currentMeta.theme}
            </p>
          </div>

          {canCreatePlan && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => handleOpenCreateModal(selectedWeek)}
                className="px-4 py-2.5 rounded-xl bg-[#1677E8] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                Tạo kế hoạch theo mẫu chuẩn
              </button>

              {canUseAI && (
                <button
                  onClick={() => {
                    setAiFocusPrompt(currentMeta.theme);
                    setAiResultPreview(null);
                    setIsAIModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  AI soạn kế hoạch cho Tuần {selectedWeek}
                </button>
              )}

              {selectedWeek > 1 && plans.some((p) => p.weekNumber === selectedWeek - 1) && (
                <button
                  onClick={handleCopyFromPreviousWeek}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold text-xs flex items-center gap-2"
                >
                  <Copy className="w-4 h-4 text-[#1677E8]" />
                  Sao chép từ Tuần {selectedWeek - 1}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Weekly Student Cleaning Duty Roster for Selected Week */}
      <WeeklyDutyRosterPanel
        appState={appState}
        selectedWeek={selectedWeek}
        onSelectWeek={(w) => setSelectedWeek(w)}
        onUpdateState={onUpdateState}
      />

      {/* MODAL 1: Create or Edit Plan Full Form */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#D8E7FA] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/40 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#1677E8]" />
                <h3 className="font-extrabold text-[#17365D] text-sm">
                  {isCreatingNew ? `Tạo Kế hoạch Tuần ${formWeek}` : `Chỉnh sửa Kế hoạch Tuần ${formWeek}`}
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#17365D]">
              {/* Week & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-[#17365D] block mb-1">Tuần số (1–35)</label>
                  <select
                    value={formWeek}
                    onChange={(e) => {
                      const w = Number(e.target.value);
                      const meta = getWeekMeta(w);
                      setFormWeek(w);
                      setFormStartDate(meta.startDate);
                      setFormEndDate(meta.endDate);
                      setFormTheme(meta.theme);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                  >
                    {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Tuần {w} ({w <= 18 ? 'HK I' : 'HK II'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="font-bold text-[#17365D] block mb-1">Tiêu đề kế hoạch</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1677E8]"
                  />
                </div>
              </div>

              {/* Theme & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="font-bold text-[#17365D] block mb-1">Chủ điểm tuần</label>
                  <input
                    type="text"
                    value={formTheme}
                    onChange={(e) => setFormTheme(e.target.value)}
                    placeholder="Chủ điểm thi đua..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#17365D] block mb-1">Từ ngày (Thứ Hai)</label>
                  <input
                    type="text"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#17365D] block mb-1">Đến ngày (Thứ Bảy)</label>
                  <input
                    type="text"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono"
                  />
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <label className="font-bold text-[#0B438A] uppercase text-[11px] block">
                  Mục tiêu trọng tâm:
                </label>
                <div className="space-y-1.5">
                  {formGoals.map((g, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={g}
                        onChange={(e) => {
                          const updated = [...formGoals];
                          updated[idx] = e.target.value;
                          setFormGoals(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                      />
                      <button
                        onClick={() => setFormGoals(formGoals.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Thêm mục tiêu mới..."
                    value={newGoalInput}
                    onChange={(e) => setNewGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newGoalInput.trim()) {
                        setFormGoals([...formGoals, newGoalInput.trim()]);
                        setNewGoalInput('');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                  />
                  <button
                    onClick={() => {
                      if (newGoalInput.trim()) {
                        setFormGoals([...formGoals, newGoalInput.trim()]);
                        setNewGoalInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1677E8] font-bold text-xs"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Measures */}
              <div className="space-y-2">
                <label className="font-bold text-emerald-800 uppercase text-[11px] block">
                  Biện pháp thực hiện:
                </label>
                <div className="space-y-1.5">
                  {formMeasures.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => {
                          const updated = [...formMeasures];
                          updated[idx] = e.target.value;
                          setFormMeasures(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                      />
                      <button
                        onClick={() => setFormMeasures(formMeasures.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Thêm biện pháp mới..."
                    value={newMeasureInput}
                    onChange={(e) => setNewMeasureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newMeasureInput.trim()) {
                        setFormMeasures([...formMeasures, newMeasureInput.trim()]);
                        setNewMeasureInput('');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                  />
                  <button
                    onClick={() => {
                      if (newMeasureInput.trim()) {
                        setFormMeasures([...formMeasures, newMeasureInput.trim()]);
                        setNewMeasureInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Coordination */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="font-bold text-[#17365D] uppercase text-[11px] block">
                  Phối hợp công tác:
                </label>
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] text-[#66809F] font-semibold block mb-0.5">Với GV Bộ môn:</span>
                    <input
                      type="text"
                      value={formCoordination.subjectTeachers}
                      onChange={(e) => setFormCoordination({ ...formCoordination, subjectTeachers: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#66809F] font-semibold block mb-0.5">Với Phụ huynh học sinh:</span>
                    <input
                      type="text"
                      value={formCoordination.parents}
                      onChange={(e) => setFormCoordination({ ...formCoordination, parents: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#66809F] font-semibold block mb-0.5">Với Tổng phụ trách Đội:</span>
                    <input
                      type="text"
                      value={formCoordination.youthUnion}
                      onChange={(e) => setFormCoordination({ ...formCoordination, youthUnion: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50 sticky bottom-0">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleSavePlan}
                className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-blue-600 text-white font-bold text-xs shadow-sm"
              >
                Lưu Kế hoạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 35-Week Overview Matrix */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#D8E7FA] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/40 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1677E8]" />
                <h3 className="font-extrabold text-[#17365D] text-sm">
                  Ma trận Kế hoạch 35 Tuần Năm học {academicYear}
                </h3>
              </div>
              <button onClick={() => setShowMatrixModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Semester Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                  onClick={() => setSemesterFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    semesterFilter === 'all'
                      ? 'bg-[#1677E8] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Tất cả 35 tuần
                </button>
                <button
                  onClick={() => setSemesterFilter('hk1')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    semesterFilter === 'hk1'
                      ? 'bg-[#1677E8] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Học kỳ I (Tuần 1 – 18)
                </button>
                <button
                  onClick={() => setSemesterFilter('hk2')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    semesterFilter === 'hk2'
                      ? 'bg-[#1677E8] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Học kỳ II (Tuần 19 – 35)
                </button>
              </div>

              {/* 35 Weeks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                {filteredWeeks.map((item) => (
                  <div
                    key={item.weekNumber}
                    onClick={() => {
                      setSelectedWeek(item.weekNumber);
                      setShowMatrixModal(false);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative hover:shadow-md ${
                      item.weekNumber === selectedWeek
                        ? 'border-[#1677E8] bg-blue-50/60 ring-2 ring-blue-400'
                        : item.hasPlan
                        ? 'border-emerald-200 bg-white hover:border-emerald-400'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-[#17365D]">Tuần {item.weekNumber}</span>
                      {item.hasPlan ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          ✓ Đã lập
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-bold text-[10px]">
                          ○ Trống
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-mono text-[#66809F] mb-1.5">{item.meta.label}</p>
                    <p className="text-[11px] text-gray-700 line-clamp-1 font-medium">{item.meta.theme}</p>

                    {item.hasPlan && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">{item.doneCount}/{item.totalTasks} việc xong</span>
                        <span className="font-bold text-emerald-600">{item.progress}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50 sticky bottom-0">
              <button
                onClick={() => setShowMatrixModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#D8E7FA]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
              <h3 className="font-bold text-[#17365D] text-sm">Thêm nhiệm vụ mới vào Kế hoạch Tuần {selectedWeek}</h3>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Thời gian thực hiện</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thứ Ba, Đầu giờ, Tiết sinh hoạt..."
                  value={newTaskInput.day}
                  onChange={(e) => setNewTaskInput({ ...newTaskInput, day: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Nội dung công việc</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả cụ thể công việc cần thực hiện..."
                  value={newTaskInput.content}
                  onChange={(e) => setNewTaskInput({ ...newTaskInput, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                ></textarea>
              </div>
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Người phụ trách</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lớp trưởng, Tổ 1, GVCN..."
                  value={newTaskInput.responsible}
                  onChange={(e) => setNewTaskInput({ ...newTaskInput, responsible: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button onClick={() => setIsNewTaskModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-xs font-bold">
                Hủy
              </button>
              <button onClick={handleAddTask} className="px-4 py-1.5 rounded-lg bg-[#1677E8] text-white text-xs font-bold">
                Thêm nhiệm vụ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Special Student Concern */}
      {isSpecialStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#D8E7FA]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/60">
              <h3 className="font-bold text-[#17365D] text-sm">Thêm học sinh cần theo dõi đặc biệt</h3>
              <button onClick={() => setIsSpecialStudentModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Chọn học sinh lớp 9A2:</label>
                <select
                  value={specialStudentInput.studentId}
                  onChange={(e) => setSpecialStudentInput({ ...specialStudentInput, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} - Tổ {s.teamId} ({s.academicRank} / {s.conductRank})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Vấn đề / Lý do cần lưu ý:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hay đi trễ 5-10 phút, hổng kiến thức môn Toán..."
                  value={specialStudentInput.reason}
                  onChange={(e) => setSpecialStudentInput({ ...specialStudentInput, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Biện pháp hỗ trợ / Kế hoạch xử lý:</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Phân công bạn Minh Anh kèm cặp, liên hệ phụ huynh sau giờ học..."
                  value={specialStudentInput.actionPlan}
                  onChange={(e) => setSpecialStudentInput({ ...specialStudentInput, actionPlan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                ></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button onClick={() => setIsSpecialStudentModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-xs font-bold">
                Hủy
              </button>
              <button onClick={handleAddSpecialStudent} className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold">
                Thêm vào theo dõi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: AI Plan Generator Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#D8E7FA] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/60 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-[#17365D] text-sm">
                  Trợ lý Gemini AI Soạn Kế Hoạch Tuần {selectedWeek}
                </h3>
              </div>
              <button onClick={() => setIsAIModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#17365D]">
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-purple-900">
                <p className="font-bold">Tuần {selectedWeek}: {currentMeta.startDate} – {currentMeta.endDate} ({currentMeta.semester === 1 ? 'Học kỳ I' : 'Học kỳ II'})</p>
                <p className="text-[11px] mt-0.5 text-purple-700">Chủ điểm: {currentMeta.theme}</p>
              </div>

              <div>
                <label className="font-bold text-[#17365D] block mb-1.5">
                  Chọn hoặc nhập trọng tâm đặc biệt của tuần này:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    'Ổn định nề nếp, thi đua học tốt',
                    'Ôn tập kiểm tra giữa học kỳ',
                    'Thi đua chào mừng Ngày 20/11',
                    'Đại hội Chi đội & Kiện toàn ban cán sự',
                    'Tăng cường phụ đạo học sinh yếu kém',
                    'Nước rút chuẩn bị thi vào lớp 10 THPT',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setAiFocusPrompt(sug)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-100 text-[#17365D] font-medium text-[11px] transition-colors"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={aiFocusPrompt}
                  onChange={(e) => setAiFocusPrompt(e.target.value)}
                  placeholder="Nhập yêu cầu trọng tâm của thầy/cô..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                ></textarea>
              </div>

              <div className="flex justify-center">
                <button
                  disabled={isGeneratingAI}
                  onClick={handleGenerateAIPlan}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingAI ? 'AI đang phân tích và soạn kế hoạch...' : 'Bắt đầu AI Soạn Kế Hoạch'}
                </button>
              </div>

              {/* Preview AI Result */}
              {aiResultPreview && (
                <div className="mt-4 p-4 rounded-xl border border-purple-200 bg-purple-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-purple-900 text-sm">
                      Dự thảo Kế hoạch Tuần {aiResultPreview.weekNumber} do AI tạo
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Đã sẵn sàng
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#0B438A] mb-1">Mục tiêu:</h5>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                      {aiResultPreview.goals.map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-bold text-emerald-800 mb-1">Biện pháp:</h5>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                      {aiResultPreview.measures.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#17365D] mb-1">Lịch Thứ 2 – Thứ 7 ({aiResultPreview.tasks.length} công việc):</h5>
                    <div className="space-y-1">
                      {aiResultPreview.tasks.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                          <span><strong>{t.day}:</strong> {t.content}</span>
                          <span className="text-gray-500 font-mono text-[10px]">({t.responsible})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50 sticky bottom-0">
              <button
                onClick={() => setIsAIModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs"
              >
                Đóng
              </button>
              {aiResultPreview && (
                <button
                  onClick={handleApplyAIPlan}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Áp dụng Kế hoạch này
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Print Preview (Sổ Chủ Nhiệm chuẩn Bộ GD&ĐT) */}
      {isPrintModalOpen && activePlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 sticky top-0 z-10 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#1677E8]" />
                <h3 className="font-extrabold text-[#17365D] text-sm">
                  Xem bản in: Kế hoạch công tác chủ nhiệm Tuần {activePlan.weekNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-[#1677E8] text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  In ngay
                </button>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Print Layout */}
            <div className="p-8 font-serif text-[#17365D] space-y-6 text-sm leading-relaxed">
              <div className="flex justify-between items-start text-xs font-sans">
                <div className="text-center font-bold">
                  <p className="uppercase">{schoolName}</p>
                  <p>LỚP CHỦ NHIỆM: {className}</p>
                  <div className="w-16 h-px bg-black mx-auto my-1"></div>
                </div>
                <div className="text-center font-bold">
                  <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p>Độc lập – Tự do – Hạnh phúc</p>
                  <div className="w-24 h-px bg-black mx-auto my-1"></div>
                </div>
              </div>

              <div className="text-center space-y-1 pt-2 font-sans">
                <h2 className="text-base font-black uppercase text-black">
                  KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM TUẦN {activePlan.weekNumber}
                </h2>
                <p className="text-xs italic text-gray-700">
                  (Từ ngày {activePlan.startDate} đến ngày {activePlan.endDate} – Năm học {academicYear})
                </p>
                <p className="text-xs font-bold text-black mt-1">
                  Chủ điểm: {activePlan.theme || currentMeta.theme}
                </p>
              </div>

              {/* Goals */}
              <div className="space-y-1">
                <h3 className="font-bold font-sans text-xs uppercase text-black">I. MỤC TIÊU TRỌNG TÂM:</h3>
                <ul className="list-decimal list-inside space-y-1 pl-2 text-xs">
                  {activePlan.goals.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>

              {/* Measures */}
              <div className="space-y-1">
                <h3 className="font-bold font-sans text-xs uppercase text-black">II. BIỆN PHÁP THỰC HIỆN:</h3>
                <ul className="list-decimal list-inside space-y-1 pl-2 text-xs">
                  {activePlan.measures.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              {/* Tasks Table */}
              <div className="space-y-1">
                <h3 className="font-bold font-sans text-xs uppercase text-black">III. LỊCH CÔNG TÁC CHI TIẾT:</h3>
                <table className="w-full border-collapse border border-black text-xs font-sans">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left w-36">Thời gian</th>
                      <th className="border border-black p-2 text-left">Nội dung công việc</th>
                      <th className="border border-black p-2 text-center w-32">Người phụ trách</th>
                      <th className="border border-black p-2 text-center w-20">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlan.tasks.map((t, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-2 font-bold">{t.day}</td>
                        <td className="border border-black p-2">{t.content}</td>
                        <td className="border border-black p-2 text-center">{t.responsible}</td>
                        <td className="border border-black p-2 text-center font-bold">
                          {t.done ? 'Đạt' : 'Chưa'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Special Students */}
              {activePlan.specialStudents && activePlan.specialStudents.length > 0 && (
                <div className="space-y-1">
                  <h3 className="font-bold font-sans text-xs uppercase text-black">IV. HỌC SINH CẦN THEO DÕI ĐẶC BIỆT:</h3>
                  <table className="w-full border-collapse border border-black text-xs font-sans">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left w-48">Họ và tên học sinh</th>
                        <th className="border border-black p-2 text-left">Vấn đề cần lưu ý</th>
                        <th className="border border-black p-2 text-left">Biện pháp hỗ trợ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePlan.specialStudents.map((s, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 font-bold">{s.studentName}</td>
                          <td className="border border-black p-2">{s.reason}</td>
                          <td className="border border-black p-2">{s.actionPlan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-8 flex justify-between font-sans text-xs">
                <div className="text-center space-y-16">
                  <p className="font-bold uppercase">BAN GIÁM HIỆU DUYỆT</p>
                  <p className="italic text-gray-500">(Ký và ghi rõ họ tên)</p>
                </div>
                <div className="text-center space-y-16">
                  <div>
                    <p className="italic">Hà Nội, ngày {activePlan.startDate}</p>
                    <p className="font-bold uppercase mt-1">GIÁO VIÊN CHỦ NHIỆM</p>
                  </div>
                  <p className="font-bold">{teacherName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
