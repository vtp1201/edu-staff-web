// ── Subject Master Detail (ADMIN · /admin/subjects/:subjectId) ────────────────
// Route:   /admin/subjects/:subjectId
// Role:    ADMIN (US-048 · ADR 0036)
// Purpose: Canonical full-page editor for a single grade-scoped Subject master.
//          Locked pedagogical-standard fields are editable here at the master
//          level; they flow down (read-only) to every ClassSubject offering.
// APIs:    GET   /api/v1/core/subjects/:subjectId
//          PATCH /api/v1/core/subjects/:subjectId
//          POST  /api/v1/core/subjects/:subjectId/archive

const SubjectDetailScreen = ({ subjectId, lang, primaryColor, onNavigate, onBack, parents, onUpdateSubject }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  // ── Find subject + parent across the catalogue ──
  const located = React.useMemo(() => {
    for (const p of parents) {
      const s = p.subjects.find(x => x.id === subjectId);
      if (s) return { parent: p, subject: s };
    }
    return null;
  }, [parents, subjectId]);

  const offerings = (window.SM_SEED_CLASS_OFFERINGS || {})[subjectId] || [];

  // Local draft (snapshot on subject change)
  const [draft, setDraft] = React.useState(located?.subject || null);
  React.useEffect(() => { setDraft(located?.subject || null); }, [subjectId, located?.subject]);

  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [archiveBlockedTip, setArchiveBlockedTip] = React.useState(false);
  const [lockTooltip, setLockTooltip] = React.useState(null);
  const [saved, setSaved] = React.useState(false);

  // ── Not-found / archived ──
  if (!located) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: T.textMuted, fontSize: 14 }}>
        {t('Không tìm thấy môn học này.', 'Subject not found.')}
      </div>
    );
  }

  const { parent, subject } = located;
  const isArchived = subject.status === 'ARCHIVED';
  const inUse = subject.inUse || offerings.length > 0;

  // ── Validation ──
  const set = (key, val) => { setDraft(d => ({ ...d, [key]: val })); setSaved(false); };
  const nameValid = draft && draft.name.trim().length > 0 && draft.name.trim().length <= 128;
  const codeValid = !draft.code || /^[A-Z0-9]{1,16}$/.test(draft.code);
  const outcomeValid = !draft.outcomeTargets || draft.outcomeTargets.length <= 2000;
  const canSave = nameValid && codeValid && outcomeValid;
  const isDirty = draft && (
    draft.name !== subject.name ||
    (draft.code || '') !== (subject.code || '') ||
    (draft.periodCount ?? null) !== (subject.periodCount ?? null) ||
    (draft.requiredAssessmentCount ?? null) !== (subject.requiredAssessmentCount ?? null) ||
    (draft.outcomeTargets || '') !== (subject.outcomeTargets || '') ||
    (draft.masterSyllabus || '') !== (subject.masterSyllabus || '') ||
    (draft.exerciseBankRef || '') !== (subject.exerciseBankRef || '') ||
    (draft.examBankRef || '') !== (subject.examBankRef || '')
  );

  const handleSave = () => {
    if (!canSave) return;
    onUpdateSubject(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const requestArchive = () => {
    if (inUse) { setArchiveBlockedTip(true); setTimeout(() => setArchiveBlockedTip(false), 1800); return; }
    setArchiveOpen(true);
  };
  const confirmArchive = () => {
    onUpdateSubject({ ...draft, status: 'ARCHIVED' });
    setArchiveOpen(false);
  };

  // ── Concept badge for parent ──
  const concept = smConceptStyle(parent, pColor);

  // ── Render ──
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Scroll container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 120px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>

          {/* Breadcrumb + back */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.textMuted, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => (onBack ? onBack() : onNavigate?.('subjects'))}
              style={{ background: 'transparent', border: 'none', color: T.textMuted, fontSize: 12.5, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.color = pColor}
              onMouseLeave={e => e.currentTarget.style.color = T.textMuted}>
              {t('Danh mục môn học', 'Subject Catalogue')}
            </button>
            <Icon name="chevronRight" size={11} color={T.textMuted} />
            <button onClick={() => onNavigate?.('subjects')}
              style={{ background: 'transparent', border: 'none', color: T.textMuted, fontSize: 12.5, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.color = pColor}
              onMouseLeave={e => e.currentTarget.style.color = T.textMuted}>
              {parent.name}
            </button>
            <Icon name="chevronRight" size={11} color={T.textMuted} />
            <span style={{ color: T.textSecondary, fontWeight: 700 }}>{subject.name}</span>
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.textPrimary, lineHeight: 1.15 }}>{subject.name}</div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 99,
                  background: pColor, color: '#fff', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                }}>
                  {t(`Lớp ${subject.gradeLevel}`, `Grade ${subject.gradeLevel}`)}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                  border: `1px solid ${isArchived ? T.border : T.success + '33'}`,
                  background: isArchived ? T.bg : T.successLight,
                  color: isArchived ? T.textMuted : T.success, letterSpacing: '0.05em', whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: isArchived ? T.textMuted : T.success }} />
                  {isArchived ? t('ĐÃ LƯU TRỮ', 'ARCHIVED') : t('HOẠT ĐỘNG', 'ACTIVE')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textMuted, fontSize: 13, flexWrap: 'wrap' }}>
                <Icon name="layers" size={13} color={T.textMuted} />
                <button onClick={() => onNavigate?.('subject-parents')}
                  style={{ background: 'transparent', border: 'none', color: T.textSecondary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.color = pColor}
                  onMouseLeave={e => e.currentTarget.style.color = T.textSecondary}>
                  {parent.name}
                </button>
                {concept && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: 10.5, fontWeight: 700,
                    color: concept.fg, background: concept.bg,
                    padding: '2px 8px', borderRadius: 99, letterSpacing: '0.02em', whiteSpace: 'nowrap',
                  }}>
                    {parent.conceptLabelCustom ? concept.label : t(concept.label.vi, concept.label.en)}
                  </span>
                )}
                {subject.code && (
                  <React.Fragment>
                    <span style={{ color: T.textMuted }}>·</span>
                    <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: T.textMuted, letterSpacing: '0.04em' }}>
                      {subject.code}
                    </span>
                  </React.Fragment>
                )}
              </div>
            </div>

            {/* Archive button / archived badge */}
            {isArchived ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg,
                fontSize: 12.5, fontWeight: 700, color: T.textMuted, letterSpacing: '0.03em', whiteSpace: 'nowrap',
              }}>
                <Icon name="archive" size={13} color={T.textMuted} />
                {t('Đã lưu trữ', 'Archived')}
              </span>
            ) : (
              <div style={{ position: 'relative' }}>
                <button onClick={requestArchive}
                  onMouseEnter={() => { if (inUse) setArchiveBlockedTip(true); }}
                  onMouseLeave={() => setArchiveBlockedTip(false)}
                  disabled={inUse}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px',
                    borderRadius: 9,
                    border: `1px solid ${inUse ? T.border : T.error + '40'}`,
                    background: inUse ? T.bg : 'transparent',
                    color: inUse ? T.textMuted : T.error,
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    cursor: inUse ? 'not-allowed' : 'pointer', opacity: inUse ? 0.7 : 1, whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => { if (!inUse) e.currentTarget.style.background = T.errorLight; }}
                  onMouseOut={e => { if (!inUse) e.currentTarget.style.background = 'transparent'; }}>
                  <Icon name="archive" size={13} color="currentColor" />
                  {t('Lưu trữ môn học', 'Archive subject')}
                </button>
                {archiveBlockedTip && inUse && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: T.textPrimary, color: '#fff', fontSize: 11.5, fontWeight: 600, padding: '8px 11px', borderRadius: 7, maxWidth: 260, lineHeight: 1.4, zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }}>
                    <div style={{ position: 'absolute', top: -4, right: 24, width: 8, height: 8, background: T.textPrimary, transform: 'rotate(45deg)' }} />
                    {t('Môn học đang có lớp học sử dụng, không thể lưu trữ. Lưu trữ các lớp trước.',
                       'Subject is referenced by active classes — archive those classes first.')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, alignItems: 'start' }}>

            {/* LEFT — Master fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* CARD 1 — Basic info */}
              <SDCard pColor={pColor} icon="info" title={t('Thông tin cơ bản', 'Basic information')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <SDField label={t('Tên môn học', 'Subject name')} required>
                    <input value={draft.name} maxLength={128} disabled={isArchived}
                      onChange={e => set('name', e.target.value)}
                      style={sdInput(pColor, T, !nameValid && draft.name.length > 0, isArchived)} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: T.textMuted }}>
                      <span>{t('1–128 ký tự', '1–128 characters')}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{draft.name.length}/128</span>
                    </div>
                  </SDField>
                  <SDField label={t('Mã môn', 'Subject code')} optional>
                    <input value={draft.code || ''} maxLength={16} disabled={isArchived}
                      onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="VD: MATH10"
                      style={{ ...sdInput(pColor, T, !codeValid, isArchived), fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.04em' }} />
                    <div style={{ marginTop: 5, fontSize: 11, color: T.textMuted }}>
                      {t('Chữ hoa & chữ số, tối đa 16 ký tự', 'Uppercase letters & digits, ≤16 chars')}
                    </div>
                  </SDField>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                  <SDField label={t('Bộ môn', 'Department')} readOnly>
                    <button onClick={() => onNavigate?.('subject-parents')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                        padding: '10px 13px', borderRadius: 9,
                        border: `1.5px solid ${T.border}`, background: T.bg,
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}>
                      <Icon name="layers" size={14} color={pColor} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {parent.name}
                      </span>
                      <Icon name="externalLink" size={11} color={T.textMuted} />
                    </button>
                  </SDField>
                  <SDField label={t('Khối lớp', 'Grade level')} readOnly tooltip={t('Khối lớp không thể thay đổi sau khi tạo môn học.', 'Grade level cannot change after creation.')}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 13px', borderRadius: 9,
                      border: `1.5px solid ${T.border}`, background: T.bg,
                    }}>
                      <Icon name="lockClosed" size={13} color={T.textMuted} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                        {t(`Lớp ${subject.gradeLevel}`, `Grade ${subject.gradeLevel}`)}
                      </span>
                    </div>
                  </SDField>
                </div>
              </SDCard>

              {/* CARD 2 — Curriculum standard (locked at class level) */}
              <SDCard pColor={pColor} icon="lockClosed" iconColor={T.warning}
                title={t('Chuẩn chương trình', 'Curriculum standard')}
                badge={t('Khoá ở cấp lớp', 'Locked at class level')}>
                <div style={{
                  background: T.warningLight + 'cc', border: `1px solid ${T.warning}33`, borderRadius: 9,
                  padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <Icon name="info" size={15} color={T.warning} />
                  <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.55 }}>
                    {t('Các trường này là chuẩn chương trình bắt buộc. Giáo viên tại cấp lớp sẽ thấy những giá trị này nhưng không thể thay đổi. Chỉ quản trị viên mới có thể chỉnh sửa ở đây.',
                       'These fields are the mandatory curriculum standard. Teachers at the class level will see them but cannot change them. Only admins can edit them here.')}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <SDLockedField label={t('Số tiết / kỳ', 'Periods / term')} pColor={pColor}
                      tooltipKey="periodCount" tooltipShown={lockTooltip === 'periodCount'} setTooltip={setLockTooltip}>
                      <input type="number" min={0}
                        value={draft.periodCount ?? ''}
                        onChange={e => set('periodCount', e.target.value === '' ? null : Number(e.target.value))}
                        disabled={isArchived}
                        placeholder={t('Chưa thiết lập', 'Not set')}
                        style={{ ...sdLockedInput(pColor, T, isArchived), fontVariantNumeric: 'tabular-nums' }} />
                      <SDLockBadge />
                    </SDLockedField>

                    <SDLockedField label={t('Số bài kiểm tra yêu cầu / kỳ', 'Required assessments / term')} pColor={pColor}
                      tooltipKey="requiredAssessmentCount" tooltipShown={lockTooltip === 'requiredAssessmentCount'} setTooltip={setLockTooltip}>
                      <input type="number" min={0}
                        value={draft.requiredAssessmentCount ?? ''}
                        onChange={e => set('requiredAssessmentCount', e.target.value === '' ? null : Number(e.target.value))}
                        disabled={isArchived}
                        placeholder={t('Chưa thiết lập', 'Not set')}
                        style={{ ...sdLockedInput(pColor, T, isArchived), fontVariantNumeric: 'tabular-nums' }} />
                      <SDLockBadge />
                    </SDLockedField>
                  </div>

                  <SDLockedField label={t('Chỉ tiêu đầu ra', 'Learning outcomes')} pColor={pColor}
                    tooltipKey="outcomeTargets" tooltipShown={lockTooltip === 'outcomeTargets'} setTooltip={setLockTooltip}>
                    <textarea value={draft.outcomeTargets || ''} maxLength={2000}
                      onChange={e => set('outcomeTargets', e.target.value)} disabled={isArchived}
                      placeholder={t('Mô tả mục tiêu học tập đầu ra của môn học này…', 'Describe the learning outcomes of this subject…')}
                      rows={4}
                      style={{ ...sdLockedInput(pColor, T, isArchived), minHeight: 96, resize: 'vertical', fontFamily: 'inherit', paddingRight: 13 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: outcomeValid ? T.textMuted : T.error }}>
                      <span>{t('Tối đa 2000 ký tự', 'Up to 2000 characters')}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(draft.outcomeTargets || '').length}/2000</span>
                    </div>
                  </SDLockedField>

                  <SDLockedField label={t('Giáo án tiêu chuẩn / gốc', 'Master syllabus')} pColor={pColor}
                    tooltipKey="masterSyllabus" tooltipShown={lockTooltip === 'masterSyllabus'} setTooltip={setLockTooltip}>
                    <input value={draft.masterSyllabus || ''}
                      onChange={e => set('masterSyllabus', e.target.value)} disabled={isArchived}
                      placeholder={t('URL hoặc mã tài liệu giáo án gốc…', 'URL or document reference for the master syllabus…')}
                      style={sdLockedInput(pColor, T, isArchived)} />
                    {draft.masterSyllabus && /^https?:\/\//.test(draft.masterSyllabus) && (
                      <a href={draft.masterSyllabus} target="_blank" rel="noreferrer"
                        style={{ position: 'absolute', right: 36, top: 11, color: T.textMuted, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                        <Icon name="externalLink" size={12} color={T.textMuted} />
                      </a>
                    )}
                    <SDLockBadge />
                  </SDLockedField>
                </div>
              </SDCard>

              {/* CARD 3 — Shared resource refs */}
              <SDCard pColor={pColor} icon="bookOpen" title={t('Kho học liệu chung', 'Shared resource banks')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <SDField label={t('Kho bài tập chung', 'Shared exercise bank')} optional>
                    <input value={draft.exerciseBankRef || ''}
                      onChange={e => set('exerciseBankRef', e.target.value)} disabled={isArchived}
                      placeholder={t('URL hoặc mã định danh kho bài tập…', 'URL or ID of the exercise bank…')}
                      style={sdInput(pColor, T, false, isArchived)} />
                  </SDField>
                  <SDField label={t('Kho đề kiểm tra chung', 'Shared exam bank')} optional>
                    <input value={draft.examBankRef || ''}
                      onChange={e => set('examBankRef', e.target.value)} disabled={isArchived}
                      placeholder={t('URL hoặc mã định danh kho đề…', 'URL or ID of the exam bank…')}
                      style={sdInput(pColor, T, false, isArchived)} />
                  </SDField>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '11px 13px', background: pColor + '0a', border: `1px solid ${pColor}22`, borderRadius: 9, fontSize: 11.5, color: T.textSecondary, lineHeight: 1.55 }}>
                    <Icon name="info" size={14} color={pColor} />
                    <span>
                      {t('Tham chiếu này hiển thị cho tất cả giáo viên môn học này. Giáo viên có thể thêm bài tập bổ sung ở cấp lớp ',
                         'These references are visible to every teacher of this subject. Teachers can attach additional exercises at the class level ')}
                      <code style={{ fontFamily: 'ui-monospace, Menlo, monospace', background: T.card, padding: '1px 6px', borderRadius: 4, border: `1px solid ${T.border}`, fontSize: 11 }}>
                        classExerciseRefs
                      </code>
                      .
                    </span>
                  </div>
                </div>
              </SDCard>
            </div>

            {/* RIGHT — Usage summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 0 }}>

              {/* Usage card */}
              <SDCard pColor={pColor} icon="users"
                title={t('Sử dụng trong năm học hiện tại', 'Usage this academic year')}
                badge={offerings.length === 0 ? null : `${offerings.length} ${t('lớp', 'classes')}`}>
                {offerings.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Icon name="users" size={22} color={T.textMuted} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>
                      {t('Chưa được sử dụng', 'Not yet in use')}
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                      {t('Môn học chưa được thêm vào lớp nào.', 'This subject has not been added to any class yet.')}
                    </div>
                  </div>
                ) : (
                  <React.Fragment>
                    <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 10 }}>
                      <strong style={{ color: T.textSecondary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{offerings.length}</strong>{' '}
                      {t('lớp học môn này. Bấm để mở chi tiết phân công.', 'classes use this subject. Click to open the class-subject detail.')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {offerings.map(o => (
                        <button key={o.id} onClick={() => onNavigate?.('classes')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                            border: `1px solid ${T.border}`, borderRadius: 9, background: T.card,
                            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.background = pColor + '08'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: pColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name="users" size={15} color={pColor} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span>{o.className}</span>
                              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>· {o.academicYear}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {o.teacherName} · {o.studentCount} {t('học sinh', 'students')}
                            </div>
                          </div>
                          <Icon name="chevronRight" size={13} color={T.textMuted} />
                        </button>
                      ))}
                    </div>
                  </React.Fragment>
                )}
              </SDCard>

              {/* History card (placeholder) */}
              <SDCard pColor={pColor} icon="calendar" title={t('Lịch sử thay đổi', 'Change history')}>
                <div style={{ padding: '20px 6px', textAlign: 'center', fontSize: 12, color: T.textMuted, lineHeight: 1.55 }}>
                  {t('Sẽ hiển thị các thay đổi gần đây của bản ghi này trong phiên bản sau.',
                     'Recent edits to this record will appear here in a future release.')}
                </div>
              </SDCard>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      {!isArchived && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: T.card, borderTop: `1px solid ${T.border}`,
          padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 12, boxShadow: '0 -8px 24px rgba(0,0,0,0.06)', zIndex: 30,
        }}>
          {saved && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: T.success, marginRight: 'auto' }}>
              <Icon name="check" size={14} color={T.success} strokeWidth={2.4} />
              {t('Đã lưu thay đổi', 'Changes saved')}
            </span>
          )}
          {!saved && isDirty && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.textMuted, marginRight: 'auto' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.warning, display: 'inline-block' }} />
              {t('Có thay đổi chưa lưu', 'Unsaved changes')}
            </span>
          )}
          <Button variant="ghost" onClick={() => setDraft(subject)} disabled={!isDirty}>
            {t('Huỷ thay đổi', 'Discard')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || !isDirty} icon="check">
            {t('Lưu thay đổi', 'Save changes')}
          </Button>
        </div>
      )}

      {/* Archive confirm */}
      {archiveOpen && (
        <div onClick={() => setArchiveOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', padding: 24, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: T.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="archive" size={20} color={T.warning} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
                {t('Lưu trữ môn học?', 'Archive subject?')}
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
              {t(`Lưu trữ “${subject.name}”? Môn học sẽ bị ẩn khỏi các tuỳ chọn tạo lớp mới. Các bản ghi hiện có không bị xoá và bạn có thể khôi phục bất cứ lúc nào.`,
                 `Archive "${subject.name}"? It will be hidden from new class creation. Existing records are preserved and you can restore at any time.`)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setArchiveOpen(false)}>{t('Huỷ', 'Cancel')}</Button>
              <Button variant="danger" onClick={confirmArchive} icon="archive">{t('Lưu trữ', 'Archive')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Small helpers ────────────────────────────────────────────────────────────

const SDCard = ({ pColor, icon, iconColor, title, badge, children }) => (
  <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <Icon name={icon} size={16} color={iconColor || pColor} />
      <div style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>{title}</div>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: T.warning, background: T.warningLight,
          border: `1px solid ${T.warning}33`, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em',
        }}>{badge}</span>
      )}
    </div>
    {children}
  </div>
);

