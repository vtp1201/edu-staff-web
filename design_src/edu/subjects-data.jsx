// ── Subject Master Editor (ADMIN · /admin/subjects) — Data & Helpers ─────────
// Route:   /admin/subjects
// Role:    ADMIN (US-048 · US-056 · ADR 0036)
// Model:   SubjectParent (bộ môn) ─┬─ Subject (grade-scoped master)
//          Each grade-scoped Subject carries the locked master fields:
//          masterSyllabus / periodCount / outcomeTargets / requiredAssessmentCount
//          / exerciseBankRef / examBankRef — these flow down to ClassSubject and
//          cannot be overridden at the class level.
// APIs:    POST/GET/PATCH  /api/v1/core/subjects
//          POST            /api/v1/core/subjects/:id/archive
//          (SubjectParent APIs from US-056 — see subject-parents.jsx)

const SM_CONCEPT_LABELS = {
  BO_MON: { vi: 'Bộ môn', en: 'Department' },
  TO:     { vi: 'Tổ',     en: 'Team' },
  KHOA:   { vi: 'Khoa',   en: 'Faculty' },
};

// Tenant GradeLevelRange. In production this comes from
// GET /api/v1/core/config/school. For the demo we hardcode the high-school case.
const SM_TENANT_GRADE_RANGE = { minGrade: 10, maxGrade: 12 };

// Mock ClassSubject offerings, keyed by subjectId. In production these come from
// GET /api/v1/core/class-subjects?subjectId=X.
const SM_SEED_CLASS_OFFERINGS = {
  'sub-math-10': [
    { id: 'cs-1', className: 'Lớp 10A1', academicYear: '2025–2026', teacherName: 'Nguyễn Thị Hương', studentCount: 42 },
    { id: 'cs-2', className: 'Lớp 10A2', academicYear: '2025–2026', teacherName: 'Trần Văn Bình',    studentCount: 41 },
    { id: 'cs-3', className: 'Lớp 10A3', academicYear: '2025–2026', teacherName: 'Lê Thị Mai',       studentCount: 40 },
    { id: 'cs-4', className: 'Lớp 10A4', academicYear: '2025–2026', teacherName: 'Phạm Quang Huy',   studentCount: 39 },
  ],
  'sub-math-11': [
    { id: 'cs-5', className: 'Lớp 11A1', academicYear: '2025–2026', teacherName: 'Nguyễn Thị Hương', studentCount: 40 },
    { id: 'cs-6', className: 'Lớp 11A2', academicYear: '2025–2026', teacherName: 'Hoàng Minh Tuấn',  studentCount: 41 },
    { id: 'cs-7', className: 'Lớp 11A3', academicYear: '2025–2026', teacherName: 'Lê Thị Mai',       studentCount: 38 },
  ],
  'sub-math-12': [], // not in use yet
  'sub-lit-10':  [
    { id: 'cs-l1', className: 'Lớp 10A1', academicYear: '2025–2026', teacherName: 'Đỗ Thị Lan', studentCount: 42 },
    { id: 'cs-l2', className: 'Lớp 10A2', academicYear: '2025–2026', teacherName: 'Đỗ Thị Lan', studentCount: 41 },
  ],
  'sub-lit-11':  [
    { id: 'cs-l3', className: 'Lớp 11A1', academicYear: '2025–2026', teacherName: 'Vũ Thanh Hà', studentCount: 40 },
  ],
  'sub-eng-10':  [
    { id: 'cs-e1', className: 'Lớp 10A1', academicYear: '2025–2026', teacherName: 'Nguyễn Hoàng Anh', studentCount: 42 },
    { id: 'cs-e2', className: 'Lớp 10A2', academicYear: '2025–2026', teacherName: 'Nguyễn Hoàng Anh', studentCount: 41 },
  ],
  'sub-eng-11':  [
    { id: 'cs-e3', className: 'Lớp 11A1', academicYear: '2025–2026', teacherName: 'Phan Thu Trang', studentCount: 40 },
  ],
  'sub-eng-12':  [],
};

