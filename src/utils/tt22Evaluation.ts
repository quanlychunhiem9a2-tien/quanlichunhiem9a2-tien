import {
  Student,
  EvaluatedSubjects,
  AcademicRankTT22,
  AwardTitleTT22,
  SemesterRecord,
  SemesterTerm,
  SubjectGrades,
  ConductRankTT22
} from '../types';

export interface TT22EvaluationResult {
  academicRank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
  awardTitle: 'Học sinh Xuất sắc' | 'Học sinh Giỏi' | '';
  gpa: number;
  scoresCount: number;
  countGte9: number;
  countGte8: number;
  countGte65: number;
  countGte50: number;
  countLt50: number;
  countLt35: number;
  allGte65: boolean;
  allGte50: boolean;
  allGte35: boolean;
  commentSubjectsAllPass: boolean;
  commentSubjectsFailCount: number;
  reason: string;
}

export const defaultEvaluatedSubjects: EvaluatedSubjects = {
  physicalEducation: 'Đạt',
  art: 'Đạt',
  experientialActivities: 'Đạt',
  localEducation: 'Đạt',
};

/**
 * Đánh giá kết quả học tập & danh hiệu học sinh theo Thông tư 22/2021/TT-BGDĐT
 * a) Mức Tốt:
 * - Tất cả các môn học đánh giá bằng nhận xét được đánh giá mức Đạt.
 * - Tất cả các môn học đánh giá bằng nhận xét kết hợp đánh giá bằng điểm số có ĐTBm từ 6,5 điểm trở lên, trong đó có ít nhất 06 môn học có ĐTBm đạt từ 8,0 điểm trở lên.
 * 
 * b) Mức Khá:
 * - Tất cả các môn học đánh giá bằng nhận xét được đánh giá mức Đạt.
 * - Tất cả các môn học đánh giá bằng nhận xét kết hợp đánh giá bằng điểm số có ĐTBm từ 5,0 điểm trở lên, trong đó có ít nhất 06 môn học có ĐTBm đạt từ 6,5 điểm trở lên.
 * 
 * c) Mức Đạt:
 * - Có nhiều nhất 01 (một) môn học đánh giá bằng nhận xét được đánh giá mức Chưa đạt.
 * - Có ít nhất 06 (sáu) môn học đánh giá bằng nhận xét kết hợp đánh giá bằng điểm số có ĐTBm từ 5,0 điểm trở lên; không có môn học nào có ĐTBm dưới 3,5 điểm.
 * 
 * d) Mức Chưa đạt: Các trường hợp còn lại.
 * 
 * Danh hiệu khen thưởng cuối năm học:
 * - Học lực Tốt (và Rèn luyện Tốt): Đạt "Học sinh Giỏi"
 * - Nếu có ít nhất 06 môn ĐTBm từ 9,0 điểm trở lên: Đạt danh hiệu "Học sinh Xuất sắc"
 * - Hỗ trợ tùy chỉnh: Học lực Tốt -> Học sinh Giỏi / Học sinh Xuất sắc, Học lực Khá nếu được chọn -> Học sinh Xuất sắc.
 * - Các mức còn lại (Đạt, Chưa đạt) để trống.
 */
