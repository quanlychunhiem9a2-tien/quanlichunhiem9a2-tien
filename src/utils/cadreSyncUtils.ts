import { AppState, RolePermissions, Student, UserAccount, UserRole } from '../types';
import { defaultRolePermissions, initialUserAccounts } from '../mockData';
import {
  DEFAULT_TEACHER_AVATAR,
  getPersistedAvatarStore,
  isCustomAvatarUrl,
  persistAvatarChange,
} from './avatarUpload';

export const STANDARD_CLASS_ROLES = [
  'Thành viên',
  'Lớp trưởng',
  'Lớp phó học tập',
  'Lớp phó nề nếp',
  'Lớp phó văn thể',
  'Lớp phó lao động',
  'Bí thư Chi đoàn',
  'Tổ trưởng',
  'Tổ phó',
  'Cán sự bộ môn',
  'Thủ quỹ',
];

/**
 * Checks whether a student's roleInClass string represents a regular member
 * (not a class officer / team leader).
 */
export function isRegularMemberRole(roleInClass?: string | null): boolean {
  if (!roleInClass) return true;
  const normalized = roleInClass.trim().toLowerCase();
  if (!normalized || normalized === '-' || normalized === 'không') return true;
  return (
    normalized === 'thành viên' ||
    normalized === 'thanh vien' ||
    normalized === 'hoc sinh' ||
    normalized === 'học sinh'
  );
}

/**
 * Maps a student with a non-regular roleInClass to standard role key, title, and category.
 */
export function deriveCadreRoleInfo(student: Student): {
  roleKey: UserRole;
  roleTitle: string;
  category: 'Ban cán sự' | 'Tổ trưởng' | 'Cán sự bộ môn' | 'Khác';
  defaultPerms: RolePermissions;
} {
  const rawRole = (student.roleInClass || '').trim();
  const lower = rawRole.toLowerCase();
  const teamId = student.teamId || 1;

  if (lower.includes('lớp trưởng')) {
    return {
      roleKey: 'class_monitor',
      roleTitle: rawRole || 'Lớp trưởng',
      category: 'Ban cán sự',
      defaultPerms: defaultRolePermissions.class_monitor,
    };
  }

  if (lower.includes('học tập')) {
    return {
      roleKey: 'vice_monitor_academic',
      roleTitle: rawRole || 'Lớp phó học tập',
      category: 'Ban cán sự',
      defaultPerms: defaultRolePermissions.vice_monitor_academic,
    };
  }

  if (
    lower.includes('nề nếp') ||
    lower.includes('kỷ luật') ||
    lower.includes('lao động') ||
    lower.includes('văn thể') ||
    lower.includes('phong trào') ||
    lower.includes('lớp phó') ||
    lower.includes('bí thư') ||
    lower.includes('thủ quỹ')
  ) {
    return {
      roleKey: 'vice_monitor_discipline',
      roleTitle: rawRole,
      category: 'Ban cán sự',
      defaultPerms: defaultRolePermissions.vice_monitor_discipline,
    };
  }

  if (lower.includes('tổ trưởng') || lower.includes('tổ phó')) {
    const isVice = lower.includes('tổ phó');
    const baseRoleKey = `team_leader_${teamId}`;
    const hasTeamNumber = /tổ\s*\d+/i.test(rawRole);
    const formattedTitle = hasTeamNumber
      ? rawRole.replace(/tổ\s*\d+/i, `Tổ ${teamId}`)
      : `${isVice ? 'Tổ phó' : 'Tổ trưởng'} Tổ ${teamId}`;

    const defaultTeamPerms =
      defaultRolePermissions[baseRoleKey] || defaultRolePermissions.team_leader_1;

    return {
      roleKey: isVice ? `${baseRoleKey}_vice_${student.id}` : baseRoleKey,
      roleTitle: formattedTitle,
      category: 'Tổ trưởng',
      defaultPerms: defaultTeamPerms,
    };
  }

  return {
    roleKey: `cadre_${student.id}`,
    roleTitle: rawRole,
    category: lower.includes('bộ môn') || lower.includes('môn') ? 'Cán sự bộ môn' : 'Ban cán sự',
    defaultPerms: defaultRolePermissions.vice_monitor_academic,
  };
}

