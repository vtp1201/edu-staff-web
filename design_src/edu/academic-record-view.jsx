// ── Student Academic Record (Học Bạ) ─────────────────────────────────────────
// Routes:
//   /teacher/students/:studentId/academic-record  (own students)
//   /admin/students/:studentId/academic-record    (all students)
//   /student/academic-record                      (self, no studentId param)
//   /parent/children/:studentId/academic-record   (linked child)
// Epic:   US-064 (học bạ seal view)
//
// Authorization (enforced server-side; the UI mirrors the contract):
//   STUDENT — backend resolves studentId from JWT; the frontend never accepts
//             an arbitrary studentId from a STUDENT session.
//   PARENT  — studentId in URL validated via LinkReader; parent must have an
//             active ParentStudentLink.
//   TEACHER — restricted to students in classes the teacher is assigned to.
//   ADMIN   — unrestricted; only role with the "Yêu cầu mở học bạ" affordance.

// ── Static lookups ───────────────────────────────────────────────────────────

const SAR_YEAR_LIST = [
  { id: '2023-2024', label: '2023 — 2024', classId: '9A1',  grade: 9 },
  { id: '2024-2025', label: '2024 — 2025', classId: '10A2', grade: 10 },
  { id: '2025-2026', label: '2025 — 2026', classId: '11A2', grade: 11, current: true },
];

const SAR_SUBJECT_CATALOG = [
  { id: 'math', vi: 'Toán',       en: 'Mathematics' },
  { id: 'lit',  vi: 'Ngữ Văn',    en: 'Literature' },
  { id: 'eng',  vi: 'Tiếng Anh',  en: 'English' },
  { id: 'phy',  vi: 'Vật Lý',     en: 'Physics' },
  { id: 'chem', vi: 'Hoá Học',    en: 'Chemistry' },
  { id: 'his',  vi: 'Lịch Sử',    en: 'History' },
];

// Assessment scheme used at seal time. Frozen with the record — newer schemes
// don't retroactively change a sealed transcript.
const SAR_COLUMNS = [
  { id: 'tx1', vi: 'TX1',     en: 'TX1',     columnType: 'TX', coefficient: 1 },
  { id: 'tx2', vi: 'TX2',     en: 'TX2',     columnType: 'TX', coefficient: 1 },
  { id: 'gk',  vi: 'Giữa kỳ', en: 'Midterm', columnType: 'GK', coefficient: 2 },
  { id: 'ck',  vi: 'Cuối kỳ', en: 'Final',   columnType: 'CK', coefficient: 3 },
];

const SAR_TERMS = [
  { id: 'HK1', vi: 'Học kỳ 1', en: 'Term 1' },
  { id: 'HK2', vi: 'Học kỳ 2', en: 'Term 2' },
];

const SAR_RECORD_STATUS_META = {
  PENDING:  { vi: 'Chưa ký', en: 'Not signed', color: T.textMuted, bg: T.bg,           icon: 'clock' },
  SEALED:   { vi: 'Đã ký',   en: 'Sealed',     color: T.success,   bg: T.successLight, icon: 'check' },
  UNSEALED: { vi: 'Đã mở',   en: 'Unsealed',   color: T.warning,   bg: T.warningLight, icon: 'unlock' },
};

const SAR_YEAR_BADGE_META = {
  all_sealed:  { vi: 'Đã ký đủ',     en: 'All sealed',     color: T.success,   icon: 'check' },
  partial:     { vi: 'Ký một phần',  en: 'Partial',        color: T.warning,   icon: 'clock' },
  none:        { vi: 'Chưa có học bạ', en: 'No record yet',  color: T.textMuted, icon: 'clock' },
  unsealed_in_year: { vi: 'Có học bạ đã mở', en: 'Has unsealed', color: T.warning, icon: 'unlock' },
};

// ── Student + records mock ───────────────────────────────────────────────────

const SAR_STUDENT = {
  id: 'std-001',
  name: 'Nguyễn Minh Khoa',
  nameEn: 'Nguyen Minh Khoa',
  avatar: 'NK',
  dob: '15/04/2009',
  currentClassId: '11A2',
  currentSchoolYear: '2025-2026',
  studentCode: 'NDU-2009-0184',
};

