// ── Teaching Plan / PPCT (Kế hoạch giảng dạy / Phân phối chương trình) ───
// Routes:  /teacher/teaching-plan       (TEACHER — compose + submit)
//          /principal/teaching-plan     (PRINCIPAL / ADMIN — review + approve)
// Epic:    US-E13.2 (FE)  /  US-051 (BE, E05-deferred).
// Source:  weekly grid + class/subject selectors derived from timetable.jsx;
//          status-chip / list-card pattern lifted from classops.jsx ClassLog.
//
// Domain model (mock):
//   • A plan = (teacher × subject × class × term), weekCount derived from the
//     term (Academic Calendar US-E12.2), periodsPerWeek from subject metadata
//     (US-E12.3/US-E12.6).
//   • Each row = (week, periodInWeek) → { lesson, objectives, notes }.
//   • The plan as a whole has a status: draft / submitted / approved / rejected
//     with optional rejection reason.

// ── Lookups ──────────────────────────────────────────────────────────────────

const TP_TERMS = [
  { id: 't1-2025', label: 'Học kỳ 1 (2025–2026)', labelEn: 'Term 1 (2025–2026)', weekCount: 18, planWeekCount: 15 },
  { id: 't2-2025', label: 'Học kỳ 2 (2025–2026)', labelEn: 'Term 2 (2025–2026)', weekCount: 18, planWeekCount: 15 },
];

const TP_SUBJECTS = [
  { id: 'sub-math', name: 'Toán',     nameEn: 'Mathematics', color: '#5D87FF', periodsPerWeek: 3 },
  { id: 'sub-phys', name: 'Vật Lý',   nameEn: 'Physics',     color: '#FFAE1F', periodsPerWeek: 2 },
  { id: 'sub-chem', name: 'Hoá Học',  nameEn: 'Chemistry',   color: '#FA896B', periodsPerWeek: 2 },
];

const TP_CLASSES = [
  { id: 'cls-10a1', name: '10A1', gradeLevel: 10 },
  { id: 'cls-10a2', name: '10A2', gradeLevel: 10 },
  { id: 'cls-11b2', name: '11B2', gradeLevel: 11 },
  { id: 'cls-12c1', name: '12C1', gradeLevel: 12 },
];

const TP_STATUS = {
  notStarted: { vi: 'Chưa bắt đầu', en: 'Not started', color: '#8898A9',   bg: '#F1F4F8',  icon: 'calendar' },
  draft:      { vi: 'Bản nháp',     en: 'Draft',       color: '#FFAE1F',   bg: '#FEF5E5',  icon: 'penLine' },
  submitted:  { vi: 'Đã nộp',       en: 'Submitted',   color: '#539BFF',   bg: '#EBF3FE',  icon: 'send' },
  approved:   { vi: 'Đã duyệt',     en: 'Approved',    color: '#13DEB9',   bg: '#E6FFFA',  icon: 'check' },
  rejected:   { vi: 'Yêu cầu chỉnh sửa', en: 'Changes requested', color: '#FA896B', bg: '#FFF5F2', icon: 'alertTriangle' },
};

// ── Mock seed ────────────────────────────────────────────────────────────────

// Lesson titles for a Math semester — used both for teacher pre-fill and as
// stub data on principal submissions.
const TP_MATH_LESSONS = [
  ['Mệnh đề', 'Bài 1: Mệnh đề toán học', 'Phân biệt mệnh đề / không phải mệnh đề, mệnh đề chứa biến.'],
  ['Mệnh đề', 'Bài 2: Mệnh đề chứa biến', 'Phủ định, kéo theo, tương đương; sử dụng kí hiệu ∀, ∃.'],
  ['Mệnh đề', 'Luyện tập', 'Vận dụng giải bài tập SGK trang 14–15.'],
  ['Tập hợp', 'Bài 3: Tập hợp & các phép toán', 'Biểu diễn tập hợp; xác định tập con, tập rỗng.'],
  ['Tập hợp', 'Bài 4: Các phép toán trên tập hợp', 'Hợp, giao, hiệu, phần bù; biểu đồ Ven.'],
  ['Tập hợp', 'Luyện tập', 'Bài tập tổng hợp; chuẩn bị bài kiểm tra 15 phút.'],
  ['Bất phương trình', 'Bài 5: BPT bậc nhất một ẩn', 'Giải và biện luận BPT bậc nhất; biểu diễn nghiệm trên trục số.'],
  ['Bất phương trình', 'Bài 6: Hệ BPT bậc nhất', 'Hệ BPT bậc nhất một ẩn; ứng dụng thực tế.'],
  ['Bất phương trình', 'Luyện tập', 'Ôn tập chương, chữa bài tập SBT.'],
  ['Hàm số', 'Bài 7: Khái niệm hàm số', 'Hàm số, tập xác định, tập giá trị.'],
  ['Hàm số', 'Bài 8: Hàm số bậc nhất', 'Đồ thị, tính chất; bài toán thực tế.'],
  ['Hàm số', 'Bài 9: Hàm số bậc hai', 'Parabol, đỉnh, trục đối xứng; bài toán cực trị.'],
  ['Hàm số', 'Luyện tập + Kiểm tra 1 tiết', 'Tổng hợp chương Hàm số.'],
  ['Lượng giác', 'Bài 10: Cung & góc lượng giác', 'Đường tròn lượng giác; quan hệ các giá trị lượng giác.'],
  ['Lượng giác', 'Bài 11: Công thức lượng giác', 'Công thức cộng, nhân đôi, biến đổi tổng – tích.'],
  // remaining weeks left blank for the demo so the progress bar isn't 100%
];

