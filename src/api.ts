import { AppState, EmulationRecord, HomeroomPlan, Student } from './types';
import { defaultAppState, guestUserAccount } from './mockData';
import { normalizeStudentTT22 } from './utils/tt22Evaluation';
import { getCurrentSchoolWeekInfo, getSchoolWeekMeta } from './utils/dateWeekUtils';
import { fetchFromSupabase, syncToSupabase } from './lib/supabase';
import { syncUserAccountsWithStudents } from './utils/cadreSyncUtils';
import {
  AVATAR_STORE_KEY,
  getPersistedAvatarStore,
  isCustomAvatarUrl,
  syncAvatarStoreFromState,
} from './utils/avatarUpload';

const STORAGE_KEY = 'gvcn_ai_app_state_v2';
const SESSION_USER_KEY = 'gvcn_ai_session_user_v2';

let saveSequence = 0;

const DEMERIT_KEYWORDS = [
  'đi học muộn',
  'đi trễ',
  'nói chuyện riêng',
  'mất trật tự',
  'quên khăn quàng',
  'thẻ học sinh',
  'không thuộc bài',
  'thiếu bài tập',
  'không chuẩn bị bài',
  'không trực nhật',
  'không thực hiện trực nhật',
  'xả rác',
  'nghỉ học không phép',
  'nhắc nhở nề nếp',
  'vi phạm',
];

export function normalizeEmulationRecord(
  rec: EmulationRecord,
  students: Student[]
): EmulationRecord {
  const criteriaText = (rec.criteria || '').trim();
  const lowerCriteria = criteriaText.toLowerCase();
  const isKnownDemerit = DEMERIT_KEYWORDS.some((kw) => lowerCriteria.includes(kw));

  const absPoints = Math.max(1, Math.abs(Number(rec.points) || 1));
  const isMinus = rec.type === 'minus' || Number(rec.points) < 0 || isKnownDemerit;

  const finalType: 'plus' | 'minus' = isMinus ? 'minus' : 'plus';
  const finalPoints = isMinus ? -absPoints : absPoints;

  let matchedStudent: Student | undefined;
  if (rec.studentId) {
    matchedStudent = students.find((s) => s.id === rec.studentId);
  }
  if (!matchedStudent && rec.studentName) {
    const targetName = rec.studentName.trim().toLowerCase();
    matchedStudent = students.find(
      (s) => s.fullName.trim().toLowerCase() === targetName
    );
  }

  return {
    ...rec,
    week: Number(rec.week) || 2,
    type: finalType,
    points: finalPoints,
    criteria: criteriaText || (finalType === 'plus' ? 'Điểm cộng thi đua' : 'Điểm trừ nề nếp'),
    note: (rec.note || '').trim(),
    studentId: matchedStudent ? matchedStudent.id : rec.studentId,
    studentName: matchedStudent ? matchedStudent.fullName : rec.studentName?.trim() || undefined,
    teamId: matchedStudent ? matchedStudent.teamId : Number(rec.teamId) || 1,
  };
}

function normalizePlanWeekDates(plan: HomeroomPlan): HomeroomPlan {
  if (!plan.weekNumber || plan.weekNumber < 1 || plan.weekNumber > 35) return plan;
  const meta = getSchoolWeekMeta(plan.weekNumber);
  return {
    ...plan,
    startDate: meta.startDate,
    endDate: meta.endDate,
  };
}

function getSessionUser() {
  try {
    const sessionUser =
      sessionStorage.getItem(SESSION_USER_KEY) ||
      localStorage.getItem(SESSION_USER_KEY);
    if (sessionUser) {
      return JSON.parse(sessionUser);
    }
  } catch (e) {
    // ignore
  }
  return guestUserAccount;
}

function persistSessionUser(user: any) {
  if (!user) return;
  try {
    const serialized = JSON.stringify(user);
    sessionStorage.setItem(SESSION_USER_KEY, serialized);
    localStorage.setItem(SESSION_USER_KEY, serialized);
  } catch (e) {
    // ignore
  }
}

