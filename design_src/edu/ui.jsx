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
      onKeyDown={interactive ? (e) => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();onClick(e);}} : undefined}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
      onFocus={interactive ? () => setFocused(true) : undefined}
      onBlur={interactive ? () => setFocused(false) : undefined}
      style={{
        background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
        boxShadow, padding: 24,
        cursor: interactive ? 'pointer' : 'default',
        outline: 'none',
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: lifted ? 'translateY(-2px)' : 'none',
        ...style
      }}>{children}</div>);

};

const Badge = ({ children, color = T.primary, bg, style }) =>
<span style={{
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  color: color, background: bg || color + '18',
  letterSpacing: '0.01em', ...style
}}>{children}</span>;


const Avatar = ({ initials, color = T.primary, size = 36, style }) =>
<div style={{
  width: size, height: size, borderRadius: '50%',
  background: color + '20', color: color,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, ...style
}}>{initials}</div>;


const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, style, icon }) => {
  const [hovered, setHovered] = React.useState(false);
  const sizes = { sm: { padding: '6px 14px', fontSize: 12 }, md: { padding: '9px 20px', fontSize: 13 }, lg: { padding: '12px 28px', fontSize: 14 } };
  const variants = {
    primary: { background: hovered ? T.primaryDark : T.primary, color: '#fff', border: 'none' },
    secondary: { background: hovered ? T.primaryLight : 'transparent', color: T.primary, border: `1.5px solid ${T.primary}` },
    ghost: { background: hovered ? T.bg : 'transparent', color: T.textSecondary, border: 'none' },
    danger: { background: hovered ? T.errorDark + 'E6' : T.errorDark, color: T.errorForeground, border: 'none' }
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
    </button>);

};

const ProgressBar = ({ value, color = T.primary, height = 6, style }) => {
  const pct = Math.min(value, 100);
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
    style={{ background: T.border, borderRadius: 99, height, overflow: 'hidden', ...style }}>
      <div style={{ width: '100%', height: '100%', background: color, borderRadius: 99, transformOrigin: 'left center', transform: `scaleX(${pct / 100})`, transition: 'transform 0.6s ease' }} />
    </div>);

};

const StatCard = ({ icon, iconColor, iconBg, label, value, trend, trendLabel, lang }) =>
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
    {trend !== undefined &&
  <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: trend >= 0 ? T.success : T.error }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{trendLabel}</div>
      </div>
  }
  </div>;


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
  { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 3 },
  { id: 'settings', icon: 'settings', vi: 'Cài đặt', en: 'Settings' }],

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
  { id: 'settings', icon: 'settings', vi: 'Cài đặt', en: 'Settings' }],

  student: [
  { id: 'home', icon: 'home', vi: 'Tổng quan', en: 'Overview' },
  { id: 'feed', icon: 'newspaper', vi: 'Bảng tin', en: 'News Feed' },
  { id: 'courses', icon: 'bookOpen', vi: 'Khoá học', en: 'Courses' },
  { id: 'grades', icon: 'award', vi: 'Điểm số', en: 'Grades' },
  { id: 'discipline', icon: 'shield', vi: 'Hạnh kiểm', en: 'Conduct' },
  { id: 'attendance', icon: 'userCheck', vi: 'Chuyên cần', en: 'Attendance' },
  { id: 'academic-record-view', icon: 'scrollText', vi: 'Học bạ của tôi', en: 'My Academic Record' },
  { id: 'schedule', icon: 'calendar', vi: 'Lịch học', en: 'Schedule' },
  { id: 'resources', icon: 'fileText', vi: 'Tài nguyên', en: 'Resources' },
  { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 2 }],

  parent: [
  { id: 'children', icon: 'users', vi: 'Học sinh', en: 'My Children' },
  { id: 'feed', icon: 'newspaper', vi: 'Bảng tin', en: 'News Feed' },
  { id: 'grades', icon: 'award', vi: 'Điểm số', en: 'Grades' },
  { id: 'academic-record-view', icon: 'scrollText', vi: 'Học bạ của con', en: "Child's Academic Record" },
  { id: 'conduct', icon: 'shield', vi: 'Hạnh kiểm của con', en: "Child's Conduct" },
  { id: 'attendance', icon: 'userCheck', vi: 'Chuyên cần của con', en: "Child's Attendance" },
  { id: 'schedule', icon: 'calendar', vi: 'Thời khoá biểu', en: 'Schedule' },
  { id: 'messaging', icon: 'message', vi: 'Nhắn tin', en: 'Messages', badge: 2 }]

};

