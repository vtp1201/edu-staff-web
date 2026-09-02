// ── Class Hub — "Lớp học" là trung tâm của giáo viên (gộp Khoá học vào) ──────
// Vai trò: GVCN (chủ nhiệm) / GVBM (bộ môn · kèm môn) / kiêm cả hai. ADR 0143.

const CH_CLASSES = [
  { id: '10A1', roles: ['gvcn', 'gvbm'], subject: 'Toán', subjectEn: 'Math', students: 36, taught: 18, total: 24, pendingGrades: 9, attendance: 94, pendingViolations: 2, pendingLeave: 1, courseId: 1 },
  { id: '10A2', roles: ['gvbm'], subject: 'Toán', subjectEn: 'Math', students: 38, taught: 18, total: 24, pendingGrades: 6, courseId: 1 },
  { id: '11B2', roles: ['gvbm'], subject: 'Toán', subjectEn: 'Math', students: 32, taught: 14, total: 24, pendingGrades: 8, courseId: 1 },
  { id: '12C1', roles: ['gvbm'], subject: 'Toán', subjectEn: 'Math', students: 34, taught: 20, total: 24, pendingGrades: 0, courseId: 1 },
];

const CH_STUDENTS = [
  { name: 'Nguyễn Minh Khoa', oral: 9, q15: 8, t45: 8.5, avg: 8.5, gpa: 8.5, att: '96%', conduct: 'Tốt' },
  { name: 'Trần Thị Bích', oral: 8, q15: 9, t45: 8.0, avg: 8.3, gpa: 8.7, att: '98%', conduct: 'Tốt' },
  { name: 'Lê Văn Cường', oral: 7, q15: 6, t45: 6.5, avg: 6.5, gpa: 7.1, att: '88%', conduct: 'Khá' },
  { name: 'Phạm Thu Dung', oral: 9, q15: 9, t45: 9.5, avg: 9.2, gpa: 9.0, att: '99%', conduct: 'Tốt' },
  { name: 'Hoàng Đức Em', oral: 6, q15: 7, t45: null, avg: null, gpa: 6.8, att: '91%', conduct: 'Khá' },
  { name: 'Vũ Thị Giang', oral: 8, q15: 8, t45: 7.5, avg: 7.8, gpa: 8.2, att: '95%', conduct: 'Tốt' },
];

// Lịch tuần của LỚP (từ thời khoá biểu) + entry sổ đầu bài theo NGÀY
const CH_WEEK = [
  { day: 'Thứ 2', dayEn: 'Mon', date: '27/04', today: true, periods: [
    { p: 1, s: 'Chào cờ', sEn: 'Assembly', gv: 'GVCN', room: 'Sân trường' },
    { p: 2, s: 'Toán', sEn: 'Math', gv: 'Nguyễn Thị Hương', room: 'P.201', mine: true },
    { p: 3, s: 'Vật Lý', sEn: 'Physics', gv: 'Trần Văn Minh', room: 'P.201' },
    { p: 4, s: 'Ngữ Văn', sEn: 'Literature', gv: 'Phạm Quốc Bảo', room: 'P.201' },
  ], log: { content: 'Lớp học nghiêm túc. Vắng: Lê Văn Cường (có phép). Tiết 3 chuyển phòng thí nghiệm.', status: 'pending' } },
  { day: 'Thứ 3', dayEn: 'Tue', date: '28/04', periods: [
    { p: 1, s: 'Tiếng Anh', sEn: 'English', gv: 'Đỗ Thị Mai', room: 'P.201' },
    { p: 2, s: 'Toán', sEn: 'Math', gv: 'Nguyễn Thị Hương', room: 'P.201', mine: true },
    { p: 3, s: 'Hóa Học', sEn: 'Chemistry', gv: 'Lê Thị Hoa', room: 'Lab 2' },
  ], log: null },
  { day: 'Thứ 4', dayEn: 'Wed', date: '29/04', periods: [
    { p: 1, s: 'Lịch Sử', sEn: 'History', gv: 'Hoàng Văn Nam', room: 'P.201' },
    { p: 2, s: 'Ngữ Văn', sEn: 'Literature', gv: 'Phạm Quốc Bảo', room: 'P.201' },
    { p: 4, s: 'Toán', sEn: 'Math', gv: 'Nguyễn Thị Hương', room: 'P.201', mine: true },
  ], log: null },
  { day: 'Thứ 5', dayEn: 'Thu', date: '30/04', periods: [], log: null, holiday: 'Nghỉ lễ 30/04' },
  { day: 'Thứ 6', dayEn: 'Fri', date: '01/05', periods: [], log: null, holiday: 'Nghỉ lễ 01/05' },
];

