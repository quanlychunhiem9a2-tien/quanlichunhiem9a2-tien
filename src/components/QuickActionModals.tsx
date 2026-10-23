import React, { useState } from 'react';
import {
  X,
  UserPlus,
  ClipboardList,
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Printer
} from 'lucide-react';
import { AppState, NavPage } from '../types';
import { sendAIChatMessage } from '../api';

interface QuickActionModalsProps {
  actionType: 'invite' | 'plan' | 'report' | 'comment' | 'export' | null;
  onClose: () => void;
  appState: AppState;
  onNavigate: (page: NavPage) => void;
}

export const QuickActionModals: React.FC<QuickActionModalsProps> = ({
  actionType,
  onClose,
  appState,
  onNavigate,
}) => {
  if (!actionType) return null;

  const [copied, setCopied] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [commentStudentName, setCommentStudentName] = useState('Nguyễn Minh Anh');
  const [generatedComment, setGeneratedComment] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateQuickComment = async () => {
    setAiGenerating(true);
    const student = appState.students.find((s) => s.fullName === commentStudentName) || appState.students[0];
    const prompt = `Viết một lời nhận xét ngắn gọn, cô đọng (khoảng 3-4 câu) cho học sinh ${student.fullName}, học lực ${student.academicRank}, hạnh kiểm ${student.conductRank}, điểm trung bình ${student.gpa} để gửi phụ huynh.`;
    const res = await sendAIChatMessage(prompt, 'comment');
    setGeneratedComment(res);
    setAiGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1677E8] text-white flex items-center justify-center">
              {actionType === 'invite' && <UserPlus className="w-4 h-4" />}
              {actionType === 'plan' && <ClipboardList className="w-4 h-4" />}
              {actionType === 'report' && <FileText className="w-4 h-4" />}
              {actionType === 'comment' && <Sparkles className="w-4 h-4" />}
              {actionType === 'export' && <Download className="w-4 h-4" />}
            </div>
            <h3 className="font-extrabold text-[#17365D] text-sm">
              {actionType === 'invite' && 'Tạo thư mời họp phụ huynh nhanh'}
              {actionType === 'plan' && 'Lập kế hoạch tuần mới'}
              {actionType === 'report' && 'Tạo báo cáo tháng mẫu sẵn'}
              {actionType === 'comment' && 'Tạo nhận xét học sinh bằng AI'}
              {actionType === 'export' && 'Xuất dữ liệu lớp 9A2'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 text-xs text-[#17365D] space-y-4">
          {actionType === 'invite' && (
            <div className="space-y-3">
              <p className="text-[#66809F]">
                Mẫu giấy mời đã được điền sẵn thông tin họp đầu năm của {appState.className}:
              </p>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 font-serif leading-relaxed max-h-56 overflow-y-auto">
                <p className="font-bold text-center">GIẤY MỜI HỌP PHỤ HUYNH LỚP 9A2</p>
                <p className="mt-2">Trân trọng kính mời Quý Phụ huynh đến dự họp đầu năm học 2026-2027.</p>
                <p>• Thời gian: 10h30 ngày 11/09/2026 (Thứ 6)</p>
                <p>• Địa điểm: Phòng học 302, Trường TH&THCS Võ Thị Sáu</p>
                <p>• GVCN: {appState.teacherName}</p>
              </div>
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('documents');
                  }}
                  className="text-[#1677E8] font-bold hover:underline"
                >
                  Mở trong Thư viện văn bản →
                </button>
                <button
                  onClick={() =>
                    handleCopy(
                      `GIẤY MỜI HỌP PHỤ HUYNH LỚP 9A2\nThời gian: 10h30 ngày 11/09/2026\nĐịa điểm: Phòng 302 Trường TH&THCS Võ Thị Sáu\nGVCN: ${appState.teacherName}`
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-[#1677E8] text-white font-bold flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          )}

          {actionType === 'plan' && (
            <div className="space-y-3">
              <p className="text-[#66809F]">
                Lập kế hoạch tuần giúp thầy chủ nhiệm quản lý công việc và nề nếp lớp học một cách khoa học.
              </p>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="font-bold text-[#0B438A]">Tuần hiện tại: Tuần 2 (Tháng 9/2026)</p>
                <p className="text-gray-600 mt-1">4/4 nhiệm vụ đã được khởi tạo trong hệ thống.</p>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('plans');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1677E8] text-white font-bold"
                >
                  Đến trang Kế hoạch chủ nhiệm →
                </button>
              </div>
            </div>
          )}

          {actionType === 'report' && (
            <div className="space-y-3">
              <p className="text-[#66809F]">
                Báo cáo tổng hợp được tạo tự động từ cơ sở dữ liệu chuyên cần và học lực hiện thời của lớp {appState.className}.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('reports');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1677E8] text-white font-bold"
                >
                  Xem và In Báo cáo tháng →
                </button>
              </div>
            </div>
          )}

          {actionType === 'comment' && (
            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Chọn học sinh cần nhận xét:</label>
                <select
                  value={commentStudentName}
                  onChange={(e) => setCommentStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                >
                  {appState.students.map((s) => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} - Học lực: {s.academicRank}
                    </option>
                  ))}
                </select>
              </div>

              <button
                disabled={aiGenerating}
                onClick={handleGenerateQuickComment}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {aiGenerating ? 'AI đang viết nhận xét...' : 'Tạo nhận xét bằng AI'}
              </button>

              {generatedComment && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs leading-relaxed space-y-2">
                  <p className="font-semibold text-[#0B438A]">Kết quả gợi ý:</p>
                  <p>{generatedComment}</p>
                  <button
                    onClick={() => handleCopy(generatedComment)}
                    className="text-xs font-bold text-[#1677E8] flex items-center gap-1 hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Đã sao chép' : 'Sao chép nhận xét'}
                  </button>
                </div>
              )}
            </div>
          )}

          {actionType === 'export' && (
            <div className="space-y-3">
              <p className="text-[#66809F]">Chọn định dạng dữ liệu cần xuất:</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <button
                  onClick={() => {
                    alert('Đang tải danh sách học sinh định dạng Excel (CSV)...');
                    onClose();
                    onNavigate('students');
                  }}
                  className="p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all"
                >
                  <span className="font-bold text-emerald-600 block text-sm">EXCEL</span>
                  <span className="text-[10px] text-gray-500">Danh sách HS</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onNavigate('documents');
                  }}
                  className="p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all"
                >
                  <span className="font-bold text-blue-600 block text-sm">WORD</span>
                  <span className="text-[10px] text-gray-500">Biểu mẫu</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onNavigate('reports');
                  }}
                  className="p-3 rounded-xl border border-gray-200 hover:border-red-500 hover:bg-red-50/30 transition-all"
                >
                  <span className="font-bold text-red-600 block text-sm">PDF</span>
                  <span className="text-[10px] text-gray-500">In báo cáo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