/**
 * Synchronizes userAccounts and rolePermissions with the actual students[] list in AppState,
 * while preserving custom uploaded avatars across teacher, students, and accounts.
 */
export function syncUserAccountsWithStudents(state: {
  students: Student[];
  userAccounts?: UserAccount[];
  rolePermissions?: Record<string, RolePermissions>;
  teacherName?: string;
  teacherRole?: string;
  teacherAvatar?: string;
  currentUser?: UserAccount;
}): {
  userAccounts: UserAccount[];
  rolePermissions: Record<string, RolePermissions>;
  currentUser: UserAccount;
  teacherAvatar: string;
} {
  const avatarStore = getPersistedAvatarStore();
  const students = Array.isArray(state.students) ? state.students : [];
  const existingAccounts = Array.isArray(state.userAccounts)
    ? state.userAccounts
    : initialUserAccounts;
  const existingPermissions: Record<string, RolePermissions> = {
    ...defaultRolePermissions,
    ...(state.rolePermissions || {}),
  };

  // 1. Teacher account - prioritize custom uploaded avatar
  const existingTeacher = existingAccounts.find((a) => a.role === 'teacher');
  const teacherId = existingTeacher?.id || 'user-gvcn';
  const currentUserTeacherAvatar =
    state.currentUser?.role === 'teacher' ? state.currentUser.avatar : undefined;

  const resolvedTeacherAvatar =
    (isCustomAvatarUrl(state.teacherAvatar) && state.teacherAvatar) ||
    (isCustomAvatarUrl(currentUserTeacherAvatar) && currentUserTeacherAvatar) ||
    (isCustomAvatarUrl(existingTeacher?.avatar) && existingTeacher?.avatar) ||
    avatarStore.teacherAvatar ||
    avatarStore.byAccountId[teacherId] ||
    state.teacherAvatar ||
    existingTeacher?.avatar ||
    DEFAULT_TEACHER_AVATAR;

  const teacherAccount: UserAccount = {
    id: teacherId,
    name: state.teacherName || existingTeacher?.name || 'Trần Văn Tiến',
    role: 'teacher',
    roleTitle: state.teacherRole || existingTeacher?.roleTitle || 'Giáo viên chủ nhiệm',
    category: 'GVCN',
    avatar: resolvedTeacherAvatar,
    phone: existingTeacher?.phone || '0988776655',
    password: existingTeacher?.password || '123456',
  };

  // 2. Build accounts from students with cadre roles in students[]
  const cadreStudents = students.filter((s) => !isRegularMemberRole(s.roleInClass));

  const getRolePriority = (st: Student): number => {
    const r = (st.roleInClass || '').toLowerCase();
    if (r.includes('lớp trưởng')) return 1;
    if (r.includes('lớp phó') || r.includes('bí thư')) return 2;
    if (r.includes('tổ trưởng')) return 10 + (st.teamId || 1);
    if (r.includes('tổ phó')) return 20 + (st.teamId || 1);
    return 30;
  };

  const sortedCadreStudents = [...cadreStudents].sort(
    (a, b) => getRolePriority(a) - getRolePriority(b)
  );

  const studentSyncedAccounts: UserAccount[] = [];
  const usedRoleKeys = new Set<string>(['teacher']);

  for (const st of sortedCadreStudents) {
    const info = deriveCadreRoleInfo(st);

    const prevByStudent = existingAccounts.find(
      (a) => a.role !== 'teacher' && a.studentId === st.id
    );

    let finalRoleKey = info.roleKey;
    if (usedRoleKeys.has(finalRoleKey)) {
      finalRoleKey = `${info.roleKey}_${st.id}`;
    }
    usedRoleKeys.add(finalRoleKey);

    const prevByRole = existingAccounts.find(
      (a) => a.role !== 'teacher' && a.role === finalRoleKey
    );

    const accId = prevByStudent?.id || prevByRole?.id || `user-${st.id}`;

    if (!existingPermissions[finalRoleKey]) {
      existingPermissions[finalRoleKey] = { ...info.defaultPerms };
    }

    const activeUserAvatarForStudent =
      state.currentUser?.studentId === st.id ? state.currentUser.avatar : undefined;

    const resolvedStudentAvatar =
      (isCustomAvatarUrl(st.avatar) && st.avatar) ||
      (isCustomAvatarUrl(activeUserAvatarForStudent) && activeUserAvatarForStudent) ||
      (isCustomAvatarUrl(prevByStudent?.avatar) && prevByStudent?.avatar) ||
      avatarStore.byStudentId[st.id] ||
      avatarStore.byAccountId[accId] ||
      st.avatar ||
      prevByStudent?.avatar ||
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(st.fullName);

    studentSyncedAccounts.push({
      id: accId,
      name: st.fullName,
      role: finalRoleKey,
      roleTitle: info.roleTitle,
      category: info.category,
      teamId: st.teamId,
      studentId: st.id,
      avatar: resolvedStudentAvatar,
      phone: st.parentPhone || prevByStudent?.phone || undefined,
      password: prevByStudent?.password || prevByRole?.password || '123456',
    });
  }

  // 3. Keep any manually created accounts that do NOT have a studentId
  const manualAccounts = existingAccounts
    .filter((a) => a.role !== 'teacher' && !a.studentId)
    .map((a) => ({
      ...a,
      avatar:
        (isCustomAvatarUrl(a.avatar) && a.avatar) ||
        avatarStore.byAccountId[a.id] ||
        a.avatar,
    }));

  const finalAccounts = [
    teacherAccount,
    ...studentSyncedAccounts,
    ...manualAccounts,
  ];

  // 4. Resolve currentUser so it reflects updated name/role/avatar, or falls back safely
  let resolvedCurrentUser = state.currentUser || teacherAccount;
  if (resolvedCurrentUser.role === 'teacher') {
    resolvedCurrentUser = teacherAccount;
  } else if (resolvedCurrentUser.role !== 'guest') {
    const foundById = finalAccounts.find((a) => a.id === resolvedCurrentUser.id);
    const foundByStudent = resolvedCurrentUser.studentId
      ? finalAccounts.find((a) => a.studentId === resolvedCurrentUser.studentId)
      : undefined;
    const foundByRole = finalAccounts.find((a) => a.role === resolvedCurrentUser.role);
    resolvedCurrentUser = foundById || foundByStudent || foundByRole || resolvedCurrentUser;
  }

  return {
    userAccounts: finalAccounts,
    rolePermissions: existingPermissions,
    currentUser: resolvedCurrentUser,
    teacherAvatar: resolvedTeacherAvatar,
  };
}