// Gợi ý chuẩn bị — thuộc GV + MÔN, không gắn cứng vào tiết (chỉ hiển thị cạnh tiết dạy)
const CH_PREP = [
  { icon: 'scrollText', vi: 'Kế hoạch giảng dạy — giáo án, tài liệu chuẩn bị', en: 'Teaching plan — lesson plans & materials', src: 'Đến: Kế hoạch giảng dạy', srcEn: 'Go to: Teaching Plan', nav: 'teaching-plan' },
  { icon: 'userCheck', vi: 'Điểm danh lớp', en: 'Take attendance', src: 'Đến: Điểm danh', srcEn: 'Go to: Attendance', nav: 'attendance' },
  { icon: 'fileText', vi: 'Sổ đầu bài của lớp', en: 'Class log', src: 'Đến: Sổ đầu bài', srcEn: 'Go to: Class Log', nav: 'classlog' },
];

const CH_VIOLATIONS = [
  { student: 'Lê Văn Cường', vi: 'Đi học muộn lần 3 trong tháng', en: 'Late for the 3rd time this month', date: '25/04' },
  { student: 'Hoàng Đức Em', vi: 'Không làm bài tập Vật Lý', en: 'Physics homework not done', date: '24/04' },
];
const CH_LEAVE = [
  { student: 'Trần Thị Bích', vi: 'Nghỉ ốm 29/04 — có đơn của phụ huynh', en: 'Sick leave 29/04 — parent note attached' },
];

const ChRoleBadges = ({ cls, t, size }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {cls.roles.includes('gvcn') && <Badge color={T.purple} style={{ fontSize: size || 10.5 }}>{t('GVCN', 'Homeroom')}</Badge>}
    {cls.roles.includes('gvbm') && <Badge color={T.primary} style={{ fontSize: size || 10.5 }}>{t(`GVBM · ${cls.subject}`, `Subject · ${cls.subjectEn}`)}</Badge>}
  </div>
);