const Sidebar = ({ role, activeSection, onNavigate, collapsed, onToggleCollapse, onLogout, onOpenHelp, user, lang, primaryColor, tenant }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const items = NAV_ITEMS[role] || NAV_ITEMS.teacher;
  const W = collapsed ? T.sidebarCollapsedWidth : T.sidebarWidth;
  const pColor = primaryColor || T.primary;

  const ROLE_LABELS = {
    teacher: { vi: 'Giáo viên', en: 'Teacher' },
    principal: { vi: 'Hiệu trưởng', en: 'Principal' },
    student: { vi: 'Học sinh', en: 'Student' },
    parent: { vi: 'Phụ huynh', en: 'Parent' }
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `${W}px`,
      transition: 'grid-template-columns 0.25s ease',
      flexShrink: 0, height: '100vh', position: 'relative', zIndex: 10
    }}>
    <div style={{
        minWidth: 0, width: '100%', height: '100vh', background: T.card,
        borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
      {/* Logo */}
      <div style={{
          height: T.headerHeight, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 16px' : '0 20px', gap: 10, borderBottom: `1px solid ${T.border}`,
          flexShrink: 0
        }}>
        <div style={{
            width: 36, height: 36, borderRadius: 10, background: pColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
          <Icon name="school" size={20} color="#fff" strokeWidth={2} />
        </div>
        {!collapsed &&
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap' }}>
              {tenant ? lang === 'en' ? tenant.nameEn : tenant.name : t('THPT Nguyễn Du', 'Nguyen Du HS')}
            </div>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              EduPortal
            </div>
          </div>
          }
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {!collapsed &&
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 20px 4px' }}>
            {t('Điều hướng', 'Navigation')}
          </div>
          }
        {items.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
              title={collapsed ? t(item.vi, item.en) : ''}
              aria-current={isActive ? 'page' : undefined}
              onMouseEnter={(e) => {if (!isActive) e.currentTarget.style.background = T.bg;}}
              onMouseLeave={(e) => {if (!isActive) e.currentTarget.style.background = isActive ? pColor + '12' : 'transparent';}}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 12, padding: collapsed ? '10px 0' : '9px 20px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? pColor + '12' : 'transparent',
                border: 'none', cursor: 'pointer', borderRadius: collapsed ? 0 : 0,
                position: 'relative', transition: 'background 0.15s',
                marginBottom: 2
              }}>
              {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: pColor, borderRadius: '0 3px 3px 0' }} />}
              <Icon name={item.icon} size={18} color={isActive ? pColor : T.textSecondary} strokeWidth={isActive ? 2.2 : 1.8} />
              {!collapsed &&
                <span style={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? pColor : T.textSecondary, flex: 1, textAlign: 'left' }}>
                  {t(item.vi, item.en)}
                </span>
                }
              {!collapsed && item.badge &&
                <span style={{ background: T.errorDark, color: T.errorForeground, borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', minWidth: 18 }}>
                  {item.badge}
                </span>
                }
            </button>);

          })}
      </nav>

      {/* Quick options: help / collapse */}
      <div style={{ padding: '10px 0', flexShrink: 0 }}>
        <button onClick={onOpenHelp} title={collapsed ? t('Hướng dẫn sử dụng', 'User guide') : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '9px 20px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 2, transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Icon name="helpCircle" size={18} color={T.textSecondary} strokeWidth={1.8} />
          {!collapsed && <span style={{ fontSize: 13.5, fontWeight: 500, color: T.textSecondary }}>{t('Hướng dẫn sử dụng', 'User guide')}</span>}
        </button>
        <div role="separator" style={{ height: 1, background: T.border, margin: '8px 20px' }} />
        <button onClick={onToggleCollapse} title={collapsed ? t('Mở rộng', 'Expand') : ''}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '9px 20px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={18} color={pColor} strokeWidth={2} />
          {!collapsed && <span style={{ fontSize: 13.5, fontWeight: 700, color: pColor }}>{t('Thu gọn', 'Collapse')}</span>}
        </button>
      </div>
    </div>
    </div>);

};

