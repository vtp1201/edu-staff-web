// ── Course Item Player — màn hình học tập (video / tài liệu / bài tập) ────────
// Bố cục tham khảo Udemy: nội dung bên trái + tabs, danh sách mục khoá học bên phải.

const CP_DESC = {
  lesson: ['Bài giảng dạng văn bản do giáo viên biên soạn; có thể kèm video khi giáo viên nhúng link. Đọc hết nội dung trước khi làm bài tập của tuần.', 'Text-based lesson authored by your teacher; a video appears when an embeddable link is attached. Read it fully before attempting this week\u2019s assignment.'],
  document: ['Tài liệu tham khảo đính kèm — mở bằng liên kết ngoài hoặc đọc bản xem trước bên dưới.', 'Attached reference material — open via the external link or read the preview below.'],
  assignment: ['Đọc kỹ yêu cầu rồi nộp bài bằng văn bản và/hoặc link bài làm (Drive/Docs…). Lưu ý: chỉ được nộp MỘT lần duy nhất.', 'Read the requirements, then submit as text and/or a link to your work (Drive/Docs…). Note: only ONE submission is allowed.'],
  exam: ['Bài kiểm tra có giới hạn thời gian. Bấm "Vào làm bài" để chuyển sang màn hình làm bài riêng.', 'Timed exam. Press "Start exam" to switch to the dedicated exam screen.'],
};

