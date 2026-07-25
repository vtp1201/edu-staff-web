// ── Staff Discipline (violations + conduct notes) — /admin/staff-discipline ─
// Role:   ADMIN / MANAGER (BGH) — in this app's role model both map onto the
//         single 'principal' role (same actor persona used by staff-leave.jsx
//         and academic-records.jsx — small-school single-admin-tenant). The
//         'teacher' role renders the staff member's own READ-ONLY self-view
//         (oversight parity with the student's own conduct-grade self-view in
//         discipline.jsx's ParentDisciplineScreen).
// Epic:   US-E18.14 (BE ground-truth) → DR-022 (design)
// Notes:  Two tabs, ONE screen (not two files) — violations + conduct notes
//         share the identical DRAFT/SUBMITTED/APPROVED/REJECTED actor model
//         (ADMIN authors+submits, ADMIN/MANAGER approves/rejects), mirrors the
//         2-ADMIN unseal-confirm pattern in academic-records.jsx (`selfApproved`
//         flagged, not hidden — ADR 0073 single-admin-tenant fallback, audit
//         transparency). Reject reason = inline panel, same shape as
//         staff-leave.jsx's RequestCard (discipline.leave.rejectDialog.* copy).
//         Rating 3-tier badge reuses the EXACT difficulty-badge fg-override
//         convention from question-bank.jsx's QBDifficultyBadge (warning text
//         needs `fg: T.warningForeground`, never raw T.warning as text color
//         on a light bg — decision 0013).
// Mock:   No staffName/department on either wire DTO (BE ground-truth, ask
//         #9/#22) — mock resolves display fields client-side against a FIXED
//         mock roster list (SD_STAFF_ROSTER), NOT a live search-as-you-type
//         (roster-UUID gap blocks that until resolved — flagged to /ba).
//
// Dev annotations (for /ba + /fe):
//   Components: StaffDisciplineScreen (tab shell), SDViolationsTab,
//     SDConductNotesTab, SDStateBadge, SDSeverityBadge, SDRatingBadge,
//     SDRejectPanel (shared shape across both tabs), SDViolationForm,
//     SDConductNoteForm, SDSelfApprovedNote.
//   States: loading (EduSkeleton rows), empty (EduEmpty — CTA to create for
//     approver, static copy for self-view), error (EduError + retry),
//     validation (reject-reason min-length, required create/set fields,
//     locked conduct-note re-edit attempt).
//   Data shape (BE, camelCase — see DR-022):
//     StaffViolation: recordId, staffMemberId, category, description,
//       severity (MINOR|MODERATE|SEVERE), occurredAt, state
//       (DRAFT|SUBMITTED|APPROVED|REJECTED), authorMemberId, approverMemberId?,
//       selfApproved, rejectionReason?, createdAt, updatedAt.
//     StaffConductNote: termId, staffMemberId, rating
//       (SATISFACTORY|NEEDS_IMPROVEMENT|UNSATISFACTORY), note, state (same 4),
//       authorMemberId, approverMemberId?, selfApproved, rejectionReason?,
//       createdAt, updatedAt. academicYearId = validation-only on POST.
//   i18n: namespace `staffDiscipline` (NEW). Reuses VERBATIM (do not
//     duplicate): discipline.errors.{same-actor,forbidden,not-found,
//     already-processed,invalid-transition,invalid-severity,invalid-state,
//     invalid-input,network-error,missing-reject-reason} +
//     discipline.leave.rejectDialog.* (reject-panel shell copy). New leaf
//     keys used below: staffDiscipline.errors.{term-not-found,locked,
//     invalid-rating}, staffDiscipline.conductNotes.rating.
//     {satisfactory,needsImprovement,unsatisfactory}, .selfApprovedNote.

// ── Static lookups ───────────────────────────────────────────────────────────

// DRAFT/SUBMITTED/APPROVED/REJECTED — identical shape to the shared
// ApprovalTransition state machine (academic-records.jsx unseal requests +
// staff-leave.jsx pending/approved/rejected), applied to BOTH tabs.
const SD_STATE = {
  DRAFT:     { vi: 'Nháp',       en: 'Draft',     color: T.textMuted, bg: T.bg,          icon: 'penLine' },
  SUBMITTED: { vi: 'Chờ duyệt',  en: 'Pending',   color: T.warning,   bg: T.warningLight, icon: 'clock', fg: T.warningForeground },
  APPROVED:  { vi: 'Đã duyệt',   en: 'Approved',  color: T.success,   bg: T.successLight, icon: 'check' },
  REJECTED:  { vi: 'Từ chối',    en: 'Rejected',  color: T.error,     bg: T.errorLight,   icon: 'x' },
};

// Severity — IDENTICAL enum + color mapping to student-violations
// (Nhẹ/Vừa/Nặng → warning/error/destructive, `.claude/rules/design-system.md`).
const SD_SEVERITY = {
  MINOR:    { vi: 'Nhẹ',  en: 'Minor',    color: T.warning,  bg: T.warningLight,   icon: 'info',  fg: T.warningForeground, points: -1 },
  MODERATE: { vi: 'Vừa',  en: 'Moderate', color: T.error,    bg: T.errorLight,     icon: 'alertTriangle', points: -3 },
  SEVERE:   { vi: 'Nặng', en: 'Serious',  color: T.errorDark, bg: T.errorDarkLight, icon: 'flag', points: -5 },
};

