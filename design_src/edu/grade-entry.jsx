// ── Grade Entry Screen — /teacher/grades/enter ──────────────────────────────
// Role:   TEACHER (GVBM — must be assigned to the ClassSubject via TeachingAssignment)
// Epic:   US-060 (grade entry with DRAFT → PUBLISHED / PENDING_APPROVAL → LOCKED
//         state machine)
// Model:  Subject context is a grade-scoped Subject master (ADR 0036) offered
//         to the class via a ClassSubject row (ADR 0037). The AssessmentScheme
//         (columns, types, coefficients) is resolved per (subject, year).
//         Master-locked fields — periodCount, learningOutcomes, requiredExamCount
//         — are read-only informational here; edited only on the Subject master.

// ── Static lookups ────────────────────────────────────────────────────────────

const GE_TERMS = [
  { id: 'HK1', vi: 'Học kỳ 1', en: 'Term 1' },
  { id: 'HK2', vi: 'Học kỳ 2', en: 'Term 2' },
];

const GE_YEARS = [
  { id: '2025-2026', label: '2025 — 2026' },
  { id: '2024-2025', label: '2024 — 2025' },
];

// Master-locked fields per Subject master (mocked from the API).
const GE_SUBJECT_MASTER = {
  'sub-math-10': {
    periodCount: 4,
    requiredExamCount: 3,
    learningOutcomesVi: 'Thành thạo hàm số bậc hai · vector phẳng · thống kê mô tả · xác suất cơ bản.',
    learningOutcomesEn: 'Quadratic functions · planar vectors · descriptive statistics · basic probability.',
  },
  'sub-math-11': {
    periodCount: 4,
    requiredExamCount: 3,
    learningOutcomesVi: 'Phương trình lượng giác · dãy số · giới hạn hàm số · đạo hàm cơ bản.',
    learningOutcomesEn: 'Trigonometric equations · sequences · function limits · basic derivatives.',
  },
  'sub-math-12': {
    periodCount: 3,
    requiredExamCount: 3,
    learningOutcomesVi: 'Ứng dụng đạo hàm · tích phân · hình học không gian · số phức.',
    learningOutcomesEn: 'Derivative applications · integrals · solid geometry · complex numbers.',
  },
};

// Column type → tint used to band headers (TX=primary, GK=warning, CK=error).
const GE_COL_TINT = { TX: T.primary, GK: T.warning, CK: T.error };