// ── Danh sách lớp ─────────────────────────────────────────────────────────────
const ChClassList = ({ lang, t, pColor, onOpen }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
    {CH_CLASSES.map(cls => {
      const isCN = cls.roles.includes('gvcn');
      const accent = isCN ? T.purple : pColor;
      return (
        <div key={cls.id} onClick={() => onOpen(cls)}
          style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', display: 'flex', flexDirection: 'column' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
          <div style={{ height: 6, background: accent }}></div>
          <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary }}>{t(`Lớp ${cls.id}`, `Class ${cls.id}`)}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{t(`${cls.students} học sinh`, `${cls.students} students`)}</div>
              </div>
              <ChRoleBadges cls={cls} t={t} />
            </div>
            {cls.roles.includes('gvbm') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{t(`Tiết ${cls.subject} đã dạy`, `${cls.subjectEn} periods taught`)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pColor, fontVariantNumeric: 'tabular-nums' }}>{cls.taught}/{cls.total}</span>
                </div>
                <ProgressBar value={Math.round(cls.taught / cls.total * 100)} color={pColor} height={5} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {cls.roles.includes('gvbm') && (
                <div style={{ flex: 1, minWidth: 110, background: cls.pendingGrades > 0 ? T.warningLight : T.bg, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: cls.pendingGrades > 0 ? T.warningText : T.textPrimary }}>{cls.pendingGrades}</div>
                  <div style={{ fontSize: 10.5, color: T.textMuted }}>{t('Bài chờ chấm', 'To grade')}</div>
                </div>
              )}
              {isCN && (
                <div style={{ flex: 1, minWidth: 110, background: T.bg, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{cls.attendance}%</div>
                  <div style={{ fontSize: 10.5, color: T.textMuted }}>{t('Chuyên cần', 'Attendance')}</div>
                </div>
              )}
              {isCN && (
                <div style={{ flex: 1, minWidth: 110, background: cls.pendingViolations > 0 ? T.errorLight : T.bg, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: cls.pendingViolations > 0 ? T.errorText : T.textPrimary }}>{cls.pendingViolations}</div>
                  <div style={{ fontSize: 10.5, color: T.textMuted }}>{t('Vi phạm chờ xử lý', 'Open violations')}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: accent }}>
                {t('Mở lớp', 'Open class')}<Icon name="chevronRight" size={12} color={accent} strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// ── Tab Học sinh ──────────────────────────────────────────────────────────────
const ChStudentsTab = ({ cls, lang, t, pColor }) => {
  const isCN = cls.roles.includes('gvcn');
  const isBM = cls.roles.includes('gvbm');
  const th = { padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: T.textMuted, textAlign: 'center', whiteSpace: 'nowrap' };
  const td = { padding: '11px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
          {isCN ? t('Toàn cảnh lớp (GVCN)', 'Class overview (homeroom)') : t(`Điểm môn ${cls.subject} của tôi`, `My ${cls.subjectEn} grades`)}
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted }}>
          {isCN ? t('Điểm tổng chỉ đọc · điểm Toán do bạn nhập', 'Overall grades read-only · Math grades editable by you') : t('Bạn nhập/sửa điểm môn mình dạy', 'You enter grades for your subject')}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: T.bg }}>
            <th style={{ ...th, textAlign: 'left', padding: '10px 20px' }}>{t('Học sinh', 'Student')}</th>
            {isBM && <><th style={th}>{t('Miệng', 'Oral')}</th><th style={th}>{t("15'", '15-min')}</th><th style={th}>{t('1 tiết', '45-min')}</th><th style={th}>{t(`TB ${cls.subject}`, `${cls.subjectEn} avg`)}</th></>}
            {isCN && <><th style={th}>{t('GPA lớp', 'GPA')}</th><th style={th}>{t('Chuyên cần', 'Attend.')}</th><th style={th}>{t('Hạnh kiểm', 'Conduct')}</th></>}
          </tr></thead>
          <tbody>
            {CH_STUDENTS.map((s, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={s.name.split(' ').slice(-1)[0][0] + s.name.split(' ')[0][0]} color={pColor} size={28} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                </td>
                {isBM && [s.oral, s.q15, s.t45].map((v, j) => (
                  <td key={j} style={{ ...td, color: v == null ? T.textMuted : v >= 8 ? '#0E9A82' : v < 5 ? T.errorText : T.textPrimary }}>
                    {v == null ? <span style={{ fontSize: 11, fontStyle: 'italic' }}>—</span> : v}
                  </td>
                ))}
                {isBM && <td style={{ ...td, fontWeight: 800, color: s.avg == null ? T.textMuted : s.avg >= 8 ? '#0E9A82' : T.textPrimary }}>{s.avg == null ? '—' : s.avg}</td>}
                {isCN && <td style={{ ...td, fontWeight: 800 }}>{s.gpa}</td>}
                {isCN && <td style={td}>{s.att}</td>}
                {isCN && <td style={td}><Badge color={s.conduct === 'Tốt' ? '#0E9A82' : T.warningText}>{lang === 'en' ? (s.conduct === 'Tốt' ? 'Good' : 'Fair') : s.conduct}</Badge></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isBM && (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: pColor, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Icon name="penLine" size={13} color="#fff" strokeWidth={2.2} />{t(`Nhập điểm ${cls.subject}`, `Enter ${cls.subjectEn} grades`)}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Tab Tiết học (lịch tuần + sổ đầu bài + panel chuẩn bị) ────────────────────
const ChSessionsTab = ({ cls, lang, t, pColor, onNavigate }) => {
  const isCN = cls.roles.includes('gvcn');
  const [logs, setLogs] = React.useState(() => CH_WEEK.map(d => d.log ? d.log.content : ''));
  const [editingDay, setEditingDay] = React.useState(null);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(260px, 1fr)', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CH_WEEK.map((d, di) => (
          <div key={d.day} style={{ background: T.card, borderRadius: 12, border: `1px solid ${d.today ? pColor + '55' : T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '11px 18px', borderBottom: d.holiday ? 'none' : `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, background: d.today ? T.primaryLight : T.bg }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: d.today ? pColor : T.textPrimary }}>{t(d.day, d.dayEn)} · {d.date}</span>
              {d.today && <Badge color={pColor}>{t('Hôm nay', 'Today')}</Badge>}
              {d.holiday && <span style={{ fontSize: 12, color: T.errorText, fontWeight: 700 }}>{t(d.holiday, 'Public holiday')}</span>}
            </div>
            {!d.holiday && d.periods.map((p, pi) => (
              <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', borderBottom: `1px solid ${T.border}`, background: p.mine ? pColor + '0C' : 'transparent' }}>
                <span style={{ width: 46, fontSize: 11.5, fontWeight: 800, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{t(`Tiết ${p.p}`, `P${p.p}`)}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: p.mine ? 800 : 600, color: p.mine ? pColor : T.textPrimary, minWidth: 0 }}>{t(p.s, p.sEn)}{p.mine && <span style={{ fontSize: 10.5, fontWeight: 700, marginLeft: 8, color: pColor }}>{t('— tiết của bạn', '— your period')}</span>}</span>
                <span style={{ fontSize: 11.5, color: T.textMuted, whiteSpace: 'nowrap' }}>{p.gv}</span>
                <span style={{ fontSize: 11.5, color: T.textMuted, width: 76, textAlign: 'right', whiteSpace: 'nowrap' }}>{p.room}</span>
              </div>
            ))}
            {!d.holiday && (
              <div style={{ padding: '10px 18px', background: '#FBFCFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: editingDay === di || logs[di] ? 7 : 0 }}>
                  <Icon name="fileText" size={12} color={T.textMuted} strokeWidth={2.2} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('Sổ đầu bài (theo ngày)', 'Class log (daily)')}</span>
                  {d.log && d.log.status === 'pending' && <Badge color={T.warningText} bg={T.warningLight}>{t('Chờ BGH duyệt', 'Awaiting approval')}</Badge>}
                  {d.log && d.log.status === 'approved' && <Badge color={'#0E9A82'} bg={T.successLight}>{t('Đã duyệt', 'Approved')}</Badge>}
                  <span style={{ flex: 1 }}></span>
                  {isCN ? (
                    editingDay === di ? (
                      <button onClick={() => setEditingDay(null)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: pColor, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Lưu', 'Save')}</button>
                    ) : (
                      <button onClick={() => setEditingDay(di)} style={{ background: 'none', border: 'none', color: pColor, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }}>
                        <Icon name="penLine" size={11} color={pColor} strokeWidth={2.2} />{logs[di] ? t('Sửa', 'Edit') : t('Viết sổ', 'Write entry')}
                      </button>
                    )
                  ) : (
                    <span style={{ fontSize: 10.5, color: T.textMuted, fontStyle: 'italic' }}>{t('Chỉ GVCN sửa được', 'Homeroom teacher only')}</span>
                  )}
                </div>
                {editingDay === di ? (
                  <textarea value={logs[di]} onChange={e => setLogs(ls => ls.map((x, i) => i === di ? e.target.value : x))} placeholder={t('Nhận xét chung về lớp trong ngày…', 'Daily remarks about the class…')}
                    style={{ width: '100%', minHeight: 56, padding: '8px 10px', borderRadius: 8, border: `1px solid ${pColor}55`, fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical', color: T.textPrimary, background: '#fff', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}></textarea>
                ) : logs[di] ? (
                  <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.55 }}>{logs[di]}</div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Panel chuẩn bị — gợi ý theo môn, KHÔNG gắn cứng vào tiết */}
      <aside style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary }}>{t('Chuẩn bị cho tiết Toán sắp tới', 'Prep for your next Math period')}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{t('Tiết 2 · Thứ 2 27/04 · P.201 — lối tắt nhanh', 'P2 · Mon 27/04 · R.201 — quick links')}</div>
        </div>
        {CH_PREP.map((r, i) => (
          <div key={i} onClick={() => onNavigate && onNavigate(r.nav)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px', borderBottom: i < CH_PREP.length - 1 ? `1px solid ${T.border}` : 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={r.icon} size={14} color={pColor} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, lineHeight: 1.4 }}>{lang === 'en' ? r.en : r.vi}</div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>{lang === 'en' ? r.srcEn : r.src}</div>
            </div>
            <Icon name="chevronRight" size={11} color={T.textMuted} strokeWidth={2.4} />
          </div>
        ))}
        <div style={{ padding: '10px 16px', background: T.bg, fontSize: 10.5, color: T.textMuted, lineHeight: 1.5, borderTop: `1px solid ${T.border}` }}>
          {t('Giáo án & tài liệu thuộc Kế hoạch giảng dạy của bạn theo môn — không gắn cứng vào tiết dạy.', 'Lesson plans & materials live in your Teaching Plan per subject — not attached to specific periods.')}
        </div>
      </aside>
    </div>
  );
};

// ── Tab Khoá học online ───────────────────────────────────────────────────────
const ChCourseTab = ({ cls, lang, t, pColor }) => {
  const isCN = cls.roles.includes('gvcn');
  const mySubject = cls.roles.includes('gvbm') ? cls.subject : null;
  const [subjId, setSubjId] = React.useState(mySubject ? CI_COURSES.find(c => c.name.startsWith('Toán')).id : CI_COURSES[0].id);
  const base = CI_COURSES.find(c => c.id === subjId);
  const editable = mySubject && base.name.startsWith('Toán');
  const course = { ...base, name: `${base.name} — ${cls.id}`, nameEn: `${base.nameEn} — ${cls.id}` };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {isCN ? (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: T.textSecondary }}>
            {t('Môn học:', 'Subject:')}
            <select value={subjId} onChange={e => setSubjId(Number(e.target.value))}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12.5, fontFamily: 'inherit', fontWeight: 700, color: T.textPrimary, background: T.card, outline: 'none', cursor: 'pointer' }}>
              {CI_COURSES.map(c => <option key={c.id} value={c.id}>{lang === 'en' ? c.nameEn : c.name}{c.name.startsWith('Toán') && mySubject ? t(' (môn của bạn)', ' (yours)') : ''}</option>)}
            </select>
          </label>
        ) : (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary }}>{t(`Khoá học ${cls.subject} — lớp ${cls.id}`, `${cls.subjectEn} course — class ${cls.id}`)}</span>
        )}
        {!editable && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#EEF1F6', fontSize: 11.5, fontWeight: 700, color: T.textSecondary }}>
            <Icon name="eye" size={12} color={T.textMuted} strokeWidth={2.1} />{t('Chỉ đọc — khoá học của GV bộ môn khác', 'Read-only — another teacher\u2019s course')}
          </span>
        )}
      </div>
      <CourseTimelinePage key={subjId + cls.id + (editable ? 'e' : 'r')} course={course} lang={lang} t={t} pColor={pColor}
        mode={editable ? 'teacher' : 'readonly'} onBack={() => {}} onStartExam={() => {}} hideHeaderBack={true} />
    </div>
  );
};

// ── Tab Chủ nhiệm (GVCN) ──────────────────────────────────────────────────────
const ChHomeroomTab = ({ cls, lang, t, pColor }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'flex-start' }}>
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary }}>{t('Điểm danh hôm nay', "Today's attendance")}</div>
        <Badge color={'#0E9A82'} bg={T.successLight}>{t('Đã điểm danh', 'Taken')}</Badge>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', gap: 10 }}>
        {[[t('Có mặt', 'Present'), 32, '#0E9A82'], [t('Có phép', 'Excused'), 1, T.warningText], [t('Vắng', 'Absent'), 1, T.errorText]].map(([lb, v, c], i) => (
          <div key={i} style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '9px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 10.5, color: T.textMuted }}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 18px 14px' }}>
        <button style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${pColor}`, background: T.card, color: pColor, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Mở sổ điểm danh', 'Open attendance sheet')}</button>
      </div>
    </div>
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary }}>{t('Vi phạm chờ xử lý', 'Open violations')}</div>
        <Badge color={T.errorText} bg={T.errorLight}>{CH_VIOLATIONS.length}</Badge>
      </div>
      {CH_VIOLATIONS.map((v, i) => (
        <div key={i} style={{ padding: '11px 18px', borderBottom: i < CH_VIOLATIONS.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.errorText, marginTop: 6, flexShrink: 0 }}></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{v.student}</div>
            <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2, lineHeight: 1.45 }}>{lang === 'en' ? v.en : v.vi}</div>
          </div>
          <span style={{ fontSize: 10.5, color: T.textMuted, whiteSpace: 'nowrap' }}>{v.date}</span>
        </div>
      ))}
      <div style={{ padding: '10px 18px 14px' }}>
        <button style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.card, color: T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Mở Vi phạm & Hạnh kiểm', 'Open Discipline')}</button>
      </div>
    </div>
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary }}>{t('Đơn xin nghỉ chờ duyệt', 'Leave requests pending')}</div>
        <Badge color={T.warningText} bg={T.warningLight}>{CH_LEAVE.length}</Badge>
      </div>
      {CH_LEAVE.map((v, i) => (
        <div key={i} style={{ padding: '12px 18px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{v.student}</div>
          <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2, lineHeight: 1.45 }}>{lang === 'en' ? v.en : v.vi}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', background: '#0E9A82', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Duyệt', 'Approve')}</button>
            <button style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${T.border}`, background: T.card, color: T.textSecondary, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Từ chối', 'Decline')}</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Màn hình chính ────────────────────────────────────────────────────────────
const ClassHubScreen = ({ lang, primaryColor, navParam, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [selected, setSelected] = React.useState(() => navParam && navParam.classId ? CH_CLASSES.find(c => c.id === navParam.classId) || null : null);
  const [tab, setTab] = React.useState(navParam && navParam.tab ? navParam.tab : 'students');

  React.useEffect(() => {
    if (navParam && navParam.classId) { setSelected(CH_CLASSES.find(c => c.id === navParam.classId) || null); setTab(navParam.tab || 'students'); }
  }, [navParam]);

  const tabs = selected ? [
    { id: 'students', vi: 'Học sinh', en: 'Students', icon: 'users' },
    { id: 'sessions', vi: 'Thời khoá biểu', en: 'Timetable', icon: 'calendar' },
    { id: 'course', vi: 'Khoá học online', en: 'Online course', icon: 'bookOpen' },
    ...(selected.roles.includes('gvcn') ? [{ id: 'homeroom', vi: 'Chủ nhiệm', en: 'Homeroom', icon: 'shield' }] : []),
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!selected ? (
            <React.Fragment>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Lớp học', 'My Classes')}</div>
                <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Học sinh, tiết dạy, sổ đầu bài và khoá học online — tất cả trong từng lớp.', 'Students, periods, class log and online courses — all inside each class.')}</div>
              </div>
              <ChClassList lang={lang} t={t} pColor={pColor} onOpen={(c) => { setSelected(c); setTab(c.roles.includes('gvbm') ? 'students' : 'homeroom'); }} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                  <Icon name="chevronLeft" size={12} color={T.textMuted} strokeWidth={2.3} />{t('Lớp học', 'Classes')}
                </button>
                <Icon name="chevronRight" size={11} color={T.textMuted} />
                <span style={{ color: T.textPrimary, fontWeight: 700 }}>{t(`Lớp ${selected.id}`, `Class ${selected.id}`)}</span>
              </div>
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 46, height: 46, borderRadius: 11, background: (selected.roles.includes('gvcn') ? T.purple : pColor) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="grid" size={20} color={selected.roles.includes('gvcn') ? T.purple : pColor} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary }}>{t(`Lớp ${selected.id}`, `Class ${selected.id}`)}</span>
                    <ChRoleBadges cls={selected} t={t} />
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{t(`${selected.students} học sinh · Năm học 2025–2026`, `${selected.students} students · AY 2025–2026`)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
                {tabs.map(x => (
                  <button key={x.id} onClick={() => setTab(x.id)} data-comment-anchor={x.id === 'sessions' ? '7cf9dff170-button-411-19' : undefined}
                    style={{ padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === x.id ? pColor : 'transparent'}`, marginBottom: -1, fontSize: 13, fontWeight: tab === x.id ? 700 : 600, color: tab === x.id ? pColor : T.textMuted, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <Icon name={x.icon} size={13} color={tab === x.id ? pColor : T.textMuted} strokeWidth={2.1} />{t(x.vi, x.en)}
                  </button>
                ))}
              </div>
              {tab === 'students' && <ChStudentsTab cls={selected} lang={lang} t={t} pColor={pColor} />}
              {tab === 'sessions' && <ChSessionsTab cls={selected} lang={lang} t={t} pColor={pColor} onNavigate={onNavigate} />}
              {tab === 'course' && <ChCourseTab cls={selected} lang={lang} t={t} pColor={pColor} />}
              {tab === 'homeroom' && selected.roles.includes('gvcn') && <ChHomeroomTab cls={selected} lang={lang} t={t} pColor={pColor} />}
            </React.Fragment>
          )}
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ClassHubScreen });
