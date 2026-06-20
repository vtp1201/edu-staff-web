// ── Grade Book — /teacher|principal|student|parent/grades ─────────────────────
// Routes:  /teacher/grades · /principal/grades · /student/grades · /parent/grades
// Roles:   TEACHER (enter), ADMIN/MANAGER (aggregate read-only),
//          STUDENT/PARENT (view, gated by gradePublishMode).
// Epic:    US-E13.1 (FE) / US-060 (BE)
// Model:   Columns sourced from the DR-001 AssessmentScheme. Each component
//          column may repeat `count` times in the grade book (e.g. TX ×2).
//          Cell states (FIX-04): DRAFT — local edit, unsaved; PUBLISHED — saved
//          by teacher; LOCKED — admin-locked, not editable.
//          gradePublishMode is a tenant setting:
//            'AUTO'           — saved cell auto-published.
//            'ADMIN_APPROVAL' — students/parents see "chưa công bố" banner
//                               until admin approves the batch.

// ── Shared lookups ──────────────────────────────────────────────────────────

// Five-band rank scale from DR-001 (Thang 10). Used for both row TB rank and
// summary distribution. Bands order matters: [from, to, label, color].
const GB_SCALE = [
  { id: 'xs', vi: 'Xuất sắc',  en: 'Outstanding', from: 9.5, to: 10,  color: T.success },
  { id: 'gi', vi: 'Giỏi',      en: 'Excellent',   from: 8.0, to: 9.4, color: T.primary },
  { id: 'kh', vi: 'Khá',       en: 'Good',        from: 6.5, to: 7.9, color: T.warning },
  { id: 'tb', vi: 'Trung bình', en: 'Average',    from: 5.0, to: 6.4, color: T.textMuted },
  { id: 'ye', vi: 'Yếu',       en: 'Poor',        from: 0,   to: 4.9, color: T.error },
];

const GB_CONDUCT = { vi: 'Tốt', en: 'Excellent', color: T.success };

const GB_KIND_META = {
  TX: { color: T.primary, vi: 'TX', en: 'TX' },
  GK: { color: T.warning, vi: 'GK', en: 'GK' },
  CK: { color: T.error,   vi: 'CK', en: 'CK' },
};

// AssessmentScheme — mirrors DR-001 default (Thông tư 22/2021).
// Each component (kind, count, weight) expands into `count` editable columns;
// each column inherits the component's per-cell weight = weight / count.
const GB_DEFAULT_SCHEME = {
  presetVi: 'Thông tư 22/2021', presetEn: 'Circular 22/2021',
  components: [
    { id: 'cp-tx', kind: 'TX', labelVi: 'Điểm thường xuyên', labelEn: 'Continuous', count: 2, weight: 20 },
    { id: 'cp-gk', kind: 'GK', labelVi: 'Giữa kỳ',           labelEn: 'Midterm',    count: 1, weight: 30 },
    { id: 'cp-ck', kind: 'CK', labelVi: 'Cuối kỳ',           labelEn: 'Final',      count: 1, weight: 50 },
  ],
};

// Expand a scheme into the flat column list rendered by the table.
const gbExpandColumns = (scheme) =>
  scheme.components.flatMap(cp =>
    Array.from({ length: cp.count }, (_, i) => ({
      colKey: cp.count > 1 ? `${cp.id}-${i + 1}` : cp.id,
      labelVi: cp.count > 1 ? `${cp.kind}${i + 1}` : cp.kind,
      labelEn: cp.count > 1 ? `${cp.kind}${i + 1}` : cp.kind,
      titleVi: cp.count > 1 ? `${cp.labelVi} ${i + 1}` : cp.labelVi,
      titleEn: cp.count > 1 ? `${cp.labelEn} ${i + 1}` : cp.labelEn,
      kind: cp.kind,
      weight: cp.weight / cp.count,   // per-cell weight share
      coefficient: cp.weight / cp.count / 10,  // display only
    }))
  );

// School-side gradePublishMode (would come from tenant settings).
const GB_PUBLISH_MODE = 'ADMIN_APPROVAL';

// Teacher subject offerings (which classes a teacher teaches).
const GB_TEACHER_OFFERINGS = [
  { subjectId: 'sub-math-10', subjectVi: 'Toán lớp 10', subjectEn: 'Math · G10', classKeys: ['cls-10a1', 'cls-10a2'] },
  { subjectId: 'sub-math-11', subjectVi: 'Toán lớp 11', subjectEn: 'Math · G11', classKeys: ['cls-11b2'] },
];
const GB_TERMS = [
  { id: 'HK1', vi: 'Học kỳ 1', en: 'Term 1' },
  { id: 'HK2', vi: 'Học kỳ 2', en: 'Term 2' },
];

// Seed grades for (classKey, subjectId, term) → studentId → cells map.
// `cells[colKey] = { value, state }`. State ∈ DRAFT | PUBLISHED | LOCKED.
const gbSeed = (() => {
  const roster = (window.ROSTER_BY_CLASS || {})['cls-10a1'] || [];
  const columns = gbExpandColumns(GB_DEFAULT_SCHEME);
  // Deterministic pseudo-random fill across the roster.
  const grades = {};
  roster.forEach((s, idx) => {
    const cells = {};
    // First 15 students complete; next 13 have TX1 only; last 4 blank.
    if (idx < 15) {
      columns.forEach((c, i) => {
        const base = 5 + ((idx * 7 + i * 13) % 50) / 10;  // 5.0..9.9
        cells[c.colKey] = { value: Math.min(10, Math.max(3, Math.round(base * 10) / 10)), state: 'PUBLISHED' };
      });
    } else if (idx < 28) {
      const v = 6 + ((idx * 5) % 30) / 10;
      cells['cp-tx-1'] = { value: Math.round(v * 10) / 10, state: 'PUBLISHED' };
    }
    grades[s.id] = cells;
  });
  return { 'cls-10a1|sub-math-10|HK1': grades };
})();