// helper — build the plan rows object for (term × subject)
const tpBuildRows = (term, subject, fillCount) => {
  const rows = {};
  const weeks = term.planWeekCount;
  const ppw = subject.periodsPerWeek;
  let filled = 0;
  for (let w = 1; w <= weeks; w++) {
    for (let p = 1; p <= ppw; p++) {
      const key = `${w}|${p}`;
      if (filled < fillCount) {
        const idx = filled % TP_MATH_LESSONS.length;
        const [chapter, title, obj] = TP_MATH_LESSONS[idx];
        rows[key] = {
          lesson: `${chapter} — ${title}`,
          objectives: obj,
          notes: filled % 5 === 4 ? 'Có bài kiểm tra 15 phút.' : '',
        };
        filled++;
      }
    }
  }
  return rows;
};

const TP_TERM    = TP_TERMS[0];
const TP_SUBJECT = TP_SUBJECTS[0];

// Three submissions seen by the principal — varied statuses so the review
// queue exercises every state.
const TP_SUBMISSIONS_SEED = [
  {
    id: 'pln-1', teacherId: 'tch-1', teacherName: 'Nguyễn Thị Hương', teacherInitials: 'NH',
    classId: 'cls-10a1', subjectId: 'sub-math', termId: 't1-2025',
    submittedAt: '08/09/2025 14:22', updatedAt: '12/09/2025 09:11',
    status: 'submitted',
    rows: tpBuildRows(TP_TERM, TP_SUBJECT, 45),
    rejectReason: '',
  },
  {
    id: 'pln-2', teacherId: 'tch-2', teacherName: 'Trần Văn Minh', teacherInitials: 'TM',
    classId: 'cls-11b2', subjectId: 'sub-phys', termId: 't1-2025',
    submittedAt: '05/09/2025 16:40', updatedAt: '07/09/2025 08:30',
    status: 'approved', approvedBy: 'Trần Minh Quân', approvedAt: '07/09/2025 10:15',
    rows: tpBuildRows(TP_TERM, TP_SUBJECTS[1], TP_TERM.planWeekCount * 2),
    rejectReason: '',
  },
  {
    id: 'pln-3', teacherId: 'tch-3', teacherName: 'Lê Thị Hoa', teacherInitials: 'LH',
    classId: 'cls-12c1', subjectId: 'sub-chem', termId: 't1-2025',
    submittedAt: '06/09/2025 11:05', updatedAt: '09/09/2025 15:22',
    status: 'rejected', rejectedBy: 'Trần Minh Quân', rejectedAt: '09/09/2025 16:00',
    rejectReason: 'Mục tiêu của các tuần 5–7 chưa cụ thể; đề nghị bổ sung tiêu chí đánh giá rõ ràng theo CT GDPT 2018.',
    rows: tpBuildRows(TP_TERM, TP_SUBJECTS[2], 28),
  },
  {
    id: 'pln-4', teacherId: 'tch-4', teacherName: 'Phạm Quốc Bảo', teacherInitials: 'PB',
    classId: 'cls-10a2', subjectId: 'sub-math', termId: 't1-2025',
    submittedAt: '10/09/2025 08:00', updatedAt: '10/09/2025 08:00',
    status: 'submitted',
    rows: tpBuildRows(TP_TERM, TP_SUBJECT, 45),
    rejectReason: '',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const tpProgressOf = (rows, term, subject) => {
  const total = term.planWeekCount * subject.periodsPerWeek;
  let filled = 0;
  for (const k of Object.keys(rows)) {
    if (rows[k]?.lesson?.trim()) filled++;
  }
  return { filled, total, pct: total ? Math.round(filled / total * 100) : 0 };
};

const tpRowKey = (week, period) => `${week}|${period}`;

const TP_LOOKUP = {
  cls: (id) => TP_CLASSES.find(c => c.id === id),
  sub: (id) => TP_SUBJECTS.find(s => s.id === id),
  term: (id) => TP_TERMS.find(t => t.id === id),
};

// ── Sub-components ──────────────────────────────────────────────────────────

// Local style helpers — keep here so the file stays self-contained.
const tpStyles = {
  fieldLabel: {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: T.textMuted, marginBottom: 5, letterSpacing: '0.07em',
    textTransform: 'uppercase',
  },
  textarea: (pColor) => ({
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: `1.5px solid ${T.border}`, fontSize: 12.5, lineHeight: 1.5,
    fontFamily: 'inherit', color: T.textPrimary, background: '#fff',
    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }),
  cardShell: {
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
};

// Selector field (year/term/class/subject) — mirrors TTSelectField in timetable.jsx
const TPSelectField = ({ icon, label, value, onChange, options, t, minWidth = 200 }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div style={{ position: 'relative', minWidth }}>
      <div style={tpStyles.fieldLabel}>{label}</div>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`,
          background: '#fff', fontFamily: 'inherit', fontSize: 13, color: T.textPrimary,
          fontWeight: 700, cursor: 'pointer',
        }}>
        <Icon name={icon} size={13} color={T.textMuted} />
        <span style={{ flex: 1, textAlign: 'left' }}>{current?.label || '—'}</span>
        <Icon name="chevronDown" size={12} color={T.textMuted} />
      </button>
      {open && (
        <React.Fragment>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 51,
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 9,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, maxHeight: 280, overflowY: 'auto',
          }}>
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: o.value === value ? T.primary + '12' : 'transparent',
                  color: o.value === value ? T.primary : T.textPrimary,
                  fontSize: 12.5, fontWeight: o.value === value ? 700 : 500,
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.subtitle && <span style={{ fontSize: 10, color: T.textMuted }}>{o.subtitle}</span>}
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

// Status chip — colour-coded by TP_STATUS.
const TPStatusChip = ({ status, t, size = 'md' }) => {
  const s = TP_STATUS[status] || TP_STATUS.draft;
  const px = size === 'sm' ? '3px 8px' : '5px 12px';
  const fs = size === 'sm' ? 10.5 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: px, borderRadius: 99, background: s.bg, color: s.color,
      fontSize: fs, fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap',
    }}>
      <Icon name={s.icon} size={11} color={s.color} strokeWidth={2.2} />
      {t(s.vi, s.en)}
    </span>
  );
};

// Approved / Rejected banner shown above the plan table.
const TPStatusBanner = ({ status, plan, onResubmit, t }) => {
  if (status === 'approved') {
    return (
      <div style={{
        background: T.successLight, border: `1px solid ${T.success}40`,
        borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: T.success + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="check" size={18} color={T.success} strokeWidth={2.6} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.success }}>
            {t('Kế hoạch đã được phê duyệt', 'Teaching plan has been approved')}
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
            {t(`Phê duyệt bởi ${plan.approvedBy || 'BGH'} · ${plan.approvedAt || ''}`,
               `Approved by ${plan.approvedBy || 'BGH'} · ${plan.approvedAt || ''}`)}
          </div>
        </div>
      </div>
    );
  }
  if (status === 'rejected') {
    return (
      <div style={{
        background: T.errorLight, border: `1px solid ${T.error}40`,
        borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: T.error + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="alertTriangle" size={18} color={T.error} strokeWidth={2.4} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.error }}>
            {t('BGH yêu cầu chỉnh sửa kế hoạch', 'BGH has requested changes')}
          </div>
          {plan.rejectReason && (
            <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 4, lineHeight: 1.55 }}>
              <span style={{ fontWeight: 700 }}>{t('Lý do:', 'Reason:')}</span> {plan.rejectReason}
            </div>
          )}
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
            {t(`${plan.rejectedBy || 'BGH'} · ${plan.rejectedAt || ''}`,
               `${plan.rejectedBy || 'BGH'} · ${plan.rejectedAt || ''}`)}
          </div>
        </div>
        {onResubmit && (
          <button onClick={onResubmit}
            style={{
              padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${T.error}`,
              background: '#fff', color: T.error, fontSize: 12.5, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <Icon name="edit" size={12} color={T.error} />
            {t('Chỉnh sửa lại', 'Edit & resubmit')}
          </button>
        )}
      </div>
    );
  }
  return null;
};