const SM_SEED_PARENTS = [
  {
    id: 'sp-math', name: 'Bộ môn Toán', conceptType: 'BO_MON', conceptLabelCustom: null, status: 'ACTIVE',
    subjects: [
      { id: 'sub-math-10', name: 'Toán lớp 10', code: 'MATH10', gradeLevel: 10, status: 'ACTIVE', inUse: true,
        periodCount: 105, requiredAssessmentCount: 4,
        outcomeTargets: 'Học sinh nắm vững mệnh đề, tập hợp, hàm số bậc nhất – bậc hai, hệ phương trình, hình học phẳng.',
        masterSyllabus: 'https://drive.school/syllabus/math10.pdf',
        exerciseBankRef: 'https://lib.school/exercises/math10', examBankRef: 'https://lib.school/exams/math10' },
      { id: 'sub-math-11', name: 'Toán lớp 11', code: 'MATH11', gradeLevel: 11, status: 'ACTIVE', inUse: true,
        periodCount: 105, requiredAssessmentCount: 4,
        outcomeTargets: 'Lượng giác, dãy số, giới hạn, đạo hàm và hình học không gian.',
        masterSyllabus: 'https://drive.school/syllabus/math11.pdf',
        exerciseBankRef: 'https://lib.school/exercises/math11', examBankRef: 'https://lib.school/exams/math11' },
      { id: 'sub-math-12', name: 'Toán lớp 12', code: 'MATH12', gradeLevel: 12, status: 'ACTIVE', inUse: false,
        periodCount: 105, requiredAssessmentCount: 5,
        outcomeTargets: 'Ứng dụng đạo hàm, nguyên hàm – tích phân, số phức, khối đa diện, mặt cầu.',
        masterSyllabus: '', exerciseBankRef: '', examBankRef: '' },
    ],
  },
  {
    id: 'sp-lit', name: 'Bộ môn Ngữ văn', conceptType: 'BO_MON', conceptLabelCustom: null, status: 'ACTIVE',
    subjects: [
      { id: 'sub-lit-10', name: 'Ngữ văn lớp 10', code: 'LIT10', gradeLevel: 10, status: 'ACTIVE', inUse: true,
        periodCount: 105, requiredAssessmentCount: 3,
        outcomeTargets: 'Đọc hiểu văn bản văn học, viết bài nghị luận xã hội và văn học.',
        masterSyllabus: '', exerciseBankRef: '', examBankRef: '' },
      { id: 'sub-lit-11', name: 'Ngữ văn lớp 11', code: 'LIT11', gradeLevel: 11, status: 'ACTIVE', inUse: true,
        periodCount: 105, requiredAssessmentCount: 3,
        outcomeTargets: '', masterSyllabus: '', exerciseBankRef: '', examBankRef: '' },
    ],
  },
  {
    id: 'sp-foreign', name: 'Tổ Ngoại ngữ', conceptType: 'TO', conceptLabelCustom: null, status: 'ACTIVE',
    subjects: [
      { id: 'sub-eng-10', name: 'Tiếng Anh lớp 10', code: 'ENG10', gradeLevel: 10, status: 'ACTIVE', inUse: true,
        periodCount: 70, requiredAssessmentCount: 4,
        outcomeTargets: '', masterSyllabus: '', exerciseBankRef: '', examBankRef: '' },
      { id: 'sub-eng-11', name: 'Tiếng Anh lớp 11', code: 'ENG11', gradeLevel: 11, status: 'ACTIVE', inUse: true,
        periodCount: 70, requiredAssessmentCount: 4,
        outcomeTargets: '', masterSyllabus: '', exerciseBankRef: '', examBankRef: '' },
      { id: 'sub-eng-12', name: 'Tiếng Anh lớp 12', code: 'ENG12', gradeLevel: 12, status: 'ARCHIVED', inUse: false,
        periodCount: 70, requiredAssessmentCount: 4,
        outcomeTargets: '', masterSyllabus: '', exerciseBankRef: '', examBankRef: '' },
    ],
  },
  {
    id: 'sp-science', name: 'Khoa Khoa học Tự nhiên', conceptType: 'KHOA', conceptLabelCustom: null, status: 'ACTIVE',
    subjects: [],
  },
];

const smNewId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const smConceptStyle = (parent, pColor) => {
  if (parent.conceptLabelCustom) return { fg: T.purple, bg: T.purpleLight, label: parent.conceptLabelCustom };
  if (!parent.conceptType) return null;
  const map = {
    BO_MON: { fg: pColor, bg: pColor + '18' },
    TO:     { fg: T.warning, bg: T.warningLight },
    KHOA:   { fg: T.teal, bg: T.tealLight },
  }[parent.conceptType];
  return map ? { ...map, label: SM_CONCEPT_LABELS[parent.conceptType] } : null;
};

Object.assign(window, { SM_CONCEPT_LABELS, SM_TENANT_GRADE_RANGE, SM_SEED_PARENTS, SM_SEED_CLASS_OFFERINGS, smNewId, smConceptStyle });
