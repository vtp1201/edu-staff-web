// ── Profile & Settings Screen ─────────────────────────────────────────────────

const PROFILE_DATA = {
  teacher:   { name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', dob: '15/03/1985', gender: 'female', phone: '0901 234 567', email: 'nguyen.huong@email.com', cccd: '079085012345', address: '123 Lê Lợi, Q.1, TP.HCM', dept: 'Tổ Toán – Tin', school: 'THPT Nguyễn Du', joinDate: '01/09/2010', avatar: 'NH', color: '#5D87FF' },
  principal: { name: 'Trần Minh Quân', nameEn: 'Tran Minh Quan', dob: '22/07/1972', gender: 'male', phone: '0912 345 678', email: 'tran.quan@email.com', cccd: '079072067890', address: '45 Đinh Tiên Hoàng, Q.Bình Thạnh, TP.HCM', dept: 'Ban Giám hiệu', school: 'THPT Nguyễn Du', joinDate: '01/09/2005', avatar: 'TQ', color: '#13DEB9' },
  student:   { name: 'Nguyễn Minh Khoa', nameEn: 'Nguyen Minh Khoa', dob: '10/11/2008', gender: 'male', phone: '0765 432 100', email: 'minh.khoa@student.edu.vn', cccd: '079108099001', address: '78 Cách Mạng Tháng 8, Q.3, TP.HCM', dept: 'Lớp 11A2', school: 'THPT Nguyễn Du', joinDate: '05/09/2023', avatar: 'NK', color: '#FFAE1F' },
  parent:    { name: 'Nguyễn Văn Đức', nameEn: 'Nguyen Van Duc', dob: '05/06/1975', gender: 'male', phone: '0888 765 432', email: 'nguyen.duc@email.com', cccd: '079075033456', address: '78 Cách Mạng Tháng 8, Q.3, TP.HCM', dept: '—', school: 'THPT Nguyễn Du', joinDate: '01/09/2023', avatar: 'ND', color: '#7B5EA7' },
};

const ROLE_LABELS_P = { teacher: { vi: 'Giáo viên', en: 'Teacher' }, principal: { vi: 'Hiệu trưởng', en: 'Principal' }, student: { vi: 'Học sinh', en: 'Student' }, parent: { vi: 'Phụ huynh', en: 'Parent' } };

const PasswordStrength = ({ password }) => {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const levels = [
    { label: 'Rất yếu', en: 'Very weak', color: T.error },
    { label: 'Yếu', en: 'Weak', color: T.error },
    { label: 'Trung bình', en: 'Fair', color: T.warning },
    { label: 'Mạnh', en: 'Strong', color: T.success },
    { label: 'Rất mạnh', en: 'Very strong', color: T.success },
  ];
  if (!password) return null;
  const lv = levels[score] || levels[0];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < score ? lv.color : T.border, transition: 'background 0.2s' }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: lv.color, fontWeight: 600 }}>{lv.label}</div>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = 'text', disabled, icon, placeholder, hint }) => {
  const [focused, setFocused] = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);
  const inputType = type === 'password' ? (showPass ? 'text' : 'password') : type;
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {icon && <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name={icon} size={15} color={focused ? T.primary : T.textMuted} /></div>}
        <input
          type={inputType} value={value}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || ''}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: `10px ${type === 'password' ? '42px' : '14px'} 10px ${icon ? '38px' : '14px'}`,
            borderRadius: 9, border: `1.5px solid ${focused ? T.primary : T.border}`,
            fontSize: 13.5, outline: 'none', fontFamily: 'inherit',
            color: disabled ? T.textMuted : T.textPrimary,
            background: disabled ? T.bg : '#fff',
            transition: 'border-color 0.15s',
          }}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShowPass(s => !s)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <Icon name={showPass ? 'eye' : 'eye'} size={15} color={T.textMuted} />
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
};

