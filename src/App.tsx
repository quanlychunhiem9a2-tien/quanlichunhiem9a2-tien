import React, { useState, useEffect } from 'react';
import { AppState, NavPage } from './types';
import { defaultAppState } from './mockData';
import { fetchAppState, saveAppState, resetAppState } from './api';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardOverview } from './components/DashboardOverview';
import { StudentManagement } from './components/StudentManagement';
import { AttendanceManager } from './components/AttendanceManager';
import { AcademicConduct } from './components/AcademicConduct';
import { EmulationDiscipline } from './components/EmulationDiscipline';
import { ParentManagement } from './components/ParentManagement';
import { HomeroomPlanComponent } from './components/HomeroomPlan';
import { DocumentLibrary } from './components/DocumentLibrary';
import { AIAssistant } from './components/AIAssistant';
import { ReportsStatistics } from './components/ReportsStatistics';
import { SystemSettings } from './components/SystemSettings';
import { QuickActionModals } from './components/QuickActionModals';
import { NotificationsModal } from './components/NotificationsModal';

export default function App() {
  const [appState, setAppState] = useState<AppState>(defaultAppState);
  const [currentPage, setCurrentPage] = useState<NavPage>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'invite' | 'plan' | 'report' | 'comment' | 'export' | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    fetchAppState().then((data) => {
      if (data) {
        setAppState(data);
      }
      setIsLoaded(true);
    });
  }, []);

  // State updater that auto-saves to backend and localStorage
  const handleUpdateState = (updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  };

  // Toggle tasks completion
  const handleToggleTask = (taskId: string) => {
    handleUpdateState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
    }));
  };

  // Handle student click from dashboard
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentForDetail(studentId);
    setCurrentPage('students');
  };

  // Reset to initial defaults
  const handleResetDefaults = async () => {
    const refreshed = await resetAppState();
    setAppState(refreshed);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F3F8FF] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#1677E8] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-[#073B82] tracking-wide">
          Đang khởi tạo hệ thống GVCN AI...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F8FF] flex">
      {/* Left Sidebar */}
      <div className={`${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'} transition-all duration-300 hidden lg:block shrink-0`}>
        <Sidebar
          currentPage={currentPage}
          onSelectPage={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative z-10 w-[280px] h-full">
            <Sidebar
              currentPage={currentPage}
              onSelectPage={(page) => {
                setCurrentPage(page);
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              collapsed={false}
              onToggleCollapse={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopNavbar
          appState={appState}
          onUpdateState={handleUpdateState}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onNavigate={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-7 max-w-[1720px] w-full mx-auto">
          {currentPage === 'home' && (
            <DashboardOverview
              appState={appState}
              onNavigate={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onToggleTask={handleToggleTask}
              onOpenQuickAction={(action) => setQuickActionType(action)}
              onSelectStudent={handleSelectStudent}
            />
          )}

          {currentPage === 'students' && (
            <StudentManagement
              appState={appState}
              onUpdateState={handleUpdateState}
              selectedStudentId={selectedStudentForDetail}
              onCloseStudentDetail={() => setSelectedStudentForDetail(null)}
            />
          )}

          {currentPage === 'attendance' && (
            <AttendanceManager
              appState={appState}
              onUpdateState={handleUpdateState}
            />
          )}

          {currentPage === 'academics' && (
            <AcademicConduct
              appState={appState}
              onUpdateState={handleUpdateState}
            />
          )}

          {currentPage === 'emulation' && (
            <EmulationDiscipline
              appState={appState}
              onUpdateState={handleUpdateState}
            />
          )}

          {currentPage === 'parents' && (
            <ParentManagement
              appState={appState}
              onUpdateState={handleUpdateState}
            />
          )}

          {currentPage === 'plans' && (
            <HomeroomPlanComponent
              appState={appState}
              onUpdateState={handleUpdateState}
            />
          )}

          {currentPage === 'documents' && (
            <DocumentLibrary
              appState={appState}
              onUpdateState={handleUpdateState}
            />
          )}

          {currentPage === 'ai' && (
            <AIAssistant
              appState={appState}
              onUpdateState={handleUpdateState}
            />
          )}

          {currentPage === 'reports' && (
            <ReportsStatistics appState={appState} />
          )}

          {currentPage === 'settings' && (
            <SystemSettings
              appState={appState}
              onUpdateState={handleUpdateState}
              onResetDefaults={handleResetDefaults}
            />
          )}
        </main>
      </div>

      {/* Quick Action Modals */}
      <QuickActionModals
        actionType={quickActionType}
        onClose={() => setQuickActionType(null)}
        appState={appState}
        onNavigate={(page) => {
          setQuickActionType(null);
          setCurrentPage(page);
        }}
      />

      {/* Notifications Drawer/Modal */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notices={appState.notices}
      />
    </div>
  );
}