// Rating — NEW mapping but reuses the EXISTING GPA/difficulty 3-tier
// convention verbatim (success/warning/error), incl. the warning fg-override
// (question-bank.jsx QB_DIFFICULTY.MEDIUM precedent — never raw warning text).
const SD_RATING = {
  SATISFACTORY:       { vi: 'Đạt yêu cầu',        en: 'Satisfactory',        color: T.success, bg: T.successLight, icon: 'check' },
  NEEDS_IMPROVEMENT:  { vi: 'Cần cải thiện',       en: 'Needs improvement',   color: T.warning, bg: T.warningLight, icon: 'info', fg: T.warningForeground },
  UNSATISFACTORY:     { vi: 'Chưa đạt',            en: 'Unsatisfactory',      color: T.error,   bg: T.errorLight,   icon: 'alertTriangle' },
};

// Staff-specific violation categories (distinct from student VIOLATION_TYPES —
// free-text `category` on the wire, this is the mock's authoring picklist).
const SD_CATEGORIES = [
  { id: 'late',        vi: 'Đi làm muộn / vắng không phép',        en: 'Late / unexcused absence' },
  { id: 'professional', vi: 'Vi phạm quy chế chuyên môn',           en: 'Professional-conduct breach' },
  { id: 'conduct',     vi: 'Ứng xử không đúng mực với HS/PH',       en: 'Inappropriate conduct with student/parent' },
  { id: 'dresscode',   vi: 'Vi phạm quy định trang phục/tác phong', en: 'Dress-code / decorum breach' },
  { id: 'other',       vi: 'Khác',                                  en: 'Other' },
];

const SD_TERMS = [
  { id: 'HK1-2025-2026', vi: 'Học kỳ 1 — 2025–2026', en: 'Term 1 — 2025–2026' },
  { id: 'HK2-2024-2025', vi: 'Học kỳ 2 — 2024–2025', en: 'Term 2 — 2024–2025' },
];

// Current logged-in ADMIN/BGH actor (single-admin-tenant mock persona —
// mirrors AR_CURRENT_ADMIN in academic-records.jsx).
const SD_CURRENT_ADMIN = { id: 'admin-1', name: 'Trần Minh Quân', avatar: 'TQ' };
// A second ADMIN — used only to demo the "byOther" (non-self) approve path,
// same simulate-toggle technique as academic-records.jsx's AR_OTHER_ADMINS.
const SD_OTHER_ADMIN = { id: 'admin-2', name: 'Lê Thị Mai', avatar: 'LM' };

// Fixed mock roster — create-form select is roster-SELECT, NOT live search
// (roster-UUID gap, see file header). staffMemberId is the real wire field;
// name/dept are display-only mock fields, not on the BE DTO.
const SD_STAFF_ROSTER = [
  { staffMemberId: 'staff-1', name: 'Nguyễn Thị Hương', dept: 'Tổ Toán',        avatar: 'NH', color: T.primary },
  { staffMemberId: 'staff-2', name: 'Trần Văn Minh',    dept: 'Tổ Lý-Hoá',      avatar: 'TM', color: T.purple },
  { staffMemberId: 'staff-3', name: 'Lê Thị Hoa',       dept: 'Tổ Lý-Hoá',      avatar: 'LH', color: T.success },
  { staffMemberId: 'staff-4', name: 'Đỗ Thị Mai',       dept: 'Tổ Ngoại Ngữ',   avatar: 'DM', color: T.warning },
  { staffMemberId: 'staff-5', name: 'Phạm Quốc Bảo',    dept: 'Tổ Văn-Sử',      avatar: 'PB', color: T.teal },
];
const sdRosterOf = (id) => SD_STAFF_ROSTER.find(s => s.staffMemberId === id) || SD_STAFF_ROSTER[0];

// The "self" identity used for the teacher-facing read-only self-view.
const SD_SELF_STAFF_ID = 'staff-1';

// ── Seed data ────────────────────────────────────────────────────────────────

const SD_SEED_VIOLATIONS = [
  {
    recordId: 'sv-001', staffMemberId: 'staff-4', category: 'late',
    description: 'Vào lớp trễ 20 phút không báo trước, không có giáo viên dạy thay.',
    severity: 'MODERATE', occurredAt: '2026-05-04', state: 'SUBMITTED',
    authorMemberId: 'admin-1', createdAt: '2026-05-04 09:10', updatedAt: '2026-05-04 09:10',
  },
  {
    recordId: 'sv-002', staffMemberId: 'staff-2', category: 'professional',
    description: 'Không nộp giáo án đúng hạn quy định 2 lần liên tiếp trong tháng.',
    severity: 'MINOR', occurredAt: '2026-04-28', state: 'DRAFT',
    authorMemberId: 'admin-1', createdAt: '2026-04-29 08:00', updatedAt: '2026-04-29 08:00',
  },
  {
    recordId: 'sv-003', staffMemberId: 'staff-1', category: 'dresscode',
    description: 'Trang phục không đúng quy định trong buổi lễ chào cờ đầu tuần.',
    severity: 'MINOR', occurredAt: '2026-04-14', state: 'APPROVED',
    authorMemberId: 'admin-1', approverMemberId: 'admin-1', selfApproved: true,
    createdAt: '2026-04-14 07:40', updatedAt: '2026-04-15 08:00',
  },
  {
    recordId: 'sv-004', staffMemberId: 'staff-5', category: 'conduct',
    description: 'Phụ huynh phản ánh thái độ chưa đúng mực khi trao đổi qua điện thoại.',
    severity: 'SEVERE', occurredAt: '2026-04-02', state: 'APPROVED',
    authorMemberId: 'admin-1', approverMemberId: 'admin-2', selfApproved: false,
    createdAt: '2026-04-02 15:20', updatedAt: '2026-04-05 09:00',
  },
  {
    recordId: 'sv-005', staffMemberId: 'staff-3', category: 'late',
    description: 'Đến muộn tiết coi thi giữa kỳ 15 phút.',
    severity: 'MODERATE', occurredAt: '2026-03-20', state: 'REJECTED',
    authorMemberId: 'admin-1', approverMemberId: 'admin-2', selfApproved: false,
    rejectionReason: 'Có xác nhận của bảo vệ trường về sự cố tắc đường bất khả kháng — không tính vi phạm.',
    createdAt: '2026-03-20 07:50', updatedAt: '2026-03-21 08:10',
  },
];

