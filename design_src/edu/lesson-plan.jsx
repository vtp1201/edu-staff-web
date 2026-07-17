// ── Lesson Plan Authoring (Soạn giáo án) ────────────────────────────────────
// Routes:   /teacher/lesson-plans          — TEACHER list (own DRAFT+PUBLISHED
//                                             + "Toàn trường" browse of PUBLISHED)
//           /teacher/lesson-plans/create    — TEACHER builder (create)
//           /teacher/lesson-plans/:id/edit  — TEACHER builder (edit, DRAFT only)
// Epic:     US-E18.16 (FE design) / DR-021, BE contract `lessonplan` (core service)
// NOT the existing lesson-bank.jsx (file-sharing repository — different domain,
// zero field overlap; kept untouched).
//
// Two exported components on window:
//   • LessonPlanScreen        — list view (filter bar + owner toggle + card grid)
//   • LessonPlanBuilderScreen — full-screen 2-col builder (meta ⟷ 4 doc sections)
//
// Visual references:
//   • exam-bank.jsx    — owner toggle, StatusBadge draft/published 2-value
//                        convention, builder top bar, one-way publish confirm
//   • lesson-bank.jsx   — card GRID layout (repeat auto-fill minmax 260px)
//   • states.jsx        — EduSkeleton / EduEmpty / EduError (loading/empty/error)

// ── Domain vocabulary ───────────────────────────────────────────────────────

const LP_SUBJECTS = [
  { id: 'sub-math', vi: 'Toán học',  en: 'Mathematics', color: '#5D87FF' },
  { id: 'sub-phys', vi: 'Vật Lý',    en: 'Physics',     color: '#13DEB9' },
  { id: 'sub-chem', vi: 'Hoá Học',   en: 'Chemistry',   color: '#FFAE1F' },
  { id: 'sub-lit',  vi: 'Ngữ Văn',   en: 'Literature',  color: '#7B5EA7' },
  { id: 'sub-eng',  vi: 'Tiếng Anh', en: 'English',     color: '#1FAFC0' },
  { id: 'sub-hist', vi: 'Lịch Sử',   en: 'History',     color: '#FA896B' },
];

const LP_GRADES = [10, 11, 12];

// DRAFT/PUBLISHED — reuse the exact warning/success 2-value convention from
// exam-bank.jsx (EB_STATUS). No new token.
const LP_STATUS = {
  DRAFT:     { vi: 'Nháp',          en: 'Draft',     color: '#FFAE1F', bg: '#FEF5E5', icon: 'penLine' },
  PUBLISHED: { vi: 'Đã phát hành',  en: 'Published', color: '#13DEB9', bg: '#E6FFFA', icon: 'check' },
};

const LP_OWNERS = {
  me:      { id: 'me',    name: 'Bạn',              en: 'You',           initials: 'NH' },
  'tch-2': { id: 'tch-2', name: 'Trần Văn Minh',    en: 'Tran V. Minh',  initials: 'TM' },
  'tch-3': { id: 'tch-3', name: 'Lê Thị Hoa',       en: 'Le T. Hoa',     initials: 'LH' },
  'tch-4': { id: 'tch-4', name: 'Phạm Quốc Bảo',    en: 'Pham Q. Bao',   initials: 'PB' },
};

