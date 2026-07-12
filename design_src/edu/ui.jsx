// ── Shared UI primitives ──────────────────────────────────────────────────────

// Viewport width hook — responsive shell (sidebar auto-collapse, header search)
const useViewportWidth = () => {
  const [w, setW] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
  React.useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
};

const Card = ({ children, style, onClick }) => {
  const interactive = !!onClick;
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const lifted = interactive && (hovered || focused);
  let boxShadow = lifted ? '0 4px 20px rgba(0,0,0,0.08)' : '0 2px 12px rgba(0,0,0,0.04)';
  if (focused) boxShadow += `, 0 0 0 2px ${T.primary}`;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } }) : undefined}
      onMouseEnter={interactive ? (() => setHovered(true)) : undefined}
      onMouseLeave={interactive ? (() => setHovered(false)) : undefined}
      onFocus={interactive ? (() => setFocused(true)) : undefined}
      onBlur={interactive ? (() => setFocused(false)) : undefined}
      style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
        boxShadow, padding: 24,
        cursor: interactive ? 'pointer' : 'default',
        outline: 'none',
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: lifted ? 'translateY(-2px)' : 'none',
        ...style
      }}>{children}</div>
  );
};

const Badge = ({ children, color = T.primary, bg, style }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    color: color, background: bg || color + '18',
    letterSpacing: '0.01em', ...style
  }}>{children}</span>
);

const Avatar = ({ initials, color = T.primary, size = 36, style }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: color + '20', color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, ...style
  }}>{initials}</div>
);

const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, style, icon }) => {
  const [hovered, setHovered] = React.useState(false);
  const sizes = { sm: { padding: '6px 14px', fontSize: 12 }, md: { padding: '9px 20px', fontSize: 13 }, lg: { padding: '12px 28px', fontSize: 14 } };
  const variants = {
    primary: { background: hovered ? T.primaryDark : T.primary, color: '#fff', border: 'none' },
    secondary: { background: hovered ? T.primaryLight : 'transparent', color: T.primary, border: `1.5px solid ${T.primary}` },
    ghost: { background: hovered ? T.bg : 'transparent', color: T.textSecondary, border: 'none' },
    danger: { background: hovered ? T.errorDark + 'E6' : T.errorDark, color: T.errorForeground, border: 'none' },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 8, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1, ...sizes[size], ...variants[variant], ...style
      }}>
      {icon && <Icon name={icon} size={14} color="currentColor" />}
      {children}
    </button>
  );
};

const ProgressBar = ({ value, color = T.primary, height = 6, style }) => {
  const pct = Math.min(value, 100);
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
      style={{ background: T.border, borderRadius: 99, height, overflow: 'hidden', ...style }}>
      <div style={{ width: '100%', height: '100%', background: color, borderRadius: 99, transformOrigin: 'left center', transform: `scaleX(${pct / 100})`, transition: 'transform 0.6s ease' }} />
    </div>
  );
};

