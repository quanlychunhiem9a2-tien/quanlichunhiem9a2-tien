import {
  Student,
  EvaluatedSubjects,
  AcademicRankTT22,
  AwardTitleTT22,
  SemesterRecord,
  SemesterTerm,
  SubjectGrades,
  ConductRankTT22,
} from '../types';

export interface TT22EvaluationResult {
  academicRank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa đủ môn' | 'Chưa đánh giá' | '';
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
 */
export function evaluateStudentTT22(
  subjects: SubjectGrades | Record<string, number | undefined> = {},
  evaluated: EvaluatedSubjects = defaultEvaluatedSubjects,
  conductRank: string = '',
  existingAward?: string
): TT22EvaluationResult {
  const scoreValues = Object.values(subjects).filter(
    (v): v is number => typeof v === 'number' && !isNaN(v)
  );
  const scoresCount = scoreValues.length;
  const gpa =
    scoresCount > 0
      ? Number((scoreValues.reduce((a, b) => a + b, 0) / scoresCount).toFixed(1))
      : 0;

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

  // IF NO SCORES ENTERED:
  if (scoresCount === 0) {
    return {
      academicRank: '',
      awardTitle: '',
      gpa: 0,
      scoresCount: 0,
      countGte9: 0,
      countGte8: 0,
      countGte65: 0,
      countGte50: 0,
      countLt50: 0,
      countLt35: 0,
      allGte65: false,
      allGte50: false,
      allGte35: false,
      commentSubjectsAllPass: false,
      commentSubjectsFailCount: 0,
      reason: 'Chưa có kết quả học tập (chưa nhập điểm)',
    };
  }

  // IF INCOMPLETE (FEWER THAN 6 SCORED SUBJECTS):
  if (scoresCount < 6) {
    return {
      academicRank: 'Chưa đủ môn',
      awardTitle: '',
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
      reason: `Chưa đủ môn để xếp loại theo TT22 (mới có ${scoresCount}/7 môn, cần tối thiểu 6 môn)`,
    };
  }

  let academicRank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa đủ môn' | 'Chưa đánh giá' | '' =
    'Chưa đạt';
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
    if (commentSubjectsFailCount > 1)
      failures.push(`có ${commentSubjectsFailCount} môn nhận xét Chưa đạt`);
    if (countLt35 > 0) failures.push(`có ${countLt35} môn điểm số dưới 3.5`);
    if (countGte50 < 6)
      failures.push(`chỉ có ${countGte50}/6 môn điểm số đạt từ 5.0 trở lên`);
    reason = `Mức Chưa đạt: ${failures.join(', ') || 'Chưa thỏa mãn các tiêu chí Mức Đạt'}.`;
  }

  // Danh hiệu khen thưởng (Award Title)
  let awardTitle: 'Học sinh Xuất sắc' | 'Học sinh Giỏi' | '' = '';

