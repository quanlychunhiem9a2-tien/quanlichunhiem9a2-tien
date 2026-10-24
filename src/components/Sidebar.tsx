import React from 'react';
import {
  Home,
  Users,
  CalendarCheck,
  GraduationCap,
  Trophy,
  UserCheck,
  FileSpreadsheet,
  FileText,
  Sparkles,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
  Megaphone
} from 'lucide-react';
import { NavPage } from '../types';

interface SidebarProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
}) => {
  const menuItems: { id: NavPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'announcements', label: 'Thông báo', icon: Megaphone },
    { id: 'students', label: 'Quản lý học sinh', icon: Users },
    { id: 'attendance', label: 'Điểm danh - Chuyên cần', icon: CalendarCheck },
    { id: 'academics', label: 'Học tập - Rèn luyện', icon: GraduationCap },
    { id: 'emulation', label: 'Thi đua - Nề nếp', icon: Trophy },
    { id: 'parents', label: 'Liên lạc phụ huynh', icon: UserCheck },
    { id: 'plans', label: 'Kế hoạch chủ nhiệm', icon: FileSpreadsheet },
    { id: 'documents', label: 'Hồ sơ - Văn bản', icon: FileText },
    { id: 'ai', label: 'Trợ lý AI GVCN', icon: Sparkles },
    { id: 'reports', label: 'Báo cáo - Thống kê', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col justify-between transition-all duration-300 text-white shadow-xl ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #073B82 0%, #0A438C 45%, #0B4A9A 100%)',
      }}
    >
      {/* Top Header Logo */}
      <div>
        <div className="flex items-center justify-between px-4 py-5 border-b border-blue-900/40">
          <div
            onClick={() => onSelectPage('home')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden select-none"
          >
            {/* Logo Emblem Icon */}
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner group">
              <div className="relative flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white drop-shadow group-hover:scale-105 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2995FF]"></span>
                </span>
              </div>
            </div>

            {!collapsed && (
              <div className="leading-tight">
                <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                  GVCN AI
                </h1>
                <p className="text-[11px] text-blue-200/80 font-medium tracking-wide">
                  Lớp học thông minh
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 items-center justify-center text-blue-200 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[13.5px] transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1677E8] text-white shadow-md shadow-blue-900/30 font-semibold'
                    : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-blue-200/90'}`} />
                {!collapsed && <span className="truncate text-left">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Slogan Banner at bottom */}
      {!collapsed ? (
        <div className="p-4 mx-3 mb-4 rounded-xl bg-white/5 border border-white/10 text-center relative overflow-hidden backdrop-blur-xs">
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-1.5 text-blue-200 mb-1">
              <Send className="w-3.5 h-3.5 rotate-12 text-[#2995FF]" />
              <span className="text-[12px] font-medium tracking-wide italic text-blue-100">
                Đồng hành cùng học sinh
              </span>
            </div>
            <p className="text-[11px] font-bold text-white tracking-wider uppercase">
              Kiến tạo tương lai
            </p>
          </div>
          {/* Subtle background decoration */}
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-400/10 rounded-full blur-xl pointer-events-none"></div>
        </div>
      ) : (
        <div className="p-3 text-center text-blue-300">
          <Send className="w-4 h-4 mx-auto rotate-12 opacity-80" />
        </div>
      )}
    </aside>
  );
};
