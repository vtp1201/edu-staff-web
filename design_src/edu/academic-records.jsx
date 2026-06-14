// ── Academic Record Seal Screen — /admin/academic-records ───────────────────
// Role:   ADMIN only
// Epic:   US-064 (seal / unseal học bạ — academic transcripts)
// Model:  Học bạ is the per-student per-term frozen transcript. Sealing
//         requires all underlying grade entries to be LOCKED (US-064 gate
//         condition). Unsealing requires two-ADMIN confirmation per audit
//         policy — falls back to a logged self-approve with prominent warning
//         when no second ADMIN is available.

// ── Static lookups ───────────────────────────────────────────────────────────

const AR_YEARS = [
  { id: '2025-2026', label: '2025 — 2026' },
  { id: '2024-2025', label: '2024 — 2025' },
];
const AR_TERMS = [
  { id: 'HK1', vi: 'Học kỳ 1', en: 'Term 1' },
  { id: 'HK2', vi: 'Học kỳ 2', en: 'Term 2' },
];

const AR_STATUS_META = {
  PENDING:  { vi: 'Chưa ký', en: 'Not signed', color: T.textMuted, bg: T.bg,           icon: 'clock' },
  SEALED:   { vi: 'Đã ký',   en: 'Sealed',     color: T.success,   bg: T.successLight, icon: 'check' },
  UNSEALED: { vi: 'Đã mở',   en: 'Unsealed',   color: T.warning,   bg: T.warningLight, icon: 'lock' },
};

const AR_CURRENT_ADMIN = { id: 'admin-1', name: 'Trần Minh Quân', avatar: 'TQ' };
const AR_OTHER_ADMINS = [
  { id: 'admin-2', name: 'Lê Thị Mai',     avatar: 'LM' },
  { id: 'admin-3', name: 'Phạm Quốc Bảo',  avatar: 'PB' },
];

// Per (class, term, year) → roster + grade-locked status. The screen only
// allows sealing when allLocked === true.
const AR_BATCHES = {
  '12C1|HK1|2025-2026': {
    classId: '12C1', term: 'HK1', year: '2025-2026', subjectId: 'sub-math-12',
    allLocked: true, totalStudents: 5, unlockedStudents: 0,
  },
  '11B2|HK1|2025-2026': {
    classId: '11B2', term: 'HK1', year: '2025-2026', subjectId: 'sub-math-11',
    allLocked: true, totalStudents: 6, unlockedStudents: 0,
  },
  '10A1|HK1|2025-2026': {
    classId: '10A1', term: 'HK1', year: '2025-2026', subjectId: 'sub-math-10',
    allLocked: false, totalStudents: 8, unlockedStudents: 3,
  },
  '10A2|HK1|2025-2026': {
    classId: '10A2', term: 'HK1', year: '2025-2026', subjectId: 'sub-math-10',
    allLocked: false, totalStudents: 5, unlockedStudents: 2,
  },
};

const AR_SEED_ROSTERS = {
  '12C1|HK1|2025-2026': [
    { id: 's-12C1-1', name: 'Lê Hoàng Nhật',    avatar: 'LN', termAvg: 8.85, status: 'SEALED',   sealedAt: '2026-01-15 14:32', sealedBy: 'Trần Minh Quân' },
    { id: 's-12C1-2', name: 'Đinh Thị Quỳnh',   avatar: 'DQ', termAvg: 8.83, status: 'SEALED',   sealedAt: '2026-01-15 14:32', sealedBy: 'Trần Minh Quân' },
    { id: 's-12C1-3', name: 'Phạm Hữu Phúc',    avatar: 'PP', termAvg: 7.17, status: 'UNSEALED', sealedAt: '2026-01-15 14:32', unsealedAt: '2026-02-20 09:15', sealedBy: 'Trần Minh Quân', unsealReason: 'Sai sót khi nhập điểm Văn cuối kỳ.' },
    { id: 's-12C1-4', name: 'Vũ Khánh Linh',    avatar: 'VL', termAvg: 7.83, status: 'SEALED',   sealedAt: '2026-01-15 14:32', sealedBy: 'Trần Minh Quân' },
    { id: 's-12C1-5', name: 'Bùi Tuấn Kiệt',    avatar: 'BK', termAvg: 5.67, status: 'SEALED',   sealedAt: '2026-01-15 14:32', sealedBy: 'Trần Minh Quân' },
  ],
  '11B2|HK1|2025-2026': [
    { id: 's-11B2-1', name: 'Phan Anh Khoa',    avatar: 'PK', termAvg: 8.83, status: 'PENDING' },
    { id: 's-11B2-2', name: 'Đặng Thuỳ Linh',   avatar: 'DL', termAvg: 9.33, status: 'PENDING' },
    { id: 's-11B2-3', name: 'Trần Quốc Việt',   avatar: 'TV', termAvg: 7.17, status: 'PENDING' },
    { id: 's-11B2-4', name: 'Mai Thu Hà',       avatar: 'MH', termAvg: 7.83, status: 'PENDING' },
    { id: 's-11B2-5', name: 'Lưu Trọng An',     avatar: 'LA', termAvg: 6.33, status: 'PENDING' },
    { id: 's-11B2-6', name: 'Nguyễn Hà My',     avatar: 'NM', termAvg: 9.00, status: 'PENDING' },
  ],
  '10A1|HK1|2025-2026': [
    { id: 's-10A1-1', name: 'Nguyễn Minh Anh',  avatar: 'NA', termAvg: 8.70, status: 'PENDING' },
    { id: 's-10A1-2', name: 'Trần Văn Bình',    avatar: 'TB', termAvg: 7.40, status: 'PENDING' },
    { id: 's-10A1-3', name: 'Lê Thị Cẩm',       avatar: 'LC', termAvg: 9.60, status: 'PENDING' },
    { id: 's-10A1-4', name: 'Phạm Đức Dũng',    avatar: 'PD', termAvg: 6.50, status: 'PENDING' },
    { id: 's-10A1-5', name: 'Hoàng Thị Linh',   avatar: 'HL', termAvg: 8.40, status: 'PENDING' },
    { id: 's-10A1-6', name: 'Vũ Quốc Bảo',      avatar: 'VB', termAvg: 8.10, status: 'PENDING' },
    { id: 's-10A1-7', name: 'Đỗ Thu Hằng',      avatar: 'DH', termAvg: 7.90, status: 'PENDING' },
    { id: 's-10A1-8', name: 'Bùi Minh Tuấn',    avatar: 'BT', termAvg: 6.10, status: 'PENDING' },
  ],
  '10A2|HK1|2025-2026': [
    { id: 's-10A2-1', name: 'Nguyễn Hoài Anh',  avatar: 'NA', termAvg: 8.67, status: 'PENDING' },
    { id: 's-10A2-2', name: 'Lý Thanh Hà',      avatar: 'LH', termAvg: 8.33, status: 'PENDING' },
    { id: 's-10A2-3', name: 'Trần Khải An',     avatar: 'TA', termAvg: 7.33, status: 'PENDING' },
    { id: 's-10A2-4', name: 'Đặng Minh Phúc',   avatar: 'DP', termAvg: 6.67, status: 'PENDING' },
    { id: 's-10A2-5', name: 'Phạm Diệu Linh',   avatar: 'PL', termAvg: 9.17, status: 'PENDING' },
  ],
};

