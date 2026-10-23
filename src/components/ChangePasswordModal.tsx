import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { AppState, UserAccount } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  appState,
  onUpdateState,
}) => {
  const currentUser = appState.currentUser;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !currentUser || currentUser.role === 'guest') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const actualCurrentPass = currentUser.password || '123456';
    if (currentPassword !== actualCurrentPass) {
      setError('Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại!');
      return;
    }

    if (!newPassword.trim()) {
      setError('Mật khẩu mới không được để trống!');
      return;
    }

    if (newPassword.length < 4) {
      setError('Mật khẩu mới phải có tối thiểu 4 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    // Update password in userAccounts & currentUser
    onUpdateState((prev) => {
      const updatedAccounts = (prev.userAccounts || []).map((acc) => {
        if (acc.id === currentUser.id) {
          return { ...acc, password: newPassword };
        }
        return acc;
      });

      const updatedCurrentUser = {
        ...currentUser,
        password: newPassword,
      };

      return {
        ...prev,
        userAccounts: updatedAccounts,
        currentUser: updatedCurrentUser,
      };
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1677E8] text-white flex items-center justify-center shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#17365D] text-base">
                Đổi mật khẩu tài khoản
              </h3>
              <p className="text-xs text-[#66809F]">
                {currentUser.name} • {currentUser.roleTitle}
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

        {/* Content */}
        <div className="p-5 text-xs">
          {success ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="text-sm font-black text-[#17365D]">
                Đổi mật khẩu thành công!
              </h4>
              <p className="text-xs text-[#66809F]">
                Mật khẩu mới đã được lưu an toàn. Vui lòng ghi nhớ mật khẩu cho lần đăng nhập tới.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-[#17365D] block mb-1">
                  Mật khẩu hiện tại:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#1677E8] focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 italic block mt-0.5">
                  (Mặc định ban đầu nếu chưa đổi: 123456)
                </span>
              </div>

              <div>
                <label className="font-bold text-[#17365D] block mb-1">
                  Mật khẩu mới:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)..."
                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#1677E8] focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#17365D] block mb-1">
                  Xác nhận mật khẩu mới:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#1677E8] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Lưu mật khẩu mới
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