const CpVideo = ({ course, title, t }) => (
  <div style={{ background: T.mediaSurface, aspectRatio: '16/9', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${course.color}26 0%, transparent 60%)` }}></div>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
        <Icon name="play" size={26} color="#fff" strokeWidth={2.2} />
      </div>
      <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: 600, padding: '0 24px', textAlign: 'center' }}>{title}</div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
      <Icon name="play" size={13} color="#fff" strokeWidth={2.4} />
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
        <div style={{ width: '28%', height: '100%', background: course.color }}></div>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>08:57 / 32:00</div>
      <Icon name="settings" size={13} color="rgba(255,255,255,0.75)" strokeWidth={2} />
      <Icon name="maximize" size={13} color="rgba(255,255,255,0.75)" strokeWidth={2} />
    </div>
  </div>
);

// Bài giảng (LESSON) = nội dung văn bản do GV soạn; khung video CHỈ khi có link nhúng được (D4)
const CpLesson = ({ item, course, lang, t, title }) => (
  <div>
    {item.embed && <CpVideo course={course} title={title} t={t} />}
    <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!item.embed && <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t('Nội dung bài giảng', 'Lesson content')}</div>}
      <div style={{ fontSize: 13.5, color: T.textPrimary, lineHeight: 1.75 }}>
        {t('Trong bài này chúng ta hệ thống lại các quy tắc tính đạo hàm và cách áp dụng vào bài tập. Đọc kỹ phần ví dụ trước khi làm bài tập của tuần.',
           'In this lesson we review the differentiation rules and how to apply them. Read the worked examples before attempting this week\u2019s assignment.')}
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: T.textSecondary, lineHeight: 1.9 }}>
        <li>{t('Đạo hàm của tổng, hiệu, tích, thương', 'Derivative of sums, differences, products, quotients')}</li>
        <li>{t('Quy tắc chuỗi cho hàm hợp u(v(x))', 'Chain rule for composite functions u(v(x))')}</li>
        <li>{t('Bảng đạo hàm các hàm sơ cấp thường gặp', 'Table of common elementary derivatives')}</li>
      </ul>
      <div style={{ background: T.infoLight, borderRadius: 9, padding: '10px 14px', fontSize: 12.5, color: T.info, fontWeight: 600, lineHeight: 1.6 }}>
        {t('Mẹo: khi gặp hàm hợp, xác định “lớp ngoài — lớp trong” trước khi áp dụng quy tắc chuỗi.',
           'Tip: with composite functions, identify the “outer — inner” layers before applying the chain rule.')}
      </div>
    </div>
  </div>
);

const CpDocument = ({ item, lang, t }) => (
  <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ width: 46, height: 46, borderRadius: 11, background: T.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="link" size={20} color={T.tealText} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{lang === 'en' ? item.en : item.vi}</div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{t('Liên kết ngoài', 'External link')} · {item.link}</div>
      </div>
      <a href="#" onClick={e => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: T.teal, color: '#fff', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
        <Icon name="link" size={13} color="#fff" strokeWidth={2.2} />{t('Mở liên kết', 'Open link')}
      </a>
    </div>
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: T.bg, padding: '26px 24px', color: T.textSecondary, fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{t('Xem trước nội dung', 'Content preview')}</div>
      {t('Bản xem trước của tài liệu sẽ hiển thị ở đây khi liên kết hỗ trợ nhúng (Google Drive, YouTube, GeoGebra…). Nếu không, hãy mở bằng liên kết ngoài phía trên.',
         'A preview renders here when the link supports embedding (Google Drive, YouTube, GeoGebra…). Otherwise open it via the external link above.')}
    </div>
  </div>
);

const CpAssignment = ({ item, course, st, lang, t }) => (
  <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>
      {t('Yêu cầu: hoàn thành các bài trong phiếu bài tập đính kèm. Trình bày rõ các bước biến đổi, nộp dưới dạng PDF hoặc ảnh chụp bài làm.',
         'Requirements: complete all problems in the attached worksheet. Show your working clearly; submit as PDF or photos of your work.')}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', background: T.bg }}>
      <Icon name="paperclip" size={14} color={T.textMuted} strokeWidth={2.1} />
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: T.textPrimary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('Phiếu bài tập', 'Worksheet')}.pdf</span>
      <span style={{ fontSize: 11, color: T.textMuted }}>1.2 MB</span>
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.textSecondary, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Icon name="download" size={12} color={T.textSecondary} strokeWidth={2.2} />{t('Tải về', 'Download')}
      </button>
    </div>
    {item.submitted ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.successLight, borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: T.successText, fontWeight: 700, flexWrap: 'wrap' }}>
        <Icon name="check" size={14} color={T.successText} strokeWidth={2.6} />
        {t('Đã nộp lúc 21:14 · 23/04/2026.', 'Submitted at 21:14 · 23/04/2026.')}{item.grade != null ? ` · ${t('Điểm', 'Grade')}: ${item.grade}/10` : ''}
        {item.grade == null && <span style={{ fontWeight: 600, color: T.textMuted }}>{t('Điểm & nhận xét hiển thị khi giáo viên chấm.', 'Grade & feedback appear once marked.')}</span>}
      </div>
    ) : st === 'closed' ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.chipBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: T.textSecondary, fontWeight: 600 }}>
        <Icon name="lock" size={14} color={T.textMuted} strokeWidth={2.2} />
        {t('Đã đóng — bạn vẫn xem được đề bài để ôn tập, nhưng không thể nộp nữa.', 'Closed — you can still review the brief, but submissions are locked.')}
      </div>
    ) : (
      <CiSubmitBox course={course} t={t} />
    )}
  </div>
);

const CpExam = ({ item, st, lang, t, onStartExam }) => (
  <div style={{ padding: '40px 26px', textAlign: 'center' }}>
    <div style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 16, background: T.errorLight, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="fileText" size={28} color={T.errorText} strokeWidth={1.8} />
    </div>
    <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginTop: 12 }}>{lang === 'en' ? item.en : item.vi}</div>
    <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 6, lineHeight: 1.6 }}>{t(...CP_DESC.exam)}</div>
    {st === 'open' ? (
      <button onClick={onStartExam} style={{ marginTop: 16, padding: '10px 26px', borderRadius: 8, border: 'none', background: T.errorText, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Vào làm bài', 'Start exam')}</button>
    ) : st === 'closed' ? (
      <button style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.card, color: T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Xem lại đề & bài làm', 'Review exam & answers')}</button>
    ) : (
      <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, background: T.infoLight, borderRadius: 99, padding: '7px 16px', fontSize: 12, color: T.info, fontWeight: 700 }}>
        <Icon name="clock" size={13} color={T.info} strokeWidth={2.2} />{t(`Mở lúc ${ciFmt(item.start)}`, `Opens at ${ciFmt(item.start)}`)}
      </div>
    )}
  </div>
);

const CpLocked = ({ item, lang, t }) => (
  <div style={{ padding: '52px 26px', textAlign: 'center' }}>
    <div style={{ display: 'inline-flex', width: 60, height: 60, borderRadius: 16, background: T.infoLight, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="lock" size={26} color={T.info} strokeWidth={1.9} />
    </div>
    <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, marginTop: 12 }}>{lang === 'en' ? item.en : item.vi}</div>
    <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 6 }}>{t(`Nội dung sẽ mở lúc ${ciFmt(item.start)}. Quay lại sau nhé!`, `This content opens at ${ciFmt(item.start)}. Check back later!`)}</div>
  </div>
);

// ── Màn hình học tập ──────────────────────────────────────────────────────────
const CourseItemPlayer = ({ course, initialItemId, lang, t, pColor, onBack, onStartExam }) => {
  // Học sinh không thấy mục chưa mở, trừ Kiểm tra (D7)
  const weeks = (CI_ITEMS[course.id] || []).map(w => ({ ...w, items: w.items.filter(ciVisibleToStudent) })).filter(w => w.items.length > 0);
  const flat = weeks.flatMap(w => w.items.map(it => ({ ...it, _week: w })));
  const [activeId, setActiveId] = React.useState(initialItemId || (flat.find(it => ciStatus(it) === 'open') || flat[0] || {}).id);
  const [collapsed, setCollapsed] = React.useState({});

  const active = flat.find(it => it.id === activeId);
  const st = active ? ciStatus(active) : 'open';
  const tm = active && ciTypeMeta(active.type, t);
  const idx = flat.findIndex(it => it.id === activeId);
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  const prev = idx > 0 ? flat[idx - 1] : null;
  const title = active ? (lang === 'en' ? active.en : active.vi) : '';

  const body = !active ? null
    : st === 'upcoming' ? <CpLocked item={active} lang={lang} t={t} />
    : active.type === 'lesson' ? <CpLesson item={active} course={course} lang={lang} t={t} title={title} />
    : active.type === 'document' ? <CpDocument item={active} lang={lang} t={t} />
    : active.type === 'exam' ? <CpExam item={active} st={st} lang={lang} t={t} onStartExam={onStartExam} />
    : <CpAssignment item={active} course={course} st={st} lang={lang} t={t} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
          <Icon name="chevronLeft" size={12} color={T.textMuted} strokeWidth={2.3} />{lang === 'en' ? course.nameEn : course.name}
        </button>
        <Icon name="chevronRight" size={11} color={T.textMuted} />
        <span style={{ color: T.textPrimary, fontWeight: 700 }}>{title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(280px, 1fr)', gap: 18, alignItems: 'flex-start' }}>
        {/* Content pane */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {active && <CiTypeChip type={active.type} t={t} />}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{title}</div>
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{tm && tm.label} · {active && ciWindow(active, t)}</div>
            </div>
            {active && <CiStatusPill st={st} t={t} />}
          </div>
          {st === 'closed' && active && active.type !== 'assignment' && active.type !== 'exam' && (
            <div style={{ margin: '0 22px 10px', display: 'flex', alignItems: 'center', gap: 8, background: T.chipBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>
              <Icon name="lock" size={13} color={T.textMuted} strokeWidth={2.2} />
              {t('Đã đóng — chỉ xem để ôn tập.', 'Closed — view only, for revision.')}
            </div>
          )}
          {body}
          {/* Tổng quan — không còn tab Ghi chú / Hỏi đáp (D2: backend không có) */}
          <div style={{ borderTop: `1px solid ${T.border}`, padding: '16px 22px 20px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{t('Tổng quan', 'Overview')}</div>
            {active && <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>{t(...(CP_DESC[active.type] || CP_DESC.lesson))}</div>}
            {active && <div style={{ marginTop: 8, fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{t('Khung thời gian:', 'Window:')} {ciWindow(active, t)}</div>}
          </div>
        </div>

        {/* Sidebar: course content */}
        <aside style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary }}>{t('Nội dung khoá học', 'Course content')}</div>
            <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}/{flat.length}</span>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {weeks.map((w, wi) => {
              const isCol = !!collapsed[w.id];
              return (
                <div key={w.id} style={{ borderTop: wi > 0 ? `1px solid ${T.border}` : 'none' }}>
                  <button onClick={() => setCollapsed(s => ({ ...s, [w.id]: !s[w.id] }))}
                    style={{ width: '100%', padding: '10px 14px', background: T.bg, border: 'none', borderBottom: isCol ? 'none' : `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <Icon name={isCol ? 'chevronRight' : 'chevronDown'} size={11} color={T.textMuted} strokeWidth={2.4} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.textPrimary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? w.en : w.vi}</span>
                    <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{w.items.length}</span>
                  </button>
                  {!isCol && w.items.map((it, ii) => {
                    const ist = ciStatus(it);
                    const im = ciTypeMeta(it.type, t);
                    const isActive = it.id === activeId;
                    return (
                      <button key={it.id} onClick={() => setActiveId(it.id)}
                        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', background: isActive ? course.color + '14' : 'transparent', border: 'none', borderLeft: `3px solid ${isActive ? course.color : 'transparent'}`, borderBottom: ii < w.items.length - 1 ? `1px solid ${T.border}` : 'none', padding: '10px 14px 10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10, opacity: ist === 'upcoming' ? 0.65 : 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: im.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Icon name={ist === 'upcoming' ? 'lock' : im.icon} size={12} color={ist === 'upcoming' ? T.info : im.color} strokeWidth={2.2} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, color: isActive ? course.color : ist === 'closed' ? T.textSecondary : T.textPrimary, lineHeight: 1.4 }}>{lang === 'en' ? it.en : it.vi}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 10.5, color: T.textMuted, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: im.color }}>{im.label}</span>
                            {it.submitted && <span style={{ fontWeight: 700, color: T.successText }}>✓ {t('Đã nộp', 'Done')}</span>}
                            {ist === 'closed' && !it.submitted && <span>{t('Đã đóng', 'Closed')}</span>}
                            {ist === 'upcoming' && <span style={{ color: T.info, fontWeight: 700 }}>{t(`Mở ${ciFmt(it.start, false)}`, `Opens ${ciFmt(it.start, false)}`)}</span>}
                          </div>
                        </div>
                        {isActive && <Icon name="play" size={10} color={course.color} strokeWidth={2.4} />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', gap: 8 }}>
            <button disabled={!prev} onClick={() => prev && setActiveId(prev.id)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.card, color: prev ? T.textSecondary : T.textMuted, fontSize: 12.5, fontWeight: 700, cursor: prev ? 'pointer' : 'default', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: prev ? 1 : 0.5 }}>
              <Icon name="chevronLeft" size={12} color={T.textSecondary} strokeWidth={2.5} />{t('Trước', 'Prev')}
            </button>
            <button disabled={!next} onClick={() => next && setActiveId(next.id)}
              style={{ flex: 1.4, padding: '9px 10px', borderRadius: 8, border: 'none', background: next ? course.color : T.border, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: next ? 'pointer' : 'default', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {t('Mục tiếp theo', 'Next item')}<Icon name="chevronRight" size={12} color="#fff" strokeWidth={2.5} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

Object.assign(window, { CourseItemPlayer });