const SD_SEED_CONDUCT_NOTES = [
  {
    termId: 'HK1-2025-2026', staffMemberId: 'staff-1', rating: 'SATISFACTORY',
    note: 'Hoàn thành tốt nhiệm vụ chuyên môn, tích cực tham gia hoạt động tổ bộ môn.',
    state: 'APPROVED', authorMemberId: 'admin-1', approverMemberId: 'admin-2', selfApproved: false,
    updatedAt: '2026-01-20 10:00',
  },
  {
    termId: 'HK1-2025-2026', staffMemberId: 'staff-2', rating: 'NEEDS_IMPROVEMENT',
    note: 'Chậm tiến độ nộp báo cáo chuyên môn 2/3 kỳ; đã nhắc nhở trực tiếp.',
    state: 'SUBMITTED', authorMemberId: 'admin-1',
    updatedAt: '2026-05-02 09:00',
  },
  {
    termId: 'HK1-2025-2026', staffMemberId: 'staff-4', rating: 'SATISFACTORY',
    note: 'Đáp ứng tốt yêu cầu công việc, chủ động hỗ trợ đồng nghiệp.',
    state: 'DRAFT', authorMemberId: 'admin-1',
    updatedAt: '2026-05-03 11:15',
  },
  {
    termId: 'HK1-2025-2026', staffMemberId: 'staff-5', rating: 'UNSATISFACTORY',
    note: 'Vi phạm nội quy tác phong nhiều lần trong kỳ, đã lập biên bản 2 lần.',
    state: 'APPROVED', authorMemberId: 'admin-1', approverMemberId: 'admin-1', selfApproved: true,
    updatedAt: '2026-01-18 14:00',
  },
];

// ── Small shared badges ───────────────────────────────────────────────────────

// Status never color-only — icon + label always rendered (WCAG 2.1 AA).
const SDStateBadge = ({ state, t }) => {
  const m = SD_STATE[state] || SD_STATE.DRAFT;
  return (
    <Badge color={m.fg || m.color} bg={m.bg}>
      <Icon name={m.icon} size={10} color={m.fg || m.color} strokeWidth={2.4} />
      {t(m.vi, m.en)}
    </Badge>
  );
};
const SDSeverityBadge = ({ severity, t }) => {
  const m = SD_SEVERITY[severity] || SD_SEVERITY.MINOR;
  return (
    <Badge color={m.fg || m.color} bg={m.bg}>
      <Icon name={m.icon} size={10} color={m.fg || m.color} strokeWidth={2.4} />
      {t(m.vi, m.en)}
    </Badge>
  );
};
const SDRatingBadge = ({ rating, t }) => {
  const m = SD_RATING[rating] || SD_RATING.SATISFACTORY;
  return (
    <Badge color={m.fg || m.color} bg={m.bg}>
      <Icon name={m.icon} size={10} color={m.fg || m.color} strokeWidth={2.4} />
      {t(m.vi, m.en)}
    </Badge>
  );
};

// Audit-transparency annotation — shown (not hidden) whenever selfApproved.
// i18nKey: staffDiscipline.conductNotes.selfApprovedNote (reused for both tabs).
const SDSelfApprovedNote = ({ t }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 700, color: T.textMuted,
    padding: '2px 8px', borderRadius: 6, background: T.bg, border: `1px dashed ${T.border}`,
  }}>
    <Icon name="alertTriangle" size={10} color={T.textMuted} strokeWidth={2.2} />
    {t('Tự duyệt (không có ADMIN thứ hai)', 'Self-approved (no second ADMIN available)')}
  </span>
);