export function evaluateStudentTT22(
  subjects: Record<string, number> = {},
  evaluated: EvaluatedSubjects = defaultEvaluatedSubjects,
  conductRank: string = 'Tốt',
  existingAward?: string
): TT22EvaluationResult {
  const scoreValues = Object.values(subjects).filter((v) => typeof v === 'number' && !isNaN(v));
  const scoresCount = scoreValues.length;
  const gpa = scoresCount > 0 ? Number((scoreValues.reduce((a, b) => a + b, 0) / scoresCount).toFixed(1)) : 0;

  const countGte9 = scoreValues.filter((s) => s >= 9.0).length;
  const countGte8 = scoreValues.filter((s) => s >= 8.0).length;
  const countGte65 = scoreValues.filter((s) => s >= 6.5).length;
  const countGte50 = scoreValues.filter((s) => s >= 5.0).length;
  const countLt50 = scoreValues.filter((s) => s < 5.0).length;
  const countLt35 = scoreValues.filter((s) => s < 3.5).length;

  const allGte65 = scoreValues.length > 0 && scoreValues.every((s) => s >= 6.5);
  const allGte50 = scoreValues.length > 0 && scoreValues.every((s) => s >= 5.0);
  const allGte35 = scoreValues.length > 0 && scoreValues.every((s) => s >= 3.5);

  const evalValues = Object.values(evaluated || defaultEvaluatedSubjects);
  const commentSubjectsFailCount = evalValues.filter((v) => v === 'Chưa đạt').length;
  const commentSubjectsAllPass = commentSubjectsFailCount === 0;

  let academicRank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' = 'Chưa đạt';
  let reason = '';

  // a) Mức Tốt
  if (commentSubjectsAllPass && allGte65 && countGte8 >= 6) {
    academicRank = 'Tốt';
    reason = `Đạt Mức Tốt: Tất cả môn nhận xét đều Đạt; tất cả ${scoresCount} môn điểm số ≥ 6.5 điểm, trong đó có ${countGte8} môn đạt ≥ 8.0 điểm.`;
  }
  // b) Mức Khá
  else if (commentSubjectsAllPass && allGte50 && countGte65 >= 6) {
    academicRank = 'Khá';
    reason = `Đạt Mức Khá: Tất cả môn nhận xét đều Đạt; tất cả ${scoresCount} môn điểm số ≥ 5.0 điểm, trong đó có ${countGte65} môn đạt ≥ 6.5 điểm.`;
  }
  // c) Mức Đạt
  else if (commentSubjectsFailCount <= 1 && countGte50 >= 6 && allGte35) {
    academicRank = 'Đạt';
    reason = `Đạt Mức Đạt: Có ${commentSubjectsFailCount} môn nhận xét chưa đạt (cho phép ≤ 1); có ${countGte50} môn điểm số ≥ 5.0 điểm và không có môn nào dưới 3.5 điểm.`;
  }
  // d) Mức Chưa đạt
  else {
    academicRank = 'Chưa đạt';
    const failures: string[] = [];
    if (commentSubjectsFailCount > 1) failures.push(`có ${commentSubjectsFailCount} môn nhận xét Chưa đạt`);
    if (countLt35 > 0) failures.push(`có ${countLt35} môn điểm số dưới 3.5`);
    if (countGte50 < 6) failures.push(`chỉ có ${countGte50}/6 môn điểm số đạt từ 5.0 trở lên`);
    reason = `Mức Chưa đạt: ${failures.join(', ') || 'Chưa thỏa mãn các tiêu chí Mức Đạt'}.`;
  }

  // Danh hiệu khen thưởng (Award Title)
  let awardTitle: 'Học sinh Xuất sắc' | 'Học sinh Giỏi' | '' = '';
  
  if (existingAward === 'Học sinh Xuất sắc' || existingAward === 'Học sinh Giỏi') {
    awardTitle = existingAward;
  } else if (academicRank === 'Tốt') {
    if (conductRank === 'Tốt' && countGte9 >= 6) {
      awardTitle = 'Học sinh Xuất sắc';
    } else {
      awardTitle = 'Học sinh Giỏi';
    }
  } else if (academicRank === 'Khá') {
    // Nếu học sinh học lực Khá và đã được chỉ định hoặc có điểm cao
    if (existingAward === 'Học sinh Xuất sắc') {
      awardTitle = 'Học sinh Xuất sắc';
    } else {
      awardTitle = '';
    }
  } else {
    awardTitle = '';
  }

  return {
    academicRank,
    awardTitle,
    gpa,
    scoresCount,
    countGte9,
    countGte8,
    countGte65,
    countGte50,
    countLt50,
    countLt35,
    allGte65,
    allGte50,
    allGte35,
    commentSubjectsAllPass,
    commentSubjectsFailCount,
    reason,
  };
}

/**
 * Tính toán kết quả Cả năm từ Học kỳ 1 và Học kỳ 2 theo Thông tư 22
 * - ĐTBmcn = (ĐTBmhk1 + 2 * ĐTBmhk2) / 3 (làm tròn 1 chữ số thập phân)
 * - Môn nhận xét cả năm: Đạt nếu HK2 đạt (Điều 9 TT22)
 * - Rèn luyện cả năm:
 *   + Tốt nếu HK2 Tốt và HK1 từ Khá trở lên
 *   + Khá nếu HK2 Tốt nhưng HK1 Đạt/Chưa đạt, hoặc HK2 Khá và HK1 từ Đạt trở lên
 *   + Đạt nếu HK2 Đạt và HK1 Đạt trở lên
 *   + Chưa đạt: các trường hợp còn lại
 */
