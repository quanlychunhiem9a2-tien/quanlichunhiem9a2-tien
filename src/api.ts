import { AppState } from './types';
import { defaultAppState, guestUserAccount } from './mockData';
import { normalizeStudentTT22 } from './utils/tt22Evaluation';

const STORAGE_KEY = 'gvcn_ai_app_state_v1';
const SESSION_USER_KEY = 'gvcn_ai_session_user_v1';

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

  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        const rawStudents = json.data.students || defaultAppState.students;
        return {
          ...defaultAppState,
          ...json.data,
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
      const rawStudents = parsed.students || defaultAppState.students;
      return {
        ...defaultAppState,
        ...parsed,
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
