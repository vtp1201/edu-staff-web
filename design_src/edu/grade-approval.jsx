// ── Grade Approval Screen — /admin/grades/approval ───────────────────────────
// Role:   ADMIN / MANAGER (BGH)
// Epic:   US-060 (approve grades in ADMIN_APPROVAL mode) + US-064 (bulk lock)
// Model:  Each "batch" = grades for one (class, grade-scoped subject, term, year)
//         submitted by a GVBM. Lifecycle: PENDING_APPROVAL → PUBLISHED → LOCKED.
//         LOCKED is the gate condition for signing học bạ — requires two-step
//         confirmation per US-064.

// ── Lookups ──────────────────────────────────────────────────────────────────

const GA_TERMS = [
  { id: 'HK1', vi: 'Học kỳ 1', en: 'Term 1' },
  { id: 'HK2', vi: 'Học kỳ 2', en: 'Term 2' },
];

const GA_YEARS = [
  { id: '2025-2026', label: '2025 — 2026' },
  { id: '2024-2025', label: '2024 — 2025' },
];

const GA_STATUS_META = {
  PENDING_APPROVAL: { vi: 'Chờ duyệt',      en: 'Pending',        color: T.warning,    icon: 'clock', mono: 'PENDING_APPROVAL' },
  PUBLISHED:        { vi: 'Đã công bố',     en: 'Published',      color: T.success,    icon: 'check', mono: 'PUBLISHED' },
  LOCKED:           { vi: 'Đã khoá',        en: 'Locked',         color: T.error,      icon: 'lock',  mono: 'LOCKED' },
  NO_SUBMISSION:    { vi: 'Chưa nộp',       en: 'Not submitted',  color: T.textMuted,  icon: 'clock', mono: 'NO_SUBMISSION' },
};

// Seed batches. Stays as React state so approve / lock mutations stick across
// re-renders for the lifetime of the prototype.
const GA_SEED_BATCHES = [
  {
    id: 'b-10A1-math10-HK1', classId: '10A1', subjectId: 'sub-math-10', term: 'HK1', year: '2025-2026',
    teacher: { name: 'Nguyễn Thị Hương', avatar: 'NH' },
    submittedAtVi: '2 giờ trước', submittedAtEn: '2h ago',
    status: 'PENDING_APPROVAL',
    students: { total: 8, entered: 8, missing: 0 },
  },
  {
    id: 'b-10A2-math10-HK1', classId: '10A2', subjectId: 'sub-math-10', term: 'HK1', year: '2025-2026',
    teacher: { name: 'Nguyễn Thị Hương', avatar: 'NH' },
    submittedAtVi: '1 ngày trước', submittedAtEn: '1d ago',
    status: 'PENDING_APPROVAL',
    students: { total: 5, entered: 4, missing: 1 },
  },
  {
    id: 'b-10A1-math10-HK1-published', classId: '10A1', subjectId: 'sub-math-10', term: 'HK1-prev', year: '2024-2025',
    teacher: { name: 'Nguyễn Thị Hương', avatar: 'NH' },
    submittedAtVi: '3 ngày trước', submittedAtEn: '3d ago',
    status: 'PUBLISHED',
    students: { total: 8, entered: 8, missing: 0 },
  },
  {
    id: 'b-11B2-math11-HK1', classId: '11B2', subjectId: 'sub-math-11', term: 'HK1', year: '2025-2026',
    teacher: { name: 'Nguyễn Thị Hương', avatar: 'NH' },
    submittedAtVi: '4 ngày trước', submittedAtEn: '4d ago',
    status: 'PUBLISHED',
    students: { total: 6, entered: 6, missing: 0 },
  },
  {
    id: 'b-12C1-math12-HK1', classId: '12C1', subjectId: 'sub-math-12', term: 'HK1', year: '2025-2026',
    teacher: { name: 'Nguyễn Thị Hương', avatar: 'NH' },
    submittedAtVi: '1 tuần trước', submittedAtEn: '1w ago',
    status: 'LOCKED',
    students: { total: 5, entered: 5, missing: 0 },
  },
  {
    id: 'b-11B1-math11-HK1', classId: '11B1', subjectId: 'sub-math-11', term: 'HK1', year: '2025-2026',
    teacher: { name: 'Trần Văn Minh', avatar: 'TM' },
    submittedAtVi: null, submittedAtEn: null,
    status: 'NO_SUBMISSION',
    students: { total: 32, entered: 0, missing: 32 },
  },
  {
    id: 'b-10A1-math10-HK2', classId: '10A1', subjectId: 'sub-math-10', term: 'HK2', year: '2025-2026',
    teacher: { name: 'Nguyễn Thị Hương', avatar: 'NH' },
    submittedAtVi: '5 giờ trước', submittedAtEn: '5h ago',
    status: 'PENDING_APPROVAL',
    students: { total: 8, entered: 7, missing: 1 },
  },
];

