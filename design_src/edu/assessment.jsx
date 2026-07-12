// ── Grade Scale & Assessment Scheme Config — /admin/assessment ──────────────
// Role:    ADMIN only
// Epic:    US-E12.6 (FE) / US-059 (BE) — see NEW-02 for the BE model notes.
// Step:    4 of 5 in the school onboarding flow (reachable from school-setup.jsx).
// Model:   GradeScale = school-wide ranking bands over the 0–10 axis (or 4.0
//          GPA / A–F letter). AssessmentScheme = per grade-scoped Subject ×
//          academic year (ADR 0036/0037). Two-level subject picker mirrors the
//          subject master hierarchy: khối lớp → môn học of that grade.

// ── Static presets ──────────────────────────────────────────────────────────

const AS_SCALE_PRESETS = [
  {
    id: 'vn10',
    vi: 'Thang 10', en: 'Scale 10',
    desc: { vi: 'Mặc định Việt Nam · Thông tư 22/2021', en: 'Default VN · Circular 22/2021' },
    domain: { min: 0, max: 10, decimals: 1, unit: '' },
    bands: [
      { id: 'b-xs', labelVi: 'Xuất sắc',  labelEn: 'Outstanding', from: 9.5, to: 10,  color: '#13DEB9' },
      { id: 'b-gi', labelVi: 'Giỏi',      labelEn: 'Excellent',   from: 8.0, to: 9.4, color: '#5D87FF' },
      { id: 'b-kh', labelVi: 'Khá',       labelEn: 'Good',        from: 6.5, to: 7.9, color: '#FFAE1F' },
      { id: 'b-tb', labelVi: 'Trung bình', labelEn: 'Average',    from: 5.0, to: 6.4, color: '#8898A9' },
      { id: 'b-ye', labelVi: 'Yếu',       labelEn: 'Poor',        from: 0,   to: 4.9, color: '#FA896B' },
    ],
  },
  {
    id: 'gpa4',
    vi: 'Thang 4.0', en: 'Scale 4.0 (GPA)',
    desc: { vi: 'GPA chuẩn quốc tế', en: 'International GPA' },
    domain: { min: 0, max: 4, decimals: 1, unit: '' },
    bands: [
      { id: 'gpa-a', labelVi: 'A · Xuất sắc',   labelEn: 'A · Outstanding', from: 3.5, to: 4.0, color: '#13DEB9' },
      { id: 'gpa-b', labelVi: 'B · Khá',        labelEn: 'B · Good',        from: 2.5, to: 3.4, color: '#5D87FF' },
      { id: 'gpa-c', labelVi: 'C · Trung bình', labelEn: 'C · Average',     from: 1.5, to: 2.4, color: '#FFAE1F' },
      { id: 'gpa-d', labelVi: 'D · Đạt',        labelEn: 'D · Pass',        from: 1.0, to: 1.4, color: '#8898A9' },
      { id: 'gpa-f', labelVi: 'F · Không đạt',  labelEn: 'F · Fail',        from: 0,   to: 0.9, color: '#FA896B' },
    ],
  },
  {
    id: 'letter',
    vi: 'Xếp loại chữ', en: 'Letter grades',
    desc: { vi: 'Quy đổi từ phần trăm', en: 'Mapped from percentages' },
    domain: { min: 0, max: 100, decimals: 0, unit: '%' },
    bands: [
      { id: 'lt-a', labelVi: 'A', labelEn: 'A', from: 90, to: 100, color: '#13DEB9' },
      { id: 'lt-b', labelVi: 'B', labelEn: 'B', from: 80, to: 89,  color: '#5D87FF' },
      { id: 'lt-c', labelVi: 'C', labelEn: 'C', from: 70, to: 79,  color: '#FFAE1F' },
      { id: 'lt-d', labelVi: 'D', labelEn: 'D', from: 60, to: 69,  color: '#8898A9' },
      { id: 'lt-f', labelVi: 'F', labelEn: 'F', from: 0,  to: 59,  color: '#FA896B' },
    ],
  },
];

