import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  Shield,
  School,
  UserCheck,
  Check,
  Users,
  ShieldCheck,
  KeyRound,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowRightLeft,
  UserPlus,
  Trash2,
  Edit3,
  X,
  Trophy,
  PhoneCall,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Lock,
  Eye,
  Database,
  Camera
} from 'lucide-react';
import { AppState, UserRole, RolePermissions, UserAccount, Student } from '../types';
import { initialUserAccounts, defaultRolePermissions } from '../mockData';
import { hasPermission, isReadOnly, isTeacher } from '../utils/permissionUtils';
import { SupabaseConnectPanel } from './SupabaseConnectPanel';
import { processAvatarImageFile, PRESET_TEACHER_AVATARS } from '../utils/avatarUpload';
import {
  syncUserAccountsWithStudents,
  STANDARD_CLASS_ROLES,
  applyStudentTeamOrRoleUpdate,
  applyAvatarUpdate
} from '../utils/cadreSyncUtils';

interface SystemSettingsProps {
  appState: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onResetDefaults: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  appState,
  onUpdateState,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'modules_guide' | 'school' | 'backup'>('permissions');

  const [formData, setFormData] = useState({
    schoolName: appState.schoolName,
    slogan: appState.slogan,
    teacherName: appState.teacherName,
    teacherRole: appState.teacherRole,
    className: appState.className,
    academicYear: appState.academicYear,
  });

  const [permissionsState, setPermissionsState] = useState<Record<string, RolePermissions>>(
    appState.rolePermissions || defaultRolePermissions
  );

  const [saved, setSaved] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<UserAccount | null>(null);
  const [accountToManagePassword, setAccountToManagePassword] = useState<UserAccount | null>(null);
  const [managedNewPassword, setManagedNewPassword] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('123456');

  // Add Modal Form State
  const [newAccountSource, setNewAccountSource] = useState<'existing_student' | 'manual'>('existing_student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountRoleTitle, setNewAccountRoleTitle] = useState('');
  const [newAccountCategory, setNewAccountCategory] = useState<'Ban cán sự' | 'Tổ trưởng' | 'Cán sự bộ môn' | 'Khác'>('Ban cán sự');
  const [newAccountTeamId, setNewAccountTeamId] = useState<number | undefined>(undefined);
  const [newAccountAvatar, setNewAccountAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
  const [newAccountPhone, setNewAccountPhone] = useState('');

  // Default permissions for new role
  const [newAccountPerms, setNewAccountPerms] = useState<RolePermissions>({
    canManageStudents: false,
    canTakeAttendance: true,
    attendanceScope: 'own_team',
    canManageAcademics: false,
    canRecordEmulation: true,
    emulationScope: 'own_team',
    canCreateOfficialPlan: false,
    canProposePlanTask: true,
    canToggleTasks: true,
    canManageParents: false,
    canUseAI: false,
    canExportReports: false,
    canConfigureSystem: false,
  });

  const syncedCadres = syncUserAccountsWithStudents(appState);
  const userAccounts: UserAccount[] = syncedCadres.userAccounts;
  const currentUser: UserAccount = syncedCadres.currentUser;
  const isGVCN = isTeacher(appState);
  const readOnly = isReadOnly(appState);

  const teacherAccount =
    userAccounts.find((acc) => acc.role === 'teacher') || userAccounts[0];

  const handleAccountAvatarUpload = async (accountId: string, file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await processAvatarImageFile(file);
      const targetAcc = userAccounts.find((a) => a.id === accountId);
      onUpdateState((prev) =>
        applyAvatarUpdate(
          prev,
          {
            accountId,
            studentId: targetAcc?.studentId,
            isTeacher: targetAcc?.role === 'teacher' || accountId === teacherAccount?.id,
          },
          dataUrl
        )
      );
      setEditingAccount((prev) =>
        prev && prev.id === accountId ? { ...prev, avatar: dataUrl } : prev
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Avatar upload error:', err);
    }
  };

  const handleSetTeacherPresetAvatar = (presetUrl: string) => {
    if (!teacherAccount) return;
    onUpdateState((prev) =>
      applyAvatarUpdate(
        prev,
        {
          accountId: teacherAccount.id,
          isTeacher: true,
        },
        presetUrl
      )
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = () => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền lưu và cập nhật cấu hình hệ thống!');
      return;
    }
    onUpdateState((prev) => {
      const updatedAccounts = (prev.userAccounts || initialUserAccounts).map((acc) =>
        acc.role === 'teacher'
          ? { ...acc, name: formData.teacherName || acc.name }
          : acc
      );
      const updatedCurrentUser =
        prev.currentUser?.role === 'teacher'
          ? { ...prev.currentUser, name: formData.teacherName || prev.currentUser.name }
          : prev.currentUser;
      return {
        ...prev,
        ...formData,
        rolePermissions: permissionsState,
        userAccounts: updatedAccounts,
        currentUser: updatedCurrentUser,
      };
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSwitchRole = (account: UserAccount) => {
    onUpdateState((prev) => ({
      ...prev,
      currentUser: account,
    }));
  };

  const handleUpdatePermission = (
    role: string,
    field: keyof RolePermissions,
    value: any
  ) => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền sửa đổi quyền hạn vai trò!');
      return;
    }
    const updated = {
      ...permissionsState,
      [role]: {
        ...(permissionsState[role] || defaultRolePermissions.class_monitor),
        [field]: value,
      },
    };
    setPermissionsState(updated);
    onUpdateState((prev) => ({
      ...prev,
      rolePermissions: updated,
    }));
  };

  const handleResetPermissionsToDefault = () => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền khôi phục ma trận phân quyền mặc định!');
      return;
    }
    if (confirm('Khôi phục ma trận phân quyền về chuẩn mực mặc định của Bộ GD&ĐT?')) {
      setPermissionsState(defaultRolePermissions);
      onUpdateState((prev) => ({
        ...prev,
        rolePermissions: defaultRolePermissions,
      }));
    }
  };

  // Student selection in Add modal
  const handleSelectStudentForAccount = (stId: string) => {
    setSelectedStudentId(stId);
    const st = appState.students.find((s) => s.id === stId);
    if (st) {
      setNewAccountName(st.fullName);
      setNewAccountAvatar(st.avatar);
      setNewAccountPhone(st.parentPhone || '');
      setNewAccountTeamId(st.teamId);
      if (st.roleInClass && st.roleInClass !== 'Học sinh') {
        setNewAccountRoleTitle(st.roleInClass);
      } else {
        setNewAccountRoleTitle(`Tổ phó Tổ ${st.teamId}`);
      }
    }
  };

  // Preset permissions selector
  const applyPresetPermissions = (preset: 'leader' | 'officer' | 'subject' | 'activity') => {
    if (preset === 'leader') {
      setNewAccountPerms({
        canManageStudents: false,
        canTakeAttendance: true,
        attendanceScope: 'own_team',
        canManageAcademics: false,
        canRecordEmulation: true,
        emulationScope: 'own_team',
        canCreateOfficialPlan: false,
        canProposePlanTask: true,
        canToggleTasks: true,
        canManageParents: false,
        canUseAI: false,
        canExportReports: false,
        canConfigureSystem: false,
      });
    } else if (preset === 'officer') {
      setNewAccountPerms({
        canManageStudents: false,
        canTakeAttendance: true,
        attendanceScope: 'all',
        canManageAcademics: false,
        canRecordEmulation: true,
        emulationScope: 'all',
        canCreateOfficialPlan: false,
        canProposePlanTask: true,
        canToggleTasks: true,
        canManageParents: false,
        canUseAI: true,
        canExportReports: true,
        canConfigureSystem: false,
      });
    } else if (preset === 'subject') {
      setNewAccountPerms({
        canManageStudents: false,
        canTakeAttendance: false,
        attendanceScope: 'none',
        canManageAcademics: true,
        canRecordEmulation: false,
        emulationScope: 'none',
        canCreateOfficialPlan: false,
        canProposePlanTask: true,
        canToggleTasks: true,
        canManageParents: false,
        canUseAI: false,
        canExportReports: false,
        canConfigureSystem: false,
      });
    } else if (preset === 'activity') {
      setNewAccountPerms({
        canManageStudents: false,
        canTakeAttendance: false,
        attendanceScope: 'none',
        canManageAcademics: false,
        canRecordEmulation: true,
        emulationScope: 'all',
        canCreateOfficialPlan: false,
        canProposePlanTask: true,
        canToggleTasks: true,
        canManageParents: false,
        canUseAI: false,
        canExportReports: true,
        canConfigureSystem: false,
      });
    }
  };

  // Submit Add Account
  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền thêm vai trò phân quyền!');
      return;
    }
    if (!newAccountName.trim() || !newAccountRoleTitle.trim()) {
      alert('Vui lòng điền đầy đủ họ tên và tên chức vụ / vai trò!');
      return;
    }