// ── Main screen ──────────────────────────────────────────────────────────────

const GradeApprovalScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [batches, setBatches] = React.useState(GA_SEED_BATCHES);

  // Filters
  const [year, setYear] = React.useState('2025-2026');
  const [term, setTerm] = React.useState('HK1');
  const [classFilter, setClassFilter] = React.useState('all');
  const [subjectFilter, setSubjectFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  // Drawers / dialogs
  const [reviewBatchId, setReviewBatchId] = React.useState(null);
  const [lockBatchId, setLockBatchId] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2800);
  };

  // Derived option lists from the seed data.
  const classOptions = React.useMemo(() => {
    const set = new Set(batches.map(b => b.classId));
    return ['all', ...Array.from(set).sort()];
  }, [batches]);

  const subjectOptions = React.useMemo(() => {
    const set = new Set(batches.map(b => b.subjectId));
    return ['all', ...Array.from(set).sort()];
  }, [batches]);

  const filteredBatches = batches.filter(b =>
    b.year === year &&
    (term === 'all' || b.term === term || (term === 'HK1' && b.term === 'HK1-prev')) &&
    (classFilter === 'all' || b.classId === classFilter) &&
    (subjectFilter === 'all' || b.subjectId === subjectFilter) &&
    (statusFilter === 'all' || b.status === statusFilter)
  );

  // Stats for the summary strip — across all in-year batches (so the strip
  // doesn't go blank when the user filters down to a subset).
  const yearBatches = batches.filter(b => b.year === year && (b.term === term || term === 'all'));
  const counts = {
    PENDING_APPROVAL: yearBatches.filter(b => b.status === 'PENDING_APPROVAL').length,
    PUBLISHED:        yearBatches.filter(b => b.status === 'PUBLISHED').length,
    LOCKED:           yearBatches.filter(b => b.status === 'LOCKED').length,
    NO_SUBMISSION:    yearBatches.filter(b => b.status === 'NO_SUBMISSION').length,
  };

  // ── Mutations ──
  const approveBatch = (id) => {
    setBatches(bs => bs.map(b => b.id !== id ? b : { ...b, status: 'PUBLISHED' }));
    setReviewBatchId(null);
    const b = batches.find(x => x.id === id);
    showToast(t(`Đã công bố điểm cho ${b?.classId} — ${getSubjectLabel(b?.subjectId, lang)}`,
                `Published grades for ${b?.classId} — ${getSubjectLabel(b?.subjectId, lang)}`));
  };

  const lockBatch = (id) => {
    setBatches(bs => bs.map(b => b.id !== id ? b : { ...b, status: 'LOCKED' }));
    setLockBatchId(null);
    const b = batches.find(x => x.id === id);
    showToast(t(`Đã khoá điểm cho ${b?.classId} — ${getSubjectLabel(b?.subjectId, lang)}`,
                `Locked grades for ${b?.classId} — ${getSubjectLabel(b?.subjectId, lang)}`));
  };

  const reviewBatch = batches.find(x => x.id === reviewBatchId);
  const lockBatchObj = batches.find(x => x.id === lockBatchId);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

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
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>
            {t('Duyệt & khoá điểm', 'Grade Approval & Lock')}
          </span>
        </div>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="checkSquare" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Duyệt & khoá điểm', 'Grade Approval & Lock')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Xem các đợt nộp điểm theo lớp & môn, phê duyệt công bố và khoá điểm cho học bạ.',
                 'Review submitted grade batches by class & subject, approve for publication, and lock for transcript signing.')}
            </div>
          </div>
          <Badge color={T.error}>
            <Icon name="shield" size={11} color={T.error} strokeWidth={2.4} />
            ADMIN · BGH
          </Badge>
        </div>

        {/* ── Summary strip ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16,
        }}>
          <SummaryStat
            icon="clock" tint={T.warning}
            label={t('Chờ duyệt', 'Pending')}
            value={counts.PENDING_APPROVAL}
            sub={t('đợt cần xử lý', 'batches to review')}
          />
          <SummaryStat
            icon="check" tint={T.success}
            label={t('Đã công bố', 'Published')}
            value={counts.PUBLISHED}
            sub={t('đợt đã duyệt', 'batches approved')}
          />
          <SummaryStat
            icon="lock" tint={T.error}
            label={t('Đã khoá', 'Locked')}
            value={counts.LOCKED}
            sub={t('đợt sẵn sàng ký học bạ', 'ready for transcript')}
          />
          <SummaryStat
            icon="alertTriangle" tint={T.textMuted}
            label={t('Chưa nộp', 'Not submitted')}
            value={counts.NO_SUBMISSION}
            sub={t('lớp chưa có điểm', 'classes with no grades')}
          />
        </div>

        {/* ── Filter bar ── */}
        <ApprovalFilters
          t={t} pColor={pColor}
          year={year} setYear={setYear}
          term={term} setTerm={setTerm}
          classFilter={classFilter} setClassFilter={setClassFilter}
          subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          classOptions={classOptions} subjectOptions={subjectOptions} lang={lang}
        />

        {/* ── Result count ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '14px 2px 12px',
        }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>
            {t('Đang hiển thị', 'Showing')}{' '}
            <strong style={{ color: T.textPrimary, fontWeight: 800 }}>{filteredBatches.length}</strong>
            {' '}{t('đợt', 'batches')}
            {filteredBatches.length !== batches.length && (
              <>
                {' '}{t('trong', 'of')}{' '}
                <strong style={{ color: T.textPrimary, fontWeight: 800 }}>{batches.length}</strong>
              </>
            )}
          </span>
        </div>

        {/* ── Batch list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredBatches.length === 0 ? (
            <EmptyResults t={t} />
          ) : (
            filteredBatches.map(b => (
              <BatchCard
                key={b.id} batch={b} t={t} lang={lang} pColor={pColor}
                onReview={() => setReviewBatchId(b.id)}
                onLockRequest={() => setLockBatchId(b.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Approve sheet ── */}
      {reviewBatch && (
        <ApproveSheet
          batch={reviewBatch} t={t} lang={lang} pColor={pColor}
          onClose={() => setReviewBatchId(null)}
          onApprove={() => approveBatch(reviewBatch.id)}
        />
      )}

      {/* ── Lock dialog ── */}
      {lockBatchObj && (
        <LockDialog
          batch={lockBatchObj} t={t} lang={lang} pColor={pColor}
          onCancel={() => setLockBatchId(null)}
          onConfirm={() => lockBatch(lockBatchObj.id)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff',
          padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000,
          animation: 'ga-toast-in 0.2s ease-out',
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

      <style>{`
        @keyframes ga-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes ga-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes ga-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const getSubjectLabel = (subjectId, lang) => {
  const s = (window.TEACHER_SUBJECT_OFFERINGS || []).find(x => x.id === subjectId);
  if (!s) return subjectId;
  return lang === 'en' ? s.en : s.vi;
};

const getTermLabel = (id, lang) => {
  if (id === 'HK1-prev') return lang === 'en' ? 'Term 1 (prev)' : 'HK1 (cũ)';
  const o = GA_TERMS.find(x => x.id === id);
  return o ? (lang === 'en' ? o.en : o.vi) : id;
};

// ── Summary stat card ────────────────────────────────────────────────────────

const SummaryStat = ({ icon, tint, label, value, sub }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    padding: '16px 18px',
    display: 'flex', alignItems: 'center', gap: 14,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 11, flexShrink: 0,
      background: tint + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={icon} size={20} color={tint} strokeWidth={1.8} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.textMuted, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: T.textPrimary, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ fontSize: 11, color: T.textMuted }}>{sub}</span>
      </div>
    </div>
  </div>
);

// ── Filter bar ───────────────────────────────────────────────────────────────

const ApprovalFilters = ({
  t, pColor,
  year, setYear, term, setTerm,
  classFilter, setClassFilter, subjectFilter, setSubjectFilter,
  statusFilter, setStatusFilter,
  classOptions, subjectOptions, lang,
}) => {
  const Field = ({ label, value, onChange, children, minWidth = 0 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth, flex: 1 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 30px 8px 12px', borderRadius: 8,
          border: `1.5px solid ${T.border}`, background: T.card,
          fontSize: 13, fontWeight: 700, color: T.textPrimary,
          cursor: 'pointer', fontFamily: 'inherit', appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><polyline points='1,1 5,5 9,1' fill='none' stroke='%238898A9' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
          width: '100%',
        }}>
        {children}
      </select>
    </div>
  );

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '14px 20px',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      gap: 14, alignItems: 'end',
    }}>
      <Field label={t('Năm học', 'Academic Year')} value={year} onChange={setYear}>
        {GA_YEARS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Field>
      <Field label={t('Học kỳ', 'Term')} value={term} onChange={setTerm}>
        <option value="all">{t('Tất cả học kỳ', 'All terms')}</option>
        {GA_TERMS.map(o => <option key={o.id} value={o.id}>{t(o.vi, o.en)}</option>)}
      </Field>
      <Field label={t('Lớp', 'Class')} value={classFilter} onChange={setClassFilter}>
        <option value="all">{t('Tất cả lớp', 'All classes')}</option>
        {classOptions.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
      </Field>
      <Field label={t('Môn (theo khối)', 'Subject (grade-scoped)')} value={subjectFilter} onChange={setSubjectFilter}>
        <option value="all">{t('Tất cả môn', 'All subjects')}</option>
        {subjectOptions.filter(s => s !== 'all').map(s => <option key={s} value={s}>{getSubjectLabel(s, lang)}</option>)}
      </Field>
      <Field label={t('Trạng thái', 'Status')} value={statusFilter} onChange={setStatusFilter}>
        <option value="all">{t('Tất cả trạng thái', 'All statuses')}</option>
        <option value="PENDING_APPROVAL">{t('Chờ duyệt', 'Pending')}</option>
        <option value="PUBLISHED">{t('Đã công bố', 'Published')}</option>
        <option value="LOCKED">{t('Đã khoá', 'Locked')}</option>
        <option value="NO_SUBMISSION">{t('Chưa nộp', 'Not submitted')}</option>
      </Field>
    </div>
  );
};

// ── Batch card ───────────────────────────────────────────────────────────────

const BatchCard = ({ batch, t, lang, pColor, onReview, onLockRequest }) => {
  const m = GA_STATUS_META[batch.status];
  const isEmpty = batch.status === 'NO_SUBMISSION';
  const isPending = batch.status === 'PENDING_APPROVAL';
  const isPublished = batch.status === 'PUBLISHED';
  const isLocked = batch.status === 'LOCKED';

  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card, borderRadius: 12,
        border: `1px solid ${isPending ? T.warning + '44' : isLocked ? T.error + '22' : T.border}`,
        boxShadow: hovered ? '0 6px 24px rgba(20,30,50,0.08)' : '0 2px 12px rgba(0,0,0,0.04)',
        padding: '18px 22px',
        transition: 'box-shadow 0.18s, border-color 0.18s',
        position: 'relative', overflow: 'hidden',
      }}>
      {/* Pending accent bar */}
      {isPending && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: T.warning,
        }} />
      )}
      {isLocked && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: T.error,
        }} />
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        {/* Class · subject · term */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 10,
            background: pColor + '14',
            border: `1px solid ${pColor}33`,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: pColor, letterSpacing: '0.08em', marginTop: 2 }}>
              LỚP
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: pColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {batch.classId}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, lineHeight: 1.25 }}>
              {getSubjectLabel(batch.subjectId, lang)}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              marginTop: 4, fontSize: 11.5, color: T.textMuted, fontWeight: 600,
            }}>
              <span style={{
                fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10.5, fontWeight: 800,
                background: T.bg, padding: '1px 7px', borderRadius: 4, color: T.textSecondary,
                letterSpacing: '0.04em',
              }}>{batch.subjectId}</span>
              ·
              <span>{getTermLabel(batch.term, lang)}</span>
            </div>
          </div>
        </div>

        {/* Teacher + submitted */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flex: 1, minWidth: 200,
        }}>
          <Avatar initials={batch.teacher.avatar} color={pColor} size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, lineHeight: 1.2 }}>
              {batch.teacher.name}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {batch.submittedAtVi ? (
                <>
                  <Icon name="clock" size={11} color={T.textMuted} strokeWidth={2} />
                  {t(`Nộp ${batch.submittedAtVi}`, `Submitted ${batch.submittedAtEn}`)}
                </>
              ) : (
                <>
                  <Icon name="alertTriangle" size={11} color={T.textMuted} strokeWidth={2} />
                  {t('Giáo viên chưa nộp điểm', 'Teacher has not submitted grades')}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div>
          <Badge color={m.color}>
            <Icon name={m.icon} size={11} color={m.color} strokeWidth={2.4} />
            {t(m.vi, m.en)}
          </Badge>
          <div style={{
            marginTop: 4, textAlign: 'right',
            fontSize: 9, fontWeight: 800, color: T.textMuted,
            fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.05em',
          }}>
            {m.mono}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        marginTop: 14, paddingTop: 14,
        borderTop: `1px dashed ${T.border}`,
      }}>
        {isEmpty ? (
          <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: 'italic', flex: 1 }}>
            <Icon name="info" size={12} color={T.textMuted} />
            {' '}{t('Giáo viên chưa nộp điểm cho lớp này.', 'No grade submission for this class yet.')}
          </div>
        ) : (
          <>
            <MiniStat
              icon="users" label={t('học sinh', 'students')}
              value={batch.students.total} tint={pColor}
            />
            <MiniStat
              icon="penLine" label={t('đã nhập', 'entered')}
              value={batch.students.entered} tint={T.success}
            />
            <MiniStat
              icon="alertTriangle" label={t('thiếu điểm', 'missing')}
              value={batch.students.missing}
              tint={batch.students.missing > 0 ? T.error : T.textMuted}
            />
          </>
        )}
        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="ghost" icon="eye"
            onClick={onReview}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}
            disabled={isEmpty}>
            {t('Xem điểm', 'View grades')}
          </Button>

          {isPending && (
            <Button variant="primary" icon="check" onClick={onReview}>
              {t('Phê duyệt', 'Approve')}
            </Button>
          )}

          {isPublished && (
            <Button variant="primary" icon="lock" onClick={onLockRequest}>
              {t('Khoá điểm', 'Lock grades')}
            </Button>
          )}

          {isLocked && (
            <span title={t('Đã khoá — không thể chỉnh sửa', 'Locked — cannot be edited')}>
              <Button variant="ghost" icon="lock" disabled
                style={{ border: `1px solid ${T.border}`, color: T.textMuted, opacity: 0.65 }}>
                {t('Đã khoá', 'Locked')}
              </Button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const MiniStat = ({ icon, label, value, tint }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
    <Icon name={icon} size={13} color={tint} strokeWidth={2} />
    <span style={{
      fontSize: 13.5, fontWeight: 800, color: T.textPrimary,
      fontVariantNumeric: 'tabular-nums',
    }}>{value}</span>
    <span style={{ fontSize: 11.5, color: T.textMuted }}>{label}</span>
  </div>
);

// ── Empty state ──────────────────────────────────────────────────────────────

const EmptyResults = ({ t }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '40px 24px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="checkSquare" size={36} color={T.border} />
    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: T.textSecondary }}>
      {t('Không có đợt điểm khớp bộ lọc', 'No batches match the current filters')}
    </div>
    <div style={{ marginTop: 4, fontSize: 12 }}>
      {t('Thử mở rộng phạm vi học kỳ, lớp hoặc trạng thái.', 'Try widening the term, class, or status filter.')}
    </div>
  </div>
);

// ── Approve sheet (read-only grade table) ────────────────────────────────────

const ApproveSheet = ({ batch, t, lang, pColor, onClose, onApprove }) => {
  const columns = (window.GRADEBOOK_SCHEMES || {})[batch.subjectId] || [];
  const baseRows = ((window.GRADEBOOK_DATA || {})[batch.subjectId] || {})[batch.classId] || [];

  const parseCell = (raw) => {
    const [v, s] = (raw || '—|D').split('|');
    return {
      value: v === '—' ? null : parseFloat(v),
      // Treat anything in a PENDING batch as "draft" visually.
      state: v === '—'
        ? 'EMPTY'
        : ({ P: 'PUBLISHED', D: 'DRAFT', L: 'LOCKED' }[s] || 'DRAFT'),
    };
  };

  const rows = baseRows.map(r => ({
    name: r.name,
    cells: columns.map((c, i) => parseCell(r.cells[i])),
  }));

  const rowAvg = (cells) => {
    let num = 0, den = 0;
    cells.forEach((c, i) => {
      if (c.value != null) { num += c.value * columns[i].coefficient; den += columns[i].coefficient; }
    });
    return den ? num / den : null;
  };

  const scoreColor = (v) => v == null ? T.textMuted : v < 5 ? T.error : v >= 8 ? T.success : T.textPrimary;
  const m = GA_STATUS_META[batch.status];

  return (
    <React.Fragment>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.45)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 760, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
        animation: 'ga-slide-in 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: m.color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name={m.icon} size={20} color={m.color} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
                {batch.classId} — {getSubjectLabel(batch.subjectId, lang)}
              </div>
              <Badge color={m.color}>
                <Icon name={m.icon} size={11} color={m.color} strokeWidth={2.4} />
                {t(m.vi, m.en)}
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
              {getTermLabel(batch.term, lang)} · {batch.year} ·{' '}
              {t(`Nộp bởi ${batch.teacher.name}`, `Submitted by ${batch.teacher.name}`)}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="x" size={18} color={T.textMuted} />
          </button>
        </div>

        {/* Read-only banner */}
        <div style={{
          padding: '10px 22px', background: T.bg,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="lock" size={12} color={T.textMuted} strokeWidth={2.2} />
          <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>
            {t('Bảng điểm hiển thị chỉ đọc — BGH không chỉnh sửa điểm của giáo viên tại đây.',
               'Read-only view — admins do not edit teacher-submitted scores from this screen.')}
          </span>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={geApprThStyle}>#</th>
                <th style={{ ...geApprThStyle, textAlign: 'left', paddingLeft: 16 }}>
                  {t('Học sinh', 'Student')}
                </th>
                {columns.map(c => {
                  const tint = GE_COL_TINT[c.columnType] || T.primary;
                  return (
                    <th key={c.id} style={{
                      padding: '10px 8px 12px', textAlign: 'center', minWidth: 84,
                      background: tint + '14', borderBottom: `2px solid ${tint}55`,
                      verticalAlign: 'bottom',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: tint, background: tint + '22', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.08em' }}>
                            {c.columnType}
                          </span>
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: T.textSecondary, background: T.card, border: `1px solid ${T.border}`, padding: '2px 6px', borderRadius: 4, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                            ×{c.coefficient}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap' }}>
                          {t(c.vi, c.en)}
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th style={{ ...geApprThStyle, background: T.bg, borderBottom: `2px solid ${T.border}` }}>
                  {t('TB kỳ', 'Term Avg')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const avg = rowAvg(r.cells);
                return (
                  <tr key={ri}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={geApprTdStyle}>
                      <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{ri + 1}</span>
                    </td>
                    <td style={{ ...geApprTdStyle, paddingLeft: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar initials={r.name.split(' ').slice(-1)[0][0]} color={pColor} size={26} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{r.name}</span>
                      </div>
                    </td>
                    {r.cells.map((c, ci) => (
                      <td key={ci} style={{ ...geApprTdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 40, padding: '4px 6px', borderRadius: 6,
                          fontSize: 13, fontWeight: 700,
                          color: c.value == null ? T.textMuted : scoreColor(c.value),
                          background: c.state === 'LOCKED' ? T.errorLight : 'transparent',
                          fontVariantNumeric: 'tabular-nums',
                        }} title={c.state}>
                          {c.value == null ? '—' : c.value}
                          {c.state === 'LOCKED' && (
                            <span style={{ marginLeft: 4, display: 'inline-flex' }}>
                              <Icon name="lock" size={10} color={T.error} />
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                    <td style={{ ...geApprTdStyle, textAlign: 'center', background: T.bg, borderLeft: `1px solid ${T.border}` }}>
                      <span style={{
                        fontSize: 13.5, fontWeight: 800,
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

        {/* Footer actions */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          background: T.card,
        }}>
          <div style={{ flex: 1, fontSize: 12, color: T.textMuted }}>
            <Icon name="info" size={12} color={T.textMuted} />
            {' '}
            {batch.status === 'PENDING_APPROVAL'
              ? t('Phê duyệt sẽ công bố điểm cho học sinh & phụ huynh.',
                  'Approval publishes grades to students & parents.')
              : t('Đợt điểm đã được công bố. Khoá điểm để chuẩn bị ký học bạ.',
                  'This batch is already published. Lock to prepare for transcript signing.')}
          </div>
          <Button variant="ghost" onClick={onClose}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Đóng', 'Close')}
          </Button>
          {batch.status === 'PENDING_APPROVAL' && (
            <Button variant="primary" icon="check" onClick={onApprove}>
              {t('Xác nhận phê duyệt', 'Confirm approve')}
            </Button>
          )}
        </div>
      </div>
    </React.Fragment>
  );
};

const geApprThStyle = {
  padding: '11px 14px', textAlign: 'center',
  fontSize: 10.5, fontWeight: 800, color: T.textMuted,
  background: T.bg, borderBottom: `1px solid ${T.border}`,
  letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 1,
};
const geApprTdStyle = {
  padding: '8px 12px',
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: 'middle',
};

// ── Lock dialog (double-confirmation) ────────────────────────────────────────

const LockDialog = ({ batch, t, lang, pColor, onCancel, onConfirm }) => {
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const requiredPhrase = 'KHOÁ';
  const phraseOk = typed.trim().toUpperCase() === requiredPhrase;
  const canLock = acknowledged && phraseOk;

  return (
    <div onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 20, backdropFilter: 'blur(3px)',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        role="alertdialog" aria-modal="true"
        style={{
          background: T.card, borderRadius: 14, width: '100%', maxWidth: 520,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          animation: 'ga-fadein 0.18s ease-out',
        }}>
        <div style={{ padding: '22px 24px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: T.error + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="lock" size={20} color={T.error} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
                {t('Xác nhận khoá điểm', 'Confirm grade lock')}
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>
                {t('Khoá toàn bộ điểm lớp ', 'Lock all grades for class ')}
                <strong style={{ color: T.textPrimary }}>{batch.classId}</strong>
                {' — '}
                <strong style={{ color: T.textPrimary }}>{getSubjectLabel(batch.subjectId, lang)}</strong>
                {' — '}
                <strong style={{ color: T.textPrimary }}>{getTermLabel(batch.term, lang)}</strong>
                {'?'}
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: T.errorLight, borderRadius: 10,
            border: `1px solid ${T.error}22`,
            fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6,
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 800, color: T.error, marginBottom: 4 }}>
              {t('Hành động này không thể hoàn tác', 'This action cannot be undone')}
            </div>
            {t('Sau khi khoá, điểm không thể chỉnh sửa và là điều kiện ký học bạ. ',
               'Once locked, grades cannot be edited and become a prerequisite for transcript signing. ')}
            {t('Việc mở khoá phải được thực hiện qua quy trình ghi log riêng.',
               'Unlocking requires a separate audited process.')}
          </div>

          {/* Step 1: ack checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${acknowledged ? pColor + '66' : T.border}`,
            background: acknowledged ? pColor + '0C' : T.card,
            cursor: 'pointer', marginBottom: 12, transition: 'all 0.15s',
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              border: `1.5px solid ${acknowledged ? pColor : T.border}`,
              background: acknowledged ? pColor : T.card,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 1,
            }}>
              {acknowledged && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}
            </span>
            <input type="checkbox" checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
            <span style={{ flex: 1, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>
              {t('Tôi hiểu rằng điểm khi đã khoá sẽ không thể chỉnh sửa và sẵn sàng cho việc ký học bạ.',
                 'I understand that locked grades cannot be edited and become ready for transcript signing.')}
            </span>
          </label>

          {/* Step 2: type confirmation */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            opacity: acknowledged ? 1 : 0.5,
            pointerEvents: acknowledged ? 'auto' : 'none',
            transition: 'opacity 0.15s',
          }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('Gõ ', 'Type ')}
              <code style={{ background: T.bg, padding: '1px 6px', borderRadius: 4, color: T.error, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}>
                {requiredPhrase}
              </code>
              {t(' để xác nhận', ' to confirm')}
            </label>
            <input
              value={typed} onChange={(e) => setTyped(e.target.value)}
              autoFocus={acknowledged}
              placeholder={requiredPhrase}
              style={{
                padding: '10px 12px', borderRadius: 8,
                border: `1.5px solid ${phraseOk ? T.success : (typed ? T.error + '88' : T.border)}`,
                background: T.card, fontSize: 14, fontWeight: 700,
                color: T.textPrimary, outline: 'none', fontFamily: 'ui-monospace, Menlo, monospace',
                letterSpacing: '0.04em',
              }}
            />
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
          <Button variant="danger" icon="lock" disabled={!canLock} onClick={onConfirm}>
            {t('Khoá điểm', 'Lock grades')}
          </Button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { GradeApprovalScreen });
