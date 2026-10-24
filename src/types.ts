export type AcademicRankTT22 = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa đủ môn' | 'Chưa đánh giá' | '' | 'Giỏi' | 'Trung bình' | 'Yếu';
export type ConductRankTT22 = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa đánh giá' | '';
export type AwardTitleTT22 = 'Học sinh Xuất sắc' | 'Học sinh Giỏi' | '' | string;

export type SemesterTerm = 'hk1' | 'hk2' | 'caNam';

export interface EvaluatedSubjects {
  physicalEducation?: 'Đạt' | 'Chưa đạt' | '' | 'Chưa đánh giá'; // Giáo dục thể chất
  art?: 'Đạt' | 'Chưa đạt' | '' | 'Chưa đánh giá'; // Nghệ thuật (Âm nhạc, Mỹ thuật)
  experientialActivities?: 'Đạt' | 'Chưa đạt' | '' | 'Chưa đánh giá'; // Hoạt động trải nghiệm, hướng nghiệp
  localEducation?: 'Đạt' | 'Chưa đạt' | '' | 'Chưa đánh giá'; // Nội dung giáo dục địa phương
}

export interface SubjectGrades {
  math?: number;
  literature?: number;
  english?: number;
  naturalScience?: number;
  historyGeography?: number;
  informatics?: number;
  civics?: number;
  [key: string]: number | undefined;
}

export interface SemesterRecord {
  subjects: SubjectGrades;
  evaluatedSubjects: EvaluatedSubjects;
  gpa: number;
  academicRank: AcademicRankTT22;
  conductRank: ConductRankTT22;
  conductEvaluated?: boolean;
  awardTitle?: AwardTitleTT22;
  notes?: string;
}

export interface Student {
  id: string;
  code: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'Nam' | 'Nữ';
  avatar: string;
  address: string;
  teamId: number; // 1, 2, 3, 4
  roleInClass: string;
  parentName: string;
  parentPhone: string;
  parentJob?: string;
  academicRank: AcademicRankTT22;
  conductRank: ConductRankTT22;
  conductEvaluated?: boolean;
  awardTitle?: AwardTitleTT22;
  gpa: number;
  notes: string;
  subjects?: SubjectGrades;
  evaluatedSubjects?: EvaluatedSubjects;
  semester1?: SemesterRecord;
  semester2?: SemesterRecord;
  yearOverall?: SemesterRecord;
}

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late';

export interface StudentAttendanceDetail {
  status: AttendanceStatus;
  reason?: string;
  timeArrived?: string;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  records: Record<string, StudentAttendanceDetail>; // studentId -> detail
  summary: {
    total: number;
    present: number;
    excused: number;
    unexcused: number;
    late: number;
  };
}

export interface EmulationRecord {
  id: string;
  date: string;
  week: number; // 1 to 35 weeks in school year
  teamId: number;
  studentId?: string;
  studentName?: string;
  type: 'plus' | 'minus';
  points: number;
  criteria: string;
  note: string;
  recordedBy: string;
}

export interface TeamScore {
  teamId: number;
  teamName: string;
  leaderName: string;
  memberCount: number;
  points: number;
  rank: number;
}

export interface Task {
  id: string;
  title: string;
  priority: 'Quan trọng' | 'Thường' | 'Thấp';
  dueDate: string;
  completed: boolean;
  assignedTo?: string;
  category?: string;
}

export interface Notice {
  id: string;
  title: string;
  timeInfo: string;
  relativeTime: string;
  iconType: 'megaphone' | 'calendar' | 'users' | 'document';
  description?: string;
}

export interface SpecialStudentConcern {
  studentId: string;
  studentName: string;
  reason: string;
  actionPlan: string;
}

export interface HomeroomPlan {
  id: string;
  title: string;
  period: 'Tuần' | 'Tháng' | 'Học kỳ';
  weekNumber?: number; // 1 to 35
  semester?: 1 | 2;
  theme?: string;
  startDate: string;
  endDate: string;
  goals: string[];
  measures: string[];
  tasks: {
    id: string;
    day: string;
    content: string;
    responsible: string;
    done: boolean;
  }[];
  specialStudents?: SpecialStudentConcern[];
  coordination?: {
    subjectTeachers?: string;
    parents?: string;
    youthUnion?: string;
  };
  reviewNotes?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'Thư mời' | 'Kế hoạch' | 'Báo cáo' | 'Biên bản' | 'Thông báo' | 'Khác';
  date: string;
  content: string;
  recipient?: string;
}