function hydrateAppState(
  rawData: Partial<AppState>,
  activeUser: any,
  latestWeek: { currentWeek: number; todayISO: string }
): AppState {
  // Sync any custom avatars from incoming rawData into local avatar store first
  syncAvatarStoreFromState(rawData);
  const avatarStore = getPersistedAvatarStore();

  const rawStudents = Array.isArray(rawData.students)
    ? rawData.students
    : defaultAppState.students;
  const rawPlans = Array.isArray(rawData.plans)
    ? rawData.plans
    : defaultAppState.plans;

  // Apply persisted student avatars so custom avatars are never lost on reload
  const normalizedStudents = rawStudents.map((st) => {
    const normalized = normalizeStudentTT22(st);
    const savedStudentAvatar = avatarStore.byStudentId[normalized.id];
    const finalAvatar =
      (isCustomAvatarUrl(normalized.avatar) && normalized.avatar) ||
      savedStudentAvatar ||
      normalized.avatar;
    return {
      ...normalized,
      avatar: finalAvatar,
    };
  });

  const rawEmulationRecords = Array.isArray(rawData.emulationRecords)
    ? rawData.emulationRecords
    : defaultAppState.emulationRecords;
  const normalizedEmulationRecords = rawEmulationRecords.map((r) =>
    normalizeEmulationRecord(r, normalizedStudents)
  );

  // Tự động cập nhật tuần hiện tại và ngày hôm nay khi bước sang ngày mới / tuần mới
  const resolvedWeek =
    !rawData.currentEmulationWeek ||
    rawData.currentEmulationWeek < latestWeek.currentWeek ||
    rawData.todayDate !== latestWeek.todayISO
      ? latestWeek.currentWeek
      : rawData.currentEmulationWeek;
  const resolvedToday = latestWeek.todayISO;

  const syncedCadres = syncUserAccountsWithStudents({
    students: normalizedStudents,
    userAccounts: rawData.userAccounts || defaultAppState.userAccounts,
    rolePermissions: rawData.rolePermissions || defaultAppState.rolePermissions,
    teacherName: rawData.teacherName || defaultAppState.teacherName,
    teacherRole: rawData.teacherRole || defaultAppState.teacherRole,
    teacherAvatar: rawData.teacherAvatar || avatarStore.teacherAvatar,
    currentUser: activeUser,
  });

  persistSessionUser(syncedCadres.currentUser);

  return {
    ...defaultAppState,
    ...rawData,
    teacherAvatar: syncedCadres.teacherAvatar,
    todayDate: resolvedToday,
    currentEmulationWeek: resolvedWeek,
    plans: rawPlans.map(normalizePlanWeekDates),
    students: normalizedStudents,
    emulationRecords: normalizedEmulationRecords,
    currentUser: syncedCadres.currentUser,
    userAccounts: syncedCadres.userAccounts,
    rolePermissions: syncedCadres.rolePermissions,
  };
}

function readLocalAppState(): Partial<AppState> | null {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === 'object') {
        syncAvatarStoreFromState(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }
  return null;
}

