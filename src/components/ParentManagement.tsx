import React, { useState } from 'react';
import {
  UserCheck,
  Phone,
  Search,
  Plus,
  MessageSquare,
  Copy,
  Check,
  Send,
  Calendar,
  Clock,
  Download,
  AlertCircle
} from 'lucide-react';
import { AppState, ParentContact } from '../types';

interface ParentManagementProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const ParentManagement: React.FC<ParentManagementProps> = ({
  appState,
  onUpdateState,
}) => {
  const { students, parentContacts } = appState;
  const [activeTab, setActiveTab] = useState<'directory' | 'logs' | 'compose'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // New announcement composer state
  const [noticeTitle, setNoticeTitle] = useState('Thông báo kế hoạch kiểm tra giữa kỳ I năm học 2026-2027');
  const [noticeContent, setNoticeContent] = useState(
    `Kính gửi Quý Cha Mẹ Học Sinh Lớp 9A2,\n\n` +
    `Nhà trường xin trân trọng thông báo lịch kiểm tra khảo sát chất lượng giữa học kỳ I diễn ra từ ngày 15/09 đến 18/09/2026 cho 4 môn: Toán, Ngữ văn, Tiếng Anh và Khoa học tự nhiên.\n\n` +
    `Kính đề nghị Quý Phụ huynh cùng đồng hành, nhắc nhở các con ôn tập kiến thức nghiêm túc, đảm bảo sức khỏe và đi ngủ đúng giờ.\n\n` +
    `Trân trọng cảm ơn sự phối hợp của Quý Phụ huynh!\n` +
    `GVCN: Thầy Trần Văn Tiến - SĐT: 0912.345.678`
  );

  // New parent contact log modal state
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [newLog, setNewLog] = useState<Partial<ParentContact>>({
    studentId: students[0]?.id || '',
    contactType: 'Gọi điện',
    topic: 'Trao đổi về tình hình học tập và nề nếp',
    content: '',
    followUpNeeded: false,
    status: 'Đã trao đổi',
    date: '2026-09-11',
  });

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(`${noticeTitle}\n\n${noticeContent}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveContactLog = () => {
    const student = students.find((s) => s.id === newLog.studentId);
    if (!student) return;

    const contact: ParentContact = {
      id: `pc-${Date.now()}`,
      studentId: student.id,
      studentName: student.fullName,
      parentName: student.parentName,
      phone: student.parentPhone,
      date: newLog.date || '2026-09-11',
      contactType: newLog.contactType as any,
      topic: newLog.topic || '',
      content: newLog.content || '',
      followUpNeeded: Boolean(newLog.followUpNeeded),
      status: newLog.status as any,
    };

    onUpdateState((prev) => ({
      ...prev,
      parentContacts: [contact, ...prev.parentContacts],
    }));

    setIsAddLogOpen(false);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentPhone.includes(searchQuery)
  );

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#17365D]">Quản lý Phụ huynh & Liên lạc</h2>
            <p className="text-xs text-[#66809F]">
              Danh bạ phụ huynh lớp 9A2, nhật ký trao đổi giáo dục và soạn thông báo nhóm lớp
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'directory' ? 'bg-white text-[#1677E8] shadow-xs' : 'text-[#66809F]'
            }`}
          >
            Danh bạ phụ huynh
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'logs' ? 'bg-white text-[#1677E8] shadow-xs' : 'text-[#66809F]'
            }`}
          >
            Nhật ký trao đổi ({parentContacts.length})
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'compose' ? 'bg-white text-[#1677E8] shadow-xs' : 'text-[#66809F]'
            }`}
          >
            Soạn thông báo
          </button>
        </div>
      </div>

      {/* Tab 1: Directory */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tên phụ huynh, học sinh, số ĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#D8E7FA] focus:ring-2 focus:ring-[#1677E8]"
              />
            </div>
            <button
              onClick={() => setIsAddLogOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#1677E8] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Ghi nhật ký liên hệ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-gray-100 text-[#66809F] font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="py-3 px-3.5">Học sinh</th>
                  <th className="py-3 px-3.5">Họ tên Phụ huynh</th>
                  <th className="py-3 px-3.5">Số điện thoại</th>
                  <th className="py-3 px-3.5">Nghề nghiệp</th>
                  <th className="py-3 px-3.5">Địa chỉ</th>
                  <th className="py-3 px-3.5 text-right">Gọi điện / Zalo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={s.avatar}
                          alt={s.fullName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <span className="font-bold text-[#17365D] block">{s.fullName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">Tổ {s.teamId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-bold text-[#17365D]">{s.parentName}</td>
                    <td className="py-3 px-3.5 font-mono text-[#1677E8] font-bold">{s.parentPhone}</td>
                    <td className="py-3 px-3.5 text-[#66809F]">{s.parentJob || '-'}</td>
                    <td className="py-3 px-3.5 text-[#66809F] truncate max-w-xs">{s.address}</td>
                    <td className="py-3 px-3.5 text-right">
                      <a
                        href={`tel:${s.parentPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-[11px] transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        Liên hệ
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-sm text-[#17365D]">Lịch sử các cuộc trao đổi với phụ huynh</h3>
            <button
              onClick={() => setIsAddLogOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#1677E8] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm nhật ký mới
            </button>
          </div>

          <div className="space-y-3">
            {parentContacts.map((pc) => (
              <div key={pc.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/40 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#17365D] text-sm">{pc.parentName}</span>
                    <span className="text-[#66809F]">(Phụ huynh em: <strong className="text-blue-600">{pc.studentName}</strong>)</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold text-[10.5px]">
                      {pc.contactType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[#66809F] font-mono">
                    <span>{pc.date}</span>
                    <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {pc.status}
                    </span>
                  </div>
                </div>

                <p className="font-semibold text-[#17365D]">Chủ đề: {pc.topic}</p>
                <p className="text-[#66809F] leading-relaxed bg-white p-3 rounded-lg border border-gray-100">
                  {pc.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Compose Announcement */}
      {activeTab === 'compose' && (
        <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-[#17365D]">Soạn thảo thông báo gửi nhóm phụ huynh Lớp 9A2</h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-[#17365D] block mb-1">Tiêu đề thông báo:</label>
              <input
                type="text"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold text-[#17365D]"
              />
            </div>
            <div>
              <label className="font-bold text-[#17365D] block mb-1">Nội dung chi tiết:</label>
              <textarea
                rows={8}
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-gray-200 leading-relaxed font-sans"
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-gray-400 text-[11px] italic">
                * Giáo viên sao chép nội dung để gửi vào nhóm Zalo hoặc tin nhắn SMS phụ huynh.
              </span>
              <button
                onClick={handleCopyNotice}
                className="px-4 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã sao chép vào bộ nhớ tạm!' : 'Sao chép nội dung thông báo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Contact Log */}
      {isAddLogOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#D8E7FA]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
              <h3 className="font-bold text-[#17365D] text-sm">Ghi nhật ký liên hệ phụ huynh</h3>
              <button onClick={() => setIsAddLogOpen(false)} className="text-gray-400 hover:text-black">✕</button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Chọn học sinh</label>
                <select
                  value={newLog.studentId}
                  onChange={(e) => setNewLog({ ...newLog, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.code} - PH: {s.parentName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Hình thức liên lạc</label>
                  <select
                    value={newLog.contactType}
                    onChange={(e) => setNewLog({ ...newLog, contactType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  >
                    <option value="Gọi điện">Gọi điện thoại</option>
                    <option value="Zalo">Nhắn tin Zalo</option>
                    <option value="Gặp trực tiếp">Gặp trực tiếp</option>
                    <option value="Họp phụ huynh">Họp phụ huynh</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Ngày trao đổi</label>
                  <input
                    type="date"
                    value={newLog.date}
                    onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Chủ đề trao đổi</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đôn đốc bài tập, sức khỏe, học phí..."
                  value={newLog.topic || ''}
                  onChange={(e) => setNewLog({ ...newLog, topic: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Nội dung và kết quả trao đổi</label>
                <textarea
                  rows={4}
                  placeholder="Ghi lại phản hồi của phụ huynh và các thỏa thuận giáo dục..."
                  value={newLog.content || ''}
                  onChange={(e) => setNewLog({ ...newLog, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button onClick={() => setIsAddLogOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-xs font-bold">Hủy</button>
              <button onClick={handleSaveContactLog} className="px-4 py-1.5 rounded-lg bg-[#1677E8] text-white text-xs font-bold">Lưu nhật ký</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
