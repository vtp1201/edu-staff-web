// ── Mock account database ─────────────────────────────────────────────────────
const ACCOUNTS = {
  'nguyen.huong@email.com': {
    name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', avatar: 'NH',
    roles: [
      { role: 'teacher', tenant: 'THPT Nguyễn Du', tenantEn: 'Nguyen Du High School', tenantCode: 'ND-HS' },
    ]
  },
  'tran.quan@email.com': {
    name: 'Trần Minh Quân', nameEn: 'Tran Minh Quan', avatar: 'TQ',
    roles: [
      { role: 'admin',   tenant: 'THPT Nguyễn Du',     tenantEn: 'Nguyen Du High School',      tenantCode: 'ND-HS' },
      { role: 'manager', tenant: 'THCS Lê Lợi',         tenantEn: 'Le Loi Middle School',       tenantCode: 'LL-MS' },
      { role: 'teacher', tenant: 'Sở GD&ĐT TP.HCM',     tenantEn: 'HCMC Dept. of Education',    tenantCode: 'HCMC-DOE' },
    ]
  },
  'nguyen.duc@email.com': {
    name: 'Nguyễn Văn Đức', nameEn: 'Nguyen Van Duc', avatar: 'ND',
    roles: [
      { role: 'parent', tenant: 'THPT Nguyễn Du', tenantEn: 'Nguyen Du High School', tenantCode: 'ND-HS' },
      { role: 'parent', tenant: 'THCS Lê Lợi',     tenantEn: 'Le Loi Middle School',  tenantCode: 'LL-MS' },
      { role: 'staff',  tenant: 'THCS Lê Lợi',     tenantEn: 'Le Loi Middle School',  tenantCode: 'LL-MS' },
    ]
  },
  'minh.khoa@student.edu.vn': {
    name: 'Nguyễn Minh Khoa', nameEn: 'Nguyen Minh Khoa', avatar: 'NK',
    roles: [
      { role: 'student', tenant: 'THPT Nguyễn Du', tenantEn: 'Nguyen Du High School', tenantCode: 'ND-HS' },
    ]
  },
};

// enum: dùng cho badge UPPERCASE  ·  appRole: route nội bộ trong app
const ROLE_META = {
  teacher: { vi: 'Giáo viên',                en: 'Teacher',          icon: 'userCheck', color: '#5D87FF', enum: 'TEACHER', appRole: 'teacher'   },
  admin:   { vi: 'Ban giám hiệu (BGH)',      en: 'Board of Directors', icon: 'school',  color: '#13DEB9', enum: 'ADMIN',   appRole: 'principal' },
  manager: { vi: 'Phó Hiệu trưởng / BGH',    en: 'Vice Principal',   icon: 'school',    color: '#13DEB9', enum: 'MANAGER', appRole: 'principal' },
  staff:   { vi: 'Nhân viên',                en: 'Staff',            icon: 'briefcase', color: '#7B5EA7', enum: 'STAFF',   appRole: 'teacher'   },
  student: { vi: 'Học sinh',                 en: 'Student',          icon: 'bookOpen',  color: '#FFAE1F', enum: 'STUDENT', appRole: 'student'   },
  parent:  { vi: 'Phụ huynh',                en: 'Parent',           icon: 'users',     color: '#7B5EA7', enum: 'PARENT',  appRole: 'parent'    },
};

// ── SSO button icons ──────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// VNeID — government-issued e-ID (Vietnam Public Security).
// Shield silhouette + national flag star, in flag colors.
const VneIDIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2 L20.5 5 V11.5 C20.5 16.5 16.8 20.5 12 22 C7.2 20.5 3.5 16.5 3.5 11.5 V5 Z" fill="#DA251D" stroke="#B81E18" strokeWidth="0.5" strokeLinejoin="round"/>
    <polygon points="12,7.2 13.25,11.05 17.3,11.05 14.02,13.42 15.28,17.27 12,14.9 8.72,17.27 9.98,13.42 6.7,11.05 10.75,11.05" fill="#FFCD00"/>
  </svg>
);

