import React from 'react';
import { X, Bell, Calendar, Volume2, Users, FileText } from 'lucide-react';
import { Notice } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: Notice[];
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notices,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#D8E7FA] animate-in fade-in">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#1677E8]" />
            <h3 className="font-extrabold text-[#17365D] text-sm">
              Thông báo nhà trường & lớp học ({notices.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh] divide-y divide-gray-100 space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="pt-3 first:pt-0 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#17365D] text-sm">{n.title}</span>
                <span className="text-[11px] text-[#66809F] font-mono">{n.relativeTime}</span>
              </div>
              <p className="text-[#1677E8] font-semibold">{n.timeInfo}</p>
              <p className="text-gray-600 leading-relaxed">{n.description}</p>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100 text-right bg-gray-50/50">
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
