import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkzxtdjmhbspdilhugvw.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yo_IOqUPF4HuKBm6b67kPg_gkFkrJRc';
const APP_STATE_ROW_ID = 'main_class_9a2';

const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

app.use(express.json({ limit: '10mb' }));

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Gemini client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
}

// Helper to read local fallback DB
function readLocalDatabase(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
  return null;
}

// Helper to write local fallback DB
function writeLocalDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    supabaseUrl: SUPABASE_URL,
  });
});

// GET all state (Supabase primary, local db.json fallback)
app.get('/api/db', async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('app_state')
      .select('data')
      .eq('id', APP_STATE_ROW_ID)
      .maybeSingle();

    if (!error && data && data.data) {
      writeLocalDatabase(data.data);
      return res.json({ success: true, source: 'supabase', data: data.data });
    }
  } catch (err) {
    console.warn('Supabase GET fallback to local db.json:', err);
  }

  const localData = readLocalDatabase();
  res.json({ success: true, source: 'local', data: localData });
});

// POST sync state (Write to both Supabase and local db.json)
app.post('/api/db', async (req, res) => {
  const data = req.body;
  if (!data) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const localOk = writeLocalDatabase(data);
  let supabaseOk = false;

  try {
    const nowISO = new Date().toISOString();
    const { error } = await supabaseServer.from('app_state').upsert(
      {
        id: APP_STATE_ROW_ID,
        class_name: data.className || 'Lớp 9A2',
        academic_year: data.academicYear || 'Năm học 2026 - 2027',
        teacher_name: data.teacherName || 'Trần Văn Tiến',
        student_count: Array.isArray(data.students) ? data.students.length : 0,
        data,
        updated_at: nowISO,
      },
      { onConflict: 'id' }
    );
    if (!error) {
      supabaseOk = true;
    }
  } catch (err) {
    // Ignore if table not yet initialized
  }

  res.json({ success: localOk || supabaseOk, supabaseSynced: supabaseOk });
});

// POST reset to defaults
app.post('/api/db/reset', async (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    await supabaseServer.from('app_state').delete().eq('id', APP_STATE_ROW_ID);
    res.json({ success: true, message: 'Database reset to initial defaults' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Chat & Assistance Endpoint
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, category, contextData } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!aiClient) {
      return res.json({
        success: true,
        text:
          `[Chế độ AI ngoại tuyến / Chưa cấu hình GEMINI_API_KEY]\n\nXin chào Thầy Trần Văn Tiến! Dưới đây là phản hồi gợi ý theo quy chuẩn công tác chủ nhiệm lớp 9A2:\n\n` +
          `• Về yêu cầu: "${message}"\n` +
          `• Gợi ý thực hiện:\n` +
          `  1. Kế hoạch tuần: Tập trung đôn đốc nề nếp truy bài đầu giờ, nhắc nhở học sinh chuẩn bị bài cho đợt kiểm tra giữa kỳ.\n` +
          `  2. Phối hợp phụ huynh: Gửi thông báo nhắc nhở qua nhóm Zalo lớp trước 1 ngày.\n` +
          `  3. Động viên học sinh: Biểu dương kịp thời các bạn có tiến bộ trong tiết sinh hoạt lớp thứ Bảy.\n\n` +
          `*Để kích hoạt đầy đủ sức mạnh của Gemini 3.8 Flash, vui lòng đảm bảo biến môi trường GEMINI_API_KEY đã được thiết lập.*`,
      });
    }

    const systemInstruction = `Bạn là Trợ lý AI GVCN (Giáo viên Chủ nhiệm THCS tại Việt Nam), đang hỗ trợ Thầy Trần Văn Tiến, GVCN lớp 9A2 - Trường Tiểu học & THCS Võ Thị Sáu (Năm học 2026-2027).
Phong cách của bạn:
- Chuyên nghiệp, am hiểu nghiệp vụ sư phạm THCS, chuẩn mực ngôn từ sư phạm Việt Nam (theo Thông tư 22/2021/TT-BGDĐT và các quy định giáo dục hiện hành).
- Ngôn ngữ: Tiếng Việt chuẩn xác, dấu đầy đủ, rõ ràng, định dạng markdown đẹp mắt (tiêu đề, gạch đầu dòng, bảng biểu nếu cần).
- Hỗ trợ tốt các công việc: soạn thư mời họp phụ huynh, kế hoạch chủ nhiệm tuần/tháng, nhận xét học sinh (ưu điểm, tồn tại, biện pháp khắc phục), thông báo, biên bản họp, phân tích nề nếp chuyên cần.
- Tuyệt đối không để lộ thông tin nhạy cảm hay định kiến tiêu cực về học sinh; luôn hướng tới giáo dục tích cực.`;

    let promptContent = message;
    if (contextData) {
      promptContent = `[Dữ liệu ngữ cảnh lớp học]:\n${typeof contextData === 'string' ? contextData : JSON.stringify(contextData)}\n\n[Yêu cầu của thầy chủ nhiệm]:\n${message}`;
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContent,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'Không có phản hồi từ mô hình AI.';
    res.json({ success: true, text: replyText });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({
      error: error.message || 'Lỗi khi kết nối với AI Gemini',
      fallbackText: 'Đã xảy ra lỗi khi kết nối với dịch vụ AI. Vui lòng thử lại sau giây lát.',
    });
  }
});

// Vite middleware integration for dev mode or static serving for prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