export interface ParentContact {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  phone: string;
  date: string;
  contactType: 'Gọi điện' | 'Zalo' | 'Gặp trực tiếp' | 'Họp phụ huynh';
  topic: string;
  content: string;
  followUpNeeded: boolean;
  status: 'Đã trao đổi' | 'Cần gọi lại' | 'Hẹn gặp';
}

export type UserRole =
  | 'teacher'
  | 'class_monitor'
  | 'vice_monitor_academic'
  | 'vice_monitor_discipline'
  | 'team_leader_1'
  | 'team_leader_2'
  | 'team_leader_3'
  | 'team_leader_4'
  | 'guest'
  | (string & {});

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  category: 'GVCN' | 'Ban cán sự' | 'Tổ trưởng' | 'Cán sự bộ môn' | 'Khác';
  teamId?: number; // 1, 2, 3, 4
  studentId?: string;
  avatar: string;
  phone?: string;
  password?: string; // Mật khẩu / mã PIN đăng nhập (mặc định: '123456')
}

export interface RolePermissions {
  canManageStudents: boolean; // Thêm / sửa / xóa học sinh & Nhập Excel
  canTakeAttendance: boolean; // Điểm danh
  attendanceScope: 'all' | 'own_team' | 'none'; // Phạm vi điểm danh
  canManageAcademics: boolean; // Nhập điểm học tập TT22
  canRecordEmulation: boolean; // Chấm điểm thi đua nề nếp
  emulationScope: 'all' | 'own_team' | 'none'; // Phạm vi chấm thi đua
  canCreateOfficialPlan: boolean; // Tạo / sửa kế hoạch tuần chính thức
  canProposePlanTask: boolean; // Đề xuất công việc vào kế hoạch tuần
  canToggleTasks: boolean; // Đánh dấu hoàn thành công việc
  canManageParents: boolean; // Quản lý liên lạc phụ huynh
  canUseAI: boolean; // Trợ lý AI GVCN
  canExportReports: boolean; // Xuất báo cáo & In sổ
  canConfigureSystem: boolean; // Cài đặt hệ thống
}

export interface DutyDayAssignment {
  dayIndex: number; // 0 = Thứ Hai .. 5 = Thứ Bảy
  dayLabel: string; // 'Thứ Hai' .. 'Thứ Bảy'
  dateStr: string;  // DD/MM/YYYY
  studentIds: string[];
  tasks: string[];
  status: 'done' | 'pending' | 'reminded';
  note?: string;
}

export interface WeeklyDutyRoster {
  weekNumber: number; // 1..35
  teamId: number;     // 1..4
  supervisorName: string;
  days: DutyDayAssignment[];
}

export interface WeeklyExemplaryStudentItem {
  studentId: string;
  content?: string;
  conductRank?: ConductRankTT22 | string;
  badgeTitle?: string;
  commendationNote: string;
}

export interface WeeklyExemplaryRecord {
  weekNumber: number; // 1..35
  updatedAt?: string;
  teacherComment?: string;
  items: WeeklyExemplaryStudentItem[];
}

export interface AppState {
  schoolName: string;
  slogan: string;
  teacherName: string;
  teacherRole: string;
  className: string;
  academicYear: string;
  students: Student[];
  attendanceHistory: Record<string, AttendanceRecord>;
  todayDate: string; // e.g. "2026-09-11"
  tasks: Task[];
  notices: Notice[];
  emulationRecords: EmulationRecord[];
  currentEmulationWeek?: number; // 1 to 35
  weeklyDutyRosters?: Record<number, WeeklyDutyRoster>;
  weeklyExemplaryStudents?: Record<number, WeeklyExemplaryRecord>;
  plans: HomeroomPlan[];
  documents: DocumentItem[];
  parentContacts: ParentContact[];
  currentUser?: UserAccount;
  userAccounts?: UserAccount[];
  rolePermissions?: Record<string, RolePermissions>;
}

export type NavPage =
  | 'home'
  | 'students'
  | 'attendance'
  | 'academics'
  | 'emulation'
  | 'parents'
  | 'plans'
  | 'documents'
  | 'ai'
  | 'reports'
  | 'settings';
