import { Student, WeeklyDutyRoster, DutyDayAssignment } from '../types';
import { getCurrentSchoolWeekInfo, formatDateVN } from './dateWeekUtils';

const DAY_LABELS = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const DEFAULT_DAILY_TASKS: string[][] = [
  [
    'Quét lớp & hành lang trước 6h45',
    'Lau bảng & khăn trải bàn giáo viên',
    'Xếp ghế chào cờ đầu tuần & đổ rác cuối buổi',
  ],
  [
    'Quét phòng học & kê lại bàn ghế ngay ngắn',
    'Lau bảng sau mỗi tiết học',
    'Tưới cây & chăm sóc bồn hoa chi đội',
  ],
  [
    'Quét lớp, hành lang & cầu thang khu vực phân công',
    'Lau bảng & vệ sinh bục giảng',
    'Đổ rác & kiểm tra tắt điện, quạt cuối giờ',
  ],
  [
    'Quét lớp & lau cửa sổ, bệ cửa phòng 302',
    'Lau bảng & chuẩn bị phấn viết',
    'Đổ rác & vệ sinh góc học tập',
  ],
  [
    'Quét lớp & hành lang sạch sẽ',
    'Lau bảng & giặt khăn lau bảng, khăn bàn GV',
    'Chăm sóc công trình măng non chi đội 9A2',
  ],
  [
    'Tổng vệ sinh phòng học cuối tuần',
    'Lau bảng, kê bàn ghế & kiểm tra khóa cửa sổ, điện quạt',
    'Đổ rác & bàn giao sổ trực nhật cho tổ tuần kế tiếp',
  ],
];

/**
 * Xác định Tổ trực nhật mặc định theo tuần (xoay vòng Tổ 1 -> Tổ 2 -> Tổ 3 -> Tổ 4)
 */
export function getDefaultDutyTeamForWeek(weekNumber: number): number {
  const clamped = Math.min(35, Math.max(1, weekNumber));
  return ((clamped - 1) % 4) + 1;
}

/**
 * Tạo lịch phân công học sinh trực nhật từ Thứ Hai đến Thứ Bảy cho một tuần và tổ cụ thể
 */
export function buildWeeklyDutyRoster(
  weekNumber: number,
  students: Student[],
  customTeamId?: number,
  currentActiveWeek?: number
): WeeklyDutyRoster {
  const clampedWeek = Math.min(35, Math.max(1, weekNumber));
  const teamId = customTeamId || getDefaultDutyTeamForWeek(clampedWeek);

  const { week1Monday, currentWeek } = getCurrentSchoolWeekInfo();
  const effectiveCurrentWeek = currentActiveWeek || currentWeek;
  const mondayDate = new Date(
    week1Monday.getTime() + (clampedWeek - 1) * 7 * 24 * 3600 * 1000
  );

  const teamMembers = students.filter((s) => s.teamId === teamId);
  const leader =
    teamMembers.find((s) => s.roleInClass.includes('Tổ trưởng'))?.fullName ||
    teamMembers[0]?.fullName ||
    `Tổ trưởng Tổ ${teamId}`;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Distribute all team members evenly across the 6 days so no member is left unassigned
  const dayBuckets: string[][] = Array.from({ length: DAY_LABELS.length }, () => []);
  if (teamMembers.length > 0) {
    // Step 1: Assign every member in teamMembers to one of the 6 days sequentially
    teamMembers.forEach((member, idx) => {
      const targetDayIdx = Math.min(
        DAY_LABELS.length - 1,
        Math.floor((idx * DAY_LABELS.length) / teamMembers.length)
      );
      if (!dayBuckets[targetDayIdx].includes(member.id)) {
        dayBuckets[targetDayIdx].push(member.id);
      }
    });

    // Step 2: Ensure each day has at least 2 students when team has >= 2 members
    const minPerDay = teamMembers.length >= 2 ? 2 : 1;
    let rotateIdx = 0;
    for (let dIdx = 0; dIdx < DAY_LABELS.length; dIdx++) {
      while (dayBuckets[dIdx].length < minPerDay && dayBuckets[dIdx].length < teamMembers.length) {
        const candidate = teamMembers[rotateIdx % teamMembers.length];
        rotateIdx++;
        if (candidate && !dayBuckets[dIdx].includes(candidate.id)) {
          dayBuckets[dIdx].push(candidate.id);
        }
      }
    }
  }

  const days: DutyDayAssignment[] = DAY_LABELS.map((dayLabel, dayIdx) => {
    const dayDate = new Date(mondayDate.getTime() + dayIdx * 24 * 3600 * 1000);
    const dateStr = formatDateVN(dayDate);
    const assignedIds = dayBuckets[dayIdx] || [];

    // Default status based on whether the date has passed
    let status: 'done' | 'pending' | 'reminded' = 'pending';
    if (clampedWeek < effectiveCurrentWeek) {
      status = 'done';
    } else if (clampedWeek === effectiveCurrentWeek) {
      if (dayDate.getTime() < todayMidnight) {
        status = 'done';
      } else {
        status = 'pending';
      }
    }

    return {
      dayIndex: dayIdx,
      dayLabel,
      dateStr,
      studentIds: assignedIds,
      tasks: DEFAULT_DAILY_TASKS[dayIdx] || DEFAULT_DAILY_TASKS[0],
      status,
      note:
        status === 'done'
          ? 'Lớp học sạch sẽ, hoàn thành tốt nhiệm vụ trực nhật'
          : 'Thực hiện trực nhật đầu giờ và cuối buổi học',
    };
  });

  return {
    weekNumber: clampedWeek,
    teamId,
    supervisorName: `${leader} (Tổ trưởng Tổ ${teamId})`,
    days,
    excludedStudentIds: [],
  };
}

/**
 * Lấy lịch trực nhật của tuần (ưu tiên dữ liệu đã tùy chỉnh trong state, nếu chưa có sẽ tự động khởi tạo theo danh sách HS hiện tại)
 */
export function getOrGenerateWeeklyDutyRoster(
  weekNumber: number,
  students: Student[],
  savedRosters?: Record<number, WeeklyDutyRoster>,
  currentActiveWeek?: number
): WeeklyDutyRoster {
  const existing = savedRosters?.[weekNumber];
  if (existing && Array.isArray(existing.days) && existing.days.length === 6) {
    // Cập nhật lại ngày tháng chuẩn theo mốc Tuần 1 = 07/09/2026 để luôn đồng bộ
    const { week1Monday } = getCurrentSchoolWeekInfo();
    const mondayDate = new Date(
      week1Monday.getTime() + (weekNumber - 1) * 7 * 24 * 3600 * 1000
    );
    const validStudentIdSet = new Set(students.map((s) => s.id));
    const excludedIds = (existing.excludedStudentIds || []).filter((id) =>
      validStudentIdSet.has(id)
    );
    const excludedSet = new Set(excludedIds);
    return {
      ...existing,
      excludedStudentIds: excludedIds,
      days: existing.days.map((d, idx) => {
        const dayDate = new Date(mondayDate.getTime() + idx * 24 * 3600 * 1000);
        return {
          ...d,
          dateStr: formatDateVN(dayDate),
          studentIds: d.studentIds.filter(
            (id) => validStudentIdSet.has(id) && !excludedSet.has(id)
          ),
        };
      }),
    };
  }
  return buildWeeklyDutyRoster(weekNumber, students, undefined, currentActiveWeek);
}