const SDField = ({ label, required, optional, readOnly, tooltip, children }) => {
  const [showTip, setShowTip] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
        <span>{label}</span>
        {required && <span style={{ color: T.error }}>*</span>}
        {optional && <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>({optional === true ? 'không bắt buộc' : optional})</span>}
        {readOnly && <Icon name="lockClosed" size={11} color={T.textMuted} />}
        {tooltip && (
          <span onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: T.bg, color: T.textMuted, fontSize: 9, fontWeight: 700, cursor: 'help' }}>?</span>
        )}
      </label>
      {showTip && tooltip && (
        <div style={{ position: 'absolute', top: -2, left: 0, transform: 'translateY(-100%)', background: T.textPrimary, color: '#fff', fontSize: 11, fontWeight: 600, padding: '7px 10px', borderRadius: 7, maxWidth: 260, lineHeight: 1.4, zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
          {tooltip}
        </div>
      )}
      {children}
    </div>
  );
};

const SDLockedField = ({ label, pColor, tooltipKey, tooltipShown, setTooltip, children }) => (
  <div style={{ position: 'relative' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, position: 'relative' }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary }}>{label}</span>
      <span onMouseEnter={() => setTooltip(tooltipKey)} onMouseLeave={() => setTooltip(null)}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help', padding: 2 }}>
        <Icon name="lockClosed" size={11} color={T.warning} />
      </span>
      {tooltipShown && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, background: T.textPrimary, color: '#fff', fontSize: 11, fontWeight: 600, padding: '7px 10px', borderRadius: 7, maxWidth: 280, lineHeight: 1.4, zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
          <div style={{ position: 'absolute', top: '100%', left: 18, width: 8, height: 8, background: T.textPrimary, transform: 'translateY(-50%) rotate(45deg)' }} />
          Giá trị chuẩn chương trình — hiển thị ở cấp lớp, giáo viên không thể chỉnh sửa.
        </div>
      )}
    </div>
    <div style={{ position: 'relative' }}>
      {children}
    </div>
  </div>
);

const SDLockBadge = () => (
  <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
    <Icon name="lockClosed" size={12} color={T.warning} />
  </div>
);

const sdInput = (pColor, Tk, hasError, disabled) => ({
  width: '100%', padding: '10px 13px', borderRadius: 9, boxSizing: 'border-box',
  border: `1.5px solid ${hasError ? Tk.error : Tk.border}`,
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
  color: disabled ? Tk.textMuted : Tk.textPrimary,
  background: disabled ? Tk.bg : '#fff',
  transition: 'border-color 0.15s',
  cursor: disabled ? 'not-allowed' : 'text',
});

// Locked field gets a very subtle warning-tinted background per spec.
const sdLockedInput = (pColor, Tk, disabled) => ({
  width: '100%', padding: '10px 36px 10px 13px', borderRadius: 9, boxSizing: 'border-box',
  border: `1.5px solid ${Tk.warning}33`,
  fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
  color: disabled ? Tk.textMuted : Tk.textPrimary,
  background: '#FFF8E1',
  transition: 'border-color 0.15s',
  cursor: disabled ? 'not-allowed' : 'text',
});

Object.assign(window, { SubjectDetailScreen });
