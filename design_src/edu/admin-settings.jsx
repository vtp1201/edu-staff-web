// ── Tenant Operations Settings (ADMIN · /admin/settings) ──────────────────────
// Route:  /admin/settings
// Role:   ADMIN
// Epic:   US-059 (TenantConfigReader — GradePublishMode),
//         US-042 (calendar links), US-059 (grade config links)
// APIs:   GET  /api/v1/core/config/tenant/operational-settings
//         PUT  /api/v1/core/config/tenant/operational-settings { gradePublishMode }
// Notes:  Central settings hub. Does NOT duplicate grade scale or calendar
//         editors — links out to dedicated screens for those.

const AdminSettingsScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  // ── Mock backend state ──
  // The currently saved/applied value lives in `savedMode`; the radio reflects
  // the user's draft (`draftMode`). On save, draft → saved + toast.
  const [savedMode, setSavedMode] = React.useState('ADMIN_APPROVAL');
  const [draftMode, setDraftMode] = React.useState('ADMIN_APPROVAL');
  const [toast, setToast] = React.useState(null);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2600);
  };

  const handleSave = () => {
    if (draftMode === savedMode) return;
    setSavedMode(draftMode);
    showToast(t('Đã lưu cài đặt quy trình nộp điểm', 'Grade submission workflow saved'));
  };

  const isDirty = draftMode !== savedMode;

  // ── Local UI helpers ──
  const SectionCard = ({ children, style }) => (
    <div style={{
      background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 26, ...style,
    }}>
      {children}
    </div>
  );

  const SectionHeader = ({ icon, title, subtitle, iconColor = pColor, right }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: iconColor + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={20} color={iconColor} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.55 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );

  // ── Section 1 data ──
  const PUBLISH_OPTIONS = [
    {
      id: 'SELF_PUBLISH',
      vi: 'Tự công bố',
      en: 'Self-Publish',
      descVi: 'Giáo viên nộp điểm, điểm được công bố ngay. Không cần BGH duyệt.',
      descEn: 'Teachers submit grades and they are published immediately. No admin approval required.',
      icon: 'send',
      tint: pColor,
    },
    {
      id: 'ADMIN_APPROVAL',
      vi: 'Duyệt bởi BGH',
      en: 'Admin Approval',
      descVi: 'Giáo viên nộp điểm, BGH phê duyệt trước khi điểm được công bố.',
      descEn: 'Teachers submit grades; admins review and approve before publication.',
      icon: 'checkSquare',
      tint: T.warning,
    },
  ];

  // ── Section 2 data ──
  const SHORTCUTS = [
    { id: 'calendar',     icon: 'calendarDays', tint: pColor,    vi: 'Cấu hình năm học',             en: 'Academic Year', route: '/admin/calendar',     section: 'calendar' },
    { id: 'grade-config', icon: 'bookOpen',     tint: T.success, vi: 'Thang điểm & khung đánh giá',  en: 'Grade Scale & Assessment', route: '/admin/grade-config', section: 'subjects' },
    { id: 'assignments',  icon: 'users',        tint: T.purple,  vi: 'Phân công giảng dạy',          en: 'Teaching Assignments', route: '/admin/assignments',  section: 'teachers' },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, color: T.textMuted, marginBottom: 14,
        }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: T.textMuted, textDecoration: 'none', fontWeight: 600,
              padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = pColor; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; }}>
            <Icon name="home" size={12} color="currentColor" />
            {t('Trang chủ', 'Home')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>{t('Cài đặt', 'Settings')}</span>
        </div>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="settings2" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Cài đặt trường học', 'School Settings')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Các tùy chọn vận hành áp dụng cho toàn trường và liên kết tới các cấu hình khác.',
                 'Operational toggles applied school-wide, plus links to other configuration screens.')}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── SECTION 1 — Grade Submission Workflow ─── */}
          <SectionCard>
            <SectionHeader
              icon="clipboardList"
              title={t('Quy trình nộp điểm', 'Grade Submission Workflow')}
              subtitle={t('Chọn cách giáo viên công bố điểm cho học sinh và phụ huynh. Áp dụng cho mọi cột điểm trong toàn trường.',
                          'Choose how teachers publish grades to students and parents. Applies to every grade column school-wide.')}
            />

            {/* Radio cards */}
            <div role="radiogroup" aria-label={t('Quy trình nộp điểm', 'Grade Submission Workflow')}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              {PUBLISH_OPTIONS.map(opt => {
                const active = draftMode === opt.id;
                const isApplied = savedMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDraftMode(opt.id)}
                    style={{
                      textAlign: 'left', padding: '18px 20px', borderRadius: 12,
                      border: `1.5px solid ${active ? pColor : T.border}`,
                      background: active ? pColor + '14' : T.card,
                      cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
                      transition: 'all 0.15s',
                      boxShadow: active ? `0 0 0 4px ${pColor}14` : 'none',
                      display: 'flex', alignItems: 'flex-start', gap: 16,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = pColor + '88'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = T.border; }}>
                    {/* Radio dot */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: `2px solid ${active ? pColor : T.border}`,
                      background: '#fff', flexShrink: 0, marginTop: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.15s',
                    }}>
                      {active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: pColor }} />}
                    </div>

                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: opt.tint + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon name={opt.icon} size={20} color={opt.tint} strokeWidth={1.8} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: active ? pColor : T.textPrimary }}>
                          {t(opt.vi, opt.en)}
                        </div>
                        {isApplied && (
                          <Badge color={T.success}>
                            <Icon name="check" size={10} color={T.success} strokeWidth={2.6} />
                            {t('Đang áp dụng', 'Currently applied')}
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 8 }}>
                        {t(opt.descVi, opt.descEn)}
                      </div>
                      <div style={{
                        display: 'inline-block', fontSize: 10.5, fontWeight: 700,
                        color: T.textMuted, letterSpacing: '0.07em',
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        background: T.bg, padding: '2px 8px', borderRadius: 5,
                      }}>
                        {opt.id}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Save row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <Button onClick={handleSave} icon="check" disabled={!isDirty}>
                {t('Lưu cài đặt', 'Save settings')}
              </Button>
              {isDirty && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12.5, color: T.textMuted, fontWeight: 600,
                }}>
                  <Icon name="info" size={13} color={T.textMuted} />
                  {t('Bạn có thay đổi chưa lưu.', 'You have unsaved changes.')}
                </span>
              )}
            </div>

            {/* Warning callout */}
            <div style={{
              background: T.warningLight,
              border: `1px solid ${T.warning}40`,
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: T.warning + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="alertTriangle" size={15} color={T.warning} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.65 }}>
                <strong style={{ color: '#9A6A0F', fontWeight: 800 }}>
                  {t('Lưu ý: ', 'Note: ')}
                </strong>
                {t('Thay đổi quy trình nộp điểm sẽ áp dụng ngay cho tất cả giáo viên. Các điểm đang ở trạng thái ',
                   'Changing the submission workflow takes effect immediately for all teachers. Grades currently in ')}
                <span style={{
                  display: 'inline-block', padding: '1px 7px', borderRadius: 5,
                  background: T.warning + '22', color: '#9A6A0F',
                  fontWeight: 700, fontSize: 11.5,
                }}>
                  {t('Chờ duyệt', 'Pending approval')}
                </span>
                {t(' sẽ không bị ảnh hưởng.', ' will not be affected.')}
              </div>
            </div>
          </SectionCard>

          {/* ─── SECTION 2 — Config shortcuts ─── */}
          <SectionCard>
            <SectionHeader
              icon="externalLink"
              title={t('Liên kết cấu hình', 'Configuration Shortcuts')}
              subtitle={t('Mở các màn hình cấu hình chuyên biệt. Các thiết lập chi tiết được quản lý tại đó.',
                          'Jump to dedicated configuration screens. Detailed settings are managed there.')}
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 14,
            }}>
              {SHORTCUTS.map(s => <ShortcutCard key={s.id} item={s} pColor={pColor} t={t} onNavigate={onNavigate} />)}
            </div>
          </SectionCard>

          {/* ─── SECTION 3 — School information (placeholder) ─── */}
          <SectionCard style={{
            background: 'linear-gradient(135deg, #FAFBFD 0%, #F5F7FA 100%)',
            borderStyle: 'dashed',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                background: T.border + '80',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="building" size={20} color={T.textMuted} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4,
                }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.textMuted }}>
                    {t('Thông tin trường', 'School Information')}
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 9px', borderRadius: 99,
                    background: T.border + '80', color: T.textMuted,
                    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    <Icon name="clock" size={10} color={T.textMuted} strokeWidth={2.2} />
                    {t('Sắp có', 'Coming soon')}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.55 }}>
                  {t('Tên trường, địa chỉ, logo — sắp có.',
                     'School name, address, and logo — coming soon.')}
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: T.border + '60',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="lockClosed" size={14} color={T.textMuted} strokeWidth={1.8} />
              </div>
            </div>
          </SectionCard>

        </div>

        {/* Reset / demo footer */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => {
              setSavedMode('ADMIN_APPROVAL');
              setDraftMode('ADMIN_APPROVAL');
              setToast(null);
            }}
            style={{
              padding: '6px 12px', border: `1px dashed ${T.border}`, borderRadius: 7,
              background: 'transparent', color: T.textMuted, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {t('Đặt lại trạng thái demo', 'Reset demo state')}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff',
          padding: '12px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9999,
          animation: 'admin-settings-toast-in 0.2s ease-out',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: T.success,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
          </div>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes admin-settings-toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0);   }
        }
      `}</style>
    </div>
  );
};

// ── Shortcut card (with hover state) ─────────────────────────────────────────
const ShortcutCard = ({ item, pColor, t, onNavigate }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onNavigate && onNavigate(item.section); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        padding: 20, borderRadius: 12,
        border: `1px solid ${hovered ? pColor + '66' : T.border}`,
        background: T.card,
        textDecoration: 'none', color: 'inherit', fontFamily: 'inherit',
        boxShadow: hovered ? '0 4px 16px rgba(45, 55, 72, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.18s ease',
        cursor: 'pointer',
        position: 'relative',
        minHeight: 168,
      }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11,
        background: item.tint + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={item.icon} size={22} color={item.tint} strokeWidth={1.8} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary, marginBottom: 4, lineHeight: 1.35 }}>
          {t(item.vi, item.en)}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: T.textMuted,
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}>
          {item.route}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12.5, fontWeight: 700,
        color: hovered ? pColor : T.textSecondary,
        transition: 'color 0.15s',
      }}>
        {t('Xem', 'Open')}
        <span style={{
          display: 'inline-flex',
          transform: hovered ? 'translateX(3px)' : 'translateX(0)',
          transition: 'transform 0.18s',
        }}>
          <Icon name="arrowRight" size={13} color="currentColor" strokeWidth={2.4} />
        </span>
      </div>
    </a>
  );
};

Object.assign(window, { AdminSettingsScreen });