// ── Reject panel — shared shape across both tabs ─────────────────────────────
// Mirrors discipline.leave.rejectDialog.* copy + staff-leave.jsx's inline
// (not modal) rejection editor. Client-side min-length UX guard only — server
// contract just requires non-empty (VIOLATION_REJECTION_REASON_REQUIRED /
// STAFF_CONDUCT_NOTE_* share the same shape) — copy: discipline.errors.missing-reject-reason.
const SDRejectPanel = ({ reason, onChangeReason, onCancel, onConfirm, t }) => {
  const valid = reason.trim().length >= 10;
  return (
    <div style={{
      marginTop: 12, padding: '12px 14px', background: T.errorLight, borderRadius: 8,
      border: `1px solid ${T.error}33`, animation: 'sd-reject-in 0.2s ease-out', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.error, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {t('Lý do từ chối', 'Rejection reason')} <span aria-hidden="true">*</span>
      </div>
      <label htmlFor="sd-reject-reason" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {t('Nhập lý do từ chối', 'Enter rejection reason')}
      </label>
      <textarea
        id="sd-reject-reason" value={reason} onChange={(e) => onChangeReason(e.target.value)}
        autoFocus rows={3} aria-invalid={!valid} aria-describedby="sd-reject-hint"
        placeholder={t('Vui lòng nhập lý do từ chối để thông báo cho nhân viên...', 'Please explain the rejection so the staff member is informed...')}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 7,
          border: `1.5px solid ${valid ? T.error + '88' : T.border}`,
          background: T.card, fontSize: 13, fontFamily: 'inherit',
          color: T.textPrimary, outline: 'none', resize: 'vertical', lineHeight: 1.5,
        }}
      />
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span id="sd-reject-hint" style={{ fontSize: 11, color: valid ? T.success : T.textMuted, flex: 1 }}>
          {valid ? t('Có thể gửi.', 'Ready to send.') : t('Vui lòng nhập ít nhất 10 ký tự.', 'Please enter at least 10 characters.')}
        </span>
        <Button variant="ghost" size="sm" onClick={onCancel} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
          {t('Huỷ', 'Cancel')}
        </Button>
        <Button variant="danger" size="sm" icon="x" disabled={!valid} onClick={onConfirm}>
          {t('Xác nhận từ chối', 'Confirm reject')}
        </Button>
      </div>
    </div>
  );
};

// ── Main screen ──────────────────────────────────────────────────────────────

