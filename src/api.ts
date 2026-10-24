import { AppState, HomeroomPlan } from './types';
import { defaultAppState, guestUserAccount } from './mockData';
import { normalizeStudentTT22 } from './utils/tt22Evaluation';
import { getCurrentSchoolWeekInfo, getSchoolWeekMeta } from './utils/dateWeekUtils';

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

export async function fetchAppState(): Promise<AppState> {
  const activeUser = getSessionUser();
  const latestWeek = getCurrentSchoolWeekInfo();

  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        const rawStudents = Array.isArray(json.data.students) ? json.data.students : defaultAppState.students;
        const rawPlans = Array.isArray(json.data.plans) ? json.data.plans : defaultAppState.plans;
        const resolvedWeek =
          !json.data.currentEmulationWeek ||
          json.data.currentEmulationWeek === 2 ||
          json.data.currentEmulationWeek === 8
            ? latestWeek.currentWeek
            : json.data.currentEmulationWeek;
        const resolvedToday =
          !json.data.todayDate || json.data.todayDate === '2026-09-11'
            ? latestWeek.todayISO
            : json.data.todayDate;
        return {
          ...defaultAppState,
          ...json.data,
          todayDate: resolvedToday,
          currentEmulationWeek: resolvedWeek,
          plans: rawPlans.map(normalizePlanWeekDates),
          students: rawStudents.map(normalizeStudentTT22),
          currentUser: activeUser,
          userAccounts: json.data.userAccounts || defaultAppState.userAccounts,
          rolePermissions: json.data.rolePermissions || defaultAppState.rolePermissions,
        };
      }
    }
  } catch (err) {
    console.warn('API db fetch failed, checking localStorage fallback', err);
  }

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      const rawStudents = Array.isArray(parsed.students) ? parsed.students : defaultAppState.students;
      const rawPlans = Array.isArray(parsed.plans) ? parsed.plans : defaultAppState.plans;
      const resolvedWeek =
        !parsed.currentEmulationWeek ||
        parsed.currentEmulationWeek === 2 ||
        parsed.currentEmulationWeek === 8
          ? latestWeek.currentWeek
          : parsed.currentEmulationWeek;
      const resolvedToday =
        !parsed.todayDate || parsed.todayDate === '2026-09-11'
          ? latestWeek.todayISO
          : parsed.todayDate;
      return {
        ...defaultAppState,
        ...parsed,
        todayDate: resolvedToday,
        currentEmulationWeek: resolvedWeek,
        plans: rawPlans.map(normalizePlanWeekDates),
        students: rawStudents.map(normalizeStudentTT22),
        currentUser: activeUser,
        userAccounts: parsed.userAccounts || defaultAppState.userAccounts,
        rolePermissions: parsed.rolePermissions || defaultAppState.rolePermissions,
      };
    }
  } catch (e) {
    console.error('LocalStorage read error:', e);
  }

  // Save initial default
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

  // Sync to server backend
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch (err) {
    console.warn('API db write failed, state saved locally', err);
    return false;
  }
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
