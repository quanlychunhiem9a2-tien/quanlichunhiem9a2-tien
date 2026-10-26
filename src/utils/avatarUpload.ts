import { AppState } from '../types';

export const AVATAR_STORE_KEY = 'gvcn_ai_avatar_store_v2';

export const DEFAULT_TEACHER_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export interface PersistedAvatarStore {
  teacherAvatar?: string;
  byAccountId: Record<string, string>;
  byStudentId: Record<string, string>;
  updatedAt: number;
}

export function isCustomAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.includes('api.dicebear.com')) return true;
  return !trimmed.includes('images.unsplash.com');
}

export function getPersistedAvatarStore(): PersistedAvatarStore {
  try {
    const raw = localStorage.getItem(AVATAR_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        teacherAvatar: parsed?.teacherAvatar || undefined,
        byAccountId:
          parsed?.byAccountId && typeof parsed.byAccountId === 'object'
            ? parsed.byAccountId
            : {},
        byStudentId:
          parsed?.byStudentId && typeof parsed.byStudentId === 'object'
            ? parsed.byStudentId
            : {},
        updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0,
      };
    }
  } catch (e) {
    // ignore storage read errors
  }
  return {
    byAccountId: {},
    byStudentId: {},
    updatedAt: 0,
  };
}

export function savePersistedAvatarStore(store: PersistedAvatarStore): void {
  try {
    localStorage.setItem(
      AVATAR_STORE_KEY,
      JSON.stringify({
        ...store,
        updatedAt: Date.now(),
      })
    );
  } catch (e) {
    console.warn('Could not write avatar store to localStorage:', e);
  }
}

export function persistAvatarChange(opts: {
  avatarUrl: string;
  isTeacher?: boolean;
  accountId?: string;
  studentId?: string;
}): void {
  if (!opts.avatarUrl) return;
  const current = getPersistedAvatarStore();
  if (opts.isTeacher) {
    current.teacherAvatar = opts.avatarUrl;
    current.byAccountId['user-gvcn'] = opts.avatarUrl;
  }
  if (opts.accountId) {
    current.byAccountId[opts.accountId] = opts.avatarUrl;
  }
  if (opts.studentId) {
    current.byStudentId[opts.studentId] = opts.avatarUrl;
  }
  savePersistedAvatarStore(current);
}

/**
 * Syncs any custom avatars present in an AppState object into the local avatar store
 * so cloud-loaded custom avatars are also cached locally.
 */
export function syncAvatarStoreFromState(state?: Partial<AppState> | null): void {
  if (!state) return;
  const current = getPersistedAvatarStore();
  let changed = false;

  if (state.teacherAvatar && isCustomAvatarUrl(state.teacherAvatar)) {
    if (current.teacherAvatar !== state.teacherAvatar) {
      current.teacherAvatar = state.teacherAvatar;
      current.byAccountId['user-gvcn'] = state.teacherAvatar;
      changed = true;
    }
  }

  if (state.currentUser?.avatar && isCustomAvatarUrl(state.currentUser.avatar)) {
    if (state.currentUser.role === 'teacher' && current.teacherAvatar !== state.currentUser.avatar) {
      current.teacherAvatar = state.currentUser.avatar;
      current.byAccountId['user-gvcn'] = state.currentUser.avatar;
      changed = true;
    }
    if (state.currentUser.id && current.byAccountId[state.currentUser.id] !== state.currentUser.avatar) {
      current.byAccountId[state.currentUser.id] = state.currentUser.avatar;
      changed = true;
    }
    if (
      state.currentUser.studentId &&
      current.byStudentId[state.currentUser.studentId] !== state.currentUser.avatar
    ) {
      current.byStudentId[state.currentUser.studentId] = state.currentUser.avatar;
      changed = true;
    }
  }

  if (Array.isArray(state.userAccounts)) {
    for (const acc of state.userAccounts) {
      if (acc?.avatar && isCustomAvatarUrl(acc.avatar)) {
        if (acc.role === 'teacher' && current.teacherAvatar !== acc.avatar) {
          current.teacherAvatar = acc.avatar;
          changed = true;
        }
        if (acc.id && current.byAccountId[acc.id] !== acc.avatar) {
          current.byAccountId[acc.id] = acc.avatar;
          changed = true;
        }
        if (acc.studentId && current.byStudentId[acc.studentId] !== acc.avatar) {
          current.byStudentId[acc.studentId] = acc.avatar;
          changed = true;
        }
      }
    }
  }

  if (Array.isArray(state.students)) {
    for (const st of state.students) {
      if (st?.id && st?.avatar && isCustomAvatarUrl(st.avatar)) {
        if (current.byStudentId[st.id] !== st.avatar) {
          current.byStudentId[st.id] = st.avatar;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    savePersistedAvatarStore(current);
  }
}

/**
 * Utility to read an uploaded image file from the user's device,
 * center-crop and resize it to a crisp square (default 220x220),
 * and compress it as a lightweight JPEG/WebP Data URL (~12-25KB)
 * so it syncs instantaneously with localStorage, API, and Supabase.
 */
export async function processAvatarImageFile(
  file: File,
  maxDimension: number = 220,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Dữ liệu hình ảnh trống.'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback if Image decoding fails but dataUrl is valid
        if (dataUrl.startsWith('data:image/')) {
          resolve(dataUrl);
        } else {
          reject(new Error('Tệp hình ảnh bị lỗi hoặc không được hỗ trợ.'));
        }
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = maxDimension;
          canvas.height = maxDimension;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Fill white background in case of transparent PNG converted to JPEG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, maxDimension, maxDimension);

          // Center-crop square from source image
          const width = img.naturalWidth || img.width || maxDimension;
          const height = img.naturalHeight || img.height || maxDimension;
          const minSide = Math.min(width, height);
          const sx = (width - minSide) / 2;
          const sy = (height - minSide) / 2;

          ctx.drawImage(
            img,
            sx,
            sy,
            minSide,
            minSide,
            0,
            0,
            maxDimension,
            maxDimension
          );

          // Try WebP first for best quality-to-size ratio, fallback to JPEG
          let compressed = canvas.toDataURL('image/webp', quality);
          if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(compressed);
        } catch (err) {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}

export const PRESET_STUDENT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
];

export const PRESET_TEACHER_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherLan',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherMinh',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherHoa',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherTuan',
];
