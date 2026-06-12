// ── SubjectParent Management (ADMIN · /admin/subject-parents) ─────────────────
// Route:   /admin/subject-parents
// Role:    ADMIN (US-056 · ADR 0036 — SubjectParent / Bộ môn quick mgmt)
// APIs:    POST   /api/v1/core/subject-parents
//          GET    /api/v1/core/subject-parents
//          GET    /api/v1/core/subject-parents/:id
//          PATCH  /api/v1/core/subject-parents/:id
//          POST   /api/v1/core/subject-parents/:id/archive
// Notes:   Focused single-purpose screen. Full subject master editor lives at
//          NEW-11 (/admin/subjects). Archive is blocked server-side when ACTIVE
//          child Subjects exist; we surface that as a disabled button + tooltip.

const SP_CONCEPTS = [
  { id: 'BO_MON', vi: 'Bộ môn',    en: 'Department',   color: 'primary' },
  { id: 'TO',     vi: 'Tổ',        en: 'Team',         color: 'warning' },
  { id: 'KHOA',   vi: 'Khoa',      en: 'Faculty',      color: 'teal'    },
];

const SP_SEED = [
  { id: 'sp-math',     name: 'Toán học',              nameEn: 'Mathematics',         conceptType: 'BO_MON', conceptLabelCustom: null, childCount: 7, activeChildCount: 7, status: 'ACTIVE' },
  { id: 'sp-lit',      name: 'Ngữ văn',               nameEn: 'Literature',          conceptType: 'BO_MON', conceptLabelCustom: null, childCount: 4, activeChildCount: 4, status: 'ACTIVE' },
  { id: 'sp-foreign',  name: 'Ngoại ngữ',             nameEn: 'Foreign Languages',   conceptType: 'TO',     conceptLabelCustom: null, childCount: 5, activeChildCount: 5, status: 'ACTIVE' },
  { id: 'sp-science',  name: 'Khoa học Tự nhiên',     nameEn: 'Natural Sciences',    conceptType: 'KHOA',   conceptLabelCustom: null, childCount: 9, activeChildCount: 9, status: 'ACTIVE' },
  { id: 'sp-social',   name: 'Khoa học Xã hội',       nameEn: 'Social Sciences',     conceptType: 'KHOA',   conceptLabelCustom: null, childCount: 6, activeChildCount: 6, status: 'ACTIVE' },
  { id: 'sp-pe',       name: 'Thể chất & Quốc phòng', nameEn: 'PE & National Def.',  conceptType: 'TO',     conceptLabelCustom: null, childCount: 3, activeChildCount: 3, status: 'ACTIVE' },
  { id: 'sp-arts',     name: 'Nghệ thuật',            nameEn: 'Arts',                conceptType: null,     conceptLabelCustom: null, childCount: 2, activeChildCount: 0, status: 'ACTIVE' },
  { id: 'sp-tech',     name: 'Tin học & Công nghệ',   nameEn: 'IT & Technology',     conceptType: 'BO_MON', conceptLabelCustom: 'Trung tâm', childCount: 4, activeChildCount: 0, status: 'ARCHIVED' },
];

const spNewId = () => `sp-${Math.random().toString(36).slice(2, 8)}`;

const SubjectParentsScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [items, setItems] = React.useState(SP_SEED);
  const [statusFilter, setStatusFilter] = React.useState('ALL'); // ALL | ACTIVE | ARCHIVED
  const [search, setSearch] = React.useState('');
  const [dialog, setDialog] = React.useState(null);           // null | { mode: 'create'|'edit', draft }
  const [archiveTarget, setArchiveTarget] = React.useState(null);
  const [tooltipId, setTooltipId] = React.useState(null);

  // ── Derived ──
  const filtered = items.filter(sp => {
    if (statusFilter !== 'ALL' && sp.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${sp.name} ${sp.nameEn || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const counts = {
    ALL: items.length,
    ACTIVE: items.filter(i => i.status === 'ACTIVE').length,
    ARCHIVED: items.filter(i => i.status === 'ARCHIVED').length,
  };

  const conceptColorOf = (key) => {
    const map = { primary: { fg: pColor, bg: pColor + '18' }, warning: { fg: T.warning, bg: T.warningLight }, teal: { fg: T.teal, bg: T.tealLight } };
    return map[key] || { fg: T.textMuted, bg: T.bg };
  };

  // ── Dialog handlers ──
  const openCreate = () => setDialog({
    mode: 'create',
    draft: { id: null, name: '', conceptMode: 'BO_MON', conceptLabelCustom: '' },
  });
  const openEdit = (sp) => {
    const conceptMode = sp.conceptLabelCustom ? 'CUSTOM' : (sp.conceptType || 'NONE');
    setDialog({
      mode: 'edit',
      draft: { id: sp.id, name: sp.name, conceptMode, conceptLabelCustom: sp.conceptLabelCustom || '' },
    });
  };
  const closeDialog = () => setDialog(null);
  const updateDraft = (patch) => setDialog(d => ({ ...d, draft: { ...d.draft, ...patch } }));

  const saveDialog = () => {
    if (!dialog) return;
    const { mode, draft } = dialog;
    const trimmedName = draft.name.trim();
    if (!trimmedName) return;
    if (trimmedName.length > 128) return;

    const conceptType = draft.conceptMode === 'CUSTOM' || draft.conceptMode === 'NONE' ? null : draft.conceptMode;
    const conceptLabelCustom = draft.conceptMode === 'CUSTOM' ? draft.conceptLabelCustom.trim() || null : null;
    if (draft.conceptMode === 'CUSTOM' && !conceptLabelCustom) return;

    if (mode === 'create') {
      setItems(list => [{
        id: spNewId(), name: trimmedName, nameEn: trimmedName,
        conceptType, conceptLabelCustom,
        childCount: 0, activeChildCount: 0, status: 'ACTIVE',
      }, ...list]);
    } else {
      setItems(list => list.map(sp => sp.id !== draft.id ? sp : {
        ...sp, name: trimmedName, conceptType, conceptLabelCustom,
      }));
    }
    setDialog(null);
  };

  const requestArchive = (sp) => {
    if (sp.activeChildCount > 0) return; // blocked — tooltip surfaces this
    setArchiveTarget(sp);
  };
  const confirmArchive = () => {
    if (!archiveTarget) return;
    setItems(list => list.map(sp => sp.id !== archiveTarget.id ? sp : { ...sp, status: 'ARCHIVED' }));
    setArchiveTarget(null);
  };
  const restoreOne = (sp) => setItems(list => list.map(it => it.id !== sp.id ? it : { ...it, status: 'ACTIVE' }));

  // ── Render ──
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="layers" size={22} color={pColor} strokeWidth={1.8} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
                {t('Bộ môn / Tổ chuyên môn', 'Subject Departments')}
              </div>
              <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2, maxWidth: 640, lineHeight: 1.5 }}>
                {t('Nhóm môn học theo chuyên ngành. Bộ môn là nền tảng để phân công giáo viên và quản lý chức danh.',
                   'Group subjects by discipline. Departments are the foundation for teacher assignment and position titles.')}
              </div>
            </div>
          </div>
          <Button onClick={openCreate} icon="plus" style={{ flexShrink: 0 }}>
            {t('Thêm bộ môn', 'Add department')}
          </Button>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            {[
              { id: 'ALL',      vi: 'Tất cả',          en: 'All' },
              { id: 'ACTIVE',   vi: 'Đang hoạt động',  en: 'Active' },
              { id: 'ARCHIVED', vi: 'Đã lưu trữ',      en: 'Archived' },
            ].map(opt => {
              const active = statusFilter === opt.id;
              return (
                <button key={opt.id} onClick={() => setStatusFilter(opt.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 7, border: 'none',
                    background: active ? pColor : 'transparent',
                    color: active ? '#fff' : T.textSecondary,
                    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}>
                  {t(opt.vi, opt.en)}
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                    background: active ? 'rgba(255,255,255,0.25)' : T.bg,
                    color: active ? '#fff' : T.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{counts[opt.id]}</span>
                </button>
              );
            })}
          </div>

          <div style={{
            flex: 1, minWidth: 220, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}>
            <Icon name="search" size={14} color={T.textMuted} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('Tìm bộ môn…', 'Search departments…')}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <Icon name="x" size={13} color={T.textMuted} />
              </button>
            )}
          </div>
        </div>

        {/* Grid / empty */}
        {items.length === 0 ? (
          // True empty (no items at all)
          <div style={{ background: T.card, border: `1.5px dashed ${T.border}`, borderRadius: 14, padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: pColor + '10', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', position: 'relative' }}>
              <Icon name="layers" size={36} color={pColor} strokeWidth={1.5} />
              <span style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, background: pColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={12} color="#fff" strokeWidth={2.6} />
              </span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
              {t('Chưa có bộ môn nào', 'No departments yet')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, margin: '0 auto 20px', lineHeight: 1.55, maxWidth: 380 }}>
              {t('Tạo bộ môn đầu tiên để bắt đầu xây dựng danh mục môn học.',
                 'Create your first department to start building your subject catalog.')}
            </div>
            <Button onClick={openCreate} icon="plus" size="lg">
              {t('Tạo bộ môn đầu tiên', 'Create first department')}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          // Filtered-empty
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Icon name="search" size={22} color={T.textMuted} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>
              {t('Không tìm thấy bộ môn phù hợp', 'No matching departments')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 14 }}>
              {t('Thử thay đổi bộ lọc hoặc xoá từ khoá tìm kiếm.', 'Try adjusting the filter or clearing your search.')}
            </div>
            <button onClick={() => { setStatusFilter('ALL'); setSearch(''); }}
              style={{ padding: '7px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: 'transparent', color: T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('Xoá bộ lọc', 'Clear filters')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(sp => {
              const concept = SP_CONCEPTS.find(c => c.id === sp.conceptType);
              const conceptLabel = sp.conceptLabelCustom || (concept ? t(concept.vi, concept.en) : null);
              const conceptColors = sp.conceptLabelCustom
                ? { fg: T.purple, bg: T.purpleLight }
                : (concept ? conceptColorOf(concept.color) : null);
              const isArchived = sp.status === 'ARCHIVED';
              const archiveBlocked = sp.activeChildCount > 0;

              return (
                <div key={sp.id} style={{
                  background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20,
                  display: 'flex', flexDirection: 'column', gap: 14,
                  opacity: isArchived ? 0.78 : 1, position: 'relative',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                  onMouseEnter={e => { if (!isArchived) e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)'; }}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'}>

                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sp.name}
                      </div>
                      {conceptLabel && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700,
                          color: conceptColors.fg, background: conceptColors.bg,
                          padding: '3px 9px', borderRadius: 99, letterSpacing: '0.02em',
                        }}>
                          {sp.conceptLabelCustom && <Icon name="edit" size={10} color={conceptColors.fg} strokeWidth={2.2} />}
                          {conceptLabel}
                        </span>
                      )}
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                      fontSize: 10.5, fontWeight: 700,
                      color: isArchived ? T.textMuted : T.success,
                      background: isArchived ? T.bg : T.successLight,
                      border: `1px solid ${isArchived ? T.border : T.success + '33'}`,
                      padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isArchived ? T.textMuted : T.success, display: 'inline-block' }} />
                      {isArchived ? t('Đã lưu trữ', 'Archived') : t('Hoạt động', 'Active')}
                    </span>
                  </div>

                  {/* Body: child count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.textMuted, paddingTop: 4, paddingBottom: 4, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, marginTop: 'auto', padding: '10px 0' }}>
                    <Icon name="bookOpen" size={12} color={T.textMuted} />
                    <span>
                      <strong style={{ color: T.textSecondary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{sp.childCount}</strong>
                      {' '}
                      {t('môn học', sp.childCount === 1 ? 'subject' : 'subjects')}
                      {sp.activeChildCount !== sp.childCount && (
                        <span style={{ color: T.textMuted }}> · {sp.activeChildCount} {t('hoạt động', 'active')}</span>
                      )}
                    </span>
                  </div>

                  {/* Footer actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isArchived ? (
                      <button onClick={() => restoreOne(sp)}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', border: `1px solid ${T.border}`, borderRadius: 8, background: 'transparent', color: T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.success; e.currentTarget.style.color = T.success; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}>
                        <Icon name="check" size={13} color="currentColor" strokeWidth={2.2} />
                        {t('Khôi phục', 'Restore')}
                      </button>
                    ) : (
                      <React.Fragment>
                        <button onClick={() => openEdit(sp)}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', border: `1px solid ${T.border}`, borderRadius: 8, background: 'transparent', color: T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}>
                          <Icon name="edit" size={13} color="currentColor" />
                          {t('Chỉnh sửa', 'Edit')}
                        </button>
                        <div style={{ position: 'relative', flex: 1 }}
                          onMouseEnter={() => archiveBlocked && setTooltipId(sp.id)}
                          onMouseLeave={() => setTooltipId(null)}>
                          <button onClick={() => requestArchive(sp)} disabled={archiveBlocked}
                            style={{
                              width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '8px', borderRadius: 8,
                              border: `1px solid ${archiveBlocked ? T.border : T.error + '40'}`,
                              background: archiveBlocked ? T.bg : 'transparent',
                              color: archiveBlocked ? T.textMuted : T.error,
                              fontSize: 12.5, fontWeight: 700,
                              cursor: archiveBlocked ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', opacity: archiveBlocked ? 0.7 : 1,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!archiveBlocked) e.currentTarget.style.background = T.errorLight; }}
                            onMouseLeave={e => { if (!archiveBlocked) e.currentTarget.style.background = 'transparent'; }}>
                            <Icon name="archive" size={13} color="currentColor" />
                            {t('Lưu trữ', 'Archive')}
                          </button>
                          {tooltipId === sp.id && archiveBlocked && (
                            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, left: 0, background: T.textPrimary, color: '#fff', fontSize: 11.5, fontWeight: 600, padding: '8px 11px', borderRadius: 7, lineHeight: 1.4, zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
                              <div style={{ position: 'absolute', bottom: -4, right: '50%', transform: 'translateX(50%) rotate(45deg)', width: 8, height: 8, background: T.textPrimary }} />
                              {t(`Không thể lưu trữ: còn ${sp.activeChildCount} môn học đang hoạt động.`, `Cannot archive: ${sp.activeChildCount} active subject${sp.activeChildCount === 1 ? '' : 's'} remain.`)}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      {dialog && (
        <SubjectParentDialog
          dialog={dialog} updateDraft={updateDraft}
          onSave={saveDialog} onClose={closeDialog}
          pColor={pColor} t={t}
        />
      )}

      {/* Archive confirm */}
      {archiveTarget && (
        <div onClick={() => setArchiveTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', padding: 24, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: T.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="archive" size={20} color={T.warning} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
                {t('Lưu trữ bộ môn?', 'Archive department?')}
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
              {t(`Lưu trữ bộ môn “${archiveTarget.name}”? Hành động này sẽ ẩn bộ môn khỏi các tùy chọn phân công mới. Các dữ liệu hiện có không bị xoá.`,
                 `Archive "${archiveTarget.name}"? It will be hidden from new assignment options. Existing data is preserved.`)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
                {t('Hủy', 'Cancel')}
              </Button>
              <Button variant="danger" onClick={confirmArchive} icon="archive">
                {t('Lưu trữ', 'Archive')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Create / Edit Dialog ─────────────────────────────────────────────────────

const SubjectParentDialog = ({ dialog, updateDraft, onSave, onClose, pColor, t }) => {
  const { mode, draft } = dialog;
  const isCreate = mode === 'create';
  const nameTooLong = draft.name.length > 128;
  const nameValid = draft.name.trim().length > 0 && !nameTooLong;
  const customValid = draft.conceptMode !== 'CUSTOM' || draft.conceptLabelCustom.trim().length > 0;
  const canSave = nameValid && customValid;

  // Focus name on open
  const nameRef = React.useRef(null);
  React.useEffect(() => { nameRef.current?.focus(); }, []);

  const CONCEPT_OPTIONS = [
    { id: 'BO_MON', vi: 'Bộ môn',   en: 'Department' },
    { id: 'TO',     vi: 'Tổ',       en: 'Team' },
    { id: 'KHOA',   vi: 'Khoa',     en: 'Faculty' },
    { id: 'CUSTOM', vi: 'Tùy chỉnh',en: 'Custom' },
  ];

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: T.card, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="layers" size={18} color={pColor} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
              {isCreate ? t('Thêm bộ môn mới', 'New department') : t('Chỉnh sửa bộ môn', 'Edit department')}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
              {isCreate ? t('Tạo nhóm môn học mới cho trường.', 'Create a new subject group for your school.')
                        : t('Cập nhật tên và nhãn phân loại.', 'Update name and concept label.')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="x" size={16} color={T.textMuted} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
              {t('Tên bộ môn', 'Department name')} <span style={{ color: T.error }}>*</span>
            </label>
            <input ref={nameRef} value={draft.name} maxLength={128}
              onChange={e => updateDraft({ name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) onSave(); }}
              placeholder={t('VD: Toán học, Ngoại ngữ, …', 'e.g. Mathematics, Foreign Languages, …')}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 9,
                border: `1.5px solid ${nameTooLong ? T.error : T.border}`,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
                color: T.textPrimary, background: '#fff', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { if (!nameTooLong) e.target.style.borderColor = pColor; }}
              onBlur={e => { if (!nameTooLong) e.target.style.borderColor = T.border; }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: nameTooLong ? T.error : T.textMuted }}>
              <span>{t('1–128 ký tự', '1–128 characters')}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{draft.name.length}/128</span>
            </div>
          </div>

          {/* Concept label */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
              {t('Nhãn phân loại', 'Concept label')}
              <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>
                ({t('không bắt buộc', 'optional')})
              </span>
              <span title={t('Nhãn hiển thị trong giao diện (không ảnh hưởng chức năng).', 'Display label shown in the UI (does not affect functionality).')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: T.bg, color: T.textMuted, fontSize: 9, fontWeight: 700, cursor: 'help' }}>?</span>
            </div>

            <div style={{ display: 'flex', gap: 6, background: T.bg, padding: 4, borderRadius: 9, border: `1px solid ${T.border}` }}>
              {CONCEPT_OPTIONS.map(opt => {
                const active = draft.conceptMode === opt.id;
                return (
                  <button key={opt.id} onClick={() => updateDraft({ conceptMode: opt.id })}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 6, border: 'none',
                      background: active ? T.card : 'transparent',
                      color: active ? pColor : T.textSecondary,
                      fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                    {t(opt.vi, opt.en)}
                  </button>
                );
              })}
            </div>

            {draft.conceptMode === 'CUSTOM' && (
              <div style={{ marginTop: 10 }}>
                <input value={draft.conceptLabelCustom} maxLength={32}
                  onChange={e => updateDraft({ conceptLabelCustom: e.target.value })}
                  placeholder={t('Nhập nhãn tuỳ chỉnh (VD: Trung tâm, Phòng…)', 'Enter custom label (e.g. Center, Office…)')}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 9,
                    border: `1.5px solid ${T.border}`, fontSize: 13,
                    fontFamily: 'inherit', outline: 'none', color: T.textPrimary,
                    background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = pColor}
                  onBlur={e => e.target.style.borderColor = T.border} />
                {!customValid && draft.conceptLabelCustom.length === 0 && (
                  <div style={{ fontSize: 11, color: T.error, marginTop: 5, fontWeight: 600 }}>
                    {t('Vui lòng nhập nhãn tuỳ chỉnh.', 'Please enter a custom label.')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>
            {t('Hủy', 'Cancel')}
          </Button>
          <Button onClick={onSave} disabled={!canSave} icon="check">
            {t('Lưu', 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SubjectParentsScreen });
