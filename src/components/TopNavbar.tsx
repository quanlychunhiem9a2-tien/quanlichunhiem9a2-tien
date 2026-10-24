import React, { useState } from 'react';
import {
  Calendar,
  Briefcase,
  Bell,
  Settings,
  Grid,
  Menu,
  ChevronDown,
  Check,
  UserCheck,
  Lock,
  LogOut,
  Eye,
  Shield,
  ShieldAlert,
  KeyRound,
  Camera
} from 'lucide-react';
import { AppState, NavPage, UserAccount } from '../types';
import { guestUserAccount } from '../mockData';
import { isReadOnly, isTeacher, getUserRoleDescription } from '../utils/permissionUtils';
import { LoginModal } from './LoginModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { processAvatarImageFile } from '../utils/avatarUpload';
import { syncUserAccountsWithStudents } from '../utils/cadreSyncUtils';

interface TopNavbarProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onOpenNotifications: () => void;
  onNavigate: (page: NavPage) => void;
  onToggleMobileMenu: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  appState,
  onUpdateState,
  onOpenNotifications,
  onNavigate,
  onToggleMobileMenu,
}) => {
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const classOptions = ['Lớp 9A1', 'Lớp 9A2', 'Lớp 9A3', 'Lớp 8A1', 'Lớp 8A2'];
  const yearOptions = ['Năm học 2026 - 2027', 'Năm học 2025 - 2026'];

  const readOnly = isReadOnly(appState);
  const userDesc = getUserRoleDescription(appState.currentUser);
  const syncedAccounts = syncUserAccountsWithStudents(appState).userAccounts;

  const handleLogout = () => {
    onUpdateState((prev) => ({
      ...prev,
      currentUser: guestUserAccount,
    }));
    setShowTeacherMenu(false);
  };

  const handleCurrentUserAvatarUpload = async (file?: File | null) => {
    if (!file || !appState.currentUser) return;
    try {
      const dataUrl = await processAvatarImageFile(file);
      const currentId = appState.currentUser.id;
      const currentStudentId = appState.currentUser.studentId;
      onUpdateState((prev) => {
        const updatedCurrentUser = prev.currentUser
          ? { ...prev.currentUser, avatar: dataUrl }
          : prev.currentUser;
        const updatedAccounts = (prev.userAccounts || []).map((acc) =>
          acc.id === currentId ? { ...acc, avatar: dataUrl } : acc
        );
        const updatedStudents = currentStudentId
          ? prev.students.map((st) =>
              st.id === currentStudentId ? { ...st, avatar: dataUrl } : st
            )
          : prev.students;
        return {
          ...prev,
          currentUser: updatedCurrentUser,
          userAccounts: updatedAccounts,
          students: updatedStudents,
        };
      });
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#D8E7FA] px-4 lg:px-7 py-3 shadow-[0_2px_10px_rgba(7,59,130,0.03)] flex items-center justify-between gap-4">
        {/* Left: School Name & Slogan */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg bg-blue-50 text-[#073B82] hover:bg-blue-100"
            title="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="leading-tight">
            <h2 className="text-sm lg:text-[15px] font-bold tracking-tight text-[#073B82] uppercase flex items-center gap-2">
              {appState.schoolName}
            </h2>
            <p className="text-[12px] text-[#66809F] font-medium hidden sm:block italic">
              &ldquo;{appState.slogan}&rdquo;
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Class Selector Dropdown (GVCN can change, others view-only) */}
          <div className="relative">
            {isTeacher(appState) ? (
              <>
                <button
                  onClick={() => {
                    setShowClassDropdown(!showClassDropdown);
                    setShowYearDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F0F6FE] hover:bg-[#E2EFFF] border border-[#CDE1FA] text-[#0B438A] text-xs font-semibold transition-colors"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#1677E8]" />
                  <span className="whitespace-nowrap">{appState.className}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#66809F]" />
                </button>

                {showClassDropdown && (
                  <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-[#D8E7FA] py-1 z-50 text-xs">
                    {classOptions.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          onUpdateState((prev) => ({ ...prev, className: c }));
                          setShowClassDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between text-[#17365D]"
                      >
                        <span className={c === appState.className ? 'font-bold text-[#1677E8]' : ''}>{c}</span>
                        {c === appState.className && <Check className="w-3.5 h-3.5 text-[#1677E8]" />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F0F6FE] border border-[#CDE1FA] text-[#0B438A] text-xs font-semibold">
                <Briefcase className="w-3.5 h-3.5 text-[#1677E8]" />
                <span className="whitespace-nowrap">{appState.className}</span>
              </div>
            )}
          </div>

          {/* Academic Year Selector (GVCN can change, others view-only) */}
          <div className="relative hidden md:block">
            {isTeacher(appState) ? (
              <>
                <button
                  onClick={() => {
                    setShowYearDropdown(!showYearDropdown);
                    setShowClassDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F0F6FE] hover:bg-[#E2EFFF] border border-[#CDE1FA] text-[#0B438A] text-xs font-semibold transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#1677E8]" />
                  <span className="whitespace-nowrap">{appState.academicYear}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#66809F]" />
                </button>

                {showYearDropdown && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-[#D8E7FA] py-1 z-50 text-xs">
                    {yearOptions.map((y) => (
                      <button
                        key={y}
                        onClick={() => {
                          onUpdateState((prev) => ({ ...prev, academicYear: y }));
                          setShowYearDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between text-[#17365D]"
                      >
                        <span className={y === appState.academicYear ? 'font-bold text-[#1677E8]' : ''}>{y}</span>
                        {y === appState.academicYear && <Check className="w-3.5 h-3.5 text-[#1677E8]" />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F0F6FE] border border-[#CDE1FA] text-[#0B438A] text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-[#1677E8]" />
                <span className="whitespace-nowrap">{appState.academicYear}</span>
              </div>
            )}
          </div>

          {/* 9-Dots Grid Icon */}
          <button
            onClick={() => onNavigate('reports')}
            title="Ứng dụng & Báo cáo"
            className="w-8 h-8 rounded-lg text-[#66809F] hover:text-[#0B438A] hover:bg-blue-50 flex items-center justify-center transition-colors"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* ================= AUTH / USER STATUS ================= */}
          {readOnly ? (
            /* Guest Mode (Chế độ chỉ xem) */
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 hidden sm:flex">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Chỉ xem</span>
              </span>

              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold shadow-xs transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            </div>
          ) : (
            /* Logged in as Teacher or Authorized Cadre */
            <div className="relative">
              <button
                onClick={() => setShowTeacherMenu(!showTeacherMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-blue-50 border border-blue-200/60 transition-colors bg-white/70"
              >
                <div className="relative">
                  <img
                    src={appState.currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={appState.currentUser?.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-xs"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      appState.currentUser?.role === 'teacher'
                        ? 'bg-blue-600'
                        : appState.currentUser?.category === 'Ban cán sự'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>

                <div className="text-left hidden lg:block leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="block text-xs font-bold text-[#17365D]">
                      {appState.currentUser?.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        appState.currentUser?.role === 'teacher'
                          ? 'bg-blue-100 text-[#0B438A]'
                          : appState.currentUser?.category === 'Ban cán sự'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {appState.currentUser?.roleTitle}
                    </span>
                  </div>
                  <span className="block text-[10px] text-[#66809F] font-medium">
                    {userDesc.scopeText}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#66809F] hidden sm:block" />
              </button>

              {showTeacherMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#D8E7FA] py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  {/* Current Active Account Card */}
                  <div className="px-3.5 py-2.5 mx-2 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-blue-100 mb-2">
                    <span className="text-[10px] font-bold text-[#66809F] uppercase tracking-wider block mb-1">
                      Đang đăng nhập với quyền:
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <label
                          title="Đổi ảnh đại diện"
                          className="relative group/navavatar cursor-pointer shrink-0"
                        >
                          <img
                            src={appState.currentUser?.avatar}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-blue-200 bg-white"
                          />
                          <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover/navavatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Camera className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCurrentUserAvatarUpload(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <div className="min-w-0">
                          <p className="font-extrabold text-[#17365D] text-xs truncate">
                            {appState.currentUser?.name}
                          </p>
                          <p className="text-[#0B438A] font-bold text-[11px] truncate">
                            {appState.currentUser?.roleTitle}
                          </p>
                        </div>
                      </div>
                      <label
                        title="Tải ảnh đại diện từ máy tính"
                        className="px-2 py-1 rounded-lg bg-white hover:bg-blue-50 text-[#1677E8] border border-blue-200 font-bold text-[10.5px] inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs transition-colors"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Đổi ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCurrentUserAvatarUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Account Switcher Section (cho GVCN kiểm thử các vai trò) */}
                  {isTeacher(appState) && (
                    <>
                      <div className="px-3 py-1 text-[11px] font-bold text-[#66809F] uppercase flex items-center justify-between">
                        <span>Chuyển vai trò thử nghiệm:</span>
                        <span className="text-[10px] font-normal lowercase">(chỉ GVCN)</span>
                      </div>

                      <div className="max-h-48 overflow-y-auto px-1 space-y-0.5">
                        {syncedAccounts.map((acc) => {
                          const isCurrent = appState.currentUser?.id === acc.id;
                          return (
                            <button
                              key={acc.id}
                              onClick={() => {
                                onUpdateState((prev) => ({
                                  ...prev,
                                  currentUser: acc,
                                }));
                                setShowTeacherMenu(false);
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                                isCurrent
                                  ? 'bg-blue-50 text-[#1677E8] font-bold'
                                  : 'hover:bg-gray-50 text-[#17365D]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={acc.avatar}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                                <div>
                                  <p className="text-xs leading-none">{acc.name}</p>
                                  <span className="text-[10px] text-[#66809F]">
                                    {acc.roleTitle} {acc.teamId ? `(Tổ ${acc.teamId})` : ''}
                                  </span>
                                </div>
                              </div>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-[#1677E8]" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Bottom Actions */}
                  <div className="border-t border-gray-100 mt-2 pt-1 px-1 space-y-0.5">
                    {isTeacher(appState) && (
                      <button
                        onClick={() => {
                          onNavigate('settings');
                          setShowTeacherMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-blue-50 text-[#17365D] flex items-center gap-2 font-semibold"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#1677E8]" />
                        Quản lý Ma trận Phân quyền
                      </button>
                    )}

                    {/* Đổi mật khẩu tài khoản */}
                    <button
                      onClick={() => {
                        setShowChangePasswordModal(true);
                        setShowTeacherMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-amber-50 text-[#17365D] flex items-center gap-2 font-semibold"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      Đổi mật khẩu tài khoản
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Đăng xuất (Về chế độ chỉ xem)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bell Notification */}
          <button
            onClick={onOpenNotifications}
            className="relative w-8 h-8 rounded-lg text-[#66809F] hover:text-[#0B438A] hover:bg-blue-50 flex items-center justify-center transition-colors"
            title="Thông báo"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-white"></span>
          </button>

          {/* Settings Button (Only for Teacher or navigates) */}
          <button
            onClick={() => onNavigate('settings')}
            className="w-8 h-8 rounded-lg text-[#66809F] hover:text-[#0B438A] hover:bg-blue-50 flex items-center justify-center transition-colors"
            title="Cài đặt hệ thống"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        appState={appState}
        onLogin={(acc) => {
          onUpdateState((prev) => ({
            ...prev,
            currentUser: acc,
          }));
        }}
        onContinueAsGuest={() => {
          onUpdateState((prev) => ({
            ...prev,
            currentUser: guestUserAccount,
          }));
        }}
      />

      {/* Global Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        appState={appState}
        onUpdateState={onUpdateState}
      />
    </>
  );
};
