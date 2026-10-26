import { AppState, HomeroomPlan } from './types';
import { defaultAppState, guestUserAccount } from './mockData';
import { normalizeStudentTT22 } from './utils/tt22Evaluation';
import { getCurrentSchoolWeekInfo, getSchoolWeekMeta } from './utils/dateWeekUtils';
import { fetchFromSupabase, syncToSupabase } from './lib/supabase';
import { syncUserAccountsWithStudents } from './utils/cadreSyncUtils';

const STORAGE_KEY = 'gvcn_ai_app_state_v2';
const SESSION_USER_KEY = 'gvcn_ai_session_user_v2';

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
    const sessionUser = sessionStorage.getItem(SESSION_USER_KEY);
    if (sessionUser) {
      return JSON.parse(sessionUser);
    }
  } catch (e) {
    // ignore
  }
  return guestUserAccount;
}

function hydrateAppState(rawData: Partial<AppState>, activeUser: any, latestWeek: { currentWeek: number; todayISO: string }): AppState {
  const rawStudents = Array.isArray(rawData.students) ? rawData.students : defaultAppState.students;
  const rawPlans = Array.isArray(rawData.plans) ? rawData.plans : defaultAppState.plans;
  const normalizedStudents = rawStudents.map(normalizeStudentTT22);
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
    currentUser: activeUser,
  });

  return {
    ...defaultAppState,
    ...rawData,
    todayDate: resolvedToday,
    currentEmulationWeek: resolvedWeek,
    plans: rawPlans.map(normalizePlanWeekDates),
    students: normalizedStudents,
    currentUser: syncedCadres.currentUser,
    userAccounts: syncedCadres.userAccounts,
    rolePermissions: syncedCadres.rolePermissions,
  };
}

export async function fetchAppState(): Promise<AppState> {
  const activeUser = getSessionUser();
  const latestWeek = getCurrentSchoolWeekInfo();

  // 1. Ưu tiên đọc trực tiếp từ Supabase Cloud
  try {
    const supabaseData = await fetchFromSupabase();
    if (supabaseData && Array.isArray(supabaseData.students)) {
      const hydrated = hydrateAppState(supabaseData, activeUser, latestWeek);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
      } catch (e) {
        // ignore
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
        const hydrated = hydrateAppState(json.data, activeUser, latestWeek);
        // Nếu Supabase đã sẵn sàng nhưng chưa có bản ghi, tự động đồng bộ lên
        syncToSupabase(hydrated).catch(() => {});
        return hydrated;
      }
    }
  } catch (err) {
    console.warn('API db fetch failed, checking localStorage fallback', err);
  }

  // 3. Fallback đọc từ LocalStorage trên trình duyệt
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      const hydrated = hydrateAppState(parsed, activeUser, latestWeek);
      syncToSupabase(hydrated).catch(() => {});
      return hydrated;
    }
  } catch (e) {
    console.error('LocalStorage read error:', e);
  }

  // 4. Khởi tạo mặc định lần đầu và đồng bộ lên Supabase + Backend
  const normalizedDefault: AppState = {
    ...defaultAppState,
    currentUser: activeUser,
    students: defaultAppState.students.map(normalizeStudentTT22),
  };
  saveAppState(normalizedDefault);
  return normalizedDefault;
}

export async function saveAppState(state: AppState): Promise<boolean> {
  // Update sessionStorage for active user
  try {
    if (state.currentUser) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(state.currentUser));
    }
  } catch (e) {
    // ignore
  }

  // Always update localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }

  // Đồng bộ trực tiếp lên Supabase Cloud + Server Backend song song
  const [supabaseResult, backendOk] = await Promise.all([
    syncToSupabase(state).catch(() => ({ ok: false })),
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
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
