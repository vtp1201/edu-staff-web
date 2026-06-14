// ── Lesson Bank (Kho bài giảng) ─────────────────────────────────────────────
// Route:    /teacher/lesson-bank
// Roles:    TEACHER (upload + manage own)  ·  principal (school-wide read)
// Epic:     US-E13.3 (FE)  /  US-053 (BE, E05-deferred)
// Component exported on window: LessonBankScreen
//
// Visual references:
//   • student.jsx — course-card grid + subject colour vocabulary
//   • announcements.jsx — 480px right-slide drawer pattern (an-slide-in)
//   • subjects-dialogs.jsx — detail sheet pattern
//
// One file, three building blocks:
//   1. LessonBankScreen   — filters + grid/list + FAB + state machine
//   2. UploadLessonDrawer — slide-in upload form (drag&drop + meta + visibility)
//   3. LessonDetailSheet  — slide-in read-only detail (preview + actions)

// ── File-type vocabulary ────────────────────────────────────────────────────

const LB_FILE_TYPES = {
  pdf:   { label: 'PDF',   color: '#E5363A', icon: 'fileText',     accept: '.pdf' },
  pptx:  { label: 'PPTX',  color: '#D24726', icon: 'layers',       accept: '.ppt,.pptx' },
  ppt:   { label: 'PPT',   color: '#D24726', icon: 'layers',       accept: '.ppt' },
  docx:  { label: 'DOCX',  color: '#2A6FDB', icon: 'fileText',     accept: '.doc,.docx' },
  doc:   { label: 'DOC',   color: '#2A6FDB', icon: 'fileText',     accept: '.doc' },
  mp4:   { label: 'MP4',   color: '#7B5EA7', icon: 'fileVideo',    accept: '.mp4,.mov,.webm' },
  video: { label: 'VIDEO', color: '#7B5EA7', icon: 'fileVideo',    accept: '.mp4,.mov,.webm' },
  link:  { label: 'LINK',  color: '#13DEB9', icon: 'externalLink', accept: '' },
  img:   { label: 'IMG',   color: '#FFAE1F', icon: 'image',        accept: '.png,.jpg,.jpeg,.webp' },
};

const LB_VISIBILITY = {
  private: { vi: 'Chỉ mình tôi',   en: 'Only me',         icon: 'lock',  color: '#5A6A85' },
  dept:    { vi: 'Cùng bộ môn',    en: 'Same department', icon: 'users', color: '#5D87FF' },
  school:  { vi: 'Toàn trường',    en: 'School-wide',     icon: 'globe', color: '#13DEB9' },
};

// Subject colour palette — mirrors student.jsx so the visual language is shared.
const LB_SUBJECTS = [
  { id: 'sub-math', vi: 'Toán học',  en: 'Mathematics', color: '#5D87FF' },
  { id: 'sub-phys', vi: 'Vật Lý',    en: 'Physics',     color: '#13DEB9' },
  { id: 'sub-chem', vi: 'Hoá Học',   en: 'Chemistry',   color: '#FFAE1F' },
  { id: 'sub-lit',  vi: 'Ngữ Văn',   en: 'Literature',  color: '#7B5EA7' },
  { id: 'sub-eng',  vi: 'Tiếng Anh', en: 'English',     color: '#1FAFC0' },
  { id: 'sub-hist', vi: 'Lịch Sử',   en: 'History',     color: '#FA896B' },
];

const LB_GRADES = [10, 11, 12];

// Owners (only the current teacher's own files are mutable for the teacher view).
const LB_OWNERS = {
  me:    { id: 'me',    name: 'Bạn',              en: 'You',              initials: 'TG' },
  'tch-1': { id: 'tch-1', name: 'Nguyễn Thị Hương', en: 'Nguyen T. Huong',  initials: 'NH' },
  'tch-2': { id: 'tch-2', name: 'Trần Văn Minh',   en: 'Tran V. Minh',     initials: 'TM' },
  'tch-3': { id: 'tch-3', name: 'Lê Thị Hoa',      en: 'Le T. Hoa',        initials: 'LH' },
  'tch-4': { id: 'tch-4', name: 'Phạm Quốc Bảo',   en: 'Pham Q. Bao',      initials: 'PB' },
};

// ── Seed data ───────────────────────────────────────────────────────────────

