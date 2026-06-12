// ── Academic Calendar Configuration (ADMIN / BGH · /admin/calendar) ───────────
// Route:  /admin/calendar
// Role:   ADMIN (US-042 — academic calendar)
// Notes:  Date inputs use native <input type="date">; in real Next.js source,
//         swap for shadcn Calendar + Popover (the visual + state model here
//         maps 1:1 — popover anchor over the cell, draft commit on Save).

const CAL_SEED_YEARS = [
  {
    id: 'ay2025', label: '2025–2026', isActive: true,
    terms: [
      { id: 't1', name: 'Học kỳ 1', startDate: '2025-09-05', endDate: '2026-01-15', hasGrades: true },
      { id: 't2', name: 'Học kỳ 2', startDate: '2026-01-20', endDate: '2026-05-31', hasGrades: false },
    ],
  },
  {
    id: 'ay2024', label: '2024–2025', isActive: false,
    terms: [
      { id: 't3', name: 'Học kỳ 1', startDate: '2024-09-04', endDate: '2025-01-12', hasGrades: true },
      { id: 't4', name: 'Học kỳ 2', startDate: '2025-01-17', endDate: '2025-05-30', hasGrades: true },
    ],
  },
];

const calFormatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const calNewId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const CalendarConfigScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [years, setYears] = React.useState(CAL_SEED_YEARS);
  const [expandedYearId, setExpandedYearId] = React.useState('ay2025');
  const [editing, setEditing] = React.useState(null);          // {yearId, termId, draft}
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);
  const [newYear, setNewYear] = React.useState({ label: '', isActive: true });
  const [tooltipKey, setTooltipKey] = React.useState(null);

  const isEmpty = years.length === 0;

  // ── Handlers ──
  const toggleExpand = (id) => setExpandedYearId(curr => curr === id ? null : id);

  const startEdit = (yearId, term) => {
    setEditing({ yearId, termId: term.id, draft: { name: term.name, startDate: term.startDate, endDate: term.endDate } });
  };
  const updateDraft = (key, val) => setEditing(e => ({ ...e, draft: { ...e.draft, [key]: val } }));
  const cancelEdit = () => setEditing(null);
  const saveEdit = () => {
    if (!editing) return;
    const { yearId, termId, draft } = editing;
    setYears(ys => ys.map(y => y.id !== yearId ? y : {
      ...y,
      terms: y.terms.map(tm => tm.id !== termId ? tm : { ...tm, name: draft.name, startDate: draft.startDate, endDate: draft.endDate }),
    }));
    setEditing(null);
  };

  const addTerm = (yearId) => {
    const year = years.find(y => y.id === yearId);
    const newTerm = {
      id: calNewId('tm'),
      name: t(`Học kỳ ${(year?.terms.length || 0) + 1}`, `Term ${(year?.terms.length || 0) + 1}`),
      startDate: '', endDate: '', hasGrades: false,
    };
    setYears(ys => ys.map(y => y.id !== yearId ? y : { ...y, terms: [...y.terms, newTerm] }));
    setEditing({ yearId, termId: newTerm.id, draft: { name: newTerm.name, startDate: '', endDate: '' } });
  };

  const requestDelete = (yearId, term) => {
    if (term.hasGrades) return; // blocked — tooltip surfaces this
    setDeleteConfirm({ yearId, termId: term.id, name: term.name });
  };
  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { yearId, termId } = deleteConfirm;
    setYears(ys => ys.map(y => y.id !== yearId ? y : { ...y, terms: y.terms.filter(tm => tm.id !== termId) }));
    setDeleteConfirm(null);
  };

  const createYear = () => {
    const label = newYear.label.trim();
    if (!label) return;
    const id = calNewId('ay');
    setYears(ys => {
      const updated = newYear.isActive ? ys.map(y => ({ ...y, isActive: false })) : ys;
      return [{ id, label, isActive: newYear.isActive, terms: [] }, ...updated];
    });
    setExpandedYearId(id);
    setNewYear({ label: '', isActive: true });
  };

  // ── Render ──
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="calendar" size={22} color={pColor} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
                {t('Cấu hình năm học', 'Academic Calendar')}
              </div>
              <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
                {t('Quản lý năm học và các học kỳ của trường', 'Manage academic years and terms for your school')}
              </div>
            </div>
          </div>
          <button onClick={() => setYears(y => y.length ? [] : CAL_SEED_YEARS)}
            style={{ padding: '6px 12px', border: `1px dashed ${T.border}`, borderRadius: 7, background: T.card, color: T.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {isEmpty ? t('Khôi phục dữ liệu mẫu', 'Restore sample data') : t('Xem trạng thái trống', 'Preview empty state')}
          </button>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT — Academic years list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isEmpty ? (
              <div style={{ background: T.card, border: `1.5px dashed ${T.border}`, borderRadius: 14, padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: pColor + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Icon name="calendar" size={30} color={pColor} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
                  {t('Chưa có năm học nào', 'No academic years yet')}
                </div>
                <div style={{ fontSize: 13, color: T.textMuted, margin: '0 auto 20px', lineHeight: 1.55, maxWidth: 360 }}>
                  {t('Tạo năm học đầu tiên để bắt đầu cấu hình học kỳ, lịch giảng dạy và lịch thi.', 'Create your first academic year to start configuring terms, teaching schedules and exam periods.')}
                </div>
                <Button icon="plus" onClick={() => document.getElementById('cal-new-year-input')?.focus()}>
                  {t('Bắt đầu tạo năm học đầu tiên', 'Create your first academic year')}
                </Button>
              </div>
            ) : years.map(year => {
              const isExpanded = expandedYearId === year.id;
              return (
                <div key={year.id} style={{ background: T.card, borderRadius: 14, border: `1px solid ${year.isActive ? T.success + '55' : T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  {/* Card header */}
                  <button onClick={() => toggleExpand(year.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: year.isActive ? T.success + '0a' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: year.isActive ? T.success + '22' : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="calendar" size={18} color={year.isActive ? T.success : T.textSecondary} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{year.label}</span>
                        {year.isActive && (
                          <Badge color={T.success}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.success, display: 'inline-block' }} />
                            {t('Đang hoạt động', 'Active')}
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: T.textMuted }}>
                        {year.terms.length === 0
                          ? t('Chưa có học kỳ', 'No terms configured')
                          : t(`${year.terms.length} học kỳ`, `${year.terms.length} term${year.terms.length === 1 ? '' : 's'}`)}
                      </div>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${isExpanded ? 180 : 0}deg)`, transition: 'transform 0.2s', flexShrink: 0 }}>
                      <Icon name="chevronDown" size={14} color={T.textSecondary} />
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${T.border}` }}>
                      {/* Table header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 88px', gap: 8, padding: '10px 20px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', background: T.bg }}>
                        <div>{t('Tên học kỳ', 'Term name')}</div>
                        <div>{t('Ngày bắt đầu', 'Start date')}</div>
                        <div>{t('Ngày kết thúc', 'End date')}</div>
                        <div style={{ textAlign: 'right' }}>{t('Thao tác', 'Actions')}</div>
                      </div>

                      {/* Rows */}
                      {year.terms.length === 0 ? (
                        <div style={{ padding: '28px 20px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                          {t('Chưa có học kỳ nào trong năm học này.', 'No terms configured for this academic year yet.')}
                        </div>
                      ) : year.terms.map(term => {
                        const isEditing = editing && editing.yearId === year.id && editing.termId === term.id;
                        const blocked = term.hasGrades;
                        const tipKey = `${year.id}:${term.id}`;
                        return (
                          <div key={term.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 88px', gap: 8, padding: '12px 20px', alignItems: 'center', borderTop: `1px solid ${T.border}` }}>
                            {isEditing ? (
                              <React.Fragment>
                                <input value={editing.draft.name} onChange={e => updateDraft('name', e.target.value)}
                                  style={{ padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${pColor}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', minWidth: 0 }} />
                                <input type="date" value={editing.draft.startDate} onChange={e => updateDraft('startDate', e.target.value)}
                                  style={{ padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${pColor}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', minWidth: 0 }} />
                                <input type="date" value={editing.draft.endDate} onChange={e => updateDraft('endDate', e.target.value)} min={editing.draft.startDate || undefined}
                                  style={{ padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${pColor}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', minWidth: 0 }} />
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button onClick={cancelEdit} title={t('Huỷ', 'Cancel')}
                                    style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon name="x" size={13} color={T.textSecondary} />
                                  </button>
                                  <button onClick={saveEdit} title={t('Lưu', 'Save')}
                                    style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: pColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
                                  </button>
                                </div>
                              </React.Fragment>
                            ) : (
                              <React.Fragment>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{term.name}</span>
                                  {term.hasGrades && (
                                    <span style={{ fontSize: 10, fontWeight: 700, background: T.warningLight, color: T.warning, border: `1px solid ${T.warning}33`, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.03em', flexShrink: 0 }}>
                                      {t('Có điểm', 'Graded')}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 13, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{calFormatDate(term.startDate)}</div>
                                <div style={{ fontSize: 13, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{calFormatDate(term.endDate)}</div>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button onClick={() => startEdit(year.id, term)} title={t('Sửa', 'Edit')}
                                    style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.background = pColor + '0e'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = 'transparent'; }}>
                                    <Icon name="edit" size={13} color={T.textSecondary} />
                                  </button>
                                  <div style={{ position: 'relative' }}
                                    onMouseEnter={() => blocked && setTooltipKey(tipKey)}
                                    onMouseLeave={() => setTooltipKey(null)}>
                                    <button onClick={() => requestDelete(year.id, term)} disabled={blocked}
                                      style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${blocked ? T.border : T.error + '40'}`, background: blocked ? T.bg : T.errorLight, cursor: blocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: blocked ? 0.55 : 1 }}>
                                      <Icon name="x" size={14} color={blocked ? T.textMuted : T.error} strokeWidth={2.2} />
                                    </button>
                                    {tooltipKey === tipKey && (
                                      <div style={{ position: 'absolute', right: 0, top: 36, background: T.textPrimary, color: '#fff', fontSize: 11.5, fontWeight: 600, padding: '7px 10px', borderRadius: 7, whiteSpace: 'nowrap', zIndex: 50, boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }}>
                                        <div style={{ position: 'absolute', top: -4, right: 9, width: 8, height: 8, background: T.textPrimary, transform: 'rotate(45deg)' }} />
                                        {t('Học kỳ có dữ liệu điểm, không thể xoá', 'Term has grade entries — cannot delete')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </React.Fragment>
                            )}
                          </div>
                        );
                      })}

                      {/* Add term footer */}
                      <div style={{ borderTop: `1px solid ${T.border}`, padding: '10px 14px', background: T.bg + '00' }}>
                        <button onClick={() => addTerm(year.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: 'none', background: 'transparent', color: pColor, fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 7, fontFamily: 'inherit', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = pColor + '12'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Icon name="plus" size={14} color={pColor} strokeWidth={2.4} />
                          {t('Thêm học kỳ', 'Add term')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT — New year form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0 }}>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Icon name="plus" size={16} color={pColor} strokeWidth={2.4} />
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
                  {t('Thêm năm học mới', 'Add new academic year')}
                </div>
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18, lineHeight: 1.55 }}>
                {t('Sau khi tạo, mở thẻ năm học để cấu hình các học kỳ.', 'Once created, expand the year card to configure its terms.')}
              </div>

              <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>
                {t('Nhãn năm học', 'Year label')}
              </label>
              <input id="cal-new-year-input" value={newYear.label}
                onChange={e => setNewYear(y => ({ ...y, label: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && createYear()}
                placeholder={t('VD: 2026–2027', 'e.g. 2026–2027')}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', color: T.textPrimary, background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = pColor}
                onBlur={e => e.target.style.borderColor = T.border} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 16, padding: '12px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                <button onClick={() => setNewYear(y => ({ ...y, isActive: !y.isActive }))}
                  role="switch" aria-checked={newYear.isActive} aria-label={t('Đặt làm năm học hiện tại', 'Set as current academic year')}
                  style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: newYear.isActive ? T.success : T.border, position: 'relative', cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'background 0.15s', marginTop: 2 }}>
                  <span style={{ position: 'absolute', top: 2, left: newYear.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                    {t('Đặt làm năm học hiện tại', 'Set as current academic year')}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.5, marginTop: 2 }}>
                    {t('Năm học hiện tại sẽ là mặc định cho điểm danh, bảng điểm và lịch.', 'The current year is used by default in attendance, gradebook and schedule.')}
                  </div>
                </div>
              </div>

              <Button onClick={createYear} disabled={!newYear.label.trim()} icon="plus"
                style={{ width: '100%', marginTop: 16, justifyContent: 'center', padding: '11px' }}>
                {t('Tạo năm học', 'Create academic year')}
              </Button>
            </div>

            {/* Helper card */}
            <div style={{ background: pColor + '0a', borderRadius: 12, border: `1px solid ${pColor}28`, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Icon name="info" size={15} color={pColor} />
                <div style={{ fontSize: 11.5, color: T.textSecondary, lineHeight: 1.6 }}>
                  {t('Mẹo: Bạn có thể cấu hình từ 1 đến nhiều học kỳ tuỳ theo quy định của trường. Học kỳ đã có điểm sẽ được bảo vệ khỏi việc xoá nhầm.', 'Tip: Configure as many terms per year as your school requires. Terms with grade entries are protected from accidental deletion.')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', padding: 24, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: T.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="info" size={20} color={T.error} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
                {t('Xoá học kỳ?', 'Delete term?')}
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
              {t(`Bạn có chắc muốn xoá học kỳ “${deleteConfirm.name}”? Thao tác này không thể hoàn tác.`, `Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                {t('Huỷ', 'Cancel')}
              </Button>
              <Button variant="danger" onClick={confirmDelete} icon="x">
                {t('Xoá học kỳ', 'Delete term')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { CalendarConfigScreen });
