// ── P7 · Switch Tenant (multi-school) ─────────────────────────────────────────
// Memberships của user hiện tại theo app-role. User chỉ thuộc 1 trường →
// zero-noise: không màn chọn trường, không item "Đổi trường" trong menu.
window.TS_MEMBERSHIPS = {
  // User mẫu đa trường: giáo viên dạy 2 trường
  teacher: [
    {
      id: 'cva', name: 'THPT Chu Văn An', nameEn: 'Chu Van An High School',
      initial: 'CV', color: '#5D87FF',
      address: '10 Thụy Khuê, Tây Hồ, Hà Nội', addressEn: '10 Thuy Khue, Tay Ho, Hanoi',
      roleVi: 'Giáo viên', roleEn: 'Teacher', roleColor: '#5D87FF',
    },
    {
      id: 'ndu', name: 'THCS Nguyễn Du', nameEn: 'Nguyen Du Middle School',
      initial: 'ND', color: '#7B5EA7',
      address: '44 Hàng Quạt, Hoàn Kiếm, Hà Nội', addressEn: '44 Hang Quat, Hoan Kiem, Hanoi',
      roleVi: 'Giáo viên', roleEn: 'Teacher', roleColor: '#5D87FF',
    },
  ],
  // Các role còn lại thuộc đúng 1 trường (zero-noise case)
  principal: [
    {
      id: 'ndhs', name: 'THPT Nguyễn Du', nameEn: 'Nguyen Du High School',
      initial: 'ND', color: '#13DEB9',
      address: 'Q.1, TP. Hồ Chí Minh', addressEn: 'District 1, HCMC',
      roleVi: 'Ban giám hiệu', roleEn: 'Board of Directors', roleColor: '#13DEB9',
    },
  ],
  student: [
    {
      id: 'ndhs', name: 'THPT Nguyễn Du', nameEn: 'Nguyen Du High School',
      initial: 'ND', color: '#FFAE1F',
      address: 'Q.1, TP. Hồ Chí Minh', addressEn: 'District 1, HCMC',
      roleVi: 'Học sinh', roleEn: 'Student', roleColor: '#FFAE1F',
    },
  ],
  parent: [
    {
      id: 'ndhs', name: 'THPT Nguyễn Du', nameEn: 'Nguyen Du High School',
      initial: 'ND', color: '#7B5EA7',
      address: 'Q.1, TP. Hồ Chí Minh', addressEn: 'District 1, HCMC',
      roleVi: 'Phụ huynh', roleEn: 'Parent', roleColor: '#7B5EA7',
    },
  ],
};

// Logo/initial trường — role-icon token: vuông bo 16
const TenantLogo = ({ tenant, size = 56 }) => (
  <div aria-hidden="true" style={{
    width: size, height: size, borderRadius: size >= 48 ? 16 : 10, flexShrink: 0,
    background: tenant.color + '1A', color: tenant.color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.32, fontWeight: 800, letterSpacing: '0.02em',
    border: `1px solid ${tenant.color}33`,
  }}>{tenant.initial}</div>
);

// Card trường — <button> thật, hover lift theo shadow token, focus ring rõ.
const TenantCard = ({ tenant, isCurrent, loading, busy, onSelect, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const lifted = (hovered || focused) && !isCurrent && !busy;
  let boxShadow = lifted ? '0 4px 20px rgba(0,0,0,0.08)' : '0 2px 12px rgba(0,0,0,0.04)';
  if (focused) boxShadow += `, 0 0 0 2px ${T.primary}`;
  const name = lang === 'en' ? tenant.nameEn : tenant.name;
  const roleLabel = lang === 'en' ? tenant.roleEn : tenant.roleVi;
  const addr = lang === 'en' ? (tenant.addressEn || tenant.address) : tenant.address;

  return (
    <button type="button" onClick={onSelect}
      disabled={busy && !loading}
      aria-current={isCurrent ? 'true' : undefined}
      aria-busy={loading || undefined}
      aria-label={
        t(`${tenant.name}, ${tenant.address}, vai trò ${tenant.roleVi}${isCurrent ? ', trường hiện tại' : ''}`,
          `${tenant.nameEn}, ${tenant.addressEn || tenant.address}, role ${tenant.roleEn}${isCurrent ? ', current school' : ''}`)
      }
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', minHeight: 80, textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
        background: T.card, borderRadius: 14,
        border: `1.5px solid ${isCurrent ? tenant.color : T.border}`,
        boxShadow, cursor: (busy && !loading) ? 'default' : (isCurrent ? 'default' : 'pointer'),
        outline: 'none', fontFamily: 'inherit',
        transform: lifted ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
        opacity: (busy && !loading) ? 0.55 : 1,
      }}>
      <TenantLogo tenant={tenant} size={56} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>{name}</span>
          {isCurrent && (
            <Badge color={T.success} style={{ fontSize: 10, padding: '2px 8px' }}>
              <Icon name="check" size={10} color={T.success} strokeWidth={2.6} />
              {t('Hiện tại', 'Current')}
            </Badge>
          )}
        </span>
        <span style={{ fontSize: 11.5, color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {addr}
        </span>
        <span>
          <Badge color={tenant.roleColor} style={{ fontSize: 10.5 }}>{roleLabel}</Badge>
        </span>
      </span>
      {loading ? (
        <span aria-hidden="true" style={{
          width: 20, height: 20, flexShrink: 0, borderRadius: '50%',
          border: `2.5px solid ${tenant.color}30`, borderTopColor: tenant.color,
          animation: 'ts-spin 0.7s linear infinite',
        }} />
      ) : !isCurrent && (
        <Icon name="chevronRight" size={16} color={T.textMuted} />
      )}
      {loading && <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('Đang chuyển…', 'Switching…')}</span>}
    </button>
  );
};