const AR_SEED_UNSEAL = [
  {
    id: 'ur-1', studentName: 'Phạm Hữu Phúc', classId: '12C1', term: 'HK1', year: '2025-2026',
    reason: 'Sai sót khi nhập điểm Văn cuối kỳ — giáo viên đã rà soát và xác nhận điểm đúng là 7.5 thay vì 5.5. Cần mở học bạ để cập nhật giá trị chính xác.',
    requestedBy: { id: 'admin-1', name: 'Trần Minh Quân', avatar: 'TQ' },
    requestedAtVi: '19/02/2026 10:22', requestedAtEn: '2026-02-19 10:22',
    status: 'PENDING',
  },
  {
    id: 'ur-2', studentName: 'Nguyễn Hoàng Nam', classId: '11B2', term: 'HK1', year: '2025-2026',
    reason: 'Học sinh chuyển trường vào giữa kỳ. Cần cập nhật học bạ với điểm từ trường cũ theo công văn 142/SGD ngày 12/02/2026.',
    requestedBy: { id: 'admin-2', name: 'Lê Thị Mai', avatar: 'LM' },
    requestedAtVi: '22/02/2026 08:45', requestedAtEn: '2026-02-22 08:45',
    status: 'PENDING',
  },
  {
    id: 'ur-3', studentName: 'Trần Quốc Việt', classId: '11B2', term: 'HK1', year: '2025-2026',
    reason: 'Phụ huynh khiếu nại điểm Toán giữa kỳ. Sau khi BGH rà soát biên bản và đối chiếu bài kiểm tra, cần điều chỉnh từ 6.0 → 7.0.',
    requestedBy: { id: 'admin-1', name: 'Trần Minh Quân', avatar: 'TQ' },
    requestedAtVi: '10/02/2026 16:30', requestedAtEn: '2026-02-10 16:30',
    status: 'APPROVED',
    approvedBy: { id: 'admin-2', name: 'Lê Thị Mai', avatar: 'LM' },
    approvedAtVi: '11/02/2026 09:00', approvedAtEn: '2026-02-11 09:00',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const arBatchKey = (c, t, y) => `${c}|${t}|${y}`;

const arScoreColor = (v) =>
  v == null ? T.textMuted : v < 5 ? T.error : v >= 8 ? T.success : T.textPrimary;

// ── Main screen ──────────────────────────────────────────────────────────────

const AcademicRecordsScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [tab, setTab] = React.useState('seal'); // 'seal' | 'unseal'
  const [rosters, setRosters] = React.useState(AR_SEED_ROSTERS);
  const [unseals, setUnseals] = React.useState(AR_SEED_UNSEAL);
  const [toast, setToast] = React.useState(null);
  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2800);
  };

  const pendingCount = unseals.filter(u => u.status === 'PENDING').length;

  // Seal a whole batch — set every PENDING student → SEALED with metadata.
  const sealBatch = (key) => {
    const stamp = new Date().toLocaleString('vi-VN', { hour12: false });
    setRosters(rs => ({
      ...rs,
      [key]: (rs[key] || []).map(s => s.status === 'PENDING'
        ? { ...s, status: 'SEALED', sealedAt: stamp, sealedBy: AR_CURRENT_ADMIN.name }
        : s),
    }));
    showToast(t(`Đã ký ${(rosters[key] || []).filter(s => s.status === 'PENDING').length} học bạ thành công.`,
                `${(rosters[key] || []).filter(s => s.status === 'PENDING').length} records sealed successfully.`));
  };

  const approveUnseal = (id, byOther = true) => {
    setUnseals(us => us.map(u => u.id !== id ? u : {
      ...u,
      status: 'APPROVED',
      approvedBy: byOther ? AR_OTHER_ADMINS[0] : AR_CURRENT_ADMIN,
      approvedAtVi: new Date().toLocaleString('vi-VN', { hour12: false }),
      approvedAtEn: new Date().toISOString().slice(0, 16).replace('T', ' '),
      selfApproved: !byOther,
    }));
    showToast(byOther
      ? t('Đã xác nhận mở học bạ.', 'Unseal request approved.')
      : t('Đã tự phê duyệt — hành động được ghi vào nhật ký.', 'Self-approved — logged to audit trail.'));
  };

  const createUnseal = (next) => {
    setUnseals(us => [{
      id: `ur-${Date.now()}`,
      studentName: next.studentName,
      classId: next.classId,
      term: next.term,
      year: next.year,
      reason: next.reason,
      requestedBy: AR_CURRENT_ADMIN,
      requestedAtVi: new Date().toLocaleString('vi-VN', { hour12: false }),
      requestedAtEn: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'PENDING',
    }, ...us]);
    showToast(t('Đã tạo yêu cầu mở học bạ — chờ ADMIN thứ hai xác nhận.',
                'Unseal request created — awaiting second ADMIN confirmation.'));
  };

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
            {t('Học bạ', 'Academic Records')}
          </span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="award" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Ký học bạ', 'Academic Record Seal')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Đóng băng điểm cuối kỳ, theo dõi yêu cầu mở học bạ với xác nhận 2 ADMIN.',
                 'Freeze end-of-term grades and manage two-ADMIN unseal requests.')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11.5, color: T.textMuted }}>
              {t('Bạn đang đăng nhập với tư cách', 'Signed in as')}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 10px', borderRadius: 99,
              background: pColor + '14', border: `1px solid ${pColor}33`,
            }}>
              <Avatar initials={AR_CURRENT_ADMIN.avatar} color={pColor} size={22} />
              <span style={{ fontSize: 12, fontWeight: 800, color: T.textPrimary }}>
                {AR_CURRENT_ADMIN.name}
              </span>
              <span style={{
                fontSize: 9.5, fontWeight: 800, color: T.error,
                background: T.errorLight, padding: '1px 6px', borderRadius: 4,
                letterSpacing: '0.06em',
              }}>ADMIN</span>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`,
          marginBottom: 22,
        }}>
          <TabButton
            active={tab === 'seal'} onClick={() => setTab('seal')}
            pColor={pColor} icon="award"
            label={t('Ký học bạ', 'Seal Records')}
          />
          <TabButton
            active={tab === 'unseal'} onClick={() => setTab('unseal')}
            pColor={pColor} icon="lock"
            label={t('Yêu cầu mở học bạ', 'Unseal Requests')}
            badge={pendingCount}
          />
        </div>

        {tab === 'seal'   && <SealTab   t={t} lang={lang} pColor={pColor} rosters={rosters} onSeal={sealBatch} onNavigate={onNavigate} />}
        {tab === 'unseal' && <UnsealTab t={t} lang={lang} pColor={pColor} unseals={unseals} onApprove={approveUnseal} onCreate={createUnseal} />}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff',
          padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000,
          animation: 'ar-toast-in 0.2s ease-out',
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
        @keyframes ar-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes ar-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes ar-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ── Tab button ───────────────────────────────────────────────────────────────

const TabButton = ({ active, onClick, label, icon, badge, pColor }) => (
  <button onClick={onClick}
    style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '12px 18px', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      color: active ? pColor : T.textSecondary,
      fontSize: 13.5, fontWeight: active ? 800 : 600,
      borderBottom: `2.5px solid ${active ? pColor : 'transparent'}`,
      marginBottom: -1, position: 'relative',
      transition: 'color 0.15s',
    }}>
    <Icon name={icon} size={15} color="currentColor" strokeWidth={active ? 2.2 : 1.8} />
    {label}
    {badge > 0 && (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 18, height: 18, borderRadius: 99,
        padding: '0 6px',
        background: active ? pColor : T.textMuted,
        color: '#fff', fontSize: 10.5, fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
      }}>{badge}</span>
    )}
  </button>
);

// ── TAB 1 — Seal ─────────────────────────────────────────────────────────────

const SealTab = ({ t, lang, pColor, rosters, onSeal, onNavigate }) => {
  const [year, setYear] = React.useState('2025-2026');
  const [term, setTerm] = React.useState('HK1');
  const [classId, setClassId] = React.useState('11B2');

  // All classes that have a batch in the data — used for the class picker.
  const classes = Object.values(AR_BATCHES)
    .filter(b => b.year === year && b.term === term)
    .map(b => b.classId)
    .sort();

  React.useEffect(() => {
    if (!classes.includes(classId) && classes.length) setClassId(classes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, term]);

  const key = arBatchKey(classId, term, year);
  const batch = AR_BATCHES[key];
  const roster = rosters[key] || [];

  const stats = {
    total: roster.length,
    sealed: roster.filter(s => s.status === 'SEALED').length,
    unsealed: roster.filter(s => s.status === 'UNSEALED').length,
    pending: roster.filter(s => s.status === 'PENDING').length,
  };

  const [activeStudent, setActiveStudent] = React.useState(null);
  const [confirmSeal, setConfirmSeal] = React.useState(false);

  return (
    <div>
      {/* Filter bar */}
      <SealFilters
        t={t} pColor={pColor}
        year={year} setYear={setYear}
        term={term} setTerm={setTerm}
        classId={classId} setClassId={setClassId}
        classes={classes}
      />

      {!batch ? (
        <SealEmpty t={t} />
      ) : (
        <>
          {/* Seal-readiness banner */}
          <SealStatusBanner
            t={t} pColor={pColor} batch={batch} stats={stats}
            onSeal={() => setConfirmSeal(true)}
            onGoToApproval={() => onNavigate && onNavigate('grades-approval')}
          />

          {/* Roster table */}
          <SealRoster
            t={t} pColor={pColor} roster={roster}
            onPickStudent={(s) => setActiveStudent(s)}
          />
        </>
      )}

      {activeStudent && (
        <RecordSnapshotSheet
          t={t} pColor={pColor}
          student={activeStudent} batch={batch}
          onClose={() => setActiveStudent(null)}
        />
      )}
      {confirmSeal && (
        <SealConfirmDialog
          t={t} pColor={pColor} batch={batch} stats={stats}
          onCancel={() => setConfirmSeal(false)}
          onConfirm={() => { setConfirmSeal(false); onSeal(key); }}
        />
      )}
    </div>
  );
};

// ── Seal Filters ─────────────────────────────────────────────────────────────

const SealFilters = ({ t, pColor, year, setYear, term, setTerm, classId, setClassId, classes }) => {
  const Field = ({ label, value, onChange, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '9px 32px 9px 12px', borderRadius: 8,
          border: `1.5px solid ${T.border}`, background: T.card,
          fontSize: 13.5, fontWeight: 700, color: T.textPrimary,
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
      padding: '16px 20px',
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignItems: 'end',
      marginBottom: 14,
    }}>
      <Field label={t('Năm học', 'Academic Year')} value={year} onChange={setYear}>
        {AR_YEARS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Field>
      <Field label={t('Học kỳ', 'Term')} value={term} onChange={setTerm}>
        {AR_TERMS.map(o => <option key={o.id} value={o.id}>{t(o.vi, o.en)}</option>)}
      </Field>
      <Field label={t('Lớp', 'Class')} value={classId} onChange={setClassId}>
        {classes.length === 0 && <option value="">{t('— Chưa có lớp —', '— No classes —')}</option>}
        {classes.map(c => <option key={c} value={c}>{c}</option>)}
      </Field>
    </div>
  );
};

const SealEmpty = ({ t }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '46px 24px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="award" size={36} color={T.border} />
    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: T.textSecondary }}>
      {t('Chưa có dữ liệu cho lựa chọn này', 'No data for the current selection')}
    </div>
  </div>
);

// ── Seal-readiness banner ────────────────────────────────────────────────────

const SealStatusBanner = ({ t, pColor, batch, stats, onSeal, onGoToApproval }) => {
  if (batch.allLocked) {
    return (
      <div style={{
        background: T.successLight, border: `1px solid ${T.success}44`,
        borderRadius: 12, padding: '18px 22px',
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: T.success + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={22} color={T.success} strokeWidth={2.4} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 2 }}>
            {t('Tất cả điểm đã khoá. Sẵn sàng ký học bạ.',
               'All grades locked. Ready to seal records.')}
          </div>
          <div style={{ fontSize: 12.5, color: T.textSecondary }}>
            <strong style={{ color: T.success, fontWeight: 800 }}>{batch.totalStudents}</strong>{' '}
            {t('học sinh ', 'students · ')}
            ·{' '}
            <strong>{stats.pending}</strong> {t('chưa ký', 'not yet sealed')}
            ·{' '}
            <strong style={{ color: T.success }}>{stats.sealed}</strong> {t('đã ký', 'sealed')}
            {stats.unsealed > 0 && <> · <strong style={{ color: T.warning }}>{stats.unsealed}</strong> {t('đã mở', 'unsealed')}</>}
          </div>
        </div>
        <Button
          variant="primary" icon="award"
          onClick={onSeal}
          disabled={stats.pending === 0}
          style={{ background: T.success, borderColor: T.success }}>
          {t(`Ký học bạ lớp ${batch.classId} — ${batch.term}`,
             `Seal records · ${batch.classId} · ${batch.term}`)}
        </Button>
      </div>
    );
  }
  // Warning state
  return (
    <div style={{
      background: T.warningLight, border: `1px solid ${T.warning}44`,
      borderRadius: 12, padding: '18px 22px',
      display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11, flexShrink: 0,
        background: T.warning + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="alertTriangle" size={22} color={T.warning} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#9A6A0F', marginBottom: 2 }}>
          {t(`Còn ${batch.unlockedStudents} học sinh chưa khoá điểm.`,
             `${batch.unlockedStudents} students still have unlocked grades.`)}
        </div>
        <div style={{ fontSize: 12.5, color: T.textSecondary }}>
          {t('Vui lòng khoá toàn bộ điểm tại màn hình Duyệt & khoá điểm trước khi ký học bạ.',
             'Lock all grades in the Approval & Lock screen before sealing the records.')}
        </div>
      </div>
      <Button variant="secondary" icon="arrowRight" onClick={onGoToApproval}>
        {t('Đến màn Duyệt & khoá', 'Go to Approval')}
      </Button>
    </div>
  );
};

// ── Seal roster ──────────────────────────────────────────────────────────────

const SealRoster = ({ t, pColor, roster, onPickStudent }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
  }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
      <thead>
        <tr>
          {['#', t('Học sinh', 'Student'), t('Điểm TB kỳ', 'Term Avg'), t('Trạng thái học bạ', 'Record status'), ''].map((h, i) => (
            <th key={i} style={{
              padding: '12px 16px', textAlign: i === 0 || i === 2 ? 'center' : 'left',
              fontSize: 11, fontWeight: 800, color: T.textMuted,
              background: T.bg, borderBottom: `1px solid ${T.border}`,
              letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {roster.map((s, ri) => {
          const m = AR_STATUS_META[s.status];
          return (
            <tr key={s.id}
              onClick={() => onPickStudent(s)}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{ cursor: 'pointer' }}>
              <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{ri + 1}</span>
              </td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={s.avatar} color={pColor} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.04em', marginTop: 2 }}>
                      {s.id}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
                <span style={{
                  fontSize: 15, fontWeight: 800,
                  color: arScoreColor(s.termAvg),
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {s.termAvg.toFixed(2)}
                </span>
              </td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge color={m.color} bg={m.bg}>
                    <Icon name={m.icon} size={11} color={m.color} strokeWidth={2.4} />
                    {t(m.vi, m.en)}
                  </Badge>
                  {s.sealedAt && (
                    <span style={{ fontSize: 11.5, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                      {s.status === 'UNSEALED'
                        ? t(`Mở ${s.unsealedAt}`, `Unsealed ${s.unsealedAt}`)
                        : t(`Ký ${s.sealedAt}`, `Sealed ${s.sealedAt}`)}
                    </span>
                  )}
                </div>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: `1px solid ${T.border}` }}>
                <Icon name="chevronRight" size={14} color={T.textMuted} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ── Record snapshot sheet (frozen grade table) ────────────────────────────────

const RecordSnapshotSheet = ({ t, pColor, student, batch, onClose }) => {
  const columns = (window.GRADEBOOK_SCHEMES || {})[batch.subjectId] || [];
  const baseRow = (((window.GRADEBOOK_DATA || {})[batch.subjectId] || {})[batch.classId] || [])
    .find(r => r.name === student.name)
    || (((window.GRADEBOOK_DATA || {})[batch.subjectId] || {})[batch.classId] || [])[0]
    || { name: student.name, cells: columns.map(() => '8|L') };

  const cells = columns.map((c, i) => {
    const tok = baseRow.cells[i] || '—|L';
    const [v] = tok.split('|');
    return { value: v === '—' ? null : parseFloat(v), state: 'LOCKED' };
  });

  const num = cells.reduce((a, c, i) => a + (c.value != null ? c.value * columns[i].coefficient : 0), 0);
  const den = cells.reduce((a, c, i) => a + (c.value != null ? columns[i].coefficient : 0), 0);
  const avg = den ? num / den : student.termAvg;

  const sm = AR_STATUS_META[student.status];

  return (
    <React.Fragment>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 620, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', animation: 'ar-slide-in 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 22px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        }}>
          <Avatar initials={student.avatar} color={pColor} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary }}>{student.name}</div>
              <Badge color={sm.color} bg={sm.bg}>
                <Icon name={sm.icon} size={11} color={sm.color} strokeWidth={2.4} />
                {t(sm.vi, sm.en)}
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{batch.classId} · {batch.term} · {batch.year}</span>
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10.5, background: T.bg, padding: '1px 7px', borderRadius: 4 }}>
                {student.id}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}>
            <Icon name="x" size={18} color={T.textMuted} />
          </button>
        </div>

        {/* Frozen banner */}
        <div style={{
          padding: '10px 22px', background: T.bg,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name="lock" size={12} color={T.textMuted} strokeWidth={2.2} />
          <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>
            {t('Bản ghi học bạ được đóng băng tại thời điểm ký — chỉ đọc.',
               'Frozen transcript snapshot as of seal time — read-only.')}
          </span>
        </div>

        {/* Body — frozen grade table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
          <div style={{
            border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 14px', background: T.bg,
              borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon name="bookOpen" size={14} color={T.textSecondary} />
              <div style={{ fontSize: 12.5, fontWeight: 800, color: T.textSecondary }}>
                {t('Bảng điểm cuối kỳ', 'Term grade table')}
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                {batch.subjectId}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {columns.map(c => {
                    const tint = (window.GE_COL_TINT || {})[c.columnType] || T.primary;
                    return (
                      <th key={c.id} style={{
                        padding: '10px 8px 12px', textAlign: 'center',
                        background: tint + '14', borderBottom: `2px solid ${tint}55`, verticalAlign: 'bottom',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
                  <th style={{
                    padding: '10px 14px 12px', textAlign: 'center',
                    background: T.bg, borderBottom: `2px solid ${T.border}`, verticalAlign: 'bottom',
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: T.textPrimary }}>{t('TB kỳ', 'Term Avg')}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {cells.map((c, i) => (
                    <td key={i} style={{ padding: '14px 10px', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 6,
                        background: T.errorLight, color: arScoreColor(c.value),
                        fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      }}>
                        {c.value == null ? '—' : c.value}
                        <Icon name="lock" size={10} color={T.error} strokeWidth={2} />
                      </span>
                    </td>
                  ))}
                  <td style={{ padding: '14px 12px', textAlign: 'center', borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: arScoreColor(avg), fontVariantNumeric: 'tabular-nums' }}>
                      {avg.toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Seal metadata */}
          <div style={{
            marginTop: 18, padding: 16, borderRadius: 12,
            border: `1px solid ${T.border}`, background: T.card,
          }}>
            <div style={{
              fontSize: 10.5, fontWeight: 800, color: T.textMuted,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              {t('Siêu dữ liệu học bạ', 'Seal metadata')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', fontSize: 12.5 }}>
              <MetaRow label={t('Trạng thái', 'Status')} value={<Badge color={sm.color} bg={sm.bg}>{t(sm.vi, sm.en)}</Badge>} />
              {student.sealedAt && <MetaRow label={t('Thời điểm ký', 'Sealed at')} value={student.sealedAt} mono />}
              {student.sealedBy && <MetaRow label={t('Người ký', 'Sealed by')} value={student.sealedBy} />}
              {student.unsealedAt && <MetaRow label={t('Thời điểm mở', 'Unsealed at')} value={student.unsealedAt} mono />}
              {student.unsealReason && <MetaRow label={t('Lý do mở', 'Unseal reason')} value={student.unsealReason} />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0,
        }}>
          <Button variant="ghost" onClick={onClose}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Đóng', 'Close')}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

const MetaRow = ({ label, value, mono }) => (
  <React.Fragment>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: T.textMuted, whiteSpace: 'nowrap' }}>
      {label}
    </div>
    <div style={{
      fontSize: 12.5, color: T.textPrimary, fontWeight: 700, minWidth: 0,
      fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit',
    }}>
      {value}
    </div>
  </React.Fragment>
);

// ── Seal confirm dialog ──────────────────────────────────────────────────────

const SealConfirmDialog = ({ t, pColor, batch, stats, onCancel, onConfirm }) => {
  const [progress, setProgress] = React.useState(false);
  const handle = () => {
    setProgress(true);
    window.setTimeout(() => onConfirm(), 700);
  };
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
          animation: 'ar-fadein 0.18s ease-out',
        }}>
        <div style={{ padding: '22px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: T.success + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="award" size={20} color={T.success} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
                {t('Xác nhận ký học bạ', 'Confirm record seal')}
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>
                {t('Ký học bạ cho toàn bộ ', 'Seal records for all ')}
                <strong style={{ color: T.textPrimary }}>{stats.pending}</strong>{' '}
                {t('học sinh chưa ký của lớp ', 'unsealed students in class ')}
                <strong style={{ color: T.textPrimary }}>{batch.classId}</strong>
                {' — '}
                <strong style={{ color: T.textPrimary }}>{batch.term}</strong>
                {' '}({batch.year}){'?'}
              </div>
            </div>
          </div>
          <div style={{
            padding: '12px 14px', background: T.successLight,
            border: `1px solid ${T.success}33`, borderRadius: 10,
            fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6,
          }}>
            <strong style={{ color: T.success, fontWeight: 800 }}>
              {t('Sau khi ký:', 'After sealing:')}
            </strong>{' '}
            {t('điểm được đóng băng tại thời điểm này và không thể thay đổi. ',
               'grades are frozen as of now and cannot be changed. ')}
            {t('Để chỉnh sửa sau khi ký, cần ', 'To edit afterwards, you must ')}
            <strong style={{ color: T.textPrimary }}>
              {t('yêu cầu mở học bạ với xác nhận 2 quản trị viên', 'create an unseal request with two-ADMIN approval')}
            </strong>
            {'.'}
          </div>
        </div>
        <div style={{
          padding: '14px 24px', background: T.bg,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center',
        }}>
          {progress && (
            <div style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.textMuted }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                border: `2px solid ${T.border}`, borderTopColor: T.success,
                display: 'inline-block', animation: 'ar-spin 0.8s linear infinite',
              }} />
              {t('Đang ký…', 'Sealing…')}
            </div>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={progress}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Huỷ', 'Cancel')}
          </Button>
          <Button variant="primary" icon="award" onClick={handle} disabled={progress}
            style={{ background: T.success, borderColor: T.success }}>
            {t('Xác nhận ký', 'Confirm seal')}
          </Button>
          <style>{`@keyframes ar-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
};

