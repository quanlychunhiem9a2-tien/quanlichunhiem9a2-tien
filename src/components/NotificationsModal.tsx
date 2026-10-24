import React from 'react';
import { X, Bell, Pin, Megaphone } from 'lucide-react';
import { Notice } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: Notice[];
  onOpenAnnouncementsPage?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notices,
  onOpenAnnouncementsPage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#1677E8]" />
            <h3 className="font-extrabold text-[#17365D] text-sm">
              Thông báo & Sự kiện lớp học ({notices.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[65vh] divide-y divide-gray-100 space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="pt-3 first:pt-0 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {n.isPinned && <Pin className="w-3.5 h-3.5 text-[#1677E8] shrink-0" />}
                  {n.category && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1677E8] font-bold text-[10px] shrink-0">
                      {n.category}
                    </span>
                  )}
                  <span className="font-bold text-[#17365D] text-sm truncate">{n.title}</span>
                </div>
                <span className="text-[11px] text-[#66809F] font-mono shrink-0">{n.relativeTime}</span>
              </div>
              <p className="text-[#1677E8] font-semibold">{n.timeInfo}</p>
              <p className="text-gray-600 leading-relaxed">{n.description}</p>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          {onOpenAnnouncementsPage ? (
            <button
              onClick={onOpenAnnouncementsPage}
              className="px-3.5 py-1.5 rounded-xl bg-[#1677E8] hover:bg-[#073B82] font-bold text-xs text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Mở trang Thông báo & Sự kiện
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-[#17365D] cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
