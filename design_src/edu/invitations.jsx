// ── P4: Tenant Invitations & Accept Onboarding ────────────────────────────────
// Screen 1: InvitationsScreen  — admin surface (/admin/invitations, principal)
// Screen 2: InviteAcceptScreen — public accept page (/invitations/accept?token=…)

// ── Invite roles (badge colors follow ROLE_META from login.jsx) ───────────────
const INV_ROLES = {
  teacher: { vi: 'Giáo viên', en: 'Teacher', icon: 'userCheck', color: '#5D87FF', appRole: 'teacher' },
  student: { vi: 'Học sinh',  en: 'Student', icon: 'bookOpen',  color: '#FFAE1F', appRole: 'student' },
  parent:  { vi: 'Phụ huynh', en: 'Parent',  icon: 'users',     color: '#7B5EA7', appRole: 'parent' },
  manager: { vi: 'BGH',       en: 'Board',   icon: 'school',    color: '#13DEB9', appRole: 'principal' },
  admin:   { vi: 'Admin',     en: 'Admin',   icon: 'settings2', color: '#FA896B', appRole: 'principal' },
};

const INV_STATUS = {
  pending:  { vi: 'Chờ chấp nhận', en: 'Pending',  icon: 'clock', color: T.warningText },
  accepted: { vi: 'Đã chấp nhận',  en: 'Accepted', icon: 'check', color: T.teal },
  expired:  { vi: 'Hết hạn',       en: 'Expired',  icon: 'calendarX', color: T.textMuted },
  revoked:  { vi: 'Đã thu hồi',    en: 'Revoked',  icon: 'x', color: T.errorDark },
};

// 6 invites across all 4 states (daysLeft only meaningful for pending).
const INV_SEED = [
  { id: 'inv1', email: 'lan.pham@email.com',        role: 'teacher', invitedBy: 'Trần Minh Quân',   sentAt: '05/07/2026', expiresAt: '19/07/2026', daysLeft: 8, status: 'pending' },
  { id: 'inv2', email: 'hoang.long@student.edu.vn', role: 'student', invitedBy: 'Nguyễn Thị Hương', sentAt: '27/06/2026', expiresAt: '13/07/2026', daysLeft: 2, status: 'pending' },
  { id: 'inv3', email: 'thu.trang@email.com',       role: 'parent',  invitedBy: 'Trần Minh Quân',   sentAt: '20/06/2026', expiresAt: '04/07/2026', daysLeft: 0, status: 'accepted' },
  { id: 'inv4', email: 'van.minh@email.com',        role: 'teacher', invitedBy: 'Trần Minh Quân',   sentAt: '01/06/2026', expiresAt: '15/06/2026', daysLeft: 0, status: 'expired' },
  { id: 'inv5', email: 'quoc.huy@email.com',        role: 'manager', invitedBy: 'Trần Minh Quân',   sentAt: '12/06/2026', expiresAt: '26/06/2026', daysLeft: 0, status: 'revoked' },
  { id: 'inv6', email: 'gia.han@student.edu.vn',    role: 'student', invitedBy: 'Nguyễn Thị Hương', sentAt: '08/06/2026', expiresAt: '22/06/2026', daysLeft: 0, status: 'expired' },
];

const INV_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── Small shared bits (file-scoped) ───────────────────────────────────────────
const INVRoleBadge = ({ role, lang, size = 'sm' }) => {
  const m = INV_ROLES[role];
  const big = size === 'lg';
  return (
    <Badge color={m.color} style={big ? { fontSize: 13, padding: '6px 16px', gap: 7 } : undefined}>
      <Icon name={m.icon} size={big ? 15 : 11} color={m.color} strokeWidth={2} />
      {lang === 'en' ? m.en : m.vi}
    </Badge>
  );
};

const INVStatusBadge = ({ status, lang }) => {
  const m = INV_STATUS[status];
  return (
    <Badge color={m.color}>
      <Icon name={m.icon} size={11} color={m.color} strokeWidth={2.4} />
      {lang === 'en' ? m.en : m.vi}
    </Badge>
  );
};

const INVToast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div role="status" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9500,
      display: 'flex', alignItems: 'center', gap: 10,
      background: T.textPrimary, color: '#fff', borderRadius: 12,
      padding: '12px 18px', boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
      animation: 'inv-toast-in 0.22s ease-out', maxWidth: 380,
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