    const uniqueKey = `role_${Date.now()}`;
    const newId = `user_${Date.now()}`;

    const newAcc: UserAccount = {
      id: newId,
      name: newAccountName.trim(),
      role: uniqueKey,
      roleTitle: newAccountRoleTitle.trim(),
      category: newAccountCategory,
      teamId: newAccountTeamId,
      studentId: selectedStudentId || undefined,
      avatar: newAccountAvatar,
      phone: newAccountPhone || undefined,
      password: newAccountPassword.trim() || '123456',
    };

    const updatedAccounts = [...userAccounts, newAcc];
    const updatedPermissions = {
      ...permissionsState,
      [uniqueKey]: newAccountPerms,
    };

    setPermissionsState(updatedPermissions);
    onUpdateState((prev) => {
      const updatedStudents = selectedStudentId
        ? prev.students.map((st) =>
            st.id === selectedStudentId
              ? {
                  ...st,
                  roleInClass: newAcc.roleTitle,
                  teamId: newAccountTeamId || st.teamId,
                }
              : st
          )
        : prev.students;
      const synced = syncUserAccountsWithStudents({
        ...prev,
        students: updatedStudents,
        userAccounts: [...userAccounts.filter((a) => a.studentId !== selectedStudentId || !selectedStudentId), newAcc],
        rolePermissions: updatedPermissions,
      });
      return {
        ...prev,
        students: updatedStudents,
        userAccounts: synced.userAccounts,
        rolePermissions: synced.rolePermissions,
      };
    });

