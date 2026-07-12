// ── P3: Parent–Student Links & Consent Management ─────────────────────────────
// Part 1: ParentLinksScreen  — admin surface (/admin/parent-links, principal)
// Part 2: ParentConsentSection / ParentConsentScreen — parent-facing consent card

// ── Mock data (baseline cast) ─────────────────────────────────────────────────
const PL_STUDENTS = [
  { id: 'st1', name: 'Nguyễn Minh Khoa',   cls: '11A2', avatar: 'NK', color: T.primary },
  { id: 'st2', name: 'Nguyễn Thị Lan Anh', cls: '8B1',  avatar: 'LA', color: T.purple },
  { id: 'st3', name: 'Trần Quốc Bảo',      cls: '11A2', avatar: 'QB', color: T.info },
  { id: 'st4', name: 'Lê Thảo Vy',         cls: '10C3', avatar: 'TV', color: T.teal },
  { id: 'st5', name: 'Phạm Gia Huy',       cls: '8B1',  avatar: 'GH', color: T.warning },
  { id: 'st6', name: 'Hoàng Mai Chi',      cls: '12A1', avatar: 'MC', color: T.error },
  { id: 'st7', name: 'Vũ Đức Anh',         cls: '10C3', avatar: 'DA', color: T.primaryDark },
];

const PL_PARENTS = [
  { id: 'pa1', name: 'Nguyễn Văn Bình', phone: '0912 345 678', avatar: 'VB', color: T.primary },
  { id: 'pa2', name: 'Trần Thị Mai',    phone: '0987 654 321', avatar: 'TM', color: T.purple },
  { id: 'pa3', name: 'Lê Văn Hùng',     phone: '0903 222 111', avatar: 'VH', color: T.teal },
  { id: 'pa4', name: 'Phạm Thị Thu',    phone: '0938 555 444', avatar: 'TT', color: T.warning },
  { id: 'pa5', name: 'Hoàng Văn Sơn',   phone: '0972 888 999', avatar: 'VS', color: T.info },
];

const PL_SEED_LINKS = [
  { id: 'l1', studentId: 'st1', parentId: 'pa1', relation: 'father',   consent: 'agreed',   linkedAt: '12/08/2025', note: '' },
  { id: 'l2', studentId: 'st2', parentId: 'pa1', relation: 'father',   consent: 'pending',  linkedAt: '12/08/2025', note: '' },
  { id: 'l3', studentId: 'st3', parentId: 'pa2', relation: 'mother',   consent: 'agreed',   linkedAt: '20/08/2025', note: '' },
  { id: 'l4', studentId: 'st4', parentId: 'pa3', relation: 'father',   consent: 'declined', linkedAt: '05/09/2025', note: 'PH yêu cầu chỉ liên hệ qua điện thoại.' },
  { id: 'l5', studentId: 'st5', parentId: 'pa4', relation: 'guardian', consent: 'pending',  linkedAt: '14/09/2025', note: 'Người giám hộ hợp pháp (quyết định số 128/QĐ).' },
  { id: 'l6', studentId: 'st6', parentId: 'pa5', relation: 'father',   consent: 'agreed',   linkedAt: '02/10/2025', note: '' },
];

const PL_CLASSES = ['8B1', '10C3', '11A2', '12A1'];

const PL_RELATIONS = {
  father:   { vi: 'Bố',             en: 'Father',   color: T.info },
  mother:   { vi: 'Mẹ',             en: 'Mother',   color: T.purple },
  guardian: { vi: 'Người giám hộ',  en: 'Guardian', color: T.textSecondary },
};

const PL_CONSENT = {
  agreed:   { vi: 'Đã đồng ý nhận TB', en: 'Consented',   icon: 'check', color: T.teal },
  pending:  { vi: 'Chưa phản hồi',     en: 'No response', icon: 'clock', color: T.warningText },
  declined: { vi: 'Đã từ chối',        en: 'Declined',    icon: 'x',     color: T.errorDark },
};

