// ── Shared UI primitives ──────────────────────────────────────────────────────

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s, transform 0.2s',
    ...(onClick && { ':hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }),
    ...style
  }}>{children}</div>
);

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
    danger: { background: hovered ? '#e0745a' : T.error, color: '#fff', border: 'none' },
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

const ProgressBar = ({ value, color = T.primary, height = 6, style }) => (
  <div style={{ background: T.border, borderRadius: 99, height, overflow: 'hidden', ...style }}>
    <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
  </div>
);

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
    { id: 'reports', icon: 'chart', vi: 'Báo cáo', en: 'Reports' },
    { id: 'calendar', icon: 'calendar', vi: 'Năm học & Học kỳ', en: 'Academic Calendar' },
    { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 2 },
    { id: 'notifications', icon: 'bell', vi: 'Thông báo', en: 'Notifications', badge: 3 },
    { id: 'settings', icon: 'settings', vi: 'Cài đặt', en: 'Settings' },
    { id: 'profile', icon: 'user', vi: 'Hồ sơ cá nhân', en: 'My Profile' },
  ],
  student: [
    { id: 'home', icon: 'home', vi: 'Tổng quan', en: 'Overview' },
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
    { id: 'grades', icon: 'award', vi: 'Điểm số', en: 'Grades' },
    { id: 'academic-record-view', icon: 'scrollText', vi: 'Học bạ của con', en: "Child's Academic Record" },
    { id: 'conduct', icon: 'shield', vi: 'Hạnh kiểm của con', en: "Child's Conduct" },
    { id: 'schedule', icon: 'calendar', vi: 'Thời khoá biểu', en: 'Schedule' },
    { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 2 },
    { id: 'notifications', icon: 'bell', vi: 'Thông báo', en: 'Notifications', badge: 2 },
    { id: 'profile', icon: 'user', vi: 'Hồ sơ cá nhân', en: 'My Profile' },
  ],
};

const Sidebar = ({ role, activeSection, onNavigate, collapsed, onToggleCollapse, onLogout, user, lang, primaryColor }) => {
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
      width: W, flexShrink: 0, height: '100vh', background: T.card,
      borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease', overflow: 'hidden', position: 'relative', zIndex: 10,
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
              {t('THPT Nguyễn Du', 'Nguyen Du HS')}
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
                <span style={{ background: T.error, color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', minWidth: 18 }}>
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
  );
};

// ── Header ───────────────────────────────────────────────────────────────────

const Header = ({ title, subtitle, user, role, notifCount = 5, lang, primaryColor, onRoleChange }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [showDropdown, setShowDropdown] = React.useState(false);
  const pColor = primaryColor || T.primary;
  const ROLE_LABELS = {
    teacher: { vi: 'Giáo viên', en: 'Teacher' },
    principal: { vi: 'Hiệu trưởng', en: 'Principal' },
    student: { vi: 'Học sinh', en: 'Student' },
    parent: { vi: 'Phụ huynh', en: 'Parent' },
  };

  return (
    <div style={{
      height: T.headerHeight, background: T.card, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>{subtitle}</div>}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '7px 14px', width: 220,
      }}>
        <Icon name="search" size={14} color={T.textMuted} />
        <input placeholder={t('Tìm kiếm...', 'Search...')} style={{
          border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit',
        }} />
      </div>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button style={{
          width: 38, height: 38, borderRadius: 10, background: T.bg, border: `1px solid ${T.border}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="bell" size={16} color={T.textSecondary} />
        </button>
        {notifCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4, width: 18, height: 18,
            background: T.error, borderRadius: '50%', fontSize: 10, fontWeight: 700,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{notifCount}</div>
        )}
      </div>

      {/* Avatar + dropdown */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowDropdown(d => !d)}
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
          <div style={{
            position: 'absolute', right: 0, top: 48, background: T.card,
            border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            padding: 8, minWidth: 180, zIndex: 100,
          }}>
            {[['teacher', '👩‍🏫 Giáo viên / Teacher'], ['principal', '🏫 Hiệu trưởng / Principal'], ['student', '🎓 Học sinh / Student'], ['parent', '👨‍👩‍👦 Phụ huynh / Parent']].map(([r, label]) => (
              <button key={r} onClick={() => { onRoleChange(r); setShowDropdown(false); }}
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

Object.assign(window, { Card, Badge, Avatar, Button, ProgressBar, StatCard, Sidebar, Header });