const StaffDisciplineScreen = ({ role, lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  // ADMIN/MANAGER combined actor (this app's 'principal' role) sees full
  // author+approver actions. 'teacher' (staff) sees a read-only self-view.
  const isApprover = role === 'principal';
  const isSelfView = role === 'teacher';

  const [tab, setTab] = React.useState('violations'); // 'violations' | 'conductNotes'

  // Shared loading/error demo — same pattern as lesson-plan.jsx.
  const [status, setStatus] = React.useState('loading'); // loading | error | ready
  const failedOnce = React.useRef(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setStatus('ready'), 600);
    return () => window.clearTimeout(id);
  }, []);
  const refresh = () => {
    setStatus('loading');
    window.setTimeout(() => {
      if (!failedOnce.current) { failedOnce.current = true; setStatus('error'); }
      else setStatus('ready');
    }, 600);
  };

  const [toast, setToast] = React.useState(null);
  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
            <Icon name="home" size={12} color="currentColor" />
            {t('Trang chủ', 'Home')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>{t('Kỷ luật nhân viên', 'Staff Discipline')}</span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="shield" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Kỷ luật & Hạnh kiểm nhân viên', 'Staff Discipline & Conduct')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {isSelfView
                ? t('Xem vi phạm và ghi chú hạnh kiểm của bạn — chỉ xem.', 'View your own violations and conduct notes — read only.')
                : t('Ghi nhận vi phạm, đánh giá hạnh kiểm định kỳ và xử lý duyệt/từ chối. Mọi hành động đều ghi vào nhật ký kiểm toán.',
                    'Record violations, set periodic conduct notes, and process approve/reject. All actions are logged to the audit trail.')}
            </div>
          </div>
          {!isSelfView && (
            <Badge color={T.error}>
              <Icon name="shield" size={11} color={T.error} strokeWidth={2.4} />
              ADMIN · BGH
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }} role="tablist" aria-label={t('Chuyển tab', 'Switch tab')}>
          <SDTabButton active={tab === 'violations'} onClick={() => setTab('violations')} pColor={pColor} icon="alertTriangle" label={t('Vi phạm', 'Violations')} />
          <SDTabButton active={tab === 'conductNotes'} onClick={() => setTab('conductNotes')} pColor={pColor} icon="clipboard" label={t('Ghi chú hạnh kiểm', 'Conduct Notes')} />
        </div>

        {status === 'loading' && <EduSkeleton variant="rows" count={4} lang={lang} />}
        {status === 'error' && (
          <EduError lang={lang} onRetry={refresh}
            title={t('Không tải được dữ liệu kỷ luật nhân viên', 'Failed to load staff discipline data')} />
        )}
        {status === 'ready' && tab === 'violations' && (
          <SDViolationsTab t={t} lang={lang} pColor={pColor} isApprover={isApprover} isSelfView={isSelfView} showToast={showToast} />
        )}
        {status === 'ready' && tab === 'conductNotes' && (
          <SDConductNotesTab t={t} lang={lang} pColor={pColor} isApprover={isApprover} isSelfView={isSelfView} showToast={showToast} />
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff', padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000, animation: 'sd-toast-in 0.2s ease-out',
        }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
          </div>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes sd-toast-in  { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes sd-reject-in { from { opacity: 0; max-height: 0; }                  to { opacity: 1; max-height: 240px; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
};

const SDTabButton = ({ active, onClick, pColor, icon, label }) => (
  <button role="tab" aria-selected={active} onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', minHeight: 44,
      border: 'none', borderBottom: `2.5px solid ${active ? pColor : 'transparent'}`,
      background: 'transparent', color: active ? pColor : T.textSecondary,
      fontSize: 13.5, fontWeight: active ? 800 : 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>
    <Icon name={icon} size={14} color={active ? pColor : T.textMuted} strokeWidth={active ? 2.4 : 1.8} />
    {label}
  </button>
);

// ── TAB 1: Violations ────────────────────────────────────────────────────────

const SDViolationsTab = ({ t, lang, pColor, isApprover, isSelfView, showToast }) => {
  const [violations, setViolations] = React.useState(SD_SEED_VIOLATIONS);
  const [filterState, setFilterState] = React.useState('all');
  const [filterSeverity, setFilterSeverity] = React.useState('all');
  const [showForm, setShowForm] = React.useState(false);
  const [rejectingId, setRejectingId] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const [form, setForm] = React.useState({ staffMemberId: SD_STAFF_ROSTER[0].staffMemberId, category: 'late', description: '', severity: 'MINOR', occurredAt: '2026-05-06' });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const formValid = form.staffMemberId && form.description.trim().length > 0;

  const base = isSelfView ? violations.filter(v => v.staffMemberId === SD_SELF_STAFF_ID) : violations;
  const filtered = base.filter(v => {
    if (filterState !== 'all' && v.state !== filterState) return false;
    if (filterSeverity !== 'all' && v.severity !== filterSeverity) return false;
    return true;
  });

  const handleCreate = () => {
    if (!formValid) return;
    const id = `sv-${Date.now()}`;
    setViolations(vs => [{
      recordId: id, staffMemberId: form.staffMemberId, category: form.category,
      description: form.description.trim(), severity: form.severity, occurredAt: form.occurredAt,
      state: 'DRAFT', authorMemberId: SD_CURRENT_ADMIN.id,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }, ...vs]);
    setForm(f => ({ ...f, description: '' }));
    setShowForm(false);
    showToast(t('Đã ghi nhận vi phạm (Nháp).', 'Violation recorded (Draft).'));
  };

  const handleSubmit = (id) => {
    setViolations(vs => vs.map(v => v.recordId !== id ? v : { ...v, state: 'SUBMITTED', updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') }));
    showToast(t('Đã gửi duyệt.', 'Submitted for approval.'));
  };

  const handleApprove = (id, byOther) => {
    setViolations(vs => vs.map(v => v.recordId !== id ? v : {
      ...v, state: 'APPROVED',
      approverMemberId: byOther ? SD_OTHER_ADMIN.id : SD_CURRENT_ADMIN.id,
      selfApproved: !byOther,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }));
    showToast(byOther ? t('Đã duyệt vi phạm.', 'Violation approved.') : t('Đã tự duyệt — hành động được ghi vào nhật ký.', 'Self-approved — logged to audit trail.'));
  };

  const handleConfirmReject = (id) => {
    const reason = rejectReason.trim();
    if (reason.length < 10) return;
    setViolations(vs => vs.map(v => v.recordId !== id ? v : {
      ...v, state: 'REJECTED', approverMemberId: SD_CURRENT_ADMIN.id, rejectionReason: reason,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }));
    setRejectingId(null); setRejectReason('');
    showToast(t('Đã từ chối vi phạm.', 'Violation rejected.'));
  };

  const stats = {
    submitted: base.filter(v => v.state === 'SUBMITTED').length,
    minor: base.filter(v => v.severity === 'MINOR').length,
    seriousPlus: base.filter(v => v.severity !== 'MINOR').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!isSelfView && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <StatCard icon="clock" iconColor={T.warning} label={t('Chờ duyệt', 'Pending review')} value={stats.submitted} lang={lang} />
          <StatCard icon="info" iconColor={T.warning} label={t('Mức nhẹ', 'Minor')} value={stats.minor} lang={lang} />
          <StatCard icon="alertTriangle" iconColor={T.error} label={t('Mức vừa/nặng', 'Moderate/Serious')} value={stats.seriousPlus} lang={lang} />
        </div>
      )}

      {/* Filter row */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('Trạng thái', 'State')}</span>
        {['all', ...Object.keys(SD_STATE)].map(s => (
          <SDFilterChip key={s} active={filterState === s} onClick={() => setFilterState(s)}
            label={s === 'all' ? t('Tất cả', 'All') : t(SD_STATE[s].vi, SD_STATE[s].en)}
            color={s === 'all' ? pColor : (SD_STATE[s].fg || SD_STATE[s].color)} />
        ))}
        <span style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: 10 }}>{t('Mức độ', 'Severity')}</span>
        {['all', ...Object.keys(SD_SEVERITY)].map(s => (
          <SDFilterChip key={s} active={filterSeverity === s} onClick={() => setFilterSeverity(s)}
            label={s === 'all' ? t('Tất cả', 'All') : t(SD_SEVERITY[s].vi, SD_SEVERITY[s].en)}
            color={s === 'all' ? pColor : (SD_SEVERITY[s].fg || SD_SEVERITY[s].color)} />
        ))}
        {isApprover && !showForm && (
          <Button size="sm" icon="plus" onClick={() => setShowForm(true)} style={{ marginLeft: 'auto' }}>
            {t('Ghi nhận vi phạm', 'Record violation')}
          </Button>
        )}
      </div>

      {/* Create form — ADMIN authoring capacity */}
      {isApprover && showForm && (
        <div style={{ background: T.card, borderRadius: 14, border: `1.5px solid ${pColor}30`, boxShadow: `0 4px 20px ${pColor}12`, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Nhập vi phạm mới', 'Record new violation')}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>
            {t('Chọn nhân viên từ danh sách trường (chưa hỗ trợ tìm kiếm trực tiếp theo tên).', 'Select staff from the school roster (live name search not yet supported).')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label htmlFor="sd-v-staff" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Nhân viên *', 'Staff member *')}</label>
              <select id="sd-v-staff" value={form.staffMemberId} onChange={e => setF('staffMemberId', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                {SD_STAFF_ROSTER.map(s => <option key={s.staffMemberId} value={s.staffMemberId}>{s.name} — {s.dept}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sd-v-date" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Ngày xảy ra', 'Occurred on')}</label>
              <input id="sd-v-date" type="date" value={form.occurredAt} onChange={e => setF('occurredAt', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label htmlFor="sd-v-category" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Loại vi phạm', 'Category')}</label>
              <select id="sd-v-category" value={form.category} onChange={e => setF('category', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                {SD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{t(c.vi, c.en)}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>{t('Mức độ', 'Severity')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(SD_SEVERITY).map(([k, cfg]) => (
                  <button key={k} type="button" onClick={() => setF('severity', k)} style={{
                    flex: 1, padding: '8px 6px', border: `1.5px solid ${form.severity === k ? cfg.color : T.border}`,
                    borderRadius: 7, background: form.severity === k ? cfg.bg : 'transparent',
                    color: form.severity === k ? (cfg.fg || cfg.color) : T.textMuted,
                    fontSize: 11.5, fontWeight: form.severity === k ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{t(cfg.vi, cfg.en)}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="sd-v-desc" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Mô tả vi phạm *', 'Description *')}</label>
            <textarea id="sd-v-desc" value={form.description} onChange={e => setF('description', e.target.value)} rows={2}
              aria-invalid={!form.description.trim()}
              placeholder={t('Mô tả chi tiết hành vi vi phạm...', 'Describe the violation in detail...')}
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
            {!form.description.trim() && <div style={{ fontSize: 11, color: T.error, marginTop: 4 }}>{t('Vui lòng nhập mô tả vi phạm.', 'Please enter a description.')}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => setShowForm(false)} style={{ border: `1px solid ${T.border}` }}>{t('Huỷ', 'Cancel')}</Button>
            <Button disabled={!formValid} onClick={handleCreate} icon="check" style={{ flex: 1, justifyContent: 'center' }}>
              {t('Ghi nhận vi phạm', 'Record violation')}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EduEmpty lang={lang} icon="shield" color={pColor}
          title={isApprover ? t('Chưa có vi phạm nào', 'No violations yet') : t('Chưa có ghi nhận', 'No records yet')}
          desc={isApprover ? t('Nhấn "Ghi nhận vi phạm" để thêm bản ghi đầu tiên.', 'Click "Record violation" to add the first entry.') : undefined}
          action={isApprover && !showForm ? { label: t('Ghi nhận vi phạm', 'Record violation'), icon: 'plus', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(v => {
            const staff = sdRosterOf(v.staffMemberId);
            const cat = SD_CATEGORIES.find(c => c.id === v.category) || SD_CATEGORIES[SD_CATEGORIES.length - 1];
            const canSubmit = isApprover && v.state === 'DRAFT' && v.authorMemberId === SD_CURRENT_ADMIN.id;
            const canDecide = isApprover && v.state === 'SUBMITTED';
            const isRejecting = rejectingId === v.recordId;
            return (
              <div key={v.recordId} style={{
                background: T.card, borderRadius: 12,
                border: `1px solid ${v.state === 'SUBMITTED' ? T.warning + '44' : T.border}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', position: 'relative',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: SD_SEVERITY[v.severity].color }} />
                <div style={{ padding: '16px 20px 16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <Avatar initials={staff.avatar} color={staff.color} size={40} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>{staff.name}</span>
                        <span style={{ fontSize: 11.5, color: T.textMuted }}>· {staff.dept}</span>
                        <SDSeverityBadge severity={v.severity} t={t} />
                      </div>
                      <div style={{ fontSize: 13, color: T.textPrimary, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>{t(cat.vi, cat.en)}</span>{' — '}{v.description}
                      </div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: v.selfApproved || v.rejectionReason ? 8 : 0 }}>
                        {t(`Xảy ra ${v.occurredAt}`, `Occurred ${v.occurredAt}`)}
                      </div>
                      {v.state === 'APPROVED' && v.selfApproved && <SDSelfApprovedNote t={t} />}
                      {v.state === 'REJECTED' && v.rejectionReason && (
                        <div style={{ padding: '8px 12px', background: T.errorLight, borderRadius: 7, border: `1px solid ${T.error}22`, fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                          <strong style={{ color: T.error, fontWeight: 800 }}>{t('Lý do từ chối:', 'Rejection reason:')}</strong> {v.rejectionReason}
                        </div>
                      )}
                      {isRejecting && (
                        <SDRejectPanel t={t} reason={rejectReason} onChangeReason={setRejectReason}
                          onCancel={() => { setRejectingId(null); setRejectReason(''); }}
                          onConfirm={() => handleConfirmReject(v.recordId)} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 150, flexShrink: 0 }}>
                      <SDStateBadge state={v.state} t={t} />
                      {canSubmit && (
                        <Button size="sm" icon="arrowRight" onClick={() => handleSubmit(v.recordId)}>{t('Nộp duyệt', 'Submit')}</Button>
                      )}
                      {canDecide && !isRejecting && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button variant="ghost" size="sm" icon="x" onClick={() => setRejectingId(v.recordId)}
                              style={{ border: `1.5px solid ${T.error}55`, color: T.error, background: T.errorLight }}>
                              {t('Từ chối', 'Reject')}
                            </Button>
                            <Button size="sm" icon="check" onClick={() => handleApprove(v.recordId, false)}
                              style={{ background: T.success, borderColor: T.success }}>
                              {t('Duyệt', 'Approve')}
                            </Button>
                          </div>
                          {v.authorMemberId === SD_CURRENT_ADMIN.id && (
                            <button onClick={() => handleApprove(v.recordId, true)} style={{
                              background: 'none', border: 'none', padding: 0, fontSize: 10.5, color: T.textMuted,
                              textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                              {t('Mô phỏng: BGH khác duyệt', 'Simulate: another ADMIN approves')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── TAB 2: Conduct Notes ─────────────────────────────────────────────────────

const SDConductNotesTab = ({ t, lang, pColor, isApprover, isSelfView, showToast }) => {
  const [notes, setNotes] = React.useState(SD_SEED_CONDUCT_NOTES);
  const [term, setTerm] = React.useState(SD_TERMS[0].id);
  const [showForm, setShowForm] = React.useState(false);
  const [editKey, setEditKey] = React.useState(null); // staffMemberId currently being set/edited
  const [rejectingKey, setRejectingKey] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const [form, setForm] = React.useState({ staffMemberId: SD_STAFF_ROSTER[0].staffMemberId, rating: 'SATISFACTORY', note: '' });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const base = isSelfView ? notes.filter(n => n.staffMemberId === SD_SELF_STAFF_ID) : notes.filter(n => n.termId === term);

  const noteKey = (staffMemberId) => `${term}|${staffMemberId}`;
  const existingFor = (staffMemberId) => notes.find(n => n.termId === term && n.staffMemberId === staffMemberId);

  const openSet = (staffMemberId) => {
    const existing = existingFor(staffMemberId);
    if (existing && existing.state === 'APPROVED') {
      // STAFF_CONDUCT_NOTE_LOCKED — re-set blocked once approved (ADR 0074).
      showToast(t('Ghi chú đã được duyệt, không thể chỉnh sửa.', 'This note is approved and can no longer be edited.'));
      return;
    }
    setForm({ staffMemberId, rating: existing?.rating || 'SATISFACTORY', note: existing?.note || '' });
    setEditKey(staffMemberId);
    setShowForm(true);
  };

  const handleSet = () => {
    if (!form.note.trim()) return;
    setNotes(ns => {
      const idx = ns.findIndex(n => n.termId === term && n.staffMemberId === form.staffMemberId);
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const record = {
        termId: term, staffMemberId: form.staffMemberId, rating: form.rating, note: form.note.trim(),
        state: 'DRAFT', authorMemberId: SD_CURRENT_ADMIN.id, updatedAt: stamp,
      };
      if (idx === -1) return [record, ...ns];
      const next = [...ns]; next[idx] = record; return next;
    });
    setShowForm(false); setEditKey(null);
    showToast(t('Đã lưu ghi chú hạnh kiểm (Nháp).', 'Conduct note saved (Draft).'));
  };

  const handleSubmit = (staffMemberId) => {
    setNotes(ns => ns.map(n => (n.termId === term && n.staffMemberId === staffMemberId) ? { ...n, state: 'SUBMITTED' } : n));
    showToast(t('Đã gửi duyệt.', 'Submitted for approval.'));
  };

  const handleApprove = (staffMemberId, byOther) => {
    setNotes(ns => ns.map(n => (n.termId === term && n.staffMemberId === staffMemberId) ? {
      ...n, state: 'APPROVED',
      approverMemberId: byOther ? SD_OTHER_ADMIN.id : SD_CURRENT_ADMIN.id,
      selfApproved: !byOther,
    } : n));
    showToast(byOther ? t('Đã duyệt ghi chú hạnh kiểm.', 'Conduct note approved.') : t('Đã tự duyệt — hành động được ghi vào nhật ký.', 'Self-approved — logged to audit trail.'));
  };

  const handleConfirmReject = (staffMemberId) => {
    const reason = rejectReason.trim();
    if (reason.length < 10) return;
    setNotes(ns => ns.map(n => (n.termId === term && n.staffMemberId === staffMemberId) ? { ...n, state: 'REJECTED', approverMemberId: SD_CURRENT_ADMIN.id, rejectionReason: reason } : n));
    setRejectingKey(null); setRejectReason('');
    showToast(t('Đã từ chối ghi chú hạnh kiểm.', 'Conduct note rejected.'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!isSelfView && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: '12px 16px' }}>
          <label htmlFor="sd-term" style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('Học kỳ', 'Term')}</label>
          <select id="sd-term" value={term} onChange={e => setTerm(e.target.value)}
            style={{ padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', background: T.bg, cursor: 'pointer' }}>
            {SD_TERMS.map(term_ => <option key={term_.id} value={term_.id}>{t(term_.vi, term_.en)}</option>)}
          </select>
        </div>
      )}

      {isApprover && showForm && (
        <div style={{ background: T.card, borderRadius: 14, border: `1.5px solid ${pColor}30`, boxShadow: `0 4px 20px ${pColor}12`, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 16 }}>
            {t('Ghi chú hạnh kiểm — ', 'Conduct note — ')}{sdRosterOf(form.staffMemberId).name}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>{t('Xếp loại', 'Rating')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(SD_RATING).map(([k, cfg]) => (
                <button key={k} type="button" onClick={() => setF('rating', k)} style={{
                  flex: 1, padding: '8px 6px', border: `1.5px solid ${form.rating === k ? cfg.color : T.border}`,
                  borderRadius: 7, background: form.rating === k ? cfg.bg : 'transparent',
                  color: form.rating === k ? (cfg.fg || cfg.color) : T.textMuted,
                  fontSize: 11.5, fontWeight: form.rating === k ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                }}>{t(cfg.vi, cfg.en)}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="sd-note" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Nội dung ghi chú *', 'Note *')}</label>
            <textarea id="sd-note" value={form.note} onChange={e => setF('note', e.target.value)} rows={3} maxLength={5000}
              aria-invalid={!form.note.trim()}
              placeholder={t('Nhận xét đánh giá hạnh kiểm/hiệu quả công việc trong kỳ...', 'Assessment of conduct/performance for the term...')}
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => { setShowForm(false); setEditKey(null); }} style={{ border: `1px solid ${T.border}` }}>{t('Huỷ', 'Cancel')}</Button>
            <Button disabled={!form.note.trim()} onClick={handleSet} icon="check" style={{ flex: 1, justifyContent: 'center' }}>
              {t('Lưu ghi chú', 'Save note')}
            </Button>
          </div>
        </div>
      )}

      {/* Roster grid — one row per staff member in scope */}
      {(() => {
        const rows = isSelfView ? base : SD_STAFF_ROSTER.map(s => existingFor(s.staffMemberId) || { staffMemberId: s.staffMemberId, termId: term, state: 'NONE' });
        if (rows.length === 0) {
          return <EduEmpty lang={lang} icon="clipboard" color={pColor} title={t('Chưa có ghi chú nào', 'No conduct notes yet')} />;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map(n => {
              const staff = sdRosterOf(n.staffMemberId);
              const hasRecord = n.state !== 'NONE';
              const canSubmit = isApprover && n.state === 'DRAFT' && n.authorMemberId === SD_CURRENT_ADMIN.id;
              const canDecide = isApprover && n.state === 'SUBMITTED';
              const isLocked = n.state === 'APPROVED';
              const isRejecting = rejectingKey === n.staffMemberId;
              return (
                <div key={n.staffMemberId} style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <Avatar initials={staff.avatar} color={staff.color} size={40} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>{staff.name}</span>
                        <span style={{ fontSize: 11.5, color: T.textMuted }}>· {staff.dept}</span>
                        {hasRecord && <SDRatingBadge rating={n.rating} t={t} />}
                        {isLocked && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: T.textMuted }}>
                            <Icon name="lock" size={10} color={T.textMuted} strokeWidth={2.2} />
                            {t('Đã khoá', 'Locked')}
                          </span>
                        )}
                      </div>
                      {hasRecord ? (
                        <div style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.55, marginBottom: n.selfApproved || n.rejectionReason ? 8 : 0 }}>{n.note}</div>
                      ) : (
                        <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: 'italic' }}>{t('Chưa có ghi chú.', 'No note yet.')}</div>
                      )}
                      {n.state === 'APPROVED' && n.selfApproved && <SDSelfApprovedNote t={t} />}
                      {n.state === 'REJECTED' && n.rejectionReason && (
                        <div style={{ padding: '8px 12px', background: T.errorLight, borderRadius: 7, border: `1px solid ${T.error}22`, fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                          <strong style={{ color: T.error, fontWeight: 800 }}>{t('Lý do từ chối:', 'Rejection reason:')}</strong> {n.rejectionReason}
                        </div>
                      )}
                      {isRejecting && (
                        <SDRejectPanel t={t} reason={rejectReason} onChangeReason={setRejectReason}
                          onCancel={() => { setRejectingKey(null); setRejectReason(''); }}
                          onConfirm={() => handleConfirmReject(n.staffMemberId)} />
                      )}
                    </div>
                    {isApprover && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 150, flexShrink: 0 }}>
                        {hasRecord && <SDStateBadge state={n.state} t={t} />}
                        {(n.state === 'NONE' || n.state === 'DRAFT' || n.state === 'REJECTED') && (
                          <Button size="sm" variant="secondary" icon={hasRecord ? 'edit' : 'plus'} onClick={() => openSet(n.staffMemberId)}>
                            {hasRecord ? t('Sửa', 'Edit') : t('Đặt ghi chú', 'Set note')}
                          </Button>
                        )}
                        {canSubmit && <Button size="sm" icon="arrowRight" onClick={() => handleSubmit(n.staffMemberId)}>{t('Nộp duyệt', 'Submit')}</Button>}
                        {canDecide && !isRejecting && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Button variant="ghost" size="sm" icon="x" onClick={() => setRejectingKey(n.staffMemberId)}
                                style={{ border: `1.5px solid ${T.error}55`, color: T.error, background: T.errorLight }}>
                                {t('Từ chối', 'Reject')}
                              </Button>
                              <Button size="sm" icon="check" onClick={() => handleApprove(n.staffMemberId, false)} style={{ background: T.success, borderColor: T.success }}>
                                {t('Duyệt', 'Approve')}
                              </Button>
                            </div>
                            {n.authorMemberId === SD_CURRENT_ADMIN.id && (
                              <button onClick={() => handleApprove(n.staffMemberId, true)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 10.5, color: T.textMuted, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {t('Mô phỏng: BGH khác duyệt', 'Simulate: another ADMIN approves')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

const SDFilterChip = ({ active, onClick, label, color }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7,
    border: `1.5px solid ${active ? color : T.border}`, background: active ? color + '14' : 'transparent',
    color: active ? color : T.textSecondary, fontSize: 11.5, fontWeight: active ? 800 : 600,
    cursor: 'pointer', fontFamily: 'inherit', minHeight: 30,
  }}>{label}</button>
);

Object.assign(window, { StaffDisciplineScreen });