const StatCard = ({ icon, iconColor, iconBg, label, value, trend, trendLabel, lang }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: 16
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: 12, flexShrink: 0,
      background: iconBg || iconColor + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon name={icon} size={24} color={iconColor} strokeWidth={1.6} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.textPrimary, lineHeight: 1 }}>{value}</div>
    </div>
    {trend !== undefined && (
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: trend >= 0 ? T.success : T.error }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{trendLabel}</div>
      </div>
    )}
  </div>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV_ITEMS = {
  teacher: [
    { id: 'dashboard', icon: 'home', vi: 'Tổng quan', en: 'Dashboard' },
    { id: 'feed', icon: 'newspaper', vi: 'Bảng tin', en: 'News Feed' },
    { id: 'classes', icon: 'grid', vi: 'Lớp học', en: 'Classes' },
    { id: 'attendance', icon: 'userCheck', vi: 'Điểm danh', en: 'Attendance' },
    { id: 'classlog', icon: 'fileText', vi: 'Sổ đầu bài', en: 'Class Log' },
    { id: 'discipline', icon: 'shield', vi: 'Vi phạm & Hạnh kiểm', en: 'Discipline', badge: 3 },
    { id: 'grades', icon: 'clipboard', vi: 'Bảng điểm', en: 'Grade Book' },
    { id: 'teaching-plan', icon: 'scrollText', vi: 'Kế hoạch giảng dạy', en: 'Teaching Plan' },
    { id: 'lesson-bank', icon: 'bookOpen', vi: 'Kho bài giảng', en: 'Lesson Bank' },
    { id: 'exam-bank', icon: 'clipboardList', vi: 'Kho đề thi', en: 'Exam Bank' },
    { id: 'schedule', icon: 'calendar', vi: 'Lịch dạy', en: 'Schedule' },
    { id: 'students', icon: 'users', vi: 'Học sinh', en: 'Students' },
    { id: 'notifications', icon: 'bell', vi: 'Thông báo', en: 'Notifications', badge: 5 },
    { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 3 },
    { id: 'settings', icon: 'settings', vi: 'Cài đặt', en: 'Settings' },
    { id: 'profile', icon: 'user', vi: 'Hồ sơ cá nhân', en: 'My Profile' },
  ],
  principal: [
    { id: 'dashboard', icon: 'home', vi: 'Tổng quan', en: 'Dashboard' },
    { id: 'feed', icon: 'newspaper', vi: 'Bảng tin', en: 'News Feed' },
    { id: 'school-setup', icon: 'building', vi: 'Thiết lập trường', en: 'School Setup' },
    { id: 'subject-parents', icon: 'layers', vi: 'Bộ môn', en: 'Departments' },
    { id: 'subjects', icon: 'bookOpen', vi: 'Môn học', en: 'Subjects' },
    { id: 'teachers', icon: 'userCheck', vi: 'Giáo viên', en: 'Teachers' },
    { id: 'classes', icon: 'grid', vi: 'Lớp học', en: 'Classes' },
    { id: 'roster', icon: 'clipboardList', vi: 'Danh sách lớp học', en: 'Student Roster' },
    { id: 'timetable', icon: 'calendar', vi: 'Thời khoá biểu', en: 'Timetable' },
    { id: 'teaching-plan', icon: 'scrollText', vi: 'Phê duyệt PPCT', en: 'Teaching Plans', badge: 2 },
    { id: 'lesson-bank', icon: 'bookOpen', vi: 'Kho bài giảng', en: 'Lesson Bank' },
    { id: 'exam-bank', icon: 'clipboardList', vi: 'Kho đề thi', en: 'Exam Bank' },
    { id: 'classlog', icon: 'fileText', vi: 'Sổ đầu bài', en: 'Class Log', badge: 2 },
    { id: 'discipline', icon: 'shield', vi: 'Vi phạm & Hạnh kiểm', en: 'Discipline' },
    { id: 'moderation', icon: 'flag', vi: 'Kiểm duyệt nội dung', en: 'Moderation', badge: 3 },
    { id: 'reports', icon: 'chart', vi: 'Báo cáo', en: 'Reports' },
    { id: 'calendar', icon: 'calendar', vi: 'Năm học & Học kỳ', en: 'Academic Calendar' },
    { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 2 },
    { id: 'notifications', icon: 'bell', vi: 'Thông báo', en: 'Notifications', badge: 3 },
    { id: 'settings', icon: 'settings', vi: 'Cài đặt', en: 'Settings' },
    { id: 'profile', icon: 'user', vi: 'Hồ sơ cá nhân', en: 'My Profile' },
  ],
  student: [
    { id: 'home', icon: 'home', vi: 'Tổng quan', en: 'Overview' },
    { id: 'feed', icon: 'newspaper', vi: 'Bảng tin', en: 'News Feed' },
    { id: 'courses', icon: 'bookOpen', vi: 'Khoá học', en: 'Courses' },
    { id: 'assignments', icon: 'clipboard', vi: 'Bài tập', en: 'Assignments' },
    { id: 'exams', icon: 'fileText', vi: 'Bài kiểm tra', en: 'Exams', badge: 1 },
    { id: 'grades', icon: 'award', vi: 'Điểm số', en: 'Grades' },
    { id: 'discipline', icon: 'shield', vi: 'Hạnh kiểm', en: 'Conduct' },
    { id: 'academic-record-view', icon: 'scrollText', vi: 'Học bạ của tôi', en: 'My Academic Record' },
    { id: 'schedule', icon: 'calendar', vi: 'Lịch học', en: 'Schedule' },
    { id: 'resources', icon: 'fileText', vi: 'Tài nguyên', en: 'Resources' },
    { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 2 },
    { id: 'profile', icon: 'user', vi: 'Hồ sơ cá nhân', en: 'My Profile' },
  ],
  parent: [
    { id: 'children', icon: 'users', vi: 'Học sinh', en: 'My Children' },
    { id: 'feed', icon: 'newspaper', vi: 'Bảng tin', en: 'News Feed' },
    { id: 'grades', icon: 'award', vi: 'Điểm số', en: 'Grades' },
    { id: 'academic-record-view', icon: 'scrollText', vi: 'Học bạ của con', en: "Child's Academic Record" },
    { id: 'conduct', icon: 'shield', vi: 'Hạnh kiểm của con', en: "Child's Conduct" },
    { id: 'schedule', icon: 'calendar', vi: 'Thời khoá biểu', en: 'Schedule' },
    { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 2 },
    { id: 'notifications', icon: 'bell', vi: 'Thông báo', en: 'Notifications', badge: 2 },
    { id: 'profile', icon: 'user', vi: 'Hồ sơ cá nhân', en: 'My Profile' },
  ],
};