export function computeYearFromSemesters(sem1: SemesterRecord, sem2: SemesterRecord): SemesterRecord {
  const yearSubjects: SubjectGrades = {
    math: Number(((sem1.subjects.math + 2 * sem2.subjects.math) / 3).toFixed(1)),
    literature: Number(((sem1.subjects.literature + 2 * sem2.subjects.literature) / 3).toFixed(1)),
    english: Number(((sem1.subjects.english + 2 * sem2.subjects.english) / 3).toFixed(1)),
    naturalScience: Number(((sem1.subjects.naturalScience + 2 * sem2.subjects.naturalScience) / 3).toFixed(1)),
    historyGeography: Number(((sem1.subjects.historyGeography + 2 * sem2.subjects.historyGeography) / 3).toFixed(1)),
    informatics: Number(((sem1.subjects.informatics + 2 * sem2.subjects.informatics) / 3).toFixed(1)),
    civics: Number(((sem1.subjects.civics + 2 * sem2.subjects.civics) / 3).toFixed(1)),
  };

  const yearEvaluated: EvaluatedSubjects = {
    physicalEducation: sem2.evaluatedSubjects.physicalEducation === 'Đạt' ? 'Đạt' : 'Chưa đạt',
    art: sem2.evaluatedSubjects.art === 'Đạt' ? 'Đạt' : 'Chưa đạt',
    experientialActivities: sem2.evaluatedSubjects.experientialActivities === 'Đạt' ? 'Đạt' : 'Chưa đạt',
    localEducation: sem2.evaluatedSubjects.localEducation === 'Đạt' ? 'Đạt' : 'Chưa đạt',
  };

  // Determine year conduct rank according to TT22 Article 8
  let yearConduct: ConductRankTT22 = 'Đạt';
  if (sem2.conductRank === 'Tốt') {
    if (sem1.conductRank === 'Tốt' || sem1.conductRank === 'Khá') {
      yearConduct = 'Tốt';
    } else {
      yearConduct = 'Khá';
    }
  } else if (sem2.conductRank === 'Khá') {
    if (sem1.conductRank === 'Tốt' || sem1.conductRank === 'Khá') {
      yearConduct = 'Khá';
    } else {
      yearConduct = 'Đạt';
    }
  } else if (sem2.conductRank === 'Đạt') {
    yearConduct = 'Đạt';
  } else {
    yearConduct = 'Chưa đạt';
  }

  const evalResult = evaluateStudentTT22(yearSubjects, yearEvaluated, yearConduct);

  return {
    subjects: yearSubjects,
    evaluatedSubjects: yearEvaluated,
    gpa: evalResult.gpa,
    academicRank: evalResult.academicRank,
    conductRank: yearConduct,
    awardTitle: evalResult.awardTitle,
    notes: `Tổng kết Cả năm: HK1 (${sem1.gpa.toFixed(1)} - ${sem1.academicRank}), HK2 (${sem2.gpa.toFixed(1)} - ${sem2.academicRank})`,
  };
}

/**
 * Lấy bản ghi học kỳ tương ứng của học sinh (hk1 | hk2 | caNam)
 */
export function getStudentSemesterRecord(student: Student, term: SemesterTerm): SemesterRecord {
  if (term === 'hk1') {
    if (student.semester1) return student.semester1;
  } else if (term === 'hk2') {
    if (student.semester2) return student.semester2;
  } else {
    if (student.yearOverall) return student.yearOverall;
  }

  // Fallback to base student attributes
  const subjects: SubjectGrades = student.subjects || {
    math: 8.0,
    literature: 8.0,
    english: 8.0,
    naturalScience: 8.0,
    historyGeography: 8.0,
    informatics: 8.0,
    civics: 8.0,
  };
  const evaluated = student.evaluatedSubjects || defaultEvaluatedSubjects;
  const evalRes = evaluateStudentTT22(subjects, evaluated, student.conductRank, student.awardTitle);

  return {
    subjects,
    evaluatedSubjects: evaluated,
    gpa: evalRes.gpa,
    academicRank: evalRes.academicRank,
    conductRank: student.conductRank || 'Tốt',
    awardTitle: student.awardTitle || evalRes.awardTitle,
    notes: student.notes,
  };
}

/**
 * Chuẩn hóa một đối tượng học sinh sang định dạng Thông tư 22 bao gồm HK1, HK2, Cả năm
 */
