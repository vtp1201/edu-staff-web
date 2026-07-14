// ── Student Assignments (Bài tập được giao) ─────────────────────────────────
// Route: /student/assignments   Role: student   Epic: E11 (LMS)   US: US-E11.7
// DR:    docs/design-requests/DR-020-student-assignments.md
//
// One exported component on window: StudentAssignmentsScreen
//   Layout 1 — list + filter tabs (Tất cả / Chưa nộp / Đã nộp / Đã chấm)
//   Layout 2 — submit sheet (file picker mock, textarea, draft/submit, overdue confirm)
//   Layout 3 — graded feedback sheet (score chip, teacher comment, timestamps)
//
// Reused patterns (do NOT reinvent — see DR "Reused patterns"):
//   • status→badge color mapping (design-system.md §Status mappings)
//   • Badge bg = color/15 (US-E07.4)
//   • EduSkeleton / EduEmpty / EduError (states.jsx)
//   • side-sheet shell (subjects-dialogs.jsx SubjectDetailSheet, position fixed
//     top/right/bottom, width 520, maxWidth 100vw — naturally full-bleed on mobile)
//   • score/GPA color (gradebook.jsx gbScoreColor, academic-record-view.jsx)
//   • filter-tab pill pattern (invitations.jsx TABS / exam.jsx filter)
//
// Mock-first (decision 0014): submit flow is local state transition
// (pending → submitted) with a simulated async delay; no real upload/storage.

// ── Mock data ────────────────────────────────────────────────────────────────