// One record = one term snapshot. Subject cells use the same 4-column scheme
// frozen at seal time. `cells` is positional with SAR_COLUMNS.
const SAR_RECORDS = {
  '2023-2024': {
    HK1: {
      status: 'SEALED', sealedAt: '15/01/2024', sealedBy: 'Nguyễn Văn Phúc',
      classId: '9A1', conductVi: 'Tốt', conductEn: 'Good',
      subjects: [
        { id: 'math', cells: [8, 9,    8,    9] },
        { id: 'lit',  cells: [7, 8,    7.5,  8] },
        { id: 'eng',  cells: [9, 8,    9,    9] },
        { id: 'phy',  cells: [8, 8,    9,    8.5] },
        { id: 'chem', cells: [7, 8,    8,    8] },
        { id: 'his',  cells: [9, 8,    9,    8.5] },
      ],
    },
    HK2: {
      status: 'SEALED', sealedAt: '02/06/2024', sealedBy: 'Nguyễn Văn Phúc',
      classId: '9A1', conductVi: 'Tốt', conductEn: 'Good',
      subjects: [
        { id: 'math', cells: [9, 9,    8.5,  9.5] },
        { id: 'lit',  cells: [8, 7,    8,    8.5] },
        { id: 'eng',  cells: [9, 9,    9,    9.5] },
        { id: 'phy',  cells: [8, 9,    9,    9] },
        { id: 'chem', cells: [8, 8,    8.5,  8.5] },
        { id: 'his',  cells: [8, 9,    9,    9] },
      ],
    },
  },
  '2024-2025': {
    HK1: {
      status: 'SEALED', sealedAt: '18/01/2025', sealedBy: 'Trần Minh Quân',
      classId: '10A2', conductVi: 'Tốt', conductEn: 'Good',
      subjects: [
        { id: 'math', cells: [8, 7,    7.5,  8] },
        { id: 'lit',  cells: [7, 7,    7.5,  7] },
        { id: 'eng',  cells: [9, 8,    8.5,  9] },
        { id: 'phy',  cells: [7, 8,    7,    7.5] },
        { id: 'chem', cells: [8, 8,    8,    8] },
        { id: 'his',  cells: [8, 8,    8,    7.5] },
      ],
    },
    HK2: {
      status: 'UNSEALED',
      sealedAt: '08/06/2025', sealedBy: 'Trần Minh Quân',
      unsealedAt: '12/07/2025',
      unsealReasonVi: 'Điều chỉnh điểm Lịch Sử cuối kỳ theo công văn 142/SGD ngày 04/07/2025. Điểm đang được cập nhật.',
      unsealReasonEn: 'Adjusting History final per directive 142/SGD dated 04/07/2025. Grades being updated.',
      classId: '10A2', conductVi: 'Tốt', conductEn: 'Good',
      subjects: [
        { id: 'math', cells: [9, 8,    9,    9] },
        { id: 'lit',  cells: [8, 8,    8,    8] },
        { id: 'eng',  cells: [9, 9,    9,    9] },
        { id: 'phy',  cells: [8, 9,    8.5,  9] },
        { id: 'chem', cells: [8, 8,    8,    8.5] },
        { id: 'his',  cells: [7, 7,    7,    null] }, // CK pending adjustment
      ],
    },
  },
  '2025-2026': {
    HK1: {
      status: 'SEALED', sealedAt: '22/01/2026', sealedBy: 'Trần Minh Quân',
      classId: '11A2', conductVi: 'Tốt', conductEn: 'Good',
      subjects: [
        { id: 'math', cells: [9, 8,    8.5,  9] },
        { id: 'lit',  cells: [8, 8,    8,    8.5] },
        { id: 'eng',  cells: [9, 9,    9,    9] },
        { id: 'phy',  cells: [8, 9,    9,    9] },
        { id: 'chem', cells: [8, 8,    8.5,  9] },
        { id: 'his',  cells: [8, 8,    8,    8] },
      ],
    },
    HK2: { status: 'PENDING' },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const sarSubjectName = (id, lang) => {
  const s = SAR_SUBJECT_CATALOG.find(x => x.id === id);
  return s ? (lang === 'en' ? s.en : s.vi) : id;
};

const sarTermName = (id, lang) => {
  const o = SAR_TERMS.find(x => x.id === id);
  return o ? (lang === 'en' ? o.en : o.vi) : id;
};

const sarScoreColor = (v) =>
  v == null ? T.textMuted : v < 5 ? T.error : v >= 8 ? T.success : T.textPrimary;

const sarSubjectAvg = (cells) => {
  let num = 0, den = 0;
  cells.forEach((v, i) => {
    if (v != null) { num += v * SAR_COLUMNS[i].coefficient; den += SAR_COLUMNS[i].coefficient; }
  });
  return den ? num / den : null;
};

const sarRecordGPA = (record) => {
  if (!record.subjects) return null;
  const avgs = record.subjects.map(s => sarSubjectAvg(s.cells)).filter(v => v != null);
  return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
};

const sarRank = (avg, t, pColor) =>
  avg == null ? null :
  avg >= 8.5 ? { vi: 'Giỏi', en: 'Excellent', color: T.success } :
  avg >= 7   ? { vi: 'Khá',  en: 'Good',      color: pColor } :
  avg >= 5   ? { vi: 'TB',   en: 'Average',   color: T.warning } :
               { vi: 'Yếu',  en: 'Poor',      color: T.error };

const sarYearStatus = (year) => {
  const data = SAR_RECORDS[year.id];
  if (!data) return 'none';
  const statuses = SAR_TERMS.map(t => (data[t.id] || {}).status || 'PENDING');
  if (statuses.every(s => s === 'PENDING')) return 'none';
  if (statuses.includes('UNSEALED'))        return 'unsealed_in_year';
  if (statuses.every(s => s === 'SEALED'))  return 'all_sealed';
  return 'partial';
};

// Map app-level roles → access role for this view.
const sarResolveRole = (role) => {
  if (role === 'principal') return 'ADMIN';
  if (role === 'teacher')   return 'TEACHER';
  if (role === 'student')   return 'STUDENT';
  if (role === 'parent')    return 'PARENT';
  return 'STUDENT';
};

const SAR_ROLE_META = {
  ADMIN:   { vi: 'ADMIN',   en: 'ADMIN',   color: T.error,   tagVi: 'Toàn quyền xem & yêu cầu mở học bạ',     tagEn: 'Full read + unseal request' },
  TEACHER: { vi: 'TEACHER', en: 'TEACHER', color: T.primary, tagVi: 'Xem học bạ học sinh trong lớp được phân công', tagEn: 'Read for assigned students' },
  STUDENT: { vi: 'STUDENT', en: 'STUDENT', color: T.success, tagVi: 'Xem học bạ của chính mình',               tagEn: 'Read own record only' },
  PARENT:  { vi: 'PARENT',  en: 'PARENT',  color: T.purple,  tagVi: 'Xem học bạ con (đã liên kết)',            tagEn: 'Read linked child only' },
};

// ── Main screen ──────────────────────────────────────────────────────────────

const AcademicRecordViewScreen = ({ role, lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;
  const accessRole = sarResolveRole(role);
  const isAdmin = accessRole === 'ADMIN';

  const student = SAR_STUDENT;
  const [activeYear, setActiveYear] = React.useState(
    SAR_YEAR_LIST.find(y => y.current)?.id || SAR_YEAR_LIST[SAR_YEAR_LIST.length - 1].id
  );

  const [unsealTarget, setUnsealTarget] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2600);
  };

  const yearData = SAR_RECORDS[activeYear] || {};

  const handlePrint = () => {
    // Toggle a body class so the print stylesheet hides app chrome.
    document.body.classList.add('sar-printing');
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => document.body.classList.remove('sar-printing'), 400);
    }, 50);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}
         className="sar-root">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div className="sar-screen-only" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, color: T.textMuted, marginBottom: 12,
        }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
            <Icon name="home" size={12} color="currentColor" />
            {t('Trang chủ', 'Home')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          {accessRole === 'TEACHER' && (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('students'); }}
                style={{ color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
                {t('Học sinh', 'Students')}
              </a>
              <Icon name="chevronRight" size={11} color={T.textMuted} />
            </>
          )}
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>
            {t('Học bạ', 'Academic record')}
          </span>
        </div>

        {/* Page title row */}
        <div className="sar-screen-only" style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="award" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Học bạ học sinh', 'Student academic record')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Lịch sử học bạ đã ký theo từng năm học và học kỳ. Mỗi bản ghi là ảnh chụp điểm tại thời điểm ký.',
                 'Sealed academic records by year and term. Each record is a frozen grade snapshot at seal time.')}
            </div>
          </div>
          <Button variant="ghost" icon="printer" onClick={handlePrint}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('In học bạ', 'Print record')}
          </Button>
        </div>

        {/* Student info header card */}
        <StudentHeader student={student} t={t} lang={lang} pColor={pColor}
          accessRole={accessRole} />

        {/* Year tabs */}
        <YearTabs years={SAR_YEAR_LIST} activeId={activeYear} onChange={setActiveYear}
          t={t} lang={lang} pColor={pColor} />

        {/* Per-term sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {SAR_TERMS.map(term => (
            <TermSection
              key={term.id}
              term={term}
              record={yearData[term.id]}
              yearLabel={(SAR_YEAR_LIST.find(y => y.id === activeYear) || {}).label}
              activeYearId={activeYear}
              t={t} lang={lang} pColor={pColor}
              isAdmin={isAdmin}
              onUnsealRequest={(record) => setUnsealTarget({ year: activeYear, termId: term.id, record })}
            />
          ))}
        </div>
      </div>

      {unsealTarget && (
        <UnsealRequestDialog
          t={t} pColor={pColor} student={student}
          year={unsealTarget.year} termId={unsealTarget.termId}
          record={unsealTarget.record}
          onCancel={() => setUnsealTarget(null)}
          onSubmit={() => {
            setUnsealTarget(null);
            showToast(t('Đã gửi yêu cầu mở học bạ — chờ ADMIN thứ hai xác nhận.',
                        'Unseal request submitted — awaiting second-ADMIN confirmation.'));
          }}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff',
          padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: T.success,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
          </div>
          {toast}
        </div>
      )}

      {/* Print + animation CSS */}
      <style>{`
        @keyframes sar-fadein { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          @page { size: A4 portrait; margin: 14mm 12mm; }
          body { background: #fff !important; }
          .sar-screen-only { display: none !important; }
          .sar-root { padding: 0 !important; overflow: visible !important; }
          .sar-root [role="alertdialog"], .sar-root .sar-toast { display: none !important; }
          .sar-term-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #DCE3EE !important; }
        }
        body.sar-printing { overflow: visible; }
      `}</style>
    </div>
  );
};

