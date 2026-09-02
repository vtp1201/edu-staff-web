// ── Course Items (ADR 0143) — timeline học tập ────────────────────────────────
// Mô hình: 1 khoá học / (lớp × môn) = 1 danh sách course_items có thứ tự,
// 4 loại: lesson / assignment / exam / document. start_at & due_at có thể null.

const CI_NOW = new Date('2026-04-27T09:00:00');

const CI_COURSES = [
  { id: 1, name: 'Toán học', nameEn: 'Mathematics', teacher: 'Nguyễn Thị Hương', teacherEn: 'Nguyen Thi Huong', color: T.primary, icon: 'percent' },
  { id: 2, name: 'Vật Lý', nameEn: 'Physics', teacher: 'Trần Văn Minh', teacherEn: 'Tran Van Minh', color: T.success, icon: 'trendUp' },
  { id: 3, name: 'Hóa Học', nameEn: 'Chemistry', teacher: 'Lê Thị Hoa', teacherEn: 'Le Thi Hoa', color: T.warning, icon: 'star' },
  { id: 4, name: 'Ngữ Văn', nameEn: 'Literature', teacher: 'Phạm Quốc Bảo', teacherEn: 'Pham Quoc Bao', color: T.purple, icon: 'book' },
  { id: 5, name: 'Tiếng Anh', nameEn: 'English', teacher: 'Đỗ Thị Mai', teacherEn: 'Do Thi Mai', color: T.teal, icon: 'message' },
  { id: 6, name: 'Lịch Sử', nameEn: 'History', teacher: 'Hoàng Văn Nam', teacherEn: 'Hoang Van Nam', color: T.error, icon: 'fileText' },
];