// ── Helpers ─────────────────────────────────────────────────────────────────

const gbRank = (avg) => {
  if (avg == null) return null;
  return GB_SCALE.find(b => avg >= b.from && avg <= b.to) || GB_SCALE[GB_SCALE.length - 1];
};

const gbWeightedAvg = (cells, columns) => {
  let sumW = 0, sumWV = 0;
  let entered = 0;
  for (const c of columns) {
    const cell = cells?.[c.colKey];
    if (cell && cell.value != null && cell.value !== '') {
      sumW += c.weight;
      sumWV += c.weight * Number(cell.value);
      entered += 1;
    }
  }
  if (entered < columns.length) return null;  // require complete row
  return sumW ? sumWV / sumW : null;
};

const gbScoreColor = (v) =>
  v == null || v === '' ? T.textMuted
  : v < 5 ? T.error
  : v >= 8 ? T.success
  : T.textPrimary;

// ── Main screen ─────────────────────────────────────────────────────────────

const GradeBookScreen = ({ role, lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  if (role === 'teacher')                                  return <TeacherGradeBook t={t} pColor={pColor} onNavigate={onNavigate} />;
  if (role === 'principal')                                return <PrincipalGradeBook t={t} pColor={pColor} onNavigate={onNavigate} />;
  if (role === 'student' || role === 'parent')             return <ViewerGradeBook t={t} pColor={pColor} role={role} onNavigate={onNavigate} />;
  return null;
};

// ── TEACHER VIEW ─────────────────────────────────────────────────────────────

const TeacherGradeBook = ({ t, pColor, onNavigate }) => {
  const [subjectId, setSubjectId] = React.useState(GB_TEACHER_OFFERINGS[0].subjectId);
  const offering = GB_TEACHER_OFFERINGS.find(o => o.subjectId === subjectId);
  const [classKey, setClassKey] = React.useState(offering.classKeys[0]);
  const [term, setTerm] = React.useState('HK1');
  const [showSummary, setShowSummary] = React.useState(true);

  // Sync class when subject changes.
  React.useEffect(() => {
    if (!offering.classKeys.includes(classKey)) setClassKey(offering.classKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const scheme = GB_DEFAULT_SCHEME;
  const columns = React.useMemo(() => gbExpandColumns(scheme), [scheme]);
  const seedKey = `${classKey}|${subjectId}|${term}`;
  const roster  = (window.ROSTER_BY_CLASS || {})[classKey] || [];
  const className = (window.ROSTER_CLASSES || []).find(c => c.id === classKey)?.name || classKey;

  // ── Grades state: persisted + draft. ──
  const [persisted, setPersisted] = React.useState(() => gbSeed[seedKey] || {});
  const [draft, setDraft] = React.useState({});       // unsaved cell edits
  const [toast, setToast] = React.useState(null);

  // Reload when (class/subject/term) changes.
  React.useEffect(() => {
    setPersisted(gbSeed[seedKey] || {});
    setDraft({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  // Resolve a row's cells = persisted ∪ draft overrides.
  const cellsFor = (studentId) => {
    const base = persisted[studentId] || {};
    const ovr  = draft[studentId] || {};
    return { ...base, ...ovr };
  };

  const updateCell = (studentId, colKey, raw) => {
    // Allow blanking to clear.
    const v = raw === '' ? '' : Math.max(0, Math.min(10, Math.round(parseFloat(raw) * 10) / 10));
    if (raw !== '' && Number.isNaN(parseFloat(raw))) return;
    setDraft(d => ({
      ...d,
      [studentId]: {
        ...(d[studentId] || {}),
        [colKey]: { value: v, state: 'DRAFT' },
      },
    }));
  };

  const hasUnsaved = React.useMemo(
    () => Object.values(draft).some(row => Object.keys(row || {}).length > 0),
    [draft]
  );

  const enteredCount = roster.filter(s => {
    const cells = cellsFor(s.id);
    return columns.some(c => {
      const cell = cells[c.colKey];
      return cell && cell.value != null && cell.value !== '';
    });
  }).length;

  const completeRows = roster.filter(s => gbWeightedAvg(cellsFor(s.id), columns) != null).length;

  const handleSaveAll = () => {
    setPersisted(p => {
      const next = { ...p };
      Object.entries(draft).forEach(([sid, row]) => {
        next[sid] = { ...(next[sid] || {}) };
        Object.entries(row).forEach(([col, cell]) => {
          // Saved cell transitions DRAFT → PUBLISHED (per gradePublishMode = AUTO
          // would be PUBLISHED immediately; under ADMIN_APPROVAL it stays
          // PUBLISHED but is hidden from parents/students until approved).
          if (cell.value === '') delete next[sid][col];
          else next[sid][col] = { value: cell.value, state: 'PUBLISHED' };
        });
      });
      return next;
    });
    setDraft({});
    setToast('saved');
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', position: 'relative', paddingBottom: 96 }}>
      <div style={{ padding: '28px 32px 0', maxWidth: 1280, margin: '0 auto' }}>
        <TitleRow t={t} pColor={pColor} role="teacher"
          subtitle={t('Nhập điểm theo cột đánh giá. Lưu để công bố theo cấu hình của trường.',
                      'Enter grades per assessment column. Save to publish per school policy.')}
          right={hasUnsaved && <UnsavedDot t={t} />}
        />

        {/* Filter bar */}
        <FilterBar t={t} pColor={pColor}
          offerings={GB_TEACHER_OFFERINGS} offering={offering}
          subjectId={subjectId} setSubjectId={setSubjectId}
          classKey={classKey} setClassKey={setClassKey}
          term={term} setTerm={setTerm}
        />

        {/* Empty class state */}
        {roster.length === 0 ? (
          <EmptyRosterCard t={t} pColor={pColor} className={className}
            onNavigate={() => onNavigate && onNavigate('roster')} />
        ) : (
          <>
            <GradeTable
              t={t} pColor={pColor}
              roster={roster} columns={columns}
              cellsFor={cellsFor}
              draft={draft}
              onChange={updateCell}
              editable
            />

            {/* Summary panel */}
            <SummaryPanel
              t={t} pColor={pColor}
              roster={roster} columns={columns}
              cellsFor={cellsFor}
              open={showSummary} setOpen={setShowSummary}
            />
          </>
        )}
      </div>

      {/* Sticky actions */}
      {roster.length > 0 && (
        <StickyActions
          t={t} pColor={pColor} hasUnsaved={hasUnsaved}
          enteredCount={enteredCount} totalCount={roster.length}
          completeRows={completeRows}
          onSave={handleSaveAll}
          onExportExcel={() => setToast('xlsx')}
          onExportPdf={() => setToast('pdf')}
        />
      )}

      {toast && <GBToast t={t} kind={toast} onDone={() => setToast(null)} />}
    </div>
  );
};

// ── PRINCIPAL VIEW (read-only aggregate) ─────────────────────────────────────

const PrincipalGradeBook = ({ t, pColor, onNavigate }) => {
  const [subjectId, setSubjectId] = React.useState(GB_TEACHER_OFFERINGS[0].subjectId);
  const offering = GB_TEACHER_OFFERINGS.find(o => o.subjectId === subjectId);
  const [classKey, setClassKey] = React.useState(offering.classKeys[0]);
  const [term, setTerm] = React.useState('HK1');

  React.useEffect(() => {
    if (!offering.classKeys.includes(classKey)) setClassKey(offering.classKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const scheme = GB_DEFAULT_SCHEME;
  const columns = React.useMemo(() => gbExpandColumns(scheme), [scheme]);
  const seedKey = `${classKey}|${subjectId}|${term}`;
  const roster = (window.ROSTER_BY_CLASS || {})[classKey] || [];
  const grades = gbSeed[seedKey] || {};
  const cellsFor = (sid) => grades[sid] || {};

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <TitleRow t={t} pColor={pColor} role="principal"
          subtitle={t('Tổng hợp bảng điểm các lớp. Duyệt & khoá tại màn riêng.',
                      'Aggregate view of class grade books. Approve & lock on the dedicated screen.')}
          right={
            <Button variant="secondary" icon="arrowRight"
              onClick={() => onNavigate && onNavigate('grades-approval')}>
              {t('Mở màn Duyệt & khoá', 'Open Approval & Lock')}
            </Button>
          }
        />

        <FilterBar t={t} pColor={pColor}
          offerings={GB_TEACHER_OFFERINGS} offering={offering}
          subjectId={subjectId} setSubjectId={setSubjectId}
          classKey={classKey} setClassKey={setClassKey}
          term={term} setTerm={setTerm}
        />

        {roster.length === 0 ? (
          <EmptyRosterCard t={t} pColor={pColor}
            className={classKey}
            onNavigate={() => onNavigate && onNavigate('roster')} />
        ) : (
          <>
            <GradeTable
              t={t} pColor={pColor}
              roster={roster} columns={columns}
              cellsFor={cellsFor}
              draft={{}} onChange={() => {}}
              editable={false}
            />
            <SummaryPanel
              t={t} pColor={pColor}
              roster={roster} columns={columns}
              cellsFor={cellsFor}
              open={true} setOpen={() => {}}
              alwaysOpen
            />
          </>
        )}
      </div>
    </div>
  );
};

// ── STUDENT / PARENT VIEW ────────────────────────────────────────────────────

// Per-child grade book seed. Each child has their own subject list + per-subject
// cell scores (4-column scheme: cp-tx-1, cp-tx-2, cp-gk, cp-ck). Switching the
// `ChildSwitcher` picks a key here; the table + GPA summary recompute from it.
//
// Child 0 — Nguyễn Minh Khoa, 11A2 (grade 11, strong student, full HK1).
// Child 1 — Nguyễn Thu Hà,  8B1   (grade 8, fewer subjects, slightly easier curriculum,
//                                  higher absolute GPA — matches ParentScreen seed 9.1).
//
// One row per child has `cp-gk`/`cp-ck` still null to exercise the "chưa công bố"
// pending-publish state in the read-only viewer.
const VIEWER_DATA_BY_CHILD = {
  0: {
    subjects: [
      { id: 'sub-math-11', vi: 'Toán',      en: 'Math',       teacher: 'Nguyễn Thị Hương' },
      { id: 'sub-lit-11',  vi: 'Ngữ Văn',   en: 'Literature', teacher: 'Phạm Quốc Bảo' },
      { id: 'sub-eng-11',  vi: 'Tiếng Anh', en: 'English',    teacher: 'Đỗ Thị Mai' },
      { id: 'sub-phy-11',  vi: 'Vật Lý',    en: 'Physics',    teacher: 'Trần Văn Minh' },
      { id: 'sub-chem-11', vi: 'Hoá Học',   en: 'Chemistry',  teacher: 'Lê Thị Hoa' },
      { id: 'sub-his-11',  vi: 'Lịch Sử',   en: 'History',    teacher: 'Vũ Văn Tài' },
    ],
    cells: {
      'sub-math-11': { 'cp-tx-1': 9,   'cp-tx-2': 8,   'cp-gk': 8.5, 'cp-ck': 9   },
      'sub-lit-11':  { 'cp-tx-1': 7,   'cp-tx-2': 8,   'cp-gk': 7.5, 'cp-ck': 8   },
      'sub-eng-11':  { 'cp-tx-1': 9,   'cp-tx-2': 9,   'cp-gk': 9,   'cp-ck': 9.5 },
      'sub-phy-11':  { 'cp-tx-1': 8,   'cp-tx-2': 9,   'cp-gk': 8.5, 'cp-ck': 9   },
      'sub-chem-11': { 'cp-tx-1': 7,   'cp-tx-2': 7,   'cp-gk': 8,   'cp-ck': 8   },
      'sub-his-11':  { 'cp-tx-1': 8,   'cp-tx-2': 8,   'cp-gk': null,'cp-ck': null }, // pending publish
    },
  },
  1: {
    subjects: [
      { id: 'sub-math-8',  vi: 'Toán',      en: 'Math',       teacher: 'Phan Thị Lan' },
      { id: 'sub-lit-8',   vi: 'Ngữ Văn',   en: 'Literature', teacher: 'Trần Bích Vân' },
      { id: 'sub-eng-8',   vi: 'Tiếng Anh', en: 'English',    teacher: 'Bùi Quang Huy' },
      { id: 'sub-bio-8',   vi: 'Sinh Học',  en: 'Biology',    teacher: 'Nguyễn Hồng Vân' },
      { id: 'sub-his-8',   vi: 'Lịch Sử',   en: 'History',    teacher: 'Đào Thuỳ Linh' },
    ],
    cells: {
      'sub-math-8':  { 'cp-tx-1': 9.5, 'cp-tx-2': 9,   'cp-gk': 9,   'cp-ck': 9.5 },
      'sub-lit-8':   { 'cp-tx-1': 9,   'cp-tx-2': 8.5, 'cp-gk': 9,   'cp-ck': 9   },
      'sub-eng-8':   { 'cp-tx-1': 10,  'cp-tx-2': 9.5, 'cp-gk': 9.5, 'cp-ck': 9.5 },
      'sub-bio-8':   { 'cp-tx-1': 9,   'cp-tx-2': 9,   'cp-gk': 8.5, 'cp-ck': 9   },
      'sub-his-8':   { 'cp-tx-1': 9,   'cp-tx-2': 8,   'cp-gk': null,'cp-ck': null }, // pending publish
    },
  },
};

const VIEWER_CHILDREN = [
  { id: 'c1', name: 'Nguyễn Minh Khoa', avatar: 'NK', color: T.primary, classId: '11A2' },
  { id: 'c2', name: 'Nguyễn Thu Hà',    avatar: 'NH', color: T.success, classId: '8B1'  },
];

const ViewerGradeBook = ({ t, pColor, role, onNavigate }) => {
  const isParent = role === 'parent';
  const [childIdx, setChildIdx] = React.useState(0);
  const [term, setTerm] = React.useState('HK1');

  const columns = React.useMemo(() => gbExpandColumns(GB_DEFAULT_SCHEME), []);

  // STUDENT views child 0 (their own record — Nguyễn Minh Khoa).
  // PARENT swaps datasets via childIdx.
  const activeIdx = isParent ? childIdx : 0;
  const dataset   = VIEWER_DATA_BY_CHILD[activeIdx] || VIEWER_DATA_BY_CHILD[0];

  // Build subject rows from the SELECTED child's data.
  const rows = dataset.subjects.map(s => {
    const cells = {};
    Object.entries(dataset.cells[s.id] || {}).forEach(([k, v]) => {
      cells[k] = { value: v, state: 'PUBLISHED' };
    });
    return { subject: s, cells };
  });

  // Aggregate GPA (semester average across complete subjects).
  const subjectAvgs = rows.map(r => gbWeightedAvg(r.cells, columns));
  const completeAvgs = subjectAvgs.filter(a => a != null);
  const gpa = completeAvgs.length
    ? completeAvgs.reduce((a, b) => a + b, 0) / completeAvgs.length
    : null;
  const rank = gbRank(gpa);

  // Publish gate: any row with null values & ADMIN_APPROVAL mode → "chưa công bố".
  const allPublished = subjectAvgs.every(a => a != null);
  const isLocked = GB_PUBLISH_MODE === 'ADMIN_APPROVAL' && !allPublished;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <TitleRow t={t} pColor={pColor} role={role}
          subtitle={isParent
            ? t('Bảng điểm của con bạn theo từng học kỳ. Bạn có thể nhắn tin trực tiếp với giáo viên bộ môn.',
                "Your child's grades by term. Message subject teachers directly.")
            : t('Bảng điểm cá nhân theo học kỳ.', 'Personal grade book by term.')
          }
          right={null}
        />

        {/* Top row: child selector (parent) + term + summary card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isParent ? 'minmax(0, 1fr) auto auto' : 'minmax(0, 1fr) auto',
          gap: 14, alignItems: 'stretch', marginBottom: 18,
        }}>
          <ViewerSummaryCard
            t={t} pColor={pColor}
            gpa={gpa} rank={rank} term={term} isLocked={isLocked}
          />
          {isParent && (
            <ChildSwitcher t={t} pColor={pColor}
              children={VIEWER_CHILDREN}
              activeIdx={childIdx} onChange={setChildIdx} />
          )}
          <TermPicker t={t} pColor={pColor} term={term} setTerm={setTerm} />
        </div>

        {/* Lock banner */}
        {isLocked && <LockedBanner t={t} />}

        {/* Subject table */}
        <ViewerSubjectTable
          t={t} pColor={pColor}
          rows={rows} columns={columns}
          masked={isLocked}
        />

        {isParent && (
          <div style={{
            marginTop: 14, padding: '12px 16px',
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 12.5, color: T.textSecondary,
          }}>
            <Icon name="message" size={14} color={pColor} />
            {t('Có thắc mắc về điểm? Liên hệ giáo viên bộ môn qua tin nhắn.',
               'Questions about a grade? Reach out to subject teachers via messaging.')}
            <span style={{ flex: 1 }} />
            <Button variant="secondary" icon="message"
              onClick={() => onNavigate && onNavigate('messaging')}>
              {t('Liên hệ giáo viên', 'Contact teachers')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Title row ────────────────────────────────────────────────────────────────

const TitleRow = ({ t, pColor, role, subtitle, right }) => {
  const titleVi = role === 'teacher'   ? 'Bảng điểm — Nhập điểm'
              : role === 'principal' ? 'Bảng điểm — Tổng hợp'
              :                        'Bảng điểm';
  const titleEn = role === 'teacher'   ? 'Grade Book — Entry'
              : role === 'principal' ? 'Grade Book — Aggregate'
              :                        'Grade Book';
  const roleBadgeColor = role === 'principal' ? T.error
                       : role === 'teacher'   ? pColor
                       : role === 'parent'    ? T.purple
                       :                        T.success;
  const roleVi = ({ teacher: 'TEACHER · GVBM', principal: 'ADMIN · BGH', student: 'HỌC SINH', parent: 'PHỤ HUYNH' })[role];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: pColor + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name="penLine" size={22} color={pColor} strokeWidth={1.8} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
          {t(titleVi, titleEn)}
        </div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>{subtitle}</div>
      </div>
      <Badge color={roleBadgeColor}>
        <Icon name="shield" size={11} color={roleBadgeColor} strokeWidth={2.4} />
        {roleVi}
      </Badge>
      {right}
    </div>
  );
};

const UnsavedDot = ({ t }) => (
  <span title={t('Có thay đổi chưa lưu', 'Unsaved changes')} style={{
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '5px 12px', borderRadius: 99,
    background: T.warningLight, color: '#9A6A0F',
    border: `1px solid ${T.warning}55`,
    fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em',
  }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.warning, animation: 'gb-pulse 1.4s ease-in-out infinite' }} />
    {t('Có thay đổi chưa lưu', 'Unsaved changes')}
    <style>{`@keyframes gb-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
  </span>
);

// ── Filter bar (teacher / principal) ─────────────────────────────────────────

const FilterBar = ({ t, pColor, offerings, offering, subjectId, setSubjectId, classKey, setClassKey, term, setTerm }) => {
  const Field = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
    </div>
  );
  const selectStyle = {
    padding: '9px 32px 9px 12px', borderRadius: 8,
    border: `1.5px solid ${T.border}`, background: T.card,
    fontSize: 13.5, fontWeight: 700, color: T.textPrimary,
    cursor: 'pointer', fontFamily: 'inherit', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><polyline points='1,1 5,5 9,1' fill='none' stroke='%238898A9' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
    width: '100%',
  };
  const classNames = (window.ROSTER_CLASSES || []);
  const classLabel = (k) => classNames.find(c => c.id === k)?.name || k;
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '16px 20px', marginBottom: 16,
      display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 14, alignItems: 'end',
    }}>
      <Field label={t('Môn (theo khối)', 'Subject (grade-scoped)')}>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={selectStyle}>
          {offerings.map(o => <option key={o.subjectId} value={o.subjectId}>{t(o.subjectVi, o.subjectEn)}</option>)}
        </select>
      </Field>
      <Field label={t('Lớp', 'Class')}>
        <select value={classKey} onChange={(e) => setClassKey(e.target.value)} style={selectStyle}>
          {offering.classKeys.map(k => <option key={k} value={k}>{classLabel(k)}</option>)}
        </select>
      </Field>
      <Field label={t('Học kỳ', 'Term')}>
        <select value={term} onChange={(e) => setTerm(e.target.value)} style={selectStyle}>
          {GB_TERMS.map(o => <option key={o.id} value={o.id}>{t(o.vi, o.en)}</option>)}
        </select>
      </Field>
    </div>
  );
};

// ── Grade table (shared by teacher + principal) ──────────────────────────────

const GradeTable = ({ t, pColor, roster, columns, cellsFor, draft, onChange, editable }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
  }}>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={gbTh}>{t('STT', '#')}</th>
            <th style={{ ...gbTh, textAlign: 'left', paddingLeft: 16, minWidth: 200 }}>
              {t('Họ tên học sinh', 'Student name')}
            </th>
            {columns.map(c => {
              const km = GB_KIND_META[c.kind];
              return (
                <th key={c.colKey} style={{
                  padding: '10px 8px 12px', textAlign: 'center', minWidth: 70,
                  background: km.color + '14', borderBottom: `2px solid ${km.color}55`,
                  verticalAlign: 'bottom',
                }} title={t(c.titleVi, c.titleEn)}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: km.color,
                      background: km.color + '22', padding: '2px 6px', borderRadius: 4,
                      letterSpacing: '0.06em',
                    }}>{c.labelVi}</span>
                    <span style={{ fontSize: 9.5, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                      ×{(c.coefficient).toFixed(1)}
                    </span>
                  </div>
                </th>
              );
            })}
            <th style={{ ...gbTh, background: T.bg, borderBottom: `2px solid ${T.border}` }}>
              {t('TB', 'Avg')}
            </th>
            <th style={{ ...gbTh, background: T.bg, borderBottom: `2px solid ${T.border}`, minWidth: 90 }}>
              {t('Xếp loại', 'Rank')}
            </th>
          </tr>
        </thead>
        <tbody>
          {roster.map((s, ri) => {
            const cells = cellsFor(s.id);
            const avg = gbWeightedAvg(cells, columns);
            const rank = gbRank(avg);
            const hasDraftRow = !!(draft && draft[s.id] && Object.keys(draft[s.id]).length);
            return (
              <tr key={s.id} style={{
                background: hasDraftRow ? '#FFFBEB' : (ri % 2 === 1 ? '#FBFCFE' : T.card),
              }}>
                <td style={{ ...gbTd, textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{ri + 1}</span>
                </td>
                <td style={{ ...gbTd, paddingLeft: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar
                      initials={s.name.split(' ').slice(-1)[0][0]}
                      color={pColor} size={28}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{s.name}</div>
                      <div style={{ fontSize: 10.5, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        {s.id}
                      </div>
                    </div>
                  </div>
                </td>
                {columns.map(c => (
                  <GradeCell key={c.colKey}
                    cell={cells[c.colKey]}
                    onChange={(v) => onChange(s.id, c.colKey, v)}
                    editable={editable}
                    pColor={pColor}
                  />
                ))}
                <td style={{ ...gbTd, textAlign: 'center', background: T.bg, borderLeft: `1px solid ${T.border}` }}>
                  <span style={{
                    fontSize: 14, fontWeight: 800,
                    color: rank ? rank.color : T.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {avg != null ? avg.toFixed(2) : '—'}
                  </span>
                </td>
                <td style={{ ...gbTd, textAlign: 'center', background: T.bg }}>
                  {rank
                    ? <Badge color={rank.color}>{t(rank.vi, rank.en)}</Badge>
                    : <span style={{ fontSize: 11, color: T.textMuted }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const gbTh = {
  padding: '12px 12px', textAlign: 'center',
  fontSize: 11, fontWeight: 800, color: T.textMuted,
  background: T.bg, borderBottom: `1px solid ${T.border}`,
  letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
};
const gbTd = {
  padding: '8px 10px',
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: 'middle',
};

// ── Editable cell ────────────────────────────────────────────────────────────

const GradeCell = ({ cell, onChange, editable, pColor }) => {
  const v = cell?.value;
  const state = cell?.state;
  const [focused, setFocused] = React.useState(false);
  const isLocked = state === 'LOCKED';

  if (!editable || isLocked) {
    return (
      <td style={{ ...gbTd, textAlign: 'center', padding: '6px 4px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 44, padding: '4px 8px', borderRadius: 6,
          fontSize: 13.5, fontWeight: 700,
          color: gbScoreColor(v),
          background: isLocked ? T.errorLight : 'transparent',
          fontVariantNumeric: 'tabular-nums',
        }} title={state}>
          {v == null || v === '' ? '—' : v}
          {isLocked && <Icon name="lock" size={10} color={T.error} style={{ marginLeft: 4 }} />}
        </span>
      </td>
    );
  }

  return (
    <td style={{ ...gbTd, textAlign: 'center', padding: '4px' }}>
      <div style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <input
          type="text" inputMode="decimal"
          value={v == null ? '' : v}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => { setFocused(true); e.target.select(); }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Tab') e.currentTarget.blur();
            if (e.key === 'Escape') { e.currentTarget.blur(); }
          }}
          style={{
            width: 56, padding: '6px 8px', textAlign: 'center',
            border: `1.5px solid ${focused ? pColor : (v == null || v === '' ? T.border : T.border)}`,
            borderRadius: 6,
            background: state === 'DRAFT' ? '#FFFBEB' : T.card,
            fontSize: 13.5, fontWeight: 700,
            color: gbScoreColor(v),
            fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
            outline: 'none', transition: 'border-color 0.12s',
          }}
        />
        {state === 'DRAFT' && !focused && (
          <span title="DRAFT" style={{
            position: 'absolute', top: -2, right: -2,
            width: 6, height: 6, borderRadius: '50%',
            background: T.warning,
          }} />
        )}
      </div>
    </td>
  );
};

// ── Summary panel ────────────────────────────────────────────────────────────

const SummaryPanel = ({ t, pColor, roster, columns, cellsFor, open, setOpen, alwaysOpen }) => {
  const dist = GB_SCALE.map(b => ({ ...b, count: 0 }));
  let sum = 0, count = 0;
  let highest = null, lowest = null;
  roster.forEach(s => {
    const avg = gbWeightedAvg(cellsFor(s.id), columns);
    if (avg == null) return;
    const rank = gbRank(avg);
    const bucket = dist.find(b => b.id === rank.id);
    if (bucket) bucket.count += 1;
    sum += avg; count += 1;
    if (highest == null || avg > highest.avg) highest = { name: s.name, avg };
    if (lowest  == null || avg < lowest.avg)  lowest  = { name: s.name, avg };
  });
  const classAvg = count ? sum / count : null;
  const max = Math.max(1, ...dist.map(b => b.count));
  const isOpen = alwaysOpen || open;

  return (
    <div style={{
      marginTop: 16,
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <button onClick={() => !alwaysOpen && setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'transparent', border: 'none', cursor: alwaysOpen ? 'default' : 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}>
        <Icon name="chart" size={16} color={pColor} strokeWidth={2.2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>
            {t('Tổng quan xếp loại', 'Rank distribution')}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
            {t(`Dựa trên ${count} học sinh có đủ điểm.`, `Based on ${count} students with complete grades.`)}
          </div>
        </div>
        {!alwaysOpen && <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={14} color={T.textMuted} />}
      </button>

      {isOpen && (
        <div style={{
          padding: '0 18px 18px',
          display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24,
        }}>
          {/* Histogram */}
          <div>
            <div style={{
              fontSize: 10.5, fontWeight: 800, color: T.textMuted,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              {t('Phân bố xếp loại', 'Distribution')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {dist.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 92, fontSize: 12, fontWeight: 700, color: T.textSecondary,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                    {t(b.vi, b.en)}
                  </span>
                  <div style={{ flex: 1, position: 'relative', height: 18 }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: '100%', transformOrigin: 'left', transform: `scaleX(${b.count / max})`,
                      background: b.color, borderRadius: 4,
                      transition: 'transform 0.3s',
                      opacity: b.count === 0 ? 0.15 : 1,
                    }} />
                  </div>
                  <span style={{
                    width: 32, textAlign: 'right',
                    fontSize: 13, fontWeight: 800, color: b.color,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aggregate stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatBox label={t('TB lớp', 'Class average')}
              value={classAvg != null ? classAvg.toFixed(2) : '—'}
              color={gbRank(classAvg)?.color || T.textMuted}
              icon="chart"
            />
            <StatBox label={t('Cao nhất', 'Highest')}
              value={highest ? highest.avg.toFixed(2) : '—'}
              caption={highest?.name} color={T.success} icon="trendUp"
            />
            <StatBox label={t('Thấp nhất', 'Lowest')}
              value={lowest ? lowest.avg.toFixed(2) : '—'}
              caption={lowest?.name} color={T.error} icon="trendDown"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, value, caption, color, icon }) => (
  <div style={{
    padding: '12px 14px', borderRadius: 10,
    background: color + '0F', border: `1px solid ${color}22`,
    display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: color + '22', color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={icon} size={15} color={color} strokeWidth={2.2} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      {caption && (
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {caption}
        </div>
      )}
    </div>
  </div>
);

// ── Sticky actions (teacher) ─────────────────────────────────────────────────

const StickyActions = ({ t, pColor, hasUnsaved, enteredCount, totalCount, completeRows, onSave, onExportExcel, onExportPdf }) => (
  <div style={{
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
    background: T.card, borderTop: `1px solid ${T.border}`,
    boxShadow: '0 -4px 16px rgba(20,30,50,0.06)',
    padding: '14px 32px',
  }}>
    <div style={{
      maxWidth: 1280, margin: '0 auto',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: 8,
        background: T.bg, border: `1px solid ${T.border}`,
      }}>
        <Icon name="userCheck" size={13} color={pColor} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          {t('Đã nhập', 'Entered')}{' '}
          <strong style={{ color: T.textPrimary, fontWeight: 800 }}>
            {enteredCount}
          </strong>
          {' / '}{totalCount}{' '}{t('học sinh', 'students')}
        </span>
      </div>
      <span style={{ fontSize: 12, color: T.textMuted }}>
        <strong style={{ color: T.success, fontWeight: 800 }}>{completeRows}</strong>{' '}
        {t('hàng đủ điểm', 'complete rows')}
      </span>

      <span style={{ flex: 1 }} />

      <Button variant="ghost" icon="fileText" onClick={onExportPdf}
        style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
        {t('Xuất PDF báo cáo', 'Export PDF report')}
      </Button>
      <Button variant="secondary" icon="download" onClick={onExportExcel}>
        {t('Xuất Excel', 'Export Excel')}
      </Button>
      <Button variant="primary" icon="check" onClick={onSave} disabled={!hasUnsaved}>
        {t('Lưu tất cả', 'Save all')}
      </Button>
    </div>
  </div>
);

// ── Toast (teacher feedback) ────────────────────────────────────────────────

const GBToast = ({ t, kind }) => {
  const map = {
    saved: { color: T.success, icon: 'check', vi: 'Đã lưu tất cả thay đổi.', en: 'All changes saved.' },
    xlsx:  { color: T.primary, icon: 'download', vi: 'Đang chuẩn bị file Excel…', en: 'Preparing Excel file…' },
    pdf:   { color: T.warning, icon: 'fileText', vi: 'Đang tạo báo cáo PDF…', en: 'Generating PDF report…' },
  };
  const m = map[kind] || map.saved;
  return (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      background: T.textPrimary, color: '#fff',
      padding: '11px 18px', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
      fontSize: 13, fontWeight: 600, zIndex: 9000,
      animation: 'gb-toast-in 0.2s ease-out',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: m.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={m.icon} size={12} color="#fff" strokeWidth={2.6} />
      </div>
      {t(m.vi, m.en)}
      <style>{`@keyframes gb-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </div>
  );
};

// ── Empty roster ────────────────────────────────────────────────────────────

const EmptyRosterCard = ({ t, pColor, className, onNavigate }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '46px 24px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="users" size={36} color={T.border} strokeWidth={1.6} />
    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: T.textSecondary }}>
      {t(`Lớp ${className} chưa có danh sách học sinh.`, `Class ${className} has no student roster yet.`)}
    </div>
    <div style={{ marginTop: 4, fontSize: 12, marginBottom: 16 }}>
      {t('Bạn cần thêm học sinh vào lớp trước khi nhập điểm.',
         'Add students to the class before entering grades.')}
    </div>
    <Button variant="primary" icon="arrowRight" onClick={onNavigate}>
      {t('Đến Danh sách lớp', 'Go to Class Roster')}
    </Button>
  </div>
);

// ── Viewer summary card ─────────────────────────────────────────────────────

const ViewerSummaryCard = ({ t, pColor, gpa, rank, term, isLocked }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    padding: '18px 22px',
    display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 12, flexShrink: 0,
      background: (rank?.color || pColor) + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="award" size={26} color={rank?.color || pColor} strokeWidth={1.8} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {t('GPA học kỳ', 'Term GPA')} · {term}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize: 32, fontWeight: 900,
          color: isLocked ? T.textMuted : (rank?.color || T.textPrimary),
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {isLocked ? '—' : (gpa != null ? gpa.toFixed(2) : '—')}
        </span>
        <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 700 }}>/ 10</span>
      </div>
    </div>
    <div style={{ flex: 1 }} />
    <div style={{ display: 'flex', gap: 10 }}>
      <ViewerChip label={t('Xếp loại học lực', 'Academic rank')}
        value={isLocked ? '—' : (rank ? t(rank.vi, rank.en) : '—')}
        color={isLocked ? T.textMuted : (rank?.color || T.textMuted)}
      />
      <ViewerChip label={t('Hạnh kiểm', 'Conduct')}
        value={t(GB_CONDUCT.vi, GB_CONDUCT.en)} color={GB_CONDUCT.color}
      />
    </div>
  </div>
);

const ViewerChip = ({ label, value, color }) => (
  <div style={{
    padding: '8px 14px', borderRadius: 10,
    background: color + '14', border: `1px solid ${color}33`,
    minWidth: 110,
  }}>
    <div style={{ fontSize: 9.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: 14, fontWeight: 800, color, marginTop: 2 }}>
      {value}
    </div>
  </div>
);

const ChildSwitcher = ({ t, pColor, children, activeIdx, onChange }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    padding: 12, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180,
  }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {t('Chọn con', 'Pick child')}
    </div>
    {children.map((c, i) => {
      const active = i === activeIdx;
      return (
        <button key={c.id} onClick={() => onChange(i)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', borderRadius: 8,
            border: `1.5px solid ${active ? c.color : T.border}`,
            background: active ? c.color + '14' : T.card,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
          <Avatar initials={c.avatar} color={c.color} size={26} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.2 }}>{c.name}</div>
            <div style={{ fontSize: 10.5, color: T.textMuted }}>{c.classId}</div>
          </div>
        </button>
      );
    })}
  </div>
);

const TermPicker = ({ t, pColor, term, setTerm }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    padding: 12, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140,
  }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {t('Học kỳ', 'Term')}
    </div>
    {GB_TERMS.map(o => {
      const active = term === o.id;
      return (
        <button key={o.id} onClick={() => setTerm(o.id)}
          style={{
            padding: '7px 10px', borderRadius: 8, fontFamily: 'inherit',
            border: `1.5px solid ${active ? pColor : T.border}`,
            background: active ? pColor + '14' : T.card,
            color: active ? pColor : T.textSecondary,
            fontSize: 12.5, fontWeight: 800, cursor: 'pointer', textAlign: 'left',
          }}>
          {t(o.vi, o.en)}
        </button>
      );
    })}
  </div>
);

const LockedBanner = ({ t }) => (
  <div style={{
    padding: '14px 16px', marginBottom: 14,
    background: T.warningLight, border: `1px solid ${T.warning}44`,
    borderRadius: 10,
    display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: T.warning + '22',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="lock" size={17} color={T.warning} strokeWidth={2.2} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#9A6A0F' }}>
        {t('Điểm học kỳ này chưa được công bố',
           'Grades for this term have not been published yet')}
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
        {t('Một số môn đang chờ BGH duyệt. Bạn sẽ nhận được thông báo khi điểm được công bố.',
           "Some subjects are awaiting admin approval. You'll be notified once grades go live.")}
      </div>
    </div>
  </div>
);

// ── Viewer subject table ─────────────────────────────────────────────────────

const ViewerSubjectTable = ({ t, pColor, rows, columns, masked }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
  }}>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ ...gbTh, textAlign: 'left', paddingLeft: 18, minWidth: 200 }}>{t('Môn học', 'Subject')}</th>
            {columns.map(c => {
              const km = GB_KIND_META[c.kind];
              return (
                <th key={c.colKey} style={{
                  ...gbTh, background: km.color + '14', borderBottom: `2px solid ${km.color}55`,
                  color: km.color,
                }}>{c.labelVi}</th>
              );
            })}
            <th style={{ ...gbTh, background: T.bg }}>{t('TB', 'Avg')}</th>
            <th style={{ ...gbTh, background: T.bg }}>{t('Xếp loại', 'Rank')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const avg = gbWeightedAvg(r.cells, columns);
            const rank = gbRank(avg);
            const showMasked = masked;
            return (
              <tr key={r.subject.id} style={{ background: ri % 2 === 1 ? '#FBFCFE' : T.card }}>
                <td style={{ ...gbTd, paddingLeft: 18 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>
                    {t(r.subject.vi, r.subject.en)}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                    {t(`GV ${r.subject.teacher}`, `Teacher ${r.subject.teacher}`)}
                  </div>
                </td>
                {columns.map(c => {
                  const cell = r.cells[c.colKey];
                  const v = cell?.value;
                  return (
                    <td key={c.colKey} style={{ ...gbTd, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 13.5, fontWeight: 700,
                        color: showMasked ? T.textMuted : gbScoreColor(v),
                        fontVariantNumeric: 'tabular-nums',
                        filter: showMasked && v != null ? 'blur(5px)' : 'none',
                        userSelect: showMasked ? 'none' : 'auto',
                      }}>
                        {v == null || v === '' ? '—' : v}
                      </span>
                    </td>
                  );
                })}
                <td style={{ ...gbTd, textAlign: 'center', background: T.bg, borderLeft: `1px solid ${T.border}` }}>
                  <span style={{
                    fontSize: 14, fontWeight: 800,
                    color: showMasked ? T.textMuted : (rank?.color || T.textMuted),
                    fontVariantNumeric: 'tabular-nums',
                    filter: showMasked && avg != null ? 'blur(5px)' : 'none',
                  }}>
                    {avg != null ? avg.toFixed(2) : '—'}
                  </span>
                </td>
                <td style={{ ...gbTd, textAlign: 'center', background: T.bg }}>
                  {showMasked || !rank
                    ? <span style={{ fontSize: 11, color: T.textMuted }}>—</span>
                    : <Badge color={rank.color}>{t(rank.vi, rank.en)}</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

Object.assign(window, { GradeBookScreen });
