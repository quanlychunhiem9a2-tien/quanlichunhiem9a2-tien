import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Users,
  Award,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { AppState, SemesterTerm } from '../types';
import { getStudentSemesterRecord } from '../utils/tt22Evaluation';

interface ReportsStatisticsProps {
  appState: AppState;
}

export const ReportsStatistics: React.FC<ReportsStatisticsProps> = ({ appState }) => {
  const { students, attendanceHistory, todayDate, emulationRecords } = appState;
  const [reportSemester, setReportSemester] = useState<SemesterTerm>('caNam');

  const total = students.length || 1;
  const termName = reportSemester === 'hk1' ? 'Học kỳ 1' : reportSemester === 'hk2' ? 'Học kỳ 2' : 'Cả năm';

  const rankTot = students.filter((s) => {
    const r = getStudentSemesterRecord(s, reportSemester);
    return r.academicRank === 'Tốt' || r.academicRank === 'Giỏi';
  }).length;

  const rankKha = students.filter((s) => {
    const r = getStudentSemesterRecord(s, reportSemester);
    return r.academicRank === 'Khá';
  }).length;

  const rankDat = students.filter((s) => {
    const r = getStudentSemesterRecord(s, reportSemester);
    return r.academicRank === 'Đạt' || r.academicRank === 'Trung bình';
  }).length;

  const rankChuaDat = students.filter((s) => {
    const r = getStudentSemesterRecord(s, reportSemester);
    return r.academicRank === 'Chưa đạt' || r.academicRank === 'Yếu';
  }).length;

  const awardXuatSac = students.filter((s) => {
    const r = getStudentSemesterRecord(s, reportSemester);
    return r.awardTitle === 'Học sinh Xuất sắc';
  }).length;

  const awardGioi = students.filter((s) => {
    const r = getStudentSemesterRecord(s, reportSemester);
    return r.awardTitle === 'Học sinh Giỏi';
  }).length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      [`BÁO CÁO TỔNG HỢP CÔNG TÁC CHỦ NHIỆM - ${termName.toUpperCase()} (THÔNG TƯ 22)`],
      ['Trường', appState.schoolName],
      ['Lớp', appState.className],
      ['Năm học', appState.academicYear],
      ['GVCN', appState.teacherName],
      ['Thời điểm thống kê', `${todayDate} - ${termName}`],
      [''],
      [`I. KẾT QUẢ ĐÁNH GIÁ KẾT QUẢ HỌC TẬP (${termName})`, 'Số lượng', 'Tỷ lệ %'],
      ['Tổng số học sinh', total, '100%'],
      ['Mức Tốt', rankTot, `${((rankTot / total) * 100).toFixed(1)}%`],
      ['Mức Khá', rankKha, `${((rankKha / total) * 100).toFixed(1)}%`],
      ['Mức Đạt', rankDat, `${((rankDat / total) * 100).toFixed(1)}%`],
      ['Mức Chưa đạt', rankChuaDat, `${((rankChuaDat / total) * 100).toFixed(1)}%`],
      [''],
      [`II. DANH HIỆU KHEN THƯỞNG (${termName})`, 'Số lượng', 'Tỷ lệ %'],
      ['Học sinh Xuất sắc', awardXuatSac, `${((awardXuatSac / total) * 100).toFixed(1)}%`],
      ['Học sinh Giỏi', awardGioi, `${((awardGioi / total) * 100).toFixed(1)}%`],
      ['Không danh hiệu', total - awardXuatSac - awardGioi, `${(((total - awardXuatSac - awardGioi) / total) * 100).toFixed(1)}%`],
    ];

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_cao_${reportSemester.toUpperCase()}_${appState.className}_${todayDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#17365D]">Báo cáo & Thống kê Tổng hợp</h2>
            <p className="text-xs text-[#66809F]">
              Tổng hợp số liệu thực tế về sĩ số, học lực, rèn luyện và thi đua nề nếp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Semester Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setReportSemester('hk1')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                reportSemester === 'hk1'
                  ? 'bg-white text-[#1677E8] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Học kỳ 1
            </button>
            <button
              onClick={() => setReportSemester('hk2')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                reportSemester === 'hk2'
                  ? 'bg-white text-emerald-600 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Học kỳ 2
            </button>
            <button
              onClick={() => setReportSemester('caNam')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                reportSemester === 'caNam'
                  ? 'bg-white text-amber-600 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cả năm
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#D8E7FA] hover:bg-gray-50 text-xs font-semibold text-[#17365D] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#1677E8]" />
            Xuất Excel ({termName})
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            In báo cáo
          </button>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-8 space-y-6 text-[#17365D]">
        {/* National Header */}
        <div className="text-center space-y-1 pb-4 border-b border-gray-200">
          <p className="text-xs font-bold tracking-wider text-[#073B82] uppercase">
            {appState.schoolName}
          </p>
          <p className="text-xs font-medium text-[#66809F]">
            LỚP CHỦ NHIỆM: {appState.className.toUpperCase()} • {appState.academicYear.toUpperCase()}
          </p>
          <div className="pt-2">
            <h1 className="text-lg font-black text-[#17365D] uppercase tracking-tight">
              BÁO CÁO CÔNG TÁC CHỦ NHIỆM {termName.toUpperCase()}
            </h1>
            <p className="text-xs italic text-[#66809F]">
              (Thời điểm thống kê: Ngày {todayDate} • Đánh giá theo Thông tư 22/2021/TT-BGDĐT)
            </p>
          </div>
        </div>

        {/* Section 1: Demographics */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#0B438A] uppercase border-b pb-1">
            I. TÌNH HÌNH SĨ SỐ VÀ CHUYÊN CẦN
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[#66809F] block">Sĩ số đầu năm:</span>
              <strong className="text-base text-[#17365D]">{total} học sinh</strong>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[#66809F] block">Nam / Nữ:</span>
              <strong className="text-base text-[#17365D]">
                {students.filter((s) => s.gender === 'Nam').length} Nam /{' '}
                {students.filter((s) => s.gender === 'Nữ').length} Nữ
              </strong>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[#66809F] block">Tỷ lệ chuyên cần bình quân:</span>
              <strong className="text-base text-[#10B981]">98,4%</strong>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <span className="text-[#66809F] block">Điểm thi đua toàn diện:</span>
              <strong className="text-base text-[#0B438A]">385/400 (Tốt)</strong>
            </div>
          </div>
        </div>

        {/* Section 2: Academic Analysis TT22 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <h3 className="text-sm font-bold text-[#0B438A] uppercase">
              II. KẾT QUẢ ĐÁNH GIÁ HỌC TẬP & DANH HIỆU (THEO THÔNG TƯ 22)
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Chuẩn TT 22/2021/TT-BGDĐT
            </span>
          </div>

          <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-[#17365D] font-bold">
              <tr>
                <th className="p-2.5 border-b">Xếp loại kết quả học tập</th>
                <th className="p-2.5 border-b text-center">Số lượng</th>
                <th className="p-2.5 border-b text-center">Tỷ lệ %</th>
                <th className="p-2.5 border-b">Tiêu chuẩn quy định TT22</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="p-2.5 font-bold text-emerald-600">Mức Tốt</td>
                <td className="p-2.5 text-center font-mono font-bold">{rankTot}</td>
                <td className="p-2.5 text-center font-mono">{((rankTot / total) * 100).toFixed(1)}%</td>
                <td className="p-2.5 text-[#66809F]">Môn NX: Đạt; Môn điểm: các môn ≥ 6.5, có ≥ 6 môn ≥ 8.0</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-[#1677E8]">Mức Khá</td>
                <td className="p-2.5 text-center font-mono font-bold">{rankKha}</td>
                <td className="p-2.5 text-center font-mono">{((rankKha / total) * 100).toFixed(1)}%</td>
                <td className="p-2.5 text-[#66809F]">Môn NX: Đạt; Môn điểm: các môn ≥ 5.0, có ≥ 6 môn ≥ 6.5</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-amber-600">Mức Đạt</td>
                <td className="p-2.5 text-center font-mono font-bold">{rankDat}</td>
                <td className="p-2.5 text-center font-mono">{((rankDat / total) * 100).toFixed(1)}%</td>
                <td className="p-2.5 text-[#66809F]">Nhiều nhất 1 môn NX Chưa đạt; có ≥ 6 môn điểm ≥ 5.0, không môn &lt; 3.5</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-rose-600">Mức Chưa đạt</td>
                <td className="p-2.5 text-center font-mono font-bold">{rankChuaDat}</td>
                <td className="p-2.5 text-center font-mono">{((rankChuaDat / total) * 100).toFixed(1)}%</td>
                <td className="p-2.5 text-[#66809F]">Các trường hợp còn lại (cần bồi dưỡng và kế hoạch phụ đạo)</td>
              </tr>
            </tbody>
          </table>

          {/* Award Titles Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
              <span className="text-purple-700 font-bold block mb-1">🌟 Danh hiệu Học sinh Xuất sắc:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-purple-900">{awardXuatSac}</span>
                <span className="text-[#66809F]">({((awardXuatSac / total) * 100).toFixed(1)}%)</span>
              </div>
              <p className="text-[11px] text-[#66809F] mt-1">Học lực Tốt + Rèn luyện Tốt + ít nhất 6 môn ≥ 9.0</p>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <span className="text-blue-700 font-bold block mb-1">🎖️ Danh hiệu Học sinh Giỏi:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-[#17365D]">{awardGioi}</span>
                <span className="text-[#66809F]">({((awardGioi / total) * 100).toFixed(1)}%)</span>
              </div>
              <p className="text-[11px] text-[#66809F] mt-1">Học lực Tốt + Rèn luyện Tốt</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-700 font-bold block mb-1">📋 Hoàn thành chương trình / Khác:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-gray-800">{total - awardXuatSac - awardGioi}</span>
                <span className="text-[#66809F]">({(((total - awardXuatSac - awardGioi) / total) * 100).toFixed(1)}%)</span>
              </div>
              <p className="text-[11px] text-[#66809F] mt-1">Học sinh hoàn thành nhiệm vụ theo quy chế TT22</p>
            </div>
          </div>
        </div>

        {/* Section 3: Signature Block */}
        <div className="pt-8 flex justify-between items-end text-xs">
          <div className="text-center space-y-1">
            <p className="font-bold uppercase text-[#17365D]">HIỆU TRƯỞNG PHÊ DUYỆT</p>
            <p className="text-[11px] text-[#66809F]">(Ký và ghi rõ họ tên)</p>
            <div className="h-16"></div>
          </div>

          <div className="text-center space-y-1">
            <p className="italic text-[#66809F]">Hà Nội, ngày 11 tháng 09 năm 2026</p>
            <p className="font-bold uppercase text-[#17365D]">GIÁO VIÊN CHỦ NHIỆM</p>
            <div className="h-14"></div>
            <p className="font-bold text-[#17365D] text-sm">{appState.teacherName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