// weeks[].items[]: { id, type, vi, en, start, due, submitted?, grade?, link? }
const CI_ITEMS = {
  1: [
    { id: 'w30', vi: 'Tuần 30 · 20/04 – 26/04', en: 'Week 30 · Apr 20–26', items: [
      { id: 'm1', type: 'lesson', vi: 'Bài giảng: Quy tắc tính đạo hàm', en: 'Lecture: Differentiation rules', start: '2026-04-20T07:00', due: null },
      { id: 'm2', type: 'assignment', vi: 'Bài tập Đạo hàm #11', en: 'Derivatives Homework #11', start: '2026-04-20T07:00', due: '2026-04-24T23:59', submitted: true, grade: 8.5 },
      { id: 'm3', type: 'document', vi: 'Tài liệu: Bảng công thức đạo hàm', en: 'Handout: Derivative formula sheet', start: '2026-04-20T07:00', due: null, link: 'drive.google.com/…' },
    ]},
    { id: 'w31', vi: 'Tuần 31 · 27/04 – 03/05', en: 'Week 31 · Apr 27 – May 3', items: [
      { id: 'm4', type: 'lesson', vi: 'Bài giảng: Đạo hàm và vi phân', en: 'Lecture: Derivatives & differentials', start: '2026-04-27T07:00', due: null },
      { id: 'm5', type: 'assignment', vi: 'Bài tập Đại số tuyến tính #12', en: 'Linear Algebra Homework #12', start: '2026-04-25T07:00', due: '2026-04-28T23:59' },
      { id: 'm6', type: 'exam', vi: 'Kiểm tra 15 phút — Chương V', en: '15-min Quiz — Chapter V', start: '2026-04-29T08:00', due: '2026-04-29T08:45' },
      { id: 'm7', type: 'document', vi: 'Tài liệu: Mô phỏng GeoGebra tiếp tuyến', en: 'Resource: GeoGebra tangent demo', start: '2026-04-27T07:00', due: null, link: 'geogebra.org/…' },
    ]},
    { id: 'w32', vi: 'Tuần 32 · 04/05 – 10/05', en: 'Week 32 · May 4–10', items: [
      { id: 'm8', type: 'lesson', vi: 'Bài giảng: Ứng dụng đạo hàm khảo sát hàm số', en: 'Lecture: Applying derivatives to curve sketching', start: '2026-05-04T07:00', due: null },
      { id: 'm9', type: 'exam', vi: 'Kiểm tra 1 tiết — Chương IV & V', en: '45-min Test — Chapters IV & V', start: '2026-05-08T08:00', due: '2026-05-08T08:45' },
    ]},
  ],
  2: [
    { id: 'w30', vi: 'Tuần 30 · 20/04 – 26/04', en: 'Week 30 · Apr 20–26', items: [
      { id: 'm1', type: 'assignment', vi: 'Bài tập Điện từ trường', en: 'EM Fields Worksheet', start: '2026-04-14T07:00', due: '2026-04-18T23:59', submitted: true, grade: 9.0 },
      { id: 'm2', type: 'lesson', vi: 'Bài giảng: Điện từ trường', en: 'Lecture: Electromagnetic fields', start: '2026-04-20T07:00', due: null },
    ]},
    { id: 'w31', vi: 'Tuần 31 · 27/04 – 03/05', en: 'Week 31 · Apr 27 – May 3', items: [
      { id: 'm3', type: 'document', vi: 'Tài liệu: Slide Điện từ trường', en: 'Slides: EM fields', start: '2026-04-27T07:00', due: null, link: 'drive.google.com/…' },
      { id: 'm4', type: 'exam', vi: 'Kiểm tra 15 phút — Cảm ứng điện từ', en: '15-min Quiz — EM induction', start: '2026-05-05T08:00', due: '2026-05-05T08:20' },
    ]},
  ],
  3: [
    { id: 'w31', vi: 'Tuần 31 · 27/04 – 03/05', en: 'Week 31 · Apr 27 – May 3', items: [
      { id: 'm1', type: 'lesson', vi: 'Bài giảng: Phản ứng oxi hoá khử', en: 'Lecture: Redox reactions', start: '2026-04-24T07:00', due: null },
      { id: 'm2', type: 'assignment', vi: 'Báo cáo thí nghiệm Điện phân', en: 'Electrolysis Lab Report', start: '2026-04-24T07:00', due: '2026-05-01T23:59' },
      { id: 'm3', type: 'document', vi: 'Tài liệu: Video thí nghiệm điện phân CuSO₄', en: 'Resource: CuSO₄ electrolysis video', start: '2026-04-24T07:00', due: null, link: 'youtube.com/…' },
    ]},
  ],
  4: [
    { id: 'w30', vi: 'Tuần 30 · 20/04 – 26/04', en: 'Week 30 · Apr 20–26', items: [
      { id: 'm1', type: 'assignment', vi: 'Phân tích đoạn trích Truyện Kiều', en: 'Kieu Story Excerpt Analysis', start: '2026-04-13T07:00', due: '2026-04-20T23:59', submitted: true },
      { id: 'm2', type: 'lesson', vi: 'Bài giảng: Truyện Kiều — Trao duyên', en: 'Lecture: The Tale of Kieu — Trao duyen', start: '2026-04-20T07:00', due: null },
    ]},
    { id: 'w31', vi: 'Tuần 31 · 27/04 – 03/05', en: 'Week 31 · Apr 27 – May 3', items: [
      { id: 'm3', type: 'exam', vi: 'Kiểm tra 15 phút — Thơ mới', en: '15-min Quiz — New Poetry', start: '2026-04-26T07:00', due: '2026-04-28T23:59' },
    ]},
  ],
  5: [
    { id: 'w31', vi: 'Tuần 31 · 27/04 – 03/05', en: 'Week 31 · Apr 27 – May 3', items: [
      { id: 'm1', type: 'lesson', vi: 'Lecture: Advanced Reading Skills', en: 'Lecture: Advanced Reading Skills', start: '2026-04-27T07:00', due: null },
      { id: 'm2', type: 'assignment', vi: 'Essay: The role of technology in education', en: 'Essay: The role of technology in education', start: '2026-04-22T07:00', due: '2026-04-29T23:59' },
      { id: 'm3', type: 'document', vi: 'Tài liệu: Vocabulary List Unit 7–10', en: 'Handout: Vocabulary List Unit 7–10', start: '2026-04-27T07:00', due: null, link: 'drive.google.com/…' },
    ]},
  ],
  6: [
    { id: 'w31', vi: 'Tuần 31 · 27/04 – 03/05', en: 'Week 31 · Apr 27 – May 3', items: [
      { id: 'm1', type: 'document', vi: 'Tài liệu: Sơ đồ tư duy CTTG II', en: 'Resource: WWII mind map', start: '2026-04-27T07:00', due: null, link: 'drive.google.com/…' },
      { id: 'm2', type: 'assignment', vi: 'Bài tập: Niên biểu Chiến tranh thế giới II', en: 'Homework: WWII timeline', start: '2026-04-27T07:00', due: '2026-05-03T23:59' },
      { id: 'm3', type: 'lesson', vi: 'Bài giảng: Chiến tranh thế giới II (phần 2)', en: 'Lecture: World War II (part 2)', start: '2026-05-02T07:00', due: null },
    ]},
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const ciStatus = (it) => {
  const s = it.start ? new Date(it.start) : null;
  const d = it.due ? new Date(it.due) : null;
  if (s && s > CI_NOW) return 'upcoming';
  if (d && d < CI_NOW) return 'closed';
  return 'open';
};
const ciStatusMeta = (st, t) => (
  st === 'upcoming' ? { label: t('Sắp mở', 'Opens soon'), color: T.info, bg: T.infoLight } :
  st === 'open'     ? { label: t('Đang mở', 'Open'), color: '#0E9A82', bg: T.successLight } :
                      { label: t('Đã đóng — chỉ xem', 'Closed — view only'), color: T.textMuted, bg: '#EEF1F6' }
);
const ciTypeMeta = (type, t) => (
  type === 'lesson'     ? { icon: 'play', label: t('Bài giảng', 'Lesson'), color: T.primary } :
  type === 'assignment' ? { icon: 'clipboard', label: t('Bài tập', 'Assignment'), color: T.warningText } :
  type === 'exam'       ? { icon: 'fileText', label: t('Kiểm tra', 'Exam'), color: T.errorText } :
                          { icon: 'link', label: t('Tài liệu', 'Document'), color: T.teal }
);
const ciFmt = (iso, withTime) => {
  if (!iso) return null;
  const d = new Date(iso);
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return withTime === false ? dd : `${dd} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const ciWindow = (it, t) => {
  const s = ciFmt(it.start), d = ciFmt(it.due);
  if (s && d) return `${s} → ${d}`;
  if (s) return t(`Mở từ ${s}`, `Opens ${s}`);
  if (d) return t(`Hạn ${d}`, `Due ${d}`);
  return t('Luôn mở', 'Always open');
};
const ciFlat = (courseId) => (CI_ITEMS[courseId] || []).flatMap(w => w.items);
// Tóm tắt cho card môn học: mục sắp đến hạn gần nhất + số mục đang mở
const ciCourseSummary = (courseId) => {
  const items = ciFlat(courseId);
  const open = items.filter(it => ciStatus(it) === 'open');
  const withDue = items.filter(it => it.due && new Date(it.due) >= CI_NOW && ciStatus(it) !== 'closed')
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  return { openCount: open.length, nextDue: withDue[0] || null };
};

// ── Shared atoms ──────────────────────────────────────────────────────────────
const CiStatusPill = ({ st, t }) => {
  const m = ciStatusMeta(st, t);
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 99, background: m.bg, color: m.color, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }}></span>{m.label}
  </span>;
};
const CiTypeChip = ({ type, t }) => {
  const m = ciTypeMeta(type, t);
  return <div style={{ width: 32, height: 32, borderRadius: 9, background: m.color + '16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <Icon name={m.icon} size={15} color={m.color} strokeWidth={2.1} />
  </div>;
};

// ── 1) Khoá học của tôi — cards ───────────────────────────────────────────────
const StudentCoursesV2 = ({ lang, t, pColor, onCourseSelect }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
    {CI_COURSES.map(c => {
      const s = ciCourseSummary(c.id);
      const nd = s.nextDue;
      const ndMeta = nd && ciTypeMeta(nd.type, t);
      const soon = nd && (new Date(nd.due) - CI_NOW) / 36e5 <= 48;
      return (
        <div key={c.id} onClick={() => onCourseSelect(c)}
          style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', display: 'flex', flexDirection: 'column' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ height: 6, background: c.color }}></div>
          <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{lang === 'en' ? c.nameEn : c.name}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{lang === 'en' ? c.teacherEn : c.teacher}</div>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={c.icon} size={17} color={c.color} />
              </div>
            </div>
            {nd ? (
              <div style={{ background: soon ? T.warningLight : T.bg, border: `1px solid ${soon ? T.warning + '55' : T.border}`, borderRadius: 9, padding: '9px 12px', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <Icon name="clock" size={14} color={soon ? T.warningText : T.textMuted} strokeWidth={2.2} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: soon ? T.warningText : T.textMuted }}>{t('Sắp đến hạn', 'Due next')}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? nd.en : nd.vi}</div>
                  <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 1 }}>{ndMeta.label} · {t('hạn', 'due')} {ciFmt(nd.due)}</div>
                </div>
              </div>
            ) : (
              <div style={{ background: T.bg, borderRadius: 9, padding: '9px 12px', fontSize: 12, color: T.textMuted }}>{t('Không có mục nào sắp đến hạn.', 'Nothing due soon.')}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0E9A82' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0E9A82' }}></span>
                {t(`${s.openCount} mục đang mở`, `${s.openCount} open items`)}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: c.color }}>
                {t('Vào khoá học', 'Open course')}<Icon name="chevronRight" size={12} color={c.color} strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// ── Chi tiết mục (học sinh, expand trong timeline) ────────────────────────────
const CiItemDetail = ({ item, course, st, lang, t, onStartExam }) => {
  const closedNote = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EEF1F6', border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>
      <Icon name="lock" size={13} color={T.textMuted} strokeWidth={2.2} />
      {t('Đã đóng — bạn vẫn xem được nội dung để ôn tập, nhưng không thể nộp bài nữa.', 'Closed — you can still review the content, but submissions are locked.')}
    </div>
  );
  if (st === 'upcoming') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.infoLight, borderRadius: 8, padding: '9px 12px', fontSize: 12, color: T.info, fontWeight: 700 }}>
      <Icon name="clock" size={13} color={T.info} strokeWidth={2.2} />
      {t(`Nội dung sẽ mở lúc ${ciFmt(item.start)}.`, `Content opens at ${ciFmt(item.start)}.`)}
    </div>
  );
  if (item.type === 'lesson') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {st === 'closed' && closedNote}
      <button style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8, border: 'none', background: course.color, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon name="play" size={12} color="#fff" strokeWidth={2.4} />{t('Xem bài giảng', 'Watch lesson')}
      </button>
    </div>
  );
  if (item.type === 'document') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {st === 'closed' && closedNote}
      <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.55 }}>{t('Tài liệu tham khảo do giáo viên đính kèm — mở bằng liên kết ngoài.', 'Reference material attached by the teacher — opens via external link.')}</div>
      <a href="#" onClick={e => e.preventDefault()} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${T.teal}55`, background: T.tealLight, color: '#00806F', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
        <Icon name="link" size={13} color="#00806F" strokeWidth={2.2} />{item.link}
      </a>
    </div>
  );
  if (item.type === 'exam') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {st === 'closed' ? closedNote : (
        <div style={{ fontSize: 12.5, color: T.textSecondary }}>{t('Bấm để chuyển sang màn hình làm bài. Nộp trước khi hết giờ.', 'Opens the exam screen. Submit before time runs out.')}</div>
      )}
      {st === 'closed' ? (
        <button style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.card, color: T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Xem lại đề & bài làm', 'Review exam & answers')}</button>
      ) : (
        <button onClick={onStartExam} style={{ alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 8, border: 'none', background: T.errorText, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="fileText" size={13} color="#fff" strokeWidth={2.2} />{t('Vào làm bài', 'Start exam')}
        </button>
      )}
    </div>
  );
  // assignment
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {item.submitted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.successLight, borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#0E9A82', fontWeight: 700 }}>
          <Icon name="check" size={13} color="#0E9A82" strokeWidth={2.6} />
          {t('Đã nộp bài.', 'Submitted.')}{item.grade != null && ` · ${t('Điểm', 'Grade')}: ${item.grade}/10`}
          <span style={{ fontWeight: 600, color: T.textMuted }}>{t('(chỉ nộp 1 lần)', '(single submission)')}</span>
        </div>
      ) : st === 'closed' ? closedNote : (
        <div style={{ border: `1.5px dashed ${T.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Icon name="upload" size={16} color={T.textMuted} strokeWidth={2} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{t('Nộp bài làm của bạn', 'Submit your work')}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{t('Chỉ được nộp 1 lần duy nhất — kiểm tra kỹ trước khi nộp.', 'One submission only — double-check before submitting.')}</div>
          </div>
          <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: course.color, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Chọn tệp & nộp', 'Choose file & submit')}</button>
        </div>
      )}
      {st === 'closed' && !item.submitted && (
        <div style={{ fontSize: 12, color: T.errorText, fontWeight: 700 }}>{t('Bạn chưa nộp bài này trước hạn.', 'You did not submit before the deadline.')}</div>
      )}
    </div>
  );
};

// ── Một dòng timeline ─────────────────────────────────────────────────────────
const CiRow = ({ item, course, lang, t, mode, expanded, onToggle, onStartExam, onOpenItem, dragProps, onEditDates, isLast }) => {
  const st = ciStatus(item);
  const tm = ciTypeMeta(item.type, t);
  const dotColor = st === 'open' ? '#0E9A82' : st === 'upcoming' ? T.info : '#C3CBD9';
  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }} {...(dragProps || {})}>
      {/* timeline rail */}
      <div style={{ width: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 2, flex: '0 0 18px', background: T.border }}></div>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, border: `2px solid ${T.card}`, boxShadow: `0 0 0 1.5px ${dotColor}` }}></div>
        {!isLast && <div style={{ width: 2, flex: 1, background: T.border }}></div>}
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '6px 0' }}>
        <div onClick={mode === 'readonly' ? undefined : mode === 'student' && onOpenItem ? () => onOpenItem(item) : onToggle}
          style={{ background: expanded ? T.bg : T.card, border: `1px solid ${expanded ? course.color + '50' : T.border}`, borderRadius: 10, padding: '11px 14px', cursor: mode === 'readonly' ? 'default' : 'pointer', opacity: st === 'upcoming' && mode === 'student' ? 0.72 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {mode === 'teacher' && <Icon name="gripVertical" size={14} color={T.textMuted} strokeWidth={2} />}
            <CiTypeChip type={item.type} t={t} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: st === 'closed' ? T.textSecondary : T.textPrimary }}>{lang === 'en' ? item.en : item.vi}</span>
                {st === 'upcoming' && mode === 'student' && <Icon name="lock" size={12} color={T.info} strokeWidth={2.2} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11, color: T.textMuted, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: tm.color }}>{tm.label}</span>
                <span>·</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ciWindow(item, t)}</span>
                {mode === 'teacher' && (
                  <button onClick={e => { e.stopPropagation(); onEditDates(); }}
                    style={{ background: 'none', border: 'none', color: T.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon name="edit" size={11} color={T.primary} strokeWidth={2.2} />{t('Sửa ngày', 'Edit dates')}
                  </button>
                )}
              </div>
            </div>
            <CiStatusPill st={st} t={t} />
            {mode !== 'readonly' && <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} color={T.textMuted} strokeWidth={2.4} />}
          </div>
          {expanded && mode === 'student' && (
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
              <CiItemDetail item={item} course={course} st={st} lang={lang} t={t} onStartExam={onStartExam} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 2) Trang chi tiết khoá học — timeline dọc duy nhất ────────────────────────
const CourseTimelinePage = ({ course, lang, t, pColor, onBack, onStartExam, onOpenItem, mode = 'student', hideHeaderBack }) => {
  const [weeks, setWeeks] = React.useState(() => JSON.parse(JSON.stringify(CI_ITEMS[course.id] || [])));
  const [expandedId, setExpandedId] = React.useState(null);
  const [editing, setEditing] = React.useState(null); // {wi, ii, start, due}
  const [addMenu, setAddMenu] = React.useState(null); // week index
  const drag = React.useRef(null);

  const allItems = weeks.flatMap(w => w.items);
  const openCount = allItems.filter(it => ciStatus(it) === 'open').length;

  const moveItem = (wi, from, to) => setWeeks(ws => {
    const next = ws.map(w => ({ ...w, items: [...w.items] }));
    const [it] = next[wi].items.splice(from, 1);
    next[wi].items.splice(to, 0, it);
    return next;
  });
  const addItem = (wi, type) => {
    const tm = ciTypeMeta(type, t);
    setWeeks(ws => {
      const next = ws.map(w => ({ ...w, items: [...w.items] }));
      const id = 'new' + Date.now();
      next[wi].items.push({ id, type, vi: t(`${tm.label} mới (chưa đặt tên)`, `New ${tm.label.toLowerCase()} (untitled)`), en: `New ${tm.label.toLowerCase()} (untitled)`, start: null, due: null });
      return next;
    });
    setAddMenu(null);
  };
  const saveDates = () => {
    setWeeks(ws => {
      const next = ws.map(w => ({ ...w, items: w.items.map(x => ({ ...x })) }));
      next[editing.wi].items[editing.ii].start = editing.start || null;
      next[editing.wi].items[editing.ii].due = editing.due || null;
      return next;
    });
    setEditing(null);
  };

  const inputStyle = { padding: '6px 8px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: 'inherit', color: T.textPrimary, background: '#fff', outline: 'none' };
  const legend = [['upcoming'], ['open'], ['closed']];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!hideHeaderBack && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
          <Icon name="chevronLeft" size={12} color={T.textMuted} strokeWidth={2.3} />{t('Khoá học', 'Courses')}
        </button>
        <Icon name="chevronRight" size={11} color={T.textMuted} />
        <span style={{ color: T.textPrimary, fontWeight: 700 }}>{lang === 'en' ? course.nameEn : course.name}</span>
      </div>}

      {/* Course header */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: course.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={course.icon || 'bookOpen'} size={20} color={course.color} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{lang === 'en' ? course.nameEn : course.name}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            {mode === 'teacher' ? t('Chế độ giáo viên — kéo thả để sắp xếp, sửa ngày ngay trên dòng', 'Teacher mode — drag to reorder, edit dates inline') : mode === 'readonly' ? t('Chỉ đọc — khoá học do GV bộ môn quản lý', 'Read-only — managed by the subject teacher') : (lang === 'en' ? course.teacherEn : course.teacher)}
            {' · '}{t(`${openCount} mục đang mở`, `${openCount} open items`)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['upcoming', 'open', 'closed'].map(st => {
            const m = ciStatusMeta(st, t);
            return <span key={st} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: m.color }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }}></span>{m.label}
            </span>;
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '6px 18px 18px' }}>
        {weeks.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
            <Icon name="bookOpen" size={32} color={T.border} strokeWidth={1.6} />
            <div style={{ marginTop: 10 }}>{t('Giáo viên chưa thêm nội dung cho khoá học này.', 'No content added to this course yet.')}</div>
          </div>
        )}
        {weeks.map((w, wi) => (
          <div key={w.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0 6px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{lang === 'en' ? w.en : w.vi}</span>
              <div style={{ flex: 1, height: 1, background: T.border }}></div>
              {mode === 'teacher' && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setAddMenu(addMenu === wi ? null : wi)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${pColor}`, background: addMenu === wi ? pColor : T.card, color: addMenu === wi ? '#fff' : pColor, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Icon name="plus" size={11} color={addMenu === wi ? '#fff' : pColor} strokeWidth={2.6} />{t('Thêm mục', 'Add item')}
                  </button>
                  {addMenu === wi && (
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.14)', overflow: 'hidden', minWidth: 170 }}>
                      {['lesson', 'assignment', 'exam', 'document'].map(type => {
                        const m = ciTypeMeta(type, t);
                        return <button key={type} onClick={() => addItem(wi, type)}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: T.textPrimary, textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = T.bg}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <Icon name={m.icon} size={13} color={m.color} strokeWidth={2.1} />{m.label}
                        </button>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {w.items.map((item, ii) => {
              const isEditing = editing && editing.wi === wi && editing.ii === ii;
              return (
                <div key={item.id}>
                  <CiRow item={item} course={course} lang={lang} t={t} mode={mode}
                    expanded={expandedId === w.id + item.id}
                    onToggle={() => setExpandedId(x => x === w.id + item.id ? null : w.id + item.id)}
                    onStartExam={onStartExam}
                    onOpenItem={onOpenItem}
                    onEditDates={() => setEditing({ wi, ii, start: item.start || '', due: item.due || '' })}
                    isLast={ii === w.items.length - 1 && wi === weeks.length - 1}
                    dragProps={mode === 'teacher' ? {
                      draggable: true,
                      onDragStart: () => { drag.current = { wi, ii }; },
                      onDragOver: e => e.preventDefault(),
                      onDrop: () => { if (drag.current && drag.current.wi === wi && drag.current.ii !== ii) moveItem(wi, drag.current.ii, ii); drag.current = null; },
                      style: { cursor: 'grab' },
                    } : null} />
                  {isEditing && (
                    <div style={{ margin: '0 0 8px 34px', background: T.primaryLight, border: `1px solid ${pColor}40`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textSecondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {t('Mở lúc', 'Opens')}
                        <input type="datetime-local" value={editing.start} onChange={e => setEditing(s => ({ ...s, start: e.target.value }))} style={inputStyle} />
                      </label>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textSecondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {t('Hạn chót', 'Due')}
                        <input type="datetime-local" value={editing.due} onChange={e => setEditing(s => ({ ...s, due: e.target.value }))} style={inputStyle} />
                      </label>
                      <span style={{ fontSize: 11, color: T.textMuted }}>{t('Để trống = không giới hạn', 'Blank = no limit')}</span>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                        <button onClick={() => setEditing(null)} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.textSecondary, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Huỷ', 'Cancel')}</button>
                        <button onClick={saveDates} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: pColor, color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Lưu', 'Save')}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 3) Bộ lọc xuyên môn: Bài tập / Bài kiểm tra ───────────────────────────────
const CrossSubjectList = ({ kind, lang, t, pColor, onOpenCourse, onStartExam }) => {
  const [tab, setTab] = React.useState('open');
  const rows = CI_COURSES.flatMap(c => ciFlat(c.id).filter(it => it.type === kind).map(it => ({ course: c, item: it, st: ciStatus(it) })));
  const sortDue = (a, b) => (a.item.due ? new Date(a.item.due) : Infinity) - (b.item.due ? new Date(b.item.due) : Infinity);
  const groups = {
    open: rows.filter(r => r.st === 'open').sort(sortDue),
    upcoming: rows.filter(r => r.st === 'upcoming').sort((a, b) => new Date(a.item.start) - new Date(b.item.start)),
    closed: rows.filter(r => r.st === 'closed').sort((a, b) => sortDue(b, a)),
  };
  const tabs = [
    { id: 'open', vi: 'Đang mở', en: 'Open' },
    { id: 'upcoming', vi: 'Sắp mở', en: 'Upcoming' },
    { id: 'closed', vi: 'Đã đóng', en: 'Closed' },
  ];
  const list = groups[tab];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.infoLight, borderRadius: 9, padding: '9px 14px', fontSize: 12, color: T.info, fontWeight: 600 }}>
        <Icon name="info" size={13} color={T.info} strokeWidth={2.2} />
        {kind === 'assignment'
          ? t('Danh sách này lọc mọi bài tập từ timeline của tất cả môn học — bài sắp hết hạn xếp trước.', 'This list filters every assignment across all course timelines — soonest deadline first.')
          : t('Danh sách này lọc mọi bài kiểm tra từ timeline của tất cả môn học — bài sắp hết hạn xếp trước.', 'This list filters every exam across all course timelines — soonest deadline first.')}
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}` }}>
        {tabs.map(x => (
          <button key={x.id} onClick={() => setTab(x.id)}
            style={{ padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === x.id ? pColor : 'transparent'}`, marginBottom: -1, fontSize: 12.5, fontWeight: tab === x.id ? 700 : 600, color: tab === x.id ? pColor : T.textMuted, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {t(x.vi, x.en)}
            <span style={{ background: tab === x.id ? T.primaryLight : T.bg, color: tab === x.id ? pColor : T.textMuted, borderRadius: 99, padding: '1px 7px', fontSize: 10.5, minWidth: 16, textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{groups[x.id].length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 44, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
          <Icon name={kind === 'assignment' ? 'clipboard' : 'fileText'} size={30} color={T.border} strokeWidth={1.6} />
          <div style={{ marginTop: 8 }}>{t('Không có mục nào trong nhóm này.', 'Nothing in this group.')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(({ course, item, st }, i) => {
            const hrsLeft = item.due ? (new Date(item.due) - CI_NOW) / 36e5 : null;
            const urgent = st === 'open' && hrsLeft != null && hrsLeft <= 48;
            return (
              <div key={course.id + item.id} style={{ background: T.card, borderRadius: 12, border: `1px solid ${urgent ? T.error + '45' : T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <CiTypeChip type={item.type} t={t} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: st === 'closed' ? T.textSecondary : T.textPrimary }}>{lang === 'en' ? item.en : item.vi}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <Badge color={course.color} style={{ fontSize: 10 }}>{lang === 'en' ? course.nameEn : course.name}</Badge>
                    <span style={{ fontSize: 11.5, color: urgent ? T.errorText : T.textMuted, fontWeight: urgent ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
                      {ciWindow(item, t)}{urgent && ` · ${t(`còn ${Math.max(1, Math.round(hrsLeft))} giờ`, `${Math.max(1, Math.round(hrsLeft))}h left`)}`}
                    </span>
                    {item.submitted && <span style={{ fontSize: 11, fontWeight: 700, color: '#0E9A82' }}>✓ {t('Đã nộp', 'Submitted')}{item.grade != null && ` · ${item.grade}/10`}</span>}
                  </div>
                </div>
                <CiStatusPill st={st} t={t} />
                {kind === 'exam' && st === 'open' && !item.submitted ? (
                  <button onClick={onStartExam} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: T.errorText, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Vào làm bài', 'Start exam')}</button>
                ) : (
                  <button onClick={() => onOpenCourse(course)} style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.card, color: T.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {t('Xem trong khoá học', 'View in course')}<Icon name="chevronRight" size={11} color={T.textSecondary} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 5) Giao diện giáo viên ────────────────────────────────────────────────────
const TeacherCoursesScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const classes = ['10A1', '10A3', '11A2', '12A1'];
  const [cls, setCls] = React.useState('11A2');
  const course = { ...CI_COURSES[0], name: `Toán học — ${cls}`, nameEn: `Mathematics — ${cls}` };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Khoá học của tôi', 'My Courses')}</div>
              <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Mỗi lớp × môn có đúng một khoá học — hệ thống tự tạo, bạn chỉ thêm nội dung.', 'One course per class × subject — auto-created; you just add content.')}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {classes.map(c => (
                <button key={c} onClick={() => setCls(c)}
                  style={{ padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${cls === c ? pColor : T.border}`, background: cls === c ? pColor : T.card, color: cls === c ? '#fff' : T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('Toán', 'Math')} {c}
                </button>
              ))}
            </div>
          </div>
          <CourseTimelinePage key={cls} course={course} lang={lang} t={t} pColor={pColor} mode="teacher" onBack={() => {}} onStartExam={() => {}} />
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { CI_COURSES, CI_ITEMS, ciStatus, ciCourseSummary, StudentCoursesV2, CourseTimelinePage, CrossSubjectList, TeacherCoursesScreen });
