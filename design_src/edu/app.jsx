const App = () => {
  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "lang": "vi",
    "primaryColor": "#5D87FF"
  }/*EDITMODE-END*/;

  const [tweaks, setTweaksState] = React.useState(DEFAULTS);
  const [role, setRole] = React.useState(null);
  const [section, setSection] = React.useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [showTweaks, setShowTweaks] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);

  // Subject catalogue state (lifted so /admin/subjects and /admin/subjects/:id share data)
  const [subjectParents, setSubjectParents] = React.useState(SM_SEED_PARENTS);
  const [activeSubjectId, setActiveSubjectId] = React.useState(null);
  const openSubjectDetail = (id) => { setActiveSubjectId(id); setSection('subject-detail'); };
  const updateSubjectMaster = (next) => {
    setSubjectParents(list => list.map(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id === next.id ? { ...s, ...next } : s),
    })));
  };

  const setTweak = (key, val) => {
    setTweaksState(prev => {
      const next = typeof key === 'object' ? { ...prev, ...key } : { ...prev, [key]: val };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*');
      return next;
    });
  };

  // Tweaks protocol
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setShowTweaks(true);
      if (e.data?.type === '__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const { lang, primaryColor } = tweaks;
  const t = (vi, en) => lang === 'en' ? en : vi;

  const handleLogin = (r) => {
    setRole(r);
    const defaultSection = { teacher: 'dashboard', principal: 'dashboard', student: 'home', parent: 'children' };
    setSection(defaultSection[r] || 'dashboard');
  };

  const handleLogout = () => { setRole(null); setSection('dashboard'); };

  const handleNavigate = (sec) => setSection(sec);

  const handleRoleChange = (r) => {
    setRole(r);
    const defaultSection = { teacher: 'dashboard', principal: 'dashboard', student: 'home', parent: 'children' };
    setSection(defaultSection[r] || 'dashboard');
  };

  const getUser = () => {
    if (role === 'principal') return MOCK.principal;
    if (role === 'student') return MOCK.student;
    if (role === 'parent') return MOCK.parent;
    return MOCK.teacher;
  };

  const getHeaderTitle = () => {
    const profileTitle = t('Hồ sơ cá nhân', 'My Profile');
    const titles = {
      teacher: { dashboard: t('Tổng quan', 'Dashboard'), classes: t('Lớp học', 'Classes'), attendance: t('Điểm danh', 'Attendance'), classlog: t('Sổ đầu bài', 'Class Log'), discipline: t('Vi phạm & Hạnh kiểm', 'Discipline'), grades: t('Bảng điểm', 'Grade Book'), schedule: t('Lịch dạy', 'Schedule'), students: t('Học sinh', 'Students'), messaging: t('Nhắn tin', 'Messages'), notifications: t('Thông báo', 'Notifications'), settings: t('Cài đặt', 'Settings'), profile: profileTitle },
      principal: { dashboard: t('Tổng quan trường', 'School Overview'), 'school-setup': t('Thiết lập trường học', 'School Setup'), 'subject-parents': t('Bộ môn / Tổ chuyên môn', 'Subject Departments'), subjects: t('Danh mục môn học', 'Subject Catalogue'), 'subject-detail': t('Chi tiết môn học', 'Subject Detail'), teachers: t('Giáo viên', 'Teachers'), classes: t('Lớp học', 'Classes'), roster: t('Danh sách lớp học', 'Student Roster'), timetable: t('Thời khoá biểu', 'Timetable'), classlog: t('Sổ đầu bài', 'Class Log'), discipline: t('Vi phạm & Hạnh kiểm', 'Discipline'), reports: t('Báo cáo', 'Reports'), calendar: t('Cấu hình năm học', 'Academic Calendar'), messaging: t('Nhắn tin', 'Messages'), notifications: t('Thông báo', 'Notifications'), settings: t('Cài đặt', 'Settings'), profile: profileTitle },
      student: { home: t('Tổng quan', 'Overview'), courses: t('Khoá học', 'Courses'), assignments: t('Bài tập', 'Assignments'), exams: t('Bài kiểm tra & Thi', 'Exams & Quizzes'), grades: t('Điểm số', 'Grades'), discipline: t('Hạnh kiểm của tôi', 'My Conduct'), schedule: t('Lịch học', 'Schedule'), resources: t('Tài nguyên', 'Resources'), messaging: t('Nhắn tin', 'Messages'), profile: profileTitle },
      parent: { children: t('Học sinh của tôi', 'My Children'), grades: t('Điểm số', 'Grades'), schedule: t('Lịch học', 'Schedule'), messaging: t('Nhắn tin', 'Messages'), notifications: t('Thông báo', 'Notifications'), profile: profileTitle },
    };
    return (titles[role] || {})[section] || section;
  };

  const getHeaderSubtitle = () => {
    if (role === 'teacher') return t('THPT Nguyễn Du · Giáo viên Toán học', 'Nguyen Du HS · Mathematics Teacher');
    if (role === 'principal') return t('THPT Nguyễn Du · Năm học 2025–2026', 'Nguyen Du HS · Academic Year 2025–2026');
    if (role === 'student') return t('Lớp 11A2 · THPT Nguyễn Du', 'Class 11A2 · Nguyen Du HS');
    if (role === 'parent') return t('Phụ huynh · THPT Nguyễn Du', 'Parent · Nguyen Du HS');
    return '';
  };

  if (showForgotPassword) return (
    <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} lang={lang} primaryColor={primaryColor} />
  );

  if (!role) return (
    <div style={{ position: 'relative' }}>
      <LoginScreen onLogin={handleLogin} lang={lang} primaryColor={primaryColor} onForgotPassword={() => setShowForgotPassword(true)} />
      {showTweaks && <TweaksPanelUI tweaks={tweaks} setTweak={setTweak} onClose={() => { setShowTweaks(false); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); }} lang={lang} onRoleJump={handleLogin} />}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, overflow: 'hidden' }}>
      <Sidebar
        role={role}
        activeSection={section}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        onLogout={handleLogout}
        user={getUser()}
        lang={lang}
        primaryColor={primaryColor}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          user={getUser()}
          role={role}
          notifCount={role === 'teacher' ? 5 : role === 'principal' ? 3 : role === 'student' ? 2 : 1}
          lang={lang}
          primaryColor={primaryColor}
          onRoleChange={handleRoleChange}
        />
        {section === 'messaging' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <MessagingScreen role={role} lang={lang} primaryColor={primaryColor} />
          </div>
        )}
        {(role === 'teacher' || role === 'principal') && section === 'attendance' && (
          <AttendanceScreen lang={lang} primaryColor={primaryColor} />
        )}
        {(role === 'teacher' || role === 'principal') && section === 'classlog' && (
          <ClassLogScreen lang={lang} primaryColor={primaryColor} role={role} />
        )}
        {(role === 'teacher' || role === 'principal') && section === 'discipline' && (
          <DisciplineScreen role={role} lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'principal' && section === 'calendar' && (
          <CalendarConfigScreen lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'principal' && section === 'school-setup' && (
          <SchoolSetupScreen lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'principal' && section === 'subject-parents' && (
          <SubjectParentsScreen lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'principal' && section === 'subjects' && (
          <SubjectsScreen lang={lang} primaryColor={primaryColor}
            parents={subjectParents} setParents={setSubjectParents}
            onOpenSubjectDetail={openSubjectDetail} />
        )}
        {role === 'principal' && section === 'subject-detail' && activeSubjectId && (
          <SubjectDetailScreen subjectId={activeSubjectId}
            parents={subjectParents}
            onUpdateSubject={updateSubjectMaster}
            onNavigate={handleNavigate}
            onBack={() => setSection('subjects')}
            lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'principal' && section === 'roster' && (
          <StudentRosterScreen lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'principal' && section === 'timetable' && (
          <TimetableBuilderScreen lang={lang} primaryColor={primaryColor} />
        )}
        {(role === 'teacher' || role === 'principal') && !['profile','attendance','classlog','messaging','discipline','calendar','school-setup','subject-parents','subjects','subject-detail','roster','timetable'].includes(section) && (
          <TeacherScreen role={role} section={section} onNavigate={handleNavigate} lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'student' && section === 'exams' && (
          <ExamScreen lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'student' && section === 'discipline' && (
          <StudentDisciplineScreen lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'student' && !['profile','exams','messaging','discipline'].includes(section) && (
          <StudentScreen section={section} lang={lang} primaryColor={primaryColor} />
        )}
        {role === 'parent' && section !== 'profile' && section !== 'messaging' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginBottom: 24 }}>{getHeaderTitle()}</div>
              <ParentScreen section={section} lang={lang} pColor={primaryColor || T.primary} />
            </div>
          </div>
        )}
        {section === 'profile' && (
          <ProfileScreen role={role} lang={lang} primaryColor={primaryColor} />
        )}
      </div>
      {showTweaks && <TweaksPanelUI tweaks={tweaks} setTweak={setTweak} onClose={() => { setShowTweaks(false); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); }} lang={lang} onRoleJump={handleRoleChange} />}
    </div>
  );
};

// ── Tweaks Panel UI ───────────────────────────────────────────────────────────
const TweaksPanelUI = ({ tweaks, setTweak, onClose, lang, onRoleJump }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const COLORS = [
    { label: 'Blue', value: '#5D87FF' },
    { label: 'Teal', value: '#13DEB9' },
    { label: 'Purple', value: '#7B5EA7' },
    { label: 'Orange', value: '#FA896B' },
    { label: 'Indigo', value: '#4570EA' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, width: 280,
      background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)', zIndex: 9999,
      fontFamily: 'inherit', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: tweaks.primaryColor, color: '#fff' }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>⚙ Tweaks</div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Icon name="x" size={12} color="#fff" />
        </button>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Language */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            {t('Ngôn ngữ', 'Language')}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'vi', label: '🇻🇳 Tiếng Việt' }, { id: 'en', label: '🇺🇸 English' }].map(l => (
              <button key={l.id} onClick={() => setTweak('lang', l.id)} style={{
                flex: 1, padding: '7px 10px', border: `1.5px solid ${tweaks.lang === l.id ? tweaks.primaryColor : T.border}`,
                borderRadius: 8, background: tweaks.lang === l.id ? tweaks.primaryColor + '12' : 'transparent',
                color: tweaks.lang === l.id ? tweaks.primaryColor : T.textSecondary,
                fontSize: 12, fontWeight: tweaks.lang === l.id ? 700 : 500, cursor: 'pointer',
              }}>{l.label}</button>
            ))}
          </div>
        </div>

        {/* Primary color */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            {t('Màu chủ đạo', 'Primary Color')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setTweak('primaryColor', c.value)} title={c.label}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c.value,
                  border: tweaks.primaryColor === c.value ? `3px solid ${T.textPrimary}` : '2px solid transparent',
                  cursor: 'pointer', flexShrink: 0, transition: 'border 0.15s',
                }} />
            ))}
          </div>
        </div>

        {/* Role jump */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            {t('Xem theo vai trò', 'Preview as Role')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { id: 'teacher', icon: 'userCheck', vi: 'Giáo viên', en: 'Teacher', color: tweaks.primaryColor },
              { id: 'principal', icon: 'school', vi: 'Hiệu trưởng', en: 'Principal', color: T.success },
              { id: 'student', icon: 'bookOpen', vi: 'Học sinh', en: 'Student', color: T.warning },
              { id: 'parent', icon: 'users', vi: 'Phụ huynh', en: 'Parent', color: T.purple },
            ].map(r => (
              <button key={r.id} onClick={() => onRoleJump(r.id)} style={{
                padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 8,
                background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: T.textPrimary, transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = r.color + '15'}
                onMouseLeave={e => e.currentTarget.style.background = T.bg}
              >
                <Icon name={r.icon} size={13} color={r.color} />
                {t(r.vi, r.en)}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => onRoleJump(null)} style={{
          padding: '8px', border: `1px solid ${T.border}`, borderRadius: 8, background: 'transparent',
          cursor: 'pointer', fontSize: 12, color: T.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="logout" size={13} color={T.textMuted} /> {t('Về màn hình Login', 'Back to Login')}
        </button>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