export async function fetchAppState(): Promise<AppState> {
  const activeUser = getSessionUser();
  const latestWeek = getCurrentSchoolWeekInfo();
  const localRaw = readLocalAppState();
  const localTime = localRaw?.updatedAt ? new Date(localRaw.updatedAt).getTime() : 0;

  // 1. Ưu tiên đọc từ Supabase Cloud, nhưng so sánh timestamp với bản lưu cục bộ để tránh mất thay đổi vừa lưu
  try {
    const supabaseData = await fetchFromSupabase();
    if (supabaseData && Array.isArray(supabaseData.students)) {
      const cloudTime = supabaseData.updatedAt
        ? new Date(supabaseData.updatedAt).getTime()
        : 0;

      // Nếu bản lưu ở LocalStorage mới hơn bản trên Cloud (VD: vừa đổi ảnh đại diện và F5 ngay lập tức)
      const baseData =
        localRaw && Array.isArray(localRaw.students) && localTime > cloudTime
          ? localRaw
          : supabaseData;

      const hydrated = hydrateAppState(baseData, activeUser, latestWeek);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
      } catch (e) {
        // ignore
      }
      if (baseData === localRaw) {
        syncToSupabase(hydrated).catch(() => {});
      }
      return hydrated;
    }
  } catch (err) {
    console.warn('Supabase direct fetch skipped, trying API backend', err);
  }

  // 2. Đọc từ Backend Server (/api/db - cũng được kết nối với Supabase & db.json)
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        const apiData = json.data as Partial<AppState>;
        const apiTime = apiData.updatedAt ? new Date(apiData.updatedAt).getTime() : 0;
        const baseData =
          localRaw && Array.isArray(localRaw.students) && localTime > apiTime
            ? localRaw
            : apiData;
        const hydrated = hydrateAppState(baseData, activeUser, latestWeek);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
        } catch (e) {
          // ignore
        }
        syncToSupabase(hydrated).catch(() => {});
        return hydrated;
      }
    }
  } catch (err) {
    console.warn('API db fetch failed, checking localStorage fallback', err);
  }

  // 3. Fallback đọc từ LocalStorage trên trình duyệt
  if (localRaw && Array.isArray(localRaw.students)) {
    const hydrated = hydrateAppState(localRaw, activeUser, latestWeek);
    syncToSupabase(hydrated).catch(() => {});
    return hydrated;
  }

  // 4. Khởi tạo mặc định lần đầu và đồng bộ lên Supabase + Backend
  const normalizedDefault = hydrateAppState(defaultAppState, activeUser, latestWeek);
  saveAppState(normalizedDefault);
  return normalizedDefault;
}

export async function saveAppState(state: AppState): Promise<boolean> {
  const currentSeq = ++saveSequence;
  const nowISO = new Date().toISOString();
  const stateToSave: AppState = {
    ...state,
    updatedAt: nowISO,
  };

  // Sync custom avatars to dedicated local avatar store immediately
  syncAvatarStoreFromState(stateToSave);

  // Update sessionStorage & localStorage for active user immediately
  if (stateToSave.currentUser) {
    persistSessionUser(stateToSave.currentUser);
  }

  // Always update localStorage synchronously before any network call
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }

  // Nếu có một lệnh save mới hơn vừa được gọi tiếp theo, chỉ gửi bản mới nhất lên mạng
  await new Promise((r) => setTimeout(r, 50));
  if (currentSeq !== saveSequence) {
    return true;
  }

  // Đồng bộ trực tiếp lên Supabase Cloud + Server Backend song song
  const [supabaseResult, backendOk] = await Promise.all([
    syncToSupabase(stateToSave).catch(() => ({ ok: false })),
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateToSave),
    })
      .then((res) => res.ok)
      .catch(() => false),
  ]);

  return Boolean(supabaseResult.ok || backendOk);
}

export async function resetAppState(): Promise<AppState> {
  try {
    await fetch('/api/db/reset', { method: 'POST' });
  } catch (e) {
    console.error('API reset error:', e);
  }
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(AVATAR_STORE_KEY);
  await saveAppState(defaultAppState);
  return defaultAppState;
}

export async function sendAIChatMessage(message: string, category?: string, contextData?: any): Promise<string> {
  try {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, category, contextData }),
    });
    const data = await res.json();
    if (data.text) {
      return data.text;
    }
    if (data.error) {
      return `[Lỗi phản hồi AI]: ${data.error}`;
    }
  } catch (err: any) {
    console.error('Chat error:', err);
  }
  return 'Không thể kết nối đến máy chủ trợ lý AI. Vui lòng kiểm tra lại kết nối mạng.';
}