const ASG_SEED = [
  {
    id: 'a1', subject: 'Toán học', subjectEn: 'Mathematics', color: T.primary,
    class: '10A1', teacher: 'Nguyễn Văn A',
    title: 'Giải phương trình bậc 2', titleEn: 'Solving quadratic equations',
    description: 'Hoàn thành bài tập 12 câu trong SGK trang 62, trình bày lời giải chi tiết từng bước.',
    descriptionEn: 'Complete all 12 exercises on textbook page 62, showing full working for each step.',
    dueDate: '20/07/2026', daysLeft: 3, status: 'pending', allowFile: true,
  },
  {
    id: 'a2', subject: 'Vật Lý', subjectEn: 'Physics', color: T.success,
    class: '10A1', teacher: 'Trần Văn Minh',
    title: 'Báo cáo thí nghiệm — Định luật Newton', titleEn: 'Lab report — Newton\'s Laws',
    description: 'Viết báo cáo thí nghiệm đo gia tốc trọng trường, kèm bảng số liệu và biểu đồ.',
    descriptionEn: 'Write up the gravitational-acceleration experiment with a data table and chart.',
    dueDate: '18/07/2026', daysLeft: 1, status: 'pending', allowFile: true,
  },
  {
    id: 'a3', subject: 'Tiếng Anh', subjectEn: 'English', color: T.teal,
    class: '10A1', teacher: 'Đỗ Thị Mai',
    title: 'Viết đoạn văn — My Future Plans', titleEn: 'Essay — My Future Plans',
    description: 'Viết đoạn văn 150-200 từ về dự định tương lai, sử dụng thì tương lai đơn và tương lai gần.',
    descriptionEn: 'Write a 150–200 word paragraph about future plans using simple future and "going to".',
    dueDate: '30/07/2026', daysLeft: 12, status: 'pending', allowFile: false,
  },
  {
    id: 'a4', subject: 'Hóa Học', subjectEn: 'Chemistry', color: T.warning,
    class: '10A1', teacher: 'Lê Thị Hoa',
    title: 'Bài tập cân bằng phản ứng oxi hoá khử', titleEn: 'Balancing redox equations',
    description: 'Hoàn thành 10 phương trình cân bằng oxi hoá khử theo phương pháp thăng bằng electron.',
    descriptionEn: 'Balance 10 redox equations using the electron-balance method.',
    dueDate: '10/07/2026', daysLeft: -4, status: 'pending', allowFile: true,
  },
  {
    id: 'a5', subject: 'Ngữ Văn', subjectEn: 'Literature', color: T.purple,
    class: '10A1', teacher: 'Phạm Quốc Bảo',
    title: 'Phân tích đoạn trích Trao duyên', titleEn: 'Analysis — "Trao duyên" excerpt',
    description: 'Phân tích tâm trạng nhân vật Thuý Kiều trong đoạn trích, liên hệ bối cảnh xã hội.',
    descriptionEn: 'Analyse Thuy Kieu\'s emotional state in the excerpt, with social-context links.',
    dueDate: '12/07/2026', daysLeft: 0, status: 'submitted', allowFile: true,
    submittedAt: '11/07/2026 20:14', fileName: 'phan-tich-trao-duyen.docx',
  },
  {
    id: 'a6', subject: 'Toán học', subjectEn: 'Mathematics', color: T.primary,
    class: '10A1', teacher: 'Nguyễn Văn A',
    title: 'Bài kiểm tra 15 phút — Hàm số bậc nhất', titleEn: '15-min quiz — Linear functions',
    description: 'Làm 8 câu trắc nghiệm về đồ thị và tính chất hàm số bậc nhất.',
    descriptionEn: '8 MCQs on graphs and properties of linear functions.',
    dueDate: '05/07/2026', daysLeft: -7, status: 'graded', allowFile: true,
    submittedAt: '04/07/2026 21:02', gradedAt: '06/07/2026 09:30',
    score: 9, maxScore: 10, fileName: 'ham-so-bac-nhat.pdf',
    teacherComment: 'Bài làm tốt, trình bày rõ ràng. Chú ý câu 6 nên vẽ đồ thị minh hoạ để dễ theo dõi hơn.',
    teacherCommentEn: 'Good work, clearly presented. For Q6 consider adding a graph to make it easier to follow.',
    gradedFileName: 'ham-so-bac-nhat-nhanxet.pdf',
  },
  {
    id: 'a7', subject: 'Vật Lý', subjectEn: 'Physics', color: T.success,
    class: '10A1', teacher: 'Trần Văn Minh',
    title: 'Bài tập chương Động lực học', titleEn: 'Dynamics chapter exercises',
    description: 'Giải 15 bài tập về lực ma sát, lực đàn hồi và định luật III Newton.',
    descriptionEn: '15 exercises on friction, elastic force, and Newton\'s Third Law.',
    dueDate: '28/06/2026', daysLeft: -14, status: 'graded', allowFile: true,
    submittedAt: '27/06/2026 19:40', gradedAt: '29/06/2026 08:15',
    score: 4, maxScore: 10, fileName: 'dong-luc-hoc.pdf',
    teacherComment: 'Nhiều câu chưa xác định đúng chiều lực. Em cần ôn lại cách vẽ giản đồ lực trước khi giải bài. Hãy gặp cô để được hướng dẫn thêm.',
    teacherCommentEn: 'Several answers use the wrong force direction. Please review free-body diagrams before solving; come see me for extra help.',
  },
  {
    id: 'a8', subject: 'Tiếng Anh', subjectEn: 'English', color: T.teal,
    class: '10A1', teacher: 'Đỗ Thị Mai',
    title: 'Bài tập từ vựng Unit 5', titleEn: 'Unit 5 vocabulary worksheet',
    description: 'Hoàn thành phiếu bài tập từ vựng và ngữ pháp Unit 5.',
    descriptionEn: 'Complete the Unit 5 vocabulary and grammar worksheet.',
    dueDate: '02/07/2026', daysLeft: -10, status: 'graded', allowFile: false,
    submittedAt: '01/07/2026 18:20', gradedAt: '03/07/2026 10:05',
    score: 7, maxScore: 10,
    teacherComment: 'Ổn. Một vài từ vựng dùng chưa đúng ngữ cảnh, xem lại phần collocation trong sách.',
    teacherCommentEn: 'Solid overall. A few words used out of context — review the collocations section.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

// Badge trạng thái — luôn kèm icon + label, KHÔNG chỉ truyền màu (a11y).
const asgBadge = (a, t) => {
  if (a.status === 'graded') return { label: t('Đã chấm', 'Graded'), color: T.success, bg: T.successLight, icon: 'checkSquare' };
  if (a.status === 'submitted') return { label: t('Đã nộp', 'Submitted'), color: T.primary, bg: T.primaryLight, icon: 'check' };
  // pending — mapping cố định theo design-system.md (lte1day error / lte3days warning / gt3days success)
  if (a.daysLeft < 0) return { label: t(`Quá hạn ${Math.abs(a.daysLeft)} ngày`, `${Math.abs(a.daysLeft)}d overdue`), color: T.error, bg: T.errorLight, icon: 'alertTriangle' };
  if (a.daysLeft === 0) return { label: t('Hạn hôm nay', 'Due today'), color: T.error, bg: T.errorLight, icon: 'alertTriangle' };
  if (a.daysLeft <= 1) return { label: t('Còn 1 ngày', '1 day left'), color: T.error, bg: T.errorLight, icon: 'clock' };
  if (a.daysLeft <= 3) return { label: t(`Còn ${a.daysLeft} ngày`, `${a.daysLeft} days left`), color: T.warning, bg: T.warningLight, icon: 'clock' };
  return { label: t(`Còn ${a.daysLeft} ngày`, `${a.daysLeft} days left`), color: T.success, bg: T.successLight, icon: 'clock' };
};

const asgIsOverdue = (a) => a.status === 'pending' && a.daysLeft < 0;

// Score màu — reuse mapping chuẩn (score ≥8 success, <5 error, else text-primary)
const asgScoreColor = (score) => score == null ? T.textMuted : score < 5 ? T.error : score >= 8 ? T.success : T.textPrimary;

const asgFmtDue = (a, t) => t(`Hạn nộp: ${a.dueDate}`, `Due: ${a.dueDate}`);

// ── Responsive hook (mirrors useINVIsMobile in invitations.jsx) ─────────────
const useASGIsMobile = () => {
  const [mobile, setMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 820 : false);
  React.useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 820);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

// ── Score chip (Layout 3) ────────────────────────────────────────────────────
const AsgScoreChip = ({ score, maxScore, lang }) => {
  const c = asgScoreColor(score);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
      borderRadius: 10, background: c + '14', border: `1px solid ${c}30`,
    }}>
      <Icon name="award" size={18} color={c} strokeWidth={1.8} />
      <span style={{ fontSize: 20, fontWeight: 800, color: c }}>{score}</span>
      <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>/{maxScore}</span>
    </div>
  );
};