// ── Notification dropdown (bell) — tabs: Tất cả / Chưa đọc / Hệ thống ──────────
const NOTIF_ITEMS = [
{ icon: 'userCheck', color: '#FA896B', vi: 'Nguyễn Minh Khoa vắng không phép Tiết 3–5 hôm nay', en: 'Nguyễn Minh Khoa absent (unexcused) periods 3–5 today', time: '10 phút', timeEn: '10m', unread: true, sys: false },
{ icon: 'fileText', color: '#5D87FF', vi: 'Đơn xin phép nghỉ của PH lớp 11A2 đang chờ duyệt', en: 'Parent excuse request for 11A2 pending approval', time: '1 giờ', timeEn: '1h', unread: true, sys: false },
{ icon: 'barChart', color: '#13DEB9', vi: 'Điểm kiểm tra giữa kỳ Khối 11 đã được phê duyệt', en: 'Grade 11 midterm scores approved', time: '3 giờ', timeEn: '3h', unread: true, sys: false },
{ icon: 'calendar', color: '#FFAE1F', vi: 'Lịch coi thi cuối kỳ II đã được phân công', en: 'Final exam proctoring schedule assigned', time: 'Hôm qua', timeEn: '1d', unread: false, sys: false },
{ icon: 'shield', color: '#9C6ADE', vi: 'Hệ thống bảo trì 22:00–23:00 tối nay', en: 'System maintenance 22:00–23:00 tonight', time: 'Hôm qua', timeEn: '1d', unread: false, sys: true },
{ icon: 'info', color: '#5D87FF', vi: 'Phiên bản mới: tổng hợp chuyên cần theo học kỳ', en: 'New: per-semester attendance summary', time: '2 ngày', timeEn: '2d', unread: false, sys: true }];


const NotifDropdown = ({ lang, pColor, onClose, onViewAll }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [tab, setTab] = React.useState('all');
  const [read, setRead] = React.useState([]);
  const tabs = [
  { id: 'all', vi: 'Tất cả', en: 'All' },
  { id: 'unread', vi: 'Chưa đọc', en: 'Unread' },
  { id: 'sys', vi: 'Hệ thống', en: 'System' }];

  const items = NOTIF_ITEMS.map((n, i) => ({ ...n, idx: i, unread: n.unread && !read.includes(i) })).
  filter((n) => tab === 'all' ? true : tab === 'unread' ? n.unread : n.sys);
  const unreadCount = NOTIF_ITEMS.filter((n, i) => n.unread && !read.includes(i)).length;

  return (
    <div role="menu" aria-label={t('Thông báo', 'Notifications')} style={{
      position: 'absolute', top: 46, right: 0, width: 360, background: T.card,
      border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
      zIndex: 9000, overflow: 'hidden'
    }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{t('Thông báo', 'Notifications')}</div>
        {unreadCount > 0 &&
        <button onClick={() => setRead(NOTIF_ITEMS.map((_, i) => i))}
        style={{ background: 'none', border: 'none', color: pColor, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            {t('Đánh dấu đã đọc', 'Mark all read')}
          </button>
        }
      </div>
      <div style={{ display: 'flex', gap: 4, padding: '10px 18px 0', borderBottom: `1px solid ${T.border}` }}>
        {tabs.map((tb) =>
        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
          padding: '7px 12px 9px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 12.5, fontWeight: tab === tb.id ? 700 : 500,
          color: tab === tb.id ? pColor : T.textMuted,
          borderBottom: `2px solid ${tab === tb.id ? pColor : 'transparent'}`, marginBottom: -1
        }}>
            {t(tb.vi, tb.en)}
            {tb.id === 'unread' && unreadCount > 0 && <span style={{ marginLeft: 5, fontSize: 10.5, fontWeight: 700, color: '#fff', background: T.errorDark, borderRadius: 8, padding: '1px 6px' }}>{unreadCount}</span>}
          </button>
        )}
      </div>
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {items.length === 0 && <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 12.5, color: T.textMuted }}>{t('Không có thông báo nào', 'No notifications')}</div>}
        {items.map((n) =>
        <button key={n.idx} role="menuitem" onClick={() => setRead((r) => r.includes(n.idx) ? r : [...r, n.idx])} style={{
          display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left',
          padding: '12px 18px', border: 'none', borderBottom: `1px solid ${T.border}`,
          background: n.unread ? pColor + '08' : 'transparent', cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
        onMouseLeave={(e) => e.currentTarget.style.background = n.unread ? pColor + '08' : 'transparent'}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: n.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={n.icon} size={14} color={n.color} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: T.textPrimary, fontWeight: n.unread ? 700 : 500, lineHeight: 1.45 }}>{t(n.vi, n.en)}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{lang === 'en' ? n.timeEn + ' ago' : n.time + ' trước'}</div>
            </div>
            {n.unread && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: pColor, flexShrink: 0, marginTop: 5 }} />}
          </button>
        )}
      </div>
      <button onClick={onViewAll} style={{
        display: 'block', width: '100%', padding: '11px 0', border: 'none', borderTop: `1px solid ${T.border}`,
        background: T.bg, color: pColor, fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
      }}>
        {t('Xem tất cả thông báo', 'View all notifications')}
      </button>
    </div>);

};