const ProfileScreen = ({ role, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const base = PROFILE_DATA[role] || PROFILE_DATA.teacher;

  const [activeTab, setActiveTab] = React.useState('info');
  const [editMode, setEditMode] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [form, setForm] = React.useState({ ...base });

  // Password tab state
  const [pwForm, setPwForm] = React.useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = React.useState('');
  const [pwSuccess, setPwSuccess] = React.useState(false);
  const [pwLoading, setPwLoading] = React.useState(false);

  // Linked SSO accounts state
  const [vneidLinked, setVneidLinked] = React.useState(true);
  const [googleLinked, setGoogleLinked] = React.useState(false);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => { setForm({ ...base }); setEditMode(false); };

  const handleChangePassword = () => {
    setPwError('');
    if (!pwForm.current) { setPwError(t('Vui lòng nhập mật khẩu hiện tại.', 'Please enter current password.')); return; }
    if (pwForm.newPw.length < 8) { setPwError(t('Mật khẩu mới phải có ít nhất 8 ký tự.', 'New password must be at least 8 characters.')); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError(t('Xác nhận mật khẩu không khớp.', 'Passwords do not match.')); return; }
    setPwLoading(true);
    setTimeout(() => { setPwSuccess(true); setPwLoading(false); setPwForm({ current: '', newPw: '', confirm: '' }); setTimeout(() => setPwSuccess(false), 4000); }, 1000);
  };

  const tabs = [
    { id: 'info', vi: 'Thông tin cá nhân', en: 'Personal Info', icon: 'user' },
    { id: 'security', vi: 'Bảo mật & Mật khẩu', en: 'Security & Password', icon: 'lock' },
    { id: 'sessions', vi: 'Phiên đăng nhập', en: 'Active Sessions', icon: 'eye' },
  ];

  const GENDER_OPTIONS = [{ vi: 'Nam', en: 'Male', val: 'male' }, { vi: 'Nữ', en: 'Female', val: 'female' }];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Hồ sơ cá nhân', 'My Profile')}</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Quản lý thông tin tài khoản của bạn', 'Manage your account information')}</div>
        </div>

        {/* Success toast */}
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: T.successLight, border: `1px solid ${T.success}40`, borderRadius: 10, marginBottom: 20, color: T.success, fontWeight: 600, fontSize: 13 }}>
            <Icon name="check" size={16} color={T.success} strokeWidth={2.5} />
            {t('Cập nhật thông tin thành công!', 'Profile updated successfully!')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left: Avatar card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {/* Cover strip */}
              <div style={{ height: 72, background: `linear-gradient(135deg, ${pColor} 0%, ${pColor}99 100%)`, position: 'relative' }}>
                <div style={{ position: 'absolute', right: 10, bottom: 10, opacity: 0.2 }}>
                  <Icon name="school" size={40} color="#fff" />
                </div>
              </div>
              <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
                {/* Avatar */}
                <div style={{ position: 'relative', display: 'inline-block', marginTop: -32, marginBottom: 12 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: pColor + '25', border: `4px solid ${T.card}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: pColor, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {base.avatar}
                  </div>
                  <button style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: pColor, border: `2px solid ${T.card}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={10} color="#fff" strokeWidth={3} />
                  </button>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{form.name}</div>
                <div style={{ marginBottom: 4 }}>
                  <Badge color={pColor}>{t(ROLE_LABELS_P[role]?.vi, ROLE_LABELS_P[role]?.en)}</Badge>
                </div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{form.school}</div>
              </div>
              <div style={{ borderTop: `1px solid ${T.border}`, padding: '14px 20px' }}>
                {[
                  { icon: 'mail', val: form.email },
                  { icon: 'clock', val: form.phone },
                  { icon: 'calendar', val: t(`Tham gia ${form.joinDate}`, `Joined ${form.joinDate}`) },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 2 ? 10 : 0 }}>
                    <Icon name={r.icon} size={13} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account requests — neutral support card (deactivation is ADMIN-only) */}
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {t('Yêu cầu tài khoản', 'Account Requests')}
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.55, marginBottom: 10 }}>
                {t('Để vô hiệu hoá hoặc xoá tài khoản, vui lòng liên hệ quản trị viên trường.', 'To deactivate or remove your account, please contact your school administrator.')}
              </div>
              <a href="mailto:admin@school.edu.vn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.bg, color: T.textSecondary, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                <Icon name="mail" size={13} color={T.textSecondary} />
                {t('Liên hệ quản trị viên', 'Contact Admin')}
              </a>
            </div>
          </div>

          {/* Right: tabs + content */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, padding: '0 4px' }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '14px 20px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? pColor : T.textMuted,
                    borderBottom: `2px solid ${activeTab === tab.id ? pColor : 'transparent'}`,
                    marginBottom: -1, transition: 'color 0.15s', whiteSpace: 'nowrap',
                  }}>
                  <Icon name={tab.icon} size={14} color={activeTab === tab.id ? pColor : T.textMuted} />
                  {t(tab.vi, tab.en)}
                </button>
              ))}
            </div>

            {/* ── Tab: Personal Info ── */}
            {activeTab === 'info' && (
              <div style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Thông tin cá nhân', 'Personal Information')}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{t('Cập nhật ảnh và thông tin cá nhân', 'Update your photo and personal details')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {editMode ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={handleCancel}>{t('Huỷ', 'Cancel')}</Button>
                        <Button size="sm" icon="check" onClick={handleSave}>{t('Lưu thay đổi', 'Save Changes')}</Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditMode(true)}>{t('Chỉnh sửa', 'Edit Profile')}</Button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <InputField label={t('Họ và tên đầy đủ', 'Full Name')} value={form.name} onChange={v => setField('name', v)} disabled={!editMode} icon="user" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Ngày sinh', 'Date of Birth')}</label>
                    <input type="date" value={form.dob.split('/').reverse().join('-')} onChange={e => setField('dob', e.target.value.split('-').reverse().join('/'))} disabled={!editMode}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', background: !editMode ? T.bg : '#fff', color: T.textPrimary }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Giới tính', 'Gender')}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {GENDER_OPTIONS.map(g => (
                        <button key={g.val} onClick={() => editMode && setField('gender', g.val)}
                          style={{ flex: 1, padding: '9px', border: `1.5px solid ${form.gender === g.val ? pColor : T.border}`, borderRadius: 8, background: form.gender === g.val ? pColor + '12' : 'transparent', color: form.gender === g.val ? pColor : T.textSecondary, fontSize: 13, fontWeight: 600, cursor: editMode ? 'pointer' : 'default' }}>
                          {t(g.vi, g.en)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <InputField label={t('Số điện thoại', 'Phone Number')} value={form.phone} onChange={v => setField('phone', v)} disabled={!editMode} icon="clock" />
                  <InputField label="Email" value={form.email} disabled={true} icon="mail" hint={t('Email không thể thay đổi', 'Email cannot be changed')} />
                  <InputField label={t('Số CMND / CCCD', 'National ID (CCCD)')} value={form.cccd} onChange={v => setField('cccd', v)} disabled={!editMode} icon="fileText" />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Địa chỉ', 'Address')}</label>
                    <textarea value={form.address} onChange={e => setField('address', e.target.value)} disabled={!editMode} rows={2}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', background: !editMode ? T.bg : '#fff', color: T.textPrimary, resize: 'vertical' }} />
                  </div>
                  {(role === 'teacher' || role === 'principal') && (
                    <InputField label={t('Tổ / Bộ môn', 'Department')} value={form.dept} onChange={v => setField('dept', v)} disabled={!editMode} icon="users" />
                  )}
                  <InputField label={t('Trường học', 'School')} value={form.school} disabled={true} icon="school" hint={t('Được quản lý bởi nhà trường', 'Managed by school admin')} />
                </div>
              </div>
            )}

            {/* ── Tab: Security / Change Password ── */}
            {activeTab === 'security' && (
              <div style={{ padding: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Đổi mật khẩu', 'Change Password')}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 24 }}>{t('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa và số.', 'Password must be at least 8 characters including uppercase and numbers.')}</div>

                {pwSuccess && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: T.successLight, border: `1px solid ${T.success}40`, borderRadius: 10, marginBottom: 20, color: T.success, fontWeight: 600, fontSize: 13 }}>
                    <Icon name="check" size={16} color={T.success} strokeWidth={2.5} />
                    {t('Đổi mật khẩu thành công!', 'Password changed successfully!')}
                  </div>
                )}

                <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <InputField label={t('Mật khẩu hiện tại', 'Current Password')} value={pwForm.current} onChange={v => setPwForm(f => ({ ...f, current: v }))} type="password" icon="lock" placeholder="••••••••" />
                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                      <button style={{ background: 'none', border: 'none', color: pColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => {}}>
                        {t('Quên mật khẩu?', 'Forgot password?')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <InputField label={t('Mật khẩu mới', 'New Password')} value={pwForm.newPw} onChange={v => setPwForm(f => ({ ...f, newPw: v }))} type="password" icon="lock" placeholder="••••••••" />
                    <PasswordStrength password={pwForm.newPw} />
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[
                        { check: pwForm.newPw.length >= 8, vi: 'Ít nhất 8 ký tự', en: 'At least 8 characters' },
                        { check: /[A-Z]/.test(pwForm.newPw), vi: 'Có chữ hoa (A–Z)', en: 'Contains uppercase letter' },
                        { check: /[0-9]/.test(pwForm.newPw), vi: 'Có chữ số (0–9)', en: 'Contains a number' },
                        { check: /[^A-Za-z0-9]/.test(pwForm.newPw), vi: 'Có ký tự đặc biệt', en: 'Contains special character' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: r.check ? T.success : T.textMuted }}>
                          <Icon name={r.check ? 'check' : 'x'} size={12} color={r.check ? T.success : T.textMuted} strokeWidth={2.5} />
                          {t(r.vi, r.en)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <InputField label={t('Xác nhận mật khẩu mới', 'Confirm New Password')} value={pwForm.confirm} onChange={v => setPwForm(f => ({ ...f, confirm: v }))} type="password" icon="lock" placeholder="••••••••"
                    hint={pwForm.confirm && pwForm.newPw !== pwForm.confirm ? t('Mật khẩu không khớp', 'Passwords do not match') : ''} />

                  {pwError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.error, fontSize: 12, fontWeight: 500, background: T.errorLight, padding: '8px 12px', borderRadius: 8 }}>
                      <Icon name="info" size={13} color={T.error} />{pwError}
                    </div>
                  )}

                  <Button onClick={handleChangePassword} disabled={pwLoading} style={{ borderRadius: 10, padding: '11px' }}>
                    {pwLoading ? t('Đang xử lý...', 'Processing...') : t('Cập nhật mật khẩu', 'Update Password')}
                  </Button>
                </div>

                {/* 2FA section */}
                <div style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Xác thực 2 bước (2FA)', 'Two-Factor Authentication')}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{t('Tăng cường bảo mật tài khoản bằng xác thực 2 bước.', 'Add an extra layer of security to your account.')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: T.warning + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="lock" size={20} color={T.warning} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{t('Ứng dụng xác thực', 'Authenticator App')}</div>
                      <div style={{ fontSize: 11.5, color: T.textMuted }}>{t('Chưa được bật — Google Authenticator, Authy...', 'Not enabled — Google Authenticator, Authy...')}</div>
                    </div>
                    <Button variant="secondary" size="sm">{t('Bật 2FA', 'Enable 2FA')}</Button>
                  </div>
                </div>

                {/* Linked accounts section */}
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Liên kết tài khoản', 'Linked Accounts')}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{t('Đăng nhập nhanh bằng tài khoản bên ngoài đã liên kết.', 'Sign in faster with linked external accounts.')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      {
                        key: 'vneid', name: 'VNeID',
                        desc: t('Định danh điện tử quốc gia', 'Vietnam National e-ID'),
                        linked: vneidLinked,
                        toggle: () => setVneidLinked(v => !v),
                        icon: (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-label="VNeID">
                            <path d="M12 2 L20.5 5 V11.5 C20.5 16.5 16.8 20.5 12 22 C7.2 20.5 3.5 16.5 3.5 11.5 V5 Z" fill="#DA251D" stroke="#B81E18" strokeWidth="0.5" strokeLinejoin="round"/>
                            <polygon points="12,7.2 13.25,11.05 17.3,11.05 14.02,13.42 15.28,17.27 12,14.9 8.72,17.27 9.98,13.42 6.7,11.05 10.75,11.05" fill="#FFCD00"/>
                          </svg>
                        ),
                      },
                      {
                        key: 'google', name: 'Google',
                        desc: googleLinked ? form.email : t('Đăng nhập nhanh với tài khoản Google', 'Quick sign-in with your Google account'),
                        linked: googleLinked,
                        toggle: () => setGoogleLinked(v => !v),
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 48 48" aria-label="Google">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                          </svg>
                        ),
                      },
                    ].map(row => (
                      <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fff', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {row.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{row.name}</span>
                            {row.linked ? (
                              <span style={{ fontSize: 10, fontWeight: 700, background: T.successLight, color: T.success, border: `1px solid ${T.success}33`, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.03em' }}>
                                {t('Đã liên kết', 'Linked')}
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, background: T.card, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.03em' }}>
                                {t('Chưa liên kết', 'Not linked')}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.desc}</div>
                        </div>
                        {row.linked ? (
                          <button onClick={row.toggle}
                            style={{ padding: '7px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: 'transparent', color: T.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {t('Hủy liên kết', 'Unlink')}
                          </button>
                        ) : (
                          <button onClick={row.toggle}
                            style={{ padding: '7px 14px', border: 'none', borderRadius: 8, background: pColor, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {t('Liên kết ngay', 'Link Now')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Active Sessions ── */}
            {activeTab === 'sessions' && (
              <div style={{ padding: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Phiên đăng nhập đang hoạt động', 'Active Sessions')}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 24 }}>{t('Quản lý các thiết bị đang đăng nhập vào tài khoản của bạn.', 'Manage devices currently signed in to your account.')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { device: 'Chrome on Windows 11', location: 'TP.HCM, Việt Nam', ip: '203.162.x.x', time: t('Hiện tại', 'Current session'), current: true },
                    { device: 'Safari on iPhone 15', location: 'TP.HCM, Việt Nam', ip: '1.54.x.x', time: t('2 giờ trước', '2 hours ago'), current: false },
                    { device: 'Chrome on MacBook', location: 'Hà Nội, Việt Nam', ip: '42.112.x.x', time: t('Hôm qua', 'Yesterday'), current: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', border: `1.5px solid ${s.current ? pColor + '40' : T.border}`, borderRadius: 10, background: s.current ? pColor + '06' : T.card }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: (s.current ? pColor : T.textMuted) + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={s.device.includes('iPhone') ? 'clock' : 'eye'} size={18} color={s.current ? pColor : T.textMuted} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {s.device}
                          {s.current && <Badge color={T.success} style={{ fontSize: 10 }}>{t('Thiết bị này', 'This device')}</Badge>}
                        </div>
                        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{s.location} · {s.ip} · {s.time}</div>
                      </div>
                      {!s.current && (
                        <button style={{ padding: '6px 14px', border: `1px solid ${T.error}40`, borderRadius: 7, background: T.errorLight, color: T.error, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {t('Đăng xuất', 'Sign out')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button style={{ marginTop: 16, padding: '10px 20px', border: `1px solid ${T.error}40`, borderRadius: 9, background: T.errorLight, color: T.error, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {t('Đăng xuất khỏi tất cả thiết bị khác', 'Sign out of all other devices')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Forgot Password (standalone flow on login) ────────────────────────────────
const ForgotPasswordScreen = ({ onBack, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [step, setStep] = React.useState('email'); // email | sent | reset | success
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [confirmPw, setConfirmPw] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSendCode = () => {
    if (!email) { setError(t('Vui lòng nhập email.', 'Please enter your email.')); return; }
    setLoading(true); setError('');
    setTimeout(() => { setStep('sent'); setLoading(false); }, 800);
  };

  const handleVerifyCode = () => {
    if (code.length < 4) { setError(t('Mã OTP không hợp lệ.', 'Invalid OTP code.')); return; }
    setLoading(true); setError('');
    setTimeout(() => { setStep('reset'); setLoading(false); }, 600);
  };

  const handleReset = () => {
    if (newPw.length < 8) { setError(t('Mật khẩu phải có ít nhất 8 ký tự.', 'Min 8 characters.')); return; }
    if (newPw !== confirmPw) { setError(t('Xác nhận không khớp.', 'Passwords do not match.')); return; }
    setLoading(true); setError('');
    setTimeout(() => { setStep('success'); setLoading(false); }, 800);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: pColor + '18', border: `2px solid ${pColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="lock" size={26} color={pColor} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
            {step === 'success' ? t('Đặt lại thành công!', 'Password Reset!') : t('Quên mật khẩu?', 'Forgot Password?')}
          </div>
          <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
            {step === 'email' && t('Nhập email của bạn để nhận mã OTP đặt lại mật khẩu.', 'Enter your email to receive a password reset OTP.')}
            {step === 'sent' && t(`Chúng tôi đã gửi mã 6 chữ số đến ${email}`, `We sent a 6-digit code to ${email}`)}
            {step === 'reset' && t('Tạo mật khẩu mới cho tài khoản của bạn.', 'Create a new password for your account.')}
            {step === 'success' && t('Mật khẩu đã được đặt lại. Bạn có thể đăng nhập lại.', 'Your password has been reset. You can now sign in.')}
          </div>
        </div>

        {error && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.error, fontSize: 12, fontWeight: 500, background: T.errorLight, padding: '8px 12px', borderRadius: 8, marginBottom: 16, border: `1px solid ${T.error}22` }}><Icon name="info" size={13} color={T.error} />{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {step === 'email' && (
            <>
              <InputField label="Email" value={email} onChange={v => { setEmail(v); setError(''); }} icon="mail" placeholder={t('ten@truong.edu.vn', 'name@school.edu')} />
              <button onClick={handleSendCode} disabled={loading} style={{ padding: '12px', background: loading ? T.textMuted : pColor, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? t('Đang gửi...', 'Sending...') : t('Gửi mã OTP', 'Send OTP Code')}
              </button>
            </>
          )}

          {step === 'sent' && (
            <>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 8 }}>{t('Nhập mã OTP (6 chữ số)', 'Enter OTP Code (6 digits)')}</label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {[0,1,2,3,4,5].map(i => (
                    <input key={i} maxLength={1} value={code[i] || ''} onChange={e => { const c = code.split(''); c[i] = e.target.value; setCode(c.join('')); if (e.target.value && e.target.nextSibling) e.target.nextSibling.focus(); }}
                      style={{ width: 46, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 800, borderRadius: 10, border: `1.5px solid ${T.border}`, outline: 'none', fontFamily: 'inherit', color: T.textPrimary }}
                      onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <button style={{ background: 'none', border: 'none', color: pColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('Gửi lại mã', 'Resend code')}</button>
                </div>
              </div>
              <button onClick={handleVerifyCode} disabled={loading} style={{ padding: '12px', background: pColor, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {loading ? t('Đang xác minh...', 'Verifying...') : t('Xác nhận mã OTP', 'Verify OTP')}
              </button>
            </>
          )}

          {step === 'reset' && (
            <>
              <div>
                <InputField label={t('Mật khẩu mới', 'New Password')} value={newPw} onChange={v => { setNewPw(v); setError(''); }} type="password" icon="lock" placeholder="••••••••" />
                <PasswordStrength password={newPw} />
              </div>
              <InputField label={t('Xác nhận mật khẩu mới', 'Confirm Password')} value={confirmPw} onChange={v => { setConfirmPw(v); setError(''); }} type="password" icon="lock" placeholder="••••••••" />
              <button onClick={handleReset} disabled={loading} style={{ padding: '12px', background: pColor, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {loading ? t('Đang xử lý...', 'Processing...') : t('Đặt lại mật khẩu', 'Reset Password')}
              </button>
            </>
          )}

          {step === 'success' && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: T.successLight, border: `2px solid ${T.success}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Icon name="check" size={28} color={T.success} strokeWidth={2} />
                </div>
              </div>
              <button onClick={onBack} style={{ padding: '12px', background: pColor, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('Quay lại đăng nhập', 'Back to Sign In')}
              </button>
            </>
          )}

          {step !== 'success' && (
            <button onClick={onBack} style={{ padding: '10px', border: `1px solid ${T.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 13, color: T.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="chevronLeft" size={14} color={T.textMuted} />
              {t('Quay lại đăng nhập', 'Back to Sign In')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ProfileScreen, ForgotPasswordScreen, PasswordStrength, InputField });