// ── TAB 2 — Unseal Requests ──────────────────────────────────────────────────

const UnsealTab = ({ t, lang, pColor, unseals, onApprove, onCreate }) => {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selfApproveTarget, setSelfApproveTarget] = React.useState(null);

  const pending = unseals.filter(u => u.status === 'PENDING');
  const past = unseals.filter(u => u.status !== 'PENDING');

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>
            {t('Yêu cầu mở học bạ', 'Unseal requests')}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
            {t('Mỗi yêu cầu cần xác nhận thứ hai từ ADMIN khác trước khi học bạ được mở.',
               'Each request requires a second-ADMIN confirmation before the record is unsealed.')}
          </div>
        </div>
        <Badge color={T.warning}>
          <Icon name="clock" size={11} color={T.warning} strokeWidth={2.4} />
          {pending.length} {t('chờ xác nhận', 'pending')}
        </Badge>
        <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
          {t('Tạo yêu cầu mở học bạ', 'New unseal request')}
        </Button>
      </div>

      {/* Pending list */}
      <SectionLabel label={t('Đang chờ xác nhận', 'Awaiting confirmation')} count={pending.length} />
      {pending.length === 0 ? (
        <UnsealEmpty t={t} variant="pending" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          {pending.map(u => (
            <UnsealCard key={u.id} req={u} t={t} pColor={pColor}
              onApprove={() => onApprove(u.id, true)}
              onSelfApprove={() => setSelfApproveTarget(u)} />
          ))}
        </div>
      )}

      <SectionLabel label={t('Đã xử lý', 'Resolved')} count={past.length} />
      {past.length === 0 ? (
        <UnsealEmpty t={t} variant="past" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {past.map(u => (
            <UnsealCard key={u.id} req={u} t={t} pColor={pColor} readonly />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateUnsealSheet
          t={t} pColor={pColor}
          onClose={() => setCreateOpen(false)}
          onSubmit={(payload) => { onCreate(payload); setCreateOpen(false); }}
        />
      )}

      {selfApproveTarget && (
        <SelfApproveDialog
          t={t} pColor={pColor} req={selfApproveTarget}
          onCancel={() => setSelfApproveTarget(null)}
          onConfirm={() => {
            onApprove(selfApproveTarget.id, false);
            setSelfApproveTarget(null);
          }}
        />
      )}
    </div>
  );
};

const SectionLabel = ({ label, count }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, margin: '4px 2px 10px',
  }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {label}
    </div>
    <span style={{
      fontSize: 10, fontWeight: 800, color: T.textSecondary,
      background: T.bg, padding: '1px 8px', borderRadius: 99,
      fontVariantNumeric: 'tabular-nums',
    }}>{count}</span>
  </div>
);

