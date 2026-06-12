// ── School Setup Configuration (ADMIN · /admin/school-setup) ──────────────────
// Route:  /admin/school-setup
// Role:   ADMIN (US-049 · ADR 0035 — GradeLevelRange + Operational Settings)
// APIs:   GET  /api/v1/core/config/school
//         GET  /api/v1/core/config/school/setup-status
//         PUT  /api/v1/core/config/school/grade-levels       { minGrade, maxGrade }
//         PUT  /api/v1/core/config/school/operational-settings { gradePublishMode }
// Notes:  Hard constraint enforced client-side: 1 ≤ minGrade ≤ maxGrade ≤ 13.
//         Narrowing is blocked server-side if ACTIVE classes fall outside the
//         new range — we surface that as a warning callout here.

const SCHOOL_SETUP_PRESETS = [
  { id: 'primary',   min: 1,  max: 5,  vi: 'Tiểu học',          en: 'Primary' },
  { id: 'secondary', min: 6,  max: 9,  vi: 'THCS',              en: 'Lower Sec.' },
  { id: 'highschool',min: 10, max: 12, vi: 'THPT',              en: 'High School' },
  { id: 'k12',       min: 1,  max: 12, vi: 'K–12',              en: 'K–12' },
];

const SchoolSetupScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  // ── Mock backend state ──
  // Seed: grade range configured, year configured, others pending.
  const [config, setConfig] = React.useState({
    gradeLevelRange: { minGrade: 10, maxGrade: 12 },
    operationalSettings: { gradePublishMode: 'ADMIN_APPROVAL' },
    activeClassCount: 18, // > 0 → triggers narrowing warning
  });
  const [setupStatus, setSetupStatus] = React.useState({
    gradeLevels: true,
    academicCalendar: true,
    subjects: false,
    assessmentScheme: false,
    classes: false,
  });
  const [showOnboarding, setShowOnboarding] = React.useState(true);
  const [guideOpen, setGuideOpen] = React.useState(true);

  // ── Local form state ──
  const [draftRange, setDraftRange] = React.useState({
    minGrade: config.gradeLevelRange?.minGrade ?? '',
    maxGrade: config.gradeLevelRange?.maxGrade ?? '',
  });
  const [draftMode, setDraftMode] = React.useState(config.operationalSettings.gradePublishMode);
  const [rangeError, setRangeError] = React.useState('');
  const [rangeSaved, setRangeSaved] = React.useState(false);
  const [modeSaved, setModeSaved] = React.useState(false);

  const isRangeConfigured = config.gradeLevelRange !== null;

  // ── Derived ──
  const STEPS = [
    { key: 'gradeLevels',      icon: 'graduationCap', vi: 'Khối lớp',                 en: 'Grade levels',     done: setupStatus.gradeLevels,      target: 'school-setup' },
    { key: 'academicCalendar', icon: 'calendar',      vi: 'Năm học',                  en: 'Academic year',    done: setupStatus.academicCalendar, target: 'calendar' },
    { key: 'subjects',         icon: 'bookOpen',      vi: 'Bộ môn & Môn học',         en: 'Subjects',         done: setupStatus.subjects,         target: 'subjects' },
    { key: 'assessmentScheme', icon: 'percent',       vi: 'Thang điểm & Khung ĐG',    en: 'Assessment scheme',done: setupStatus.assessmentScheme, target: 'assessment' },
    { key: 'classes',          icon: 'grid',          vi: 'Lớp học',                  en: 'Classes',          done: setupStatus.classes,          target: 'classes' },
  ];
  const completedSteps = STEPS.filter(s => s.done).length;
  const progressPct = (completedSteps / STEPS.length) * 100;
  const allDone = completedSteps === STEPS.length;

  // Auto-collapse the guide once everything is complete (per spec).
  React.useEffect(() => { if (allDone) setGuideOpen(false); }, [allDone]);

  // ── Handlers ──
  const validateRange = (min, max) => {
    const mn = Number(min), mx = Number(max);
    if (!min || !max) return t('Vui lòng nhập cả khối tối thiểu và tối đa.', 'Both min and max grades are required.');
    if (!Number.isInteger(mn) || !Number.isInteger(mx)) return t('Khối lớp phải là số nguyên.', 'Grade levels must be integers.');
    if (mn < 1 || mx > 13) return t('Khối lớp phải nằm trong khoảng 1 đến 13.', 'Grade levels must be between 1 and 13.');
    if (mn > mx) return t('Khối tối thiểu không được lớn hơn khối tối đa.', 'Min grade must not exceed max grade.');
    return '';
  };

  const applyPreset = (preset) => {
    setDraftRange({ minGrade: preset.min, maxGrade: preset.max });
    setRangeError('');
    setRangeSaved(false);
  };

  const saveRange = () => {
    const err = validateRange(draftRange.minGrade, draftRange.maxGrade);
    setRangeError(err);
    if (err) return;
    setConfig(c => ({ ...c, gradeLevelRange: { minGrade: Number(draftRange.minGrade), maxGrade: Number(draftRange.maxGrade) } }));
    setSetupStatus(s => ({ ...s, gradeLevels: true }));
    setRangeSaved(true);
    setTimeout(() => setRangeSaved(false), 2200);
  };

  const saveMode = () => {
    setConfig(c => ({ ...c, operationalSettings: { gradePublishMode: draftMode } }));
    setModeSaved(true);
    setTimeout(() => setModeSaved(false), 2200);
  };

  const isNarrowing = isRangeConfigured && (
    Number(draftRange.minGrade) > config.gradeLevelRange.minGrade ||
    Number(draftRange.maxGrade) < config.gradeLevelRange.maxGrade
  );
  const showNarrowingWarning = isRangeConfigured && config.activeClassCount > 0 && isNarrowing;

  // ── Render helpers ──
  const SectionCard = ({ children, style }) => (
    <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 26, ...style }}>
      {children}
    </div>
  );

  const SectionHeader = ({ icon, title, subtitle, iconColor = pColor }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: iconColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={20} color={iconColor} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.55 }}>{subtitle}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="building" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Thiết lập trường học', 'School Setup')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Các thông số nền tảng để vận hành EduPortal cho trường của bạn.', 'Foundational parameters that make EduPortal work for your school.')}
            </div>
          </div>
        </div>

        {/* Onboarding checklist banner */}
        {showOnboarding && !allDone && (
          <div style={{
            background: `linear-gradient(135deg, ${pColor}0e 0%, ${pColor}06 100%)`,
            border: `1px solid ${pColor}33`, borderRadius: 14,
            padding: 22, marginBottom: 22,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: pColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="sparkles" size={18} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 3 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
                    {t('Thiết lập ban đầu', 'Initial Setup')}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pColor, background: pColor + '15', padding: '3px 9px', borderRadius: 99 }}>
                    {completedSteps} / {STEPS.length} {t('bước hoàn thành', 'steps complete')}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: T.textMuted }}>
                  {t('Hoàn thành các bước dưới đây theo thứ tự để bắt đầu sử dụng EduPortal.', 'Complete the steps below in order to start using EduPortal.')}
                </div>
              </div>
              <button onClick={() => setShowOnboarding(false)}
                style={{ background: 'transparent', border: 'none', color: T.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 8px', fontFamily: 'inherit', whiteSpace: 'nowrap', borderRadius: 6 }}>
                {t('Ẩn hướng dẫn', 'Hide guide')}
              </button>
            </div>

            <ProgressBar value={progressPct} color={pColor} height={6} style={{ marginBottom: 18 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {STEPS.map((step, i) => (
                <div key={step.key} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '11px 12px', borderRadius: 9,
                  background: step.done ? T.success + '0a' : 'transparent',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: step.done ? T.success : '#fff',
                    border: step.done ? 'none' : `1.5px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {step.done
                      ? <Icon name="check" size={14} color="#fff" strokeWidth={2.6} />
                      : <span style={{ fontSize: 12, fontWeight: 800, color: T.textMuted }}>{i + 1}</span>}
                  </div>
                  <Icon name={step.icon} size={16} color={step.done ? T.success : T.textSecondary} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: step.done ? 600 : 700, color: step.done ? T.textSecondary : T.textPrimary, textDecoration: step.done ? 'line-through' : 'none' }}>
                    {t(step.vi, step.en)}
                  </span>
                  {step.done ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.success, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {t('Hoàn thành', 'Done')}
                    </span>
                  ) : (
                    <button
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: pColor, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = pColor + '14'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {t('Cài đặt', 'Configure')}
                      <Icon name="arrowRight" size={12} color={pColor} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Layout: 2 sections stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* SECTION 1 — GradeLevelRange */}
          <SectionCard>
            <SectionHeader
              icon="graduationCap"
              title={t('Phạm vi khối lớp', 'Grade Level Range')}
              subtitle={t('Xác định các khối lớp tồn tại tại trường. Chỉ có thể tạo lớp học trong phạm vi này. Thay đổi cần thận trọng nếu đã có lớp học.', 'Defines which grade levels exist at your school. Classes can only be created within this range. Change carefully once classes exist.')}
            />

            {/* Empty state */}
            {!isRangeConfigured ? (
              <div style={{
                background: T.errorLight, border: `1px solid ${T.error}30`, borderRadius: 12,
                padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
              }}>
                <Icon name="alertTriangle" size={20} color={T.error} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: T.error, marginBottom: 2 }}>
                    {t('Khối lớp chưa được cấu hình', 'Grade levels not yet configured')}
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                    {t('Lớp học không thể tạo cho đến khi hoàn thành bước này.', 'Classes cannot be created until this step is complete.')}
                  </div>
                </div>
                <Button onClick={() => document.getElementById('school-setup-min')?.focus()}>
                  {t('Bắt đầu ngay', 'Start now')}
                </Button>
              </div>
            ) : (
              <div style={{
                background: pColor + '0c', border: `1px solid ${pColor}33`, borderRadius: 10,
                padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 12.5, color: T.textSecondary,
              }}>
                <Icon name="info" size={15} color={pColor} />
                <span>
                  {t('Phạm vi hiện tại: ', 'Current range: ')}
                  <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    {t('Khối ', 'Grade ')}{config.gradeLevelRange.minGrade}{' – '}{config.gradeLevelRange.maxGrade}
                  </strong>
                  {' · '}
                  <span style={{ color: T.textMuted }}>
                    {config.activeClassCount} {t('lớp đang hoạt động', 'active classes')}
                  </span>
                </span>
              </div>
            )}

            {/* Number inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
              {[
                { key: 'minGrade', vi: 'Khối tối thiểu', en: 'Min grade', id: 'school-setup-min' },
                { key: 'maxGrade', vi: 'Khối tối đa',     en: 'Max grade', id: 'school-setup-max' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    {t(field.vi, field.en)}
                    <span style={{ color: T.error }}>*</span>
                  </label>
                  <input
                    id={field.id}
                    type="number" min={1} max={13} step={1} required
                    value={draftRange[field.key]}
                    onChange={e => { setDraftRange(r => ({ ...r, [field.key]: e.target.value })); setRangeError(''); setRangeSaved(false); }}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10,
                      border: `1.5px solid ${rangeError ? T.error : T.border}`,
                      fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      color: T.textPrimary, background: '#fff',
                      fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { if (!rangeError) e.target.style.borderColor = pColor; }}
                    onBlur={e => { if (!rangeError) e.target.style.borderColor = T.border; }}
                  />
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 14 }}>
              {t('Ví dụ: THPT → 10–12 | THCS → 6–9 | Tiểu học → 1–5. Giới hạn hệ thống: 1 ≤ tối thiểu ≤ tối đa ≤ 13.',
                 'Examples: High School → 10–12 | Lower Sec. → 6–9 | Primary → 1–5. Platform limit: 1 ≤ min ≤ max ≤ 13.')}
            </div>

            {/* Quick presets */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {t('Mẫu nhanh', 'Quick presets')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SCHOOL_SETUP_PRESETS.map(p => {
                  const active = Number(draftRange.minGrade) === p.min && Number(draftRange.maxGrade) === p.max;
                  return (
                    <button key={p.id} onClick={() => applyPreset(p)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 8,
                        border: `1px solid ${active ? pColor : T.border}`,
                        background: active ? pColor + '15' : 'transparent',
                        color: active ? pColor : T.textSecondary,
                        fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; } }}>
                      <span>{t(p.vi, p.en)}</span>
                      <span style={{ color: T.textMuted, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>({p.min}–{p.max})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline error */}
            {rangeError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: T.errorLight, border: `1px solid ${T.error}30`, borderRadius: 9, marginBottom: 14 }}>
                <Icon name="alertTriangle" size={14} color={T.error} />
                <span style={{ fontSize: 12.5, color: T.error, fontWeight: 600 }}>{rangeError}</span>
              </div>
            )}

            {/* Narrowing warning */}
            {showNarrowingWarning && (
              <div style={{
                background: T.warningLight, border: `1px solid ${T.warning}40`, borderRadius: 10,
                padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <Icon name="alertTriangle" size={16} color={T.warning} />
                <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6 }}>
                  <strong style={{ color: T.warning, fontWeight: 700 }}>
                    {t('Cảnh báo thu hẹp phạm vi: ', 'Narrowing range: ')}
                  </strong>
                  {t('Thu hẹp phạm vi sẽ bị chặn nếu có lớp học ở các khối ngoài phạm vi mới. Vui lòng lưu trữ lớp học trước khi thay đổi.',
                     'Narrowing will be blocked if there are classes outside the new range. Please archive those classes before changing.')}
                </div>
              </div>
            )}

            {/* Save row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button onClick={saveRange} icon="check">
                {t('Lưu phạm vi khối lớp', 'Save grade range')}
              </Button>
              {rangeSaved && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: T.success }}>
                  <Icon name="check" size={14} color={T.success} strokeWidth={2.4} />
                  {t('Đã lưu', 'Saved')}
                </span>
              )}
            </div>
          </SectionCard>

          {/* SECTION 2 — Operational Settings */}
          <SectionCard>
            <SectionHeader
              icon="clipboardList"
              title={t('Quy trình nộp điểm', 'Grade Publish Workflow')}
              subtitle={t('Chọn cách giáo viên công bố điểm cho học sinh và phụ huynh.', 'Choose how teachers publish grades to students and parents.')}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              {[
                {
                  id: 'SELF_PUBLISH',
                  vi: 'Tự công bố',
                  en: 'Self-publish',
                  descVi: 'Giáo viên nộp điểm → công bố ngay.',
                  descEn: 'Teacher submits → published immediately.',
                  icon: 'play',
                },
                {
                  id: 'ADMIN_APPROVAL',
                  vi: 'Duyệt bởi BGH',
                  en: 'Admin approval',
                  descVi: 'Giáo viên nộp điểm → BGH phê duyệt.',
                  descEn: 'Teacher submits → admin reviews & approves.',
                  icon: 'shield',
                },
              ].map(opt => {
                const active = draftMode === opt.id;
                return (
                  <button key={opt.id} onClick={() => { setDraftMode(opt.id); setModeSaved(false); }}
                    style={{
                      textAlign: 'left', padding: 18, borderRadius: 12,
                      border: `1.5px solid ${active ? pColor : T.border}`,
                      background: active ? pColor + '0d' : T.card,
                      cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
                      transition: 'all 0.15s', boxShadow: active ? `0 0 0 4px ${pColor}14` : 'none',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = pColor + '88'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = T.border; }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `2px solid ${active ? pColor : T.border}`,
                        background: '#fff', flexShrink: 0, marginTop: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: pColor }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Icon name={opt.icon} size={14} color={active ? pColor : T.textSecondary} />
                          <div style={{ fontSize: 14, fontWeight: 800, color: active ? pColor : T.textPrimary }}>
                            {t(opt.vi, opt.en)}
                          </div>
                        </div>
                        <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.55 }}>
                          {t(opt.descVi, opt.descEn)}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 8, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                          {opt.id}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Button onClick={saveMode} icon="check"
                disabled={draftMode === config.operationalSettings.gradePublishMode}>
                {t('Lưu cài đặt', 'Save setting')}
              </Button>
              {modeSaved && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: T.success }}>
                  <Icon name="check" size={14} color={T.success} strokeWidth={2.4} />
                  {t('Đã lưu', 'Saved')}
                </span>
              )}
            </div>

            <div style={{ paddingTop: 14, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textMuted }}>
              {t('Cài đặt đầy đủ có tại ', 'Full settings available at ')}
              <a href="#" onClick={e => e.preventDefault()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: pColor, fontWeight: 700, textDecoration: 'none' }}>
                {t('Cài đặt trường học', 'School Settings')}
                <Icon name="arrowRight" size={11} color={pColor} strokeWidth={2.4} />
              </a>
              <span style={{ color: T.textMuted }}> · </span>
              <code style={{ fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace', color: T.textMuted }}>/admin/settings</code>
            </div>
          </SectionCard>

          {/* SECTION 3 — Setup Guide (collapsible) */}
          <SectionCard style={{ padding: 0 }}>
            <button onClick={() => setGuideOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '20px 26px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="info" size={18} color={T.textSecondary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 2 }}>
                  {t('Hướng dẫn thiết lập', 'Setup Guide')}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  {t('Thứ tự cấu hình các thực thể nền tảng theo ADR 0035.', 'Recommended configuration order per ADR 0035.')}
                </div>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${guideOpen ? 180 : 0}deg)`, transition: 'transform 0.2s' }}>
                <Icon name="chevronDown" size={14} color={T.textSecondary} />
              </div>
            </button>

            {guideOpen && (
              <div style={{ padding: '0 26px 24px', borderTop: `1px solid ${T.border}` }}>
                <div style={{ position: 'relative', paddingLeft: 18, marginTop: 18 }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 13, top: 12, bottom: 12, width: 2, background: T.border }} />
                  {STEPS.map((step, i) => (
                    <div key={step.key} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: i === STEPS.length - 1 ? 0 : 18 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: step.done ? T.success : '#fff',
                        border: step.done ? 'none' : `2px solid ${T.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        marginLeft: -8, zIndex: 1,
                      }}>
                        {step.done
                          ? <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
                          : <span style={{ fontSize: 11, fontWeight: 800, color: T.textMuted }}>{i + 1}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>
                            {t(step.vi, step.en)}
                          </div>
                          {step.done && (
                            <Badge color={T.success}>
                              {t('Hoàn thành', 'Done')}
                            </Badge>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                          /admin/{step.target}
                        </div>
                      </div>
                      {!step.done && (
                        <button
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '5px 10px', borderRadius: 7 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}>
                          {t('Mở', 'Open')}
                          <Icon name="arrowRight" size={11} color="currentColor" strokeWidth={2.2} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

        </div>

        {/* Footer reset (demo aid — not part of production) */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={() => {
            setConfig({ gradeLevelRange: null, operationalSettings: { gradePublishMode: 'ADMIN_APPROVAL' }, activeClassCount: 0 });
            setSetupStatus({ gradeLevels: false, academicCalendar: false, subjects: false, assessmentScheme: false, classes: false });
            setDraftRange({ minGrade: '', maxGrade: '' });
            setShowOnboarding(true);
          }} style={{ padding: '6px 12px', border: `1px dashed ${T.border}`, borderRadius: 7, background: 'transparent', color: T.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('Xem trạng thái chưa thiết lập', 'Preview unconfigured state')}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SchoolSetupScreen });
