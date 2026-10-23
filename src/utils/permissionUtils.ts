import { AppState, RolePermissions, UserAccount, UserRole } from '../types';

/**
 * Kiểm tra xem hệ thống có đang ở chế độ chỉ xem (chưa đăng nhập hoặc khách) không
 */
export function isReadOnly(appState: AppState): boolean {
  if (!appState.currentUser) return true;
  if (appState.currentUser.role === 'guest') return true;
  return false;
}

/**
 * Kiểm tra xem người dùng hiện tại có phải là Giáo viên chủ nhiệm (Admin toàn quyền) không
 */
export function isTeacher(appState: AppState): boolean {
  if (isReadOnly(appState)) return false;
  return appState.currentUser?.role === 'teacher';
}

/**
 * Kiểm tra xem người dùng hiện tại có quyền thực hiện thao tác hay không
 * @param appState Trạng thái ứng dụng
 * @param permissionKey Khóa quyền trong RolePermissions
 * @param teamId Mã tổ (tùy chọn, để kiểm tra phạm vi của Tổ trưởng)
 */
export function hasPermission(
  appState: AppState,
  permissionKey: keyof RolePermissions,
  teamId?: number
): boolean {
  // Nếu ở chế độ chỉ xem (chưa đăng nhập), tuyệt đối không có quyền sửa/thêm/xóa
  if (isReadOnly(appState)) return false;

  // GVCN có toàn quyền
  if (isTeacher(appState)) return true;

  const user = appState.currentUser;
  if (!user) return false;

  const perms = appState.rolePermissions?.[user.role];
  if (!perms) return false;

  // Kiểm tra phạm vi điểm danh
  if (permissionKey === 'canTakeAttendance') {
    if (!perms.canTakeAttendance) return false;
    if (perms.attendanceScope === 'own_team') {
      if (teamId !== undefined && user.teamId !== undefined) {
        return teamId === user.teamId;
      }
      return true;
    }
    return perms.attendanceScope === 'all';
  }

  // Kiểm tra phạm vi chấm điểm thi đua
  if (permissionKey === 'canRecordEmulation') {
    if (!perms.canRecordEmulation) return false;
    if (perms.emulationScope === 'own_team') {
      if (teamId !== undefined && user.teamId !== undefined) {
        return teamId === user.teamId;
      }
      return true;
    }
    return perms.emulationScope === 'all';
  }

  return Boolean(perms[permissionKey]);
}

/**
 * Lấy nhãn mô tả quyền hạn hiện tại
 */
export function getUserRoleDescription(user?: UserAccount | null): {
  badgeTitle: string;
  badgeColor: string;
  scopeText: string;
} {
  if (!user || user.role === 'guest') {
    return {
      badgeTitle: 'Chỉ xem',
      badgeColor: 'bg-gray-100 text-gray-700 border-gray-300',
      scopeText: 'Chế độ khách (Không có quyền sửa)',
    };
  }

  if (user.role === 'teacher') {
    return {
      badgeTitle: 'GVCN (Toàn quyền)',
      badgeColor: 'bg-blue-100 text-[#0B438A] border-blue-300',
      scopeText: 'Quản trị viên toàn quyền',
    };
  }

  if (user.category === 'Ban cán sự') {
    return {
      badgeTitle: user.roleTitle,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      scopeText: user.teamId ? `Phạm vi: Cả lớp & Tổ ${user.teamId}` : 'Phạm vi: Toàn lớp',
    };
  }

  return {
    badgeTitle: user.roleTitle,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    scopeText: user.teamId ? `Phạm vi: Tổ ${user.teamId}` : 'Cán sự lớp',
  };
}