// ── Assignment card (Layout 1) ───────────────────────────────────────────────
const AssignmentCard = ({ a, lang, onOpen, isMobile }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const badge = asgBadge(a, t);
  const overdue = asgIsOverdue(a);
  const isGraded = a.status === 'graded';
  const isSubmitted = a.status === 'submitted' || isGraded;

  const ctaLabel = isGraded
    ? t('Xem điểm & nhận xét', 'View score & feedback')
    : isSubmitted
      ? t('Xem bài đã nộp', 'View submission')
      : t('Nộp bài', 'Submit');
  const ctaIcon = isGraded ? 'award' : isSubmitted ? 'eye' : 'upload';

  return (
    <div className="asg-card" style={{
      background: T.card, borderRadius: 12,
      border: `1px solid ${overdue ? T.error + '40' : T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px 20px',
    }}>
      <div className="asg-card-head" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: a.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={isGraded ? 'award' : isSubmitted ? 'checkSquare' : 'fileText'} size={20} color={a.color} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="asg-card-title-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.35 }}>
              {t(`Bài tập: ${a.title}`, `Assignment: ${a.titleEn}`)}
            </div>
            <span className="asg-badge-slot" style={{ flexShrink: 0 }}>
              <Badge color={badge.color} bg={badge.bg}>
                <Icon name={badge.icon} size={10.5} color={badge.color} strokeWidth={2.4} />
                {badge.label}
              </Badge>
            </span>
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>
            {t(a.subject, a.subjectEn)} · {t(`Lớp ${a.class}`, `Class ${a.class}`)} · {t(`GV: ${a.teacher}`, `Teacher: ${a.teacher}`)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <Icon name="calendar" size={12} color={overdue ? T.error : T.textMuted} />
            <span style={{ fontSize: 12, color: overdue ? T.error : T.textMuted, fontWeight: overdue ? 700 : 400 }}>
              {asgFmtDue(a, t)}
            </span>
          </div>
          {isSubmitted && a.submittedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <Icon name="check" size={12} color={T.textMuted} />
              <span style={{ fontSize: 12, color: T.textMuted }}>
                {t(`Đã nộp lúc ${a.submittedAt}`, `Submitted at ${a.submittedAt}`)}
              </span>
            </div>
          )}
          {isGraded && a.score != null && (
            <div style={{ marginTop: 10 }}>
              <AsgScoreChip score={a.score} maxScore={a.maxScore} lang={lang} />
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Button size="sm" variant={isGraded ? 'secondary' : isSubmitted ? 'secondary' : 'primary'} icon={ctaIcon} onClick={() => onOpen(a)}
              style={isMobile ? { minHeight: 44 } : undefined}>
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Submit sheet (Layout 2) ─────────────────────────────────────────────────
const SubmitSheet = ({ assignment: a, lang, primaryColor, onClose, onSubmitted, isMobile }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const sheetRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const overdue = asgIsOverdue(a);
  const alreadySubmitted = a.status !== 'pending';

  const [files, setFiles] = React.useState([]);
  const [content, setContent] = React.useState('');
  const [phase, setPhase] = React.useState('form'); // form | confirmOverdue | submitting | error
  const [errorMsg, setErrorMsg] = React.useState(null);

  // Focus trap + ESC — mirrors ReportContentDialog pattern.
  React.useEffect(() => {
    const prev = document.activeElement;
    const el = sheetRef.current;
    if (el) { const f = el.querySelector('button, input, textarea'); if (f) f.focus(); }
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

  const addFiles = (fileList) => {
    const names = Array.from(fileList || []).map(f => f.name);
    if (!names.length) return;
    // Mock validation — file "too large" demo (>10MB not real, simulate by name convention)
    if (names.some(n => n.toLowerCase().includes('qua-lon'))) {
      setErrorMsg(t('Tệp quá lớn (tối đa 20MB). Vui lòng chọn tệp khác.', 'File too large (max 20MB). Please choose another file.'));
      return;
    }
    setErrorMsg(null);
    setFiles(prev => [...prev, ...names]);
  };

  const removeFile = (name) => setFiles(prev => prev.filter(n => n !== name));

  const doSubmit = () => {
    setPhase('submitting');
    window.setTimeout(() => {
      onSubmitted(a.id, { fileName: files[0], content });
    }, 900);
  };

  const handleSubmitClick = () => {
    if (overdue && phase === 'form') { setPhase('confirmOverdue'); return; }
    doSubmit();
  };

  const canSubmit = !alreadySubmitted && (a.allowFile ? files.length > 0 || content.trim() : content.trim() || files.length > 0);

  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.45)', zIndex: 1000 }} />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="asg-sheet-title"
        className="asg-sheet"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100vw',
          background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
          display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
        }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: a.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="fileText" size={19} color={a.color} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div id="asg-sheet-title" style={{ fontSize: 15.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.3 }}>
                {alreadySubmitted ? t('Bài đã nộp', 'Submission') : t('Nộp bài', 'Submit assignment')}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {t(a.subject, a.subjectEn)} · {t(`Lớp ${a.class}`, `Class ${a.class}`)}
              </div>
            </div>
            <button onClick={onClose} aria-label={t('Đóng', 'Close')}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="x" size={16} color={T.textMuted} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>
            {t(`Bài tập: ${a.title}`, `Assignment: ${a.titleEn}`)}
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 18 }}>
            {t(a.description, a.descriptionEn)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            <Icon name="calendar" size={13} color={overdue ? T.error : T.textMuted} />
            <span style={{ fontSize: 12.5, color: overdue ? T.error : T.textMuted, fontWeight: overdue ? 700 : 500 }}>{asgFmtDue(a, t)}</span>
          </div>

          {alreadySubmitted ? (
            <div style={{ padding: '14px 16px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{t(`Đã nộp lúc ${a.submittedAt}`, `Submitted at ${a.submittedAt}`)}</div>
              {a.fileName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="fileText" size={14} color={T.textSecondary} />
                  <span style={{ fontSize: 13, color: T.textPrimary }}>{a.fileName}</span>
                </div>
              )}
              {a.content_ && <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 8, lineHeight: 1.6 }}>{a.content_}</div>}
            </div>
          ) : (
            <React.Fragment>
              {/* Đính kèm tệp — mock file picker */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 8 }}>
                  {t('Đính kèm tệp', 'Attach file')}{a.allowFile ? '' : ` (${t('không bắt buộc', 'optional')})`}
                </label>
                <input ref={fileInputRef} type="file" multiple
                  aria-label={t('Chọn tệp đính kèm', 'Choose files to attach')}
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                  style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 9,
                    border: `1.5px dashed ${T.border}`, background: T.bg, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    color: T.textSecondary, fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
                  }}>
                  <Icon name="paperclip" size={15} color={T.textMuted} />
                  {t('Chọn tệp từ máy tính…', 'Choose file from device…')}
                </button>
                {files.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {files.map(name => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: T.primaryLight, borderRadius: 8 }}>
                        <Icon name="fileText" size={13} color={pColor} />
                        <span style={{ fontSize: 12.5, color: T.textPrimary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <button onClick={() => removeFile(name)} aria-label={t(`Xoá tệp ${name}`, `Remove file ${name}`)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
                          <Icon name="x" size={12} color={T.textMuted} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {errorMsg && (
                  <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
                    <Icon name="alertTriangle" size={13} color={T.errorText} strokeWidth={2} />
                    <span style={{ fontSize: 12, color: T.errorText }}>{errorMsg}</span>
                  </div>
                )}
              </div>

              {/* Nội dung bài làm */}
              <div style={{ marginBottom: 4 }}>
                <label htmlFor="asg-content" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 8 }}>
                  {t('Nội dung bài làm', 'Answer content')} ({t('không bắt buộc', 'optional')})
                </label>
                <textarea id="asg-content" rows={6} value={content} onChange={e => setContent(e.target.value)}
                  placeholder={t('Nhập nội dung bài làm (nếu không đính kèm tệp)…', 'Type your answer (if not attaching a file)…')}
                  style={{
                    width: '100%', padding: '10px 13px', borderRadius: 9, boxSizing: 'border-box',
                    border: `1.5px solid ${T.border}`, fontSize: 13, lineHeight: 1.6,
                    fontFamily: 'inherit', color: T.textPrimary, background: '#fff',
                    outline: 'none', resize: 'vertical',
                  }} />
              </div>
            </React.Fragment>
          )}
        </div>

        {/* Footer actions */}
        {!alreadySubmitted && (
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
            {phase === 'confirmOverdue' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                  <Icon name="alertTriangle" size={16} color={T.errorText} strokeWidth={2} />
                  <span style={{ fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>
                    {t('Bạn đang nộp trễ hạn, tiếp tục?', 'You are submitting late — continue?')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" onClick={() => setPhase('form')}
                    style={{ border: `1px solid ${T.border}`, color: T.textSecondary, ...(isMobile ? { minHeight: 44 } : {}) }}>
                    {t('Quay lại', 'Back')}
                  </Button>
                  <Button size="sm" variant="danger" icon="upload" onClick={doSubmit}
                    style={isMobile ? { minHeight: 44 } : undefined}>
                    {t('Vẫn nộp bài', 'Submit anyway')}
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" size="sm" icon="penLine"
                  disabled={phase === 'submitting'}
                  onClick={() => onClose()}
                  style={isMobile ? { minHeight: 44 } : undefined}>
                  {t('Lưu nháp', 'Save draft')}
                </Button>
                <Button size="sm" icon={phase === 'submitting' ? undefined : 'send'}
                  disabled={!canSubmit || phase === 'submitting'}
                  onClick={handleSubmitClick}
                  style={isMobile ? { minHeight: 44 } : undefined}>
                  {phase === 'submitting' ? (
                    <React.Fragment>
                      <span className="asg-spinner" aria-hidden="true" />
                      {t('Đang nộp…', 'Submitting…')}
                    </React.Fragment>
                  ) : t('Nộp bài', 'Submit')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

// ── Graded feedback sheet (Layout 3) ────────────────────────────────────────
const GradedSheet = ({ assignment: a, lang, onClose }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const sheetRef = React.useRef(null);
  const c = asgScoreColor(a.score);

  React.useEffect(() => {
    const prev = document.activeElement;
    const el = sheetRef.current;
    if (el) { const f = el.querySelector('button'); if (f) f.focus(); }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);

  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.45)', zIndex: 1000 }} />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="asg-graded-title"
        className="asg-sheet"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100vw',
          background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
          display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
        }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="award" size={19} color={c} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div id="asg-graded-title" style={{ fontSize: 15.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.3 }}>
                {t('Điểm & nhận xét', 'Score & feedback')}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {t(a.subject, a.subjectEn)} · {t(`Lớp ${a.class}`, `Class ${a.class}`)}
              </div>
            </div>
            <button onClick={onClose} aria-label={t('Đóng', 'Close')}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="x" size={16} color={T.textMuted} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 16 }}>
            {t(`Bài tập: ${a.title}`, `Assignment: ${a.titleEn}`)}
          </div>

          <AsgScoreChip score={a.score} maxScore={a.maxScore} lang={lang} />

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t('Nhận xét của giáo viên', 'Teacher\'s feedback')}
            </div>
            <div style={{ padding: '14px 16px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 13.5, color: T.textPrimary, lineHeight: 1.65 }}>
                {t(a.teacherComment, a.teacherCommentEn)}
              </div>
            </div>
          </div>

          {a.gradedFileName && (
            <div style={{ marginTop: 16 }}>
              <a href="#" onClick={e => e.preventDefault()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.primary, fontWeight: 700, textDecoration: 'none' }}>
                <Icon name="download" size={14} color={T.primary} />
                {t(`Tải tệp GV đã chấm — ${a.gradedFileName}`, `Download graded file — ${a.gradedFileName}`)}
              </a>
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={12} color={T.textMuted} />
              <span style={{ fontSize: 12, color: T.textMuted }}>{t(`Đã nộp lúc ${a.submittedAt}`, `Submitted at ${a.submittedAt}`)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="award" size={12} color={T.textMuted} />
              <span style={{ fontSize: 12, color: T.textMuted }}>{t(`Đã chấm lúc ${a.gradedAt}`, `Graded at ${a.gradedAt}`)}</span>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

// ── Main screen ──────────────────────────────────────────────────────────────

const StudentAssignmentsScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isMobile = useASGIsMobile();

  const [assignments, setAssignments] = React.useState(ASG_SEED);
  const [filter, setFilter] = React.useState('all');
  const [sheet, setSheet] = React.useState(null); // { assignment, mode: 'submit' | 'graded' }
  const [toast, setToast] = React.useState(null);
  const toastRef = React.useRef(null);

  // Loading / error — bộ chuẩn states.jsx (pattern failedOnce như invitations.jsx)
  const [status, setStatus] = React.useState('loading'); // loading | error | ready
  const failedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setStatus('ready'), 650);
    return () => window.clearTimeout(id);
  }, []);

  const refresh = () => {
    setStatus('loading');
    window.setTimeout(() => {
      if (!failedOnce.current) { failedOnce.current = true; setStatus('error'); }
      else setStatus('ready');
    }, 650);
  };

  const showToast = (text) => {
    if (toastRef.current) window.clearTimeout(toastRef.current);
    setToast(text);
    toastRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  const openCard = (a) => setSheet({ assignment: a, mode: a.status === 'graded' ? 'graded' : 'submit' });
  const closeSheet = () => setSheet(null);

  const handleSubmitted = (id, { fileName }) => {
    const now = new Date();
    const stamp = now.toLocaleDateString('vi-VN') + ' ' + now.toTimeString().slice(0, 5);
    setAssignments(list => list.map(a => a.id === id
      ? { ...a, status: 'submitted', submittedAt: stamp, fileName: fileName || a.fileName }
      : a));
    setSheet(null);
    showToast(t('Đã nộp bài thành công', 'Assignment submitted'));
  };

  const pendingCount = assignments.filter(a => a.status === 'pending').length;

  const TABS = [
    { id: 'all', label: t('Tất cả', 'All') },
    { id: 'pending', label: t('Chưa nộp', 'Not submitted') },
    { id: 'submitted', label: t('Đã nộp', 'Submitted') },
    { id: 'graded', label: t('Đã chấm', 'Graded') },
  ];

  const filtered = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'submitted') return a.status === 'submitted';
    if (filter === 'graded') return a.status === 'graded';
    return true;
  });

  const emptyConfig = {
    pending: { icon: 'checkSquare', title: t('Không có bài tập nào cần nộp 🎉', 'Nothing left to submit 🎉'), color: T.success },
    submitted: { icon: 'inbox', title: t('Chưa có bài nộp nào', 'No submissions yet'), color: pColor },
    graded: { icon: 'inbox', title: t('Chưa có bài nộp nào', 'No submissions yet'), color: pColor },
    all: { icon: 'inbox', title: t('Chưa có bài tập nào được giao', 'No assignments assigned yet'), color: pColor },
  };

  return (
    <div data-screen-label="Học sinh · Bài tập" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '28px 32px' }}>
      <style>{`
        @keyframes asg-spin { to { transform: rotate(360deg); } }
        @keyframes asg-toast-in { from { transform: translate(-50%, 8px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes asg-sheet-in { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .asg-spinner {
          width: 13px; height: 13px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
          display: inline-block; animation: asg-spin 0.7s linear infinite;
        }
        .asg-sheet { animation: asg-sheet-in 0.2s ease-out; }
        .asg-toast { animation: asg-toast-in 0.2s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .asg-spinner, .asg-sheet, .asg-toast { animation: none !important; }
        }
        .asg-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 480px) {
          .asg-card-title-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .asg-badge-slot { align-self: flex-start; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Bài tập', 'Assignments')}</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
            {pendingCount > 0
              ? t(`Bạn có ${pendingCount} bài tập đang chờ nộp`, `You have ${pendingCount} assignment${pendingCount > 1 ? 's' : ''} waiting to be submitted`)
              : t('Không có bài tập nào cần nộp', 'No assignments waiting to be submitted')}
          </div>
        </div>

        {/* Filter tabs */}
        <div role="tablist" aria-label={t('Lọc theo trạng thái', 'Filter by status')} className="asg-tabs"
          style={{ display: 'inline-flex', gap: 4, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4, marginBottom: 18, maxWidth: '100%' }}>
          {TABS.map(tb => {
            const active = filter === tb.id;
            return (
              <button key={tb.id} role="tab" aria-selected={active} onClick={() => setFilter(tb.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, whiteSpace: 'nowrap',
                  fontWeight: active ? 800 : 600, minHeight: 36,
                  background: active ? pColor + '14' : 'transparent',
                  color: active ? pColor : T.textSecondary, transition: 'all 0.13s',
                }}>
                {tb.label}
              </button>
            );
          })}
        </div>

        {/* States */}
        {status === 'loading' && <EduSkeleton variant="rows" count={4} lang={lang} />}
        {status === 'error' && (
          <EduError lang={lang} onRetry={refresh}
            title={t('Không tải được danh sách bài tập', 'Could not load assignments')}
            desc={t('Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.', 'Something went wrong while contacting the server. Please try again.')} />
        )}
        {status === 'ready' && (
          filtered.length === 0 ? (
            <EduEmpty lang={lang} icon={emptyConfig[filter].icon} color={emptyConfig[filter].color}
              title={emptyConfig[filter].title} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(a => (
                <AssignmentCard key={a.id} a={a} lang={lang} onOpen={openCard} isMobile={isMobile} />
              ))}
            </div>
          )
        )}
      </div>

      {sheet && sheet.mode === 'submit' && (
        <SubmitSheet assignment={sheet.assignment} lang={lang} primaryColor={pColor}
          onClose={closeSheet} onSubmitted={handleSubmitted} isMobile={isMobile} />
      )}
      {sheet && sheet.mode === 'graded' && (
        <GradedSheet assignment={sheet.assignment} lang={lang} onClose={closeSheet} />
      )}

      {toast && (
        <div role="status" className="asg-toast" style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff', borderRadius: 10,
          padding: '10px 18px 10px 12px', fontSize: 12.5, fontWeight: 600, zIndex: 9500,
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', gap: 9,
        }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: T.success + '33', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={12} color={T.success} strokeWidth={2.6} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { StudentAssignmentsScreen });
