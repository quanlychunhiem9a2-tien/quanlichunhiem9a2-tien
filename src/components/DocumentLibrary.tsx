import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Copy,
  Printer,
  Download,
  Check,
  Edit3,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { AppState, DocumentItem } from '../types';

interface DocumentLibraryProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  appState,
  onUpdateState,
}) => {
  const { documents } = appState;
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem>(documents[0]);
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const sampleTemplates = [
    {
      title: 'Giấy mời họp Phụ huynh học sinh (Chuẩn)',
      category: 'Thư mời' as const,
      content: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
-----------------
TRƯỜNG TIỂU HỌC VÀ THCS VÕ THỊ SÁU
LỚP CHỦ NHIỆM 9A2

GIẤY MỜI HỌP PHỤ HUYNH HỌC SINH ĐẦU NĂM HỌC 2026 - 2027

Kính gửi: Ông/Bà Phụ huynh học sinh em: [Tên học sinh]

Căn cứ Kế hoạch năm học 2026 - 2027 của Trường Tiểu học và THCS Võ Thị Sáu;
Để tăng cường sự gắn kết giữa Gia đình và Nhà trường trong việc đồng hành cùng học sinh lớp 9 chuẩn bị thi vào lớp 10 THPT;

Giáo viên chủ nhiệm lớp 9A2 trân trọng kính mời Ông/Bà:
- Đến dự: Buổi họp phụ huynh học sinh đầu năm học
- Thời gian: 10 giờ 30 phút, ngày 11/09/2026 (Thứ Sáu)
- Địa điểm: Phòng học 302, Trường Tiểu học & THCS Võ Thị Sáu.

Nội dung:
1. Thông qua phương hướng nhiệm vụ năm học mới và chỉ tiêu thi tuyển sinh lớp 10.
2. Báo cáo đặc điểm tình hình học sinh lớp 9A2.
3. Bầu Ban đại diện Cha mẹ học sinh lớp 9A2.

Sự hiện diện của Quý Phụ huynh là niềm động viên lớn cho các em học sinh!

Hà Nội, ngày 10 tháng 09 năm 2026
GIÁO VIÊN CHỦ NHIỆM
Trần Văn Tiến`
    },
    {
      title: 'Bản cam kết rèn luyện nề nếp và an toàn giao thông',
      category: 'Khác' as const,
      content: `BẢN CAM KẾT RÈN LUYỆN NĂM HỌC 2026 - 2027
Lớp: 9A2 - Trường Tiểu học & THCS Võ Thị Sáu

Họ và tên học sinh: .............................................
Họ và tên phụ huynh: ...........................................

CHÚNG TÔI XIN CAM KẾT THỰC HIỆN CÁC NỘI DUNG SAU:
1. Chấp hành nghiêm chỉnh luật an toàn giao thông: Đội mũ bảo hiểm khi ngồi trên xe máy, xe đạp điện; không đi hàng hai, hàng ba.
2. Đi học đúng giờ, trang phục chỉnh tề, đeo khăn quàng đỏ và thẻ học sinh đầy đủ.
3. Tích cực chuẩn bị bài trước khi đến lớp, trung thực trong kiểm tra và thi cử.
4. Đoàn kết, tôn trọng thầy cô giáo và hòa nhã với bạn bè.

Chữ ký học sinh                  Chữ ký phụ huynh`
    }
  ];

  const handleCopy = () => {
    if (!selectedDoc) return;
    navigator.clipboard.writeText(selectedDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveEdit = () => {
    if (!selectedDoc) return;
    onUpdateState((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === selectedDoc.id ? { ...d, content: editContent } : d
      ),
    }));
    setSelectedDoc({ ...selectedDoc, content: editContent });
    setIsEditing(false);
  };

  const filteredDocs = documents.filter((d) => {
    const matchCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#17365D]">Hồ sơ & Biểu mẫu Văn bản</h2>
            <p className="text-xs text-[#66809F]">
              Thư viện mẫu văn bản hành chính giáo dục: Thư mời, biên bản, kế hoạch, thông báo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newDoc: DocumentItem = {
                id: `doc-${Date.now()}`,
                title: 'Văn bản mới (Dự thảo)',
                category: 'Thông báo',
                date: '11/09/2026',
                content: sampleTemplates[0].content,
              };
              onUpdateState((prev) => ({
                ...prev,
                documents: [newDoc, ...prev.documents],
              }));
              setSelectedDoc(newDoc);
            }}
            className="px-4 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Tạo văn bản mới
          </button>
        </div>
      </div>

      {/* Main split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Document List (Left 1 Col) */}
        <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm mẫu văn bản..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-[#D8E7FA] focus:ring-2 focus:ring-[#1677E8]"
            />
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  setIsEditing(false);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedDoc?.id === doc.id
                    ? 'border-[#1677E8] bg-blue-50/50 shadow-xs'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-[#66809F] mb-1">
                  <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-100/60 text-[#0B438A]">
                    {doc.category}
                  </span>
                  <span className="font-mono">{doc.date}</span>
                </div>
                <h4 className="font-bold text-xs text-[#17365D] leading-snug line-clamp-2">
                  {doc.title}
                </h4>
              </div>
            ))}
          </div>
        </div>

        {/* Document Preview & Editor (Right 2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-4">
          {selectedDoc ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[11px] font-semibold text-[#1677E8] bg-blue-50 px-2 py-0.5 rounded-md">
                    {selectedDoc.category}
                  </span>
                  <h3 className="font-extrabold text-base text-[#17365D] mt-1">
                    {selectedDoc.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Lưu thay đổi
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditContent(selectedDoc.content);
                        setIsEditing(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold text-xs flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#1677E8]" />
                      Chỉnh sửa
                    </button>
                  )}

                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Đã sao chép' : 'Sao chép'}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold text-xs flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    In ấn
                  </button>
                </div>
              </div>

              {/* Formatted Content Area */}
              {isEditing ? (
                <textarea
                  rows={16}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-4 rounded-xl border border-blue-200 font-mono text-xs leading-relaxed"
                ></textarea>
              ) : (
                <div className="p-6 bg-[#FAFCFF] rounded-xl border border-[#D8E7FA] text-xs leading-relaxed text-[#17365D] whitespace-pre-line font-serif shadow-inner">
                  {selectedDoc.content}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-[#66809F]">
              Vui lòng chọn một văn bản từ danh sách bên trái để xem trước.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