// Component-column schemes — used to seed the scheme editor when a subject is
// picked. ×N is the "Số lần" (times the column appears in the grade book).
const AS_SCHEME_PRESETS = [
  {
    id: 'tt22',
    vi: 'Theo Thông tư 22/2021', en: 'Per Circular 22/2021',
    desc: { vi: 'Áp dụng cho THPT', en: 'For upper secondary' },
    columns: [
      { id: 'c-tx', labelVi: 'Điểm thường xuyên', labelEn: 'Continuous (TX)', times: 2, weight: 20, kind: 'TX' },
      { id: 'c-gk', labelVi: 'Giữa kỳ',            labelEn: 'Midterm',         times: 1, weight: 30, kind: 'GK' },
      { id: 'c-ck', labelVi: 'Cuối kỳ',            labelEn: 'Final',           times: 1, weight: 50, kind: 'CK' },
    ],
  },
  {
    id: 'tt26',
    vi: 'THCS Thông tư 26', en: 'Circular 26 · Lower secondary',
    desc: { vi: 'Áp dụng cho THCS', en: 'For lower secondary' },
    columns: [
      { id: 'c-tx', labelVi: 'Điểm thường xuyên', labelEn: 'Continuous (TX)', times: 4, weight: 40, kind: 'TX' },
      { id: 'c-gk', labelVi: 'Giữa kỳ',            labelEn: 'Midterm',         times: 1, weight: 20, kind: 'GK' },
      { id: 'c-ck', labelVi: 'Cuối kỳ',            labelEn: 'Final',           times: 1, weight: 40, kind: 'CK' },
    ],
  },
  {
    id: 'custom',
    vi: 'Tùy chỉnh', en: 'Custom',
    desc: { vi: 'Tự định nghĩa cột & trọng số', en: 'Define columns & weights yourself' },
    columns: [
      { id: 'c1', labelVi: 'Cột 1', labelEn: 'Column 1', times: 1, weight: 100, kind: 'TX' },
    ],
  },
];

// Seed: scheme already configured for Toán lớp 10 (Thông tư 22).
const AS_SEED_SCHEMES = {
  'sub-math-10': {
    presetId: 'tt22',
    columns: [
      { id: 'c-tx', labelVi: 'Điểm thường xuyên', labelEn: 'Continuous (TX)', times: 2, weight: 20, kind: 'TX' },
      { id: 'c-gk', labelVi: 'Giữa kỳ',            labelEn: 'Midterm',         times: 1, weight: 30, kind: 'GK' },
      { id: 'c-ck', labelVi: 'Cuối kỳ',            labelEn: 'Final',           times: 1, weight: 50, kind: 'CK' },
    ],
  },
};

const AS_KIND_META = {
  TX: { color: T.primary, vi: 'TX', en: 'TX' },
  GK: { color: T.warning, vi: 'GK', en: 'GK' },
  CK: { color: T.error,   vi: 'CK', en: 'CK' },
};

const asNewId = (p) => `${p}-${Math.random().toString(36).slice(2, 7)}`;

// ── Main screen ─────────────────────────────────────────────────────────────

const AssessmentSchemeScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  // Subject catalogue — resolved from the shared window.SM_SEED_PARENTS so this
  // screen reflects whatever is currently configured in /admin/subjects.
  const subjectParents = window.SM_SEED_PARENTS || [];
  const allSubjects = React.useMemo(() =>
    subjectParents
      .filter(p => p.status === 'ACTIVE')
      .flatMap(p => p.subjects.filter(s => s.status === 'ACTIVE')),
    [subjectParents]
  );
  const noSubjects = allSubjects.length === 0;

  // Grade levels surfaced for the picker.
  const gradeLevels = React.useMemo(() => {
    const set = new Set(allSubjects.map(s => s.gradeLevel).filter(g => g != null));
    return Array.from(set).sort((a, b) => a - b);
  }, [allSubjects]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}>
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
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('school-setup'); }}
            style={{ color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
            {t('Thiết lập trường', 'School setup')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>
            {t('Thang điểm & Khung ĐG', 'Assessment Scheme')}
          </span>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="percent" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
                {t('Thang điểm & Khung đánh giá', 'Grade Scale & Assessment Scheme')}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 99,
                background: pColor + '14', color: pColor,
                border: `1px solid ${pColor}33`,
                fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
              }}>
                <Icon name="sparkles" size={10} color={pColor} strokeWidth={2.4} />
                {t('Bước 4/5 · Onboarding', 'Step 4/5 · Onboarding')}
              </span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Khung xếp loại học sinh & cấu trúc cột điểm theo môn (ADR 0036/0037).',
                 "Student ranking scale + per-subject grade-book column structure (ADR 0036/0037).")}
            </div>
          </div>
          <Badge color={T.error}>
            <Icon name="shield" size={11} color={T.error} strokeWidth={2.4} />
            ADMIN
          </Badge>
        </div>

        {/* No-subjects banner */}
        {noSubjects && (
          <NoSubjectsBanner t={t} pColor={pColor} onNavigate={onNavigate} />
        )}

        {/* Main two-column layout: 40 / 60 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 4fr) minmax(0, 6fr)',
          gap: 18, alignItems: 'start',
        }}>
          <GradeScaleSection t={t} pColor={pColor} />
          <AssessmentSchemeSection
            t={t} lang={lang} pColor={pColor}
            allSubjects={allSubjects}
            gradeLevels={gradeLevels}
            onNavigateToSubjects={() => onNavigate && onNavigate('subjects')}
          />
        </div>
      </div>
    </div>
  );
};

// ── Shared SectionCard / Header ─────────────────────────────────────────────

const AsCard = ({ children, style }) => (
  <div style={{
    background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24,
    ...style,
  }}>{children}</div>
);

const AsSectionHeader = ({ icon, iconColor, title, subtitle, right, dirty, t }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: iconColor + '18', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={icon} size={20} color={iconColor} strokeWidth={1.8} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{title}</div>
        {dirty && (
          <span title={t('Chưa lưu', 'Unsaved')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10.5, fontWeight: 800, color: T.warning,
            background: T.warningLight,
            padding: '2px 8px', borderRadius: 99, letterSpacing: '0.04em',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.warning }} />
            {t('Chưa lưu', 'Unsaved')}
          </span>
        )}
      </div>
      {subtitle && <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.55, marginTop: 3 }}>{subtitle}</div>}
    </div>
    {right}
  </div>
);

// ── Pill button (preset selector) ───────────────────────────────────────────

const AsPill = ({ active, onClick, color, children, subtitle }) => (
  <button onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
      padding: '8px 14px', borderRadius: 9,
      border: `1.5px solid ${active ? color : T.border}`,
      background: active ? color + '14' : T.card,
      color: active ? color : T.textSecondary,
      fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
      fontFamily: 'inherit', textAlign: 'left',
      transition: 'all 0.15s', minWidth: 0,
    }}>
    <span>{children}</span>
    {subtitle && (
      <span style={{
        fontSize: 10.5, fontWeight: 600,
        color: active ? color : T.textMuted,
        whiteSpace: 'nowrap',
      }}>{subtitle}</span>
    )}
  </button>
);

// ── SECTION A — Grade Scale (LEFT 40%) ──────────────────────────────────────

const GradeScaleSection = ({ t, pColor }) => {
  const [presetId, setPresetId] = React.useState('vn10');
  const preset = AS_SCALE_PRESETS.find(p => p.id === presetId);
  const [bands, setBands] = React.useState(preset.bands.map(b => ({ ...b })));
  const [domain, setDomain] = React.useState(preset.domain);
  const [savedBands, setSavedBands] = React.useState(preset.bands.map(b => ({ ...b })));
  const [savedPresetId, setSavedPresetId] = React.useState('vn10');
  const [toast, setToast] = React.useState(null);

  const applyPreset = (id) => {
    const p = AS_SCALE_PRESETS.find(x => x.id === id);
    if (!p) return;
    setPresetId(id);
    setBands(p.bands.map(b => ({ ...b })));
    setDomain(p.domain);
  };

  // Inline validation: coverage + overlap (warnings only — don't block save).
  const validation = React.useMemo(() => {
    const sorted = bands.slice().sort((a, b) => a.from - b.from);
    let overlap = false;
    let covers = sorted.length > 0 && Math.abs(sorted[0].from - domain.min) < 0.0001;
    let lastTo = sorted.length ? sorted[0].to : domain.min - 1;
    for (let i = 1; i < sorted.length; i++) {
      const b = sorted[i];
      if (b.from <= lastTo + 0.0001 - 0.05) overlap = true; // allow tiny touch
      if (b.from > lastTo + 0.15) covers = false;
      if (b.to > lastTo) lastTo = b.to;
    }
    if (lastTo + 0.05 < domain.max) covers = false;
    return { covers, overlap };
  }, [bands, domain]);

  const update = (id, patch) => setBands(bs => bs.map(b => b.id !== id ? b : { ...b, ...patch }));
  const remove = (id) => setBands(bs => bs.filter(b => b.id !== id));
  const move   = (idx, dir) => setBands(bs => {
    const next = bs.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return next;
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  });
  const addBand = () => setBands(bs => [...bs, {
    id: asNewId('b'), labelVi: '', labelEn: '',
    from: 0, to: 0, color: '#8898A9',
  }]);

  const dirty = React.useMemo(() => {
    if (presetId !== savedPresetId) return true;
    if (bands.length !== savedBands.length) return true;
    return JSON.stringify(bands) !== JSON.stringify(savedBands);
  }, [bands, savedBands, presetId, savedPresetId]);

  const handleSave = () => {
    setSavedBands(bands.map(b => ({ ...b })));
    setSavedPresetId(presetId);
    setToast(t('Đã lưu thang điểm.', 'Grade scale saved.'));
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <AsCard>
      <AsSectionHeader
        icon="percent" iconColor={pColor}
        title={t('Thang điểm', 'Grade Scale')}
        subtitle={t('Áp dụng cho toàn trường. Xếp loại sẽ hiển thị trên học bạ & báo cáo.',
                   'Applied school-wide. Ranks appear on transcripts and reports.')}
        dirty={dirty} t={t}
      />

      {/* Preset pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {AS_SCALE_PRESETS.map(p => (
          <AsPill key={p.id} active={presetId === p.id} onClick={() => applyPreset(p.id)} color={pColor}
            subtitle={t(p.desc.vi, p.desc.en)}>
            {t(p.vi, p.en)}
          </AsPill>
        ))}
      </div>

      {/* Bands list */}
      <div style={{
        background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`,
        padding: 10, marginBottom: 14,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '14px minmax(0, 1.4fr) minmax(0, 0.85fr) minmax(0, 0.85fr) minmax(0, 1fr) 26px 26px',
          gap: 8, alignItems: 'center',
          padding: '6px 8px',
          fontSize: 9.5, fontWeight: 800, color: T.textMuted,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          <span />
          <span>{t('Xếp loại', 'Rank')}</span>
          <span>{t('Từ', 'From')}</span>
          <span>{t('Đến', 'To')}</span>
          <span>{t('Màu', 'Color')}</span>
          <span />
          <span />
        </div>
        {bands.map((b, i) => (
          <BandRow
            key={b.id} band={b} index={i} total={bands.length} t={t}
            domain={domain}
            onChange={(patch) => update(b.id, patch)}
            onMove={(dir) => move(i, dir)}
            onRemove={() => remove(b.id)}
          />
        ))}
        <button onClick={addBand}
          style={{
            width: '100%', marginTop: 8,
            padding: '8px 10px', borderRadius: 7,
            border: `1.5px dashed ${T.border}`,
            background: 'transparent', color: pColor,
            fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <Icon name="plus" size={13} color={pColor} strokeWidth={2.4} />
          {t('Thêm mức điểm', 'Add band')}
        </button>
      </div>

      {/* Validation */}
      {!validation.covers && (
        <Callout kind="warning" t={t}
          title={t(`Các ngưỡng chưa phủ kín từ ${domain.min} đến ${domain.max}${domain.unit}`,
                   `Bands don't fully cover ${domain.min} to ${domain.max}${domain.unit}`)}
          body={t('Một số khoảng điểm chưa được xếp loại — học sinh rơi vào khoảng đó sẽ không có rank.',
                  'Some score ranges have no rank assigned — students in those ranges will have no rank.')}
        />
      )}
      {validation.overlap && (
        <Callout kind="error" t={t}
          title={t('Các ngưỡng bị chồng lấn', 'Bands overlap')}
          body={t('Hai ngưỡng có khoảng điểm trùng nhau — vui lòng điều chỉnh để mỗi điểm chỉ thuộc một mức.',
                  'Two bands share score ranges — adjust so each score maps to a single rank.')}
        />
      )}

      {/* Save row */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button variant="primary" icon="check" onClick={handleSave} disabled={!dirty}>
          {t('Lưu thang điểm', 'Save grade scale')}
        </Button>
        {dirty && (
          <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>
            {t('Có thay đổi chưa lưu.', 'Unsaved changes.')}
          </span>
        )}
        {toast && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 99,
            background: T.successLight, color: T.success,
            fontSize: 11.5, fontWeight: 800,
            animation: 'as-fadein 0.2s ease-out',
          }}>
            <Icon name="check" size={11} color={T.success} strokeWidth={2.6} />
            {toast}
          </span>
        )}
      </div>

      <style>{`
        @keyframes as-fadein { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </AsCard>
  );
};

const BandRow = ({ band, index, total, t, domain, onChange, onMove, onRemove }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '14px minmax(0, 1.4fr) minmax(0, 0.85fr) minmax(0, 0.85fr) minmax(0, 1fr) 26px 26px',
    gap: 8, alignItems: 'center',
    padding: '6px 8px',
    borderBottom: `1px dashed ${T.border}`,
  }}>
    {/* Color swatch */}
    <span style={{
      width: 12, height: 12, borderRadius: 3,
      background: band.color, border: `1px solid ${T.border}`,
    }} />
    {/* Label + rank badge */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <input
        value={band.labelVi}
        placeholder={t('Tên xếp loại', 'Label')}
        onChange={(e) => onChange({ labelVi: e.target.value })}
        style={{
          flex: 1, minWidth: 0,
          padding: '6px 8px', borderRadius: 6,
          border: `1px solid ${T.border}`, background: T.card,
          fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
          fontFamily: 'inherit', outline: 'none',
        }}
      />
      {band.labelVi && (
        <span style={{
          fontSize: 10.5, fontWeight: 800, color: band.color,
          background: band.color + '20',
          padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
        }}>{band.labelVi}</span>
      )}
    </div>
    {/* From */}
    <input
      type="number" value={band.from} step={domain.decimals === 0 ? 1 : 0.1}
      min={domain.min} max={domain.max}
      onChange={(e) => onChange({ from: parseFloat(e.target.value) || 0 })}
      style={inputNum}
    />
    {/* To */}
    <input
      type="number" value={band.to} step={domain.decimals === 0 ? 1 : 0.1}
      min={domain.min} max={domain.max}
      onChange={(e) => onChange({ to: parseFloat(e.target.value) || 0 })}
      style={inputNum}
    />
    {/* Color picker */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="color" value={band.color}
        onChange={(e) => onChange({ color: e.target.value })}
        style={{
          width: 28, height: 26, borderRadius: 5,
          border: `1px solid ${T.border}`, padding: 0, cursor: 'pointer',
          background: T.card,
        }}
      />
      <span style={{
        fontSize: 10, color: T.textMuted,
        fontFamily: 'ui-monospace, Menlo, monospace',
      }}>{band.color.toUpperCase()}</span>
    </div>
    {/* Move up/down */}
    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
      <button onClick={() => onMove(-1)} disabled={index === 0} title={t('Di chuyển lên', 'Move up')}
        style={iconBtn(index === 0)}>
        <Icon name="chevronLeft" size={10} color={T.textMuted} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} />
      </button>
      <button onClick={() => onMove(1)} disabled={index === total - 1} title={t('Di chuyển xuống', 'Move down')}
        style={iconBtn(index === total - 1)}>
        <Icon name="chevronRight" size={10} color={T.textMuted} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} />
      </button>
    </div>
    {/* Delete */}
    <button onClick={onRemove} title={t('Xoá mức điểm', 'Remove band')}
      style={{
        width: 24, height: 24, borderRadius: 6,
        border: `1px solid ${T.border}`, background: T.card,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.error; e.currentTarget.style.background = T.errorLight; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}>
      <Icon name="x" size={11} color={T.error} strokeWidth={2.4} />
    </button>
  </div>
);

const inputNum = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  border: `1px solid ${T.border}`, background: T.card,
  fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
  fontFamily: 'ui-monospace, Menlo, monospace', outline: 'none',
  fontVariantNumeric: 'tabular-nums',
};

const iconBtn = (disabled) => ({
  width: 22, height: 12, borderRadius: 4,
  border: `1px solid ${T.border}`, background: T.card,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  opacity: disabled ? 0.35 : 1,
  marginBottom: 1,
});

// ── Callout ──────────────────────────────────────────────────────────────────

const Callout = ({ kind, title, body, t }) => {
  const palette = kind === 'error'
    ? { bg: T.errorLight,   border: T.error + '44',   color: T.error,    icon: 'alertTriangle' }
    : { bg: T.warningLight, border: T.warning + '44', color: T.warning,  icon: 'alertTriangle' };
  return (
    <div style={{
      marginTop: 10, padding: '11px 14px',
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderRadius: 10,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <Icon name={palette.icon} size={14} color={palette.color} strokeWidth={2} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: palette.color, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11.5, color: T.textSecondary, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );
};

// ── SECTION B — Assessment Scheme (RIGHT 60%) ───────────────────────────────

const AssessmentSchemeSection = ({ t, lang, pColor, allSubjects, gradeLevels, onNavigateToSubjects }) => {
  // Two-level subject selector: khối lớp → môn học.
  const [grade, setGrade] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const subjectsForGrade = allSubjects.filter(s => String(s.gradeLevel) === String(grade));
  const subject = allSubjects.find(s => s.id === subjectId);

  // Scheme working copy ─ initially loads from AS_SEED_SCHEMES[subjectId].
  // Stored in a map so switching subjects preserves edits in the session.
  const [schemes, setSchemes] = React.useState({ ...AS_SEED_SCHEMES });
  const [presetSel, setPresetSel] = React.useState({});  // per-subject preset id
  const [savedSchemes, setSavedSchemes] = React.useState({ ...AS_SEED_SCHEMES });
  const [toast, setToast] = React.useState(null);

  // Reset grade pick whenever subject list changes.
  React.useEffect(() => {
    if (grade && !gradeLevels.includes(Number(grade))) {
      setGrade('');
      setSubjectId('');
    }
  }, [gradeLevels, grade]);

  const onGradeChange = (g) => {
    setGrade(g);
    setSubjectId('');  // force re-pick subject
  };

  const scheme = subjectId ? schemes[subjectId] : null;
  const dirty = subjectId
    ? JSON.stringify(schemes[subjectId]) !== JSON.stringify(savedSchemes[subjectId])
    : false;

  const applyScheme = (next, withPreset) => {
    setSchemes(s => ({ ...s, [subjectId]: next }));
    if (withPreset) setPresetSel(p => ({ ...p, [subjectId]: withPreset }));
  };

  const handleCreateFromPreset = (preset) => {
    applyScheme({
      presetId: preset.id,
      columns: preset.columns.map(c => ({ ...c, id: asNewId('c') })),
    }, preset.id);
  };

  const handleColumnChange = (colId, patch) => {
    applyScheme({
      ...scheme,
      presetId: 'custom',
      columns: scheme.columns.map(c => c.id === colId ? { ...c, ...patch } : c),
    }, 'custom');
  };
  const handleAddColumn = () => {
    applyScheme({
      ...scheme, presetId: 'custom',
      columns: [...scheme.columns, { id: asNewId('c'), labelVi: 'Cột mới', labelEn: 'New column', times: 1, weight: 0, kind: 'TX' }],
    }, 'custom');
  };
  const handleRemoveColumn = (colId) => {
    applyScheme({
      ...scheme, presetId: 'custom',
      columns: scheme.columns.filter(c => c.id !== colId),
    }, 'custom');
  };

  const handleSave = () => {
    setSavedSchemes(s => ({ ...s, [subjectId]: schemes[subjectId] }));
    setToast(t('Đã lưu khung đánh giá.', 'Assessment scheme saved.'));
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <AsCard>
      <AsSectionHeader
        icon="bookOpen" iconColor={T.teal}
        title={t('Khung đánh giá môn học', 'Per-subject Assessment Scheme')}
        subtitle={t('Cấu trúc cột điểm cho từng môn theo khối. Tổng trọng số bắt buộc bằng 100%.',
                   'Grade-book column structure per grade-scoped subject. Weights must total 100%.')}
        dirty={subjectId && dirty} t={t}
      />

      {/* Subject picker — two level */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
        gap: 12, marginBottom: 18,
      }}>
        <SelectField label={t('Khối lớp', 'Grade level')} value={grade}
          onChange={onGradeChange}
          options={[
            { value: '', label: t('— Chọn khối —', '— Pick grade —') },
            ...gradeLevels.map(g => ({ value: String(g), label: t(`Lớp ${g}`, `Grade ${g}`) })),
          ]} />
        <SelectField label={t('Môn học', 'Subject')} value={subjectId}
          onChange={setSubjectId} disabled={!grade}
          options={[
            { value: '', label: !grade ? t('Chọn khối trước', 'Pick a grade first') : t('— Chọn môn —', '— Pick subject —') },
            ...subjectsForGrade.map(s => ({ value: s.id, label: s.name })),
          ]} />
      </div>

      {/* Body switches on state */}
      {!subjectId
        ? <NoSubjectPicked t={t} />
        : !scheme
          ? <NoSchemeYet t={t} pColor={pColor} subject={subject} onCreate={handleCreateFromPreset} />
          : (
            <SchemeEditor
              t={t} lang={lang} pColor={pColor}
              subject={subject} scheme={scheme}
              presetId={presetSel[subjectId] || scheme.presetId}
              onApplyPreset={handleCreateFromPreset}
              onColumnChange={handleColumnChange}
              onAddColumn={handleAddColumn}
              onRemoveColumn={handleRemoveColumn}
              dirty={dirty}
              toast={toast}
              onSave={handleSave}
            />
          )}
    </AsCard>
  );
};

const SelectField = ({ label, value, onChange, options, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {label}
    </div>
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      style={{
        padding: '9px 32px 9px 12px', borderRadius: 8,
        border: `1.5px solid ${T.border}`, background: disabled ? T.bg : T.card,
        fontSize: 13.5, fontWeight: 700, color: T.textPrimary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><polyline points='1,1 5,5 9,1' fill='none' stroke='%238898A9' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
        opacity: disabled ? 0.6 : 1,
      }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const NoSubjectPicked = ({ t }) => (
  <div style={{
    background: T.bg, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '36px 22px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="bookOpen" size={30} color={T.border} strokeWidth={1.6} />
    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: T.textSecondary }}>
      {t('Chọn khối và môn học để bắt đầu', 'Pick a grade and subject to begin')}
    </div>
    <div style={{ marginTop: 4, fontSize: 11.5 }}>
      {t('Khung đánh giá được cấu hình riêng cho từng môn × năm học.',
         'Schemes are configured per subject × academic year.')}
    </div>
  </div>
);

const NoSchemeYet = ({ t, pColor, subject, onCreate }) => (
  <div style={{
    background: T.bg, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '32px 22px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="clipboardList" size={30} color={T.border} strokeWidth={1.6} />
    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: T.textSecondary }}>
      {t('Chưa có khung đánh giá cho môn học này.',
         'No assessment scheme for this subject yet.')}
    </div>
    <div style={{ marginTop: 4, fontSize: 12, marginBottom: 16 }}>
      {subject.name} · {t('Hãy chọn một preset để khởi tạo nhanh.', 'Pick a preset to get started fast.')}
    </div>
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {AS_SCHEME_PRESETS.map(p => (
        <button key={p.id} onClick={() => onCreate(p)}
          style={{
            padding: '8px 14px', borderRadius: 8,
            border: `1.5px solid ${pColor}55`, background: T.card,
            color: pColor, fontSize: 12.5, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={e => e.currentTarget.style.background = pColor + '12'}
          onMouseLeave={e => e.currentTarget.style.background = T.card}>
          {t('Tạo khung đánh giá', 'Create scheme')} · {t(p.vi, p.en)}
        </button>
      ))}
    </div>
  </div>
);

// ── Scheme editor — selected subject + scheme ───────────────────────────────

const SchemeEditor = ({ t, lang, pColor, subject, scheme, presetId, onApplyPreset, onColumnChange, onAddColumn, onRemoveColumn, dirty, toast, onSave }) => {
  const total = scheme.columns.reduce((a, c) => a + (parseFloat(c.weight) || 0), 0);
  const isHundred = Math.abs(total - 100) < 0.01;

  return (
    <div>
      {/* Selected subject heading */}
      <div style={{
        padding: '14px 16px', marginBottom: 14,
        background: pColor + '0A',
        border: `1px solid ${pColor}33`, borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: pColor + '22', color: pColor,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em' }}>LỚP</span>
          <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{subject.gradeLevel}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
            {t('Khung đánh giá — ', 'Scheme — ')}{subject.name}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' }}>
            {subject.id} · {subject.code}
          </div>
        </div>
        {/* Locked master fields */}
        <LockedMeta label={t('Số tiết / năm', 'Periods / year')} value={subject.periodCount} t={t} />
        <LockedMeta label={t('Số bài KT / kỳ', 'Required exams / term')} value={subject.requiredAssessmentCount} t={t} />
      </div>

      {/* Preset pills */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {t('Khung mẫu', 'Preset')}
        </span>
        {AS_SCHEME_PRESETS.map(p => (
          <AsPill key={p.id} active={presetId === p.id} onClick={() => onApplyPreset(p)} color={pColor}
            subtitle={t(p.desc.vi, p.desc.en)}>
            {t(p.vi, p.en)}
          </AsPill>
        ))}
      </div>

      {/* Component-column table */}
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 12, overflow: 'hidden', marginBottom: 14,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 0.7fr) minmax(0, 0.9fr) 26px',
          gap: 0, alignItems: 'center',
          padding: '10px 14px', background: T.bg,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 10.5, fontWeight: 800, color: T.textMuted,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>{t('Cột điểm', 'Column')}</span>
          <span style={{ textAlign: 'center' }}>{t('Số lần', 'Times')}</span>
          <span style={{ textAlign: 'center' }}>{t('Trọng số', 'Weight')}</span>
          <span />
        </div>
        {scheme.columns.map(col => (
          <ColumnRow
            key={col.id} col={col} t={t} lang={lang} pColor={pColor}
            onChange={(patch) => onColumnChange(col.id, patch)}
            onRemove={() => onRemoveColumn(col.id)}
            canRemove={scheme.columns.length > 1}
          />
        ))}
        {/* Total row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 0.7fr) minmax(0, 0.9fr) 26px',
          alignItems: 'center',
          padding: '12px 14px', borderTop: `2px solid ${T.border}`,
          background: isHundred ? T.successLight + '88' : T.errorLight + '88',
        }}>
          <span style={{
            fontSize: 11.5, fontWeight: 800,
            color: isHundred ? T.success : T.error,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <Icon name={isHundred ? 'check' : 'alertTriangle'} size={12} color={isHundred ? T.success : T.error} strokeWidth={2.4} />
            {' '}
            {t('Tổng trọng số', 'Total weight')}
          </span>
          <span />
          <span style={{
            textAlign: 'center',
            fontSize: 16, fontWeight: 900,
            color: isHundred ? T.success : T.error,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {total.toFixed(0)}%
          </span>
          <span />
        </div>
        {/* Running progress bar */}
        <div style={{ height: 5, background: T.bg, position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%',
            transformOrigin: 'left center', transform: `scaleX(${Math.min(total, 200) / 100})`,
            background: isHundred ? T.success : (total > 100 ? T.error : T.warning),
            transition: 'transform 0.3s, background 0.2s',
          }} />
        </div>
        <button onClick={onAddColumn}
          style={{
            width: '100%', padding: '10px',
            border: 'none', borderTop: `1px dashed ${T.border}`,
            background: T.card, color: pColor,
            fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <Icon name="plus" size={13} color={pColor} strokeWidth={2.4} />
          {t('Thêm cột điểm', 'Add column')}
        </button>
      </div>

      {!isHundred && (
        <Callout kind="error" t={t}
          title={t(`Tổng trọng số phải bằng 100% (hiện tại ${total.toFixed(0)}%)`,
                   `Total must equal 100% (currently ${total.toFixed(0)}%)`)}
          body={t('Học bạ sẽ không lưu được khung này cho đến khi trọng số tổng đúng bằng 100%.',
                  'The scheme cannot be saved until the total weight is exactly 100%.')}
        />
      )}

      {/* Save row */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button variant="primary" icon="check" onClick={onSave} disabled={!dirty || !isHundred}>
          {t('Lưu khung đánh giá', 'Save scheme')}
        </Button>
        {dirty && (
          <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>
            {t('Có thay đổi chưa lưu.', 'Unsaved changes.')}
          </span>
        )}
        {toast && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 99,
            background: T.successLight, color: T.success,
            fontSize: 11.5, fontWeight: 800,
            animation: 'as-fadein 0.2s ease-out',
          }}>
            <Icon name="check" size={11} color={T.success} strokeWidth={2.6} />
            {toast}
          </span>
        )}
      </div>
    </div>
  );
};

const LockedMeta = ({ label, value, t }) => (
  <div title={t('Khoá theo Subject master — chỉ chỉnh tại Danh mục môn học',
                'Locked by Subject master — edit in Subject catalogue')}
    style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '6px 10px', borderRadius: 8,
      background: T.bg, border: `1px solid ${T.border}`,
    }}>
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9.5, fontWeight: 800, color: T.textMuted,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>
      <Icon name="lock" size={9} color={T.textMuted} strokeWidth={2.2} />
      {label}
    </span>
    <span style={{
      fontSize: 13, fontWeight: 800, color: T.textPrimary,
      fontVariantNumeric: 'tabular-nums',
    }}>{value ?? '—'}</span>
  </div>
);

const ColumnRow = ({ col, t, lang, pColor, onChange, onRemove, canRemove }) => {
  const km = AS_KIND_META[col.kind] || AS_KIND_META.TX;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 0.7fr) minmax(0, 0.9fr) 26px',
      alignItems: 'center', gap: 0,
      padding: '10px 14px', borderBottom: `1px solid ${T.border}`,
    }}>
      {/* Label + kind select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <select value={col.kind} onChange={(e) => onChange({ kind: e.target.value })}
          style={{
            padding: '5px 24px 5px 8px', borderRadius: 6,
            border: `1.5px solid ${km.color}55`,
            background: km.color + '14', color: km.color,
            fontSize: 10.5, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit', appearance: 'none',
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 10 6'><polyline points='1,1 5,5 9,1' fill='none' stroke='${encodeURIComponent(km.color)}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
            letterSpacing: '0.06em',
          }}>
          {Object.keys(AS_KIND_META).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input
          value={col.labelVi}
          onChange={(e) => onChange({ labelVi: e.target.value })}
          placeholder={t('Tên cột', 'Column name')}
          style={{
            flex: 1, minWidth: 0,
            padding: '6px 10px', borderRadius: 6,
            border: `1px solid ${T.border}`, background: T.card,
            fontSize: 13, fontWeight: 700, color: T.textPrimary,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>
      {/* Times */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>×</span>
        <input type="number" value={col.times} min={1} step={1}
          onChange={(e) => onChange({ times: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          style={{ ...inputNum, width: 56, textAlign: 'center' }} />
      </div>
      {/* Weight */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        <input type="number" value={col.weight} min={0} max={100} step={1}
          onChange={(e) => onChange({ weight: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
          style={{ ...inputNum, width: 64, textAlign: 'center' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>%</span>
      </div>
      {/* Remove */}
      <button onClick={onRemove} disabled={!canRemove}
        title={canRemove ? t('Xoá cột', 'Remove') : t('Cần ít nhất 1 cột', 'At least one column required')}
        style={{
          width: 24, height: 24, borderRadius: 6,
          border: `1px solid ${T.border}`, background: T.card,
          cursor: canRemove ? 'pointer' : 'not-allowed',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          opacity: canRemove ? 1 : 0.35,
        }}>
        <Icon name="x" size={11} color={T.error} strokeWidth={2.4} />
      </button>
    </div>
  );
};

// ── No subjects banner ──────────────────────────────────────────────────────

const NoSubjectsBanner = ({ t, pColor, onNavigate }) => (
  <div style={{
    padding: '14px 18px', marginBottom: 18,
    background: T.warningLight,
    border: `1px solid ${T.warning}44`, borderRadius: 12,
    display: 'flex', alignItems: 'center', gap: 14,
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: T.warning + '22',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="alertTriangle" size={17} color={T.warning} strokeWidth={2} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#9A6A0F' }}>
        {t('Cần thiết lập danh mục môn học trước', 'Subject catalogue must be configured first')}
      </div>
      <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 2 }}>
        {t('Khung đánh giá phụ thuộc vào danh mục môn học theo khối lớp. Hãy thêm môn học trước khi cấu hình khung đánh giá.',
           'The assessment scheme requires a grade-scoped subject catalogue. Add subjects before configuring schemes.')}
      </div>
    </div>
    <Button variant="secondary" icon="arrowRight" onClick={() => onNavigate && onNavigate('subjects')}>
      {t('Đến Danh mục môn học', 'Open Subject catalogue')}
    </Button>
  </div>
);

Object.assign(window, { AssessmentSchemeScreen });