const UnsealEmpty = ({ t, variant }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '34px 20px', textAlign: 'center', color: T.textMuted,
    marginBottom: 22, fontSize: 12.5,
  }}>
    <Icon name="lockClosed" size={26} color={T.border} />
    <div style={{ marginTop: 8, fontWeight: 700, color: T.textSecondary, fontSize: 13 }}>
      {variant === 'pending'
        ? t('Không có yêu cầu chờ xác nhận', 'No pending requests')
        : t('Chưa có yêu cầu nào đã xử lý', 'No resolved requests yet')}
    </div>
  </div>
);

// ── Unseal request card ──────────────────────────────────────────────────────

const UnsealCard = ({ req, t, pColor, onApprove, onSelfApprove, readonly }) => {
  const isPending = req.status === 'PENDING';
  const isSelfRequest = req.requestedBy.id === AR_CURRENT_ADMIN.id;
  const isApproved = req.status === 'APPROVED';

  return (
    <div style={{
      background: T.card, borderRadius: 12,
      border: `1px solid ${isPending ? T.warning + '44' : T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      overflow: 'hidden', position: 'relative',
    }}>
      {isPending && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: T.warning }} />
      )}

      <div style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11, flexShrink: 0,
            background: pColor + '14', border: `1px solid ${pColor}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="lock" size={20} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
                {req.studentName}
              </div>
              <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
              <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 600 }}>
                {req.classId} · {req.term} · {req.year}
              </span>
            </div>
            <div style={{
              marginTop: 8,
              padding: '10px 12px',
              background: T.bg, borderRadius: 8,
              fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6,
              borderLeft: `3px solid ${T.warning}`,
            }}>
              <span style={{
                fontSize: 9.5, fontWeight: 800, color: T.textMuted,
                letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 6,
              }}>
                {t('Lý do', 'Reason')}
              </span>
              {req.reason}
            </div>
          </div>

          {/* Right column — status + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 200 }}>
            {isPending ? (
              <Badge color={T.warning}>
                <Icon name="clock" size={11} color={T.warning} strokeWidth={2.4} />
                {t('Chờ xác nhận', 'Awaiting confirmation')}
              </Badge>
            ) : (
              <Badge color={T.success}>
                <Icon name="check" size={11} color={T.success} strokeWidth={2.4} />
                {req.selfApproved ? t('Đã duyệt (tự PD)', 'Approved (self)') : t('Đã duyệt', 'Approved')}
              </Badge>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: T.textMuted }}>
              <Avatar initials={req.requestedBy.avatar || req.requestedBy.name[0]} color={T.textMuted} size={20} />
              {t(`Yêu cầu bởi ${req.requestedBy.name}`, `Requested by ${req.requestedBy.name}`)}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {req.requestedAtVi || req.requestedAtEn}
            </div>
            {isApproved && req.approvedBy && (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: T.success }}>
                  <Avatar initials={req.approvedBy.avatar || req.approvedBy.name[0]} color={T.success} size={20} />
                  {t(`Xác nhận bởi ${req.approvedBy.name}`, `Confirmed by ${req.approvedBy.name}`)}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {req.approvedAtVi || req.approvedAtEn}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action row */}
        {!readonly && isPending && (
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            {!isSelfRequest ? (
              <>
                <div style={{ flex: 1, fontSize: 12, color: T.textSecondary }}>
                  <Icon name="userCheck" size={12} color={T.textSecondary} />
                  {' '}
                  {t(`Yêu cầu được tạo bởi ADMIN khác. Bạn (${AR_CURRENT_ADMIN.name}) có thể xác nhận để mở học bạ.`,
                     `Created by another ADMIN. You (${AR_CURRENT_ADMIN.name}) can confirm to unseal.`)}
                </div>
                <Button variant="primary" icon="check" onClick={onApprove}>
                  {t('Xác nhận mở', 'Confirm unseal')}
                </Button>
              </>
            ) : (
              <>
                <div style={{ flex: 1, fontSize: 12, color: T.textMuted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={12} color={T.textMuted} />
                  {t('Chờ xác nhận từ quản trị viên khác', 'Awaiting confirmation from another administrator')}
                </div>
                <Button
                  variant="ghost"
                  icon="alertTriangle"
                  onClick={onSelfApprove}
                  style={{
                    border: `1.5px dashed ${T.error}55`,
                    color: T.error, background: T.errorLight,
                    fontWeight: 700,
                  }}>
                  {t('Tự phê duyệt (cảnh báo)', 'Self-approve (warning)')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Self-approve warning dialog ──────────────────────────────────────────────

const SelfApproveDialog = ({ t, pColor, req, onCancel, onConfirm }) => (
  <div onClick={onCancel}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 20, backdropFilter: 'blur(3px)',
    }}>
    <div onClick={(e) => e.stopPropagation()}
      role="alertdialog" aria-modal="true"
      style={{
        background: T.card, borderRadius: 14, width: '100%', maxWidth: 500,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: 'ar-fadein 0.18s ease-out',
      }}>
      <div style={{ padding: '22px 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: T.error + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="alertTriangle" size={20} color={T.error} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
              {t('Cảnh báo: Tự phê duyệt', 'Warning: Self-approval')}
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>
              {t('Bạn đang tự phê duyệt yêu cầu mở học bạ của chính mình. ',
                 'You are about to self-approve your own unseal request. ')}
              {t('Hành động này sẽ được ', 'This action will be ')}
              <strong style={{ color: T.error }}>{t('ghi lại trong nhật ký kiểm toán', 'logged to the audit trail')}</strong>
              {t(' và có thể bị BGH cấp cao xét duyệt sau.', ' and may be reviewed by senior leadership.')}
            </div>
          </div>
        </div>

        <div style={{
          padding: '10px 14px', background: T.bg, borderRadius: 8,
          fontSize: 12, color: T.textSecondary, lineHeight: 1.6,
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}>
          <span style={{ color: T.textMuted, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            AUDIT ENTRY
          </span>
          <div style={{ marginTop: 6, lineHeight: 1.7 }}>
            self_approve · unseal_request: <strong>{req.id}</strong><br />
            student: <strong>{req.studentName}</strong> · class: <strong>{req.classId}</strong><br />
            admin: <strong>{AR_CURRENT_ADMIN.id}</strong> ({AR_CURRENT_ADMIN.name})
          </div>
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
        <Button variant="danger" icon="alertTriangle" onClick={onConfirm}>
          {t('Tiếp tục tự phê duyệt', 'Proceed anyway')}
        </Button>
      </div>
    </div>
  </div>
);

// ── Create unseal request sheet ──────────────────────────────────────────────

const ALL_SEALED_STUDENTS = Object.entries(AR_SEED_ROSTERS).flatMap(([key, list]) => {
  const [classId, term, year] = key.split('|');
  return list
    .filter(s => s.status === 'SEALED' || s.status === 'UNSEALED')
    .map(s => ({ ...s, classId, term, year, batchKey: key }));
});

const CreateUnsealSheet = ({ t, pColor, onClose, onSubmit }) => {
  const [studentId, setStudentId] = React.useState('');
  const [reason, setReason] = React.useState('');

  const student = ALL_SEALED_STUDENTS.find(s => s.id === studentId);
  const minLen = 20;
  const canSubmit = !!student && reason.trim().length >= minLen;

  return (
    <React.Fragment>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', animation: 'ar-slide-in 0.22s ease-out',
      }}>
        <div style={{ padding: '20px 22px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: pColor + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="lockClosed" size={18} color={pColor} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
                {t('Tạo yêu cầu mở học bạ', 'New unseal request')}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {t('Yêu cầu sẽ chờ xác nhận từ ADMIN thứ hai.', 'Request will await second-ADMIN confirmation.')}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}>
              <Icon name="x" size={16} color={T.textMuted} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
          <FieldLabel label={t('Học sinh đã ký học bạ', 'Sealed student')} required />
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
            style={{
              width: '100%', padding: '10px 32px 10px 12px', borderRadius: 8,
              border: `1.5px solid ${T.border}`, background: T.card,
              fontSize: 13.5, fontWeight: 700, color: T.textPrimary,
              cursor: 'pointer', fontFamily: 'inherit', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><polyline points='1,1 5,5 9,1' fill='none' stroke='%238898A9' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
            }}>
            <option value="">{t('— Chọn học sinh —', '— Select student —')}</option>
            {ALL_SEALED_STUDENTS.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.classId} · {s.term} · {s.year}
              </option>
            ))}
          </select>

          {student && (
            <div style={{
              marginTop: 10, padding: '10px 12px', background: T.bg, borderRadius: 8,
              fontSize: 12, color: T.textSecondary,
              display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <Avatar initials={student.avatar} color={pColor} size={22} />
              <strong style={{ color: T.textPrimary }}>{student.name}</strong>
              <span style={{ color: T.textMuted }}>·</span>
              {student.classId} · {student.term} · {student.year}
              <span style={{ color: T.textMuted }}>·</span>
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
                {t('Ký', 'Sealed')} {student.sealedAt}
              </span>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <FieldLabel
              label={t('Lý do mở học bạ — bắt buộc', 'Unseal reason — required')}
              required
            />
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder={t('Mô tả chi tiết lý do cần mở học bạ, kèm số biên bản / công văn nếu có…',
                             'Describe in detail why this record needs to be unsealed, including any reference document / decision number…')}
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
            marginTop: 18, padding: '12px 14px',
            background: T.warningLight, border: `1px solid ${T.warning}33`,
            borderRadius: 10, fontSize: 12, color: T.textSecondary, lineHeight: 1.6,
          }}>
            <strong style={{ color: '#9A6A0F', fontWeight: 800 }}>
              {t('Lưu ý:', 'Note:')}
            </strong>{' '}
            {t('Yêu cầu này yêu cầu xác nhận thứ hai từ ADMIN khác trước khi học bạ thực sự được mở. Mọi hành động đều được ghi vào nhật ký kiểm toán.',
               'This request requires a second-ADMIN confirmation before the record is actually unsealed. All actions are logged to the audit trail.')}
          </div>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0,
        }}>
          <Button variant="ghost" onClick={onClose}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Huỷ', 'Cancel')}
          </Button>
          <Button variant="primary" icon="send" disabled={!canSubmit}
            onClick={() => onSubmit({
              studentName: student.name,
              classId: student.classId,
              term: student.term,
              year: student.year,
              reason: reason.trim(),
            })}>
            {t('Tạo yêu cầu', 'Create request')}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

const FieldLabel = ({ label, required }) => (
  <div style={{
    fontSize: 10.5, fontWeight: 800, color: T.textMuted,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    marginBottom: 6,
  }}>
    {label} {required && <span style={{ color: T.error }}>*</span>}
  </div>
);

Object.assign(window, { AcademicRecordsScreen });