    setShowAddModal(false);
    // Reset form
    setSelectedStudentId('');
    setNewAccountName('');
    setNewAccountRoleTitle('');
    setNewAccountPassword('123456');
    alert(`Đã thêm thành công vai trò phân quyền: "${newAcc.roleTitle}" cho ${newAcc.name}! Mật khẩu đăng nhập: ${newAcc.password}`);
  };

  const handleSaveManagedPassword = (newPass: string) => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền thay đổi mật khẩu của các tài khoản khác!');
      return;
    }
    if (!accountToManagePassword) return;
    if (!newPass.trim() || newPass.trim().length < 4) {
      alert('Mật khẩu phải có tối thiểu 4 ký tự!');
      return;
    }

    const updatedAccounts = userAccounts.map((acc) => {
      if (acc.id === accountToManagePassword.id) {
        return { ...acc, password: newPass.trim() };
      }
      return acc;
    });

    let updatedCurrent = currentUser;
    if (currentUser.id === accountToManagePassword.id) {
      updatedCurrent = { ...currentUser, password: newPass.trim() };
    }

    onUpdateState((prev) => ({
      ...prev,
      userAccounts: updatedAccounts,
      currentUser: updatedCurrent,
    }));

    alert(`Đã cập nhật mật khẩu cho "${accountToManagePassword.name}" (${accountToManagePassword.roleTitle}) thành công!`);
    setAccountToManagePassword(null);
    setManagedNewPassword('');
  };

  // Handle Delete Account
  const handleConfirmDelete = () => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền xóa tài khoản phân quyền!');
      return;
    }
    if (!accountToDelete) return;

    if (accountToDelete.role === 'teacher') {
      alert('Không thể xóa tài khoản Quản trị viên tối cao (GVCN)!');
      setAccountToDelete(null);
      return;
    }

    const updatedAccounts = userAccounts.filter((a) => a.id !== accountToDelete.id);
    let newCurrent = currentUser;

    // If deleting the active currentUser, fallback to GVCN (userAccounts[0])
    if (currentUser.id === accountToDelete.id) {
      newCurrent = userAccounts[0];
    }

    onUpdateState((prev) => {
      const updatedStudents = accountToDelete.studentId
        ? prev.students.map((st) =>
            st.id === accountToDelete.studentId
              ? { ...st, roleInClass: 'Thành viên' }
              : st
          )
        : prev.students;
      const synced = syncUserAccountsWithStudents({
        ...prev,
        students: updatedStudents,
        userAccounts: updatedAccounts,
        currentUser: newCurrent,
      });
      return {
        ...prev,
        students: updatedStudents,
        userAccounts: synced.userAccounts,
        currentUser: synced.currentUser,
      };
    });

    setAccountToDelete(null);
  };

  // Handle Save Edit Account (including roleTitle, teamId, studentId, and permissions)
  const handleUpdateCadreAccountMeta = (
    account: UserAccount,
    updates: { roleTitle?: string; teamId?: number; studentId?: string }
  ) => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền chỉnh sửa tổ và chức danh cán sự!');
      return;
    }

    onUpdateState((prev) => {
      // If changing which student holds this cadre position
      if (updates.studentId && updates.studentId !== account.studentId) {
        const cleanTitle = (updates.roleTitle || account.roleTitle).replace(/\s*Tổ\s*\d+/i, '').trim() || 'Cán sự lớp';
        const updatedStudents = prev.students.map((st) => {
          if (st.id === account.studentId) {
            return { ...st, roleInClass: 'Thành viên' };
          }
          if (st.id === updates.studentId) {
            return {
              ...st,
              roleInClass: cleanTitle,
              teamId: updates.teamId !== undefined ? updates.teamId : st.teamId,
            };
          }
          return st;
        });
        const synced = syncUserAccountsWithStudents({
          ...prev,
          students: updatedStudents,
          rolePermissions: permissionsState,
        });
        return {
          ...prev,
          students: updatedStudents,
          userAccounts: synced.userAccounts,
          rolePermissions: synced.rolePermissions,
          currentUser: synced.currentUser,
        };
      }

      // If account is linked to a studentId, update that student's teamId & roleInClass
      if (account.studentId) {
        return applyStudentTeamOrRoleUpdate(
          {
            ...prev,
            rolePermissions: permissionsState,
          },
          account.studentId,
          {
            teamId: updates.teamId,
            roleInClass: updates.roleTitle,
          }
        );
      }

      // Manual account without studentId
      const updatedManualAccounts = (prev.userAccounts || []).map((a) =>
        a.id === account.id
          ? {
              ...a,
              roleTitle: updates.roleTitle !== undefined ? updates.roleTitle : a.roleTitle,
              teamId: updates.teamId !== undefined ? updates.teamId : a.teamId,
            }
          : a
      );
      return {
        ...prev,
        userAccounts: updatedManualAccounts,
        rolePermissions: permissionsState,
      };
    });
  };

  const handleSaveEditPermissions = () => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền lưu chỉnh sửa phân quyền!');
      return;
    }
    if (!editingAccount) return;
    handleUpdateCadreAccountMeta(editingAccount, {
      roleTitle: editingAccount.roleTitle,
      teamId: editingAccount.teamId,
      studentId: editingAccount.studentId,
    });
    setEditingAccount(null);
    alert('Đã cập nhật chức danh, tổ phụ trách và phân quyền chi tiết cho vai trò!');
  };

  const handleBackupJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GVCN_AI_Backup_${appState.className}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền khôi phục dữ liệu từ JSON!');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.students) {
          onUpdateState(() => parsed);
          alert('Đã khôi phục dữ liệu hệ thống thành công!');
        }
      } catch (err) {
        alert('Tệp sao lưu không hợp lệ. Vui lòng kiểm tra lại!');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = async () => {
    if (!isGVCN) {
      alert('Chỉ tài khoản Giáo viên chủ nhiệm mới có quyền làm mới dữ liệu về mặc định!');
      return;
    }
    if (confirm('Thầy/Cô có chắc chắn muốn nạp lại dữ liệu DEMO mẫu ban đầu? Toàn bộ thay đổi chưa lưu sẽ được làm mới.')) {
      await onResetDefaults();
      alert('Đã đặt lại dữ liệu mặc định thành công!');
    }
  };

  // The 8 Authorized System Modules
  const authorizedModules = [
    {
      id: 'attendance',
      name: '1. Điểm danh & Chuyên cần',
      icon: UserCheck,
      color: 'bg-blue-600',
      lightBg: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Ghi nhận sĩ số học sinh hàng ngày: có mặt, vắng có phép, vắng không phép, đi muộn. Tự động tổng hợp tỉ lệ chuyên cần tuần và tháng.',
      levels: [
        { label: 'Toàn bộ lớp', note: 'GVCN, Lớp trưởng có thể điểm danh toàn bộ 38 học sinh trong lớp.' },
        { label: 'Chỉ Tổ phụ trách', note: 'Tổ trưởng Tổ 1, 2, 3, 4 chỉ được điểm danh và báo vắng cho các bạn thuộc tổ của mình.' },
        { label: 'Không có quyền', note: 'Chỉ xem trạng thái sĩ số lớp, không được bấm thay đổi trạng thái điểm danh.' },
      ],
      typicalRoles: 'GVCN, Lớp trưởng, 4 Tổ trưởng',
    },
    {
      id: 'emulation',
      name: '2. Thi đua & Nề nếp (35 Tuần)',
      icon: Trophy,
      color: 'bg-amber-500',
      lightBg: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Chấm điểm cộng/trừ thi đua theo 35 tuần học. 5 tiêu chí: Chuyên cần, Đồng phục, Trực nhật - Vệ sinh, Học tập - Truy bài, Kỷ luật - Phong trào.',
      levels: [
        { label: 'Toàn bộ 4 tổ', note: 'GVCN, Lớp phó nề nếp theo dõi và chấm điểm thi đua cho cả 4 tổ trong lớp.' },
        { label: 'Chỉ Tổ phụ trách', note: 'Tổ trưởng ghi nhận nhật ký vi phạm và khen thưởng của thành viên tổ mình.' },
        { label: 'Không có quyền', note: 'Không được tạo hoặc xóa biên bản thi đua nề nếp.' },
      ],
      typicalRoles: 'GVCN, Lớp phó nề nếp, 4 Tổ trưởng',
    },
    {
      id: 'plans',
      name: '3. Kế hoạch công tác tuần (35 Tuần)',
      icon: Calendar,
      color: 'bg-indigo-600',
      lightBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Lập kế hoạch tuần học theo chuẩn Bộ GD&ĐT: Mục tiêu, biện pháp trọng tâm, phân công nhiệm vụ từ Thứ Hai đến Thứ Bảy, quản lý học sinh cần lưu ý.',
      levels: [
        { label: 'Duyệt & Ban hành', note: 'Quyền độc quyền của GVCN để phê duyệt và ban hành kế hoạch chính thức của lớp.' },
        { label: 'Đề xuất việc tuần', note: 'Ban cán sự và Tổ trưởng được thêm các công việc phong trào, lịch trực nhật của tổ vào kế hoạch.' },
        { label: 'Tích việc hoàn thành', note: 'Học sinh được phân công có thể đánh dấu tích đã làm xong nhiệm vụ.' },
      ],
      typicalRoles: 'GVCN (Duyệt), Ban cán sự & Tổ trưởng (Đề xuất & Tích việc)',
    },
    {
      id: 'students',
      name: '4. Hồ sơ lý lịch học sinh',
      icon: Users,
      color: 'bg-emerald-600',
      lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Quản lý thông tin 38 học sinh: mã số, ngày sinh, địa chỉ, số điện thoại phụ huynh, chức vụ, tình trạng sức khỏe. Nhập học sinh hàng loạt bằng file Excel.',
      levels: [
        { label: 'Toàn quyền quản trị', note: 'GVCN có quyền thêm mới, chỉnh sửa lý lịch, tải lên file Excel học sinh, xóa hồ sơ.' },
        { label: 'Chỉ xem danh sách', note: 'Cán sự lớp chỉ được tra cứu danh sách học sinh và phân chia tổ, không thể sửa thông tin.' },
      ],
      typicalRoles: 'GVCN (Bảo mật nhân thân học sinh)',
    },
    {
      id: 'academics',
      name: '5. Học tập & Bảng điểm TT22',
      icon: FileSpreadsheet,
      color: 'bg-cyan-600',
      lightBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      description: 'Quản lý điểm số 7 môn học (Toán, Văn, Anh, KHTN, Lịch sử - Địa lý, Tin học, GDCD) theo Thông tư 22/BGDĐT. Tính GPA tự động, xếp loại học lực Tốt, Khá, Đạt, Chưa đạt.',
      levels: [
        { label: 'Nhập điểm & Đánh giá', note: 'GVCN và Lớp phó học tập được phân quyền nhập điểm kiểm tra thường xuyên, giữa kỳ và cuối kỳ.' },
        { label: 'Chỉ xem bảng điểm', note: 'Học sinh và cán sự chỉ được xem thống kê điểm trung bình của lớp.' },
      ],
      typicalRoles: 'GVCN, Lớp phó học tập',
    },
    {
      id: 'parents',
      name: '6. Liên lạc Phụ huynh',
      icon: PhoneCall,
      color: 'bg-rose-500',
      lightBg: 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'Danh bạ phụ huynh (cập nhật họ tên, số điện thoại, nghề nghiệp) và nhật ký trao đổi với phụ huynh học sinh qua Điện thoại, Zalo, Gặp trực tiếp hoặc Họp phụ huynh.',
      levels: [
        { label: 'Quản trị trao đổi', note: 'GVCN trực tiếp ghi nhận và tra cứu lịch sử liên lạc với từng phụ huynh.' },
        { label: 'Khóa bảo mật', note: 'Học sinh và cán sự không được truy cập mục này nhằm bảo mật thông tin liên lạc riêng tư.' },
      ],
      typicalRoles: 'Duy nhất GVCN (Bảo mật tuyệt đối)',
    },
    {
      id: 'ai',
      name: '7. Trợ lý Sư phạm AI GVCN',
      icon: Sparkles,
      color: 'bg-purple-600',
      lightBg: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'AI hỗ trợ tự động soạn kế hoạch tuần thông minh, viết nhận xét học bạ theo Thông tư 22, gợi ý giải pháp sư phạm cho học sinh cá biệt, dự thảo thư mời phụ huynh.',
      levels: [
        { label: 'Kích hoạt AI', note: 'Được gửi yêu cầu và nhận lời khuyên sư phạm, kế hoạch tuần tự động từ mô hình trí tuệ nhân tạo.' },
        { label: 'Khóa AI', note: 'Không có quyền truy cập vào giao diện Trợ lý AI.' },
      ],
      typicalRoles: 'GVCN, Lớp trưởng (khi được ủy quyền)',
    },
    {
      id: 'reports',
      name: '8. Báo cáo, Thống kê & In sổ',
      icon: Printer,
      color: 'bg-teal-600',
      lightBg: 'bg-teal-50 text-teal-700 border-teal-200',
      description: 'Xuất Sổ chủ nhiệm điện tử hoàn chỉnh, bảng xếp hạng thi đua 35 tuần, biểu đồ chuyên cần tháng, biên bản sinh hoạt lớp cuối tuần theo mẫu Bộ GD&ĐT.',
      levels: [
        { label: 'Xuất & In ấn dữ liệu', note: 'Được xem toàn bộ báo cáo tổng hợp và in ấn sổ sách ra file PDF hoặc Excel.' },
        { label: 'Khóa báo cáo', note: 'Chỉ xem dữ liệu tổng quan, không thể xuất tài liệu chính thức.' },
      ],
      typicalRoles: 'GVCN, Ban cán sự lớp',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1677E8] to-[#073B82] text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#17365D]">
              Cài đặt Hệ thống & Phân quyền Quản trị
            </h2>
            <p className="text-xs text-[#66809F]">
              Quản lý tài khoản, thêm/xóa vai trò ủy quyền nhập dữ liệu điểm danh, chấm thi đua và kế hoạch tuần
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGVCN && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Thêm vai trò mới</span>
            </button>
          )}

          {isGVCN ? (
            <button
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              {saved ? 'Đã lưu cấu hình!' : 'Lưu tất cả thay đổi'}
            </button>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Chế độ chỉ xem</span>
            </div>
          )}
        </div>
      </div>

      {/* Read-Only Notice */}
      {!isGVCN && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-extrabold text-amber-950">
                Bạn đang xem cấu hình hệ thống & phân quyền ở chế độ Chỉ xem
              </p>
              <p className="text-[11.5px] text-amber-800 mt-0.5">
                Chỉ có tài khoản <strong>Giáo viên chủ nhiệm (GVCN)</strong> mới có thẩm quyền sửa đổi thông tin lớp, phân công chức vụ và phân quyền hệ thống. Hãy đăng nhập tài khoản GVCN để thực hiện thay đổi.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full shrink-0">
            Chỉ xem
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-white rounded-2xl border border-[#D8E7FA] shadow-2xs text-xs font-bold">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'permissions'
              ? 'bg-[#1677E8] text-white shadow-sm'
              : 'text-[#66809F] hover:bg-gray-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Danh sách Vai trò & Phân quyền ({userAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('modules_guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'modules_guide'
              ? 'bg-[#1677E8] text-white shadow-sm'
              : 'text-[#66809F] hover:bg-gray-100'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>8 Nội dung Hệ thống được phân quyền</span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-[#073B82] text-[10px] font-extrabold">
            Mới
          </span>
        </button>

        <button
          onClick={() => setActiveTab('school')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'school'
              ? 'bg-[#1677E8] text-white shadow-sm'
              : 'text-[#66809F] hover:bg-gray-100'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Thông tin Trường lớp & GVCN</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
            activeTab === 'backup'
              ? 'bg-[#1677E8] text-white shadow-sm'
              : 'text-[#66809F] hover:bg-gray-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Kết nối Supabase & Sao lưu</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
            Cloud
          </span>
        </button>
      </div>

      {/* TAB 1: PERMISSIONS & USER ACCOUNTS LIST */}
      {activeTab === 'permissions' && (
        <div className="space-y-5">
          {/* Active User Indicator */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 rounded-2xl p-4 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label
                title="Nhấn để đổi ảnh đại diện của tài khoản đang đăng nhập"
                className="relative group/activeuser cursor-pointer shrink-0"
              >
                <img
                  src={currentUser.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs bg-white"
                />
                <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover/activeuser:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-3.5 h-3.5" />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAccountAvatarUpload(currentUser.id, file);
                    e.target.value = '';
                  }}
                />
              </label>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#17365D] text-sm">{currentUser.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px]">
                    {currentUser.roleTitle}
                  </span>
                  {currentUser.teamId && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#0B438A] font-bold text-[10px]">
                      Phụ trách: Tổ {currentUser.teamId}
                    </span>
                  )}
                </div>
                <p className="text-[#66809F] mt-0.5">
                  Tài khoản đang đăng nhập trong phiên làm việc hiện tại. Thầy/Cô có thể bấm &quot;Thử vai trò&quot; ở bảng dưới để kiểm tra giao diện học sinh.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentUser.role !== 'teacher' && (
                <button
                  onClick={() => handleSwitchRole(userAccounts[0])}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-blue-200 text-[#1677E8] font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Về quyền GVCN
                </button>
              )}
            </div>
          </div>

          {/* Role Permission Matrix Table */}
          <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
              <div>
                <h3 className="font-extrabold text-sm text-[#17365D] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#1677E8]" />
                  Bảng Phân Quyền Ban Cán Sự & Tổ Trưởng ({userAccounts.length} Tài khoản)
                </h3>
                <p className="text-xs text-[#66809F] mt-0.5">
                  Thầy/Cô có thể Thêm vai trò mới, Sửa quyền chi tiết hoặc Xóa các vai trò không còn phụ trách
                </p>
              </div>

              {isGVCN ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Thêm vai trò
                  </button>

                  <button
                    onClick={handleResetPermissionsToDefault}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                    Khôi phục chuẩn
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Chỉ GVCN mới có quyền chỉnh sửa bảng phân quyền
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50/50 text-[#0B438A] font-bold border-b border-blue-100">
                    <th className="py-3 px-4 min-w-[200px]">Thành viên & Vai trò</th>
                    <th className="py-3 px-3 min-w-[150px]">Điểm danh – Chuyên cần</th>
                    <th className="py-3 px-3 min-w-[150px]">Thi đua – Nề nếp</th>
                    <th className="py-3 px-3 min-w-[160px]">Kế hoạch công tác tuần</th>
                    <th className="py-3 px-3 min-w-[110px] text-center">Báo cáo & AI</th>
                    <th className="py-3 px-3 text-right pr-4 min-w-[170px]">Thao tác (Sửa / Xóa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[#17365D]">
                  {userAccounts.map((account) => {
                    const isSelf = currentUser.id === account.id;
                    const perms = permissionsState[account.role] || defaultRolePermissions.class_monitor;
                    const isTeacher = account.role === 'teacher';

                    return (
                      <tr
                        key={account.id}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          isSelf ? 'bg-blue-50/40 font-medium' : ''
                        }`}
                      >
                        {/* Member & Role */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {isGVCN || (isSelf && currentUser.role !== 'guest') ? (
                              <label
                                title="Nhấn để tải ảnh đại diện mới"
                                className="relative group/accavatar cursor-pointer shrink-0"
                              >
                                <img
                                  src={account.avatar}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                                <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover/accavatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Camera className="w-3.5 h-3.5" />
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleAccountAvatarUpload(account.id, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            ) : (
                              <img
                                src={account.avatar}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[#17365D] block">
                                  {account.name}
                                </span>
                                {isSelf && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Đang đăng nhập" />
                                )}
                              </div>
                              {isTeacher ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 bg-blue-100 text-[#0B438A]">
                                  {account.roleTitle}
                                </span>
                              ) : isGVCN ? (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {/* Inline Role Title Selector */}
                                  <select
                                    value={
                                      STANDARD_CLASS_ROLES.includes(account.roleTitle)
                                        ? account.roleTitle
                                        : account.roleTitle
                                    }
                                    onChange={(e) =>
                                      handleUpdateCadreAccountMeta(account, {
                                        roleTitle: e.target.value,
                                      })
                                    }
                                    title="Đổi chức danh cán sự"
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-pointer focus:outline-hidden ${
                                      account.category === 'Ban cán sự'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : account.category === 'Tổ trưởng'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-purple-50 text-purple-800 border-purple-200'
                                    }`}
                                  >
                                    {!STANDARD_CLASS_ROLES.includes(account.roleTitle) && (
                                      <option value={account.roleTitle}>{account.roleTitle}</option>
                                    )}
                                    {STANDARD_CLASS_ROLES.filter((r) => r !== 'Thành viên').map(
                                      (roleOpt) => (
                                        <option key={roleOpt} value={roleOpt}>
                                          {roleOpt}
                                        </option>
                                      )
                                    )}
                                  </select>

                                  {/* Inline Team Selector */}
                                  <select
                                    value={account.teamId || 1}
                                    onChange={(e) =>
                                      handleUpdateCadreAccountMeta(account, {
                                        teamId: Number(e.target.value),
                                      })
                                    }
                                    title="Đổi Tổ của cán sự này"
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#0B438A] border border-blue-200 cursor-pointer focus:outline-hidden"
                                  >
                                    <option value={1}>Tổ 1</option>
                                    <option value={2}>Tổ 2</option>
                                    <option value={3}>Tổ 3</option>
                                    <option value={4}>Tổ 4</option>
                                  </select>
                                </div>
                              ) : (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                                  account.category === 'GVCN'
                                    ? 'bg-blue-100 text-[#0B438A]'
                                    : account.category === 'Ban cán sự'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : account.category === 'Tổ trưởng'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {account.roleTitle} {account.teamId ? `(Tổ ${account.teamId})` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Attendance Scope */}
                        <td className="py-3 px-3">
                          {isTeacher ? (
                            <span className="px-2.5 py-1 rounded-md bg-blue-100 text-[#0B438A] font-bold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-[#0B438A]" /> Toàn bộ lớp
                            </span>
                          ) : (
                            <select
                              value={perms.attendanceScope}
                              disabled={!isGVCN}
                              onChange={(e) =>
                                handleUpdatePermission(
                                  account.role,
                                  'attendanceScope',
                                  e.target.value
                                )
                              }
                              className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white font-medium text-[#17365D] disabled:bg-gray-50 disabled:text-gray-500"
                            >
                              <option value="all">Toàn bộ lớp</option>
                              <option value="own_team">Chỉ Tổ {account.teamId || 'mình'}</option>
                              <option value="none">Không có quyền</option>
                            </select>
                          )}
                        </td>

                        {/* Emulation Scope */}
                        <td className="py-3 px-3">
                          {isTeacher ? (
                            <span className="px-2.5 py-1 rounded-md bg-blue-100 text-[#0B438A] font-bold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-[#0B438A]" /> Toàn bộ 4 tổ
                            </span>
                          ) : (
                            <select
                              value={perms.emulationScope}
                              disabled={!isGVCN}
                              onChange={(e) =>
                                handleUpdatePermission(
                                  account.role,
                                  'emulationScope',
                                  e.target.value
                                )
                              }
                              className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white font-medium text-[#17365D] disabled:bg-gray-50 disabled:text-gray-500"
                            >
                              <option value="all">Toàn bộ 4 tổ</option>
                              <option value="own_team">Chỉ Tổ {account.teamId || 'mình'}</option>
                              <option value="none">Không có quyền</option>
                            </select>
                          )}
                        </td>

                        {/* Weekly Plan Permission */}
                        <td className="py-3 px-3">
                          {isTeacher ? (
                            <span className="px-2.5 py-1 rounded-md bg-blue-100 text-[#0B438A] font-bold text-[11px] block text-center">
                              Duyệt & Ban hành
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <label className={`flex items-center gap-1.5 ${isGVCN ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
                                <input
                                  type="checkbox"
                                  disabled={!isGVCN}
                                  checked={perms.canProposePlanTask}
                                  onChange={(e) =>
                                    handleUpdatePermission(
                                      account.role,
                                      'canProposePlanTask',
                                      e.target.checked
                                    )
                                  }
                                  className="w-3.5 h-3.5 rounded text-[#1677E8]"
                                />
                                <span className="text-[11px] font-medium">Đề xuất việc tuần</span>
                              </label>
                              <label className={`flex items-center gap-1.5 ${isGVCN ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
                                <input
                                  type="checkbox"
                                  disabled={!isGVCN}
                                  checked={perms.canToggleTasks}
                                  onChange={(e) =>
                                    handleUpdatePermission(
                                      account.role,
                                      'canToggleTasks',
                                      e.target.checked
                                    )
                                  }
                                  className="w-3.5 h-3.5 rounded text-emerald-600"
                                />
                                <span className="text-[11px] font-medium text-emerald-700">Tích việc hoàn thành</span>
                              </label>
                            </div>
                          )}
                        </td>

                        {/* Reports & AI */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              title={perms.canUseAI ? 'Được dùng AI' : 'Không được dùng AI'}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                perms.canUseAI
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              AI
                            </span>
                            <span
                              title={perms.canExportReports ? 'Được xem & in báo cáo' : 'Khóa báo cáo'}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                perms.canExportReports
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              Báo cáo
                            </span>
                          </div>
                        </td>

                        {/* Actions: Test Role, Edit, Delete */}
                        <td className="py-3 px-3 text-right pr-4">
                          {isGVCN ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Switch Role Button */}
                              {isSelf ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                  Đang dùng
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSwitchRole(account)}
                                  title="Chuyển sang vai trò này để kiểm tra phân quyền"
                                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-[11px] transition-colors"
                                >
                                  Thử vai trò
                                </button>
                              )}

                              {/* Manage Password Button */}
                              <button
                                onClick={() => {
                                  setAccountToManagePassword(account);
                                  setManagedNewPassword(account.password || '123456');
                                }}
                                title="Xem / Đổi mật khẩu đăng nhập cho tài khoản này"
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Detailed Permissions Button */}
                              <button
                                onClick={() => setEditingAccount(account)}
                                title="Tùy chỉnh chi tiết 13 mục phân quyền"
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#17365D] transition-colors"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Role Button */}
                              {isTeacher ? (
                                <span
                                  title="Tài khoản GVCN Quản trị viên tối cao không thể xóa"
                                  className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => setAccountToDelete(account)}
                                  title="Xóa vai trò phân quyền này"
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-semibold text-[11px]">
                              <Lock className="w-3 h-3" />
                              {isSelf ? 'Đang dùng' : 'Chỉ GVCN'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Note & Policy */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 text-[11.5px] text-[#66809F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p>
                💡 Bấm <strong>&quot;Thử vai trò&quot;</strong> để đổi góc nhìn học sinh, hoặc bấm <strong>nút bánh răng (Sliders)</strong> để mở bảng phân quyền chi tiết cho từng vai trò.
              </p>
              <button
                onClick={() => setActiveTab('modules_guide')}
                className="text-[#1677E8] hover:underline font-bold flex items-center gap-1 shrink-0"
              >
                Xem chi tiết 8 nội dung phân quyền <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 8 AUTHORIZED MODULES GUIDE */}
      {activeTab === 'modules_guide' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#D8E7FA] shadow-xs">
            <div className="max-w-3xl">
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-[#073B82] font-extrabold text-[11px] uppercase tracking-wide inline-block mb-1.5">
                Quy Chuẩn Phân Quyền Sư Phạm THCS
              </span>
              <h3 className="text-base font-extrabold text-[#17365D]">
                Danh Mục 8 Nội Dung & Module Hệ Thống Được Phân Quyền Quản Trị
              </h3>
              <p className="text-xs text-[#66809F] mt-1 leading-relaxed">
                Hệ thống Sổ Chủ Nhiệm Điện Tử phân định rõ quyền hạn của Giáo viên chủ nhiệm (Admin tối cao),
                Ban cán sự lớp (Quản lý toàn diện các mặt thi đua, học tập) và Tổ trưởng (Tự quản theo từng tổ học tập 1–4).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {authorizedModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl border border-[#D8E7FA] p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${mod.color} text-white flex items-center justify-center shadow-xs shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#17365D]">
                            {mod.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#0B438A]">
                            Phân quyền: {mod.typicalRoles}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#66809F] leading-relaxed">
                      {mod.description}
                    </p>

                    {/* Levels */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
                      <span className="font-bold text-[#17365D] text-[11px] block">
                        Các cấp độ phân quyền có thể gán:
                      </span>
                      {mod.levels.map((lvl, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1677E8] mt-1.5 shrink-0" />
                          <div className="text-[11px] leading-snug">
                            <strong className="text-[#17365D]">{lvl.label}:</strong>{' '}
                            <span className="text-[#66809F]">{lvl.note}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SCHOOL & TEACHER INFO */}
      {activeTab === 'school' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Unit & School Info */}
          <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-4 text-xs">
            <h3 className="font-extrabold text-sm text-[#17365D] flex items-center gap-2">
              <School className="w-4 h-4 text-[#1677E8]" />
              Thông tin Trường & Lớp học
            </h3>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Tên đơn vị / Trường học:</label>
                <input
                  type="text"
                  disabled={!isGVCN}
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Khẩu hiệu / Phương châm giáo dục:</label>
                <input
                  type="text"
                  disabled={!isGVCN}
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Lớp chủ nhiệm:</label>
                  <input
                    type="text"
                    disabled={!isGVCN}
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-[#0B438A] disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">Năm học:</label>
                  <input
                    type="text"
                    disabled={!isGVCN}
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Info */}
          <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-4 text-xs">
            <h3 className="font-extrabold text-sm text-[#17365D] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#1677E8]" />
              Hồ sơ Giáo viên chủ nhiệm
            </h3>

            {/* Teacher Avatar Upload Card */}
            <div className="p-3.5 rounded-2xl bg-blue-50/40 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {isGVCN ? (
                  <label
                    title="Nhấn để tải ảnh đại diện Giáo viên chủ nhiệm"
                    className="relative group/tavatar cursor-pointer shrink-0"
                  >
                    <img
                      src={teacherAccount?.avatar || PRESET_TEACHER_AVATARS[0]}
                      alt={formData.teacherName}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md bg-white"
                    />
                    <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover/tavatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Camera className="w-4 h-4" />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && teacherAccount) {
                          handleAccountAvatarUpload(teacherAccount.id, file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : (
                  <img
                    src={teacherAccount?.avatar || PRESET_TEACHER_AVATARS[0]}
                    alt={formData.teacherName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md bg-white shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <span className="font-extrabold text-[#17365D] block text-xs">
                    Ảnh đại diện Giáo viên (Avatar GVCN)
                  </span>
                  {isGVCN ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-[#1677E8] hover:bg-blue-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải ảnh từ máy tính</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && teacherAccount) {
                              handleAccountAvatarUpload(teacherAccount.id, file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <span className="text-[10.5px] text-[#66809F]">
                        Tự động lưu & đồng bộ lên web
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10.5px] text-[#66809F]">
                      Chỉ GVCN mới có quyền thay đổi ảnh đại diện Giáo viên
                    </span>
                  )}
                </div>
              </div>

              {isGVCN && (
                <div className="flex items-center gap-1.5">
                  {PRESET_TEACHER_AVATARS.map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSetTeacherPresetAvatar(presetUrl)}
                      title="Chọn mẫu avatar GVCN"
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 ${
                        teacherAccount?.avatar === presetUrl
                          ? 'border-[#1677E8] ring-2 ring-blue-200'
                          : 'border-white'
                      }`}
                    >
                      <img src={presetUrl} alt="" className="w-full h-full object-cover bg-white" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Họ và tên Giáo viên:</label>
                <input
                  type="text"
                  disabled={!isGVCN}
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Chức vụ / Vai trò:</label>
                <input
                  type="text"
                  disabled={!isGVCN}
                  value={formData.teacherRole}
                  onChange={(e) => setFormData({ ...formData, teacherRole: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="font-semibold text-[#17365D] block mb-1">Phạm vi quyền hạn:</label>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[#0B438A] leading-relaxed">
                  Được phân quyền Quản trị toàn diện lớp chủ nhiệm 9A2 (Nhập điểm, điểm danh, nề nếp thi đua, quản lý liên lạc phụ huynh và sử dụng Trợ lý AI).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE + SUPABASE */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          <SupabaseConnectPanel
            appState={appState}
            onUpdateState={onUpdateState}
            isGVCN={isGVCN}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Backup & Restore */}
            <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-4 text-xs">
              <h3 className="font-extrabold text-sm text-[#17365D] flex items-center gap-2">
                <Download className="w-4 h-4 text-[#1677E8]" />
                Sao lưu & Khôi phục dữ liệu (Tệp JSON máy tính)
              </h3>
              <p className="text-[#66809F]">
                Tải về toàn bộ cơ sở dữ liệu học sinh, điểm danh, thi đua và kế hoạch dưới dạng file JSON hoặc khôi phục từ tệp trước đó.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleBackupJSON}
                  className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tải tệp sao lưu JSON
                </button>

                {isGVCN ? (
                  <label className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Phục hồi từ JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreJSON}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <span className="px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Phục hồi JSON (Chỉ GVCN)
                  </span>
                )}
              </div>
            </div>

            {/* Reset & Privacy */}
            <div className="bg-white rounded-2xl border border-[#D8E7FA] shadow-xs p-6 space-y-4 text-xs">
              <h3 className="font-extrabold text-sm text-[#17365D] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                Khởi tạo lại & Bảo mật
              </h3>
              <p className="text-[#66809F]">
                Khi bắt đầu lớp học thực tế hoặc muốn khôi phục về bộ dữ liệu mẫu chuẩn của lớp 9A2.
              </p>

              <div className="pt-2">
                {isGVCN ? (
                  <button
                    onClick={handleConfirmReset}
                    className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Khởi tạo lại dữ liệu ban đầu
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    Khởi tạo lại dữ liệu (Chỉ GVCN)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW USER ROLE / PERMISSION */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-blue-100 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#17365D]">
                    Thêm Vai Trò & Phân Quyền Mới
                  </h3>
                  <p className="text-xs text-[#66809F]">
                    Cấp quyền cho học sinh tham gia nhập dữ liệu điểm danh, chấm nề nếp hoặc đề xuất kế hoạch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-4 text-xs">
              {/* Select Source */}
              <div>
                <label className="font-bold text-[#17365D] block mb-1.5">
                  1. Chọn nguồn thành viên:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccountSource('existing_student')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newAccountSource === 'existing_student'
                        ? 'border-blue-500 bg-blue-50 text-[#0B438A] font-bold'
                        : 'border-gray-200 text-[#66809F] hover:bg-gray-50'
                    }`}
                  >
                    Chọn từ danh sách học sinh Lớp 9A2 ({appState.students.length} em)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccountSource('manual')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newAccountSource === 'manual'
                        ? 'border-blue-500 bg-blue-50 text-[#0B438A] font-bold'
                        : 'border-gray-200 text-[#66809F] hover:bg-gray-50'
                    }`}
                  >
                    Nhập tay thành viên mới ngoài danh sách
                  </button>
                </div>
              </div>

              {/* Student Dropdown if existing */}
              {newAccountSource === 'existing_student' && (
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">
                    Chọn học sinh trong lớp:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => handleSelectStudentForAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium text-[#17365D]"
                    required
                  >
                    <option value="">-- Chọn học sinh để gán vai trò --</option>
                    {appState.students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.code} - {st.fullName} (Tổ {st.teamId}) {st.roleInClass ? `- ${st.roleInClass}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">
                    Họ và tên thành viên:
                  </label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="VD: Nguyễn Bảo An"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">
                    Tên chức vụ / Vai trò:
                  </label>
                  <input
                    type="text"
                    value={newAccountRoleTitle}
                    onChange={(e) => setNewAccountRoleTitle(e.target.value)}
                    placeholder="VD: Tổ phó Tổ 1, Cán sự Văn nghệ, Thủ quỹ..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">
                    Nhóm vai trò:
                  </label>
                  <select
                    value={newAccountCategory}
                    onChange={(e) => setNewAccountCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="Ban cán sự">Ban cán sự lớp</option>
                    <option value="Tổ trưởng">Tổ trưởng / Tổ phó</option>
                    <option value="Cán sự bộ môn">Cán sự bộ môn</option>
                    <option value="Khác">Khác / Ban phong trào</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#17365D] block mb-1">
                    Phụ trách Tổ:
                  </label>
                  <select
                    value={newAccountTeamId || ''}
                    onChange={(e) => setNewAccountTeamId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="">Toàn lớp / Không cố định tổ</option>
                    <option value="1">Tổ 1</option>
                    <option value="2">Tổ 2</option>
                    <option value="3">Tổ 3</option>
                    <option value="4">Tổ 4</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-[#17365D] block mb-1 flex items-center justify-between">
                    <span>Mật khẩu đăng nhập ban đầu:</span>
                    <span className="text-[11px] text-[#66809F] font-normal italic">
                      (Mặc định: 123456)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newAccountPassword}
                    onChange={(e) => setNewAccountPassword(e.target.value)}
                    placeholder="Mặc định: 123456"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs"
                  />
                  <span className="text-[10.5px] text-[#66809F] block mt-0.5">
                    Học sinh cần nhập mật khẩu này khi đăng nhập vào hệ thống để chỉnh sửa
                  </span>
                </div>

                <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-blue-50/40 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={newAccountAvatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-white shadow-xs bg-white"
                    />
                    <div>
                      <span className="font-bold text-[#17365D] block">Ảnh đại diện thành viên</span>
                      <span className="text-[10.5px] text-[#66809F]">Tải ảnh đại diện riêng từ máy tính</span>
                    </div>
                  </div>
                  <label className="px-3 py-1.5 rounded-xl bg-[#1677E8] hover:bg-blue-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn file ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await processAvatarImageFile(file);
                            setNewAccountAvatar(url);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Permission Presets */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-[#17365D]">
                    2. Nạp nhanh mẫu phân quyền chuẩn:
                  </label>
                  <span className="text-[11px] text-[#66809F]">Bấm để điền nhanh các quyền</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetPermissions('leader')}
                    className="p-2 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-800 font-bold text-center"
                  >
                    Tổ trưởng / Tổ phó
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetPermissions('officer')}
                    className="p-2 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 font-bold text-center"
                  >
                    Ban cán sự lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetPermissions('subject')}
                    className="p-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-800 font-bold text-center"
                  >
                    Cán sự bộ môn
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetPermissions('activity')}
                    className="p-2 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-800 font-bold text-center"
                  >
                    Phong trào / Văn thể
                  </button>
                </div>
              </div>

              {/* Permission Config */}
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-3">
                <h4 className="font-bold text-[#17365D] flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#1677E8]" />
                  Chi tiết quyền hạn được cấp:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#17365D] block mb-1">
                      Phạm vi Điểm danh:
                    </label>
                    <select
                      value={newAccountPerms.attendanceScope}
                      onChange={(e) =>
                        setNewAccountPerms({
                          ...newAccountPerms,
                          attendanceScope: e.target.value as any,
                          canTakeAttendance: e.target.value !== 'none',
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
                    >
                      <option value="all">Toàn bộ 38 học sinh trong lớp</option>
                      <option value="own_team">Chỉ các bạn trong Tổ của mình</option>
                      <option value="none">Không có quyền điểm danh</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[#17365D] block mb-1">
                      Phạm vi Thi đua – Nề nếp:
                    </label>
                    <select
                      value={newAccountPerms.emulationScope}
                      onChange={(e) =>
                        setNewAccountPerms({
                          ...newAccountPerms,
                          emulationScope: e.target.value as any,
                          canRecordEmulation: e.target.value !== 'none',
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
                    >
                      <option value="all">Toàn bộ 4 tổ trong lớp</option>
                      <option value="own_team">Chỉ Tổ của mình</option>
                      <option value="none">Không có quyền chấm thi đua</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white">
                    <input
                      type="checkbox"
                      checked={newAccountPerms.canProposePlanTask}
                      onChange={(e) =>
                        setNewAccountPerms({ ...newAccountPerms, canProposePlanTask: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-[#1677E8]"
                    />
                    <span className="font-medium text-[#17365D]">Đề xuất công việc vào kế hoạch tuần</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white">
                    <input
                      type="checkbox"
                      checked={newAccountPerms.canToggleTasks}
                      onChange={(e) =>
                        setNewAccountPerms({ ...newAccountPerms, canToggleTasks: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span className="font-medium text-[#17365D]">Tích hoàn thành việc trong kế hoạch</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white">
                    <input
                      type="checkbox"
                      checked={newAccountPerms.canManageAcademics}
                      onChange={(e) =>
                        setNewAccountPerms({ ...newAccountPerms, canManageAcademics: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-cyan-600"
                    />
                    <span className="font-medium text-[#17365D]">Nhập điểm học tập môn học TT22</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white">
                    <input
                      type="checkbox"
                      checked={newAccountPerms.canExportReports}
                      onChange={(e) =>
                        setNewAccountPerms({ ...newAccountPerms, canExportReports: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-purple-600"
                    />
                    <span className="font-medium text-[#17365D]">Xem & In báo cáo tổng hợp</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Xác nhận thêm vai trò
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM DELETE ROLE / ACCOUNT */}
      {/* ========================================================================= */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-red-100 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#17365D]">
                  Xác nhận Xóa Vai Trò Phân Quyền
                </h3>
                <p className="text-xs text-[#66809F]">
                  Hành động này sẽ thu hồi toàn bộ quyền nhập dữ liệu
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/60 rounded-2xl border border-red-100 flex items-center gap-3">
              <img
                src={accountToDelete.avatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
              />
              <div className="text-xs">
                <p className="font-extrabold text-[#17365D] text-sm">
                  {accountToDelete.name}
                </p>
                <p className="text-red-700 font-bold">
                  {accountToDelete.roleTitle} {accountToDelete.teamId ? `(Tổ ${accountToDelete.teamId})` : ''}
                </p>
                <p className="text-[#66809F] text-[11px]">
                  Mã tài khoản: {accountToDelete.id}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#66809F] leading-relaxed">
              Thầy/Cô có chắc chắn muốn xóa vai trò phân quyền của học sinh này không? Sau khi xóa, tài khoản sẽ không còn xuất hiện trong danh sách chuyển vai trò và bị vô hiệu hóa quyền nhập liệu.
            </p>

            {currentUser.id === accountToDelete.id && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-tight">
                ⚠️ Tài khoản này đang được dùng để thao tác. Hệ thống sẽ tự động chuyển phiên đăng nhập về <strong>Giáo viên chủ nhiệm</strong>.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Xác nhận Xóa vai trò
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT DETAILED PERMISSIONS FOR AN ACCOUNT */}
      {/* ========================================================================= */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-blue-100 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <label
                  title="Nhấn để đổi ảnh đại diện"
                  className="relative group/editaccavatar cursor-pointer shrink-0"
                >
                  <img
                    src={editingAccount.avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-white"
                  />
                  <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover/editaccavatar:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Camera className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAccountAvatarUpload(editingAccount.id, file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <div>
                  <h3 className="text-base font-extrabold text-[#17365D]">
                    Tùy Chỉnh Phân Quyền Chi Tiết
                  </h3>
                  <p className="text-xs text-[#0B438A] font-bold">
                    {editingAccount.name} – {editingAccount.roleTitle} {editingAccount.teamId ? `(Tổ ${editingAccount.teamId})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Edit Cadre Student, Role Title & Team */}
              {editingAccount.role !== 'teacher' && (
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#17365D] block mb-1">
                      Học sinh đảm nhiệm:
                    </label>
                    <select
                      value={editingAccount.studentId || ''}
                      onChange={(e) => {
                        const st = appState.students.find((s) => s.id === e.target.value);
                        if (st) {
                          setEditingAccount({
                            ...editingAccount,
                            studentId: st.id,
                            name: st.fullName,
                            avatar: st.avatar,
                            teamId: st.teamId,
                          });
                        }
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-[#17365D]"
                    >
                      <option value="">-- Chọn học sinh --</option>
                      {appState.students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName} (Tổ {st.teamId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#17365D] block mb-1">
                      Chức danh cán sự:
                    </label>
                    <input
                      type="text"
                      value={editingAccount.roleTitle}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, roleTitle: e.target.value })
                      }
                      placeholder="VD: Lớp trưởng, Tổ trưởng..."
                      className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white font-bold text-[#17365D]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#17365D] block mb-1">
                      Thuộc Tổ / Phụ trách Tổ:
                    </label>
                    <select
                      value={editingAccount.teamId || 1}
                      onChange={(e) =>
                        setEditingAccount({
                          ...editingAccount,
                          teamId: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white font-bold text-[#0B438A]"
                    >
                      <option value={1}>Tổ 1</option>
                      <option value={2}>Tổ 2</option>
                      <option value={3}>Tổ 3</option>
                      <option value={4}>Tổ 4</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Scope selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#17365D] block mb-1">
                    1. Quyền Điểm danh chuyên cần:
                  </label>
                  <select
                    value={permissionsState[editingAccount.role]?.attendanceScope || 'none'}
                    onChange={(e) =>
                      handleUpdatePermission(
                        editingAccount.role,
                        'attendanceScope',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="all">Toàn bộ 38 học sinh trong lớp</option>
                    <option value="own_team">Chỉ Tổ {editingAccount.teamId || 'mình'}</option>
                    <option value="none">Không có quyền điểm danh</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#17365D] block mb-1">
                    2. Quyền Thi đua nề nếp (35 tuần):
                  </label>
                  <select
                    value={permissionsState[editingAccount.role]?.emulationScope || 'none'}
                    onChange={(e) =>
                      handleUpdatePermission(
                        editingAccount.role,
                        'emulationScope',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="all">Toàn bộ 4 tổ trong lớp</option>
                    <option value="own_team">Chỉ Tổ {editingAccount.teamId || 'mình'}</option>
                    <option value="none">Không có quyền chấm thi đua</option>
                  </select>
                </div>
              </div>

              {/* Boolean switches */}
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-2.5">
                <span className="font-bold text-[#17365D] block mb-1">
                  3. Quyền hạn các phân hệ khác:
                </span>

                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 cursor-pointer">
                  <div>
                    <span className="font-bold text-[#17365D] block">Kế hoạch công tác tuần</span>
                    <span className="text-[11px] text-[#66809F]">Cho phép đề xuất nhiệm vụ tuần vào kế hoạch</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissionsState[editingAccount.role]?.canProposePlanTask || false}
                    onChange={(e) =>
                      handleUpdatePermission(editingAccount.role, 'canProposePlanTask', e.target.checked)
                    }
                    className="w-4 h-4 rounded text-[#1677E8]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 cursor-pointer">
                  <div>
                    <span className="font-bold text-[#17365D] block">Tích hoàn thành công việc</span>
                    <span className="text-[11px] text-[#66809F]">Xác nhận hoàn thành các nhiệm vụ được giao</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissionsState[editingAccount.role]?.canToggleTasks || false}
                    onChange={(e) =>
                      handleUpdatePermission(editingAccount.role, 'canToggleTasks', e.target.checked)
                    }
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 cursor-pointer">
                  <div>
                    <span className="font-bold text-[#17365D] block">Học tập & Đánh giá TT22</span>
                    <span className="text-[11px] text-[#66809F]">Nhập điểm kiểm tra thường xuyên và giữa kỳ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissionsState[editingAccount.role]?.canManageAcademics || false}
                    onChange={(e) =>
                      handleUpdatePermission(editingAccount.role, 'canManageAcademics', e.target.checked)
                    }
                    className="w-4 h-4 rounded text-cyan-600"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 cursor-pointer">
                  <div>
                    <span className="font-bold text-[#17365D] block">Báo cáo, Thống kê & In sổ</span>
                    <span className="text-[11px] text-[#66809F]">Xem bảng tổng hợp và xuất file báo cáo</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissionsState[editingAccount.role]?.canExportReports || false}
                    onChange={(e) =>
                      handleUpdatePermission(editingAccount.role, 'canExportReports', e.target.checked)
                    }
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-100 cursor-pointer">
                  <div>
                    <span className="font-bold text-[#17365D] block">Trợ lý Sư phạm AI</span>
                    <span className="text-[11px] text-[#66809F]">Cho phép tương tác và hỏi đáp cùng trợ lý AI</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissionsState[editingAccount.role]?.canUseAI || false}
                    onChange={(e) =>
                      handleUpdatePermission(editingAccount.role, 'canUseAI', e.target.checked)
                    }
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] font-bold"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditPermissions}
                  className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Lưu thay đổi quyền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MANAGE ACCOUNT PASSWORD (GVCN ADMIN) */}
      {/* ========================================================================= */}
      {accountToManagePassword && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-amber-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#17365D]">
                  Quản lý Mật khẩu Tài khoản
                </h3>
                <p className="text-xs text-[#66809F]">
                  Dành riêng cho Giáo viên chủ nhiệm thiết lập mã PIN / Mật khẩu
                </p>
              </div>
            </div>

            {/* Account Card */}
            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-center gap-3">
              <img
                src={accountToManagePassword.avatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-2xs"
              />
              <div className="text-xs min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[#17365D] text-sm truncate">
                    {accountToManagePassword.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                    {accountToManagePassword.roleTitle}
                  </span>
                </div>
                <p className="text-[11px] text-[#66809F] mt-0.5">
                  {accountToManagePassword.teamId ? `Phụ trách: Tổ ${accountToManagePassword.teamId}` : 'Phạm vi toàn lớp'}
                </p>
              </div>
            </div>

            {/* Current Password Note */}
            <div className="text-xs space-y-3">
              <div>
                <label className="font-bold text-[#17365D] block mb-1 flex items-center justify-between">
                  <span>Mật khẩu / Mã PIN mới:</span>
                  <button
                    type="button"
                    onClick={() => setManagedNewPassword('123456')}
                    className="text-[11px] text-[#1677E8] hover:underline font-semibold"
                  >
                    Đặt lại về &quot;123456&quot;
                  </button>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={managedNewPassword}
                    onChange={(e) => setManagedNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#1677E8]"
                    required
                  />
                </div>
                <p className="text-[11px] text-[#66809F] mt-1 italic">
                  💡 Thầy/Cô có thể đặt mật khẩu ngắn gọn hoặc số PIN dễ nhớ (tối thiểu 4 ký tự) để giao cho học sinh.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAccountToManagePassword(null);
                  setManagedNewPassword('');
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#17365D] text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSaveManagedPassword(managedNewPassword)}
                className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0B438A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Lưu mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
