import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { AppState } from '../types';
import {
  SUPABASE_URL,
  SUPABASE_PROJECT_REF,
  SUPABASE_SQL_EDITOR_URL,
  SUPABASE_TABLE_EDITOR_URL,
  SUPABASE_SQL_SETUP_SCRIPT,
  SupabaseConnectionStatus,
  checkSupabaseStatus,
  syncToSupabase,
  fetchFromSupabase,
} from '../lib/supabase';

interface SupabaseConnectPanelProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  isGVCN: boolean;
}

export const SupabaseConnectPanel: React.FC<SupabaseConnectPanelProps> = ({
  appState,
  onUpdateState,
  isGVCN,
}) => {
  const [connStatus, setConnStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlBox, setShowSqlBox] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleCheckConnection = async () => {
    setChecking(true);
    setFeedback(null);
    const res = await checkSupabaseStatus();
    setConnStatus(res);
    if (res.status === 'missing_table') {
      setShowSqlBox(true);
    }
    setChecking(false);
  };

  useEffect(() => {
    handleCheckConnection();
  }, []);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SETUP_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = SUPABASE_SQL_SETUP_SCRIPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handlePushToSupabase = async () => {
    if (!isGVCN) {
      setFeedback({
        type: 'error',
        text: 'Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền đồng bộ dữ liệu lên Supabase.',
      });
      return;
    }
    setSyncing(true);
    setFeedback(null);
    const result = await syncToSupabase(appState);
    if (result.ok) {
      const updated = await checkSupabaseStatus();
      setConnStatus(updated);
      setFeedback({
        type: 'success',
        text: `Đã đồng bộ thành công toàn bộ dữ liệu lớp ${appState.className} (${appState.students.length} học sinh, điểm danh, thi đua, kế hoạch) lên Supabase!`,
      });
    } else {
      const updated = await checkSupabaseStatus();
      setConnStatus(updated);
      if (updated.status === 'missing_table') {
        setShowSqlBox(true);
        setFeedback({
          type: 'info',
          text: 'Chưa tìm thấy bảng public.app_state trên Supabase. Hãy copy đoạn mã SQL bên dưới và nhấn RUN trong SQL Editor của Supabase trước.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: `Không thể ghi dữ liệu lên Supabase: ${result.error}`,
        });
      }
    }
    setSyncing(false);
  };

  const handlePullFromSupabase = async () => {
    if (!isGVCN) {
      setFeedback({
        type: 'error',
        text: 'Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền tải dữ liệu từ Supabase.',
      });
      return;
    }
    setPulling(true);
    setFeedback(null);
    const remoteData = await fetchFromSupabase();
    if (remoteData && Array.isArray(remoteData.students)) {
      onUpdateState((prev) => ({
        ...prev,
        ...remoteData,
        currentUser: prev.currentUser,
      }));
      setFeedback({
        type: 'success',
        text: `Đã tải và cập nhật dữ liệu mới nhất từ Supabase (${remoteData.students.length} học sinh)!`,
      });
    } else {
      setFeedback({
        type: 'info',
        text: 'Trên Supabase hiện chưa có bản ghi dữ liệu nào hoặc bảng chưa được tạo. Hãy bấm "Đồng bộ lên Supabase" trước.',
      });
    }
    setPulling(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-[#17365D]">
                Kết nối Cơ sở dữ liệu Đám mây Supabase
              </h3>
              {connStatus?.status === 'connected' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã kết nối
                </span>
              )}
              {connStatus?.status === 'missing_table' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Chờ tạo bảng SQL
                </span>
              )}
            </div>
            <p className="text-[#66809F] mt-0.5">
              Project ID: <strong className="text-[#17365D] font-mono">{SUPABASE_PROJECT_REF}</strong> • Tự động lưu trữ và đồng bộ dữ liệu lớp học theo thời gian thực
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCheckConnection}
            disabled={checking}
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>Kiểm tra kết nối</span>
          </button>

          <a
            href={SUPABASE_TABLE_EDITOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Mở Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] text-[#66809F] block">VITE_SUPABASE_URL</span>
          <span className="font-mono font-bold text-[#17365D] text-xs break-all mt-0.5 block">
            {SUPABASE_URL}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] text-[#66809F] block">VITE_SUPABASE_ANON_KEY</span>
          <span className="font-mono font-bold text-emerald-700 text-xs mt-0.5 block">
            sb_publishable_yo_IOq...FkrJRc (Đã cấu hình)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] text-[#66809F] block">Trạng thái bảng dữ liệu</span>
          <span className="font-bold text-[#17365D] text-xs mt-0.5 block">
            {connStatus?.status === 'connected'
              ? connStatus.updatedAt
                ? `Cập nhật: ${new Date(connStatus.updatedAt).toLocaleString('vi-VN')}`
                : 'Bảng đã sẵn sàng nhận dữ liệu'
              : connStatus?.status === 'missing_table'
              ? 'Cần chạy lệnh SQL tạo bảng (1 lần)'
              : 'Đang kiểm tra...'}
          </span>
        </div>
      </div>

      {/* Status Notice */}
      {connStatus && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            connStatus.status === 'connected'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : connStatus.status === 'missing_table'
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {connStatus.status === 'connected' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <p className="font-bold text-xs">{connStatus.message}</p>
            {connStatus.status === 'missing_table' && (
              <p className="text-[11.5px] opacity-90">
                Vì khóa của bạn là <strong>Publishable / Anon Key</strong> nên theo cơ chế bảo mật của Supabase, việc tạo bảng mới cần thực hiện trong mục <strong>SQL Editor</strong> trên trang quản trị Supabase. Bạn chỉ cần bấm <strong>&ldquo;Sao chép mã SQL&rdquo;</strong> bên dưới và dán vào SQL Editor rồi nhấn <strong>Run</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-[#0B438A]'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Sync Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePushToSupabase}
            disabled={syncing}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{syncing ? 'Đang đẩy lên Supabase...' : 'Đồng bộ lên Supabase ngay'}</span>
          </button>

          <button
            type="button"
            onClick={handlePullFromSupabase}
            disabled={pulling}
            className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] border border-blue-200 font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <CloudDownload className="w-4 h-4" />
            <span>{pulling ? 'Đang tải về...' : 'Tải dữ liệu từ Supabase về'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowSqlBox(!showSqlBox)}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#17365D] font-bold flex items-center gap-1.5"
        >
          <Terminal className="w-4 h-4 text-[#1677E8]" />
          <span>{showSqlBox ? 'Ẩn mã SQL khởi tạo bảng' : 'Xem mã SQL khởi tạo bảng Supabase'}</span>
        </button>
      </div>

      {/* SQL Setup Script Box */}
      {showSqlBox && (
        <div className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                Mã lệnh SQL tạo bảng trên Supabase (Chạy 1 lần duy nhất)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tạo bảng <code className="text-amber-300">public.app_state</code> (lưu toàn bộ hệ thống) và <code className="text-amber-300">public.students</code> (bảng danh sách 38 học sinh).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Đã sao chép SQL!' : '1. Sao chép mã SQL'}</span>
              </button>

              <a
                href={SUPABASE_SQL_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <span>2. Mở SQL Editor của dự án</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <pre className="text-[11px] font-mono text-emerald-200 overflow-x-auto max-h-64 p-3 rounded-xl bg-slate-950/90 border border-slate-800 leading-relaxed">
            {SUPABASE_SQL_SETUP_SCRIPT}
          </pre>
        </div>
      )}
    </div>
  );
};