// Cell state palette (DRAFT is the editable state; everything else is read-only).
const GE_STATE_META = {
  EMPTY:            { vi: 'Chưa nhập', en: 'Empty',           color: T.textMuted, bg: 'transparent' },
  DRAFT:            { vi: 'Nháp',      en: 'Draft',           color: T.textSecondary, bg: T.card },
  PUBLISHED:        { vi: 'Đã công bố', en: 'Published',      color: T.textSecondary, bg: '#F5F7FA' },
  PENDING_APPROVAL: { vi: 'Chờ duyệt',  en: 'Pending',        color: '#9A6A0F',       bg: T.warningLight },
  LOCKED:           { vi: 'Đã khoá',    en: 'Locked',         color: T.error,         bg: '#F5F7FA' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert a "value|state" cell from GRADEBOOK_DATA into { value, state } objects
// that the grade-entry editor mutates locally.
const parseRowsForEntry = (raw, columns) => raw.map(r => ({
  name: r.name,
  cells: columns.map((c, i) => {
    const tok = r.cells[i] || '—|D';
    const [v, s] = tok.split('|');
    return {
      value: v === '—' ? null : parseFloat(v),
      state: v === '—'
        ? 'EMPTY'
        : ({ P: 'PUBLISHED', D: 'DRAFT', L: 'LOCKED' }[s] || 'DRAFT'),
    };
  }),
}));

const scoreColor = (v) =>
  v == null ? T.textMuted : v < 5 ? T.error : v >= 8 ? T.success : T.textPrimary;

const computeTermAvg = (cells, columns) => {
  let num = 0, den = 0;
  cells.forEach((c, i) => {
    if (c.value != null) {
      num += c.value * columns[i].coefficient;
      den += columns[i].coefficient;
    }
  });
  return den ? num / den : null;
};

// ── Main screen ───────────────────────────────────────────────────────────────

const GradeEntryScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  // Filter state ─────────────────────────────────────────────
  const [subjectId, setSubjectId] = React.useState(TEACHER_SUBJECT_OFFERINGS[0].id);
  const subject = TEACHER_SUBJECT_OFFERINGS.find(s => s.id === subjectId);
  const [classId, setClassId] = React.useState(subject.classIds[0]);
  const [term, setTerm] = React.useState('HK1');
  const [year, setYear] = React.useState('2025-2026');
  const [bannerOpen, setBannerOpen] = React.useState(true);

  // Local working-copy of the grade rows ─────────────────────
  const columns = GRADEBOOK_SCHEMES[subjectId] || [];
  const baseRows = (GRADEBOOK_DATA[subjectId] || {})[classId] || [];
  const [rows, setRows] = React.useState(() => parseRowsForEntry(baseRows, columns));

  // Re-seed when the (subject, class, term, year) tuple changes. Keeps the
  // editor honest — in production this would be a fetch+merge.
  React.useEffect(() => {
    if (!subject.classIds.includes(classId)) {
      setClassId(subject.classIds[0]);
      return;
    }
    const next = (GRADEBOOK_DATA[subjectId] || {})[classId] || [];
    setRows(parseRowsForEntry(next, GRADEBOOK_SCHEMES[subjectId] || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, classId, term, year]);

  // UI state ─────────────────────────────────────────────────
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2600);
  };

  // Mutations ────────────────────────────────────────────────
  const updateCell = (ri, ci, patch) => {
    setRows(rs => rs.map((r, i) => i !== ri ? r : {
      ...r,
      cells: r.cells.map((c, j) => j !== ci ? c : { ...c, ...patch }),
    }));
  };

  const saveDraft = () => {
    showToast(t('Đã lưu nháp — chưa công bố.', 'Draft saved — not yet published.'));
  };

  const confirmSubmit = () => {
    // DRAFT → PENDING_APPROVAL (this prototype assumes school is in
    // ADMIN_APPROVAL mode per the Tenant Operations Settings screen).
    setRows(rs => rs.map(r => ({
      ...r,
      cells: r.cells.map(c => c.state === 'DRAFT' && c.value != null
        ? { ...c, state: 'PENDING_APPROVAL' }
        : c),
    })));
    setSubmitOpen(false);
    showToast(t('Đã nộp điểm — chờ BGH duyệt.', 'Grades submitted — pending admin approval.'));
  };

  // Computed counts ──────────────────────────────────────────
  const stats = React.useMemo(() => {
    const counts = { EMPTY: 0, DRAFT: 0, PUBLISHED: 0, PENDING_APPROVAL: 0, LOCKED: 0 };
    let totalCells = 0;
    let filledCells = 0;
    rows.forEach(r => r.cells.forEach(c => {
      counts[c.state] = (counts[c.state] || 0) + 1;
      totalCells += 1;
      if (c.value != null) filledCells += 1;
    }));
    const studentsComplete = rows.filter(r => r.cells.every(c => c.value != null)).length;
    return { counts, totalCells, filledCells, studentsComplete, totalStudents: rows.length };
  }, [rows]);

  const completionPct = stats.totalCells ? (stats.filledCells / stats.totalCells) * 100 : 0;
  const lockedCount = stats.counts.LOCKED || 0;
  const meta = GE_SUBJECT_MASTER[subjectId] || {};

  return (
    <div style={{
      flex: 1, overflowY: 'auto', position: 'relative',
      padding: '28px 32px 110px',  // leave room for the sticky action bar
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, color: T.textMuted, marginBottom: 12,
        }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
            <Icon name="home" size={12} color="currentColor" />
            {t('Trang chủ', 'Home')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('grades'); }}
            style={{ color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
            {t('Bảng điểm', 'Grade Book')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>
            {t('Nhập điểm', 'Enter grades')}
          </span>
        </div>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="penLine" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Nhập điểm', 'Enter Grades')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Nhập điểm theo cột đánh giá cho lớp & môn được chọn. Điểm sẽ chuyển trạng thái khi bạn nộp.',
                 'Enter grades by assessment column for the selected class & subject. Status changes on submit.')}
            </div>
          </div>
          <Badge color={pColor}>
            <Icon name="userCheck" size={11} color={pColor} strokeWidth={2.4} />
            GVBM · TEACHER
          </Badge>
        </div>

        {/* ── Filter bar ── */}
        <GradeEntryFilters
          t={t} pColor={pColor}
          subjectId={subjectId} setSubjectId={setSubjectId}
          subject={subject}
          classId={classId} setClassId={setClassId}
          term={term} setTerm={setTerm}
          year={year} setYear={setYear}
        />

        {/* ── Master info banner (collapsible) ── */}
        <MasterInfoBanner
          t={t} subject={subject} meta={meta}
          lang={lang}
          open={bannerOpen} onToggle={() => setBannerOpen(o => !o)}
        />

        {/* ── LOCKED row banner ── */}
        {lockedCount > 0 && (
          <div style={{
            margin: '14px 0 0', padding: '12px 16px',
            background: T.errorLight,
            border: `1px solid ${T.error}33`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: T.error + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="lock" size={15} color={T.error} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: 12.5, color: T.textSecondary, flex: 1 }}>
              <strong style={{ color: T.error, fontWeight: 800 }}>
                {lockedCount} {t('điểm đã bị khoá', 'grades locked')}
              </strong>
              {' — '}
              {t('không thể chỉnh sửa tại đây. Liên hệ BGH nếu cần mở khoá.',
                 'cannot be edited here. Contact admin to unlock.')}
            </div>
          </div>
        )}

        {/* ── Main row: grade table + summary panel ── */}
        <div style={{
          marginTop: 18,
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18,
          alignItems: 'start',
        }}>
          <GradeEntryTable
            t={t} pColor={pColor}
            rows={rows} columns={columns}
            onUpdate={updateCell}
          />
          <SummaryPanel
            t={t} pColor={pColor}
            stats={stats} completionPct={completionPct}
            classId={classId} term={term} subject={subject} lang={lang}
          />
        </div>
      </div>

      {/* ── Sticky action bar ── */}
      <ActionBar
        t={t} pColor={pColor}
        stats={stats}
        onSaveDraft={saveDraft}
        onSubmit={() => setSubmitOpen(true)}
      />

      {/* ── Submit confirmation dialog ── */}
      {submitOpen && (
        <SubmitDialog
          t={t} pColor={pColor}
          classId={classId} subject={subject} term={term} year={year}
          stats={stats}
          onCancel={() => setSubmitOpen(false)}
          onConfirm={confirmSubmit}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff',
          padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000,
          animation: 'ge-toast-in 0.2s ease-out',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: T.success,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
          </div>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes ge-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes ge-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ── Filter bar ────────────────────────────────────────────────────────────────

const GradeEntryFilters = ({ t, pColor, subjectId, setSubjectId, subject, classId, setClassId, term, setTerm, year, setYear }) => {
  const SelectField = ({ label, value, onChange, options, mono }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label} <span style={{ color: T.error }}>*</span>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '9px 34px 9px 12px', borderRadius: 8,
          border: `1.5px solid ${T.border}`, background: T.card,
          fontSize: 13.5, fontWeight: 700, color: T.textPrimary,
          cursor: 'pointer', fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><polyline points='1,1 5,5 9,1' fill='none' stroke='%238898A9' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
          width: '100%',
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '16px 22px',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.7fr) minmax(0, 0.9fr)',
      gap: 16, alignItems: 'end',
    }}>
      <SelectField
        label={t('Lớp', 'Class')}
        value={classId} onChange={setClassId}
        options={subject.classIds.map(c => ({ value: c, label: c }))}
      />
      <SelectField
        label={t('Môn (theo khối)', 'Subject (grade-scoped)')}
        value={subjectId} onChange={setSubjectId}
        options={TEACHER_SUBJECT_OFFERINGS.map(s => ({
          value: s.id,
          label: t(s.vi, s.en),
        }))}
      />
      <SelectField
        label={t('Học kỳ', 'Term')}
        value={term} onChange={setTerm}
        options={GE_TERMS.map(o => ({ value: o.id, label: t(o.vi, o.en) }))}
      />
      <SelectField
        label={t('Năm học', 'Academic Year')}
        value={year} onChange={setYear}
        options={GE_YEARS.map(o => ({ value: o.id, label: o.label }))}
        mono
      />
    </div>
  );
};

// ── Master-locked info banner (collapsible) ───────────────────────────────────

const MasterInfoBanner = ({ t, subject, meta, lang, open, onToggle }) => (
  <div style={{
    marginTop: 14,
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    overflow: 'hidden',
  }}>
    <button onClick={onToggle}
      style={{
        width: '100%', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'transparent', border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: T.textMuted + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="lock" size={13} color={T.textMuted} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: T.textSecondary }}>
          {t('Thông tin khoá từ Subject master', 'Master-locked subject info')}
          <span style={{
            marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: T.textMuted,
            background: T.card, border: `1px solid ${T.border}`,
            padding: '1px 7px', borderRadius: 4,
            fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.04em',
          }}>READ-ONLY</span>
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
          {t('Quản lý tại màn hình Subject master — không chỉnh sửa tại đây.',
             'Managed on the Subject master screen — not editable here.')}
        </div>
      </div>
      <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} color={T.textMuted} />
    </button>

    {open && (
      <div style={{
        padding: '0 18px 16px 60px',
        display: 'grid',
        gridTemplateColumns: 'auto auto 1fr',
        gap: '6px 28px',
        alignItems: 'start',
        animation: 'ge-fadein 0.2s ease-out',
      }}>
        <MasterField label={t('Số tiết / tuần', 'Periods / week')} value={meta.periodCount ?? '—'} />
        <MasterField label={t('Số bài KT yêu cầu', 'Required exams')} value={meta.requiredExamCount ?? '—'} />
        <MasterField
          label={t('Chỉ tiêu đầu ra', 'Learning outcomes')}
          value={lang === 'en' ? meta.learningOutcomesEn : meta.learningOutcomesVi}
          long
        />
        <MasterField label="Subject ID" value={subject.id} mono />
        <MasterField label={t('Tên đầy đủ', 'Full name')} value={t(subject.vi, subject.en)} />
      </div>
    )}
  </div>
);

const MasterField = ({ label, value, mono, long }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 2,
    minWidth: 0,
    gridColumn: long ? 'span 1' : 'auto',
  }}>
    <div style={{ fontSize: 9.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{
      fontSize: 13, fontWeight: 700, color: T.textPrimary,
      fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit',
      lineHeight: 1.45,
    }}>
      {value}
    </div>
  </div>
);

