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
  UserCheck
} from 'lucide-react';
import { AppState, NavPage } from '../types';

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

  const classOptions = ['Lớp 9A1', 'Lớp 9A2', 'Lớp 9A3', 'Lớp 8A1', 'Lớp 8A2'];
  const yearOptions = ['Năm học 2026 - 2027', 'Năm học 2025 - 2026'];

  return (
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
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        {/* Class Selector Dropdown */}
        <div className="relative">
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
        </div>

        {/* Academic Year Selector */}
        <div className="relative hidden md:block">
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
        </div>

        {/* 9-Dots Grid Icon */}
        <button
          onClick={() => onNavigate('reports')}
          title="Ứng dụng & Báo cáo"
          className="w-8 h-8 rounded-lg text-[#66809F] hover:text-[#0B438A] hover:bg-blue-50 flex items-center justify-center transition-colors"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Teacher / Student Role Profile Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowTeacherMenu(!showTeacherMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
          >
            <div className="relative">
              <img
                src={appState.currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt={appState.currentUser?.name || appState.teacherName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-xs"
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                appState.currentUser?.role === 'teacher'
                  ? 'bg-blue-600'
                  : appState.currentUser?.category === 'Ban cán sự'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`} />
            </div>

            <div className="text-left hidden lg:block leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="block text-xs font-bold text-[#17365D]">
                  {appState.currentUser?.name || appState.teacherName}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  appState.currentUser?.role === 'teacher'
                    ? 'bg-blue-100 text-[#0B438A]'
                    : appState.currentUser?.category === 'Ban cán sự'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {appState.currentUser?.roleTitle || appState.teacherRole}
                </span>
              </div>
              <span className="block text-[10px] text-[#66809F] font-medium">
                {appState.currentUser?.role === 'teacher'
                  ? 'Quản trị viên (Toàn quyền)'
                  : appState.currentUser?.teamId
                  ? `Phạm vi: Tổ ${appState.currentUser.teamId}`
                  : 'Phạm vi: Cả lớp'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#66809F] hidden sm:block" />
          </button>

          {showTeacherMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#D8E7FA] py-2 z-50 text-xs animate-in fade-in zoom-in-95">
              {/* Current Active Account Card */}
              <div className="px-3.5 py-2.5 mx-2 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-blue-100 mb-2">
                <span className="text-[10px] font-bold text-[#66809F] uppercase tracking-wider block mb-1">
                  Đang thao tác với quyền:
                </span>
                <div className="flex items-center gap-2.5">
                  <img
                    src={appState.currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-blue-200"
                  />
                  <div>
                    <p className="font-extrabold text-[#17365D] text-xs">
                      {appState.currentUser?.name || appState.teacherName}
                    </p>
                    <p className="text-[#0B438A] font-bold text-[11px]">
                      {appState.currentUser?.roleTitle || appState.teacherRole}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Switcher Section */}
              <div className="px-3 py-1 text-[11px] font-bold text-[#66809F] uppercase flex items-center justify-between">
                <span>Chuyển vai trò nhập liệu:</span>
                <span className="text-[10px] font-normal lowercase">(thử nghiệm phân quyền)</span>
              </div>

              <div className="max-h-52 overflow-y-auto px-1 space-y-0.5">
                {(appState.userAccounts || []).map((acc) => {
                  const isCurrent = (appState.currentUser?.id || 'user-gvcn') === acc.id;
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

              {/* Bottom Quick Links */}
              <div className="border-t border-gray-100 mt-2 pt-1 px-1">
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
              </div>
            </div>
          )}
        </div>

        {/* Bell Notification */}
        <button
          onClick={onOpenNotifications}
          className="relative w-8 h-8 rounded-lg text-[#66809F] hover:text-[#0B438A] hover:bg-blue-50 flex items-center justify-center transition-colors"
          title="Thông báo"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-white"></span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => onNavigate('settings')}
          className="w-8 h-8 rounded-lg text-[#66809F] hover:text-[#0B438A] hover:bg-blue-50 flex items-center justify-center transition-colors"
          title="Cài đặt hệ thống"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
