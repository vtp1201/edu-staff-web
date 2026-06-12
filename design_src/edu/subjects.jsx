// ── Subject Master Editor (ADMIN · /admin/subjects) — Main Screen ─────────────
// Route:  /admin/subjects
// See subjects-data.jsx (seed + helpers) and subjects-dialogs.jsx (sheet + modals).

const SubjectsScreen = ({ lang, primaryColor, parents, setParents, onOpenSubjectDetail }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [selectedParentId, setSelectedParentId] = React.useState(parents[0]?.id || null);
  const [parentDialogOpen, setParentDialogOpen] = React.useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = React.useState(false);
  const [archiveTarget, setArchiveTarget] = React.useState(null);
  const [tooltipId, setTooltipId] = React.useState(null);

  const selectedParent = parents.find(p => p.id === selectedParentId) || null;

  // ── Handlers ──
  const createParent = (data) => {
    const id = smNewId('sp');
    setParents(list => [...list, { id, ...data, status: 'ACTIVE', subjects: [] }]);
    setSelectedParentId(id);
    setParentDialogOpen(false);
  };

  const createSubject = (data) => {
    const { parentId, name, code, gradeLevel } = data;
    const newId = smNewId('sub');
    setParents(list => list.map(p => p.id !== parentId ? p : {
      ...p,
      subjects: [...p.subjects, {
        id: newId, name, code, gradeLevel, status: 'ACTIVE', inUse: false,
        periodCount: null, requiredAssessmentCount: null,
        outcomeTargets: '', masterSyllabus: '', exerciseBankRef: '', examBankRef: '',
      }],
    }));
    setSelectedParentId(parentId);
    setSubjectDialogOpen(false);
    onOpenSubjectDetail?.(newId);
  };

  const updateSubject = (next) => {
    setParents(list => list.map(p => p.id !== selectedParent?.id ? p : {
      ...p,
      subjects: p.subjects.map(s => s.id !== next.id ? s : { ...s, ...next }),
    }));
  };

  const requestArchive = (subject) => {
    if (subject.inUse) return;
    setArchiveTarget(subject);
  };
  const confirmArchive = () => {
    if (!archiveTarget) return;
    setParents(list => list.map(p => p.id !== selectedParent?.id ? p : {
      ...p,
      subjects: p.subjects.map(s => s.id !== archiveTarget.id ? s : { ...s, status: 'ARCHIVED' }),
    }));
    setArchiveTarget(null);
  };

  // ── Render ──
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '35% 1fr', overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT — Page title + SubjectParent list */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.border}`, background: T.card, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '24px 24px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="bookOpen" size={20} color={pColor} strokeWidth={1.8} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary }}>
                  {t('Danh mục môn học', 'Subject Catalogue')}
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                  {t('Bộ môn và môn học theo khối lớp', 'Departments and grade-scoped subjects')}
                </div>
              </div>
            </div>
            <Button onClick={() => setParentDialogOpen(true)} icon="plus" style={{ width: '100%', justifyContent: 'center' }}>
              {t('Thêm bộ môn', 'Add department')}
            </Button>
          </div>

          {/* Parent list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 24px' }}>
            {parents.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: pColor + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Icon name="layers" size={26} color={pColor} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>
                  {t('Chưa có bộ môn nào', 'No departments yet')}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginBottom: 14 }}>
                  {t('Tạo bộ môn đầu tiên để bắt đầu thêm môn học.', 'Create your first department to start adding subjects.')}
                </div>
                <Button onClick={() => setParentDialogOpen(true)} icon="plus" size="sm">
                  {t('Thêm bộ môn đầu tiên', 'Add first department')}
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parents.map(parent => {
                  const isSelected = parent.id === selectedParentId;
                  const isArchived = parent.status === 'ARCHIVED';
                  const concept = smConceptStyle(parent, pColor);
                  const gradeLevels = [...new Set(parent.subjects.map(s => s.gradeLevel))].sort((a, b) => a - b);
                  const range = gradeLevels.length === 0 ? null
                              : gradeLevels.length === 1 ? `${gradeLevels[0]}`
                              : `${gradeLevels[0]}–${gradeLevels[gradeLevels.length - 1]}`;

                  return (
                    <button key={parent.id} onClick={() => { setSelectedParentId(parent.id); setDetailSubjectId(null); }}
                      style={{
                        width: '100%', display: 'flex', flexDirection: 'column', gap: 8,
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        background: isSelected ? pColor + '12' : 'transparent',
                        border: `1.5px solid ${isSelected ? pColor + '40' : 'transparent'}`,
                        fontFamily: 'inherit', position: 'relative',
                        opacity: isArchived ? 0.7 : 1,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                      {isSelected && <div style={{ position: 'absolute', left: -1, top: 12, bottom: 12, width: 3, background: pColor, borderRadius: '0 3px 3px 0' }} />}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800, color: isSelected ? pColor : T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {parent.name}
                        </div>
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
                          border: `1px solid ${isArchived ? T.border : T.success + '33'}`,
                          background: isArchived ? T.bg : T.successLight,
                          color: isArchived ? T.textMuted : T.success, letterSpacing: '0.04em',
                        }}>
                          {isArchived ? t('LƯU TRỮ', 'ARCHIVED') : t('HOẠT ĐỘNG', 'ACTIVE')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {concept && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10.5, fontWeight: 700,
                            color: concept.fg, background: concept.bg,
                            padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                          }}>
                            {parent.conceptLabelCustom
                              ? concept.label
                              : t(concept.label.vi, concept.label.en)}
                          </span>
                        )}
                        <span style={{ fontSize: 11.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{parent.subjects.length}</strong>{' '}
                          {t('môn học', 'subjects')}
                          {range && (
                            <span style={{ color: T.textMuted }}> · {t(`lớp ${range}`, `grade ${range}`)}</span>
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Subjects table for selected parent */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg }}>
          {!selectedParent ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
              {t('Chọn một bộ môn để xem các môn học.', 'Select a department to view its subjects.')}
            </div>
          ) : (
            <React.Fragment>
              {/* Breadcrumb header */}
              <div style={{ padding: '20px 28px', borderBottom: `1px solid ${T.border}`, background: T.card, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>{selectedParent.name}</span>
                    <Icon name="chevronRight" size={11} color={T.textMuted} />
                    <span style={{ color: T.textSecondary, fontWeight: 700 }}>{t('Các môn học', 'Subjects')}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary }}>
                    {t('Môn học theo khối', 'Grade-scoped subjects')}
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, marginLeft: 10, fontVariantNumeric: 'tabular-nums' }}>
                      ({selectedParent.subjects.length})
                    </span>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setSubjectDialogOpen(true)} icon="plus" style={{ flexShrink: 0 }}>
                  {t('Thêm môn học', 'Add subject')}
                </Button>
              </div>

              {/* Tenant grade range chip */}
              <div style={{ padding: '10px 28px', background: pColor + '08', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T.textSecondary, flexShrink: 0 }}>
                <Icon name="info" size={14} color={pColor} />
                <span>
                  {t('Phạm vi khối lớp của trường: ', 'School grade range: ')}
                  <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    {SM_TENANT_GRADE_RANGE.minGrade}–{SM_TENANT_GRADE_RANGE.maxGrade}
                  </strong>
                  <span style={{ color: T.textMuted }}> · {t('Môn học mới phải nằm trong phạm vi này.', 'New subjects must fall within this range.')}</span>
                </span>
              </div>

              {/* Table or empty state */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
                {selectedParent.subjects.length === 0 ? (
                  <div style={{
                    background: T.card, border: `1.5px dashed ${T.border}`, borderRadius: 14,
                    padding: '56px 24px', textAlign: 'center',
                  }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: pColor + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Icon name="bookOpen" size={28} color={pColor} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
                      {t('Chưa có môn học', 'No subjects yet')}
                    </div>
                    <div style={{ fontSize: 13, color: T.textMuted, margin: '0 auto 20px', lineHeight: 1.55, maxWidth: 360 }}>
                      {t(`Thêm môn học đầu tiên cho “${selectedParent.name}”.`,
                         `Add the first subject for "${selectedParent.name}".`)}
                    </div>
                    <Button onClick={() => setSubjectDialogOpen(true)} icon="plus">
                      {t('Thêm môn học đầu tiên', 'Add first subject')}
                    </Button>
                  </div>
                ) : (
                  <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    {/* Table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 90px 110px 110px 160px', gap: 12, padding: '11px 20px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', background: T.bg }}>
                      <div>{t('Tên môn', 'Name')}</div>
                      <div>{t('Lớp', 'Grade')}</div>
                      <div>{t('Mã', 'Code')}</div>
                      <div>{t('Trạng thái', 'Status')}</div>
                      <div style={{ textAlign: 'right' }}>{t('Thao tác', 'Actions')}</div>
                    </div>
                    {/* Rows */}
                    {selectedParent.subjects.map(s => {
                      const isArchived = s.status === 'ARCHIVED';
                      const archiveBlocked = s.inUse && !isArchived;
                      return (
                        <div key={s.id} onClick={() => onOpenSubjectDetail?.(s.id)}
                          style={{
                            display: 'grid', gridTemplateColumns: '1.7fr 90px 110px 110px 160px', gap: 12,
                            padding: '14px 20px', alignItems: 'center', cursor: 'pointer',
                            borderTop: `1px solid ${T.border}`,
                            background: 'transparent',
                            opacity: isArchived ? 0.7 : 1, transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = T.bg; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          {/* Name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: pColor + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon name="bookOpen" size={13} color={pColor} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.name}
                              </div>
                              {s.outcomeTargets && (
                                <div style={{ fontSize: 11, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                                  {s.outcomeTargets}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Grade */}
                          <div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                              background: pColor + '15', color: pColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                            }}>
                              {t(`Lớp ${s.gradeLevel}`, `Grade ${s.gradeLevel}`)}
                            </span>
                          </div>
                          {/* Code */}
                          <div style={{ fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace', color: T.textSecondary, letterSpacing: '0.04em' }}>
                            {s.code || '—'}
                          </div>
                          {/* Status */}
                          <div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              border: `1px solid ${isArchived ? T.border : T.success + '33'}`,
                              background: isArchived ? T.bg : T.successLight,
                              color: isArchived ? T.textMuted : T.success, letterSpacing: '0.04em', whiteSpace: 'nowrap',
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: isArchived ? T.textMuted : T.success, display: 'inline-block' }} />
                              {isArchived ? t('Lưu trữ', 'Archived') : t('Hoạt động', 'Active')}
                            </span>
                            {s.inUse && !isArchived && (
                              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, fontWeight: 600 }}>
                                {t('Đang sử dụng', 'In use')}
                              </div>
                            )}
                          </div>
                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => onOpenSubjectDetail?.(s.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 7, background: 'transparent', color: T.textSecondary, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}>
                              <Icon name="eye" size={11} color="currentColor" />
                              {t('Xem / Sửa', 'View / Edit')}
                            </button>
                            <div style={{ position: 'relative' }}
                              onMouseEnter={() => archiveBlocked && setTooltipId(s.id)}
                              onMouseLeave={() => setTooltipId(null)}>
                              <button onClick={() => requestArchive(s)} disabled={archiveBlocked || isArchived}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '6px 9px', borderRadius: 7,
                                  border: `1px solid ${archiveBlocked || isArchived ? T.border : T.error + '40'}`,
                                  background: archiveBlocked || isArchived ? T.bg : 'transparent',
                                  color: archiveBlocked || isArchived ? T.textMuted : T.error,
                                  fontSize: 11.5, fontWeight: 700,
                                  cursor: archiveBlocked || isArchived ? 'not-allowed' : 'pointer',
                                  fontFamily: 'inherit', opacity: archiveBlocked || isArchived ? 0.65 : 1, whiteSpace: 'nowrap',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { if (!archiveBlocked && !isArchived) e.currentTarget.style.background = T.errorLight; }}
                                onMouseLeave={e => { if (!archiveBlocked && !isArchived) e.currentTarget.style.background = 'transparent'; }}>
                                <Icon name="archive" size={11} color="currentColor" />
                                {isArchived ? t('Đã lưu trữ', 'Archived') : t('Lưu trữ', 'Archive')}
                              </button>
                              {tooltipId === s.id && archiveBlocked && (
                                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: T.textPrimary, color: '#fff', fontSize: 11, fontWeight: 600, padding: '7px 10px', borderRadius: 7, whiteSpace: 'nowrap', zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
                                  <div style={{ position: 'absolute', bottom: -4, right: 16, width: 8, height: 8, background: T.textPrimary, transform: 'rotate(45deg)' }} />
                                  {t('Môn học đang được sử dụng, không thể lưu trữ', 'Subject is in use — cannot archive')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>

      {/* Create SubjectParent */}
      {parentDialogOpen && (
        <CreateSubjectParentDialog pColor={pColor} lang={lang}
          onClose={() => setParentDialogOpen(false)} onCreate={createParent} />
      )}

      {/* Create Subject */}
      {subjectDialogOpen && selectedParent && (
        <CreateSubjectDialog parents={parents} initialParentId={selectedParent.id}
          gradeRange={SM_TENANT_GRADE_RANGE} pColor={pColor} lang={lang}
          onClose={() => setSubjectDialogOpen(false)} onCreate={createSubject} />
      )}

      {/* Archive confirm */}
      {archiveTarget && (
        <div onClick={() => setArchiveTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: T.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="archive" size={20} color={T.warning} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
                {t('Lưu trữ môn học?', 'Archive subject?')}
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
              {t(`Lưu trữ “${archiveTarget.name}”? Môn học sẽ bị ẩn khỏi danh sách tạo lớp mới. Các dữ liệu hiện có không bị xoá.`,
                 `Archive "${archiveTarget.name}"? It will be hidden from new class creation. Existing data is preserved.`)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setArchiveTarget(null)}>{t('Hủy', 'Cancel')}</Button>
              <Button variant="danger" onClick={confirmArchive} icon="archive">{t('Lưu trữ', 'Archive')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { SubjectsScreen });