export function normalizeStudentTT22(student: Student): Student {
  const evaluated = student.evaluatedSubjects || defaultEvaluatedSubjects;
  const subjects: SubjectGrades = {
    math: typeof student.subjects?.math === 'number' ? student.subjects.math : 8.0,
    literature: typeof student.subjects?.literature === 'number' ? student.subjects.literature : 8.0,
    english: typeof student.subjects?.english === 'number' ? student.subjects.english : 8.0,
    naturalScience: typeof student.subjects?.naturalScience === 'number' ? student.subjects.naturalScience : 8.0,
    historyGeography: typeof student.subjects?.historyGeography === 'number' ? student.subjects.historyGeography : 8.0,
    informatics: typeof student.subjects?.informatics === 'number' ? student.subjects.informatics : 8.0,
    civics: typeof student.subjects?.civics === 'number' ? student.subjects.civics : 8.0,
  };

  // 1. Prepare Semester 1 record
  let sem1: SemesterRecord;
  if (student.semester1 && student.semester1.subjects) {
    const sem1Eval = evaluateStudentTT22(
      student.semester1.subjects,
      student.semester1.evaluatedSubjects || evaluated,
      student.semester1.conductRank || student.conductRank,
      student.semester1.awardTitle
    );
    sem1 = {
      ...student.semester1,
      gpa: sem1Eval.gpa,
      academicRank: sem1Eval.academicRank,
      awardTitle: student.semester1.awardTitle !== undefined ? student.semester1.awardTitle : sem1Eval.awardTitle,
      conductRank: student.semester1.conductRank || 'Tốt',
    };
  } else {
    const sem1Eval = evaluateStudentTT22(subjects, evaluated, student.conductRank, student.awardTitle);
    sem1 = {
      subjects: { ...subjects },
      evaluatedSubjects: { ...evaluated },
      gpa: sem1Eval.gpa,
      academicRank: sem1Eval.academicRank,
      conductRank: student.conductRank || 'Tốt',
      awardTitle: student.awardTitle || sem1Eval.awardTitle,
      notes: 'Bảng điểm Học kỳ 1',
    };
  }

  // 2. Prepare Semester 2 record
  let sem2: SemesterRecord;
  if (student.semester2 && student.semester2.subjects) {
    const sem2Eval = evaluateStudentTT22(
      student.semester2.subjects,
      student.semester2.evaluatedSubjects || evaluated,
      student.semester2.conductRank || student.conductRank,
      student.semester2.awardTitle
    );
    sem2 = {
      ...student.semester2,
      gpa: sem2Eval.gpa,
      academicRank: sem2Eval.academicRank,
      awardTitle: student.semester2.awardTitle !== undefined ? student.semester2.awardTitle : sem2Eval.awardTitle,
      conductRank: student.semester2.conductRank || 'Tốt',
    };
  } else {
    // Generate realistic HK2 from sem1 (slight variance ±0.3 capped between 0 and 10)
    const sem2Subjects: SubjectGrades = {
      math: Math.min(10, Math.max(0, Number((sem1.subjects.math + (Math.random() > 0.5 ? 0.2 : -0.1)).toFixed(1)))),
      literature: Math.min(10, Math.max(0, Number((sem1.subjects.literature + (Math.random() > 0.5 ? 0.3 : 0.0)).toFixed(1)))),
      english: Math.min(10, Math.max(0, Number((sem1.subjects.english + (Math.random() > 0.5 ? 0.2 : -0.2)).toFixed(1)))),
      naturalScience: Math.min(10, Math.max(0, Number((sem1.subjects.naturalScience + (Math.random() > 0.4 ? 0.2 : -0.1)).toFixed(1)))),
      historyGeography: Math.min(10, Math.max(0, Number((sem1.subjects.historyGeography + (Math.random() > 0.5 ? 0.1 : 0.0)).toFixed(1)))),
      informatics: Math.min(10, Math.max(0, Number((sem1.subjects.informatics + (Math.random() > 0.5 ? 0.2 : 0.0)).toFixed(1)))),
      civics: Math.min(10, Math.max(0, Number((sem1.subjects.civics + (Math.random() > 0.5 ? 0.1 : 0.0)).toFixed(1)))),
    };
    const sem2Eval = evaluateStudentTT22(sem2Subjects, evaluated, sem1.conductRank);
    sem2 = {
      subjects: sem2Subjects,
      evaluatedSubjects: { ...evaluated },
      gpa: sem2Eval.gpa,
      academicRank: sem2Eval.academicRank,
      conductRank: sem1.conductRank,
      awardTitle: sem2Eval.awardTitle,
      notes: 'Bảng điểm Học kỳ 2',
    };
  }

  // 3. Compute Whole Year record
  const yearRecord = student.yearOverall && student.yearOverall.subjects
    ? student.yearOverall
    : computeYearFromSemesters(sem1, sem2);

  return {
    ...student,
    academicRank: yearRecord.academicRank,
    awardTitle: student.awardTitle !== undefined ? student.awardTitle : yearRecord.awardTitle,
    gpa: yearRecord.gpa,
    conductRank: yearRecord.conductRank,
    subjects: yearRecord.subjects,
    evaluatedSubjects: yearRecord.evaluatedSubjects,
    semester1: sem1,
    semester2: sem2,
    yearOverall: yearRecord,
  };
}