// Dialog "Chọn trường" — focus trap chuẩn (Tab loop + Escape + trả focus).
const TenantSwitchDialog = ({ memberships, activeTenantId, onClose, onSwitch, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [loadingId, setLoadingId] = React.useState(null);
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    const prev = document.activeElement;
    const el = dialogRef.current;
    if (el) { const f = el.querySelector('button'); if (f) f.focus(); }
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll('button:not([disabled])');
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);

  const handlePick = (tenant) => {
    if (loadingId) return;
    if (tenant.id === activeTenantId) { onClose(); return; }
    setLoadingId(tenant.id);
    window.setTimeout(() => onSwitch(tenant), 900);
  };

  return (
    <div onClick={() => { if (!loadingId) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000, padding: 20,
    }}>
      <div ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ts-dialog-title"
        style={{
          background: T.card, borderRadius: 14, width: '100%', maxWidth: 440,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}>
        <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: pColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="switchHorizontal" size={16} color={pColor} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="ts-dialog-title" style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Chọn trường', 'Choose a school')}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
              {t('Tài khoản của bạn thuộc nhiều trường. Chọn trường để làm việc.', 'Your account belongs to multiple schools. Pick one to work in.')}
            </div>
          </div>
          <button onClick={onClose} aria-label={t('Đóng', 'Close')} disabled={!!loadingId}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: T.bg, cursor: loadingId ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: loadingId ? 0.5 : 1 }}>
            <Icon name="x" size={13} color={T.textMuted} />
          </button>
        </div>

        <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {memberships.map(m => (
            <TenantCard key={m.id} tenant={m} lang={lang}
              isCurrent={m.id === activeTenantId}
              loading={loadingId === m.id}
              busy={!!loadingId}
              onSelect={() => handlePick(m)} />
          ))}
        </div>
      </div>
      <style>{`@keyframes ts-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Màn chọn trường sau login — chỉ render khi user thuộc ≥2 trường.
// Layout auth giống login.jsx (bg T.bg, khối giữa màn hình, logo trên cùng).
const TenantSelectScreen = ({ memberships, userName, onSelect, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [loadingId, setLoadingId] = React.useState(null);

  const handlePick = (tenant) => {
    if (loadingId) return;
    setLoadingId(tenant.id);
    window.setTimeout(() => onSelect(tenant), 900);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: pColor, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="school" size={28} color="#fff" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
            {t('Chọn trường để tiếp tục', 'Choose a school to continue')}
          </h1>
          <div style={{ fontSize: 13, color: T.textSecondary }}>
            {userName
              ? t(`Xin chào ${userName} — tài khoản của bạn thuộc ${memberships.length} trường.`,
                  `Hi ${userName} — your account belongs to ${memberships.length} schools.`)
              : t(`Tài khoản của bạn thuộc ${memberships.length} trường.`,
                  `Your account belongs to ${memberships.length} schools.`)}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {memberships.map(m => (
            <TenantCard key={m.id} tenant={m} lang={lang}
              isCurrent={false}
              loading={loadingId === m.id}
              busy={!!loadingId}
              onSelect={() => handlePick(m)} />
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11.5, color: T.textMuted, marginTop: 20 }}>
          {t('Bạn có thể đổi trường bất kỳ lúc nào từ menu tài khoản.', 'You can switch schools anytime from the account menu.')}
        </div>
      </div>
      <style>{`@keyframes ts-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Overlay "reload context" ngắn sau khi chuyển trường
const TenantSwitchOverlay = ({ tenant, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const name = lang === 'en' ? tenant.nameEn : tenant.name;
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', inset: 0, zIndex: 9600,
      background: 'rgba(245,247,250,0.92)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <TenantLogo tenant={tenant} size={64} />
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
          {t(`Đang tải dữ liệu ${name}…`, `Loading ${name}…`)}
        </div>
        <span aria-hidden="true" style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `2.5px solid ${tenant.color}30`, borderTopColor: tenant.color,
          animation: 'ts-spin 0.7s linear infinite',
        }} />
      </div>
      <style>{`@keyframes ts-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

Object.assign(window, { TenantLogo, TenantCard, TenantSwitchDialog, TenantSelectScreen, TenantSwitchOverlay });