// ── Grade entry table ─────────────────────────────────────────────────────────

const GradeEntryTable = ({ t, pColor, rows, columns, onUpdate }) => {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={geThStyle}>#</th>
              <th style={{ ...geThStyle, textAlign: 'left', paddingLeft: 16 }}>
                {t('Học sinh', 'Student')}
              </th>
              {columns.map(c => {
                const tint = GE_COL_TINT[c.columnType];
                return (
                  <th key={c.id} style={{
                    padding: '10px 10px 12px',
                    background: tint + '14',
                    borderBottom: `2px solid ${tint}55`,
                    textAlign: 'center', minWidth: 108, verticalAlign: 'bottom',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, color: tint,
                          background: tint + '22', padding: '2px 7px', borderRadius: 4,
                          letterSpacing: '0.08em',
                        }}>{c.columnType}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 800, color: T.textSecondary,
                          background: T.card, border: `1px solid ${T.border}`,
                          padding: '2px 7px', borderRadius: 4,
                          fontFamily: 'ui-monospace, Menlo, monospace',
                          fontVariantNumeric: 'tabular-nums',
                        }}>×{c.coefficient}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap' }}>
                        {t(c.vi, c.en)}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th style={{
                ...geThStyle, background: T.bg,
                borderBottom: `2px solid ${T.border}`, paddingTop: 10, paddingBottom: 12,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.textPrimary }}>
                  {t('TB kỳ', 'Term Avg')}
                </div>
                <div style={{ fontSize: 9.5, color: T.textMuted, marginTop: 2, fontWeight: 700, letterSpacing: '0.05em' }}>
                  {t('TỰ TÍNH', 'AUTO')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const avg = computeTermAvg(r.cells, columns);
              return (
                <tr key={ri}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={geTdStyle}>
                    <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                      {ri + 1}
                    </span>
                  </td>
                  <td style={{ ...geTdStyle, paddingLeft: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar
                        initials={r.name.split(' ').slice(-1)[0][0]}
                        color={pColor} size={28}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                        {r.name}
                      </span>
                    </div>
                  </td>
                  {r.cells.map((cell, ci) => (
                    <GradeInputCell
                      key={ci}
                      cell={cell}
                      pColor={pColor}
                      onChange={(patch) => onUpdate(ri, ci, patch)}
                    />
                  ))}
                  <td style={{
                    ...geTdStyle, textAlign: 'center',
                    background: avg != null ? T.bg : 'transparent',
                    boxShadow: `inset 1px 0 0 ${T.border}`,
                  }}>
                    <span style={{
                      fontSize: 14, fontWeight: 800,
                      color: scoreColor(avg),
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {avg != null ? avg.toFixed(2) : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const geThStyle = {
  padding: '12px 14px', textAlign: 'center',
  fontSize: 11, fontWeight: 800, color: T.textMuted,
  background: T.bg, borderBottom: `1px solid ${T.border}`,
  letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
};
const geTdStyle = {
  padding: '8px 12px',
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: 'middle',
};

// ── Editable / read-only grade cell ───────────────────────────────────────────

const GradeInputCell = ({ cell, onChange, pColor }) => {
  const { value, state } = cell;
  const isEditable = state === 'DRAFT' || state === 'EMPTY';
  const isPending = state === 'PENDING_APPROVAL';
  const isLocked = state === 'LOCKED';

  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [draftStr, setDraftStr] = React.useState(value == null ? '' : String(value));
  React.useEffect(() => {
    if (!focused) setDraftStr(value == null ? '' : String(value));
  }, [value, focused]);

  const commit = (raw) => {
    const trimmed = raw.trim().replace(',', '.');
    if (trimmed === '') { onChange({ value: null, state: 'EMPTY' }); return; }
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num >= 0 && num <= 10) {
      onChange({ value: Math.round(num * 100) / 100, state: 'DRAFT' });
    } else {
      // Reject invalid — reset to last good value.
      setDraftStr(value == null ? '' : String(value));
    }
  };

  if (isEditable) {
    const isEmpty = value == null;
    return (
      <td style={{ padding: 4, borderBottom: `1px solid ${T.border}`, textAlign: 'center' }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <input
            type="text" inputMode="decimal"
            placeholder="—"
            value={focused ? draftStr : (value == null ? '' : String(value))}
            onFocus={(e) => { setFocused(true); e.target.select(); }}
            onChange={(e) => setDraftStr(e.target.value)}
            onBlur={() => { setFocused(false); commit(draftStr); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setDraftStr(value == null ? '' : String(value));
                e.currentTarget.blur();
              }
            }}
            style={{
              width: 72, padding: '7px 10px', textAlign: 'center',
              border: `1.5px solid ${
                focused ? pColor
                : isEmpty && hovered ? T.textMuted + '88'
                : T.border
              }`,
              borderStyle: isEmpty && hovered && !focused ? 'dashed' : 'solid',
              borderRadius: 7, background: T.card,
              fontSize: 14, fontWeight: 700,
              color: isEmpty ? T.textMuted : scoreColor(value),
              fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
              outline: 'none', transition: 'border-color 0.12s',
            }}
          />
          {state === 'DRAFT' && !focused && (
            <span style={{
              position: 'absolute', top: 1, right: 4,
              fontSize: 8.5, fontWeight: 800, color: T.textMuted,
              letterSpacing: '0.08em', pointerEvents: 'none',
            }} title="DRAFT">●</span>
          )}
          {hovered && !focused && !isEmpty && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              width: 16, height: 16, borderRadius: '50%',
              background: T.card, border: `1px solid ${T.border}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)', pointerEvents: 'none',
            }}>
              <Icon name="penLine" size={9} color={pColor} strokeWidth={2.4} />
            </span>
          )}
        </div>
      </td>
    );
  }

  // Read-only states: PUBLISHED / PENDING_APPROVAL / LOCKED
  const bg = isPending ? T.warningLight : '#F5F7FA';
  const cornerIcon = isLocked
    ? { name: 'lock', color: T.error }
    : isPending
    ? { name: 'clock', color: T.warning }
    : { name: 'lock', color: T.textMuted };
  const txtColor = isLocked
    ? (value == null ? T.textMuted : scoreColor(value))
    : isPending
    ? '#9A6A0F'
    : (value == null ? T.textMuted : T.textSecondary);

  return (
    <td style={{ padding: 4, borderBottom: `1px solid ${T.border}`, textAlign: 'center' }}>
      <div style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 88, minHeight: 34, padding: '7px 10px',
        background: bg,
        border: `1px solid ${isLocked ? T.error + '22' : isPending ? T.warning + '44' : T.border}`,
        borderRadius: 7,
        fontSize: 14, fontWeight: isLocked ? 800 : 700,
        color: txtColor,
        fontVariantNumeric: 'tabular-nums',
      }} title={state}>
        {value == null ? '—' : value}
        <span style={{
          position: 'absolute', top: 3, right: 3, display: 'inline-flex',
        }}>
          <Icon name={cornerIcon.name} size={12} color={cornerIcon.color} strokeWidth={2.2} />
        </span>
      </div>
    </td>
  );
};

// ── Summary panel (right column) ──────────────────────────────────────────────

const SummaryPanel = ({ t, pColor, stats, completionPct, classId, term, subject, lang }) => {
  const StateRow = ({ stateKey, color }) => {
    const m = GE_STATE_META[stateKey];
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 0', borderTop: `1px solid ${T.border}`,
      }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: color, flexShrink: 0,
        }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.textSecondary }}>
          {t(m.vi, m.en)}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 800, color: T.textPrimary,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {stats.counts[stateKey] || 0}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 800, color: T.textMuted,
          fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.04em',
        }}>
          {stateKey}
        </span>
      </div>
    );
  };

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: 18,
      position: 'sticky', top: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon name="chart" size={14} color={pColor} strokeWidth={2.2} />
        <div style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary }}>
          {t('Tổng quan tiến độ', 'Entry progress')}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 14 }}>
        {classId} · {t(subject.vi, subject.en)} · {term}
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 28, fontWeight: 900, color: T.textPrimary,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {stats.studentsComplete}
        </span>
        <span style={{ fontSize: 14, color: T.textMuted, fontWeight: 700 }}>
          / {stats.totalStudents}
        </span>
        <span style={{ fontSize: 11.5, color: T.textMuted, marginLeft: 4 }}>
          {t('học sinh đã nhập đủ', 'students complete')}
        </span>
      </div>

      <ProgressBar value={completionPct} color={pColor} height={8} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 6,
        fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
      }}>
        <span>{stats.filledCells} / {stats.totalCells} {t('ô đã nhập', 'cells filled')}</span>
        <span style={{ fontWeight: 800, color: pColor }}>{Math.round(completionPct)}%</span>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 800, color: T.textMuted,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          paddingBottom: 4,
        }}>
          {t('Theo trạng thái', 'By state')}
        </div>
        <StateRow stateKey="DRAFT"            color={T.textMuted} />
        <StateRow stateKey="PUBLISHED"        color={T.success} />
        <StateRow stateKey="PENDING_APPROVAL" color={T.warning} />
        <StateRow stateKey="LOCKED"           color={T.error} />
        <StateRow stateKey="EMPTY"            color={T.border} />
      </div>
    </div>
  );
};

// ── Sticky action bar ─────────────────────────────────────────────────────────

const ActionBar = ({ t, pColor, stats, onSaveDraft, onSubmit }) => (
  <div style={{
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
    background: T.card, borderTop: `1px solid ${T.border}`,
    boxShadow: '0 -4px 16px rgba(20, 30, 50, 0.06)',
    padding: '14px 32px',
  }}>
    <div style={{
      maxWidth: 1280, margin: '0 auto',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 8,
          background: T.bg, border: `1px solid ${T.border}`,
        }}>
          <Icon name="userCheck" size={13} color={pColor} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
            <strong style={{ color: T.textPrimary, fontWeight: 800 }}>
              {stats.studentsComplete}
            </strong>
            {' / '}
            {stats.totalStudents}
            {' '}
            {t('học sinh đã nhập đủ điểm', 'students fully entered')}
          </span>
        </div>
        {stats.counts.DRAFT > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, color: T.textMuted,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.textMuted }} />
            {stats.counts.DRAFT} {t('ô nháp chưa nộp', 'draft cells')}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <Button variant="ghost" icon="fileText" onClick={onSaveDraft} style={{
        border: `1px solid ${T.border}`, color: T.textSecondary,
      }}>
        {t('Lưu nháp', 'Save draft')}
      </Button>
      <Button
        variant="primary"
        icon="send"
        onClick={onSubmit}
        disabled={stats.counts.DRAFT === 0}
      >
        {t('Nộp điểm', 'Submit grades')}
      </Button>
    </div>
  </div>
);

// ── Submit confirmation dialog ────────────────────────────────────────────────

const SubmitDialog = ({ t, pColor, classId, subject, term, year, stats, onCancel, onConfirm }) => (
  <div onClick={onCancel}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 20, backdropFilter: 'blur(2px)',
    }}>
    <div onClick={(e) => e.stopPropagation()}
      role="alertdialog" aria-modal="true"
      style={{
        background: T.card, borderRadius: 14, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: 'ge-fadein 0.18s ease-out',
      }}>
      <div style={{ padding: '22px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: T.warning + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="alertTriangle" size={18} color={T.warning} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 3 }}>
              {t('Xác nhận nộp điểm', 'Confirm grade submission')}
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.55 }}>
              {t(`Bạn có chắc muốn nộp điểm cho lớp `, 'You are about to submit grades for ')}
              <strong style={{ color: T.textPrimary }}>{classId}</strong>
              {' — '}
              <strong style={{ color: T.textPrimary }}>{t(subject.vi, subject.en)}</strong>
              {' — '}
              <strong style={{ color: T.textPrimary }}>{term}</strong>
              {'?'}
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 14px',
          background: T.bg, borderRadius: 10,
          fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6,
        }}>
          {t('Sau khi nộp, ', 'After submission, ')}
          <strong style={{ color: T.textPrimary }}>
            {stats.counts.DRAFT} {t('ô nháp', 'draft cells')}
          </strong>
          {t(' sẽ chuyển sang trạng thái ', ' will transition to ')}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '1px 8px', borderRadius: 5,
            background: T.warning + '22', color: '#9A6A0F',
            fontSize: 11.5, fontWeight: 800,
          }}>
            <Icon name="clock" size={10} color="#9A6A0F" />
            PENDING_APPROVAL
          </span>
          {t(' để BGH duyệt theo cấu hình hiện tại của trường.',
             ', awaiting admin review per the school’s current publish mode.')}
        </div>
      </div>

      <div style={{
        padding: '14px 24px', background: T.bg,
        borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 10,
      }}>
        <Button variant="ghost" onClick={onCancel} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
          {t('Huỷ', 'Cancel')}
        </Button>
        <Button variant="primary" icon="send" onClick={onConfirm}>
          {t('Nộp điểm', 'Submit')}
        </Button>
      </div>
    </div>
  </div>
);

Object.assign(window, { GradeEntryScreen, GE_COL_TINT });