/**
 * Helper to atomically update an avatar for Teacher, Student Cadre, or Student across
 * AppState (teacherAvatar, students, userAccounts, currentUser) and persist immediately to localStorage.
 */
export function applyAvatarUpdate(
  prev: AppState,
  target: {
    accountId?: string;
    studentId?: string;
    isTeacher?: boolean;
  },
  avatarUrl: string
): AppState {
  const syncedBefore = syncUserAccountsWithStudents(prev);
  const allAccounts = syncedBefore.userAccounts;

  const targetAccount = target.accountId
    ? allAccounts.find((a) => a.id === target.accountId)
    : target.isTeacher
    ? allAccounts.find((a) => a.role === 'teacher')
    : target.studentId
    ? allAccounts.find((a) => a.studentId === target.studentId)
    : undefined;

  const isTeacherTarget = Boolean(
    target.isTeacher ||
      targetAccount?.role === 'teacher' ||
      target.accountId === 'user-gvcn'
  );
  const resolvedAccountId =
    target.accountId || targetAccount?.id || (isTeacherTarget ? 'user-gvcn' : undefined);
  const resolvedStudentId = target.studentId || targetAccount?.studentId;

  // Immediately persist to local avatar store so page reload never loses it
  persistAvatarChange({
    avatarUrl,
    isTeacher: isTeacherTarget,
    accountId: resolvedAccountId,
    studentId: resolvedStudentId,
  });

  const nextTeacherAvatar = isTeacherTarget
    ? avatarUrl
    : prev.teacherAvatar || syncedBefore.teacherAvatar;

  const updatedStudents = resolvedStudentId
    ? prev.students.map((st) =>
        st.id === resolvedStudentId ? { ...st, avatar: avatarUrl } : st
      )
    : prev.students;

  const updatedAccounts = allAccounts.map((acc) => {
    if (isTeacherTarget && acc.role === 'teacher') {
      return { ...acc, avatar: avatarUrl };
    }
    if (resolvedAccountId && acc.id === resolvedAccountId) {
      return { ...acc, avatar: avatarUrl };
    }
    if (resolvedStudentId && acc.studentId === resolvedStudentId) {
      return { ...acc, avatar: avatarUrl };
    }
    return acc;
  });

  let updatedCurrentUser = prev.currentUser;
  if (updatedCurrentUser) {
    const isCurrentMatched =
      (isTeacherTarget && updatedCurrentUser.role === 'teacher') ||
      (resolvedAccountId && updatedCurrentUser.id === resolvedAccountId) ||
      (resolvedStudentId && updatedCurrentUser.studentId === resolvedStudentId);
    if (isCurrentMatched) {
      updatedCurrentUser = {
        ...updatedCurrentUser,
        avatar: avatarUrl,
      };
    }
  }

  return {
    ...prev,
    teacherAvatar: nextTeacherAvatar,
    students: updatedStudents,
    userAccounts: updatedAccounts,
    currentUser: updatedCurrentUser,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Helper to update a student's teamId and/or roleInClass and immediately re-sync userAccounts & permissions.
 */
export function applyStudentTeamOrRoleUpdate(
  prev: AppState,
  studentId: string,
  updates: { teamId?: number; roleInClass?: string }
): AppState {
  const targetStudent = prev.students.find((s) => s.id === studentId);
  const updatedStudents = prev.students.map((st) => {
    if (st.id !== studentId) return st;
    const nextTeamId = updates.teamId !== undefined ? updates.teamId : st.teamId;
    let nextRole = updates.roleInClass !== undefined ? updates.roleInClass : st.roleInClass;
    // If role contains "Tổ X", keep the team number aligned with nextTeamId
    if (/tổ\s*\d+/i.test(nextRole)) {
      nextRole = nextRole.replace(/tổ\s*\d+/i, `Tổ ${nextTeamId}`);
    }
    return {
      ...st,
      teamId: nextTeamId,
      roleInClass: nextRole,
    };
  });

  const updatedEmulationRecords =
    updates.teamId !== undefined && targetStudent && Array.isArray(prev.emulationRecords)
      ? prev.emulationRecords.map((rec) => {
          const isMatchedStudent =
            (rec.studentId && rec.studentId === studentId) ||
            (rec.studentName &&
              rec.studentName.trim().toLowerCase() ===
                targetStudent.fullName.trim().toLowerCase());
          if (isMatchedStudent) {
            return { ...rec, studentId, teamId: updates.teamId! };
          }
          return rec;
        })
      : prev.emulationRecords;

  const synced = syncUserAccountsWithStudents({
    ...prev,
    students: updatedStudents,
  });

  return {
    ...prev,
    teacherAvatar: synced.teacherAvatar,
    students: updatedStudents,
    emulationRecords: updatedEmulationRecords,
    userAccounts: synced.userAccounts,
    rolePermissions: synced.rolePermissions,
    currentUser: synced.currentUser,
    updatedAt: new Date().toISOString(),
  };
}

