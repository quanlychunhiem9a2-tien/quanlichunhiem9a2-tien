// Utility for calculating the current school week (1 - 35) and dates
// Tuần 1 bắt đầu từ Thứ Hai, ngày 07/09/2026 (sau Lễ Khai giảng Thứ Bảy 05/09/2026)

export interface SchoolWeekInfo {
  weekNumber: number;
  semester: 1 | 2;
  startDate: string; // DD/MM/YYYY (Thứ Hai)
  endDate: string;   // DD/MM/YYYY (Thứ Bảy)
  startISO: string;  // YYYY-MM-DD
  endISO: string;    // YYYY-MM-DD
  monthLabel: string;
  label: string;     // DD/MM/YYYY – DD/MM/YYYY
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatDateVN(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Get the Monday of the week containing the given date
 */
export function getMondayOfDate(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // adjust when day is Sunday
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Tuần 1 của năm học 2026 - 2027 bắt đầu từ Thứ Hai ngày 07/09/2026.
 * Tính số tuần hiện tại (1..35) dựa trên ngày tháng mới nhất.
 */
export function getCurrentSchoolWeekInfo(refDate: Date = new Date()): {
  currentWeek: number;
  todayISO: string;
  todayVN: string;
  week1Monday: Date;
} {
  const now = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const currentMonday = getMondayOfDate(now);

  // Tuần 1 bắt đầu vào Thứ Hai ngày 07/09/2026
  const week1Monday = new Date(2026, 8, 7); // 07/09/2026 (Month is 0-indexed: 8 = September)

  const diffDays = Math.round((currentMonday.getTime() - week1Monday.getTime()) / (24 * 3600 * 1000));
  const rawWeek = Math.floor(diffDays / 7) + 1;

  const currentWeek = Math.min(35, Math.max(1, rawWeek));

  return {
    currentWeek,
    todayISO: formatDateISO(now),
    todayVN: formatDateVN(now),
    week1Monday,
  };
}

/**
 * Lấy thông tin ngày bắt đầu (Thứ Hai) và kết thúc (Thứ Bảy) cho từng tuần (1..35)
 * với Tuần 1 bắt đầu từ 07/09/2026 (07/09/2026 – 12/09/2026)
 */
export function getSchoolWeekMeta(weekNum: number, refDate: Date = new Date()): SchoolWeekInfo {
  const { week1Monday } = getCurrentSchoolWeekInfo(refDate);
  const clampedWeek = Math.min(35, Math.max(1, weekNum));

  const start = new Date(week1Monday.getTime() + (clampedWeek - 1) * 7 * 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 5 * 24 * 3600 * 1000); // Thứ Bảy (+5 ngày từ Thứ Hai)

  const startDate = formatDateVN(start);
  const endDate = formatDateVN(end);
  const startISO = formatDateISO(start);
  const endISO = formatDateISO(end);
  const semester: 1 | 2 = clampedWeek <= 18 ? 1 : 2;
  const monthLabel = `${start.getMonth() + 1}`;

  return {
    weekNumber: clampedWeek,
    semester,
    startDate: startDate,
    endDate: endDate,
    startISO,
    endISO,
    monthLabel,
    label: `${startDate} – ${endDate}`,
  };
}

export interface SchoolDayItem {
  dayIndex: number; // 0 = Thứ Hai .. 5 = Thứ Bảy
  dayName: string;  // 'Thứ Hai' .. 'Thứ Bảy'
  shortDay: string; // 'Thứ 2' .. 'Thứ 7'
  dateVN: string;   // DD/MM/YYYY
  shortDateVN: string; // DD/MM
  dateISO: string;  // YYYY-MM-DD
}

const DAY_NAMES_VN = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const SHORT_DAYS_VN = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

/**
 * Lấy danh sách 6 ngày học trong tuần (Thứ Hai -> Thứ Bảy) của một tuần học (1..35)
 */
export function getWeekDaysForWeek(weekNum: number, refDate: Date = new Date()): SchoolDayItem[] {
  const { week1Monday } = getCurrentSchoolWeekInfo(refDate);
  const clampedWeek = Math.min(35, Math.max(1, weekNum));
  const monday = new Date(week1Monday.getTime() + (clampedWeek - 1) * 7 * 24 * 3600 * 1000);

  return Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(monday.getTime() + idx * 24 * 3600 * 1000);
    const dateVN = formatDateVN(d);
    return {
      dayIndex: idx,
      dayName: DAY_NAMES_VN[idx],
      shortDay: SHORT_DAYS_VN[idx],
      dateVN,
      shortDateVN: dateVN.slice(0, 5),
      dateISO: formatDateISO(d),
    };
  });
}

/**
 * Phân tích chuỗi ngày YYYY-MM-DD sang thứ tiếng Việt, ngày DD/MM/YYYY và tuần học tương ứng
 */
export function getDateMetaVN(dateISO: string): {
  dayName: string;
  shortDay: string;
  dateVN: string;
  shortDateVN: string;
  weekNumber: number;
  semester: 1 | 2;
} {
  const parts = (dateISO || '').split('-').map(Number);
  const d =
    parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();

  const jsDay = d.getDay(); // 0 = Sun, 1 = Mon .. 6 = Sat
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  const dateVN = formatDateVN(d);
  const info = getCurrentSchoolWeekInfo(d);

  return {
    dayName: DAY_NAMES_VN[idx],
    shortDay: SHORT_DAYS_VN[idx],
    dateVN,
    shortDateVN: dateVN.slice(0, 5),
    weekNumber: info.currentWeek,
    semester: info.currentWeek <= 18 ? 1 : 2,
  };
}