// ── Small shared helpers ──────────────────────────────────────────────────────
const usePLIsMobile = () => {
  const [mobile, setMobile] = React.useState(() => window.innerWidth < 760);
  React.useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

const PLConsentBadge = ({ consent, lang }) => {
  const m = PL_CONSENT[consent];
  return (
    <Badge color={m.color}>
      <Icon name={m.icon} size={11} color={m.color} strokeWidth={2.4} />
      {lang === 'en' ? m.en : m.vi}
    </Badge>
  );
};

const PLRelationBadge = ({ relation, lang }) => {
  const m = PL_RELATIONS[relation];
  return <Badge color={m.color}>{lang === 'en' ? m.en : m.vi}</Badge>;
};

const PLToast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div role="status" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9500,
      display: 'flex', alignItems: 'center', gap: 10,
      background: T.textPrimary, color: '#fff', borderRadius: 12,
      padding: '12px 18px', boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
      animation: 'pl-toast-in 0.22s ease-out', maxWidth: 360,
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: '50%', background: (toast.color || T.success) + '33',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={toast.icon || 'check'} size={13} color={toast.color || T.success} strokeWidth={2.6} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{toast.text}</span>
    </div>
  );
};

// Generic modal shell with focus trap + Escape (same behavior as ReportContentDialog).
const PLModal = ({ onClose, labelledBy, maxWidth = 460, children }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    if (el) { const f = el.querySelector('input, button, textarea, select'); if (f) f.focus(); }
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll('button:not([disabled]), input, textarea, select, [tabindex="0"]');
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000, padding: 20,
    }}>
      <div ref={ref} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        style={{
          background: T.card, borderRadius: 14, width: '100%', maxWidth,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}>
        {children}
      </div>
    </div>
  );
};