// ── Plan row (inline-editable) ──────────────────────────────────────────────

const TPRow = ({ rowKey, week, period, row, readOnly, isEditing, onEdit, onSave, onCancel, pColor, t }) => {
  const [draft, setDraft] = React.useState({
    lesson: row?.lesson || '',
    objectives: row?.objectives || '',
    notes: row?.notes || '',
  });
  React.useEffect(() => {
    setDraft({ lesson: row?.lesson || '', objectives: row?.objectives || '', notes: row?.notes || '' });
  }, [rowKey, isEditing]); // eslint-disable-line

  const filled = !!row?.lesson?.trim();
  const setD = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  if (isEditing) {
    return (
      <tr style={{ background: pColor + '08' }} data-tp-row={rowKey}>
        <td style={{ ...tpTableStyles.td, textAlign: 'center', verticalAlign: 'top', paddingTop: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: pColor }}>{week}</div>
        </td>
        <td style={{ ...tpTableStyles.td, textAlign: 'center', verticalAlign: 'top', paddingTop: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
            {period}
          </div>
        </td>
        <td style={{ ...tpTableStyles.td, verticalAlign: 'top' }}>
          <input value={draft.lesson} onChange={e => setD('lesson', e.target.value)} autoFocus
            placeholder={t('VD: Mệnh đề — Bài 1: Mệnh đề toán học', 'e.g. Logic — Lesson 1: Statements')}
            style={{ ...tpStyles.textarea(pColor), padding: '7px 10px', fontWeight: 600 }} />
        </td>
        <td style={{ ...tpTableStyles.td, verticalAlign: 'top' }}>
          <textarea value={draft.objectives} onChange={e => setD('objectives', e.target.value)} rows={2}
            placeholder={t('Mục tiêu bài học (kiến thức / kỹ năng / thái độ)', 'Learning objectives (knowledge / skills / attitude)')}
            style={tpStyles.textarea(pColor)} />
        </td>
        <td style={{ ...tpTableStyles.td, verticalAlign: 'top' }}>
          <textarea value={draft.notes} onChange={e => setD('notes', e.target.value)} rows={2}
            placeholder={t('Ghi chú (tài liệu, đồ dùng, kiểm tra…)', 'Notes (materials, assessment…)')}
            style={tpStyles.textarea(pColor)} />
        </td>
        <td style={{ ...tpTableStyles.td, verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap', paddingTop: 6 }}>
          <button onClick={onCancel}
            style={{ padding: '7px 11px', marginRight: 4, borderRadius: 7, border: `1px solid ${T.border}`, background: '#fff', color: T.textSecondary, fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            {t('Huỷ', 'Cancel')}
          </button>
          <button onClick={() => onSave(draft)}
            disabled={!draft.lesson.trim()}
            style={{ padding: '7px 12px', borderRadius: 7, border: 'none',
              background: draft.lesson.trim() ? pColor : T.textMuted, color: '#fff',
              fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
              cursor: draft.lesson.trim() ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="check" size={11} color="#fff" strokeWidth={2.5} />
            {t('Lưu', 'Save')}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr data-tp-row={rowKey}
      onClick={readOnly ? undefined : onEdit}
      style={{
        cursor: readOnly ? 'default' : 'pointer',
        background: filled ? '#fff' : '#FAFBFD',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!readOnly) e.currentTarget.style.background = pColor + '06'; }}
      onMouseLeave={e => { e.currentTarget.style.background = filled ? '#fff' : '#FAFBFD'; }}>
      <td style={{ ...tpTableStyles.td, textAlign: 'center' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: pColor }}>{week}</div>
      </td>
      <td style={{ ...tpTableStyles.td, textAlign: 'center' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          {period}
        </div>
      </td>
      <td style={{ ...tpTableStyles.td }}>
        {filled ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, lineHeight: 1.45 }}>
            {row.lesson}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>
            {readOnly ? t('— Chưa điền —', '— Empty —') : t('Bấm để thêm nội dung…', 'Click to add lesson…')}
          </div>
        )}
      </td>
      <td style={{ ...tpTableStyles.td }}>
        {row?.objectives ? (
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>{row.objectives}</div>
        ) : (
          <div style={{ fontSize: 11.5, color: T.textMuted }}>—</div>
        )}
      </td>
      <td style={{ ...tpTableStyles.td }}>
        {row?.notes ? (
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>{row.notes}</div>
        ) : (
          <div style={{ fontSize: 11.5, color: T.textMuted }}>—</div>
        )}
      </td>
      <td style={{ ...tpTableStyles.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {filled ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
            borderRadius: 99, background: T.successLight, color: T.success,
            fontSize: 10.5, fontWeight: 700,
          }}>
            <Icon name="check" size={10} color={T.success} strokeWidth={2.6} />
            {t('Đã điền', 'Filled')}
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '3px 8px',
            borderRadius: 99, background: T.bg, color: T.textMuted,
            fontSize: 10.5, fontWeight: 700, border: `1px dashed ${T.border}`,
          }}>
            {t('Trống', 'Empty')}
          </span>
        )}
      </td>
    </tr>
  );
};

const tpTableStyles = {
  th: {
    padding: '11px 14px', textAlign: 'left',
    fontSize: 10.5, fontWeight: 800, color: T.textMuted,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    borderBottom: `1px solid ${T.border}`, background: T.bg,
    position: 'sticky', top: 0, zIndex: 5,
  },
  td: {
    padding: '12px 14px', borderBottom: `1px solid ${T.border}`,
    verticalAlign: 'middle',
  },
};

// ── Plan table ──────────────────────────────────────────────────────────────

const TPPlanTable = ({ rows, term, subject, readOnly, editingKey, onEdit, onSave, onCancel, pColor, t }) => {
  const weeks = term.planWeekCount;
  const ppw   = subject.periodsPerWeek;

  return (
    <div style={{ ...tpStyles.cardShell, overflow: 'hidden' }}>
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 920 }}>
          <thead>
            <tr>
              <th style={{ ...tpTableStyles.th, width: 64, textAlign: 'center' }}>{t('Tuần', 'Week')}</th>
              <th style={{ ...tpTableStyles.th, width: 64, textAlign: 'center' }}>{t('Tiết', 'Period')}</th>
              <th style={{ ...tpTableStyles.th, width: '28%' }}>{t('Bài học / Chủ đề', 'Lesson / Topic')}</th>
              <th style={{ ...tpTableStyles.th }}>{t('Mục tiêu', 'Objectives')}</th>
              <th style={{ ...tpTableStyles.th, width: '20%' }}>{t('Ghi chú', 'Notes')}</th>
              <th style={{ ...tpTableStyles.th, width: 100, textAlign: 'center' }}>{t('Trạng thái', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: weeks }, (_, wi) => {
              const week = wi + 1;
              return Array.from({ length: ppw }, (__, pi) => {
                const period = pi + 1;
                const key = tpRowKey(week, period);
                return (
                  <TPRow key={key} rowKey={key} week={week} period={period}
                    row={rows[key]} readOnly={readOnly}
                    isEditing={editingKey === key}
                    onEdit={() => onEdit?.(key)}
                    onSave={(draft) => onSave?.(key, draft)}
                    onCancel={() => onCancel?.()}
                    pColor={pColor} t={t} />
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Progress sidebar (right rail) ───────────────────────────────────────────

const TPProgressSidebar = ({
  status, plan, rows, term, subject, classObj,
  onSubmit, onSaveDraft, onCopyPrior, onResubmit,
  pColor, t,
}) => {
  const progress = tpProgressOf(rows, term, subject);
  const weeks = term.planWeekCount;
  const ppw   = subject.periodsPerWeek;

  // Per-week filled count for the quick-jump rail.
  const weekFilled = React.useMemo(() => {
    const arr = Array.from({ length: weeks }, () => 0);
    for (let w = 1; w <= weeks; w++) {
      for (let p = 1; p <= ppw; p++) {
        if (rows[tpRowKey(w, p)]?.lesson?.trim()) arr[w - 1]++;
      }
    }
    return arr;
  }, [rows, weeks, ppw]);

  const jumpTo = (week) => {
    const el = document.querySelector(`[data-tp-row="${week}|1"]`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const isFinal = status === 'approved';
  const isSubmitted = status === 'submitted';

  return (
    <aside style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Status + meta */}
      <div style={{ ...tpStyles.cardShell, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={tpStyles.fieldLabel}>{t('Trạng thái', 'Status')}</div>
          <TPStatusChip status={status} t={t} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 12 }}>
          <div style={{ color: T.textMuted }}>{t('Lớp', 'Class')}</div>
          <div style={{ color: T.textPrimary, fontWeight: 700 }}>{classObj?.name}</div>
          <div style={{ color: T.textMuted }}>{t('Môn', 'Subject')}</div>
          <div style={{ color: T.textPrimary, fontWeight: 700 }}>{t(subject?.name, subject?.nameEn)}</div>
          <div style={{ color: T.textMuted }}>{t('Học kỳ', 'Term')}</div>
          <div style={{ color: T.textPrimary, fontWeight: 700 }}>{t(term?.label, term?.labelEn)}</div>
          <div style={{ color: T.textMuted }}>{t('Số tuần', 'Weeks')}</div>
          <div style={{ color: T.textPrimary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{weeks} {t('tuần', 'weeks')}</div>
          <div style={{ color: T.textMuted }}>{t('Tiết/tuần', 'Periods/wk')}</div>
          <div style={{ color: T.textPrimary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{ppw}</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ ...tpStyles.cardShell, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={tpStyles.fieldLabel}>{t('Tiến độ điền', 'Fill progress')}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: progress.pct >= 100 ? T.success : pColor }}>
            {progress.pct}%
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {progress.filled}
          </span>
          <span style={{ fontSize: 13, color: T.textMuted }}>/ {progress.total} {t('tiết', 'periods')}</span>
        </div>
        <ProgressBar value={progress.pct} color={progress.pct >= 100 ? T.success : pColor} height={8} />
        {progress.pct < 100 && !isFinal && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: T.textMuted, lineHeight: 1.5 }}>
            {t(`Còn ${progress.total - progress.filled} tiết chưa điền nội dung.`,
               `${progress.total - progress.filled} periods still empty.`)}
          </div>
        )}
      </div>

      {/* Week quick-jump */}
      <div style={{ ...tpStyles.cardShell, padding: 16 }}>
        <div style={tpStyles.fieldLabel}>{t('Nhảy nhanh đến tuần', 'Jump to week')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginTop: 6 }}>
          {Array.from({ length: weeks }, (_, i) => {
            const w = i + 1;
            const f = weekFilled[i];
            const full = f === ppw;
            const empty = f === 0;
            return (
              <button key={w} onClick={() => jumpTo(w)}
                title={t(`Tuần ${w}: ${f}/${ppw} tiết`, `Week ${w}: ${f}/${ppw} periods`)}
                style={{
                  padding: '7px 0', border: `1px solid ${full ? T.success + '60' : empty ? T.border : pColor + '40'}`,
                  borderRadius: 6, background: full ? T.successLight : empty ? '#fff' : pColor + '0E',
                  color: full ? T.success : empty ? T.textMuted : pColor,
                  fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                {w}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, color: T.textMuted, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: T.successLight, border: `1px solid ${T.success}60` }} />
            {t('Đủ', 'Full')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: pColor + '0E', border: `1px solid ${pColor}40` }} />
            {t('Một phần', 'Partial')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: '#fff', border: `1px solid ${T.border}` }} />
            {t('Trống', 'Empty')}
          </span>
        </div>
      </div>

      {/* Actions */}
      {!isFinal && (
        <div style={{ ...tpStyles.cardShell, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onCopyPrior}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 12px', borderRadius: 8, border: `1.5px dashed ${T.border}`,
              background: '#fff', color: T.textSecondary, fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}>
            <Icon name="archive" size={12} color="currentColor" />
            {t('Điền từ kế hoạch năm trước', 'Copy from last year')}
          </button>
          {status === 'rejected' ? (
            <button onClick={onResubmit}
              style={{
                padding: '10px 14px', borderRadius: 9, border: 'none', background: pColor,
                color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <Icon name="send" size={13} color="#fff" />
              {t('Nộp lại kế hoạch', 'Resubmit plan')}
            </button>
          ) : (
            <React.Fragment>
              <button onClick={onSaveDraft} disabled={isSubmitted}
                style={{
                  padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${T.border}`,
                  background: '#fff', color: T.textSecondary, fontSize: 13, fontWeight: 700,
                  fontFamily: 'inherit', cursor: isSubmitted ? 'not-allowed' : 'pointer',
                  opacity: isSubmitted ? 0.5 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Icon name="penLine" size={12} color={T.textSecondary} />
                {t('Lưu nháp', 'Save draft')}
              </button>
              <button onClick={onSubmit} disabled={isSubmitted || progress.filled === 0}
                style={{
                  padding: '10px 14px', borderRadius: 9, border: 'none',
                  background: (isSubmitted || progress.filled === 0) ? T.textMuted : pColor,
                  color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  cursor: (isSubmitted || progress.filled === 0) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Icon name="send" size={13} color="#fff" />
                {isSubmitted ? t('Đã nộp — chờ duyệt', 'Submitted — pending') : t('Nộp kế hoạch', 'Submit plan')}
              </button>
            </React.Fragment>
          )}
        </div>
      )}
    </aside>
  );
};

// ── Not-started empty state ─────────────────────────────────────────────────

const TPNotStarted = ({ subject, classObj, term, onStart, pColor, t }) => (
  <div style={{
    ...tpStyles.cardShell, padding: '64px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 18, background: pColor + '14',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    }}>
      <Icon name="calendar" size={32} color={pColor} strokeWidth={1.7} />
    </div>
    <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
      {t('Bắt đầu soạn PPCT cho học kỳ này.', 'Start drafting the teaching plan for this term.')}
    </div>
    <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 22, maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>
      {t(`Bạn chưa lập phân phối chương trình cho lớp ${classObj?.name} — môn ${subject?.name} · ${term?.label}. Bấm để khởi tạo bảng kế hoạch theo số tuần và số tiết của môn.`,
         `No teaching plan exists yet for class ${classObj?.name} — ${subject?.nameEn} · ${term?.labelEn}. Create a blank plan to start filling in lessons.`)}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
      <Button onClick={onStart} icon="plus">{t('Khởi tạo kế hoạch', 'Create plan')}</Button>
      <Button variant="secondary" icon="archive" onClick={onStart}>
        {t('Điền từ năm trước', 'Copy from last year')}
      </Button>
    </div>
  </div>
);

// ── Teacher screen ──────────────────────────────────────────────────────────

const TeachingPlanScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [termId, setTermId]     = React.useState('t1-2025');
  const [classId, setClassId]   = React.useState('cls-10a1');
  const [subjectId, setSubjId]  = React.useState('sub-math');

  const term    = TP_LOOKUP.term(termId);
  const subject = TP_LOOKUP.sub(subjectId);
  const classObj= TP_LOOKUP.cls(classId);

  // Each (class × subject × term) has its own plan. Persist via a single map.
  const planKey = `${classId}|${subjectId}|${termId}`;
  const [plans, setPlans] = React.useState(() => ({
    'cls-10a1|sub-math|t1-2025': {
      status: 'draft',
      rows: tpBuildRows(TP_LOOKUP.term('t1-2025'), TP_LOOKUP.sub('sub-math'), 18),
      rejectReason: '',
    },
    'cls-10a2|sub-math|t1-2025': {
      status: 'rejected',
      rejectedBy: 'Trần Minh Quân', rejectedAt: '09/09/2025 11:30',
      rejectReason: 'Cần bổ sung mục tiêu cụ thể cho các tuần 3–5 và đính kèm tài liệu tham khảo.',
      rows: tpBuildRows(TP_LOOKUP.term('t1-2025'), TP_LOOKUP.sub('sub-math'), 32),
    },
    'cls-11b2|sub-math|t1-2025': {
      status: 'approved',
      approvedBy: 'Trần Minh Quân', approvedAt: '12/09/2025 15:00',
      rows: tpBuildRows(TP_LOOKUP.term('t1-2025'), TP_LOOKUP.sub('sub-math'), 45),
    },
  }));

  const plan = plans[planKey];
  const status = plan?.status || 'notStarted';

  const [editingKey, setEditingKey] = React.useState(null);
  const [savedFlash, setSavedFlash] = React.useState(null); // null | 'draft' | 'submit'

  React.useEffect(() => { setEditingKey(null); }, [planKey]);

  const updatePlan = (mut) => setPlans(prev => {
    const cur = prev[planKey] || { status: 'draft', rows: {}, rejectReason: '' };
    return { ...prev, [planKey]: mut(cur) };
  });

  const handleStart = () => updatePlan(() => ({ status: 'draft', rows: {}, rejectReason: '' }));

  const handleCopyPrior = () => updatePlan(cur => {
    // Mock: pull from a "previous year" plan (we just reuse the 10A1 demo).
    const priorRows = tpBuildRows(term, subject, term.planWeekCount * subject.periodsPerWeek);
    return { ...cur, rows: { ...priorRows, ...cur.rows }, status: cur.status === 'notStarted' ? 'draft' : cur.status };
  });

  const handleSaveRow = (key, draft) => {
    updatePlan(cur => ({ ...cur, rows: { ...cur.rows, [key]: draft }, status: cur.status === 'approved' ? cur.status : 'draft' }));
    setEditingKey(null);
  };

  const handleSaveDraft = () => {
    updatePlan(cur => ({ ...cur, status: 'draft' }));
    setSavedFlash('draft');
    setTimeout(() => setSavedFlash(null), 2200);
  };

  const handleSubmit = () => {
    updatePlan(cur => ({ ...cur, status: 'submitted' }));
    setSavedFlash('submit');
    setTimeout(() => setSavedFlash(null), 2400);
  };

  const handleResubmit = () => updatePlan(cur => ({ ...cur, status: 'draft', rejectReason: '', rejectedBy: undefined, rejectedAt: undefined }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: T.bg }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              US-E13.2 · {t('PPCT', 'PPCT')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
              {t('Kế hoạch giảng dạy', 'Teaching Plan')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {t('Phân phối chương trình theo tuần — chọn lớp, môn và học kỳ để bắt đầu soạn.',
                 'Weekly programme distribution — pick a class, subject and term to start.')}
            </div>
          </div>
          {savedFlash && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 14px', borderRadius: 99,
              background: savedFlash === 'submit' ? T.successLight : T.primaryLight,
              color: savedFlash === 'submit' ? T.success : pColor,
              fontSize: 12, fontWeight: 700,
            }}>
              <Icon name={savedFlash === 'submit' ? 'send' : 'check'} size={12} color="currentColor" strokeWidth={2.4} />
              {savedFlash === 'submit'
                ? t('Đã nộp kế hoạch cho BGH.', 'Plan submitted to BGH.')
                : t('Đã lưu bản nháp.', 'Draft saved.')}
            </div>
          )}
        </div>

        {/* Selectors */}
        <div style={{ ...tpStyles.cardShell, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <TPSelectField icon="grid" label={t('Lớp', 'Class')} value={classId} onChange={setClassId} t={t} minWidth={170}
            options={TP_CLASSES.map(c => ({ value: c.id, label: c.name, subtitle: `K${c.gradeLevel}` }))} />
          <TPSelectField icon="bookOpen" label={t('Môn', 'Subject')} value={subjectId} onChange={setSubjId} t={t} minWidth={180}
            options={TP_SUBJECTS.map(s => ({ value: s.id, label: t(s.name, s.nameEn), subtitle: `${s.periodsPerWeek}/tuần` }))} />
          <TPSelectField icon="calendar" label={t('Học kỳ', 'Term')} value={termId} onChange={setTermId} t={t} minWidth={220}
            options={TP_TERMS.map(tm => ({ value: tm.id, label: t(tm.label, tm.labelEn) }))} />
          <div style={{ flex: 1 }} />
          {plan && plan.status !== 'notStarted' && (
            <TPStatusChip status={status} t={t} />
          )}
        </div>

        {/* Banner row */}
        <TPStatusBanner status={status} plan={plan || {}}
          onResubmit={status === 'rejected' ? handleResubmit : null} t={t} />

        {/* Main grid */}
        {!plan ? (
          <TPNotStarted subject={subject} classObj={classObj} term={term} onStart={handleStart} pColor={pColor} t={t} />
        ) : (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TPPlanTable rows={plan.rows} term={term} subject={subject}
                readOnly={status === 'approved' || status === 'submitted'}
                editingKey={editingKey}
                onEdit={setEditingKey}
                onSave={handleSaveRow}
                onCancel={() => setEditingKey(null)}
                pColor={pColor} t={t} />
            </div>
            <TPProgressSidebar
              status={status} plan={plan} rows={plan.rows}
              term={term} subject={subject} classObj={classObj}
              onSubmit={handleSubmit} onSaveDraft={handleSaveDraft}
              onCopyPrior={handleCopyPrior} onResubmit={handleResubmit}
              pColor={pColor} t={t} />
          </div>
        )}
      </div>
    </main>
  );
};

// ── Principal review screen ─────────────────────────────────────────────────

const TeachingPlanReviewScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [submissions, setSubmissions] = React.useState(TP_SUBMISSIONS_SEED);
  const [filterStatus, setFilterStatus] = React.useState('submitted'); // submitted | all | approved | rejected
  const [selectedId, setSelectedId] = React.useState('pln-1');
  const [rejectMode, setRejectMode] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const filtered = submissions.filter(s => filterStatus === 'all' || s.status === filterStatus);
  const selected = submissions.find(s => s.id === selectedId) || filtered[0];

  React.useEffect(() => { setRejectMode(false); setRejectReason(''); }, [selectedId]);

  const subject = selected ? TP_LOOKUP.sub(selected.subjectId) : null;
  const classObj = selected ? TP_LOOKUP.cls(selected.classId) : null;
  const term = selected ? TP_LOOKUP.term(selected.termId) : null;
  const progress = selected ? tpProgressOf(selected.rows, term, subject) : null;

  const handleApprove = () => {
    setSubmissions(prev => prev.map(s => s.id === selected.id ? {
      ...s, status: 'approved', approvedBy: 'Trần Minh Quân',
      approvedAt: new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    } : s));
  };
  const handleReject = () => {
    if (!rejectReason.trim()) return;
    setSubmissions(prev => prev.map(s => s.id === selected.id ? {
      ...s, status: 'rejected', rejectedBy: 'Trần Minh Quân',
      rejectedAt: new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      rejectReason: rejectReason.trim(),
    } : s));
    setRejectMode(false); setRejectReason('');
  };

  const FILTERS = [
    { id: 'submitted', vi: 'Chờ duyệt',  en: 'Pending', count: submissions.filter(s => s.status === 'submitted').length },
    { id: 'approved',  vi: 'Đã duyệt',   en: 'Approved', count: submissions.filter(s => s.status === 'approved').length },
    { id: 'rejected',  vi: 'Đã yêu cầu sửa', en: 'Returned', count: submissions.filter(s => s.status === 'rejected').length },
    { id: 'all',       vi: 'Tất cả',     en: 'All', count: submissions.length },
  ];

  return (
    <main style={{ flex: 1, overflowY: 'hidden', padding: 0, background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 32px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          US-E13.2 · {t('PPCT', 'PPCT')}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
          {t('Phê duyệt kế hoạch giảng dạy', 'Review Teaching Plans')}
        </div>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
          {t('Xem và phê duyệt phân phối chương trình do giáo viên nộp.',
             'Review and approve teaching plans submitted by teachers.')}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: '0 32px 24px', gap: 16 }}>
        {/* Left: submissions list */}
        <div style={{ width: 360, flexShrink: 0, ...tpStyles.cardShell, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filter tabs */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id)}
                style={{
                  padding: '5px 10px', borderRadius: 99, border: `1px solid ${filterStatus === f.id ? pColor : T.border}`,
                  background: filterStatus === f.id ? pColor + '12' : 'transparent',
                  color: filterStatus === f.id ? pColor : T.textSecondary,
                  fontSize: 11.5, fontWeight: filterStatus === f.id ? 700 : 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                {t(f.vi, f.en)}
                <span style={{
                  background: filterStatus === f.id ? pColor : T.border,
                  color: filterStatus === f.id ? '#fff' : T.textSecondary,
                  borderRadius: 99, padding: '0 6px', fontSize: 10, minWidth: 16, textAlign: 'center', fontWeight: 800,
                }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                {t('Không có kế hoạch nào.', 'No teaching plans.')}
              </div>
            )}
            {filtered.map(s => {
              const sCls = TP_LOOKUP.cls(s.classId);
              const sSubj = TP_LOOKUP.sub(s.subjectId);
              const sTerm = TP_LOOKUP.term(s.termId);
              const prog = tpProgressOf(s.rows, sTerm, sSubj);
              const isSelected = s.id === selected?.id;
              return (
                <button key={s.id} onClick={() => setSelectedId(s.id)}
                  style={{
                    width: '100%', textAlign: 'left', background: isSelected ? pColor + '0B' : 'transparent',
                    border: 'none', borderLeft: `3px solid ${isSelected ? pColor : 'transparent'}`,
                    borderBottom: `1px solid ${T.border}`, padding: '14px 18px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Avatar initials={s.teacherInitials} color={pColor} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.teacherName}
                        </div>
                        <TPStatusChip status={s.status} t={t} size="sm" />
                      </div>
                      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: sSubj?.color || T.textSecondary }}>{t(sSubj?.name, sSubj?.nameEn)}</span>
                        <span>·</span>
                        <span>{t(`Lớp ${sCls?.name}`, `Class ${sCls?.name}`)}</span>
                        <span>·</span>
                        <span>{t(sTerm?.label, sTerm?.labelEn)}</span>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar value={prog.pct} color={prog.pct >= 100 ? T.success : pColor} height={4} style={{ flex: 1 }} />
                        <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                          {prog.filled}/{prog.total}
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 6 }}>
                        {t(`Nộp ngày ${s.submittedAt}`, `Submitted ${s.submittedAt}`)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: read-only plan + review actions */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ ...tpStyles.cardShell, padding: 60, textAlign: 'center', color: T.textMuted }}>
              {t('Chọn một kế hoạch để xem chi tiết.', 'Select a plan to review.')}
            </div>
          ) : (
            <React.Fragment>
              {/* Submission meta */}
              <div style={{ ...tpStyles.cardShell, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <Avatar initials={selected.teacherInitials} color={pColor} size={44} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
                      {selected.teacherName}
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: subject?.color }}>{t(subject?.name, subject?.nameEn)}</span>
                      <span>·</span>
                      <span>{t(`Lớp ${classObj?.name}`, `Class ${classObj?.name}`)}</span>
                      <span>·</span>
                      <span>{t(term?.label, term?.labelEn)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                      {t(`Nộp lần đầu: ${selected.submittedAt} · Cập nhật: ${selected.updatedAt}`,
                         `Submitted: ${selected.submittedAt} · Updated: ${selected.updatedAt}`)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {t('Tiến độ', 'Progress')}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: progress.pct >= 100 ? T.success : pColor, fontVariantNumeric: 'tabular-nums' }}>
                        {progress.filled}/{progress.total}
                      </div>
                    </div>
                    <TPStatusChip status={selected.status} t={t} />
                  </div>
                </div>

                {/* Existing rejection / approval note */}
                {selected.status === 'rejected' && selected.rejectReason && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: T.errorLight, border: `1px solid ${T.error}30`, borderRadius: 9 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: T.error, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('Lý do yêu cầu chỉnh sửa', 'Reason for changes')}
                    </div>
                    <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>{selected.rejectReason}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                      {selected.rejectedBy} · {selected.rejectedAt}
                    </div>
                  </div>
                )}
                {selected.status === 'approved' && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: T.successLight, border: `1px solid ${T.success}30`, borderRadius: 9, fontSize: 12.5, color: T.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={13} color={T.success} strokeWidth={2.5} />
                    {t(`Đã phê duyệt bởi ${selected.approvedBy} · ${selected.approvedAt}`,
                       `Approved by ${selected.approvedBy} · ${selected.approvedAt}`)}
                  </div>
                )}

                {/* Action buttons */}
                {selected.status === 'submitted' && (
                  rejectMode ? (
                    <div style={{ marginTop: 14, padding: 14, background: T.bg, borderRadius: 9, border: `1px solid ${T.border}` }}>
                      <label style={tpStyles.fieldLabel}>
                        {t('Lý do yêu cầu chỉnh sửa', 'Reason for changes')} <span style={{ color: T.error }}>*</span>
                      </label>
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                        placeholder={t('VD: Mục tiêu tuần 5 chưa cụ thể, đề nghị bổ sung tiêu chí đánh giá…',
                                       'e.g. Week 5 objectives need more detail, add assessment criteria…')}
                        style={tpStyles.textarea(pColor)} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                        <Button variant="ghost" onClick={() => { setRejectMode(false); setRejectReason(''); }}>{t('Huỷ', 'Cancel')}</Button>
                        <Button variant="danger" onClick={handleReject} icon="send" disabled={!rejectReason.trim()}>
                          {t('Gửi yêu cầu chỉnh sửa', 'Send change request')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setRejectMode(true)}
                        style={{
                          padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${T.border}`,
                          background: '#fff', color: T.textSecondary, fontSize: 13, fontWeight: 700,
                          fontFamily: 'inherit', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        <Icon name="alertTriangle" size={12} color={T.textSecondary} />
                        {t('Yêu cầu chỉnh sửa', 'Request changes')}
                      </button>
                      <button onClick={handleApprove}
                        style={{
                          padding: '9px 18px', borderRadius: 9, border: 'none',
                          background: T.success, color: '#fff', fontSize: 13, fontWeight: 700,
                          fontFamily: 'inherit', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
                        {t('Phê duyệt', 'Approve')}
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Plan table — read-only */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <TPPlanTable rows={selected.rows} term={term} subject={subject}
                  readOnly={true} editingKey={null} pColor={pColor} t={t} />
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    </main>
  );
};

Object.assign(window, { TeachingPlanScreen, TeachingPlanReviewScreen });