const INVModal = ({ onClose, labelledBy, maxWidth = 470, children }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    if (el) { const f = el.querySelector('input, button, textarea, select'); if (f) f.focus(); }
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll('button:not([disabled]), input, textarea, select');
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

const useINVIsMobile = () => {
  const [mobile, setMobile] = React.useState(() => window.innerWidth < 820);
  React.useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 820);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

// ── Email chip input ──────────────────────────────────────────────────────────
const INVEmailChips = ({ chips, setChips, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [text, setText] = React.useState('');
  const inputRef = React.useRef(null);
  const hasInvalid = chips.some(c => !c.valid);
  const errId = 'inv-email-err';

  const commit = (raw) => {
    const parts = raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setChips(cs => {
      const existing = new Set(cs.map(c => c.email.toLowerCase()));
      const added = parts
        .filter(p => !existing.has(p.toLowerCase()))
        .map(p => ({ email: p, valid: INV_EMAIL_RE.test(p) }));
      return [...cs, ...added];
    });
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      if (text.trim()) { e.preventDefault(); commit(text); }
      else if (e.key !== ' ') e.preventDefault();
    } else if (e.key === 'Backspace' && !text && chips.length) {
      setChips(cs => cs.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor="inv-emails" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
        {t('Email người được mời', 'Invitee emails')}
      </label>
      <div onClick={() => inputRef.current && inputRef.current.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          padding: '8px 10px', borderRadius: 9, cursor: 'text',
          border: `1.5px solid ${hasInvalid ? T.errorDark : T.border}`, background: T.bg, minHeight: 44,
        }}>
        {chips.map((c, i) => (
          <span key={c.email + i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 6px 3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: c.valid ? pColor + '14' : T.errorDarkLight,
            color: c.valid ? pColor : T.errorDark,
            border: `1px solid ${c.valid ? pColor + '33' : T.errorDark + '55'}`,
          }}>
            {!c.valid && <Icon name="alertTriangle" size={10} color={T.errorDark} strokeWidth={2.4} />}
            {c.email}
            <button onClick={(e) => { e.stopPropagation(); setChips(cs => cs.filter((_, j) => j !== i)); }}
              aria-label={t(`Xóa email ${c.email}`, `Remove email ${c.email}`)}
              style={{
                width: 16, height: 16, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                background: (c.valid ? pColor : T.errorDark) + '22',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Icon name="x" size={9} color={c.valid ? pColor : T.errorDark} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        <input ref={inputRef} id="inv-emails" type="text" value={text}
          aria-invalid={hasInvalid} aria-describedby={hasInvalid ? errId : undefined}
          onChange={e => setText(e.target.value)} onKeyDown={onKeyDown}
          onBlur={() => text.trim() && commit(text)}
          placeholder={chips.length ? '' : t('ten@truong.edu.vn, nhấn Enter để thêm…', 'name@school.edu.vn, press Enter to add…')}
          style={{ flex: 1, minWidth: 140, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.textPrimary, fontFamily: 'inherit', padding: '4px 2px' }} />
      </div>
      {hasInvalid ? (
        <div id={errId} role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 700, color: T.errorDark }}>
          <Icon name="alertTriangle" size={12} color={T.errorDark} strokeWidth={2.2} />
          {t('Một số email không đúng định dạng — xóa hoặc sửa trước khi gửi.', 'Some emails are invalid — remove or fix them before sending.')}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
          {t('Có thể dán nhiều email, phân tách bằng dấu phẩy hoặc khoảng trắng.', 'Paste multiple emails separated by commas or spaces.')}
        </div>
      )}
    </div>
  );
};

// ── Send invitation dialog ────────────────────────────────────────────────────
const INVSendDialog = ({ onClose, onSend, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [chips, setChips] = React.useState([]);
  const [role, setRole] = React.useState('teacher');
  const [expiry, setExpiry] = React.useState('14');
  const valid = chips.length > 0 && chips.every(c => c.valid);

  return (
    <INVModal onClose={onClose} labelledBy="inv-send-title" maxWidth={480}>
      <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="send" size={15} color={pColor} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="inv-send-title" style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Gửi lời mời tham gia', 'Send invitations')}</div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
            {t('Người nhận sẽ nhận email kèm link tham gia THPT Nguyễn Du.', 'Recipients get an email with a link to join Nguyen Du HS.')}
          </div>
        </div>
        <button onClick={onClose} aria-label={t('Đóng', 'Close')}
          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: T.bg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="x" size={13} color={T.textMuted} />
        </button>
      </div>

      <div style={{ overflowY: 'auto', padding: '16px 22px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <INVEmailChips chips={chips} setChips={setChips} lang={lang} pColor={pColor} />

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>{t('Vai trò được mời', 'Invited role')}</div>
          <div role="radiogroup" aria-label={t('Vai trò được mời', 'Invited role')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(INV_ROLES).map(([id, m]) => {
              const active = role === id;
              return (
                <button key={id} role="radio" aria-checked={active} onClick={() => setRole(id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99,
                    border: `1.5px solid ${active ? m.color : T.border}`, cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? m.color + '14' : 'transparent',
                    color: active ? m.color : T.textSecondary, fontSize: 12.5, fontWeight: active ? 800 : 600,
                    transition: 'all 0.13s',
                  }}>
                  <Icon name={m.icon} size={13} color={active ? m.color : T.textMuted} strokeWidth={2} />
                  {t(m.vi, m.en)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="inv-expiry" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
            {t('Thời hạn lời mời', 'Invitation validity')}
          </label>
          <select id="inv-expiry" value={expiry} onChange={e => setExpiry(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${T.border}`,
              background: T.bg, fontSize: 13, color: T.textPrimary, fontFamily: 'inherit', outline: 'none',
            }}>
            <option value="7">{t('7 ngày', '7 days')}</option>
            <option value="14">{t('14 ngày', '14 days')}</option>
            <option value="30">{t('30 ngày', '30 days')}</option>
          </select>
        </div>
      </div>

      <div style={{ padding: '12px 22px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
        <Button variant="ghost" size="sm" onClick={onClose} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
          {t('Hủy', 'Cancel')}
        </Button>
        <Button size="sm" icon="send" disabled={!valid}
          onClick={() => valid && onSend({ emails: chips.map(c => c.email), role, expiryDays: Number(expiry) })}>
          {chips.length > 1 ? t(`Gửi ${chips.length} lời mời`, `Send ${chips.length} invites`) : t('Gửi lời mời', 'Send invite')}
        </Button>
      </div>
    </INVModal>
  );
};

// ── Revoke confirm ────────────────────────────────────────────────────────────
const INVRevokeDialog = ({ invite, onClose, onConfirm, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <INVModal onClose={onClose} labelledBy="inv-revoke-title" maxWidth={420}>
      <div style={{ padding: '20px 22px 16px', display: 'flex', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.errorDarkLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="alertTriangle" size={17} color={T.errorDark} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="inv-revoke-title" style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
            {t('Thu hồi lời mời?', 'Revoke this invitation?')}
          </div>
          <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
            {t(
              <>Link mời gửi tới <strong>{invite.email}</strong> sẽ vô hiệu ngay lập tức. Người nhận không thể dùng lời mời này để tham gia trường; bạn có thể gửi lời mời mới bất cứ lúc nào.</>,
              <>The link sent to <strong>{invite.email}</strong> becomes invalid immediately. The recipient can no longer join with this invite; you can always send a new one.</>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 22px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, background: T.bg }}>
        <Button variant="ghost" size="sm" onClick={onClose} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
          {t('Hủy', 'Cancel')}
        </Button>
        <Button variant="danger" size="sm" icon="x" onClick={onConfirm}>
          {t('Thu hồi lời mời', 'Revoke invite')}
        </Button>
      </div>
    </INVModal>
  );
};

// ── Expiry cell — countdown not by color alone ────────────────────────────────
const INVExpiryCell = ({ invite, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  if (invite.status === 'accepted') {
    return <span style={{ fontSize: 12.5, color: T.textMuted }}>—</span>;
  }
  if (invite.status === 'revoked') {
    return <span style={{ fontSize: 12.5, color: T.textMuted }}>—</span>;
  }
  if (invite.status === 'expired') {
    return (
      <span style={{ fontSize: 12.5, color: T.textMuted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <Icon name="calendarX" size={12} color={T.textMuted} />
        {t(`Hết hạn ${invite.expiresAt}`, `Expired ${invite.expiresAt}`)}
      </span>
    );
  }
  const soon = invite.daysLeft < 3;
  const color = soon ? T.warningText : T.textSecondary;
  return (
    <span style={{ fontSize: 12.5, fontWeight: soon ? 800 : 500, color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {soon && <Icon name="alertTriangle" size={12} color={color} strokeWidth={2.2} />}
      {t(`Còn ${invite.daysLeft} ngày`, `${invite.daysLeft} day${invite.daysLeft > 1 ? 's' : ''} left`)}
      <span style={{ fontWeight: 500, color: T.textMuted }}>· {invite.expiresAt}</span>
    </span>
  );
};

// ── Row actions ───────────────────────────────────────────────────────────────
const INVActionBtn = ({ icon, label, danger, onClick }) => {
  const [hov, setHov] = React.useState(false);
  const c = danger ? T.errorDark : T.textSecondary;
  return (
    <button onClick={onClick} title={label} aria-label={label}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
        border: `1px solid ${hov ? c + '66' : T.border}`,
        background: hov ? (danger ? T.errorDarkLight : T.bg) : T.card,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.13s',
      }}>
      <Icon name={icon} size={14} color={c} strokeWidth={2} />
    </button>
  );
};

const INVRowActions = ({ invite, onCopy, onResend, onRevoke, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div style={{ display: 'inline-flex', gap: 6 }}>
      {(invite.status === 'pending') && (
        <INVActionBtn icon="copy" label={t('Copy link mời', 'Copy invite link')} onClick={onCopy} />
      )}
      {invite.status === 'expired' && (
        <INVActionBtn icon="refreshCw" label={t('Gửi lại lời mời', 'Resend invite')} onClick={onResend} />
      )}
      {invite.status === 'pending' && (
        <INVActionBtn icon="x" label={t('Thu hồi lời mời', 'Revoke invite')} danger onClick={onRevoke} />
      )}
      {(invite.status === 'accepted' || invite.status === 'revoked') && (
        <span style={{ fontSize: 12, color: T.textMuted }}>—</span>
      )}
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────
const INVEmpty = ({ filtered, onCreate, onReset, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div style={{ padding: '52px 24px', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.primaryLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name="send" size={22} color={T.primary} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
        {filtered ? t('Không có lời mời nào khớp bộ lọc', 'No invites match your filters') : t('Chưa có lời mời nào', 'No invitations yet')}
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, maxWidth: 380, margin: '0 auto 16px' }}>
        {filtered
          ? t('Thử từ khóa khác hoặc chuyển tab trạng thái.', 'Try a different keyword or status tab.')
          : t('Mời giáo viên, học sinh và phụ huynh tham gia trường bằng email — họ sẽ nhận link kích hoạt tài khoản.', 'Invite teachers, students and parents by email — they receive an activation link.')}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={onReset} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Xoá bộ lọc', 'Clear filters')}
          </Button>
        )}
        <Button size="sm" icon="send" onClick={onCreate}>{t('Gửi lời mời', 'Send invite')}</Button>
      </div>
    </div>
  );
};

// ── SCREEN 1: Admin invitations ───────────────────────────────────────────────
const InvitationsScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isMobile = useINVIsMobile();

  const [invites, setInvites] = React.useState(INV_SEED);
  const [tab, setTab] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [showSend, setShowSend] = React.useState(false);
  const [revokeTarget, setRevokeTarget] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const toastRef = React.useRef(null);
  // Loading / error state — bộ chuẩn states.jsx (pattern failedOnce như reports.jsx)
  const [status, setStatus] = React.useState('loading'); // loading | error | ready
  const failedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setStatus('ready'), 650);
    return () => window.clearTimeout(id);
  }, []);

  // Làm mới — lần đầu mô phỏng lỗi để review EduError, retry sẽ thành công
  const refresh = () => {
    setStatus('loading');
    window.setTimeout(() => {
      if (!failedOnce.current) { failedOnce.current = true; setStatus('error'); }
      else setStatus('ready');
    }, 650);
  };

  const showToast = (text, icon, color) => {
    if (toastRef.current) window.clearTimeout(toastRef.current);
    setToast({ text, icon, color });
    toastRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  const counts = invites.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});
  const TABS = [
    { id: 'all',      label: t('Tất cả', 'All'), count: invites.length },
    { id: 'pending',  label: t('Chờ chấp nhận', 'Pending'),  count: counts.pending || 0 },
    { id: 'accepted', label: t('Đã chấp nhận', 'Accepted'),  count: counts.accepted || 0 },
    { id: 'expired',  label: t('Hết hạn', 'Expired'),        count: counts.expired || 0 },
    { id: 'revoked',  label: t('Đã thu hồi', 'Revoked'),     count: counts.revoked || 0 },
  ];

  const q = query.trim().toLowerCase();
  const filtered = invites.filter(i =>
    (tab === 'all' || i.status === tab) && (!q || i.email.toLowerCase().includes(q))
  );
  const hasFilters = !!q || tab !== 'all';

  const today = new Date();
  const fmtDate = (d) => d.toLocaleDateString('vi-VN');
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  const sendInvites = ({ emails, role, expiryDays }) => {
    const now = Date.now();
    setInvites(list => [
      ...emails.map((email, i) => ({
        id: 'inv' + (now + i), email, role,
        invitedBy: 'Trần Minh Quân',
        sentAt: fmtDate(today), expiresAt: fmtDate(addDays(expiryDays)),
        daysLeft: expiryDays, status: 'pending',
      })),
      ...list,
    ]);
    setShowSend(false);
    showToast(emails.length > 1
      ? t(`Đã gửi ${emails.length} lời mời (${lang === 'en' ? INV_ROLES[role].en : INV_ROLES[role].vi})`, `Sent ${emails.length} invites`)
      : t(`Đã gửi lời mời tới ${emails[0]}`, `Invite sent to ${emails[0]}`));
  };

  const copyLink = (invite) => {
    const url = `https://eduportal.vn/invitations/accept?token=${invite.id}-x7f2`;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).catch(() => {});
    showToast(t('Đã sao chép link mời', 'Invite link copied'), 'copy');
  };

  const resend = (invite) => {
    setInvites(list => list.map(i => i.id === invite.id
      ? { ...i, status: 'pending', sentAt: fmtDate(today), expiresAt: fmtDate(addDays(14)), daysLeft: 14 }
      : i));
    showToast(t(`Đã gửi lại lời mời tới ${invite.email}`, `Invite resent to ${invite.email}`), 'refreshCw');
  };

  const confirmRevoke = () => {
    setInvites(list => list.map(i => i.id === revokeTarget.id ? { ...i, status: 'revoked' } : i));
    showToast(t(`Đã thu hồi lời mời của ${revokeTarget.email}`, `Invite for ${revokeTarget.email} revoked`), 'x', T.error);
    setRevokeTarget(null);
  };

  const thStyle = { textAlign: 'left', padding: '11px 20px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' };
  const tdStyle = { padding: '13px 20px', borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.textPrimary, verticalAlign: 'middle' };

  return (
    <div data-screen-label="Admin · Mời thành viên" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Mời thành viên', 'Invitations')}</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {t('Gửi và quản lý lời mời tham gia THPT Nguyễn Du theo email.', 'Send and manage email invitations to join Nguyen Du HS.')}
            </div>
          </div>
          <Button variant="secondary" icon="refreshCw" onClick={refresh}>{t('Làm mới', 'Refresh')}</Button>
          <Button icon="send" onClick={() => setShowSend(true)}>{t('Gửi lời mời', 'Send invite')}</Button>
        </div>

        {/* Tabs + search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <div role="tablist" aria-label={t('Lọc theo trạng thái', 'Filter by status')}
            style={{ display: 'inline-flex', gap: 4, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
            {TABS.map(tb => {
              const active = tab === tb.id;
              return (
                <button key={tb.id} role="tab" aria-selected={active} onClick={() => setTab(tb.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
                    fontWeight: active ? 800 : 600,
                    background: active ? pColor + '14' : 'transparent',
                    color: active ? pColor : T.textSecondary, transition: 'all 0.13s',
                  }}>
                  {tb.label}
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, minWidth: 16,
                    background: active ? pColor + '22' : T.bg, color: active ? pColor : T.textMuted,
                  }}>{tb.count}</span>
                </button>
              );
            })}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, maxWidth: 320,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: '8px 14px',
          }}>
            <Icon name="search" size={14} color={T.textMuted} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              aria-label={t('Tìm theo email', 'Search by email')}
              placeholder={t('Tìm theo email…', 'Search by email…')}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit' }} />
          </div>
        </div>

        {status === 'loading' && <EduSkeleton variant="rows" count={5} lang={lang} />}
        {status === 'error' && (
          <EduError lang={lang} onRetry={refresh}
            title={t('Không tải được danh sách lời mời', 'Could not load invitations')}
            desc={t('Đã xảy ra lỗi khi kết nối. Vui lòng thử lại.', 'Something went wrong while connecting. Please try again.')} />
        )}
        {status === 'ready' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 && (
            <INVEmpty filtered={hasFilters} lang={lang}
              onCreate={() => setShowSend(true)}
              onReset={() => { setQuery(''); setTab('all'); }} />
          )}
          {filtered.length > 0 && !isMobile && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>{t('Vai trò', 'Role')}</th>
                    <th style={thStyle}>{t('Người mời', 'Invited by')}</th>
                    <th style={thStyle}>{t('Ngày gửi', 'Sent')}</th>
                    <th style={thStyle}>{t('Hết hạn', 'Expires')}</th>
                    <th style={thStyle}>{t('Trạng thái', 'Status')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('Hành động', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} style={{ opacity: inv.status === 'revoked' ? 0.65 : 1 }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{inv.email}</td>
                      <td style={tdStyle}><INVRoleBadge role={inv.role} lang={lang} /></td>
                      <td style={{ ...tdStyle, color: T.textSecondary }}>{inv.invitedBy}</td>
                      <td style={{ ...tdStyle, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{inv.sentAt}</td>
                      <td style={tdStyle}><INVExpiryCell invite={inv} lang={lang} /></td>
                      <td style={tdStyle}><INVStatusBadge status={inv.status} lang={lang} /></td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <INVRowActions invite={inv} lang={lang}
                          onCopy={() => copyLink(inv)} onResend={() => resend(inv)} onRevoke={() => setRevokeTarget(inv)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map(inv => (
                <div key={inv.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, opacity: inv.status === 'revoked' ? 0.65 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary, wordBreak: 'break-all' }}>{inv.email}</div>
                      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
                        {t('Mời bởi', 'Invited by')} {inv.invitedBy} · {inv.sentAt}
                      </div>
                    </div>
                    <INVRowActions invite={inv} lang={lang}
                      onCopy={() => copyLink(inv)} onResend={() => resend(inv)} onRevoke={() => setRevokeTarget(inv)} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <INVRoleBadge role={inv.role} lang={lang} />
                    <INVStatusBadge status={inv.status} lang={lang} />
                    <INVExpiryCell invite={inv} lang={lang} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        )}

        {status === 'ready' && filtered.length > 0 && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 12 }}>
            {t(`${filtered.length} lời mời`, `${filtered.length} invite${filtered.length > 1 ? 's' : ''}`)}
            {hasFilters ? t(' (đã lọc)', ' (filtered)') : ''}
          </div>
        )}
      </div>

      {showSend && <INVSendDialog onClose={() => setShowSend(false)} onSend={sendInvites} lang={lang} pColor={pColor} />}
      {revokeTarget && <INVRevokeDialog invite={revokeTarget} onClose={() => setRevokeTarget(null)} onConfirm={confirmRevoke} lang={lang} />}
      <INVToast toast={toast} />
      <style>{`@keyframes inv-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

// ── SCREEN 2: Accept onboarding (public) ──────────────────────────────────────
const INV_ACCEPT_INVITE = {
  email: 'lan.pham@email.com', role: 'teacher',
  invitedBy: 'Trần Minh Quân', invitedByTitle: { vi: 'Hiệu trưởng', en: 'Principal' },
  school: 'THPT Nguyễn Du', schoolEn: 'Nguyen Du High School',
  daysLeft: 8, expiresAt: '19/07/2026',
};

const INV_TOKEN_STATES = [
  { id: 'valid',   vi: 'Hợp lệ',        en: 'Valid' },
  { id: 'expired', vi: 'Hết hạn',       en: 'Expired' },
  { id: 'used',    vi: 'Đã dùng',       en: 'Used' },
  { id: 'invalid', vi: 'Không hợp lệ',  en: 'Invalid' },
];

const INVDemoChips = ({ label, options, value, onChange, pColor }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <div style={{ display: 'inline-flex', gap: 3, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 3 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} aria-pressed={active}
            style={{
              padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 10.5, fontWeight: active ? 800 : 600,
              background: active ? T.card : 'transparent', color: active ? pColor : T.textMuted,
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>{o.label}</button>
        );
      })}
    </div>
  </div>
);

const INVTokenError = ({ kind, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const meta = {
    expired: {
      icon: 'clock', color: T.warningText, bg: T.warningLight,
      title: t('Lời mời đã hết hạn', 'This invitation has expired'),
      body: t('Link mời chỉ có hiệu lực trong thời hạn được cấp. Vui lòng liên hệ nhà trường (văn phòng THPT Nguyễn Du) để được gửi lời mời mới.', 'Invite links are only valid for a limited time. Please contact the school office to receive a new invitation.'),
    },
    used: {
      icon: 'userCheck', color: T.teal, bg: T.tealLight,
      title: t('Lời mời đã được sử dụng', 'This invitation was already used'),
      body: t('Tài khoản cho lời mời này đã được kích hoạt trước đó. Nếu đó là bạn, hãy đăng nhập bằng email được mời; nếu không, liên hệ nhà trường để kiểm tra.', 'An account was already activated with this invite. If that was you, just sign in with the invited email; otherwise contact the school.'),
    },
    invalid: {
      icon: 'alertTriangle', color: T.errorDark, bg: T.errorDarkLight,
      title: t('Liên kết không hợp lệ', 'This link is not valid'),
      body: t('Link mời bị thiếu hoặc sai token. Hãy mở lại đúng đường link trong email mời, hoặc yêu cầu nhà trường gửi lại lời mời.', 'The invite token is missing or malformed. Re-open the exact link from your invitation email, or ask the school to resend it.'),
    },
  }[kind];
  return (
    <div role="alert" style={{ textAlign: 'center', padding: '8px 4px 4px' }}>
      <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 18px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: meta.bg }} />
        <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: T.card, border: `1.5px dashed ${meta.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={meta.icon} size={32} color={meta.color} strokeWidth={1.8} />
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, marginBottom: 8 }}>{meta.title}</div>
      <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.65, maxWidth: 360, margin: '0 auto 20px' }}>{meta.body}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.textMuted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: '8px 14px' }}>
        <Icon name="message" size={13} color={T.textMuted} />
        {t('Văn phòng trường: (028) 3822 1234 · vp@nguyendu.edu.vn', 'School office: (028) 3822 1234 · vp@nguyendu.edu.vn')}
      </div>
    </div>
  );
};

const InviteAcceptScreen = ({ lang, primaryColor, onEnterApp }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const inv = INV_ACCEPT_INVITE;
  const roleMeta = INV_ROLES[inv.role];

  const [tokenState, setTokenState] = React.useState('valid');   // valid | expired | used | invalid
  const [userState, setUserState] = React.useState('guest');     // guest | signedin
  const [done, setDone] = React.useState(false);
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const join = () => {
    setSubmitting(true);
    window.setTimeout(() => { setSubmitting(false); setDone(true); }, 700);
  };

  const submitSignup = () => {
    const errs = {};
    if (!name.trim()) errs.name = t('Vui lòng nhập họ tên.', 'Please enter your full name.');
    if (password.length < 6) errs.password = t('Mật khẩu tối thiểu 6 ký tự.', 'Password must be at least 6 characters.');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    join();
  };

  const inputStyle = (invalid) => ({
    width: '100%', padding: '10px 14px', borderRadius: 9,
    border: `1.5px solid ${invalid ? T.errorDark : T.border}`, fontSize: 13.5,
    outline: 'none', fontFamily: 'inherit', color: T.textPrimary, background: T.bg,
  });

  const schoolName = lang === 'en' ? inv.schoolEn : inv.school;

  return (
    <div data-screen-label="Public · Chấp nhận lời mời" style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
      {/* Left decorative panel (same family as login) */}
      <div className="inv-left" style={{
        width: '42%', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(150deg, ${pColor} 0%, ${pColor}CC 55%, ${T.success}88 100%)`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 52,
      }}>
        {[{s:340,x:-100,y:-100,o:0.07},{s:220,x:80,y:80,o:0.05},{s:170,x:-50,y:320,o:0.06}].map((c,i) => (
          <div key={i} style={{ position:'absolute', width:c.s, height:c.s, borderRadius:'50%', border:`2px solid rgba(255,255,255,${c.o*2})`, background:`rgba(255,255,255,${c.o})`, left:c.x, top:c.y, pointerEvents:'none' }}/>
        ))}
        <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Icon name="school" size={38} color="#fff" strokeWidth={1.4} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, textShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>EduPortal</div>
          <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 500, lineHeight: 1.7, marginBottom: 40 }}>
            {t('Hệ thống Quản lý Giáo dục', 'Education Management System')}
            <br /><span style={{ opacity: 0.7, fontSize: 13 }}>{t('THPT Nguyễn Du · TP.HCM', 'Nguyen Du High School · HCMC')}</span>
          </div>
          {[
            { vi: 'Lời mời gắn với email và vai trò cụ thể', en: 'Invites are tied to a specific email & role' },
            { vi: 'Link mời có thời hạn, bảo mật cho từng trường', en: 'Time-limited links, scoped per school' },
            { vi: 'Tham gia trong chưa đầy 1 phút', en: 'Join in under a minute' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, textAlign: 'left', opacity: 0.9 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Icon name="check" size={11} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 13, lineHeight: 1.55 }}>{t(f.vi, f.en)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', position: 'relative' }}>
        {/* Demo state controls */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <INVDemoChips label={t('Token', 'Token')} pColor={pColor}
            options={INV_TOKEN_STATES.map(s => ({ id: s.id, label: t(s.vi, s.en) }))}
            value={tokenState} onChange={(v) => { setTokenState(v); setDone(false); }} />
          <INVDemoChips label={t('Người dùng', 'User')} pColor={pColor}
            options={[{ id: 'guest', label: t('Chưa có tài khoản', 'Guest') }, { id: 'signedin', label: t('Đã đăng nhập', 'Signed in') }]}
            value={userState} onChange={(v) => { setUserState(v); setDone(false); }} />
        </div>

        <div style={{ width: '100%', maxWidth: 440 }}>
          <Card style={{ padding: '32px 32px 28px' }}>
            {/* Success */}
            {done ? (
              <div style={{ textAlign: 'center', padding: '8px 4px 4px' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.tealLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon name="check" size={32} color={T.teal} strokeWidth={2.4} />
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, color: T.textPrimary, marginBottom: 8 }}>
                  {t(`Chào mừng đến ${schoolName}!`, `Welcome to ${schoolName}!`)}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 8 }}>
                  {t('Tài khoản của bạn đã được kích hoạt với vai trò', 'Your account is now active with the role')}
                </div>
                <div style={{ marginBottom: 22 }}><INVRoleBadge role={inv.role} lang={lang} size="lg" /></div>
                <Button icon="arrowRight" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onEnterApp && onEnterApp(roleMeta.appRole)}>
                  {t('Vào trang chính', 'Go to dashboard')}
                </Button>
              </div>
            ) : tokenState !== 'valid' ? (
              <INVTokenError kind={tokenState} lang={lang} />
            ) : (
              <>
                {/* Invitation summary */}
                <div style={{ textAlign: 'center', marginBottom: 22 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 15, background: pColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon name="school" size={26} color="#fff" strokeWidth={1.6} />
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: T.textPrimary, lineHeight: 1.35, marginBottom: 10 }}>
                    {t(`Bạn được mời tham gia ${schoolName}`, `You're invited to join ${schoolName}`)}
                  </div>
                  <div style={{ marginBottom: 12 }}><INVRoleBadge role={inv.role} lang={lang} size="lg" /></div>
                  <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.6 }}>
                    {t(
                      <>Được mời bởi <strong style={{ color: T.textSecondary }}>{inv.invitedBy}</strong> ({t(inv.invitedByTitle.vi, inv.invitedByTitle.en)}) · {t(`Còn ${inv.daysLeft} ngày`, `${inv.daysLeft} days left`)} ({t('đến', 'until')} {inv.expiresAt})</>,
                      <>Invited by <strong style={{ color: T.textSecondary }}>{inv.invitedBy}</strong> ({inv.invitedByTitle.en}) · {inv.daysLeft} days left (until {inv.expiresAt})</>
                    )}
                  </div>
                </div>

                <div style={{ height: 1, background: T.border, margin: '0 -8px 20px' }} />

                {userState === 'signedin' ? (
                  <>
                    <Button icon="check" disabled={submitting} onClick={join}
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 14 }}>
                      {submitting ? t('Đang tham gia…', 'Joining…') : t(`Tham gia ${schoolName}`, `Join ${schoolName}`)}
                    </Button>
                    <div style={{ textAlign: 'center', fontSize: 12, color: T.textMuted, marginTop: 14 }}>
                      {t('Đang đăng nhập với', 'Signed in as')} <strong style={{ color: T.textSecondary }}>{inv.email}</strong>
                      {' — '}
                      <a href="#" onClick={e => { e.preventDefault(); setUserState('guest'); }} style={{ fontWeight: 700 }}>
                        {t('Đổi tài khoản?', 'Switch account?')}
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label htmlFor="inv-acc-email" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>Email</label>
                      <div style={{ position: 'relative' }}>
                        <input id="inv-acc-email" value={inv.email} readOnly aria-readonly="true" aria-describedby="inv-acc-email-hint"
                          style={{ ...inputStyle(false), color: T.textMuted, paddingRight: 36, cursor: 'not-allowed' }} />
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <Icon name="lockClosed" size={14} color={T.textMuted} />
                        </div>
                      </div>
                      <div id="inv-acc-email-hint" style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>
                        {t('Email được khóa theo lời mời — tài khoản sẽ dùng địa chỉ này.', 'Locked to the invitation — your account will use this address.')}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="inv-acc-name" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>
                        {t('Họ và tên', 'Full name')}
                      </label>
                      <input id="inv-acc-name" value={name} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'inv-acc-name-err' : undefined}
                        onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: undefined })); }}
                        placeholder={t('VD: Phạm Thị Lan', 'e.g. Pham Thi Lan')} style={inputStyle(!!errors.name)} />
                      {errors.name && (
                        <div id="inv-acc-name-err" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: T.errorDark, marginTop: 5 }}>
                          <Icon name="alertTriangle" size={11} color={T.errorDark} strokeWidth={2.2} />{errors.name}
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="inv-acc-pass" style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>
                        {t('Mật khẩu', 'Password')}
                      </label>
                      <input id="inv-acc-pass" type="password" value={password} aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'inv-acc-pass-err' : 'inv-acc-pass-hint'}
                        onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: undefined })); }}
                        onKeyDown={e => e.key === 'Enter' && submitSignup()}
                        placeholder="••••••••" style={inputStyle(!!errors.password)} />
                      {errors.password ? (
                        <div id="inv-acc-pass-err" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: T.errorDark, marginTop: 5 }}>
                          <Icon name="alertTriangle" size={11} color={T.errorDark} strokeWidth={2.2} />{errors.password}
                        </div>
                      ) : (
                        <div id="inv-acc-pass-hint" style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>
                          {t('Tối thiểu 6 ký tự.', 'At least 6 characters.')}
                        </div>
                      )}
                    </div>
                    <Button disabled={submitting} onClick={submitSignup}
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 14, marginTop: 2 }}>
                      {submitting ? t('Đang tạo tài khoản…', 'Creating account…') : t('Tạo tài khoản & tham gia', 'Create account & join')}
                    </Button>
                    <div style={{ textAlign: 'center', fontSize: 12, color: T.textMuted }}>
                      {t('Đã có tài khoản?', 'Already have an account?')}{' '}
                      <a href="#" onClick={e => { e.preventDefault(); setUserState('signedin'); }} style={{ fontWeight: 700 }}>
                        {t('Đăng nhập để tham gia', 'Sign in to join')}
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <div style={{ textAlign: 'center', fontSize: 11.5, color: T.textMuted, marginTop: 16, lineHeight: 1.6 }}>
            {t('Bằng việc tham gia, bạn đồng ý với Điều khoản sử dụng và Chính sách riêng tư của EduPortal.', 'By joining you agree to EduPortal’s Terms of Use and Privacy Policy.')}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .inv-left { display: none !important; } }
        @keyframes inv-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

Object.assign(window, { InvitationsScreen, InviteAcceptScreen });