const Sidebar = ({ role, activeSection, onNavigate, collapsed, onToggleCollapse, onLogout, user, lang, primaryColor, tenant }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const items = NAV_ITEMS[role] || NAV_ITEMS.teacher;
  const W = collapsed ? T.sidebarCollapsedWidth : T.sidebarWidth;
  const pColor = primaryColor || T.primary;

  const ROLE_LABELS = {
    teacher: { vi: 'Giáo viên', en: 'Teacher' },
    principal: { vi: 'Hiệu trưởng', en: 'Principal' },
    student: { vi: 'Học sinh', en: 'Student' },
    parent: { vi: 'Phụ huynh', en: 'Parent' },
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `${W}px`,
      transition: 'grid-template-columns 0.25s ease',
      flexShrink: 0, height: '100vh', position: 'relative', zIndex: 10,
    }}>
    <div style={{
      minWidth: 0, width: '100%', height: '100vh', background: T.card,
      borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        height: T.headerHeight, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 16px' : '0 20px', gap: 10, borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: pColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="school" size={20} color="#fff" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap' }}>
              {tenant ? (lang === 'en' ? tenant.nameEn : tenant.name) : t('THPT Nguyễn Du', 'Nguyen Du HS')}
            </div>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              EduPortal
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {!collapsed && (
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 20px 4px' }}>
            {t('Điều hướng', 'Navigation')}
          </div>
        )}
        {items.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              title={collapsed ? t(item.vi, item.en) : ''}
              aria-current={isActive ? 'page' : undefined}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.bg; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? pColor + '12' : 'transparent'; }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 12, padding: collapsed ? '10px 0' : '9px 20px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? pColor + '12' : 'transparent',
                border: 'none', cursor: 'pointer', borderRadius: collapsed ? 0 : 0,
                position: 'relative', transition: 'background 0.15s',
                marginBottom: 2,
              }}>
              {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: pColor, borderRadius: '0 3px 3px 0' }} />}
              <Icon name={item.icon} size={18} color={isActive ? pColor : T.textSecondary} strokeWidth={isActive ? 2.2 : 1.8} />
              {!collapsed && (
                <span style={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? pColor : T.textSecondary, flex: 1, textAlign: 'left' }}>
                  {t(item.vi, item.en)}
                </span>
              )}
              {!collapsed && item.badge && (
                <span style={{ background: T.errorDark, color: T.errorForeground, borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', minWidth: 18 }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: collapsed ? '12px 0' : '12px 16px', flexShrink: 0 }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', marginBottom: 4 }}>
            <Avatar initials={user.avatar} color={pColor} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lang === 'en' ? user.nameEn || user.name : user.name}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{t(ROLE_LABELS[role]?.vi, ROLE_LABELS[role]?.en)}</div>
            </div>
          </div>
        )}
        <button onClick={onLogout} title={collapsed ? t('Đăng xuất', 'Logout') : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '8px', border: 'none', background: 'transparent',
            cursor: 'pointer', borderRadius: 8, color: T.textMuted,
            fontSize: 13, fontWeight: 500, transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Icon name="logout" size={16} color={T.textMuted} />
          {!collapsed && t('Đăng xuất', 'Logout')}
        </button>
      </div>

      {/* Collapse toggle */}
      <button onClick={onToggleCollapse}
        aria-label={collapsed ? t('Mở rộng thanh điều hướng', 'Expand navigation') : t('Thu gọn thanh điều hướng', 'Collapse navigation')}
        aria-expanded={!collapsed}
        style={{
          position: 'absolute', top: 18, right: collapsed ? '50%' : -12,
          transform: collapsed ? 'translateX(50%)' : 'none',
          width: 24, height: 24, borderRadius: '50%',
          background: T.card, border: `1px solid ${T.border}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 20, transition: 'right 0.25s',
        }}>
        <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={12} color={T.textSecondary} />
      </button>
    </div>
    </div>
  );
};

// ── Header ───────────────────────────────────────────────────────────────────

const Header = ({ title, subtitle, user, role, notifCount = 5, lang, primaryColor, onRoleChange, tenants, activeTenant, onOpenTenantSwitch }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [showDropdown, setShowDropdown] = React.useState(false);
  const pColor = primaryColor || T.primary;
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!showDropdown) return;
    const onDocMouseDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowDropdown(false); };
    const onKeyDown = (e) => { if (e.key === 'Escape') setShowDropdown(false); };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showDropdown]);
  const ROLE_LABELS = {
    teacher: { vi: 'Giáo viên', en: 'Teacher' },
    principal: { vi: 'Hiệu trưởng', en: 'Principal' },
    student: { vi: 'Học sinh', en: 'Student' },
    parent: { vi: 'Phụ huynh', en: 'Parent' },
  };
  const vw = useViewportWidth();

  return (
    <div style={{
      height: T.headerHeight, background: T.card, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
      </div>

      {/* Search — ẩn dưới 900px (responsive shell) */}
      {vw >= 900 && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '7px 14px', width: 220,
      }}>
        <Icon name="search" size={14} color={T.textMuted} />
        <input aria-label={t('Tìm kiếm', 'Search')} placeholder={t('Tìm kiếm...', 'Search...')} style={{
          border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit',
        }} />
      </div>
      )}

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button
          aria-label={notifCount > 0 ? t(`Thông báo (${notifCount} mới)`, `Notifications (${notifCount} new)`) : t('Thông báo', 'Notifications')}
          style={{
          width: 38, height: 38, borderRadius: 10, background: T.bg, border: `1px solid ${T.border}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="bell" size={16} color={T.textSecondary} />
        </button>
        {notifCount > 0 && (
          <div aria-hidden="true" style={{
            position: 'absolute', top: -4, right: -4, width: 18, height: 18,
            background: T.errorDark, borderRadius: '50%', fontSize: 10, fontWeight: 700,
            color: T.errorForeground, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{notifCount}</div>
        )}
      </div>

      {/* Avatar + dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button onClick={() => setShowDropdown(d => !d)}
          aria-haspopup="menu" aria-expanded={showDropdown}
          aria-label={t('Tài khoản và đổi vai trò', 'Account and switch role')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Avatar initials={user.avatar} color={pColor} size={34} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
              {lang === 'en' ? user.nameEn || user.name : user.name}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{t(ROLE_LABELS[role]?.vi, ROLE_LABELS[role]?.en)}</div>
          </div>
          <Icon name="chevronDown" size={14} color={T.textMuted} />
        </button>
        {showDropdown && (
          <div role="menu" aria-label={t('Đổi vai trò', 'Switch role')} style={{
            position: 'absolute', right: 0, top: 48, background: T.card,
            border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            padding: 8, minWidth: 220, zIndex: 100,
          }}>
            {/* P7 — khối trường hiện tại (multi-tenant) */}
            {activeTenant && (
              <div style={{ padding: '8px 10px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {typeof TenantLogo !== 'undefined' && <TenantLogo tenant={activeTenant} size={36} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lang === 'en' ? activeTenant.nameEn : activeTenant.name}
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <Badge color={activeTenant.roleColor} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {lang === 'en' ? activeTenant.roleEn : activeTenant.roleVi}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            {activeTenant && tenants && tenants.length >= 2 && onOpenTenantSwitch && (
              <button role="menuitem" onClick={() => { setShowDropdown(false); onOpenTenantSwitch(); }}
                style={{
                  width: '100%', padding: '9px 12px', background: 'transparent',
                  border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
                  fontSize: 13, fontWeight: 600, color: T.textPrimary,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Icon name="switchHorizontal" size={14} color={T.textSecondary} strokeWidth={2} />
                {t('Đổi trường', 'Switch school')}
              </button>
            )}
            {activeTenant && <div role="separator" style={{ height: 1, background: T.border, margin: '6px 4px' }} />}
            {[['teacher', '👩‍🏫 Giáo viên / Teacher'], ['principal', '🏫 Hiệu trưởng / Principal'], ['student', '🎓 Học sinh / Student'], ['parent', '👨‍👩‍👦 Phụ huynh / Parent']].map(([r, label]) => (
              <button key={r} onClick={() => { onRoleChange(r); setShowDropdown(false); }}
                role="menuitemradio" aria-checked={role === r}
                style={{
                  width: '100%', padding: '9px 12px', background: role === r ? pColor + '12' : 'transparent',
                  border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
                  fontSize: 13, fontWeight: role === r ? 700 : 500, color: role === r ? pColor : T.textPrimary,
                }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Report content dialog — dùng chung cho post / comment / message ──────────────
const REPORT_REASONS = [
  { id: 'spam', vi: 'Spam', en: 'Spam' },
  { id: 'language', vi: 'Ngôn từ không phù hợp', en: 'Inappropriate language' },
  { id: 'bully', vi: 'Bắt nạt', en: 'Bullying' },
  { id: 'misinfo', vi: 'Thông tin sai', en: 'Misinformation' },
  { id: 'other', vi: 'Khác', en: 'Other' },
];

const ReportContentDialog = ({ target, onClose, onSubmit, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [reason, setReason] = React.useState(null);
  const [note, setNote] = React.useState('');
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    const prev = document.activeElement;
    const el = dialogRef.current;
    if (el) { const f = el.querySelector('input, button, textarea'); if (f) f.focus(); }
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll('button:not([disabled]), input, textarea');
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);

  const kindLabel = ({ post: t('bài viết', 'post'), comment: t('bình luận', 'comment'), message: t('tin nhắn', 'message') })[target.kind] || t('nội dung', 'content');
  const valid = !!reason && (reason !== 'other' || !!note.trim());

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000, padding: 20,
    }}>
      <div ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="report-dialog-title"
        style={{
          background: T.card, borderRadius: 14, width: '100%', maxWidth: 430,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}>
        <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.warningLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="flag" size={16} color={T.warning} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="report-dialog-title" style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Báo cáo nội dung', 'Report content')}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
              {t(`Báo cáo ${kindLabel} của ${target.authorName}`, `Report a ${kindLabel} by ${target.authorName}`)}
            </div>
          </div>
          <button onClick={onClose} aria-label={t('Đóng', 'Close')}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: T.bg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="x" size={13} color={T.textMuted} />
          </button>
        </div>

        <div style={{ overflowY: 'auto' }}>
          {/* Quote preview của nội dung bị báo cáo */}
          <div style={{ margin: '14px 22px 0', padding: '10px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 3 }}>{target.authorName}</div>
            <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {target.text}
            </div>
          </div>

          {/* Lý do */}
          <div role="radiogroup" aria-label={t('Lý do báo cáo', 'Report reason')}
            style={{ padding: '14px 22px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {REPORT_REASONS.map(r => {
              const active = reason === r.id;
              return (
                <label key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
                  cursor: 'pointer', border: `1.5px solid ${active ? pColor : T.border}`,
                  background: active ? pColor + '0D' : 'transparent', transition: 'all 0.15s',
                }}>
                  <input type="radio" name="report-reason" value={r.id} checked={active}
                    onChange={() => setReason(r.id)} style={{ accentColor: pColor }} />
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? pColor : T.textPrimary }}>{t(r.vi, r.en)}</span>
                </label>
              );
            })}
            {reason === 'other' && (
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                aria-label={t('Mô tả lý do báo cáo', 'Describe the reason')}
                placeholder={t('Mô tả cụ thể vấn đề…', 'Describe the issue…')}
                style={{
                  width: '100%', border: `1px solid ${T.border}`, borderRadius: 9, padding: '9px 12px',
                  fontSize: 12.5, fontFamily: 'inherit', color: T.textPrimary, background: T.bg,
                  outline: 'none', resize: 'vertical', marginTop: 2, lineHeight: 1.5,
                }} />
            )}
          </div>
        </div>

        <div style={{ padding: '12px 22px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Hủy', 'Cancel')}
          </Button>
          <Button size="sm" icon="flag" disabled={!valid} onClick={() => valid && onSubmit({ reason, note: note.trim() })}>
            {t('Gửi báo cáo', 'Send report')}
          </Button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Card, Badge, Avatar, Button, ProgressBar, StatCard, Sidebar, Header, ReportContentDialog, REPORT_REASONS, useViewportWidth });