// ── Student info header card ─────────────────────────────────────────────────

const StudentHeader = ({ student, t, lang, pColor, accessRole }) => {
  const roleMeta = SAR_ROLE_META[accessRole];
  return (
    <div style={{
      background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '20px 22px', marginBottom: 18,
      display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: pColor + '22', color: pColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800, flexShrink: 0,
      }}>
        {student.avatar}
      </div>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary }}>
          {lang === 'en' ? student.nameEn : student.name}
        </div>
        <div style={{
          marginTop: 6,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          fontSize: 12.5, color: T.textSecondary,
        }}>
          <SarMeta label={t('Mã HS', 'Student ID')} value={student.studentCode} mono />
          <SarDivider />
          <SarMeta label={t('Ngày sinh', 'DOB')} value={student.dob} />
          <SarDivider />
          <SarMeta label={t('Lớp hiện tại', 'Current class')} value={student.currentClassId} />
          <SarDivider />
          <SarMeta label={t('Năm học hiện tại', 'Current year')} value={student.currentSchoolYear} mono />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '4px 11px', borderRadius: 99,
          background: roleMeta.color + '18',
          border: `1px solid ${roleMeta.color}33`,
        }}>
          <Icon name="shield" size={11} color={roleMeta.color} strokeWidth={2.4} />
          <span style={{ fontSize: 11, fontWeight: 800, color: roleMeta.color, letterSpacing: '0.06em' }}>
            {roleMeta.vi}
          </span>
        </span>
        <span style={{ fontSize: 11, color: T.textMuted, maxWidth: 260, textAlign: 'right' }}>
          {t(roleMeta.tagVi, roleMeta.tagEn)}
        </span>
      </div>
    </div>
  );
};