// ── Searchable combobox (student / parent picker) ─────────────────────────────
const PLCombobox = ({ label, placeholder, items, value, onChange, renderSub, lang, pColor, error }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const listId = React.useId();

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = items.find(i => i.id === value) || null;
  const filtered = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
        {label}
      </label>
      {selected ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          border: `1.5px solid ${pColor}`, borderRadius: 9, background: pColor + '0D',
        }}>
          <Avatar initials={selected.avatar} color={selected.color} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{renderSub(selected)}</div>
          </div>
          <button onClick={() => { onChange(null); setQuery(''); }}
            aria-label={t('Bỏ chọn', 'Clear selection')}
            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: T.bg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="x" size={11} color={T.textMuted} />
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
          border: `1px solid ${error ? T.errorDark : T.border}`, borderRadius: 9, background: T.bg,
        }}>
          <Icon name="search" size={13} color={T.textMuted} />
          <input
            role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
            value={query} placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit' }} />
        </div>
      )}
      {open && !selected && (
        <div id={listId} role="listbox" style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 210, overflowY: 'auto', padding: 4,
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: '12px 12px', fontSize: 12.5, color: T.textMuted }}>
              {t('Không tìm thấy kết quả.', 'No results found.')}
            </div>
          )}
          {filtered.map(item => (
            <button key={item.id} role="option" aria-selected={false}
              onClick={() => { onChange(item.id); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
                border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
                fontFamily: 'inherit', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar initials={item.avatar} color={item.color} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{item.name}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{renderSub(item)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Create link dialog ────────────────────────────────────────────────────────
const PLCreateDialog = ({ links, onClose, onCreate, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [studentId, setStudentId] = React.useState(null);
  const [parentId, setParentId] = React.useState(null);
  const [relation, setRelation] = React.useState('father');
  const [note, setNote] = React.useState('');
  const [dupError, setDupError] = React.useState(false);

  React.useEffect(() => { setDupError(false); }, [studentId, parentId]);

  const duplicate = studentId && parentId && links.some(l => l.studentId === studentId && l.parentId === parentId);
  const valid = studentId && parentId && !duplicate;

  const submit = () => {
    if (duplicate) { setDupError(true); return; }
    if (!valid) return;
    onCreate({ studentId, parentId, relation, note: note.trim() });
  };

  return (
    <PLModal onClose={onClose} labelledBy="pl-create-title" maxWidth={470}>
      <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="link" size={16} color={pColor} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="pl-create-title" style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Tạo liên kết Phụ huynh – Học sinh', 'Create parent–student link')}</div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
            {t('Phụ huynh được liên kết sẽ có thể xem dữ liệu học tập của học sinh.', 'Linked parents can view the student’s academic data.')}
          </div>
        </div>
        <button onClick={onClose} aria-label={t('Đóng', 'Close')}
          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: T.bg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="x" size={13} color={T.textMuted} />
        </button>
      </div>

      <div style={{ overflowY: 'auto', padding: '16px 22px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PLCombobox
          label={t('Học sinh', 'Student')}
          placeholder={t('Tìm theo tên học sinh…', 'Search students…')}
          items={PL_STUDENTS} value={studentId} onChange={setStudentId}
          renderSub={s => t(`Lớp ${s.cls}`, `Class ${s.cls}`)}
          lang={lang} pColor={pColor} />

        <div>
          <PLCombobox
            label={t('Phụ huynh (tài khoản role parent)', 'Parent (member with parent role)')}
            placeholder={t('Tìm theo tên phụ huynh…', 'Search parents…')}
            items={PL_PARENTS} value={parentId} onChange={setParentId}
            renderSub={p => p.phone}
            lang={lang} pColor={pColor} error={dupError || duplicate} />
          {(dupError || duplicate) && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 700, color: T.errorDark }}>
              <Icon name="alertTriangle" size={12} color={T.errorDark} strokeWidth={2.2} />
              {t('Liên kết đã tồn tại', 'This link already exists')}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="pl-relation" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
            {t('Quan hệ', 'Relationship')}
          </label>
          <select id="pl-relation" value={relation} onChange={e => setRelation(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${T.border}`,
              background: T.bg, fontSize: 13, color: T.textPrimary, fontFamily: 'inherit', outline: 'none',
            }}>
            {Object.entries(PL_RELATIONS).map(([id, m]) => (
              <option key={id} value={id}>{t(m.vi, m.en)}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pl-note" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
            {t('Ghi chú (không bắt buộc)', 'Note (optional)')}
          </label>
          <textarea id="pl-note" value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder={t('VD: người giám hộ hợp pháp, giấy tờ kèm theo…', 'e.g. legal guardian, supporting documents…')}
            style={{
              width: '100%', border: `1px solid ${T.border}`, borderRadius: 9, padding: '9px 12px',
              fontSize: 12.5, fontFamily: 'inherit', color: T.textPrimary, background: T.bg,
              outline: 'none', resize: 'vertical', lineHeight: 1.5,
            }} />
        </div>
      </div>

      <div style={{ padding: '12px 22px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
        <Button variant="ghost" size="sm" onClick={onClose} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
          {t('Hủy', 'Cancel')}
        </Button>
        <Button size="sm" icon="link" disabled={!valid} onClick={submit}>
          {t('Tạo liên kết', 'Create link')}
        </Button>
      </div>
    </PLModal>
  );
};

// ── Unlink confirm dialog ─────────────────────────────────────────────────────
const PLUnlinkDialog = ({ link, onClose, onConfirm, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const st = PL_STUDENTS.find(s => s.id === link.studentId);
  const pa = PL_PARENTS.find(p => p.id === link.parentId);
  return (
    <PLModal onClose={onClose} labelledBy="pl-unlink-title" maxWidth={430}>
      <div style={{ padding: '20px 22px 16px', display: 'flex', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.errorDarkLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="alertTriangle" size={17} color={T.errorDark} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="pl-unlink-title" style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
            {t('Gỡ liên kết phụ huynh – học sinh?', 'Remove this parent–student link?')}
          </div>
          <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
            {t(
              <>Phụ huynh <strong>{pa.name}</strong> sẽ mất quyền xem điểm số, hạnh kiểm, chuyên cần và mọi thông báo về học sinh <strong>{st.name} ({st.cls})</strong>. Tài khoản của hai bên không bị xoá.</>,
              <>Parent <strong>{pa.name}</strong> will lose access to grades, conduct, attendance and all notifications about <strong>{st.name} ({st.cls})</strong>. Neither account is deleted.</>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 22px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, background: T.bg }}>
        <Button variant="ghost" size="sm" onClick={onClose} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
          {t('Hủy', 'Cancel')}
        </Button>
        <Button variant="danger" size="sm" icon="trash" onClick={onConfirm}>
          {t('Gỡ liên kết', 'Remove link')}
        </Button>
      </div>
    </PLModal>
  );
};

// ── Detail dialog ─────────────────────────────────────────────────────────────
const PLDetailDialog = ({ link, onClose, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const st = PL_STUDENTS.find(s => s.id === link.studentId);
  const pa = PL_PARENTS.find(p => p.id === link.parentId);
  const Row = ({ label, children }) => (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 120, flexShrink: 0, fontSize: 12, fontWeight: 700, color: T.textMuted }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: T.textPrimary }}>{children}</div>
    </div>
  );
  return (
    <PLModal onClose={onClose} labelledBy="pl-detail-title" maxWidth={440}>
      <div style={{ padding: '18px 22px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div id="pl-detail-title" style={{ flex: 1, fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
          {t('Chi tiết liên kết', 'Link details')}
        </div>
        <button onClick={onClose} aria-label={t('Đóng', 'Close')}
          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: T.bg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={13} color={T.textMuted} />
        </button>
      </div>
      <div style={{ padding: '4px 22px 18px' }}>
        <Row label={t('Học sinh', 'Student')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Avatar initials={st.avatar} color={st.color} size={24} />
            <strong>{st.name}</strong> · {st.cls}
          </span>
        </Row>
        <Row label={t('Phụ huynh', 'Parent')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Avatar initials={pa.avatar} color={pa.color} size={24} />
            <strong>{pa.name}</strong> · {pa.phone}
          </span>
        </Row>
        <Row label={t('Quan hệ', 'Relationship')}><PLRelationBadge relation={link.relation} lang={lang} /></Row>
        <Row label={t('Consent', 'Consent')}><PLConsentBadge consent={link.consent} lang={lang} /></Row>
        <Row label={t('Ngày liên kết', 'Linked on')}>{link.linkedAt}</Row>
        {link.note && <Row label={t('Ghi chú', 'Note')}>{link.note}</Row>}
      </div>
    </PLModal>
  );
};

// ── Row action menu ("…") ─────────────────────────────────────────────────────
const PLRowMenu = ({ onDetail, onUnlink, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label={t('Hành động', 'Actions')}
        style={{
          width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <Icon name="moreHorizontal" size={15} color={T.textSecondary} />
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: 34, background: T.card,
          border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          padding: 5, minWidth: 168, zIndex: 60,
        }}>
          <button role="menuitem" onClick={() => { setOpen(false); onDetail(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 7, fontSize: 12.5, fontWeight: 600, color: T.textPrimary, fontFamily: 'inherit', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="externalLink" size={13} color={T.textSecondary} />
            {t('Xem chi tiết', 'View details')}
          </button>
          <button role="menuitem" onClick={() => { setOpen(false); onUnlink(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 7, fontSize: 12.5, fontWeight: 700, color: T.errorDark, fontFamily: 'inherit', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = T.errorDarkLight}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="trash" size={13} color={T.errorDark} />
            {t('Gỡ liên kết', 'Remove link')}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Skeleton / error / empty ──────────────────────────────────────────────────
const PLSkeleton = ({ rows = 5 }) => (
  <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
        <div className="pl-shimmer" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, animationDelay: `${i * 0.07}s` }} />
        <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="pl-shimmer" style={{ height: 11, width: '60%', borderRadius: 6, animationDelay: `${i * 0.07}s` }} />
          <div className="pl-shimmer" style={{ height: 9, width: '35%', borderRadius: 6, animationDelay: `${i * 0.07 + 0.05}s` }} />
        </div>
        <div className="pl-shimmer" style={{ flex: 1, height: 11, borderRadius: 6, animationDelay: `${i * 0.07 + 0.1}s` }} />
        <div className="pl-shimmer" style={{ width: 90, height: 20, borderRadius: 99, animationDelay: `${i * 0.07 + 0.15}s` }} />
        <div className="pl-shimmer" style={{ width: 120, height: 20, borderRadius: 99, animationDelay: `${i * 0.07 + 0.2}s` }} />
      </div>
    ))}
  </div>
);

const PLError = ({ onRetry, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div role="alert" style={{ padding: '52px 24px', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.errorDarkLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name="alertTriangle" size={24} color={T.errorDark} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
        {t('Không tải được dữ liệu', 'Failed to load data')}
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 16 }}>
        {t('Đã xảy ra lỗi khi tải danh sách. Vui lòng thử lại.', 'Something went wrong while loading. Please try again.')}
      </div>
      <Button size="sm" icon="refreshCw" onClick={onRetry}>{t('Thử lại', 'Retry')}</Button>
    </div>
  );
};

const PLEmpty = ({ filtered, onCreate, onReset, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div style={{ padding: '52px 24px', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.primaryLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name="link" size={24} color={T.primary} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
        {filtered
          ? t('Không có liên kết nào khớp bộ lọc', 'No links match your filters')
          : t('Lớp này chưa có liên kết nào', 'No links in this class yet')}
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}>
        {filtered
          ? t('Thử từ khóa khác hoặc xoá bộ lọc lớp.', 'Try a different keyword or clear the class filter.')
          : t('Tạo liên kết để phụ huynh có thể theo dõi điểm số, chuyên cần và hạnh kiểm của con.', 'Create a link so parents can follow their child’s grades, attendance and conduct.')}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={onReset} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Xoá bộ lọc', 'Clear filters')}
          </Button>
        )}
        <Button size="sm" icon="plus" onClick={onCreate}>{t('Tạo liên kết', 'Create link')}</Button>
      </div>
    </div>
  );
};

// ── Demo state chips (design review helper) ───────────────────────────────────
const PLStateChips = ({ state, setState, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const opts = [
    { id: 'ready',   label: t('Dữ liệu', 'Data') },
    { id: 'loading', label: t('Đang tải', 'Loading') },
    { id: 'error',   label: t('Lỗi', 'Error') },
  ];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {t('Demo trạng thái', 'State demo')}
      </span>
      <div style={{ display: 'inline-flex', gap: 4, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 3 }}>
        {opts.map(o => {
          const active = state === o.id;
          return (
            <button key={o.id} onClick={() => setState(o.id)} aria-pressed={active}
              style={{
                padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11, fontWeight: active ? 800 : 600,
                background: active ? T.card : 'transparent',
                color: active ? pColor : T.textMuted,
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
};

// ── PART 1: Admin screen ──────────────────────────────────────────────────────
const ParentLinksScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isMobile = usePLIsMobile();

  const [links, setLinks] = React.useState(PL_SEED_LINKS);
  const [status, setStatus] = React.useState('loading'); // loading | ready | error
  const [query, setQuery] = React.useState('');
  const [classFilter, setClassFilter] = React.useState('all');
  const [showCreate, setShowCreate] = React.useState(false);
  const [detailLink, setDetailLink] = React.useState(null);
  const [unlinkTarget, setUnlinkTarget] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const toastRef = React.useRef(null);

  React.useEffect(() => {
    const tid = window.setTimeout(() => setStatus(s => s === 'loading' ? 'ready' : s), 650);
    return () => window.clearTimeout(tid);
  }, []);

  const showToast = (text, icon, color) => {
    if (toastRef.current) window.clearTimeout(toastRef.current);
    setToast({ text, icon, color });
    toastRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  const setDemoState = (s) => {
    if (s === 'loading') { setStatus('loading'); window.setTimeout(() => setStatus('ready'), 1600); }
    else setStatus(s);
  };

  const retry = () => { setStatus('loading'); window.setTimeout(() => setStatus('ready'), 700); };

  const rows = links.map(l => ({
    ...l,
    student: PL_STUDENTS.find(s => s.id === l.studentId),
    parent: PL_PARENTS.find(p => p.id === l.parentId),
  }));

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(r =>
    (classFilter === 'all' || r.student.cls === classFilter) &&
    (!q || r.student.name.toLowerCase().includes(q) || r.parent.name.toLowerCase().includes(q))
  );
  const hasFilters = !!q || classFilter !== 'all';

  const createLink = ({ studentId, parentId, relation, note }) => {
    const st = PL_STUDENTS.find(s => s.id === studentId);
    const pa = PL_PARENTS.find(p => p.id === parentId);
    setLinks(ls => [{
      id: 'l' + Date.now(), studentId, parentId, relation, consent: 'pending',
      linkedAt: new Date().toLocaleDateString('vi-VN'), note,
    }, ...ls]);
    setShowCreate(false);
    showToast(t(`Đã tạo liên kết ${pa.name} → ${st.name}. Đã gửi yêu cầu xác nhận consent.`, `Linked ${pa.name} → ${st.name}. Consent request sent.`));
  };

  const confirmUnlink = () => {
    const pa = PL_PARENTS.find(p => p.id === unlinkTarget.parentId);
    setLinks(ls => ls.filter(l => l.id !== unlinkTarget.id));
    setUnlinkTarget(null);
    showToast(t(`Đã gỡ liên kết. ${pa.name} không còn quyền xem dữ liệu học sinh.`, `Link removed. ${pa.name} no longer has access.`), 'trash', T.error);
  };

  const thStyle = { textAlign: 'left', padding: '11px 20px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' };
  const tdStyle = { padding: '13px 20px', borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.textPrimary, verticalAlign: 'middle' };

  const PersonCell = ({ person, sub }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={person.avatar} color={person.color} size={34} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
        <div style={{ fontSize: 11.5, color: T.textMuted }}>{sub}</div>
      </div>
    </div>
  );

  return (
    <div data-screen-label="Admin · Liên kết Phụ huynh – Học sinh" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Liên kết Phụ huynh – Học sinh', 'Parent–Student Links')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {t('Quản lý liên kết tài khoản và trạng thái đồng ý nhận thông báo của phụ huynh.', 'Manage account links and parents’ notification-consent status.')}
            </div>
          </div>
          <PLStateChips state={status} setState={setDemoState} lang={lang} pColor={pColor} />
          <Button icon="plus" onClick={() => setShowCreate(true)}>{t('Tạo liên kết', 'Create link')}</Button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, maxWidth: 380,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: '8px 14px',
          }}>
            <Icon name="search" size={14} color={T.textMuted} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              aria-label={t('Tìm học sinh hoặc phụ huynh', 'Search student or parent')}
              placeholder={t('Tìm học sinh hoặc phụ huynh…', 'Search student or parent…')}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit' }} />
          </div>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            aria-label={t('Lọc theo lớp', 'Filter by class')}
            style={{
              padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, background: T.card,
              fontSize: 13, fontWeight: 600, color: T.textPrimary, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
            }}>
            <option value="all">{t('Tất cả các lớp', 'All classes')}</option>
            {PL_CLASSES.map(c => <option key={c} value={c}>{t(`Lớp ${c}`, `Class ${c}`)}</option>)}
          </select>
        </div>

        {/* Content card */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {status === 'loading' && <PLSkeleton />}
          {status === 'error' && <PLError onRetry={retry} lang={lang} />}
          {status === 'ready' && filtered.length === 0 && (
            <PLEmpty filtered={hasFilters} lang={lang}
              onCreate={() => setShowCreate(true)}
              onReset={() => { setQuery(''); setClassFilter('all'); }} />
          )}
          {status === 'ready' && filtered.length > 0 && !isMobile && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t('Học sinh', 'Student')}</th>
                    <th style={thStyle}>{t('Phụ huynh', 'Parent')}</th>
                    <th style={thStyle}>{t('Quan hệ', 'Relation')}</th>
                    <th style={thStyle}>{t('Trạng thái consent', 'Consent status')}</th>
                    <th style={thStyle}>{t('Ngày liên kết', 'Linked on')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('Hành động', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td style={tdStyle}><PersonCell person={r.student} sub={t(`Lớp ${r.student.cls}`, `Class ${r.student.cls}`)} /></td>
                      <td style={tdStyle}><PersonCell person={r.parent} sub={r.parent.phone} /></td>
                      <td style={tdStyle}><PLRelationBadge relation={r.relation} lang={lang} /></td>
                      <td style={tdStyle}><PLConsentBadge consent={r.consent} lang={lang} /></td>
                      <td style={{ ...tdStyle, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{r.linkedAt}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <PLRowMenu lang={lang}
                          onDetail={() => setDetailLink(r)}
                          onUnlink={() => setUnlinkTarget(r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {status === 'ready' && filtered.length > 0 && isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map(r => (
                <div key={r.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <PersonCell person={r.student} sub={t(`Lớp ${r.student.cls}`, `Class ${r.student.cls}`)} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10, color: T.textMuted }}>
                        <Icon name="link" size={12} color={T.textMuted} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{lang === 'en' ? PL_RELATIONS[r.relation].en : PL_RELATIONS[r.relation].vi}</span>
                      </div>
                      <PersonCell person={r.parent} sub={r.parent.phone} />
                    </div>
                    <PLRowMenu lang={lang}
                      onDetail={() => setDetailLink(r)}
                      onUnlink={() => setUnlinkTarget(r)} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <PLConsentBadge consent={r.consent} lang={lang} />
                    <span style={{ fontSize: 11.5, color: T.textMuted }}>{t('Liên kết ngày', 'Linked')} {r.linkedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {status === 'ready' && filtered.length > 0 && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 12 }}>
            {t(`${filtered.length} liên kết`, `${filtered.length} link${filtered.length > 1 ? 's' : ''}`)}
            {hasFilters ? t(' (đã lọc)', ' (filtered)') : ''}
          </div>
        )}
      </div>

      {showCreate && <PLCreateDialog links={links} onClose={() => setShowCreate(false)} onCreate={createLink} lang={lang} pColor={pColor} />}
      {detailLink && <PLDetailDialog link={detailLink} onClose={() => setDetailLink(null)} lang={lang} />}
      {unlinkTarget && <PLUnlinkDialog link={unlinkTarget} onClose={() => setUnlinkTarget(null)} onConfirm={confirmUnlink} lang={lang} />}
      <PLToast toast={toast} />

      <style>{`
        .pl-shimmer {
          background: linear-gradient(90deg, ${T.border}66 25%, ${T.border}CC 50%, ${T.border}66 75%);
          background-size: 200% 100%;
          animation: pl-shimmer 1.4s ease infinite;
        }
        @keyframes pl-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pl-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ── PART 2: Parent consent section ────────────────────────────────────────────
const PL_CONSENT_TOGGLES = [
  {
    id: 'discipline', icon: 'shield',
    vi: 'Thông báo vi phạm / hạnh kiểm', en: 'Discipline & conduct alerts',
    descVi: 'Gửi khi con có ghi nhận vi phạm mới hoặc thay đổi xếp loại hạnh kiểm.',
    descEn: 'Sent when a new incident is recorded or the conduct rating changes.',
  },
  {
    id: 'absence', icon: 'calendarX',
    vi: 'Thông báo vắng học', en: 'Absence alerts',
    descVi: 'Gửi khi con vắng mặt ở tiết học có điểm danh, kèm lý do nếu có.',
    descEn: 'Sent when your child is absent from a roll-call lesson, with the reason if recorded.',
  },
  {
    id: 'grades', icon: 'award',
    vi: 'Thông báo điểm số', en: 'Grade alerts',
    descVi: 'Gửi khi có điểm kiểm tra, điểm thi mới của con được công bố.',
    descEn: 'Sent when new test or exam grades for your child are published.',
  },
];

const PL_MY_CHILDREN = [
  { id: 'st1', name: 'Nguyễn Minh Khoa',   cls: '11A2', avatar: 'NK', color: T.primary, consents: { discipline: true,  absence: true,  grades: true  } },
  { id: 'st2', name: 'Nguyễn Thị Lan Anh', cls: '8B1',  avatar: 'LA', color: T.purple,  consents: { discipline: false, absence: true,  grades: false } },
];

const PLSwitch = ({ checked, onChange, labelId, descId, pColor }) => (
  <button role="switch" aria-checked={checked} aria-labelledby={labelId} aria-describedby={descId}
    onClick={() => onChange(!checked)}
    style={{
      width: 42, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
      background: checked ? pColor : T.border, position: 'relative', flexShrink: 0,
      transition: 'background 0.18s', padding: 0,
    }}>
    <span aria-hidden="true" style={{
      position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18,
      borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      transition: 'left 0.18s ease',
    }} />
  </button>
);

const PLChildConsentCard = ({ child, onToggle, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <Avatar initials={child.avatar} color={child.color} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{child.name}</div>
          <div style={{ fontSize: 11.5, color: T.textMuted }}>{t(`Lớp ${child.cls} · THPT Nguyễn Du`, `Class ${child.cls} · Nguyen Du HS`)}</div>
        </div>
        <Badge color={child.color}>{t('Đã liên kết', 'Linked')}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {PL_CONSENT_TOGGLES.map((tg, i) => {
          const labelId = `pl-tg-${child.id}-${tg.id}`;
          const descId = labelId + '-desc';
          const on = child.consents[tg.id];
          return (
            <div key={tg.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
              borderBottom: i < PL_CONSENT_TOGGLES.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: (on ? pColor : T.textMuted) + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={tg.icon} size={16} color={on ? pColor : T.textMuted} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div id={labelId} style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{t(tg.vi, tg.en)}</div>
                <div id={descId} style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, lineHeight: 1.45 }}>{t(tg.descVi, tg.descEn)}</div>
              </div>
              <span aria-hidden="true" style={{ fontSize: 11, fontWeight: 700, color: on ? pColor : T.textMuted, width: 32, textAlign: 'right', flexShrink: 0 }}>
                {on ? t('Bật', 'On') : t('Tắt', 'Off')}
              </span>
              <PLSwitch checked={on} onChange={() => onToggle(child.id, tg.id)} labelId={labelId} descId={descId} pColor={pColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PLConsentSkeleton = () => (
  <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {[0, 1].map(i => (
      <div key={i} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pl-shimmer" style={{ width: 38, height: 38, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="pl-shimmer" style={{ height: 12, width: '40%', borderRadius: 6 }} />
            <div className="pl-shimmer" style={{ height: 9, width: '25%', borderRadius: 6 }} />
          </div>
        </div>
        {[0, 1, 2].map(j => (
          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="pl-shimmer" style={{ width: 34, height: 34, borderRadius: 9, animationDelay: `${j * 0.08}s` }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div className="pl-shimmer" style={{ height: 10, width: '55%', borderRadius: 6, animationDelay: `${j * 0.08}s` }} />
              <div className="pl-shimmer" style={{ height: 8, width: '75%', borderRadius: 6, animationDelay: `${j * 0.08 + 0.05}s` }} />
            </div>
            <div className="pl-shimmer" style={{ width: 42, height: 24, borderRadius: 99, animationDelay: `${j * 0.08 + 0.1}s` }} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Card section — designed to be embedded in the parent profile/settings screen.
const ParentConsentSection = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [children, setChildren] = React.useState(PL_MY_CHILDREN);
  const [status, setStatus] = React.useState('loading');
  const [toast, setToast] = React.useState(null);
  const toastRef = React.useRef(null);

  React.useEffect(() => {
    const tid = window.setTimeout(() => setStatus(s => s === 'loading' ? 'ready' : s), 600);
    return () => window.clearTimeout(tid);
  }, []);

  const setDemoState = (s) => {
    if (s === 'loading') { setStatus('loading'); window.setTimeout(() => setStatus('ready'), 1600); }
    else setStatus(s);
  };

  const onToggle = (childId, key) => {
    setChildren(cs => cs.map(c => c.id === childId ? { ...c, consents: { ...c.consents, [key]: !c.consents[key] } } : c));
    if (toastRef.current) window.clearTimeout(toastRef.current);
    setToast({ text: t('Đã cập nhật quyền nhận thông báo', 'Notification consent updated') });
    toastRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <Card style={{ padding: 0, overflow: 'visible' }} data-screen-label="Parent · Quyền nhận thông báo về con">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '18px 22px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: pColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="bell" size={18} color={pColor} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
            {t('Quyền nhận thông báo về con', 'Notification consent for your children')}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            {t('Chọn loại thông tin bạn muốn nhà trường gửi cho từng con.', 'Choose what the school may send you about each child.')}
          </div>
        </div>
        <PLStateChips state={status} setState={setDemoState} lang={lang} pColor={pColor} />
      </div>

      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {status === 'loading' && <PLConsentSkeleton />}
        {status === 'error' && (
          <PLError lang={lang} onRetry={() => { setStatus('loading'); window.setTimeout(() => setStatus('ready'), 700); }} />
        )}
        {status === 'ready' && children.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.primaryLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name="users" size={22} color={T.primary} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
              {t('Chưa có con nào được liên kết', 'No linked children yet')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, maxWidth: 360, margin: '0 auto' }}>
              {t('Liên hệ nhà trường để liên kết tài khoản của bạn với hồ sơ học sinh.', 'Contact the school to link your account with a student record.')}
            </div>
          </div>
        )}
        {status === 'ready' && children.map(child => (
          <PLChildConsentCard key={child.id} child={child} onToggle={onToggle} lang={lang} pColor={pColor} />
        ))}
      </div>

      {status === 'ready' && children.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '14px 22px 18px', borderTop: `1px solid ${T.border}` }}>
          <Icon name="lockClosed" size={13} color={T.textMuted} strokeWidth={1.8} />
          <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.55 }}>
            {t(
              'Nhà trường chỉ gửi thông báo khi bạn đồng ý, và chỉ về những học sinh đã được liên kết với tài khoản của bạn. Bạn có thể thay đổi lựa chọn bất cứ lúc nào — việc tắt thông báo không ảnh hưởng đến quyền xem dữ liệu của con trong ứng dụng.',
              'The school only sends notifications with your consent, and only about students linked to your account. You can change these choices at any time — turning notifications off does not affect your in-app access to your child’s data.'
            )}
          </div>
        </div>
      )}

      <PLToast toast={toast} />
      <style>{`
        .pl-shimmer {
          background: linear-gradient(90deg, ${T.border}66 25%, ${T.border}CC 50%, ${T.border}66 75%);
          background-size: 200% 100%;
          animation: pl-shimmer 1.4s ease infinite;
        }
        @keyframes pl-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pl-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Card>
  );
};

// Standalone route wrapper for the parent role (section: 'consent').
const ParentConsentScreen = ({ lang, primaryColor }) => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <ParentConsentSection lang={lang} primaryColor={primaryColor} />
    </div>
  </div>
);

Object.assign(window, { ParentLinksScreen, ParentConsentSection, ParentConsentScreen });