// The 4 named document sections — do NOT invent a richer schema than this.
const LP_SECTIONS = [
  { key: 'objectives',       vi: 'Mục tiêu bài học',        en: 'Objectives',        icon: 'flag',         placeholderVi: 'VD: Học sinh nắm được định nghĩa đạo hàm và ý nghĩa hình học của đạo hàm.', placeholderEn: 'e.g. Students understand the definition of a derivative and its geometric meaning.' },
  { key: 'contentOutline',   vi: 'Nội dung chính',           en: 'Content outline',   icon: 'list',         placeholderVi: 'VD: 1) Định nghĩa đạo hàm. 2) Quy tắc tính đạo hàm. 3) Ứng dụng.', placeholderEn: 'e.g. 1) Definition. 2) Differentiation rules. 3) Applications.' },
  { key: 'activities',       vi: 'Hoạt động dạy học',        en: 'Activities',        icon: 'users',        placeholderVi: 'VD: Khởi động 5 phút — Hình thành kiến thức 20 phút — Luyện tập 15 phút.', placeholderEn: 'e.g. Warm-up 5 min — Concept building 20 min — Practice 15 min.' },
  { key: 'assessmentMethod', vi: 'Phương pháp đánh giá',     en: 'Assessment method', icon: 'checkSquare', placeholderVi: 'VD: Hỏi đáp nhanh cuối giờ + bài tập về nhà 5 câu trắc nghiệm.', placeholderEn: 'e.g. Quick oral check at the end + 5-question MCQ homework.' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const lpSubject = (id) => LP_SUBJECTS.find(s => s.id === id) || LP_SUBJECTS[0];
const lpOwner   = (id) => LP_OWNERS[id] || LP_OWNERS.me;
const lpToday   = () => new Date().toLocaleDateString('vi-VN');

const useLPIsMobile = () => {
  const [mobile, setMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 860 : false);
  React.useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

// ── Seed data ───────────────────────────────────────────────────────────────

const LP_SEED = [
  {
    id: 'lp1', ownerId: 'me', title: 'Giáo án — Đạo hàm và ý nghĩa hình học',
    subjectId: 'sub-math', gradeLevel: 11, status: 'PUBLISHED',
    objectives: 'Học sinh nắm được định nghĩa đạo hàm tại một điểm và hiểu ý nghĩa hình học (hệ số góc tiếp tuyến).',
    contentOutline: '1) Định nghĩa đạo hàm. 2) Ý nghĩa hình học. 3) Phương trình tiếp tuyến.',
    activities: 'Khởi động 5 phút (bài toán vận tốc tức thời) — Hình thành kiến thức 25 phút — Luyện tập 15 phút.',
    assessmentMethod: 'Hỏi đáp nhanh + 3 bài tập viết phương trình tiếp tuyến.',
    tags: ['Chương 5', 'CT2018'], publishedAt: '18/05/2026', createdAt: '10/05/2026', updatedAt: '18/05/2026',
  },
  {
    id: 'lp2', ownerId: 'me', title: 'Giáo án — Khảo sát hàm số bậc ba',
    subjectId: 'sub-math', gradeLevel: 12, status: 'DRAFT',
    objectives: 'Học sinh khảo sát và vẽ đồ thị hàm số bậc ba.',
    contentOutline: '1) Tập xác định. 2) Sự biến thiên. 3) Đồ thị.',
    activities: '', assessmentMethod: '',
    tags: ['Chương 1'], publishedAt: null, createdAt: '28/05/2026', updatedAt: '30/05/2026',
  },
  {
    id: 'lp3', ownerId: 'me', title: 'Giáo án — Giới hạn của hàm số',
    subjectId: 'sub-math', gradeLevel: 11, status: 'DRAFT',
    objectives: '', contentOutline: '', activities: '', assessmentMethod: '',
    tags: [], publishedAt: null, createdAt: '01/06/2026', updatedAt: '01/06/2026',
  },
  {
    id: 'lp4', ownerId: 'tch-2', title: 'Giáo án — Điện trường và cường độ điện trường',
    subjectId: 'sub-phys', gradeLevel: 11, status: 'PUBLISHED',
    objectives: 'Học sinh hiểu khái niệm điện trường và tính được cường độ điện trường.',
    contentOutline: '1) Khái niệm điện trường. 2) Cường độ điện trường. 3) Nguyên lý chồng chất.',
    activities: 'Thí nghiệm mô phỏng 10 phút — Giảng giải 20 phút — Bài tập nhóm 15 phút.',
    assessmentMethod: 'Phiếu bài tập nhóm chấm theo thang 10 điểm.',
    tags: ['Chương 3'], publishedAt: '12/05/2026', createdAt: '05/05/2026', updatedAt: '12/05/2026',
  },
  {
    id: 'lp5', ownerId: 'tch-3', title: 'Giáo án — Phản ứng oxi hoá khử',
    subjectId: 'sub-chem', gradeLevel: 10, status: 'PUBLISHED',
    objectives: 'Học sinh cân bằng được phương trình phản ứng oxi hoá khử bằng phương pháp thăng bằng electron.',
    contentOutline: '1) Chất oxi hoá — chất khử. 2) Phương pháp thăng bằng electron.',
    activities: 'Ví dụ mẫu 10 phút — Luyện tập theo cặp 20 phút.',
    assessmentMethod: 'Bài kiểm tra 15 phút cuối giờ.',
    tags: ['Thực hành'], publishedAt: '08/05/2026', createdAt: '02/05/2026', updatedAt: '08/05/2026',
  },
  {
    id: 'lp6', ownerId: 'tch-4', title: 'Giáo án — Phân tích đoạn trích Trao duyên',
    subjectId: 'sub-lit', gradeLevel: 11, status: 'PUBLISHED',
    objectives: 'Học sinh phân tích được diễn biến tâm trạng Thuý Kiều trong đoạn trích.',
    contentOutline: '1) Vị trí đoạn trích. 2) Diễn biến tâm trạng. 3) Giá trị nghệ thuật.',
    activities: 'Đọc diễn cảm 5 phút — Thảo luận nhóm 20 phút — Trình bày 15 phút.',
    assessmentMethod: 'Bài viết ngắn 200 chữ nộp cuối giờ.',
    tags: ['Văn học VN'], publishedAt: '20/05/2026', createdAt: '14/05/2026', updatedAt: '20/05/2026',
  },
];

// ── Shared sub-components ───────────────────────────────────────────────────

const lpStyles = {
  cardShell: {
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  fieldLabel: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: T.textMuted, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit',
    color: T.textPrimary, background: '#fff', outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1.5px solid ${T.border}`, fontSize: 13, lineHeight: 1.55,
    fontFamily: 'inherit', color: T.textPrimary, background: '#fff', outline: 'none',
    resize: 'vertical', boxSizing: 'border-box', minHeight: 96,
  },
};

const LPStatusChip = ({ status, t, size = 'md' }) => {
  const s = LP_STATUS[status] || LP_STATUS.DRAFT;
  const px = size === 'sm' ? '3px 8px' : '4px 11px';
  const fs = size === 'sm' ? 10.5 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: px, borderRadius: 99, background: s.bg, color: s.color,
      fontSize: fs, fontWeight: 700, letterSpacing: '0.01em',
    }}>
      <Icon name={s.icon} size={fs - 1} color={s.color} strokeWidth={2.2} />
      {t(s.vi, s.en)}
    </span>
  );
};

// Tag-chips input — reused shape for lesson-plan + question-bank.
const LPTagChipsInput = ({ tags, onChange, t, disabled }) => {
  const [draft, setDraft] = React.useState('');
  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
  };
  const remove = (tag) => onChange(tags.filter(x => x !== tag));
  return (
    <div style={{
      ...lpStyles.input, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
      padding: '7px 10px', minHeight: 40, background: disabled ? T.bg : '#fff',
    }}>
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6, background: T.primary + '12', color: T.primary,
          fontSize: 11.5, fontWeight: 700,
        }}>
          {tag}
          {!disabled && (
            <button type="button" onClick={() => remove(tag)}
              aria-label={t(`Xoá thẻ ${tag}`, `Remove tag ${tag}`)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
              <Icon name="x" size={11} color={T.primary} strokeWidth={2.4} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } }}
          onBlur={commit}
          placeholder={tags.length === 0 ? t('Nhập thẻ, Enter để thêm…', 'Type a tag, Enter to add…') : ''}
          style={{ flex: '1 1 100px', minWidth: 100, border: 'none', outline: 'none', fontSize: 12.5, fontFamily: 'inherit', background: 'transparent', color: T.textPrimary }} />
      )}
    </div>
  );
};

const LPDropdown = ({ label, value, options, onChange, icon, minWidth = 160 }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div style={{ position: 'relative', minWidth }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.border}`,
        background: '#fff', fontFamily: 'inherit', fontSize: 12.5,
        color: T.textPrimary, fontWeight: 600, cursor: 'pointer', minHeight: 40,
      }}>
        {icon && <Icon name={icon} size={12} color={T.textMuted} />}
        <span style={{ color: T.textMuted, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>{current?.label || '—'}</span>
        <Icon name="chevronDown" size={11} color={T.textMuted} />
      </button>
      {open && (
        <React.Fragment>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div role="listbox" style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 51,
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 9,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, maxHeight: 280, overflowY: 'auto',
          }}>
            {options.map(o => (
              <button key={o.value} role="option" aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  background: o.value === value ? T.primary + '12' : 'transparent',
                  color: o.value === value ? T.primary : T.textPrimary,
                  fontSize: 12.5, fontWeight: o.value === value ? 700 : 500, fontFamily: 'inherit',
                }}>
                {o.label}
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

// ── Lesson plan card (grid view — mirrors lesson-bank.jsx grid) ────────────

const LPCard = ({ plan, t, pColor, isMine, onOpen }) => {
  const subj = lpSubject(plan.subjectId);
  const owner = lpOwner(plan.ownerId);
  const filledSections = LP_SECTIONS.filter(s => (plan[s.key] || '').trim()).length;

  return (
    <div style={{
      ...lpStyles.cardShell, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; }}
    >
      {/* Header strip */}
      <div style={{
        height: 64, padding: '0 16px', flexShrink: 0,
        background: `linear-gradient(135deg, ${subj.color}12 0%, ${subj.color}26 100%)`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <Icon name="scrollText" size={19} color={subj.color} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: subj.color }}>{t(subj.vi, subj.en)}</span>
          <span style={{ fontSize: 10.5, color: T.textMuted }}> · {t(`Lớp ${plan.gradeLevel}`, `Grade ${plan.gradeLevel}`)}</span>
        </div>
        <LPStatusChip status={plan.status} t={t} size="sm" />
      </div>

      {/* Body */}
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: T.textPrimary, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 38,
        }}>
          {plan.title || t('— Chưa đặt tên giáo án —', '— Untitled lesson plan —')}
        </div>

        <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="checkSquare" size={11} color={T.textMuted} />
          {t(`${filledSections}/4 mục đã soạn`, `${filledSections}/4 sections drafted`)}
        </div>

        {plan.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {plan.tags.map(tag => (
              <span key={tag} style={{
                padding: '2px 8px', borderRadius: 99, background: T.bg, color: T.textSecondary,
                fontSize: 10, fontWeight: 700,
              }}>{tag}</span>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 10.5, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <Icon name="clock" size={10} color={T.textMuted} />
          {t('Cập nhật:', 'Updated:')} {plan.updatedAt}
          {!isMine && (
            <React.Fragment>
              <span style={{ color: T.border }}>·</span>
              {t('GV:', 'By:')} {t(owner.name, owner.en)}
            </React.Fragment>
          )}
        </div>

        <button onClick={() => onOpen(plan)} style={{
          marginTop: 4, padding: '8px 12px', borderRadius: 8,
          border: `1px solid ${pColor}30`, background: pColor + '0A', color: pColor,
          fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          <Icon name={isMine ? 'penLine' : 'eye'} size={11} color={pColor} strokeWidth={2.2} />
          {isMine ? t('Xem / Sửa', 'View / Edit') : t('Xem chi tiết', 'View detail')}
        </button>
      </div>
    </div>
  );
};

// ── List screen ─────────────────────────────────────────────────────────────

const LessonPlanScreen = ({ lang, primaryColor, role = 'teacher', mode = 'list', onModeChange, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isMobile = useLPIsMobile();

  const [plans, setPlans] = React.useState(LP_SEED);
  const [filters, setFilters] = React.useState({ q: '', subject: 'all', grade: 'all', status: 'all', owner: 'me' });
  const [editingId, setEditingId] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [internalMode, setInternalMode] = React.useState('list');

  // Loading / error — bộ chuẩn states.jsx.
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

  const currentMode = onModeChange ? mode : internalMode;
  const setMode = (m) => { if (onModeChange) onModeChange(m); else setInternalMode(m); };

  const showToast = (msg) => { setToast(msg); window.setTimeout(() => setToast(null), 2400); };

  // ── Filter pipeline ───────────────────────────────────────────────────────
  const visible = React.useMemo(() => {
    let arr = plans;
    // Owner "me" = own DRAFT+PUBLISHED. "all" = school-wide browse, PUBLISHED only
    // (mirrors BE /subject/:id — cross-teacher visibility is PUBLISHED-only).
    if (filters.owner === 'me') arr = arr.filter(p => p.ownerId === 'me');
    else arr = arr.filter(p => p.status === 'PUBLISHED');
    if (filters.subject !== 'all') arr = arr.filter(p => p.subjectId === filters.subject);
    if (filters.grade !== 'all')   arr = arr.filter(p => String(p.gradeLevel) === filters.grade);
    if (filters.status !== 'all' && filters.owner === 'me') arr = arr.filter(p => p.status === filters.status);
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      arr = arr.filter(p => p.title.toLowerCase().includes(q));
    }
    return arr;
  }, [plans, filters]);

  const handleCreateNew = () => { setEditingId(null); setMode('builder'); };
  const handleOpen = (plan) => { setEditingId(plan.id); setMode('builder'); };
  const handleSave = (payload) => {
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === payload.id);
      if (idx === -1) return [{ ...payload, ownerId: 'me' }, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...payload };
      return next;
    });
    setMode('list');
    setEditingId(null);
    showToast(payload.status === 'PUBLISHED'
      ? t('Đã phát hành giáo án.', 'Lesson plan published.')
      : t('Đã lưu nháp.', 'Draft saved.'));
  };

  const filtersDirty = filters.q || filters.subject !== 'all' || filters.grade !== 'all' || filters.status !== 'all';
  const ownCount = plans.filter(p => p.ownerId === 'me').length;
  const schoolPubCount = plans.filter(p => p.status === 'PUBLISHED').length;

  if (currentMode === 'builder') {
    const editing = editingId ? plans.find(p => p.id === editingId) : null;
    return (
      <LessonPlanBuilderScreen
        lang={lang} primaryColor={primaryColor}
        plan={editing}
        onCancel={() => { setMode('list'); setEditingId(null); }}
        onSave={handleSave}
      />
    );
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '24px 32px', background: T.bg, position: 'relative' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              US-E18.16 · {t('Soạn giáo án', 'Lesson Plan Authoring')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
              {filters.owner === 'me' ? t('Giáo án của tôi', 'My Lesson Plans') : t('Giáo án đã phát hành — toàn trường', 'Published Lesson Plans — School-wide')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {filters.owner === 'me'
                ? t(`Bạn có ${ownCount} giáo án.`, `You have ${ownCount} lesson plans.`)
                : t(`${schoolPubCount} giáo án đã phát hành từ tất cả giáo viên.`, `${schoolPubCount} published lesson plans across all teachers.`)}
            </div>
          </div>
          <div style={{ display: 'flex', borderRadius: 9, border: `1.5px solid ${T.border}`, overflow: 'hidden', background: '#fff' }} role="group" aria-label={t('Phạm vi xem', 'View scope')}>
            {[
              { id: 'me',  label: t('Của tôi', 'Mine'), count: ownCount },
              { id: 'all', label: t('Toàn trường', 'School'), count: schoolPubCount },
            ].map(o => (
              <button key={o.id} onClick={() => setFilters(f => ({ ...f, owner: o.id }))} aria-pressed={filters.owner === o.id}
                style={{
                  padding: '8px 14px', border: 'none',
                  background: filters.owner === o.id ? pColor + '14' : 'transparent',
                  color: filters.owner === o.id ? pColor : T.textSecondary,
                  fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40,
                }}>
                {o.label}
                <span style={{
                  padding: '1px 7px', borderRadius: 99,
                  background: filters.owner === o.id ? pColor : T.border,
                  color: filters.owner === o.id ? '#fff' : T.textSecondary,
                  fontSize: 10, fontWeight: 800,
                }}>{o.count}</span>
              </button>
            ))}
          </div>
          <Button onClick={handleCreateNew} icon="plus">{t('Soạn giáo án mới', 'Create lesson plan')}</Button>
        </div>

        {/* Filter bar */}
        <div style={{ ...lpStyles.cardShell, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
              aria-label={t('Tìm theo tên giáo án', 'Search by lesson plan title')}
              placeholder={t('Tìm theo tên giáo án…', 'Search by lesson plan title…')}
              style={{
                width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9,
                border: `1.5px solid ${T.border}`, fontSize: 12.5, fontFamily: 'inherit',
                background: '#fff', color: T.textPrimary, outline: 'none', boxSizing: 'border-box', minHeight: 40,
              }} />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
              <Icon name="search" size={14} color={T.textMuted} />
            </span>
          </div>
          <LPDropdown label={t('Môn', 'Subject')} icon="bookOpen" value={filters.subject}
            onChange={v => setFilters(f => ({ ...f, subject: v }))}
            options={[{ value: 'all', label: t('Tất cả môn', 'All subjects') }, ...LP_SUBJECTS.map(s => ({ value: s.id, label: t(s.vi, s.en) }))]}
            minWidth={170} />
          <LPDropdown label={t('Khối', 'Grade')} icon="graduationCap" value={filters.grade}
            onChange={v => setFilters(f => ({ ...f, grade: v }))}
            options={[{ value: 'all', label: t('Tất cả khối', 'All grades') }, ...LP_GRADES.map(g => ({ value: String(g), label: t(`Lớp ${g}`, `Grade ${g}`) }))]}
            minWidth={140} />
          {filters.owner === 'me' && (
            <LPDropdown label={t('Trạng thái', 'Status')} icon="layers" value={filters.status}
              onChange={v => setFilters(f => ({ ...f, status: v }))}
              options={[
                { value: 'all', label: t('Tất cả', 'All') },
                { value: 'DRAFT', label: t('Nháp', 'Draft') },
                { value: 'PUBLISHED', label: t('Đã phát hành', 'Published') },
              ]} minWidth={150} />
          )}
        </div>

        {/* States */}
        {status === 'loading' && <EduSkeleton variant="cards" count={6} lang={lang} />}
        {status === 'error' && (
          <EduError lang={lang} onRetry={refresh}
            title={t('Không tải được danh sách giáo án', 'Could not load lesson plans')}
            desc={t('Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.', 'Something went wrong while contacting the server. Please try again.')} />
        )}
        {status === 'ready' && (
          visible.length === 0 ? (
            filtersDirty ? (
              <EduEmpty lang={lang} icon="search" color={T.textMuted}
                title={t('Không có giáo án nào phù hợp.', 'No lesson plans match these filters.')}
                desc={t('Thử bỏ chọn bộ lọc hoặc đổi từ khoá tìm kiếm.', 'Try clearing filters or changing the search query.')}
                action={{ label: t('Bỏ lọc', 'Clear filters'), icon: 'x', onClick: () => setFilters(f => ({ ...f, q: '', subject: 'all', grade: 'all', status: 'all' })) }} />
            ) : (
              <EduEmpty lang={lang} icon="scrollText" color={pColor}
                title={filters.owner === 'me' ? t('Chưa có giáo án nào.', 'No lesson plans yet.') : t('Chưa có giáo án nào được phát hành.', 'No lesson plans published yet.')}
                desc={filters.owner === 'me'
                  ? t('Bắt đầu soạn giáo án đầu tiên — điền mục tiêu, nội dung, hoạt động và đánh giá, lưu nháp hoặc phát hành.', 'Start your first lesson plan — fill in objectives, content, activities and assessment, save a draft or publish.')
                  : t('Chưa có giáo viên nào phát hành giáo án cho môn/khối này.', 'No teacher has published a lesson plan for this subject/grade yet.')}
                action={filters.owner === 'me' ? { label: t('Soạn giáo án mới', 'Create lesson plan'), icon: 'plus', onClick: handleCreateNew } : undefined} />
            )
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {visible.map(plan => (
                <LPCard key={plan.id} plan={plan} t={t} pColor={pColor}
                  isMine={plan.ownerId === 'me'} onOpen={handleOpen} />
              ))}
            </div>
          )
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: '#fff', padding: '10px 18px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1100,
          animation: 'lp-toast-in 0.2s ease-out', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={14} color={T.success} strokeWidth={2.6} />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes lp-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes lp-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </main>
  );
};

// ── Builder ──────────────────────────────────────────────────────────────────

const LessonPlanBuilderScreen = ({ lang, primaryColor, plan, onCancel, onSave }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isEdit = !!plan;
  const isMobile = useLPIsMobile();

  const initial = plan || {
    id: `lp${Date.now()}`,
    title: '', subjectId: 'sub-math', gradeLevel: 10, status: 'DRAFT',
    objectives: '', contentOutline: '', activities: '', assessmentMethod: '',
    tags: [], publishedAt: null,
    createdAt: lpToday(), updatedAt: lpToday(),
  };

  const [draft, setDraft] = React.useState(initial);
  const [touched, setTouched] = React.useState({});
  const [isDirty, setIsDirty] = React.useState(false);
  const [confirmPublish, setConfirmPublish] = React.useState(false);
  const [flash, setFlash] = React.useState(null);

  const isLocked = draft.status === 'PUBLISHED'; // one-way DRAFT→PUBLISHED — locked once published

  const updateField = (k, v) => { if (isLocked) return; setDraft(d => ({ ...d, [k]: v })); setIsDirty(true); };
  const markTouched = (k) => setTouched(tt => ({ ...tt, [k]: true }));

  // ── Validation (11-code LESSON_PLAN_* taxonomy → generic + field-level) ────
  const titleOk = draft.title.trim().length >= 4 && draft.title.length <= 200;
  const sectionsFilled = LP_SECTIONS.filter(s => (draft[s.key] || '').trim().length > 0).length;
  const canPublish = titleOk && sectionsFilled === LP_SECTIONS.length;

  const handleSaveDraft = () => {
    onSave({ ...draft, status: 'DRAFT', updatedAt: lpToday() });
    setIsDirty(false);
  };
  const handlePublishClick = () => {
    setTouched({ title: true, objectives: true, contentOutline: true, activities: true, assessmentMethod: true });
    if (!canPublish) {
      setFlash({ kind: 'error', msg: t('Cần điền tên giáo án và đủ 4 mục nội dung trước khi phát hành.', 'Title and all 4 content sections must be filled before publishing.') });
      window.setTimeout(() => setFlash(null), 3200);
      return;
    }
    setConfirmPublish(true);
  };
  const handleConfirmPublish = () => {
    onSave({ ...draft, status: 'PUBLISHED', publishedAt: lpToday(), updatedAt: lpToday() });
    setIsDirty(false);
    setConfirmPublish(false);
  };

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: isMobile ? '12px 16px' : '14px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <button onClick={onCancel} style={{
          padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
          background: '#fff', color: T.textSecondary, fontSize: 12.5, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer', minHeight: 40,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <Icon name="chevronLeft" size={12} color={T.textSecondary} />
          {t('Về danh sách', 'Back to list')}
        </button>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            US-E18.16 · {isEdit ? t('Chỉnh sửa giáo án', 'Edit lesson plan') : t('Soạn giáo án mới', 'Create lesson plan')}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {draft.title || t('— Chưa đặt tên giáo án —', '— Untitled lesson plan —')}
          </div>
        </div>
        <LPStatusChip status={draft.status} t={t} />
        {!isLocked && (
          <React.Fragment>
            <button onClick={handleSaveDraft} style={{
              padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${T.border}`,
              background: '#fff', color: T.textSecondary, fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', minHeight: 40,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="penLine" size={12} color={T.textSecondary} strokeWidth={2.2} />
              {t('Lưu nháp', 'Save draft')}
            </button>
            <button onClick={handlePublishClick} style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: canPublish ? T.success : T.textMuted,
              color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: canPublish ? 'pointer' : 'not-allowed', minHeight: 40,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
              {t('Phát hành', 'Publish')}
            </button>
          </React.Fragment>
        )}
      </div>

      {isLocked && (
        <div role="status" style={{
          background: T.successLight, borderBottom: `1px solid ${T.border}`,
          padding: '10px 24px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.textSecondary,
        }}>
          <Icon name="lock" size={13} color={T.success} strokeWidth={2.2} />
          {t('Giáo án đã phát hành và không thể chỉnh sửa (một chiều DRAFT → PUBLISHED).',
             'This lesson plan is published and read-only (one-way DRAFT → PUBLISHED).')}
        </div>
      )}

      {isDirty && !isLocked && (
        <div style={{
          background: T.warning + '0E', borderBottom: `1px solid ${T.border}`,
          padding: '6px 24px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.warning, boxShadow: `0 0 0 3px ${T.warning}25` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: T.warningText }}>{t('Chưa lưu', 'Unsaved changes')}</span>
        </div>
      )}

      {/* Two-column body: left = plan meta, right = 4 document sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '18px 16px' : '20px 24px' }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : '320px 1fr',
          gap: 20, alignItems: 'start',
        }}>
          {/* Left — plan meta */}
          <div style={{ ...lpStyles.cardShell, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary }}>
              {t('Thông tin giáo án', 'Lesson plan info')}
            </div>
            <div>
              <label htmlFor="lp-title" style={lpStyles.fieldLabel}>{t('Tên giáo án', 'Title')} <span style={{ color: T.error }}>*</span></label>
              <input id="lp-title" value={draft.title} disabled={isLocked}
                onChange={e => updateField('title', e.target.value)} onBlur={() => markTouched('title')}
                aria-invalid={touched.title && !titleOk} aria-describedby={touched.title && !titleOk ? 'lp-title-err' : undefined}
                placeholder={t('VD: Giáo án — Đạo hàm và ý nghĩa hình học', 'e.g. Lesson plan — Derivatives and geometric meaning')}
                maxLength={200}
                style={{ ...lpStyles.input, borderColor: touched.title && !titleOk ? T.error : T.border, background: isLocked ? T.bg : '#fff' }} />
              {touched.title && !titleOk && (
                <div id="lp-title-err" role="alert" style={{ marginTop: 5, fontSize: 11, color: T.errorText, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alertTriangle" size={11} color={T.errorText} />
                  {t('Tên giáo án cần 4–200 ký tự.', 'Title must be 4–200 characters.')}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="lp-subject" style={lpStyles.fieldLabel}>{t('Môn học', 'Subject')}</label>
              <select id="lp-subject" value={draft.subjectId} disabled={isLocked}
                onChange={e => updateField('subjectId', e.target.value)}
                style={{ ...lpStyles.input, background: isLocked ? T.bg : '#fff' }}>
                {LP_SUBJECTS.map(s => <option key={s.id} value={s.id}>{t(s.vi, s.en)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lp-grade" style={lpStyles.fieldLabel}>{t('Khối lớp', 'Grade level')}</label>
              <select id="lp-grade" value={draft.gradeLevel} disabled={isLocked}
                onChange={e => updateField('gradeLevel', +e.target.value)}
                style={{ ...lpStyles.input, background: isLocked ? T.bg : '#fff' }}>
                {LP_GRADES.map(g => <option key={g} value={g}>{t(`Lớp ${g}`, `Grade ${g}`)}</option>)}
              </select>
            </div>
            <div>
              <label style={lpStyles.fieldLabel}>{t('Thẻ', 'Tags')}</label>
              <LPTagChipsInput tags={draft.tags} onChange={v => updateField('tags', v)} t={t} disabled={isLocked} />
            </div>
            <div style={{ paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textMuted, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span>{t('Tạo:', 'Created:')} {draft.createdAt}</span>
              {draft.publishedAt && <span>{t('Phát hành:', 'Published:')} {draft.publishedAt}</span>}
            </div>
          </div>

          {/* Right — 4 document sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {LP_SECTIONS.map(sec => {
              const val = draft[sec.key] || '';
              const isEmpty = touched[sec.key] && !val.trim();
              return (
                <div key={sec.key} style={lpStyles.cardShell}>
                  <div style={{ padding: 18 }}>
                    <label htmlFor={`lp-${sec.key}`} style={{ ...lpStyles.fieldLabel, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Icon name={sec.icon} size={12} color={T.textMuted} />
                      {t(sec.vi, sec.en)} <span style={{ color: T.error }}>*</span>
                    </label>
                    <textarea id={`lp-${sec.key}`} value={val} disabled={isLocked}
                      onChange={e => updateField(sec.key, e.target.value)} onBlur={() => markTouched(sec.key)}
                      aria-invalid={isEmpty} aria-describedby={isEmpty ? `lp-${sec.key}-err` : undefined}
                      rows={4}
                      placeholder={t(sec.placeholderVi, sec.placeholderEn)}
                      style={{ ...lpStyles.textarea, borderColor: isEmpty ? T.error : T.border, background: isLocked ? T.bg : '#fff' }} />
                    {isEmpty && (
                      <div id={`lp-${sec.key}-err`} role="alert" style={{ marginTop: 6, fontSize: 11, color: T.errorText, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="alertTriangle" size={11} color={T.errorText} />
                        {t('Mục này cần được điền trước khi phát hành.', 'This section must be filled before publishing.')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {confirmPublish && (
        <LPConfirmDialog t={t} pColor={pColor}
          title={t('Phát hành giáo án?', 'Publish lesson plan?')}
          message={t('Giáo án sẽ chuyển sang trạng thái Đã phát hành và không thể chỉnh sửa thêm (một chiều). Giáo viên khác trong trường có thể xem giáo án này.',
                     'The lesson plan will move to Published and can no longer be edited (one-way). Other teachers in the school will be able to view it.')}
          confirmLabel={t('Phát hành', 'Publish')} confirmIcon="check"
          onCancel={() => setConfirmPublish(false)}
          onConfirm={handleConfirmPublish} />
      )}

      {flash && (
        <div role="alert" style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: flash.kind === 'error' ? T.error : '#1F2937', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1100,
          animation: 'lp-toast-in 0.2s ease-out', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alertTriangle" size={14} color="#fff" strokeWidth={2.4} />
          {flash.msg}
        </div>
      )}

      <style>{`
        @keyframes lp-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes lp-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </main>
  );
};

// ── Confirm dialog (publish — one-way) ─────────────────────────────────────

const LPConfirmDialog = ({ title, message, confirmLabel, confirmIcon, t, pColor, onCancel, onConfirm }) => (
  <React.Fragment>
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.55)', zIndex: 1100, backdropFilter: 'blur(2px)' }} />
    <div role="dialog" aria-modal="true" aria-label={title} style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 440, maxWidth: 'calc(100vw - 32px)', background: T.card,
      borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.24)', zIndex: 1101,
      padding: 24, animation: 'lp-fadein 0.18s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: (pColor || T.primary) + '14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="check" size={20} color={pColor || T.primary} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{title}</div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>{message}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={onCancel}>{t('Huỷ', 'Cancel')}</Button>
        <button onClick={onConfirm} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: pColor || T.primary, color: '#fff', fontSize: 13, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer', minHeight: 40,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name={confirmIcon || 'check'} size={12} color="#fff" strokeWidth={2.4} />
          {confirmLabel}
        </button>
      </div>
    </div>
  </React.Fragment>
);

Object.assign(window, { LessonPlanScreen, LessonPlanBuilderScreen });