// ── Login Screen ──────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin, lang, primaryColor, onForgotPassword }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  // step: 'login' | 'select-role'
  const [step, setStep] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [account, setAccount] = React.useState(null);

  const handleEmailLogin = () => {
    if (!email || !password) { setError(t('Vui lòng nhập đầy đủ thông tin.', 'Please fill in all fields.')); return; }
    setLoading(true); setError('');
    setTimeout(() => {
      const found = ACCOUNTS[email.toLowerCase()];
      if (found && password === '123456') {
        setAccount(found);
        if (found.roles.length === 1) {
          const meta = ROLE_META[found.roles[0].role];
          onLogin(meta?.appRole || found.roles[0].role);
        } else {
          setStep('select-role');
        }
      } else {
        setError(t('Email hoặc mật khẩu không đúng. (Dùng mật khẩu: 123456)', 'Wrong email or password. (Use: 123456)'));
      }
      setLoading(false);
    }, 700);
  };

  const handleSSOLogin = (provider) => {
    setLoading(true);
    setTimeout(() => {
      // Demo: SSO always lands on multi-role account
      const demoAccount = ACCOUNTS['nguyen.duc@email.com'];
      setAccount(demoAccount);
      setStep('select-role');
      setLoading(false);
    }, 900);
  };

  const handleSelectRole = (roleEntry) => {
    // Map enum role → app routing role (admin/manager → principal, staff → teacher view)
    const meta = ROLE_META[roleEntry.role];
    onLogin(meta?.appRole || roleEntry.role);
  };

  // ── Role selection screen ──
  if (step === 'select-role' && account) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '0 24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: pColor, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon name="school" size={28} color="#fff" strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {t('Đăng nhập với tư cách', 'Continue as')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {lang === 'en' ? account.nameEn : account.name}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
              {t(`${account.roles.length} vai trò khả dụng`, `${account.roles.length} available roles`)}
            </div>
          </div>

          {/* Role cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {account.roles.map((entry, i) => {
              const meta = ROLE_META[entry.role];
              return (
                <button key={i} onClick={() => handleSelectRole(entry)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', background: T.card,
                    border: `1.5px solid ${T.border}`, borderRadius: 14,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.boxShadow = `0 4px 20px ${meta.color}22`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={meta.icon} size={22} color={meta.color} strokeWidth={1.7} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
                        {t(meta.vi, meta.en)}
                      </span>
                      <span style={{ fontSize: 10, background: T.bg, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 6px', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {meta.enum}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="school" size={12} color={T.textMuted} />
                      {lang === 'en' ? entry.tenantEn : entry.tenant}
                      <span style={{ fontSize: 10, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 6px', marginLeft: 2, fontWeight: 600, letterSpacing: '0.03em' }}>{entry.tenantCode}</span>
                    </div>
                  </div>
                  <Icon name="chevronRight" size={16} color={T.textMuted} />
                </button>
              );
            })}
          </div>

          <button onClick={() => { setStep('login'); setAccount(null); }}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: T.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="chevronLeft" size={14} color={T.textMuted} />
            {t('Đăng nhập tài khoản khác', 'Use a different account')}
          </button>
        </div>
      </div>
    );
  }

  // ── Login form ──
  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg }}>
      {/* Left decorative panel */}
      <div style={{
        width: '42%', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(150deg, ${pColor} 0%, ${pColor}CC 55%, #13DEB988 100%)`,
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
          <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 500, marginBottom: 44, lineHeight: 1.7 }}>
            {t('Hệ thống Quản lý Giáo dục', 'Education Management System')}
            <br /><span style={{ opacity: 0.7, fontSize: 13 }}>{t('THPT Nguyễn Du · TP.HCM', 'Nguyen Du High School · HCMC')}</span>
          </div>
          {[
            { icon: 'check', vi: 'Đa vai trò — Giáo viên, Học sinh, Phụ huynh', en: 'Multi-role — Teacher, Student, Parent' },
            { icon: 'check', vi: 'Đa trường học (multi-tenant)', en: 'Multi-school (multi-tenant)' },
            { icon: 'check', vi: 'Theo dõi tiến độ & điểm số theo thời gian thực', en: 'Real-time progress & grade tracking' },
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

      {/* Right login panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
              {t('Đăng nhập', 'Sign in')}
            </div>
            <div style={{ fontSize: 13.5, color: T.textMuted }}>
              {t('Chào mừng đến với EduPortal', 'Welcome to EduPortal')}
            </div>
          </div>

          {/* SSO buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { label: t('Tiếp tục với Google', 'Continue with Google'), icon: <GoogleIcon />, provider: 'google' },
              { label: t('Đăng nhập VNeID', 'Sign in with VNeID'), icon: <VneIDIcon />, provider: 'vneid' },
            ].map(({ label, icon, provider }) => (
              <button key={provider} onClick={() => handleSSOLogin(provider)}
                disabled={loading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '11px 20px', border: `1.5px solid ${T.border}`, borderRadius: 10,
                  background: T.card, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600,
                  color: T.textPrimary, fontFamily: 'inherit', transition: 'all 0.15s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.boxShadow = `0 2px 10px ${pColor}18`; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{t('hoặc đăng nhập bằng email', 'or sign in with email')}</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Email form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, display: 'block', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Icon name="mail" size={15} color={T.textMuted} />
                </div>
                <input value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  placeholder={t('ten@truong.edu.vn', 'name@school.edu.vn')}
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', color: T.textPrimary, background: T.bg, transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = pColor}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{t('Mật khẩu', 'Password')}</label>
                <button style={{ background: 'none', border: 'none', color: pColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={onForgotPassword}>{t('Quên mật khẩu?', 'Forgot password?')}</button>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Icon name="lock" size={15} color={T.textMuted} />
                </div>
                <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', color: T.textPrimary, background: T.bg, transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = pColor}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: T.error, fontSize: 12, fontWeight: 500, background: T.errorLight, padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.error}22` }}>
                <Icon name="info" size={13} color={T.error} /><span>{error}</span>
              </div>
            )}

            <button onClick={handleEmailLogin} disabled={loading}
              style={{ padding: '12px', background: loading ? T.textMuted : pColor, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', marginTop: 2 }}>
              {loading ? t('Đang xử lý...', 'Processing...') : t('Đăng nhập', 'Sign In')}
            </button>
          </div>

          {/* Demo hint */}
          <div style={{ marginTop: 20, padding: '12px 14px', background: T.infoLight, borderRadius: 9, border: `1px solid ${T.info}28` }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: T.info, marginBottom: 5 }}>
              {t('💡 Tài khoản demo — mật khẩu: 123456', '💡 Demo accounts — password: 123456')}
            </div>
            <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.7 }}>
              <span style={{ fontWeight: 600 }}>1 vai trò:</span> nguyen.huong@email.com · minh.khoa@student.edu.vn<br/>
              <span style={{ fontWeight: 600 }}>{t('Nhiều vai trò:', 'Multiple roles:')}</span> nguyen.duc@email.com · tran.quan@email.com<br/>
              <span style={{ opacity: 0.8 }}>{t('SSO → demo đa vai trò tự động', 'SSO → auto multi-role demo')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LoginScreen });