const SarMeta = ({ label, value, mono }) => (
  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
    <span style={{
      fontSize: 10, fontWeight: 800, color: T.textMuted,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>{label}</span>
    <span style={{
      fontSize: 13, fontWeight: 700, color: T.textPrimary,
      fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit',
    }}>{value}</span>
  </span>
);

const SarDivider = () => (
  <span style={{ width: 1, height: 16, background: T.border, alignSelf: 'center' }} />
);

// ── Year tabs ────────────────────────────────────────────────────────────────

const YearTabs = ({ years, activeId, onChange, t, lang, pColor }) => (
  <div className="sar-screen-only" style={{
    display: 'flex', gap: 6, background: T.card, borderRadius: 12,
    border: `1px solid ${T.border}`, padding: 6, marginBottom: 18,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', flexWrap: 'wrap',
  }}>
    {years.map(year => {
      const active = year.id === activeId;
      const statusKey = sarYearStatus(year);
      const meta = SAR_YEAR_BADGE_META[statusKey];
      return (
        <button key={year.id} onClick={() => onChange(year.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '10px 14px', borderRadius: 8,
            background: active ? pColor + '14' : 'transparent',
            border: active ? `1.5px solid ${pColor}66` : '1.5px solid transparent',
            cursor: 'pointer', fontFamily: 'inherit',
            color: active ? pColor : T.textSecondary,
            transition: 'all 0.15s',
          }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>{year.label}</span>
              {year.current && (
                <span style={{
                  fontSize: 9, fontWeight: 800, color: T.success,
                  background: T.successLight, padding: '1px 7px', borderRadius: 4,
                  letterSpacing: '0.08em',
                }}>NĂM HIỆN TẠI</span>
              )}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4,
              fontSize: 10.5, fontWeight: 700, color: meta.color,
            }}>
              <Icon name={meta.icon} size={10} color={meta.color} strokeWidth={2.4} />
              {t(meta.vi, meta.en)}
              <span style={{
                fontSize: 9.5, fontWeight: 700, color: T.textMuted,
                marginLeft: 2,
              }}>
                · {t(`Lớp ${year.classId}`, `Class ${year.classId}`)}
              </span>
            </span>
          </div>
        </button>
      );
    })}
  </div>
);

// ── Term section ─────────────────────────────────────────────────────────────

const TermSection = ({ term, record, yearLabel, activeYearId, t, lang, pColor, isAdmin, onUnsealRequest }) => {
  const status = (record && record.status) || 'PENDING';
  const m = SAR_RECORD_STATUS_META[status];

  return (
    <div className="sar-term-card" style={{
      background: T.card, borderRadius: 14,
      border: `1px solid ${status === 'UNSEALED' ? T.warning + '44' : T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 22px',
        borderBottom: `1px solid ${T.border}`,
        background: status === 'UNSEALED' ? T.warningLight + '88' : T.bg,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: pColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="bookOpen" size={17} color={pColor} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
            {t(term.vi, term.en)} · {yearLabel}
          </div>
          {record?.classId && (
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {t(`Lớp ${record.classId}`, `Class ${record.classId}`)}
              {record.sealedBy && <> · {t(`Người ký: ${record.sealedBy}`, `Signed by ${record.sealedBy}`)}</>}
            </div>
          )}
        </div>
        <Badge color={m.color} bg={m.bg}>
          <Icon name={m.icon} size={11} color={m.color} strokeWidth={2.4} />
          {t(m.vi, m.en)}
        </Badge>
        {isAdmin && (status === 'SEALED' || status === 'UNSEALED') && (
          <Button
            variant="ghost" icon="unlock"
            onClick={() => onUnsealRequest(record)}
            style={{
              border: `1px solid ${T.warning}55`, color: T.warning,
              background: T.warningLight,
            }}>
            {t('Yêu cầu mở học bạ', 'Request unseal')}
          </Button>
        )}
      </div>

      {/* Unsealed warning banner */}
      {status === 'UNSEALED' && (
        <div style={{
          padding: '12px 22px',
          background: T.warningLight,
          borderBottom: `1px solid ${T.warning}33`,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Icon name="alertTriangle" size={15} color={T.warning} strokeWidth={2} />
          <div style={{ flex: 1, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: '#9A6A0F', fontWeight: 800 }}>
              {t(`Học bạ đã được mở ngày ${record.unsealedAt}`,
                 `Record unsealed on ${record.unsealedAt}`)}
            </strong>{' — '}
            {t(record.unsealReasonVi, record.unsealReasonEn)}
          </div>
        </div>
      )}

      {/* Body */}
      {status === 'PENDING'
        ? <PendingPlaceholder t={t} />
        : <GradeSnapshotTable record={record} t={t} lang={lang} pColor={pColor} />
      }

      {/* Caption */}
      {(status === 'SEALED' || status === 'UNSEALED') && record.sealedAt && (
        <div style={{
          padding: '12px 22px', borderTop: `1px solid ${T.border}`, background: T.bg,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11.5, color: T.textMuted,
        }}>
          <Icon name="lock" size={12} color={T.textMuted} strokeWidth={2.2} />
          {t(`Đã ký ngày ${record.sealedAt} bởi ${record.sealedBy}`,
             `Sealed on ${record.sealedAt} by ${record.sealedBy}`)}
          {status === 'UNSEALED' && (
            <>
              {' · '}
              <span style={{ color: T.warning, fontWeight: 700 }}>
                {t(`Mở ngày ${record.unsealedAt}`, `Unsealed ${record.unsealedAt}`)}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const PendingPlaceholder = ({ t }) => (
  <div style={{
    padding: '40px 22px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="clock" size={28} color={T.border} strokeWidth={1.6} />
    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: T.textSecondary }}>
      {t('Học kỳ chưa được ký', 'Term not yet sealed')}
    </div>
    <div style={{ marginTop: 4, fontSize: 11.5 }}>
      {t('Bản ghi học bạ sẽ xuất hiện ở đây sau khi điểm được khoá và ký.',
         'A sealed record will appear here once grades are locked and signed.')}
    </div>
  </div>
);

// ── Grade snapshot table ─────────────────────────────────────────────────────

const GradeSnapshotTable = ({ record, t, lang, pColor }) => {
  const gpa = sarRecordGPA(record);
  const overallRank = sarRank(gpa, t, pColor);
  const isUnsealed = record.status === 'UNSEALED';

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{
              ...sarThStyle,
              textAlign: 'left', paddingLeft: 22, width: '32%', minWidth: 180,
            }}>
              {t('Môn học', 'Subject')}
            </th>
            {SAR_COLUMNS.map(c => {
              const tint = (window.GE_COL_TINT || {})[c.columnType] || T.primary;
              return (
                <th key={c.id} style={{
                  padding: '10px 8px 12px', textAlign: 'center', minWidth: 82,
                  background: tint + '14', borderBottom: `2px solid ${tint}55`,
                  verticalAlign: 'bottom',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: tint,
                        background: tint + '22', padding: '2px 6px', borderRadius: 4,
                        letterSpacing: '0.08em',
                      }}>{c.columnType}</span>
                      <span style={{
                        fontSize: 9.5, fontWeight: 800, color: T.textSecondary,
                        background: T.card, border: `1px solid ${T.border}`,
                        padding: '2px 6px', borderRadius: 4,
                        fontFamily: 'ui-monospace, Menlo, monospace',
                      }}>×{c.coefficient}</span>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap' }}>
                      {t(c.vi, c.en)}
                    </div>
                  </div>
                </th>
              );
            })}
            <th style={{
              ...sarThStyle, background: T.bg, borderBottom: `2px solid ${T.border}`,
              paddingTop: 10, paddingBottom: 12,
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.textPrimary }}>
                {t('TB kỳ', 'Term Avg')}
              </div>
              <div style={{ fontSize: 9.5, color: T.textMuted, marginTop: 2, fontWeight: 700, letterSpacing: '0.05em' }}>
                {t('THEO HỆ SỐ', 'WEIGHTED')}
              </div>
            </th>
            <th style={{ ...sarThStyle, background: T.bg, borderBottom: `2px solid ${T.border}` }}>
              {t('Xếp loại', 'Rank')}
            </th>
          </tr>
        </thead>
        <tbody>
          {record.subjects.map((s, ri) => {
            const avg = sarSubjectAvg(s.cells);
            const r = sarRank(avg, t, pColor);
            return (
              <tr key={s.id}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...sarTdStyle, paddingLeft: 22 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>
                    {sarSubjectName(s.id, lang)}
                  </span>
                </td>
                {s.cells.map((v, ci) => (
                  <td key={ci} style={{ ...sarTdStyle, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 13.5, fontWeight: 700,
                      color: sarScoreColor(v),
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {v == null ? '—' : v}
                    </span>
                  </td>
                ))}
                <td style={{ ...sarTdStyle, textAlign: 'center', background: T.bg, boxShadow: `inset 1px 0 0 ${T.border}` }}>
                  <span style={{
                    fontSize: 14, fontWeight: 800,
                    color: r ? r.color : T.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {avg != null ? avg.toFixed(2) : '—'}
                  </span>
                </td>
                <td style={{ ...sarTdStyle, textAlign: 'center', background: T.bg }}>
                  {r ? <Badge color={r.color}>{t(r.vi, r.en)}</Badge> : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={1 + SAR_COLUMNS.length} style={{
              padding: '14px 22px', background: pColor + '0A',
              borderTop: `2px solid ${pColor}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 800, color: pColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  <Icon name="chart" size={13} color={pColor} strokeWidth={2.2} />
                  {t('Tổng kết kỳ', 'Term summary')}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {t('Hạnh kiểm', 'Conduct')}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.success }}>
                    {t(record.conductVi, record.conductEn)}
                  </span>
                </div>
              </div>
            </td>
            <td style={{
              padding: '14px 12px', background: pColor + '0A',
              borderTop: `2px solid ${pColor}33`, textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                GPA
              </div>
              <span style={{
                fontSize: 18, fontWeight: 900,
                color: overallRank ? overallRank.color : T.textMuted,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {gpa != null ? gpa.toFixed(2) : '—'}
              </span>
            </td>
            <td style={{
              padding: '14px 12px', background: pColor + '0A',
              borderTop: `2px solid ${pColor}33`, textAlign: 'center',
            }}>
              {overallRank ? <Badge color={overallRank.color}>{t(overallRank.vi, overallRank.en)}</Badge> : '—'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const sarThStyle = {
  padding: '12px 14px', textAlign: 'center',
  fontSize: 11, fontWeight: 800, color: T.textMuted,
  background: T.bg, borderBottom: `1px solid ${T.border}`,
  letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
};
const sarTdStyle = {
  padding: '11px 12px',
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: 'middle',
};

// ── Unseal request dialog (ADMIN-only entry-point) ───────────────────────────

const UnsealRequestDialog = ({ t, pColor, student, year, termId, record, onCancel, onSubmit }) => {
  const [reason, setReason] = React.useState('');
  const minLen = 20;
  const canSubmit = reason.trim().length >= minLen;

  return (
    <div onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 20, backdropFilter: 'blur(3px)',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        role="alertdialog" aria-modal="true"
        style={{
          background: T.card, borderRadius: 14, width: '100%', maxWidth: 520,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          animation: 'sar-fadein 0.18s ease-out',
        }}>
        <div style={{ padding: '22px 24px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: T.warning + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="unlock" size={20} color={T.warning} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
                {t('Tạo yêu cầu mở học bạ', 'Create unseal request')}
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>
                <strong style={{ color: T.textPrimary }}>{student.name}</strong>
                {' · '}
                {t(`Lớp ${record.classId} · ${termId} · ${year}`,
                   `Class ${record.classId} · ${termId} · ${year}`)}
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: T.bg, borderRadius: 10,
            fontSize: 12, color: T.textSecondary, lineHeight: 1.55,
            marginBottom: 16,
          }}>
            {t('Yêu cầu sẽ chuyển sang màn ', 'Request will move to the ')}
            <strong style={{ color: T.textPrimary }}>{t('Ký học bạ → Yêu cầu mở học bạ', 'Academic Records → Unseal Requests')}</strong>
            {t(' và cần xác nhận từ ADMIN thứ hai. Mọi hành động được ghi vào nhật ký kiểm toán.',
               ' tab and requires a second-ADMIN confirmation. All actions are logged to the audit trail.')}
          </div>

          <div style={{
            fontSize: 10.5, fontWeight: 800, color: T.textMuted,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            {t('Lý do mở học bạ', 'Unseal reason')} <span style={{ color: T.error }}>*</span>
          </div>
          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={t('Mô tả chi tiết lý do cần mở học bạ, kèm số biên bản / công văn nếu có…',
                           'Describe in detail why this record needs to be unsealed…')}
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 8,
              border: `1.5px solid ${T.border}`, background: T.card,
              fontSize: 13.5, color: T.textPrimary, fontFamily: 'inherit',
              lineHeight: 1.6, outline: 'none', resize: 'vertical',
            }}
          />
          <div style={{
            marginTop: 6, display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: reason.trim().length >= minLen ? T.success : T.textMuted,
          }}>
            <span>{t('Tối thiểu', 'Minimum')} {minLen} {t('ký tự', 'characters')}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {reason.trim().length} / {minLen}
            </span>
          </div>
        </div>

        <div style={{
          padding: '14px 24px', background: T.bg,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <Button variant="ghost" onClick={onCancel}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Huỷ', 'Cancel')}
          </Button>
          <Button variant="primary" icon="send" disabled={!canSubmit} onClick={onSubmit}>
            {t('Tạo yêu cầu', 'Create request')}
          </Button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AcademicRecordViewScreen });
