import { createClient } from '@supabase/supabase-js';
import { AppState } from '../types';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://nkzxtdjmhbspdilhugvw.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_yo_IOqUPF4HuKBm6b67kPg_gkFkrJRc';

export const SUPABASE_PROJECT_REF = 'nkzxtdjmhbspdilhugvw';
export const SUPABASE_SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql/new`;
export const SUPABASE_TABLE_EDITOR_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/editor`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

export const APP_STATE_ROW_ID = 'main_class_9a2';

export interface SupabaseConnectionStatus {
  status: 'connected' | 'missing_table' | 'error';
  message: string;
  updatedAt?: string | null;
  studentCount?: number;
  hasExistingData?: boolean;
  errorCode?: string;
}

export const SUPABASE_SQL_SETUP_SCRIPT = `-- =========================================================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU SUPABASE CHO HỆ THỐNG GVCN AI
-- Dự án: https://nkzxtdjmhbspdilhugvw.supabase.co
-- Hướng dẫn: Dán toàn bộ đoạn mã này vào SQL Editor trên Supabase và bấm RUN
-- =========================================================================

-- 1. Bảng lưu trữ trạng thái tổng thể của lớp học (JSONB đồng bộ toàn diện)
CREATE TABLE IF NOT EXISTS public.app_state (
  id TEXT PRIMARY KEY DEFAULT 'main_class_9a2',
  class_name TEXT,
  academic_year TEXT,
  teacher_name TEXT,
  student_count INTEGER DEFAULT 0,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng danh sách học sinh chuẩn hóa (giúp xem/lọc trực tiếp trên Table Editor)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  code TEXT,
  full_name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  team_id INTEGER,
  role_in_class TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  status TEXT,
  academic_level TEXT,
  conduct_level TEXT,
  raw_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bật Row Level Security (RLS) và cấu hình Policy cho Publishable/Anon Key
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to app_state" ON public.app_state;
CREATE POLICY "Allow public full access to app_state"
  ON public.app_state
  FOR ALL
  TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access to students" ON public.students;
CREATE POLICY "Allow public full access to students"
  ON public.students
  FOR ALL
  TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Cấp quyền truy cập bảng cho API Key
GRANT ALL ON TABLE public.app_state TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.students TO anon, authenticated, service_role;

-- 5. Làm mới bộ nhớ đệm Schema của Supabase PostgREST ngay lập tức
NOTIFY pgrst, 'reload schema';`;

/**
 * Kiểm tra trạng thái kết nối và bảng trên Supabase
 */
export async function checkSupabaseStatus(): Promise<SupabaseConnectionStatus> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('id, class_name, student_count, updated_at')
      .eq('id', APP_STATE_ROW_ID)
      .maybeSingle();

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('does not exist')
      ) {
        return {
          status: 'missing_table',
          message:
            'Đã kết nối máy chủ Supabase thành công! Bạn chỉ cần chạy đoạn lệnh SQL khởi tạo bảng (1 lần duy nhất) trong SQL Editor của Supabase.',
          errorCode: error.code,
        };
      }

      return {
        status: 'error',
        message: `Lỗi truy vấn Supabase (${error.code || 'UNKNOWN'}): ${error.message}`,
        errorCode: error.code,
      };
    }

    return {
      status: 'connected',
      message: data
        ? `Đã kết nối & đồng bộ dữ liệu trên Supabase (${data.student_count || 0} học sinh).`
        : 'Bảng dữ liệu trên Supabase đã sẵn sàng! Nhấn "Đồng bộ lên Supabase" để đẩy dữ liệu lên đám mây.',
      updatedAt: data?.updated_at || null,
      studentCount: data?.student_count || 0,
      hasExistingData: Boolean(data),
    };
  } catch (err: any) {
    return {
      status: 'error',
      message: err?.message || 'Không thể kết nối tới Supabase.',
    };
  }
}

/**
 * Đọc toàn bộ dữ liệu AppState từ bảng public.app_state trên Supabase
 */
export async function fetchFromSupabase(): Promise<Partial<AppState> | null> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data, updated_at')
      .eq('id', APP_STATE_ROW_ID)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('[Supabase] Lỗi khi tải dữ liệu:', error.message);
      }
      return null;
    }

    if (data && data.data && typeof data.data === 'object') {
      return data.data as Partial<AppState>;
    }
    return null;
  } catch (err) {
    console.warn('[Supabase] Không thể kết nối khi tải dữ liệu:', err);
    return null;
  }
}

/**
 * Lưu / đồng bộ toàn bộ dữ liệu AppState và danh sách học sinh lên Supabase
 */
export async function syncToSupabase(state: AppState): Promise<{ ok: boolean; error?: string }> {
  try {
    const nowISO = new Date().toISOString();
    const payload = {
      id: APP_STATE_ROW_ID,
      class_name: state.className || 'Lớp 9A2',
      academic_year: state.academicYear || 'Năm học 2026 - 2027',
      teacher_name: state.teacherName || 'Trần Văn Tiến',
      student_count: Array.isArray(state.students) ? state.students.length : 0,
      data: state,
      updated_at: nowISO,
    };

    const { error } = await supabase.from('app_state').upsert(payload, { onConflict: 'id' });

    if (error) {
      return { ok: false, error: `${error.code || ''}: ${error.message}` };
    }

    // Đồng bộ song song danh sách học sinh sang bảng public.students (nếu bảng tồn tại)
    if (Array.isArray(state.students) && state.students.length > 0) {
      const studentRows = state.students.map((st) => ({
        id: st.id,
        code: st.code,
        full_name: st.fullName,
        gender: st.gender,
        dob: st.dateOfBirth || '',
        team_id: st.teamId,
        role_in_class: st.roleInClass || 'Học sinh',
        parent_name: st.parentName || '',
        parent_phone: st.parentPhone || '',
        status: 'Đang học',
        academic_level: st.academicRank || '',
        conduct_level: st.conductRank || '',
        raw_data: st,
        updated_at: nowISO,
      }));

      await supabase.from('students').upsert(studentRows, { onConflict: 'id' });
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Lỗi không xác định khi ghi lên Supabase' };
  }
}