const LB_SEED = [
  { id: 'l1', ownerId: 'me', title: 'Bài giảng — Mệnh đề & Tập hợp',
    subjectId: 'sub-math', gradeLevel: 10, type: 'pptx',
    sizeMB: 8.4, uploadedAt: '02/06/2026', visibility: 'school',
    tags: ['Chương 1', 'CT2018'], downloads: 124, views: 287 },
  { id: 'l2', ownerId: 'me', title: 'Đề cương ôn tập HK2 — Toán 11',
    subjectId: 'sub-math', gradeLevel: 11, type: 'pdf',
    sizeMB: 3.2, uploadedAt: '28/05/2026', visibility: 'dept',
    tags: ['Ôn tập', 'HK2'], downloads: 89, views: 156 },
  { id: 'l3', ownerId: 'me', title: 'Video: Bài toán cực trị bậc hai',
    subjectId: 'sub-math', gradeLevel: 10, type: 'mp4',
    sizeMB: 142.7, durationMin: 18, uploadedAt: '25/05/2026', visibility: 'private',
    tags: ['Video', 'Hàm số'], downloads: 12, views: 34 },
  { id: 'l4', ownerId: 'tch-2', title: 'Bài giảng — Điện từ trường',
    subjectId: 'sub-phys', gradeLevel: 11, type: 'pptx',
    sizeMB: 12.8, uploadedAt: '20/05/2026', visibility: 'school',
    tags: ['Chương 4'], downloads: 201, views: 412 },
  { id: 'l5', ownerId: 'tch-3', title: 'Phiếu thực hành — Phản ứng oxi hoá khử',
    subjectId: 'sub-chem', gradeLevel: 10, type: 'docx',
    sizeMB: 1.6, uploadedAt: '18/05/2026', visibility: 'dept',
    tags: ['Thực hành'], downloads: 67, views: 134 },
  { id: 'l6', ownerId: 'tch-4', title: 'Phân tích Truyện Kiều — Slide minh hoạ',
    subjectId: 'sub-lit', gradeLevel: 11, type: 'pptx',
    sizeMB: 22.3, uploadedAt: '15/05/2026', visibility: 'school',
    tags: ['Văn học VN'], downloads: 178, views: 354 },
  { id: 'l7', ownerId: 'tch-1', title: 'Link Geogebra — Đạo hàm hình học',
    subjectId: 'sub-math', gradeLevel: 12, type: 'link',
    url: 'https://geogebra.org/m/derivative-12', uploadedAt: '10/05/2026', visibility: 'school',
    tags: ['Tương tác', 'GeoGebra'], downloads: 0, views: 89 },
  { id: 'l8', ownerId: 'tch-2', title: 'Đề kiểm tra 45 phút — Cơ học',
    subjectId: 'sub-phys', gradeLevel: 10, type: 'pdf',
    sizeMB: 0.8, uploadedAt: '05/05/2026', visibility: 'dept',
    tags: ['Đề kiểm tra'], downloads: 145, views: 198 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const lbFmtSize = (mb) => {
  if (!mb && mb !== 0) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1)    return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb * 1000)} KB`;
};

const lbSubjectOf = (id) => LB_SUBJECTS.find(s => s.id === id) || LB_SUBJECTS[0];
const lbTypeOf    = (t) => LB_FILE_TYPES[t] || LB_FILE_TYPES.pdf;
const lbOwnerOf   = (id) => LB_OWNERS[id] || LB_OWNERS.me;

const lbSortItems = (items, sort) => {
  const arr = [...items];
  if (sort === 'name')  arr.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  else if (sort === 'size') arr.sort((a, b) => (b.sizeMB || 0) - (a.sizeMB || 0));
  else /* newest */ arr.sort((a, b) => {
    // dates are dd/mm/yyyy strings — quick string→Date parse
    const toD = s => { const [d, m, y] = (s || '01/01/2000').split('/'); return new Date(+y, +m - 1, +d).getTime(); };
    return toD(b.uploadedAt) - toD(a.uploadedAt);
  });
  return arr;
};

// ── File-type thumb ─────────────────────────────────────────────────────────

const LBFileThumb = ({ type, subject, size = 'card' }) => {
  const ft = lbTypeOf(type);
  const isCard = size === 'card';
  return (
    <div style={{
      height: isCard ? 140 : 56,
      width: isCard ? '100%' : 56,
      borderRadius: isCard ? '10px 10px 0 0' : 8,
      background: ft.color + '12',
      backgroundImage: isCard ? `linear-gradient(135deg, ${ft.color}10 0%, ${ft.color}22 100%)` : 'none',
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon name={ft.icon} size={isCard ? 44 : 24} color={ft.color} strokeWidth={1.6} />
      {/* File type label */}
      <div style={{
        position: 'absolute',
        bottom: isCard ? 10 : 'auto', left: isCard ? 10 : 'auto',
        top: isCard ? 'auto' : -2, right: isCard ? 'auto' : -2,
        display: isCard ? 'inline-flex' : 'none',
        padding: '3px 8px', borderRadius: 6,
        background: ft.color, color: '#fff',
        fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
      }}>
        {ft.label}
      </div>
      {/* Subject colour badge — top-right, mirrors student.jsx course pill */}
      {subject && isCard && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 99,
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          fontSize: 10.5, fontWeight: 700, color: subject.color,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: subject.color }} />
          {subject.vi}
        </div>
      )}
      {/* Video play overlay */}
      {(type === 'mp4' || type === 'video') && isCard && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          }}>
            <Icon name="play" size={18} color={ft.color} strokeWidth={2.4} />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Grid card ───────────────────────────────────────────────────────────────

const LBGridCard = ({ item, lang, t, pColor, isMine, onView, onEdit, onDelete }) => {
  const subj  = lbSubjectOf(item.subjectId);
  const owner = lbOwnerOf(item.ownerId);
  const vis   = LB_VISIBILITY[item.visibility];

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; }}
    >
      <LBFileThumb type={item.type} subject={subj} />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: T.textPrimary,
          lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: subj.color }}>{t(subj.vi, subj.en)}</span>
          <span style={{ color: T.border }}>·</span>
          <span>{t(`Lớp ${item.gradeLevel}`, `Grade ${item.gradeLevel}`)}</span>
          <span style={{ color: T.border }}>·</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{lbFmtSize(item.sizeMB)}</span>
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Icon name="upload" size={10} color={T.textMuted} />
          <span>{t('Tải lên:', 'Uploaded:')} {item.uploadedAt}</span>
          {!isMine && (
            <React.Fragment>
              <span style={{ color: T.border }}>·</span>
              <span>{t(owner.name, owner.en)}</span>
            </React.Fragment>
          )}
        </div>
        {/* Visibility + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 99,
            background: vis.color + '14', color: vis.color,
            fontSize: 10, fontWeight: 700,
          }}>
            <Icon name={vis.icon} size={10} color={vis.color} strokeWidth={2.2} />
            {t(vis.vi, vis.en)}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, color: T.textMuted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="eye" size={10} color={T.textMuted} /> {item.views}
          </span>
          <span style={{ fontSize: 10.5, color: T.textMuted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon name="download" size={10} color={T.textMuted} /> {item.downloads}
          </span>
        </div>
        {/* Action row */}
        <div style={{
          marginTop: 6, paddingTop: 10,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          <button onClick={() => onView(item)} style={lbBtnStyles.action(pColor)}>
            <Icon name="eye" size={11} color={pColor} strokeWidth={2.2} />
            {t('Xem', 'View')}
          </button>
          {isMine && (
            <React.Fragment>
              <button onClick={() => onEdit(item)} style={lbBtnStyles.action(T.textSecondary)}>
                <Icon name="penLine" size={11} color={T.textSecondary} strokeWidth={2.2} />
                {t('Sửa', 'Edit')}
              </button>
              <button onClick={() => onDelete(item)} style={lbBtnStyles.action(T.error)}>
                <Icon name="trash" size={11} color={T.error} strokeWidth={2.2} />
                {t('Xoá', 'Delete')}
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
};

const lbBtnStyles = {
  action: (color) => ({
    flex: 1, padding: '6px 10px', borderRadius: 6,
    border: 'none', background: 'transparent', color,
    fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    transition: 'background 0.12s',
  }),
};

// ── List row ────────────────────────────────────────────────────────────────

const LBListRow = ({ item, lang, t, pColor, isMine, onView, onEdit, onDelete }) => {
  const subj  = lbSubjectOf(item.subjectId);
  const owner = lbOwnerOf(item.ownerId);
  const vis   = LB_VISIBILITY[item.visibility];
  const ft    = lbTypeOf(item.type);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '56px 1fr 120px 110px 100px 110px 200px',
      gap: 14, alignItems: 'center',
      padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.bg}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <LBFileThumb type={item.type} size="row" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isMine && <span>{t(owner.name, owner.en)}</span>}
          {!isMine && <span style={{ color: T.border }}>·</span>}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            color: vis.color, fontWeight: 700,
          }}>
            <Icon name={vis.icon} size={10} color={vis.color} strokeWidth={2.2} />
            {t(vis.vi, vis.en)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: subj.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: T.textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t(subj.vi, subj.en)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>
        {t(`Lớp ${item.gradeLevel}`, `Grade ${item.gradeLevel}`)}
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {lbFmtSize(item.sizeMB)}
      </div>
      <div style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {item.uploadedAt}
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={() => onView(item)} style={lbBtnStyles.action(pColor)}>
          <Icon name="eye" size={11} color={pColor} strokeWidth={2.2} /> {t('Xem', 'View')}
        </button>
        {isMine && (
          <React.Fragment>
            <button onClick={() => onEdit(item)} style={lbBtnStyles.action(T.textSecondary)}>
              <Icon name="penLine" size={11} color={T.textSecondary} strokeWidth={2.2} />
            </button>
            <button onClick={() => onDelete(item)} style={lbBtnStyles.action(T.error)}>
              <Icon name="trash" size={11} color={T.error} strokeWidth={2.2} />
            </button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

// ── Upload card placeholder (in-progress / error) ───────────────────────────

const LBUploadPlaceholder = ({ progress, error, t, pColor, onRetry, onCancel }) => (
  <div style={{
    background: T.card, borderRadius: 12,
    border: `1px ${error ? 'solid' : 'dashed'} ${error ? T.error : pColor}`,
    overflow: 'hidden',
  }}>
    <div style={{
      height: 140, background: (error ? T.error : pColor) + '08',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {error ? (
        <React.Fragment>
          <Icon name="alertTriangle" size={36} color={T.error} strokeWidth={1.7} />
          <div style={{ fontSize: 12, fontWeight: 700, color: T.error }}>
            {t('Tải lên thất bại', 'Upload failed')}
          </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <Icon name="upload" size={36} color={pColor} strokeWidth={1.7} />
          <div style={{ fontSize: 12, fontWeight: 700, color: pColor }}>
            {t(`Đang tải lên… ${progress}%`, `Uploading… ${progress}%`)}
          </div>
        </React.Fragment>
      )}
    </div>
    <div style={{ padding: 14 }}>
      <ProgressBar value={error ? 100 : progress} color={error ? T.error : pColor} height={6} />
      <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {error ? (
          <React.Fragment>
            <button onClick={onCancel} style={{ ...lbBtnStyles.action(T.textMuted), padding: '6px 12px', border: `1px solid ${T.border}` }}>
              {t('Bỏ qua', 'Dismiss')}
            </button>
            <button onClick={onRetry} style={{ ...lbBtnStyles.action(T.error), padding: '6px 12px', border: `1px solid ${T.error}` }}>
              <Icon name="upload" size={11} color={T.error} /> {t('Thử lại', 'Retry')}
            </button>
          </React.Fragment>
        ) : (
          <button onClick={onCancel} style={{ ...lbBtnStyles.action(T.textMuted), padding: '6px 12px', border: `1px solid ${T.border}` }}>
            {t('Huỷ', 'Cancel')}
          </button>
        )}
      </div>
    </div>
  </div>
);

// ── Empty state ─────────────────────────────────────────────────────────────

const LBEmptyState = ({ variant, t, pColor, onUpload, onReset }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '80px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: 96, height: 96, borderRadius: 24, margin: '0 auto 18px',
      background: pColor + '0E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="bookOpen" size={44} color={pColor + 'B0'} strokeWidth={1.4} />
    </div>
    <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
      {variant === 'all'
        ? t('Chưa có bài giảng nào.', 'No lessons yet.')
        : t('Không có bài giảng phù hợp bộ lọc.', 'No lessons match these filters.')}
    </div>
    <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 24, maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.6 }}>
      {variant === 'all'
        ? t('Hãy upload bài giảng đầu tiên — file PDF, slide, video hoặc dán link tài liệu trên Drive / YouTube.',
            'Upload your first lesson — PDF, slides, video, or paste a link to Drive / YouTube.')
        : t('Thử bỏ chọn bộ lọc hoặc đổi từ khoá tìm kiếm.', 'Try clearing filters or changing the search query.')}
    </div>
    {variant === 'all' ? (
      <Button onClick={onUpload} icon="upload">{t('Thêm bài giảng', 'Add lesson')}</Button>
    ) : (
      <Button variant="secondary" onClick={onReset} icon="x">{t('Bỏ lọc', 'Clear filters')}</Button>
    )}
  </div>
);

// ── Filter bar ──────────────────────────────────────────────────────────────

const LBDropdown = ({ label, value, options, onChange, icon, t, minWidth = 160 }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div style={{ position: 'relative', minWidth }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.border}`,
        background: '#fff', fontFamily: 'inherit', fontSize: 12.5,
        color: T.textPrimary, fontWeight: 600, cursor: 'pointer',
      }}>
        {icon && <Icon name={icon} size={12} color={T.textMuted} />}
        <span style={{ color: T.textMuted, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>{current?.label || '—'}</span>
        <Icon name="chevronDown" size={11} color={T.textMuted} />
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
                  width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  background: o.value === value ? T.primary + '12' : 'transparent',
                  color: o.value === value ? T.primary : T.textPrimary,
                  fontSize: 12.5, fontWeight: o.value === value ? 700 : 500,
                  fontFamily: 'inherit',
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

const LBFilterBar = ({ filters, setFilters, viewMode, setViewMode, lang, t, pColor }) => {
  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
        <input value={filters.q} onChange={e => setF('q', e.target.value)}
          placeholder={t('Tìm bài giảng, tag, tác giả…', 'Search lessons, tags, authors…')}
          style={{
            width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9,
            border: `1.5px solid ${T.border}`, fontSize: 12.5, fontFamily: 'inherit',
            background: '#fff', color: T.textPrimary, outline: 'none', boxSizing: 'border-box',
          }} />
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
          <Icon name="search" size={14} color={T.textMuted} />
        </span>
      </div>
      <LBDropdown label={t('Môn', 'Subject')} icon="bookOpen" value={filters.subject}
        onChange={v => setF('subject', v)}
        options={[
          { value: 'all', label: t('Tất cả môn', 'All subjects') },
          ...LB_SUBJECTS.map(s => ({ value: s.id, label: t(s.vi, s.en) })),
        ]} minWidth={170} />
      <LBDropdown label={t('Khối', 'Grade')} icon="graduationCap" value={filters.grade}
        onChange={v => setF('grade', v)}
        options={[
          { value: 'all', label: t('Tất cả khối', 'All grades') },
          ...LB_GRADES.map(g => ({ value: String(g), label: t(`Lớp ${g}`, `Grade ${g}`) })),
        ]} minWidth={140} />
      <LBDropdown label={t('Sắp xếp', 'Sort')} icon="layers" value={filters.sort}
        onChange={v => setF('sort', v)}
        options={[
          { value: 'newest', label: t('Mới nhất', 'Newest') },
          { value: 'name',   label: t('Tên (A–Z)', 'Name (A–Z)') },
          { value: 'size',   label: t('Dung lượng', 'File size') },
        ]} minWidth={150} />
      <div style={{ flex: 1 }} />
      {/* View toggle */}
      <div style={{ display: 'flex', borderRadius: 9, border: `1.5px solid ${T.border}`, overflow: 'hidden', background: '#fff' }}>
        {[
          { id: 'grid', icon: 'grid', label: t('Lưới', 'Grid') },
          { id: 'list', icon: 'list', label: t('Danh sách', 'List') },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)}
            style={{
              padding: '7px 12px', border: 'none', background: viewMode === v.id ? pColor + '14' : 'transparent',
              color: viewMode === v.id ? pColor : T.textSecondary,
              fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
            <Icon name={v.icon} size={12} color={viewMode === v.id ? pColor : T.textSecondary} strokeWidth={2.2} />
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── List header (column titles for list view) ───────────────────────────────

const LBListHeader = ({ t, isMine }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '56px 1fr 120px 110px 100px 110px 200px',
    gap: 14, alignItems: 'center',
    padding: '10px 16px',
    borderBottom: `1px solid ${T.border}`, background: T.bg,
    fontSize: 10.5, fontWeight: 800, color: T.textMuted,
    letterSpacing: '0.06em', textTransform: 'uppercase',
  }}>
    <div />
    <div>{t('Tên bài giảng', 'Title')}</div>
    <div>{t('Môn', 'Subject')}</div>
    <div>{t('Khối', 'Grade')}</div>
    <div>{t('Dung lượng', 'Size')}</div>
    <div>{t('Tải lên', 'Uploaded')}</div>
    <div style={{ textAlign: 'right' }}>{t('Thao tác', 'Actions')}</div>
  </div>
);

// ── Main screen ─────────────────────────────────────────────────────────────

const LessonBankScreen = ({ lang, primaryColor, role = 'teacher' }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isTeacher = role === 'teacher';

  const [items, setItems]    = React.useState(LB_SEED);
  const [viewMode, setView]  = React.useState('grid');
  const [filters, setFilters] = React.useState({
    q: '', subject: 'all', grade: 'all', sort: 'newest',
    owner: isTeacher ? 'me' : 'all',  // teacher → own files; principal → school-wide
  });
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editDraft, setEditDraft]   = React.useState(null);
  const [detailItem, setDetailItem] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  // Upload progress (in-card placeholder)
  const [upload, setUpload] = React.useState(null); // { progress, error, draft }
  const [toast, setToast]   = React.useState(null);

  // Drive a fake upload progress animation when upload is active.
  React.useEffect(() => {
    if (!upload || upload.error || upload.progress >= 100) return;
    const id = setTimeout(() => {
      setUpload(u => u && !u.error ? { ...u, progress: Math.min(u.progress + 12, 100) } : u);
    }, 320);
    return () => clearTimeout(id);
  }, [upload]);

  // When upload completes → commit to list.
  React.useEffect(() => {
    if (upload?.progress === 100 && !upload?.error) {
      const id = setTimeout(() => {
        setItems(prev => [{
          ...upload.draft,
          id: `l${Date.now()}`,
          ownerId: 'me',
          uploadedAt: new Date().toLocaleDateString('vi-VN'),
          downloads: 0, views: 0,
        }, ...prev]);
        setUpload(null);
        showToast(t('Đã thêm bài giảng vào kho.', 'Lesson added to bank.'));
      }, 380);
      return () => clearTimeout(id);
    }
  }, [upload]); // eslint-disable-line

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // ── Filter pipeline ─────────────────────────────────────────────────────
  const visible = React.useMemo(() => {
    let arr = items;
    if (filters.owner === 'me') arr = arr.filter(x => x.ownerId === 'me');
    if (filters.subject !== 'all') arr = arr.filter(x => x.subjectId === filters.subject);
    if (filters.grade !== 'all')   arr = arr.filter(x => String(x.gradeLevel) === filters.grade);
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      arr = arr.filter(x =>
        x.title.toLowerCase().includes(q) ||
        (x.tags || []).some(tg => tg.toLowerCase().includes(q)) ||
        (lbOwnerOf(x.ownerId).name || '').toLowerCase().includes(q)
      );
    }
    return lbSortItems(arr, filters.sort);
  }, [items, filters]);

  // ── Counters ───────────────────────────────────────────────────────────
  const ownCount = items.filter(x => x.ownerId === 'me').length;
  const schoolCount = items.length;
  const totalSizeMB = items
    .filter(x => filters.owner === 'me' ? x.ownerId === 'me' : true)
    .reduce((s, x) => s + (x.sizeMB || 0), 0);

  // ── Handlers ───────────────────────────────────────────────────────────
  const startUpload = (draft) => {
    setUpload({ progress: 6, error: false, draft });
    setDrawerOpen(false);
    setEditDraft(null);
  };
  const handleSaveEdit = (draft) => {
    // Edits commit immediately (no upload progress).
    setItems(prev => prev.map(x => x.id === draft.id ? { ...x, ...draft } : x));
    setDrawerOpen(false);
    setEditDraft(null);
    showToast(t('Đã cập nhật bài giảng.', 'Lesson updated.'));
  };
  const handleDelete = (id) => {
    setItems(prev => prev.filter(x => x.id !== id));
    setConfirmDelete(null);
    showToast(t('Đã xoá bài giảng.', 'Lesson deleted.'));
  };
  const handleRetry = () => setUpload(u => u ? { ...u, error: false, progress: 18 } : u);

  const filtersDirty = filters.q || filters.subject !== 'all' || filters.grade !== 'all';
  const isEmpty = visible.length === 0 && !upload;

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: T.bg, position: 'relative' }}>
      <div style={{ maxWidth: 1380, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              US-E13.3 · {t('Kho bài giảng', 'Lesson Bank')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
              {isTeacher ? t('Kho bài giảng của tôi', 'My Lesson Bank') : t('Kho bài giảng toàn trường', 'School-wide Lesson Bank')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {isTeacher
                ? t(`Bạn có ${ownCount} bài giảng · Toàn trường ${schoolCount} bài (${lbFmtSize(totalSizeMB)}).`,
                    `You own ${ownCount} lessons · School-wide ${schoolCount} (${lbFmtSize(totalSizeMB)}).`)
                : t(`Tất cả bài giảng giáo viên đã chia sẻ — ${schoolCount} bài · ${lbFmtSize(totalSizeMB)}.`,
                    `All lessons shared by teachers — ${schoolCount} items · ${lbFmtSize(totalSizeMB)}.`)}
            </div>
          </div>
          {/* Owner toggle (teacher only) — switches between "Của tôi" and "Toàn trường" */}
          {isTeacher && (
            <div style={{ display: 'flex', borderRadius: 9, border: `1.5px solid ${T.border}`, overflow: 'hidden', background: '#fff' }}>
              {[
                { id: 'me',  label: t('Của tôi', 'Mine'), count: ownCount },
                { id: 'all', label: t('Toàn trường', 'School'), count: schoolCount },
              ].map(o => (
                <button key={o.id} onClick={() => setFilters(f => ({ ...f, owner: o.id }))}
                  style={{
                    padding: '8px 14px', border: 'none',
                    background: filters.owner === o.id ? pColor + '14' : 'transparent',
                    color: filters.owner === o.id ? pColor : T.textSecondary,
                    fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
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
          )}
          <Button onClick={() => { setEditDraft(null); setDrawerOpen(true); }} icon="upload">
            {t('Thêm bài giảng', 'Add lesson')}
          </Button>
        </div>

        {/* Filter bar */}
        <LBFilterBar filters={filters} setFilters={setFilters}
          viewMode={viewMode} setViewMode={setView}
          lang={lang} t={t} pColor={pColor} />

        {/* Grid / list */}
        {isEmpty ? (
          <LBEmptyState variant={filtersDirty ? 'filter' : 'all'} t={t} pColor={pColor}
            onUpload={() => { setEditDraft(null); setDrawerOpen(true); }}
            onReset={() => setFilters(f => ({ ...f, q: '', subject: 'all', grade: 'all' }))} />
        ) : viewMode === 'grid' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {upload && (
              <LBUploadPlaceholder progress={upload.progress} error={upload.error} t={t} pColor={pColor}
                onRetry={handleRetry} onCancel={() => setUpload(null)} />
            )}
            {visible.map(item => (
              <LBGridCard key={item.id} item={item} lang={lang} t={t} pColor={pColor}
                isMine={isTeacher && item.ownerId === 'me'}
                onView={(it) => setDetailItem(it)}
                onEdit={(it) => { setEditDraft(it); setDrawerOpen(true); }}
                onDelete={(it) => setConfirmDelete(it)} />
            ))}
          </div>
        ) : (
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <LBListHeader t={t} isMine={isTeacher} />
            {upload && (
              <div style={{ padding: 14, borderBottom: `1px solid ${T.border}` }}>
                <LBUploadPlaceholder progress={upload.progress} error={upload.error} t={t} pColor={pColor}
                  onRetry={handleRetry} onCancel={() => setUpload(null)} />
              </div>
            )}
            {visible.map(item => (
              <LBListRow key={item.id} item={item} lang={lang} t={t} pColor={pColor}
                isMine={isTeacher && item.ownerId === 'me'}
                onView={(it) => setDetailItem(it)}
                onEdit={(it) => { setEditDraft(it); setDrawerOpen(true); }}
                onDelete={(it) => setConfirmDelete(it)} />
            ))}
          </div>
        )}
      </div>

      {/* Floating action button — alternative to top-right Button */}
      {!drawerOpen && !detailItem && (
        <button onClick={() => { setEditDraft(null); setDrawerOpen(true); }}
          title={t('Thêm bài giảng', 'Add lesson')}
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 60,
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: pColor, color: '#fff', cursor: 'pointer',
            boxShadow: `0 8px 24px ${pColor}55`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = `0 12px 28px ${pColor}77`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 8px 24px ${pColor}55`; }}
        >
          <Icon name="plus" size={22} color="#fff" strokeWidth={2.6} />
        </button>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <UploadLessonDrawer
          edit={editDraft} t={t} lang={lang} pColor={pColor}
          onClose={() => { setDrawerOpen(false); setEditDraft(null); }}
          onSubmit={editDraft ? handleSaveEdit : startUpload} />
      )}

      {/* Detail sheet */}
      {detailItem && (
        <LessonDetailSheet
          item={detailItem} t={t} lang={lang} pColor={pColor}
          isMine={isTeacher && detailItem.ownerId === 'me'}
          onClose={() => setDetailItem(null)}
          onDownload={() => showToast(t('Đã bắt đầu tải xuống.', 'Download started.'))}
          onCopyLink={() => showToast(t('Đã copy đường dẫn.', 'Link copied.'))}
          onShare={() => showToast(t('Đã mở hộp thoại chia sẻ.', 'Share dialog opened.'))}
          onEdit={(it) => { setDetailItem(null); setEditDraft(it); setDrawerOpen(true); }} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <LBDeleteDialog item={confirmDelete} t={t} pColor={pColor}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete.id)} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: '#fff', padding: '10px 18px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1100,
          animation: 'lb-toast-in 0.2s ease-out', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={14} color={T.success} strokeWidth={2.6} />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes lb-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes lb-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes lb-fadein   { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </main>
  );
};

// ── Upload drawer (480px) ───────────────────────────────────────────────────

const LBSheetField = ({ label, required, children, hint }) => (
  <div>
    <label style={{
      display: 'block', fontSize: 10.5, fontWeight: 800,
      color: T.textMuted, marginBottom: 6,
      textTransform: 'uppercase', letterSpacing: '0.07em',
    }}>
      {label}{required && <span style={{ color: T.error, marginLeft: 3 }}>*</span>}
    </label>
    {children}
    {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{hint}</div>}
  </div>
);

const lbSheetInput = (pColor) => ({
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit',
  color: T.textPrimary, background: '#fff', outline: 'none', boxSizing: 'border-box',
});

const UploadLessonDrawer = ({ edit, t, lang, pColor, onClose, onSubmit }) => {
  const isEdit = !!edit;
  const [title, setTitle]     = React.useState(edit?.title || '');
  const [subjectId, setSubj]  = React.useState(edit?.subjectId || 'sub-math');
  const [gradeLevel, setGr]   = React.useState(edit?.gradeLevel || 10);
  const [tagsText, setTagsText] = React.useState((edit?.tags || []).join(', '));
  const [visibility, setVis]    = React.useState(edit?.visibility || 'dept');
  const [fileType, setFileType] = React.useState(edit?.type || 'pdf');
  const [linkUrl, setLinkUrl]   = React.useState(edit?.url || '');
  const [picked, setPicked]     = React.useState(edit ? {
    name: `${edit.title}.${edit.type}`, sizeMB: edit.sizeMB || 0,
  } : null);
  const [dragging, setDragging] = React.useState(false);

  const titleOk = title.trim().length >= 4 && title.length <= 200;
  const hasFile = fileType === 'link' ? !!linkUrl.trim() : !!picked;
  const canSubmit = titleOk && hasFile;

  // Simulate file pick by accepting any drop.
  const fakeDrop = (name, sizeMB) => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const map = { pdf: 'pdf', pptx: 'pptx', ppt: 'ppt', docx: 'docx', doc: 'doc',
                  mp4: 'mp4', mov: 'mp4', webm: 'mp4', png: 'img', jpg: 'img', jpeg: 'img' };
    setFileType(map[ext] || 'pdf');
    setPicked({ name, sizeMB });
  };
  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) fakeDrop(f.name, +(f.size / (1024 * 1024)).toFixed(2));
    else fakeDrop('Bai-giang-moi.pdf', 4.2);
  };

  const submit = () => {
    if (!canSubmit) return;
    const tags = tagsText.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      ...(isEdit ? edit : {}),
      title: title.trim(), subjectId, gradeLevel,
      tags, visibility,
      type: fileType,
      sizeMB: fileType === 'link' ? null : (picked?.sizeMB || 1.0),
      url: fileType === 'link' ? linkUrl.trim() : (edit?.url || null),
    };
    onSubmit(payload);
  };

  return (
    <React.Fragment>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.45)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '100vw', background: T.card,
        boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', animation: 'lb-slide-in 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={isEdit ? 'penLine' : 'upload'} size={18} color={pColor} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
              {isEdit ? t('Sửa bài giảng', 'Edit lesson') : t('Thêm bài giảng mới', 'Add new lesson')}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {isEdit ? t('Cập nhật thông tin bài giảng.', 'Update lesson metadata.')
                      : t('Upload tài liệu hoặc dán link tham khảo.', 'Upload a file or paste a reference link.')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="x" size={18} color={T.textMuted} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* File type toggle */}
          {!isEdit && (
            <LBSheetField label={t('Loại bài giảng', 'Lesson type')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[
                  { id: 'file', label: t('Tệp tin', 'File'),  icon: 'paperclip' },
                  { id: 'video', label: t('Video', 'Video'), icon: 'fileVideo' },
                  { id: 'link', label: t('Liên kết', 'Link'), icon: 'externalLink' },
                ].map(opt => {
                  const active = (opt.id === 'link' && fileType === 'link')
                    || (opt.id === 'video' && (fileType === 'mp4' || fileType === 'video'))
                    || (opt.id === 'file' && !['link', 'mp4', 'video'].includes(fileType));
                  return (
                    <button key={opt.id} onClick={() => {
                      if (opt.id === 'link')  { setFileType('link'); setPicked(null); }
                      else if (opt.id === 'video') { setFileType('mp4'); }
                      else { setFileType('pdf'); }
                    }} style={{
                      padding: '10px 8px', borderRadius: 9,
                      border: `1.5px solid ${active ? pColor : T.border}`,
                      background: active ? pColor + '0E' : '#fff',
                      color: active ? pColor : T.textSecondary,
                      fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                      <Icon name={opt.icon} size={16} color={active ? pColor : T.textSecondary} strokeWidth={2} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </LBSheetField>
          )}

          {/* Drop zone OR link input */}
          {fileType === 'link' ? (
            <LBSheetField label={t('Đường dẫn (YouTube / Drive / GeoGebra…)', 'URL (YouTube / Drive / GeoGebra…)')} required>
              <div style={{ position: 'relative' }}>
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  style={{ ...lbSheetInput(pColor), paddingLeft: 36 }} />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <Icon name="link" size={14} color={T.textMuted} />
                </span>
              </div>
            </LBSheetField>
          ) : !isEdit && (
            <LBSheetField label={t('Tệp đính kèm', 'File')} required>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fakeDrop('Bai-giang-moi.pdf', 4.2)}
                style={{
                  border: `2px dashed ${dragging ? pColor : picked ? pColor + '88' : T.border}`,
                  background: dragging ? pColor + '0E' : picked ? pColor + '06' : T.bg,
                  borderRadius: 10, padding: '20px 18px', textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                {picked ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                    <LBFileThumb type={fileType} size="row" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {picked.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                        {lbFmtSize(picked.sizeMB)} · {lbTypeOf(fileType).label}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setPicked(null); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Icon name="x" size={14} color={T.textMuted} />
                    </button>
                  </div>
                ) : (
                  <React.Fragment>
                    <Icon name="upload" size={28} color={pColor} strokeWidth={1.7} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginTop: 8 }}>
                      {t('Kéo & thả file vào đây', 'Drag & drop a file here')}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4 }}>
                      {t('hoặc bấm để chọn tệp · PDF, PPTX, DOCX, MP4 · tối đa 500 MB',
                         'or click to browse · PDF, PPTX, DOCX, MP4 · up to 500 MB')}
                    </div>
                  </React.Fragment>
                )}
              </div>
            </LBSheetField>
          )}

          {/* Title */}
          <LBSheetField label={t('Tên bài giảng', 'Lesson title')} required>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t('VD: Bài giảng — Mệnh đề & Tập hợp', 'e.g. Lesson — Statements & Sets')}
              maxLength={200}
              style={{ ...lbSheetInput(pColor),
                borderColor: title && !titleOk ? T.error : T.border }} />
            <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4, textAlign: 'right' }}>
              {title.length}/200
            </div>
          </LBSheetField>

          {/* Subject + grade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <LBSheetField label={t('Môn học', 'Subject')} required>
              <select value={subjectId} onChange={e => setSubj(e.target.value)} style={lbSheetInput(pColor)}>
                {LB_SUBJECTS.map(s => (
                  <option key={s.id} value={s.id}>{t(s.vi, s.en)}</option>
                ))}
              </select>
            </LBSheetField>
            <LBSheetField label={t('Khối lớp', 'Grade')} required>
              <select value={gradeLevel} onChange={e => setGr(+e.target.value)} style={lbSheetInput(pColor)}>
                {LB_GRADES.map(g => (
                  <option key={g} value={g}>{t(`Lớp ${g}`, `Grade ${g}`)}</option>
                ))}
              </select>
            </LBSheetField>
          </div>

          {/* Tags (optional) */}
          <LBSheetField label={t('Tag (tuỳ chọn — phân tách bằng dấu phẩy)', 'Tags (optional — comma separated)')}>
            <input value={tagsText} onChange={e => setTagsText(e.target.value)}
              placeholder={t('VD: Chương 1, Ôn tập, CT2018', 'e.g. Chapter 1, Review, Curriculum 2018')}
              style={lbSheetInput(pColor)} />
          </LBSheetField>

          {/* Visibility */}
          <LBSheetField label={t('Quyền xem', 'Visibility')} required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(LB_VISIBILITY).map(([key, meta]) => {
                const active = visibility === key;
                return (
                  <label key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 9, border: `1.5px solid ${active ? meta.color : T.border}`,
                    background: active ? meta.color + '0E' : '#fff', cursor: 'pointer',
                  }}>
                    <input type="radio" name="lb-vis" checked={active} onChange={() => setVis(key)}
                      style={{ accentColor: meta.color }} />
                    <Icon name={meta.icon} size={14} color={meta.color} strokeWidth={2.2} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? meta.color : T.textPrimary }}>
                        {t(meta.vi, meta.en)}
                      </div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                        {key === 'private' && t('Chỉ mình bạn xem được tài liệu này.', 'Only you can view this lesson.')}
                        {key === 'dept'    && t('Giáo viên cùng tổ chuyên môn có thể xem & tải.', 'Teachers in the same subject department can view & download.')}
                        {key === 'school'  && t('Tất cả giáo viên trong trường có thể xem & tải.', 'All teachers in the school can view & download.')}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </LBSheetField>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 11, color: T.textMuted }}>
            {!canSubmit && t('Cần nhập tên và chọn tệp / link.', 'Title and file/link are required.')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>{t('Huỷ', 'Cancel')}</Button>
            <Button onClick={submit} disabled={!canSubmit} icon={isEdit ? 'check' : 'upload'}>
              {isEdit ? t('Lưu thay đổi', 'Save changes') : t('Tải lên', 'Upload')}
            </Button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

// ── Detail sheet (read-only) ────────────────────────────────────────────────

const LessonDetailSheet = ({ item, t, lang, pColor, isMine, onClose, onDownload, onCopyLink, onShare, onEdit }) => {
  const subj  = lbSubjectOf(item.subjectId);
  const owner = lbOwnerOf(item.ownerId);
  const vis   = LB_VISIBILITY[item.visibility];
  const ft    = lbTypeOf(item.type);
  const isLink = item.type === 'link';

  return (
    <React.Fragment>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.45)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '100vw', background: T.card,
        boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', animation: 'lb-slide-in 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: `1px solid ${T.border}`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {t('Chi tiết bài giảng', 'Lesson detail')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="x" size={18} color={T.textMuted} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Preview */}
          <div style={{
            height: 220, background: `linear-gradient(135deg, ${ft.color}14 0%, ${ft.color}28 100%)`,
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* "Page 1" frame for PDF/PPTX/DOCX */}
            {(item.type === 'pdf' || item.type === 'pptx' || item.type === 'ppt' || item.type === 'docx' || item.type === 'doc') && (
              <div style={{
                width: 130, height: 170, background: '#fff',
                borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                padding: 14, display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ height: 8, width: '60%', background: ft.color, borderRadius: 2 }} />
                <div style={{ height: 4, width: '90%', background: T.border, borderRadius: 1 }} />
                <div style={{ height: 4, width: '80%', background: T.border, borderRadius: 1 }} />
                <div style={{ height: 4, width: '85%', background: T.border, borderRadius: 1 }} />
                <div style={{ height: 32, background: ft.color + '22', borderRadius: 3, marginTop: 4 }} />
                <div style={{ height: 4, width: '75%', background: T.border, borderRadius: 1 }} />
                <div style={{ height: 4, width: '90%', background: T.border, borderRadius: 1 }} />
                <div style={{ height: 4, width: '60%', background: T.border, borderRadius: 1 }} />
              </div>
            )}
            {(item.type === 'mp4' || item.type === 'video') && (
              <div style={{
                width: 200, height: 130, background: '#1F2937', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <Icon name="play" size={40} color="#fff" strokeWidth={1.8} />
                <div style={{
                  position: 'absolute', bottom: 8, right: 10,
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {item.durationMin || 18}:00
                </div>
              </div>
            )}
            {isLink && (
              <div style={{ textAlign: 'center' }}>
                <Icon name="externalLink" size={52} color={ft.color} strokeWidth={1.6} />
                <div style={{ marginTop: 10, fontSize: 12, color: ft.color, fontWeight: 800, letterSpacing: '0.04em' }}>
                  {t('LIÊN KẾT NGOÀI', 'EXTERNAL LINK')}
                </div>
              </div>
            )}
            <div style={{
              position: 'absolute', top: 14, left: 14,
              padding: '4px 10px', borderRadius: 6,
              background: ft.color, color: '#fff',
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em',
            }}>{ft.label}</div>
          </div>

          {/* Title + meta */}
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: subj.color + '14', color: subj.color, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: subj.color }} />
                {t(subj.vi, subj.en)} · {t(`Lớp ${item.gradeLevel}`, `Grade ${item.gradeLevel}`)}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, lineHeight: 1.35 }}>
                {item.title}
              </div>
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {item.tags.map((tg, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: 99,
                    background: T.bg, color: T.textSecondary,
                    fontSize: 11, fontWeight: 600,
                    border: `1px solid ${T.border}`,
                  }}>#{tg}</span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div style={lbStatCellStyle}>
                <Icon name="eye" size={14} color={T.textMuted} />
                <div>
                  <div style={lbStatValueStyle}>{item.views}</div>
                  <div style={lbStatLabelStyle}>{t('Lượt xem', 'Views')}</div>
                </div>
              </div>
              <div style={lbStatCellStyle}>
                <Icon name="download" size={14} color={T.textMuted} />
                <div>
                  <div style={lbStatValueStyle}>{item.downloads}</div>
                  <div style={lbStatLabelStyle}>{t('Tải xuống', 'Downloads')}</div>
                </div>
              </div>
              <div style={lbStatCellStyle}>
                <Icon name={ft.icon} size={14} color={T.textMuted} />
                <div>
                  <div style={{ ...lbStatValueStyle, fontSize: 13 }}>{isLink ? 'URL' : lbFmtSize(item.sizeMB)}</div>
                  <div style={lbStatLabelStyle}>{isLink ? t('Loại', 'Type') : t('Dung lượng', 'Size')}</div>
                </div>
              </div>
            </div>

            {/* Metadata table */}
            <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <LBDetailRow label={t('Người tải lên', 'Uploaded by')} value={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar initials={owner.initials} color={pColor} size={20} />
                  <span>{t(owner.name, owner.en)}</span>
                </div>
              } />
              <LBDetailRow label={t('Ngày tải lên', 'Uploaded at')} value={item.uploadedAt} />
              {isLink ? (
                <LBDetailRow label="URL" value={
                  <span style={{ color: pColor, wordBreak: 'break-all' }}>{item.url}</span>
                } />
              ) : (
                <LBDetailRow label={t('Tệp tin', 'File')} value={`${item.title}.${item.type}`} />
              )}
              <LBDetailRow label={t('Quyền xem', 'Visibility')} value={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: vis.color, fontWeight: 700 }}>
                  <Icon name={vis.icon} size={11} color={vis.color} strokeWidth={2.2} />
                  {t(vis.vi, vis.en)}
                </span>
              } />
            </div>

            {/* Primary actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isLink ? (
                <button onClick={onDownload} style={lbPrimaryAction(pColor)}>
                  <Icon name="externalLink" size={14} color="#fff" strokeWidth={2.2} />
                  {t('Mở liên kết', 'Open link')}
                </button>
              ) : (
                <button onClick={onDownload} style={lbPrimaryAction(pColor)}>
                  <Icon name="download" size={14} color="#fff" strokeWidth={2.2} />
                  {t('Tải xuống', 'Download')} · {lbFmtSize(item.sizeMB)}
                </button>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={onCopyLink} style={lbSecondaryAction()}>
                  <Icon name="copy" size={12} color={T.textSecondary} strokeWidth={2.2} />
                  {t('Copy link', 'Copy link')}
                </button>
                <button onClick={onShare} style={lbSecondaryAction()}>
                  <Icon name="share" size={12} color={T.textSecondary} strokeWidth={2.2} />
                  {t('Chia sẻ', 'Share')}
                </button>
              </div>
              {isMine && (
                <button onClick={() => onEdit(item)} style={{ ...lbSecondaryAction(), color: pColor, borderColor: pColor + '50' }}>
                  <Icon name="penLine" size={12} color={pColor} strokeWidth={2.2} />
                  {t('Sửa thông tin bài giảng', 'Edit lesson metadata')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

const lbStatCellStyle = {
  background: T.bg, borderRadius: 9, border: `1px solid ${T.border}`,
  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
};
const lbStatValueStyle = {
  fontSize: 15, fontWeight: 800, color: T.textPrimary,
  fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
};
const lbStatLabelStyle = {
  fontSize: 10, color: T.textMuted, fontWeight: 700,
  letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2,
};
const lbPrimaryAction = (pColor) => ({
  padding: '11px 14px', borderRadius: 9, border: 'none',
  background: pColor, color: '#fff', fontSize: 13, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
});
const lbSecondaryAction = () => ({
  padding: '9px 12px', borderRadius: 9,
  border: `1.5px solid ${T.border}`, background: '#fff',
  color: T.textSecondary, fontSize: 12.5, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
});

const LBDetailRow = ({ label, value }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 12 }}>
    <div style={{ color: T.textMuted, fontWeight: 600 }}>{label}</div>
    <div style={{ color: T.textPrimary, fontWeight: 600 }}>{value}</div>
  </div>
);

// ── Delete confirm dialog ───────────────────────────────────────────────────

const LBDeleteDialog = ({ item, t, pColor, onCancel, onConfirm }) => (
  <React.Fragment>
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.55)', zIndex: 1100, backdropFilter: 'blur(2px)' }} />
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 420, maxWidth: 'calc(100vw - 32px)', background: T.card,
      borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.24)', zIndex: 1101,
      padding: 24, animation: 'lb-fadein 0.18s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: T.errorLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="trash" size={20} color={T.error} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
            {t('Xoá bài giảng?', 'Delete this lesson?')}
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
            {t(`Bài giảng "${item.title}" sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.`,
               `"${item.title}" will be permanently deleted. This cannot be undone.`)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={onCancel}>{t('Huỷ', 'Cancel')}</Button>
        <button onClick={onConfirm} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: T.error, color: '#fff', fontSize: 13, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="trash" size={12} color="#fff" strokeWidth={2.4} />
          {t('Xoá bài giảng', 'Delete lesson')}
        </button>
      </div>
    </div>
  </React.Fragment>
);

Object.assign(window, { LessonBankScreen });
