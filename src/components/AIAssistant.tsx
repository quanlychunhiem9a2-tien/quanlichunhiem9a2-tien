import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { AppState, DocumentItem } from '../types';
import { sendAIChatMessage } from '../api';

interface AIAssistantProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  category?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  appState,
  onUpdateState,
}) => {
  const { students, todayDate, attendanceHistory } = appState;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Xin chào Thầy Trần Văn Tiến! Tôi là Trợ lý AI GVCN của lớp 9A2 (Trường TH&THCS Võ Thị Sáu).\n\nTôi có thể hỗ trợ Thầy:\n1. 📝 Soạn thảo kế hoạch chủ nhiệm tuần/tháng, thư mời phụ huynh, biên bản họp.\n2. 📊 Phân tích kết quả học tập, chuyên cần và tìm giải pháp hỗ trợ các học sinh cần bồi dưỡng.\n3. 💡 Viết nhận xét học bạ chuẩn mực theo Thông tư 22/TT-BGDĐT.\n4. 📋 Lên lịch công việc và tổng hợp báo cáo định kỳ.\n\nThầy cần hỗ trợ nội dung nào ngay bây giờ?`,
      timestamp: '08:00',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'draft' | 'analytics' | 'organization' | 'reports'>('all');
  const [anonymizeData, setAnonymizeData] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const promptSuggestions = [
    { label: 'Tạo kế hoạch chủ nhiệm tuần này', category: 'draft' },
    { label: 'Soạn thông báo nộp quỹ & chuẩn bị kiểm tra giữa kỳ', category: 'draft' },
    { label: 'Phân tích tình hình chuyên cần lớp 9A2', category: 'analytics' },
    { label: 'Đề xuất biện pháp kèm cặp học sinh yếu môn Toán', category: 'analytics' },
    { label: 'Viết nhận xét học kỳ cho học sinh chăm ngoan', category: 'draft' },
    { label: 'Lập danh sách 5 việc cần làm ưu tiên tuần tới', category: 'organization' },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Prepare context
    const currentAttendance = attendanceHistory[todayDate]?.summary || {
      total: students.length,
      present: 34,
      excused: 2,
      unexcused: 1,
      late: 1,
    };

    const contextData = {
      className: appState.className,
      teacher: appState.teacherName,
      totalStudents: students.length,
      attendance: currentAttendance,
      studentsList: students.slice(0, 10).map((s) => ({
        name: anonymizeData ? `HS_${s.code}` : s.fullName,
        rank: s.academicRank,
        conduct: s.conductRank,
        gpa: s.gpa,
      })),
    };

    const replyText = await sendAIChatMessage(text, activeCategory, contextData);

    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      sender: 'ai',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToDocs = (text: string) => {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: `Văn bản tạo bởi Trợ lý AI (${new Date().toLocaleDateString('vi-VN')})`,
      category: 'Khác',
      date: '11/09/2026',
      content: text,
    };
    onUpdateState((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }));
    alert('Đã lưu nội dung này vào Thư viện Hồ sơ - Văn bản thành công!');
  };

  const handleClearHistory = () => {
    if (confirm('Thầy có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?')) {
      setMessages([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#17365D]">Trợ lý AI GVCN (Gemini 3.8 Flash)</h2>
            <p className="text-xs text-[#66809F]">
              Trợ lý sư phạm thông minh hỗ trợ soạn thảo, tổng hợp và định hướng giáo dục học sinh
            </p>
          </div>
        </div>

        {/* Privacy & Clear Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#17365D] bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ẩn danh hóa dữ liệu học sinh</span>
            <input
              type="checkbox"
              checked={anonymizeData}
              onChange={(e) => setAnonymizeData(e.target.checked)}
              className="rounded text-[#1677E8] focus:ring-[#1677E8]"
            />
          </label>

          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#66809F] font-bold shrink-0">Gợi ý nhanh:</span>
        {promptSuggestions.map((ps, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(ps.label)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#D8E7FA] hover:border-[#1677E8] hover:text-[#1677E8] font-medium text-[#17365D] whitespace-nowrap shadow-2xs transition-colors shrink-0"
          >
            {ps.label}
          </button>
        ))}
      </div>

      {/* Main Chat Area */}
      <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs flex flex-col h-[560px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  msg.sender === 'user'
                    ? 'bg-[#17365D]'
                    : 'bg-gradient-to-tr from-[#0B438A] to-[#1677E8] shadow-xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1677E8] text-white rounded-tr-xs'
                    : 'bg-[#F4F8FD] text-[#17365D] border border-[#D8E7FA] rounded-tl-xs shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-line font-sans">{msg.text}</div>

                {/* AI Footer with Actions */}
                {msg.sender === 'ai' && (
                  <div className="mt-3 pt-2 border-t border-[#D8E7FA] flex items-center justify-between text-[11px] text-[#66809F]">
                    <span>{msg.timestamp} • Trợ lý AI GVCN</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-[#1677E8] flex items-center gap-1 font-semibold"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedId === msg.id ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                      <button
                        onClick={() => handleSaveToDocs(msg.text)}
                        className="hover:text-[#1677E8] flex items-center gap-1 font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Lưu vào văn bản
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0B438A] to-[#1677E8] flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-blue-50/80 rounded-2xl rounded-tl-xs border border-blue-100 flex items-center gap-2 text-xs text-[#0B438A]">
                <div className="w-4 h-4 border-2 border-[#1677E8] border-t-transparent rounded-full animate-spin"></div>
                <span>Trợ lý AI đang xử lý yêu cầu và tổng hợp dữ liệu...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Nhập yêu cầu cần AI hỗ trợ (ví dụ: Soạn thư mời họp, phân tích nề nếp, gợi ý nhận xét...)"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#D8E7FA] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1677E8] shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-5 py-3 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
              Gửi yêu cầu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
