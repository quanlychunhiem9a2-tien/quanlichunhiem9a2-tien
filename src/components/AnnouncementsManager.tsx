import React, { useState } from 'react';
import {
  Megaphone,
  Calendar,
  CheckSquare,
  Users,
  FileText,
  Plus,
  Search,
  Pin,
  Edit3,
  Trash2,
  MapPin,
  Clock,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Filter,
  Lock,
  Bell,
} from 'lucide-react';
import { AppState, Notice, Task } from '../types';
import { isReadOnly, isTeacher, hasPermission } from '../utils/permissionUtils';

interface AnnouncementsManagerProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

const CATEGORIES: NonNullable<Notice['category']>[] = [
  'Thông báo chung',
  'Công việc lớp',
  'Sự kiện',
  'Học tập - Thi cử',
  'Họp phụ huynh',
];

export const AnnouncementsManager: React.FC<AnnouncementsManagerProps> = ({
  appState,
  onUpdateState,
}) => {
  const { notices, tasks, className, teacherName, currentUser } = appState;
  const readOnly = isReadOnly(appState);
  const isGVCN = isTeacher(appState);
  const canManageNotices =
    !readOnly &&
    (isGVCN ||
      hasPermission(appState, 'canCreateOfficialPlan') ||
      hasPermission(appState, 'canProposePlanTask'));
  const canToggleTasks = !readOnly && (isGVCN || hasPermission(appState, 'canToggleTasks'));

  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal state for creating / editing an announcement or event
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NonNullable<Notice['category']>>('Thông báo chung');
  const [timeInfo, setTimeInfo] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [targetAudience, setTargetAudience] = useState('Toàn lớp & Phụ huynh');
  const [priority, setPriority] = useState<'Khẩn' | 'Quan trọng' | 'Thường'>('Quan trọng');
  const [isPinned, setIsPinned] = useState(false);
  const [description, setDescription] = useState('');
  const [alsoAddToTasks, setAlsoAddToTasks] = useState(false);

  // Quick new task input in right panel
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Quan trọng' | 'Thường' | 'Thấp'>('Thường');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Cả lớp');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const getIconTypeByCategory = (
    cat: NonNullable<Notice['category']>
  ): Notice['iconType'] => {
    switch (cat) {
      case 'Sự kiện':
        return 'users';
      case 'Công việc lớp':
        return 'document';
      case 'Học tập - Thi cử':
        return 'calendar';
      case 'Họp phụ huynh':
      case 'Thông báo chung':
      default:
        return 'megaphone';
    }
  };

  const openCreateModal = (presetCategory?: NonNullable<Notice['category']>) => {
    if (!canManageNotices) return;
    setEditingId(null);
    setTitle('');
    const cat = presetCategory || 'Thông báo chung';
    setCategory(cat);
    setTimeInfo('');
    const todayStr = new Date().toLocaleDateString('vi-VN');
    setDate(todayStr);
    setLocation(`Phòng học ${className}`);
    setTargetAudience('Toàn lớp & Phụ huynh');
    setPriority('Quan trọng');
    setIsPinned(cat === 'Họp phụ huynh' || cat === 'Sự kiện');
    setDescription('');
    setAlsoAddToTasks(cat === 'Công việc lớp');
    setModalOpen(true);
  };

  const openEditModal = (notice: Notice) => {
    if (!canManageNotices) return;
    setEditingId(notice.id);
    setTitle(notice.title);
    setCategory(notice.category || 'Thông báo chung');
    setTimeInfo(notice.timeInfo || '');
    setDate(notice.date || '');
    setLocation(notice.location || '');
    setTargetAudience(notice.targetAudience || 'Toàn lớp & Phụ huynh');
    setPriority(notice.priority || 'Quan trọng');
    setIsPinned(Boolean(notice.isPinned));
    setDescription(notice.description || '');
    setAlsoAddToTasks(false);
    setModalOpen(true);
  };

  const handleSaveNotice = () => {
    if (!canManageNotices || !title.trim()) return;

    const authorName = isGVCN
      ? `GVCN ${teacherName}`
      : `${currentUser?.name || 'Ban cán sự'} (${currentUser?.roleTitle || 'Cán sự lớp'})`;

    const formattedTimeInfo =
      timeInfo.trim() ||
      (date.trim() ? `Thời gian: ${date.trim()}` : 'Thông báo mới trong tuần');

    if (editingId) {
      onUpdateState((prev) => ({
        ...prev,
        notices: prev.notices.map((n) =>
          n.id === editingId
            ? {
                ...n,
                title: title.trim(),
                category,
                timeInfo: formattedTimeInfo,
                date: date.trim(),
                location: location.trim(),
                targetAudience: targetAudience.trim(),
                priority,
                isPinned,
                description: description.trim(),
                iconType: getIconTypeByCategory(category),
              }
            : n
        ),
      }));
      showToast('Đã cập nhật nội dung thông báo / sự kiện!');
    } else {
      const newNotice: Notice = {
        id: `not-${Date.now()}`,
        title: title.trim(),
        category,
        timeInfo: formattedTimeInfo,
        relativeTime: 'Vừa đăng',
        iconType: getIconTypeByCategory(category),
        date: date.trim() || new Date().toLocaleDateString('vi-VN'),
        location: location.trim(),
        targetAudience: targetAudience.trim(),
        priority,
        isPinned,
        author: authorName,
        description: description.trim(),
      };

      onUpdateState((prev) => {
        const updatedTasks = [...prev.tasks];
        if (alsoAddToTasks) {
          updatedTasks.unshift({
            id: `task-${Date.now()}`,
            title: title.trim(),
            priority: priority === 'Khẩn' || priority === 'Quan trọng' ? 'Quan trọng' : 'Thường',
            dueDate: date.trim() || new Date().toLocaleDateString('vi-VN'),
            completed: false,
            assignedTo: targetAudience.trim() || 'Cả lớp',
            category: category,
          });
        }
        return {
          ...prev,
          notices: [newNotice, ...prev.notices],
          tasks: updatedTasks,
        };
      });
      showToast('Đã đăng thông báo mới lên bảng tin lớp!');
    }

    setModalOpen(false);
  };

  const handleTogglePin = (id: string) => {
    if (!canManageNotices) return;
    onUpdateState((prev) => ({
      ...prev,
      notices: prev.notices.map((n) =>
        n.id === id ? { ...n, isPinned: !n.isPinned } : n
      ),
    }));
  };

  const handleDeleteNotice = (id: string) => {
    if (!canManageNotices) return;
    onUpdateState((prev) => ({
      ...prev,
      notices: prev.notices.filter((n) => n.id !== id),
    }));
    setDeleteConfirmId(null);
    showToast('Đã xóa thông báo khỏi bảng tin!');
  };

  const handleAddTask = () => {
    if (!canManageNotices || !newTaskTitle.trim()) return;
    const taskItem: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      dueDate: newTaskDueDate.trim() || new Date().toLocaleDateString('vi-VN'),
      completed: false,
      assignedTo: newTaskAssignee.trim() || 'Cả lớp',
      category: 'Công việc lớp',
    };
    onUpdateState((prev) => ({
      ...prev,
      tasks: [taskItem, ...prev.tasks],
    }));
    setNewTaskTitle('');
    setNewTaskDueDate('');
    showToast('Đã giao thêm việc mới cho lớp!');
  };

  const handleToggleTask = (taskId: string) => {
    if (!canToggleTasks) return;
    onUpdateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    if (!canManageNotices) return;
    onUpdateState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleCopyNotice = (n: Notice) => {
    const text = `📢 THÔNG BÁO ${className.toUpperCase()} - ${n.category?.toUpperCase() || 'THÔNG BÁO'}\n📌 Tiêu đề: ${n.title}\n⏰ ${n.timeInfo}${n.location ? `\n📍 Địa điểm: ${n.location}` : ''}${n.targetAudience ? `\n👥 Đối tượng: ${n.targetAudience}` : ''}\n📝 Nội dung: ${n.description || ''}\n— ${n.author || `GVCN ${teacherName}`}`;
    navigator.clipboard.writeText(text);
    setCopiedId(n.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered notices (pinned first)
  const filteredNotices = notices
    .filter((n) => {
      const cat = n.category || 'Thông báo chung';
      const matchesCat = selectedCategory === 'Tất cả' || cat === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.timeInfo || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const totalAnnouncements = notices.length;
  const eventCount = notices.filter(
    (n) => n.category === 'Sự kiện' || n.category === 'Họp phụ huynh' || n.iconType === 'users'
  ).length;
  const pendingTasksCount = tasks.filter((t) => !t.completed).length;
  const pinnedCount = notices.filter((n) => n.isPinned).length;

  const getCategoryBadgeStyle = (cat?: Notice['category']) => {
    switch (cat) {
      case 'Sự kiện':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Công việc lớp':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Học tập - Thi cử':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Họp phụ huynh':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-50 text-[#1677E8] border-blue-200';
    }
  };

  const getPriorityBadgeStyle = (prio?: Notice['priority']) => {
    switch (prio) {
      case 'Khẩn':
        return 'bg-red-600 text-white';
      case 'Quan trọng':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#073B82] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1677E8] text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg lg:text-xl font-extrabold text-[#17365D] uppercase tracking-tight">
                  THÔNG BÁO, CÔNG VIỆC & SỰ KIỆN LỚP HỌC
                </h1>
                {readOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-3 h-3" /> Chế độ xem
                  </span>
                )}
              </div>
              <p className="text-xs text-[#66809F] font-medium">
                Bảng tin chính thức của {className} — Cập nhật các thông báo, phân công công việc và sự kiện hoạt động
              </p>
            </div>
          </div>
        </div>

        {canManageNotices && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openCreateModal('Công việc lớp')}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              + Giao việc lớp
            </button>
            <button
              onClick={() => openCreateModal('Sự kiện')}
              className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              + Tạo sự kiện
            </button>
            <button
              onClick={() => openCreateModal('Thông báo chung')}
              className="px-4 py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#073B82] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Đăng thông báo mới
            </button>
          </div>
        )}
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Tổng số thông báo</p>
            <h3 className="text-xl font-black text-[#17365D]">{totalAnnouncements} bản tin</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Sự kiện & Hoạt động</p>
            <h3 className="text-xl font-black text-[#17365D]">{eventCount} sự kiện</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Việc lớp đang thực hiện</p>
            <h3 className="text-xl font-black text-[#17365D]">{pendingTasksCount} công việc</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#D8E7FA] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Pin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#66809F] font-medium">Tin ghim quan trọng</p>
            <h3 className="text-xl font-black text-[#17365D]">{pinnedCount} tin ghim</h3>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns: Announcements & Events Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#D8E7FA] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm thông báo, sự kiện, lịch thi, công việc..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#1677E8]"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#66809F] font-semibold shrink-0">
                <Filter className="w-3.5 h-3.5 text-[#1677E8]" />
                <span>Hiển thị: {filteredNotices.length} mục</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {['Tất cả', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1677E8] text-white shadow-xs'
                      : 'bg-gray-100 text-[#17365D] hover:bg-blue-50 hover:text-[#1677E8]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Feed List */}
          {filteredNotices.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-[#D8E7FA] text-center space-y-2">
              <Megaphone className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-[#17365D]">Chưa có thông báo hoặc sự kiện nào phù hợp</p>
              <p className="text-xs text-[#66809F]">
                Hãy thử đổi bộ lọc danh mục hoặc đăng thông báo mới cho lớp.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredNotices.map((notice) => {
                const cat = notice.category || 'Thông báo chung';
                return (
                  <div
                    key={notice.id}
                    className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                      notice.isPinned
                        ? 'border-[#1677E8] ring-1 ring-blue-500/15 bg-gradient-to-br from-white to-blue-50/20'
                        : 'border-[#D8E7FA] hover:border-blue-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {notice.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#1677E8] text-white text-[11px] font-bold">
                            <Pin className="w-3 h-3" /> Đã ghim
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getCategoryBadgeStyle(
                            cat
                          )}`}
                        >
                          {cat}
                        </span>
                        {notice.priority && (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold ${getPriorityBadgeStyle(
                              notice.priority
                            )}`}
                          >
                            {notice.priority === 'Khẩn' ? '🔥 Khẩn' : notice.priority}
                          </span>
                        )}
                        <span className="text-[11px] text-[#66809F] font-medium">
                          • {notice.relativeTime}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyNotice(notice)}
                          title="Sao chép nội dung gửi nhóm Zalo lớp / Phụ huynh"
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 text-[#17365D] hover:text-[#1677E8] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedId === notice.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Zalo</span>
                            </>
                          )}
                        </button>

                        {canManageNotices && (
                          <>
                            <button
                              onClick={() => handleTogglePin(notice.id)}
                              title={notice.isPinned ? 'Bỏ ghim thông báo' : 'Ghim lên đầu bảng tin'}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                notice.isPinned
                                  ? 'bg-blue-50 border-blue-200 text-[#1677E8]'
                                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-[#1677E8]'
                              }`}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(notice)}
                              title="Chỉnh sửa thông báo / sự kiện"
                              className="p-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 text-gray-600 hover:text-[#1677E8] transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {deleteConfirmId === notice.id ? (
                              <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5">
                                <span className="text-[10.5px] font-bold text-red-700">Xóa?</span>
                                <button
                                  onClick={() => handleDeleteNotice(notice.id)}
                                  className="text-[10.5px] font-extrabold text-white bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded cursor-pointer"
                                >
                                  Có
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[10.5px] font-bold text-gray-600 hover:text-gray-900 px-1 cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(notice.id)}
                                title="Xóa thông báo"
                                className="p-1.5 rounded-lg bg-gray-50 hover:bg-red-50 border border-gray-200 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-extrabold text-[#17365D] mb-1.5">
                      {notice.title}
                    </h3>
                    {notice.description && (
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line mb-3">
                        {notice.description}
                      </p>
                    )}

                    {/* Meta Info Pills (Time, Location, Audience, Author) */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-[11.5px] text-[#66809F]">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#1677E8]">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {notice.timeInfo}
                      </span>
                      {notice.location && (
                        <span className="inline-flex items-center gap-1 font-medium text-[#17365D]">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {notice.location}
                        </span>
                      )}
                      {notice.targetAudience && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {notice.targetAudience}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] font-semibold text-[#073B82]">
                        Đăng bởi: {notice.author || `GVCN ${teacherName}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Class Tasks & Upcoming Events Checklist */}
        <div className="space-y-5">
          {/* Card 1: Các việc cần làm của lớp (Tasks) */}
          <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#1677E8]" />
                <h3 className="text-sm font-extrabold text-[#17365D]">
                  Các việc cần làm của lớp ({tasks.filter((t) => !t.completed).length})
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[#1677E8] bg-blue-50 px-2 py-0.5 rounded-md">
                Hoàn thành {tasks.filter((t) => t.completed).length}/{tasks.length}
              </span>
            </div>

            {/* Quick Add Task Form for GVCN / Authorized Officers */}
            {canManageNotices && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50/50 border border-[#D8E7FA] space-y-2">
                <p className="text-[11px] font-bold text-[#073B82]">
                  + Giao nhanh đầu việc cho lớp / cán sự:
                </p>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Nhập tên công việc cần thông báo..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs focus:outline-none focus:border-[#1677E8]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    placeholder="Hạn (VD: 20/09/2026)"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs focus:outline-none focus:border-[#1677E8]"
                  />
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    placeholder="Phụ trách (Cả lớp...)"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs focus:outline-none focus:border-[#1677E8]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <select
                    value={newTaskPriority}
                    onChange={(e) =>
                      setNewTaskPriority(e.target.value as 'Quan trọng' | 'Thường' | 'Thấp')
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-[#17365D]"
                  >
                    <option value="Quan trọng">Ưu tiên: Quan trọng</option>
                    <option value="Thường">Ưu tiên: Thường</option>
                    <option value="Thấp">Ưu tiên: Thấp</option>
                  </select>
                  <button
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#1677E8] hover:bg-[#073B82] disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                  >
                    Thêm việc
                  </button>
                </div>
              </div>
            )}

            {/* Task List */}
            <div className="divide-y divide-gray-100 mt-3 max-h-[420px] overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="py-2.5 flex items-start justify-between gap-2.5 group"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      disabled={!canToggleTasks}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-0.5 w-4 h-4 rounded text-[#1677E8] focus:ring-[#1677E8] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        onClick={() => canToggleTasks && handleToggleTask(task.id)}
                        className={`text-xs font-semibold leading-snug ${
                          canToggleTasks ? 'cursor-pointer' : ''
                        } ${
                          task.completed
                            ? 'line-through text-gray-400'
                            : 'text-[#17365D] group-hover:text-[#1677E8]'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10.5px] text-[#66809F]">
                        <span className="font-mono">Hạn: {task.dueDate}</span>
                        {task.assignedTo && <span>• Giao: {task.assignedTo}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        task.priority === 'Quan trọng'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}
                    >
                      {task.priority}
                    </span>
                    {canManageNotices && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        title="Xóa công việc"
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Lịch Sự kiện & Hoạt động nổi bật */}
          <div className="bg-gradient-to-br from-[#073B82] to-[#1677E8] rounded-2xl p-5 text-white shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">Sự kiện & Lịch quan trọng</h3>
                <p className="text-[11px] text-blue-100">
                  Các mốc sự kiện học tập & phong trào sắp diễn ra
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {notices
                .filter(
                  (n) =>
                    n.category === 'Sự kiện' ||
                    n.category === 'Họp phụ huynh' ||
                    n.category === 'Học tập - Thi cử'
                )
                .slice(0, 4)
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                        {ev.category || 'Sự kiện'}
                      </span>
                      {ev.date && (
                        <span className="text-[11px] font-mono font-bold text-amber-300">
                          {ev.date}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{ev.title}</h4>
                    <p className="text-[11px] text-blue-100">{ev.timeInfo}</p>
                    {ev.location && (
                      <p className="text-[10.5px] text-blue-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {ev.location}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Announcement & Event Modal */}
      {modalOpen && canManageNotices && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#1677E8]" />
                <h3 className="font-extrabold text-[#17365D] text-sm">
                  {editingId
                    ? 'Chỉnh sửa Thông báo / Sự kiện'
                    : 'Đăng Thông báo / Công việc / Sự kiện mới'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Tiêu đề thông báo / công việc / sự kiện *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Thông báo lịch họp phụ huynh / Sự kiện tham quan ngoại khóa..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8] font-semibold text-[#17365D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">Phân loại chuyên mục</label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as NonNullable<Notice['category']>)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8] font-semibold text-[#17365D]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">Mức độ ưu tiên</label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as 'Khẩn' | 'Quan trọng' | 'Thường')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8] font-semibold text-[#17365D]"
                  >
                    <option value="Khẩn">🔥 Khẩn / Rất quan trọng</option>
                    <option value="Quan trọng">⭐ Quan trọng</option>
                    <option value="Thường">📌 Thông thường</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Thời gian / Hạn thực hiện hiển thị
                  </label>
                  <input
                    type="text"
                    value={timeInfo}
                    onChange={(e) => setTimeInfo(e.target.value)}
                    placeholder="VD: 07h30 ngày 20/09/2026 (Chủ Nhật)"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Ngày diễn ra / Ngày hạn (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="VD: 20/09/2026"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">Địa điểm tổ chức</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: Phòng 302 / Sân trường..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">Đối tượng áp dụng</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="VD: Toàn lớp 9A2 & Phụ huynh"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Nội dung chi tiết thông báo / sự kiện / phân công việc
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập nội dung chi tiết cần thông báo cho học sinh và phụ huynh..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1677E8] leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#17365D]">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1677E8]"
                  />
                  <span>Ghim thông báo này lên đầu bảng tin</span>
                </label>

                {!editingId && (
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-emerald-700">
                    <input
                      type="checkbox"
                      checked={alsoAddToTasks}
                      onChange={(e) => setAlsoAddToTasks(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>Đồng thời thêm vào danh sách Việc cần làm của lớp</span>
                  </label>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-[#17365D] font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNotice}
                disabled={!title.trim()}
                className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#073B82] disabled:opacity-50 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                {editingId ? 'Lưu cập nhật' : 'Đăng lên bảng tin web'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