// ── Header ───────────────────────────────────────────────────────────────────

const Header = ({ title, subtitle, user, role, notifCount = 5, lang, primaryColor, onRoleChange, onNavigate, tenants, activeTenant, onOpenTenantSwitch, darkMode, onToggleDarkMode, onSetLang, onLogout }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showNotif, setShowNotif] = React.useState(false);
  const notifRef = React.useRef(null);
  React.useEffect(() => {
    if (!showNotif) return;
    const onDocMouseDown = (e) => {if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);};
    const onKeyDown = (e) => {if (e.key === 'Escape') setShowNotif(false);};
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {document.removeEventListener('mousedown', onDocMouseDown);document.removeEventListener('keydown', onKeyDown);};
  }, [showNotif]);
  const pColor = primaryColor || T.primary;
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!showDropdown) return;
    const onDocMouseDown = (e) => {if (menuRef.current && !menuRef.current.contains(e.target)) setShowDropdown(false);};
    const onKeyDown = (e) => {if (e.key === 'Escape') setShowDropdown(false);};
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
    parent: { vi: 'Phụ huynh', en: 'Parent' }
  };
  const vw = useViewportWidth();

  return (
    <div style={{
      height: T.headerHeight, background: T.card, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
      </div>

      {/* Search — ẩn dưới 900px (responsive shell) */}
      {vw >= 900 &&
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '7px 14px', width: 220
      }}>
        <Icon name="search" size={14} color={T.textMuted} />
        <input aria-label={t('Tìm kiếm', 'Search')} placeholder={t('Tìm kiếm...', 'Search...')} style={{
          border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit'
        }} />
      </div>
      }

      {/* Notifications */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowNotif((v) => !v)}
          aria-haspopup="menu" aria-expanded={showNotif}
          aria-label={notifCount > 0 ? t(`Thông báo (${notifCount} mới)`, `Notifications (${notifCount} new)`) : t('Thông báo', 'Notifications')}
          style={{
            width: 38, height: 38, borderRadius: 10, background: showNotif ? pColor + '12' : T.bg, border: `1px solid ${showNotif ? pColor : T.border}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <Icon name="bell" size={16} color={showNotif ? pColor : T.textSecondary} />
        </button>
        {notifCount > 0 &&
        <div aria-hidden="true" style={{
          position: 'absolute', top: -4, right: -4, width: 18, height: 18,
          background: T.errorDark, borderRadius: '50%', fontSize: 10, fontWeight: 700,
          color: T.errorForeground, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none'
        }}>{notifCount}</div>
        }
        {showNotif && <NotifDropdown lang={lang} pColor={pColor} role={role}
        onClose={() => setShowNotif(false)}
        onViewAll={() => {setShowNotif(false);onNavigate && onNavigate('notifications');}} />}
      </div>

      {/* Avatar + dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button onClick={() => setShowDropdown((d) => !d)}
        aria-haspopup="menu" aria-expanded={showDropdown}
        aria-label={t('Tài khoản và đổi vai trò', 'Account and switch role')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          background: 'transparent', border: 'none', padding: '4px 8px', borderRadius: 10
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          
          <Avatar initials={user.avatar} color={pColor} size={34} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
              {lang === 'en' ? user.nameEn || user.name : user.name}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{t(ROLE_LABELS[role]?.vi, ROLE_LABELS[role]?.en)}</div>
          </div>
          <Icon name="chevronDown" size={14} color={T.textMuted} />
        </button>
        {showDropdown &&
        <div role="menu" aria-label={t('Đổi vai trò', 'Switch role')} style={{
          position: 'absolute', right: 0, top: 48, background: T.card,
          border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          padding: 8, minWidth: 220, zIndex: 100
        }}>
            {/* P7 — khối trường hiện tại (multi-tenant) */}
            {activeTenant &&
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
          }
            {activeTenant && tenants && tenants.length >= 2 && onOpenTenantSwitch &&
          <button role="menuitem" onClick={() => {setShowDropdown(false);onOpenTenantSwitch();}}
          style={{
            width: '100%', padding: '9px 12px', background: 'transparent',
            border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
            fontSize: 13, fontWeight: 600, color: T.textPrimary,
            display: 'flex', alignItems: 'center', gap: 8
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Icon name="switchHorizontal" size={14} color={T.textSecondary} strokeWidth={2} />
                {t('Đổi trường', 'Switch school')}
              </button>
          }
            {activeTenant && <div role="separator" style={{ height: 1, background: T.border, margin: '6px 4px' }} />}
            {onNavigate &&
          <button role="menuitem" onClick={() => {setShowDropdown(false);onNavigate('profile');}}
          style={{
            width: '100%', padding: '9px 12px', background: 'transparent',
            border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
            fontSize: 13, fontWeight: 600, color: T.textPrimary,
            display: 'flex', alignItems: 'center', gap: 8
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Icon name="user" size={14} color={T.textSecondary} strokeWidth={2} />
                {t('Hồ sơ cá nhân', 'My Profile')}
              </button>
          }
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="moon" size={14} color={T.textSecondary} strokeWidth={2} />
                {t('Chế độ tối', 'Dark mode')}
              </span>
              <button role="switch" aria-checked={!!darkMode} aria-label={t('Chế độ tối', 'Dark mode')}
            onClick={() => onToggleDarkMode && onToggleDarkMode()}
            style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: darkMode ? pColor : T.border, position: 'relative', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: darkMode ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
              </button>
            </div>
            <div style={{ padding: '9px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon name="globe" size={14} color={T.textSecondary} strokeWidth={2} />
                {t('Ngôn ngữ', 'Language')}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ id: 'vi', label: 'Tiếng Việt' }, { id: 'en', label: 'English' }].map((l) =>
              <button key={l.id} onClick={() => onSetLang && onSetLang(l.id)}
              style={{
                flex: 1, padding: '6px 8px', border: `1.5px solid ${lang === l.id ? pColor : T.border}`,
                borderRadius: 7, background: lang === l.id ? pColor + '12' : 'transparent',
                color: lang === l.id ? pColor : T.textSecondary, fontSize: 12, fontWeight: lang === l.id ? 700 : 500, cursor: 'pointer'
              }}>{l.label}</button>
              )}
              </div>
            </div>
            <div role="separator" style={{ height: 1, background: T.border, margin: '6px 4px' }} />
            {[['teacher', '👩‍🏫 Giáo viên / Teacher'], ['principal', '🏫 Hiệu trưởng / Principal'], ['student', '🎓 Học sinh / Student'], ['parent', '👨‍👩‍👦 Phụ huynh / Parent']].map(([r, label]) =>
          <button key={r} onClick={() => {onRoleChange(r);setShowDropdown(false);}}
          role="menuitemradio" aria-checked={role === r}
          style={{
            width: '100%', padding: '9px 12px', background: role === r ? pColor + '12' : 'transparent',
            border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
            fontSize: 13, fontWeight: role === r ? 700 : 500, color: role === r ? pColor : T.textPrimary
          }}>
                {label}
              </button>
          )}
            {onLogout &&
          <React.Fragment>
                <div role="separator" style={{ height: 1, background: T.border, margin: '6px 4px' }} />
                <button role="menuitem" onClick={() => {setShowDropdown(false);onLogout();}}
            style={{
              width: '100%', padding: '9px 12px', background: 'transparent',
              border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left',
              fontSize: 13, fontWeight: 600, color: T.error,
              display: 'flex', alignItems: 'center', gap: 8
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = T.errorLight}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <Icon name="logout" size={14} color={T.error} strokeWidth={2} />
                  {t('Đăng xuất', 'Logout')}
                </button>
              </React.Fragment>
          }
          </div>
        }
      </div>
    </div>);

};

// ── Report content dialog — dùng chung cho post / comment / message ──────────────
const REPORT_REASONS = [
{ id: 'spam', vi: 'Spam', en: 'Spam' },
{ id: 'language', vi: 'Ngôn từ không phù hợp', en: 'Inappropriate language' },
{ id: 'bully', vi: 'Bắt nạt', en: 'Bullying' },
{ id: 'misinfo', vi: 'Thông tin sai', en: 'Misinformation' },
{ id: 'other', vi: 'Khác', en: 'Other' }];


const ReportContentDialog = ({ target, onClose, onSubmit, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [reason, setReason] = React.useState(null);
  const [note, setNote] = React.useState('');
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    const prev = document.activeElement;
    const el = dialogRef.current;
    if (el) {const f = el.querySelector('input, button, textarea');if (f) f.focus();}
    const onKey = (e) => {
      if (e.key === 'Escape') {onClose();return;}
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll('button:not([disabled]), input, textarea');
        if (!focusables.length) return;
        const first = focusables[0],last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();} else
        if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('keydown', onKey);if (prev && prev.focus) prev.focus();};
  }, [onClose]);

  const kindLabel = { post: t('bài viết', 'post'), comment: t('bình luận', 'comment'), message: t('tin nhắn', 'message') }[target.kind] || t('nội dung', 'content');
  const valid = !!reason && (reason !== 'other' || !!note.trim());

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000, padding: 20
    }}>
      <div ref={dialogRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="report-dialog-title"
      style={{
        background: T.card, borderRadius: 14, width: '100%', maxWidth: 430,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column'
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
            {REPORT_REASONS.map((r) => {
              const active = reason === r.id;
              return (
                <label key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
                  cursor: 'pointer', border: `1.5px solid ${active ? pColor : T.border}`,
                  background: active ? pColor + '0D' : 'transparent', transition: 'all 0.15s'
                }}>
                  <input type="radio" name="report-reason" value={r.id} checked={active}
                  onChange={() => setReason(r.id)} style={{ accentColor: pColor }} />
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? pColor : T.textPrimary }}>{t(r.vi, r.en)}</span>
                </label>);

            })}
            {reason === 'other' &&
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            aria-label={t('Mô tả lý do báo cáo', 'Describe the reason')}
            placeholder={t('Mô tả cụ thể vấn đề…', 'Describe the issue…')}
            style={{
              width: '100%', border: `1px solid ${T.border}`, borderRadius: 9, padding: '9px 12px',
              fontSize: 12.5, fontFamily: 'inherit', color: T.textPrimary, background: T.bg,
              outline: 'none', resize: 'vertical', marginTop: 2, lineHeight: 1.5
            }} />
            }
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
    </div>);

};

Object.assign(window, { Card, Badge, Avatar, Button, ProgressBar, StatCard, Sidebar, Header, ReportContentDialog, REPORT_REASONS, useViewportWidth });