  if (existingAward === 'Học sinh Xuất sắc' || existingAward === 'Học sinh Giỏi') {
    awardTitle = existingAward;
  } else if (academicRank === 'Tốt') {
    if ((conductRank === 'Tốt' || !conductRank) && countGte9 >= 6) {
      awardTitle = 'Học sinh Xuất sắc';
    } else {
      awardTitle = 'Học sinh Giỏi';
    }
  } else if (academicRank === 'Khá') {
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
 */
export function computeYearFromSemesters(
  sem1?: SemesterRecord,
  sem2?: SemesterRecord
): SemesterRecord {
  const hasSem1 =
    sem1 &&
    sem1.subjects &&
    Object.values(sem1.subjects).some((v) => typeof v === 'number' && !isNaN(v));
  const hasSem2 =
    sem2 &&
    sem2.subjects &&
    Object.values(sem2.subjects).some((v) => typeof v === 'number' && !isNaN(v));

  if (!hasSem1 || !hasSem2) {
    return {
      subjects: {},
      evaluatedSubjects: {},
      gpa: 0,
      academicRank: '',
      conductRank: '',
      conductEvaluated: false,
      awardTitle: '',
      notes: 'Chưa đủ điểm HK1 và HK2 để tổng kết Cả năm',
    };
  }

  const s1 = sem1!.subjects;
  const s2 = sem2!.subjects;
  const yearSubjects: SubjectGrades = {};
  const standardSubjects = [
    'math',
    'literature',
    'english',
    'naturalScience',
    'historyGeography',
    'informatics',
    'civics',
  ];
  for (const k of standardSubjects) {
    const v1 = s1[k];
    const v2 = s2[k];
    if (typeof v1 === 'number' && typeof v2 === 'number') {
      yearSubjects[k] = Number(((v1 + 2 * v2) / 3).toFixed(1));
    }
  }

  const yearEvaluated: EvaluatedSubjects = {
    physicalEducation:
      sem2?.evaluatedSubjects?.physicalEducation === 'Đạt' ? 'Đạt' : 'Chưa đạt',
    art: sem2?.evaluatedSubjects?.art === 'Đạt' ? 'Đạt' : 'Chưa đạt',
    experientialActivities:
      sem2?.evaluatedSubjects?.experientialActivities === 'Đạt' ? 'Đạt' : 'Chưa đạt',
    localEducation:
      sem2?.evaluatedSubjects?.localEducation === 'Đạt' ? 'Đạt' : 'Chưa đạt',
  };

  let yearConduct: ConductRankTT22 = '';
  if (sem1?.conductRank && sem2?.conductRank) {
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
  } else {
    yearConduct = sem2?.conductRank || sem1?.conductRank || '';
  }

  const evalResult = evaluateStudentTT22(yearSubjects, yearEvaluated, yearConduct);

  return {
    subjects: yearSubjects,
    evaluatedSubjects: yearEvaluated,
    gpa: evalResult.gpa,
    academicRank: evalResult.academicRank,
    conductRank: yearConduct,
    conductEvaluated: Boolean(yearConduct),
    awardTitle: evalResult.awardTitle,
    notes: `Tổng kết Cả năm: HK1 (${sem1!.gpa.toFixed(1)} - ${sem1!.academicRank || '-'}), HK2 (${sem2!.gpa.toFixed(1)} - ${sem2!.academicRank || '-'})`,
  };
}

/**
 * Lấy bản ghi học kỳ tương ứng của học sinh (hk1 | hk2 | caNam)
 */
export function getStudentSemesterRecord(student: Student, term: SemesterTerm): SemesterRecord {
  const hasTeacherConduct = Boolean(student.conductEvaluated && student.conductRank);

  if (term === 'hk1') {
    if (student.semester1) {
      const hasSem1Scores = Object.values(student.semester1.subjects || {}).some(
        (v) => typeof v === 'number' && !isNaN(v)
      );
      const isSem1ConductEval = Boolean(
        student.semester1.conductEvaluated || hasSem1Scores || hasTeacherConduct
      );
      return {
        ...student.semester1,
        conductRank: isSem1ConductEval ? student.semester1.conductRank || student.conductRank || '' : '',
        conductEvaluated: isSem1ConductEval,
      };
    }
  } else if (term === 'hk2') {
    if (student.semester2) {
      const hasSem2Scores = Object.values(student.semester2.subjects || {}).some(
        (v) => typeof v === 'number' && !isNaN(v)
      );
      const isSem2ConductEval = Boolean(student.semester2.conductEvaluated || hasSem2Scores);
      return {
        ...student.semester2,
        conductRank: isSem2ConductEval ? student.semester2.conductRank || '' : '',
        conductEvaluated: isSem2ConductEval,
      };
    }
    return {
      subjects: {},
      evaluatedSubjects: {},
      gpa: 0,
      academicRank: '',
      conductRank: '',
      conductEvaluated: false,
      awardTitle: '',
      notes: 'Chưa có kết quả Học kỳ 2',
    };
  } else {
    if (student.yearOverall) {
      const hasYearScores = Object.values(student.yearOverall.subjects || {}).some(
        (v) => typeof v === 'number' && !isNaN(v)
      );
      const isYearConductEval = Boolean(
        student.yearOverall.conductEvaluated || hasYearScores || hasTeacherConduct
      );
      return {
        ...student.yearOverall,
        conductRank: isYearConductEval ? student.yearOverall.conductRank || student.conductRank || '' : '',
        conductEvaluated: isYearConductEval,
      };
    }
    return {
      subjects: {},
      evaluatedSubjects: {},
      gpa: 0,
      academicRank: '',
      conductRank: hasTeacherConduct ? student.conductRank : '',
      conductEvaluated: hasTeacherConduct,
      awardTitle: '',
      notes: 'Chưa có kết quả Cả năm',
    };
  }

  // Fallback to base student attributes if scores exist
  const hasScores =
    student.subjects &&
    Object.values(student.subjects).some((v) => typeof v === 'number' && !isNaN(v));
  if (hasScores) {
    const evaluated = student.evaluatedSubjects || defaultEvaluatedSubjects;
    const evalRes = evaluateStudentTT22(
      student.subjects!,
      evaluated,
      student.conductRank,
      student.awardTitle
    );
    return {
      subjects: { ...student.subjects! },
      evaluatedSubjects: { ...evaluated },
      gpa: evalRes.gpa,
      academicRank: evalRes.academicRank,
      conductRank: student.conductRank || 'Tốt',
      conductEvaluated: true,
      awardTitle: student.awardTitle || evalRes.awardTitle,
      notes: student.notes,
    };
  }

  return {
    subjects: {},
    evaluatedSubjects: {},
    gpa: 0,
    academicRank: '',
    conductRank: hasTeacherConduct ? student.conductRank : '',
    conductEvaluated: hasTeacherConduct,
    awardTitle: '',
    notes: 'Chưa có kết quả học tập',
  };
}

/**
 * Chuẩn hóa một đối tượng học sinh sang định dạng Thông tư 22 bao gồm HK1, HK2, Cả năm.
 * Nếu chưa có dữ liệu xếp loại của giáo viên thì để trống phần Rèn luyện ('').
 */
export function normalizeStudentTT22(student: Student): Student {
  const hasBaseScores =
    student.subjects &&
    Object.values(student.subjects).some((v) => typeof v === 'number' && !isNaN(v));
  const hasExplicitTeacherConduct = Boolean(student.conductEvaluated && student.conductRank);

  // 1. Prepare Semester 1 record
  let sem1: SemesterRecord;
  if (
    student.semester1 &&
    student.semester1.subjects &&
    Object.values(student.semester1.subjects).some((v) => typeof v === 'number' && !isNaN(v))
  ) {
    const sem1Conduct = student.semester1.conductRank || student.conductRank || 'Tốt';
    const sem1Eval = evaluateStudentTT22(
      student.semester1.subjects,
      student.semester1.evaluatedSubjects || {},
      sem1Conduct,
      student.semester1.awardTitle
    );
    sem1 = {
      ...student.semester1,
      gpa: sem1Eval.gpa,
      academicRank: sem1Eval.academicRank,
      awardTitle:
        student.semester1.awardTitle !== undefined
          ? student.semester1.awardTitle
          : sem1Eval.awardTitle,
      conductRank: sem1Conduct,
      conductEvaluated: true,
    };
  } else if (hasBaseScores) {
    const evaluated = student.evaluatedSubjects || defaultEvaluatedSubjects;
    const baseConduct = student.conductRank || 'Tốt';
    const sem1Eval = evaluateStudentTT22(
      student.subjects!,
      evaluated,
      baseConduct,
      student.awardTitle
    );
    sem1 = {
      subjects: { ...student.subjects! },
      evaluatedSubjects: { ...evaluated },
      gpa: sem1Eval.gpa,
      academicRank: sem1Eval.academicRank,
      conductRank: baseConduct,
      conductEvaluated: true,
      awardTitle: student.awardTitle || sem1Eval.awardTitle,
      notes: 'Bảng điểm Học kỳ 1',
    };
  } else {
    const sem1HasExplicitConduct = Boolean(
      student.semester1?.conductEvaluated && student.semester1?.conductRank
    );
    const resolvedConduct: ConductRankTT22 = sem1HasExplicitConduct
      ? student.semester1!.conductRank
      : hasExplicitTeacherConduct
      ? student.conductRank
      : '';
    sem1 = {
      subjects: {},
      evaluatedSubjects: {},
      gpa: 0,
      academicRank: '',
      conductRank: resolvedConduct,
      conductEvaluated: Boolean(resolvedConduct),
      awardTitle: '',
      notes: 'Chưa có điểm Học kỳ 1',
    };
  }

  // 2. Prepare Semester 2 record
  let sem2: SemesterRecord | undefined = undefined;
  if (
    student.semester2 &&
    student.semester2.subjects &&
    Object.values(student.semester2.subjects).some((v) => typeof v === 'number' && !isNaN(v))
  ) {
    const sem2Conduct = student.semester2.conductRank || student.conductRank || 'Tốt';
    const sem2Eval = evaluateStudentTT22(
      student.semester2.subjects,
      student.semester2.evaluatedSubjects || {},
      sem2Conduct,
      student.semester2.awardTitle
    );
    sem2 = {
      ...student.semester2,
      gpa: sem2Eval.gpa,
      academicRank: sem2Eval.academicRank,
      awardTitle:
        student.semester2.awardTitle !== undefined
          ? student.semester2.awardTitle
          : sem2Eval.awardTitle,
      conductRank: sem2Conduct,
      conductEvaluated: true,
    };
  } else if (student.semester2?.conductEvaluated && student.semester2?.conductRank) {
    sem2 = {
      ...student.semester2,
      conductEvaluated: true,
    };
  }

  // 3. Compute Whole Year record only if both HK1 and HK2 have scores
  let yearRecord: SemesterRecord | undefined = undefined;
  const hasSem1Scores = Object.values(sem1.subjects).some(
    (v) => typeof v === 'number' && !isNaN(v)
  );
  const hasSem2Scores =
    sem2 && Object.values(sem2.subjects).some((v) => typeof v === 'number' && !isNaN(v));

  if (
    student.yearOverall &&
    student.yearOverall.subjects &&
    Object.values(student.yearOverall.subjects).some((v) => typeof v === 'number' && !isNaN(v))
  ) {
    yearRecord = {
      ...student.yearOverall,
      conductEvaluated: true,
    };
  } else if (hasSem1Scores && hasSem2Scores) {
    yearRecord = computeYearFromSemesters(sem1, sem2);
  }

  const activeOverall = yearRecord || (hasSem1Scores ? sem1 : undefined);
  const finalConduct: ConductRankTT22 = activeOverall
    ? activeOverall.conductRank
    : hasExplicitTeacherConduct
    ? student.conductRank
    : sem1.conductEvaluated
    ? sem1.conductRank
    : '';

  return {
    ...student,
    academicRank: activeOverall ? activeOverall.academicRank : student.academicRank || '',
    awardTitle: activeOverall
      ? student.awardTitle !== undefined
        ? student.awardTitle
        : activeOverall.awardTitle
      : student.awardTitle || '',
    gpa: activeOverall ? activeOverall.gpa : student.gpa || 0,
    conductRank: finalConduct,
    conductEvaluated: Boolean(finalConduct),
    subjects: activeOverall ? activeOverall.subjects : {},
    evaluatedSubjects: activeOverall ? activeOverall.evaluatedSubjects : {},
    semester1: sem1,
    semester2: sem2,
    yearOverall: yearRecord,
  };
}
