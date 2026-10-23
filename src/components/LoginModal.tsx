import React, { useState } from 'react';
import {
  Lock,
  UserCheck,
  Shield,
  KeyRound,
  CheckCircle2,
  X,
  Users,
  Eye,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { UserAccount, AppState, RolePermissions } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onLogin: (account: UserAccount) => void;
  onContinueAsGuest?: () => void;
  reasonMessage?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  appState,
  onLogin,
  onContinueAsGuest,
  reasonMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'cadre'>('teacher');
  const [teacherPin, setTeacherPin] = useState('123456');
  const [pinError, setPinError] = useState(false);

  if (!isOpen) return null;

  const userAccounts = appState.userAccounts || [];
  const teacherAccount = userAccounts.find((a) => a.role === 'teacher') || {
    id: 'user-gvcn',
    name: appState.teacherName,
    role: 'teacher',
    roleTitle: appState.teacherRole,
    category: 'GVCN' as const,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '0988776655',
  };

  const cadreAccounts = userAccounts.filter((a) => a.role !== 'teacher');

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow standard PIN 123456 or empty/any demo
    if (teacherPin.trim() === '123456' || teacherPin.trim() === '') {
      onLogin(teacherAccount);
      onClose();
    } else {
      setPinError(true);
    }
  };

  const handleSelectCadre = (account: UserAccount) => {
    onLogin(account);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1677E8] text-white flex items-center justify-center shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#17365D] text-base">
                Đăng nhập hệ thống GVCN AI
              </h3>
              <p className="text-xs text-[#66809F]">
                {appState.schoolName} • {appState.className}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason Alert if triggered from an edit attempt */}
        {reasonMessage && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{reasonMessage}</span>
          </div>
        )}

        {/* Tab selection */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-gray-100 bg-gray-50/60">
          <button
            onClick={() => setActiveTab('teacher')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'teacher'
                ? 'bg-white text-[#1677E8] border-[#1677E8] shadow-2xs'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Giáo viên chủ nhiệm
          </button>
          <button
            onClick={() => setActiveTab('cadre')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'cadre'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Cán sự lớp & Tổ trưởng ({cadreAccounts.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'teacher' && (
            <form onSubmit={handleTeacherSubmit} className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-2xl border border-blue-100 flex items-center gap-3">
                <img
                  src={teacherAccount.avatar}
                  alt={teacherAccount.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1677E8] block">
                    Tài khoản Quản trị viên
                  </span>
                  <h4 className="text-sm font-black text-[#17365D] truncate">
                    {teacherAccount.name}
                  </h4>
                  <p className="text-[11px] text-[#66809F]">
                    {teacherAccount.roleTitle} • Toàn quyền chỉnh sửa hệ thống
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0B438A] font-bold text-[10px]">
                  Full Access
                </span>
              </div>

              <div>
                <label className="font-bold text-[#17365D] block mb-1.5 flex items-center justify-between">
                  <span>Mã PIN / Mật khẩu GVCN:</span>
                  <span className="text-[11px] text-[#66809F] font-normal italic">
                    (Mặc định demo: <strong>123456</strong>)
                  </span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={teacherPin}
                    onChange={(e) => {
                      setTeacherPin(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="Nhập 123456..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#1677E8] focus:border-transparent"
                  />
                </div>
                {pinError && (
                  <p className="text-rose-600 text-[11px] mt-1 font-medium">
                    Mã PIN không đúng. Vui lòng nhập 123456 để tiếp tục!
                  </p>
                )}
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1 text-[11px] text-[#66809F]">
                <strong className="text-[#0B438A] block">Quyền hạn khi đăng nhập GVCN:</strong>
                <p>• Thêm, sửa, xóa thông tin học sinh, nhập xuất Excel</p>
                <p>• Nhập điểm theo HK1, HK2, Cả năm và tự động xếp loại TT22</p>
                <p>• Điểm danh, ghi nhận thi đua, lập kế hoạch tuần, phân quyền cán sự</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <UserCheck className="w-4 h-4" />
                Đăng nhập với quyền GVCN
              </button>
            </form>
          )}

          {activeTab === 'cadre' && (
            <div className="space-y-3">
              <p className="text-[#66809F] text-[11px]">
                Chọn tài khoản cán sự lớp để đăng nhập. Quyền thao tác sẽ được giới hạn chính xác theo ma trận phân quyền đã được GVCN cấp:
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cadreAccounts.map((acc) => {
                  const perms = appState.rolePermissions?.[acc.role];
                  return (
                    <div
                      key={acc.id}
                      className="p-3 bg-gray-50/80 hover:bg-blue-50/60 rounded-2xl border border-gray-200 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={acc.avatar}
                          alt={acc.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-300 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#17365D] text-xs truncate">
                              {acc.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                acc.category === 'Ban cán sự'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {acc.roleTitle}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#66809F] truncate mt-0.5">
                            {acc.teamId ? `Tổ ${acc.teamId} • ` : ''}
                            {perms?.canTakeAttendance ? '✓ Điểm danh ' : ''}
                            {perms?.canRecordEmulation ? '✓ Thi đua ' : ''}
                            {perms?.canProposePlanTask ? '✓ Kế hoạch' : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectCadre(acc)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#1677E8] text-[#1677E8] hover:text-white border border-[#D8E7FA] font-bold text-xs flex items-center gap-1 transition-all shrink-0 shadow-2xs"
                      >
                        Chọn <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <button
            onClick={() => {
              if (onContinueAsGuest) onContinueAsGuest();
              onClose();
            }}
            className="text-xs font-semibold text-[#66809F] hover:text-[#17365D] flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Tiếp tục xem (Khách chỉ đọc)
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
