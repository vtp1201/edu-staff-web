// ── Timetable (read-only view) ───────────────────────────────────────────────
// Routes:  /student/schedule  (student's own class TKB)
//          /parent/schedule   (selected child's class TKB, read-only)
// Roles:   STUDENT (own), PARENT (per selected child)
// Epic/US: US-045 — Timetable, consumer (read-only) view.
//
// Purpose: Read-only weekly grid mirroring the principal's TimetableBuilder
//   visual vocabulary, BUT with NO slot editing affordances:
//     – empty cells render as a muted "—" placeholder, not a "+" button.
//     – filled cells have no pencil/edit hover, no click handler.
//     – no school-wide teacher-conflict detection (that lives only in
//       TimetableBuilderScreen, per ADR-0029).
//
// We deliberately re-declare the Days / Periods / Subjects constants under
// `TV_*` (locally namespaced) rather than reaching into timetable.jsx, so this
// screen stays decoupled from the admin builder and we don't have to touch
// the builder's file. The values are kept in sync visually (same Mon..Sat
// labels, same Tiết 1..10 + lunch recess, same subject colors).

// ── Mock data ────────────────────────────────────────────────────────────────

const TV_DAYS = [
  { vi: 'Thứ 2', en: 'Mon' },
  { vi: 'Thứ 3', en: 'Tue' },
  { vi: 'Thứ 4', en: 'Wed' },
  { vi: 'Thứ 5', en: 'Thu' },
  { vi: 'Thứ 6', en: 'Fri' },
  { vi: 'Thứ 7', en: 'Sat' },
];

// Periods 1..10 with the striped lunch recess between Tiết 5 and Tiết 6.
const TV_PERIODS = [
  { n: 1,  start: '07:00', end: '07:45' },
  { n: 2,  start: '07:50', end: '08:35' },
  { n: 3,  start: '08:45', end: '09:30' },
  { n: 4,  start: '09:35', end: '10:20' },
  { n: 5,  start: '10:25', end: '11:10' },
  { recess: true, vi: 'Giải lao trưa', en: 'Lunch break' },
  { n: 6,  start: '13:30', end: '14:15' },
  { n: 7,  start: '14:20', end: '15:05' },
  { n: 8,  start: '15:15', end: '16:00' },
  { n: 9,  start: '16:05', end: '16:50' },
  { n: 10, start: '16:55', end: '17:40' },
];

// Subject palette — same hexes as TimetableBuilder so legends/colours align.
const TV_SUBJECTS = {
  math:  { vi: 'Toán',      en: 'Math',       color: '#5D87FF' },
  lit:   { vi: 'Ngữ văn',   en: 'Literature', color: '#7B5EA7' },
  eng:   { vi: 'Tiếng Anh', en: 'English',    color: '#13DEB9' },
  phys:  { vi: 'Vật lý',    en: 'Physics',    color: '#FFAE1F' },
  chem:  { vi: 'Hoá học',   en: 'Chemistry',  color: '#FA896B' },
  bio:   { vi: 'Sinh học',  en: 'Biology',    color: '#00B8A9' },
  hist:  { vi: 'Lịch sử',   en: 'History',    color: '#539BFF' },
  geo:   { vi: 'Địa lý',    en: 'Geography',  color: '#946000' },
  civic: { vi: 'GDCD',      en: 'Civics',     color: '#8898A9' },
  pe:    { vi: 'Thể dục',   en: 'PE',         color: '#4570EA' },
};

// Compact slot helper: [subjectKey, teacherName, room]
const _ = (k, tch, room) => ({ s: k, t: tch, r: room });

// Seed: full week for class 11A2 (student + parent's elder child),
// sparser week for 8B1 (parent's younger child), empty for any other class.
const TV_TIMETABLE = {
  // ── 11A2 — published full week ─────────────────────────────────────────
  '11A2': {
    // [dayIdx][periodNum] → slot
    0: { // Mon
      1: _('math',  'Cô Nguyễn Thị Hương', 'P.302'),
      2: _('math',  'Cô Nguyễn Thị Hương', 'P.302'),
      3: _('lit',   'Thầy Phạm Quốc Bảo',  'P.302'),
      4: _('eng',   'Cô Đỗ Thị Mai',       'P.302'),
      5: _('phys',  'Thầy Trần Văn Minh',  'P.LAB1'),
      7: _('pe',    'Thầy Lê Văn Sơn',     'Sân TD'),
      8: _('pe',    'Thầy Lê Văn Sơn',     'Sân TD'),
    },
    1: { // Tue
      1: _('eng',   'Cô Đỗ Thị Mai',       'P.302'),
      2: _('lit',   'Thầy Phạm Quốc Bảo',  'P.302'),
      3: _('phys',  'Thầy Trần Văn Minh',  'P.LAB1'),
      4: _('chem',  'Cô Lê Thị Hoa',       'P.LAB2'),
      5: _('math',  'Cô Nguyễn Thị Hương', 'P.302'),
      7: _('hist',  'Thầy Vũ Văn Tài',     'P.302'),
      8: _('civic', 'Thầy Hoàng Văn Khôi', 'P.302'),
    },
    2: { // Wed
      1: _('math',  'Cô Nguyễn Thị Hương', 'P.302'),
      2: _('bio',   'Thầy Nguyễn Văn Long','P.LAB3'),
      3: _('geo',   'Cô Mai Thị Trang',    'P.302'),
      4: _('eng',   'Cô Đỗ Thị Mai',       'P.302'),
      5: _('lit',   'Thầy Phạm Quốc Bảo',  'P.302'),
      7: _('chem',  'Cô Lê Thị Hoa',       'P.LAB2'),
    },
    3: { // Thu
      1: _('chem',  'Cô Lê Thị Hoa',       'P.LAB2'),
      2: _('chem',  'Cô Lê Thị Hoa',       'P.LAB2'),
      3: _('math',  'Cô Nguyễn Thị Hương', 'P.302'),
      4: _('civic', 'Thầy Hoàng Văn Khôi', 'P.302'),
      5: _('eng',   'Cô Đỗ Thị Mai',       'P.302'),
      7: _('hist',  'Thầy Vũ Văn Tài',     'P.302'),
      8: _('geo',   'Cô Mai Thị Trang',    'P.302'),
    },
    4: { // Fri
      1: _('lit',   'Thầy Phạm Quốc Bảo',  'P.302'),
      2: _('eng',   'Cô Đỗ Thị Mai',       'P.302'),
      3: _('bio',   'Thầy Nguyễn Văn Long','P.LAB3'),
      4: _('math',  'Cô Nguyễn Thị Hương', 'P.302'),
      5: _('phys',  'Thầy Trần Văn Minh',  'P.LAB1'),
      7: _('lit',   'Thầy Phạm Quốc Bảo',  'P.302'),
    },
    5: { // Sat — half-day
      1: _('civic', 'Thầy Hoàng Văn Khôi', 'P.302'),
      2: _('pe',    'Thầy Lê Văn Sơn',     'Sân TD'),
    },
  },

  // ── 8B1 — sparser seed (a few subjects, mostly mornings) ─────────────
  '8B1': {
    0: { // Mon
      1: _('math',  'Cô Phan Thị Lan',     'P.205'),
      2: _('lit',   'Cô Trần Bích Vân',    'P.205'),
      3: _('eng',   'Thầy Bùi Quang Huy',  'P.205'),
      4: _('hist',  'Cô Đào Thuỳ Linh',    'P.205'),
    },
    1: { // Tue
      1: _('eng',   'Thầy Bùi Quang Huy',  'P.205'),
      2: _('math',  'Cô Phan Thị Lan',     'P.205'),
      3: _('phys',  'Thầy Hồ Minh Tuấn',   'P.LAB1'),
      4: _('bio',   'Cô Nguyễn Hồng Vân',  'P.LAB3'),
    },
    2: { // Wed
      1: _('lit',   'Cô Trần Bích Vân',    'P.205'),
      2: _('geo',   'Cô Lý Thanh Hằng',    'P.205'),
      3: _('math',  'Cô Phan Thị Lan',     'P.205'),
    },
    3: { // Thu
      1: _('chem',  'Cô Mai Thanh Hà',     'P.LAB2'),
      2: _('eng',   'Thầy Bùi Quang Huy',  'P.205'),
      3: _('lit',   'Cô Trần Bích Vân',    'P.205'),
      7: _('pe',    'Thầy Vũ Đức Cường',   'Sân TD'),
    },
    4: { // Fri
      1: _('math',  'Cô Phan Thị Lan',     'P.205'),
      2: _('civic', 'Cô Trịnh Thu Phương', 'P.205'),
      3: _('eng',   'Thầy Bùi Quang Huy',  'P.205'),
    },
    5: {}, // no Sat sessions
  },
};

// Years / semesters shown in the read-only selectors. These are display only —
// switching them does NOT load a different timetable in this prototype.
const TV_YEARS = [
  { id: '2024-2025', vi: '2024–2025',                 en: '2024–2025' },
  { id: '2025-2026', vi: '2025–2026 (hiện tại)',      en: '2025–2026 (current)' },
];
const TV_SEMESTERS = [
  { id: 'hk1', vi: 'Học kỳ I',  en: 'Semester I' },
  { id: 'hk2', vi: 'Học kỳ II', en: 'Semester II' },
];

// Parent's children (same as ParentScreen seed in student.jsx so the two
// surfaces stay in sync if the parent navigates between them).
const TV_CHILDREN = [
  { name: 'Nguyễn Minh Khoa', className: '11A2', avatar: 'NK', color: '#5D87FF' },
  { name: 'Nguyễn Thu Hà',    className: '8B1',  avatar: 'NH', color: '#13DEB9' },
];

// ── Sub-components ───────────────────────────────────────────────────────────

const TVSelectField = ({ icon, label, value, onChange, options, lang }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.id === value);
  const labelOf = (o) => lang === 'en' ? o.en : o.vi;
  return (
    <div style={{ position: 'relative', minWidth: 184 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
      }}>{label}</div>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`,
          background: '#fff', fontFamily: 'inherit', fontSize: 13,
          color: T.textPrimary, fontWeight: 700, cursor: 'pointer',
        }}>
        {icon && <Icon name={icon} size={13} color={T.textMuted} />}
        <span style={{ flex: 1, textAlign: 'left' }}>{current ? labelOf(current) : '—'}</span>
        <Icon name="chevronDown" size={12} color={T.textMuted} />
      </button>
      {open && (
        <React.Fragment>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 51,
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 9,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4,
          }}>
            {options.map(o => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: o.id === value ? T.primary + '12' : 'transparent',
                  color: o.id === value ? T.primary : T.textPrimary,
                  fontSize: 12.5, fontWeight: o.id === value ? 700 : 500,
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
                {labelOf(o)}
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

// One read-only cell. Either a filled slot OR a muted "—" placeholder.
// NO plus-icon, NO pencil/edit-hover, NO click handler.
const TVCell = ({ slot, lang }) => {
  if (!slot) {
    return (
      <td style={tvStyles.cellTd}>
        <div style={{
          minHeight: 76, borderRadius: 9, background: T.bg,
          border: `1px dashed ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.textMuted, fontSize: 16, fontWeight: 500, lineHeight: 1,
          userSelect: 'none',
        }}>—</div>
      </td>
    );
  }
  const subj = TV_SUBJECTS[slot.s];
  const subjColor = subj?.color || T.primary;
  const subjName = subj ? (lang === 'en' ? subj.en : subj.vi) : slot.s;
  return (
    <td style={tvStyles.cellTd}>
      <div style={{
        minHeight: 76, padding: '8px 10px', borderRadius: 9,
        background: subjColor + '15',
        border: `1px solid ${subjColor}30`,
        textAlign: 'left', fontFamily: 'inherit',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: subjColor,
          marginBottom: 2, lineHeight: 1.2,
        }}>{subjName}</div>
        <div style={{
          fontSize: 10, color: T.textMuted, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{slot.t}</div>
        {slot.r && (
          <div style={{
            fontSize: 10, color: T.textMuted, lineHeight: 1.3,
            marginTop: 1, fontVariantNumeric: 'tabular-nums',
          }}>{slot.r}</div>
        )}
      </div>
    </td>
  );
};

// Read-only weekly grid. Thứ 2..Thứ 7 columns × Tiết 1..10 rows + recess.
// Today's column gets a subtle primary-tinted header highlight.
// `dates` is an optional array of 6 Date objects (Mon..Sat) — when provided
// (parent's "thời khoá biểu tuần này" mode) the day headers show real dates
// and "Hôm nay" is detected by date match instead of weekday-of-the-week.
const ReadOnlyTimetableGrid = ({ week, lang, pColor, t, dates }) => {
  // When `dates` is provided, today = the date that equals today's calendar day.
  // When it's not (student template view), today = today's weekday (Mon..Sat).
  const _today = new Date(); _today.setHours(0, 0, 0, 0);
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const todayDow = _today.getDay();
  const todayIdxFallback = todayDow >= 1 && todayDow <= 6 ? todayDow - 1 : -1;
  const isTodayCol = (i) => dates ? sameDay(dates[i], _today) : i === todayIdxFallback;
  const pad2 = (n) => String(n).padStart(2, '0');

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'separate', borderSpacing: 4,
          padding: 12, minWidth: 920,
        }}>
          <thead>
            <tr>
              <th style={{ ...tvStyles.headerTh, width: 100, position: 'sticky', left: 0, background: T.card, zIndex: 2 }}></th>
              {TV_DAYS.map((d, i) => {
                const isToday = isTodayCol(i);
                const dateStr = dates ? `${pad2(dates[i].getDate())}/${pad2(dates[i].getMonth() + 1)}` : null;
                return (
                  <th key={i} style={{
                    ...tvStyles.headerTh,
                    background: isToday ? pColor + '12' : 'transparent',
                    borderRadius: isToday ? 8 : 0,
                  }}>
                    <div style={{
                      fontSize: 12, fontWeight: 800,
                      color: isToday ? pColor : T.textPrimary,
                    }}>{t(d.vi, d.en)}</div>
                    {dateStr && (
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: isToday ? pColor : T.textMuted,
                        marginTop: 2, fontVariantNumeric: 'tabular-nums',
                      }}>{dateStr}</div>
                    )}
                    {isToday && (
                      <div style={{
                        fontSize: 9.5, fontWeight: 700, marginTop: 2,
                        color: pColor, textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>{t('Hôm nay', 'Today')}</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TV_PERIODS.map((p, ri) => {
              if (p.recess) {
                return (
                  <tr key={`recess-${ri}`}>
                    <td colSpan={7} style={{
                      padding: '7px 12px',
                      background: 'repeating-linear-gradient(45deg, #FAFBFD, #FAFBFD 8px, #F1F3F8 8px, #F1F3F8 16px)',
                      border: `1px dashed ${T.border}`, borderRadius: 6, textAlign: 'center',
                    }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: T.textMuted,
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                      }}>☕ {t(p.vi, p.en)}</span>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={`p-${p.n}`}>
                  <td style={{
                    width: 100, padding: '6px 10px', verticalAlign: 'top',
                    borderRight: `1px solid ${T.border}`,
                    position: 'sticky', left: 0, background: T.card, zIndex: 1,
                  }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.15,
                    }}>{t(`Tiết ${p.n}`, `Period ${p.n}`)}</div>
                    <div style={{
                      fontSize: 10, color: T.textMuted, marginTop: 2,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{p.start} – {p.end}</div>
                  </td>
                  {TV_DAYS.map((_, di) => {
                    const slot = week?.[di]?.[p.n] || null;
                    return <TVCell key={di} slot={slot} lang={lang} />;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Empty state shown when no TKB has been published for this class.
const EmptyTKB = ({ t }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    padding: '64px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16, margin: '0 auto 18px',
      background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="calendar" size={40} color={T.textMuted} strokeWidth={1.6} />
    </div>
    <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
      {t('Chưa có thời khoá biểu cho lớp này.',
         'No timetable has been published for this class yet.')}
    </div>
    <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
      {t('Nhà trường chưa xếp lịch học cho học kỳ này.',
         'The school has not scheduled classes for this semester.')}
    </div>
  </div>
);

// ── Main screen ──────────────────────────────────────────────────────────────

const TimetableViewScreen = ({ role, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [yearId, setYearId] = React.useState('2025-2026');
  const [semesterId, setSemesterId] = React.useState('hk1');
  const [childIdx, setChildIdx] = React.useState(0);
  // PARENT only: which week we're looking at, relative to current ISO Mon.
  // 0 = this week, -1 = last week, +1 = next week. Student keeps the abstract
  // template view (no date axis).
  const [weekOffset, setWeekOffset] = React.useState(0);

  const isParent = role === 'parent';

  // ── Week date math (parent only) ──────────────────────────────────────
  // Build [Mon..Sat] for the requested week.
  const weekDates = React.useMemo(() => {
    if (!isParent) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dow = today.getDay();             // Sun=0..Sat=6
    const offsetToMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today);
    mon.setDate(today.getDate() + offsetToMon + weekOffset * 7);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
    });
  }, [isParent, weekOffset]);

  const fmtRangeVi = (a, b) => {
    const p = (n) => String(n).padStart(2, '0');
    const sameYear = a.getFullYear() === b.getFullYear();
    if (sameYear) return `${p(a.getDate())}/${p(a.getMonth() + 1)} – ${p(b.getDate())}/${p(b.getMonth() + 1)}/${a.getFullYear()}`;
    return `${p(a.getDate())}/${p(a.getMonth() + 1)}/${a.getFullYear()} – ${p(b.getDate())}/${p(b.getMonth() + 1)}/${b.getFullYear()}`;
  };

  // Which class TKB to render:
  //   – STUDENT → own class (Nguyễn Minh Khoa is in 11A2 per MOCK.student)
  //   – PARENT  → selected child's class
  const displayClassName = isParent
    ? TV_CHILDREN[childIdx].className
    : (typeof MOCK !== 'undefined' && MOCK.student?.class) || '11A2';

  const week = TV_TIMETABLE[displayClassName];
  const hasTKB = !!week && Object.values(week).some(day => day && Object.keys(day).length > 0);

  // Subjects actually used in this week — drives the legend.
  const subjectsUsed = React.useMemo(() => {
    if (!hasTKB) return [];
    const seen = new Set();
    for (const dayIdx of Object.keys(week)) {
      const day = week[dayIdx];
      for (const p of Object.keys(day)) seen.add(day[p].s);
    }
    return Object.entries(TV_SUBJECTS)
      .filter(([k]) => seen.has(k))
      .map(([k, v]) => ({ key: k, ...v }));
  }, [week, hasTKB, displayClassName]);

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: T.bg }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              US-045 · {t('Thời khoá biểu', 'Timetable')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
              {isParent
                ? (weekOffset === 0
                    ? t('Thời khoá biểu tuần này', "This week's timetable")
                    : (weekOffset < 0
                        ? t(`Thời khoá biểu (${-weekOffset} tuần trước)`,
                            `Timetable (${-weekOffset} week${-weekOffset > 1 ? 's' : ''} ago)`)
                        : t(`Thời khoá biểu (${weekOffset} tuần sau)`,
                            `Timetable (in ${weekOffset} week${weekOffset > 1 ? 's' : ''})`)))
                : t('Thời khoá biểu', 'Weekly Timetable')
              }
              <span style={{ color: T.textMuted, fontWeight: 600, marginLeft: 8 }}>
                · {t(`Lớp ${displayClassName}`, `Class ${displayClassName}`)}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {isParent
                ? t(`Tuần ${fmtRangeVi(weekDates[0], weekDates[5])} · chế độ chỉ xem.`,
                    `Week ${fmtRangeVi(weekDates[0], weekDates[5])} · read-only view.`)
                : t('Chế độ chỉ xem. Lịch học do nhà trường xếp; học sinh không thể chỉnh sửa.',
                    'Read-only view. The school publishes the timetable; students cannot edit it.')}
            </div>
          </div>
          <Button variant="ghost" icon="download" size="sm">{t('Xuất PDF', 'Export PDF')}</Button>
        </div>

        {/* PARENT: week navigator. STUDENT: year/semester selectors. */}
        {isParent ? (
          <div style={{
            background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <button onClick={() => setWeekOffset(o => o - 1)}
              style={tvNavBtn(pColor)} title={t('Tuần trước', 'Previous week')}>
              <Icon name="chevronLeft" size={14} color={T.textSecondary} strokeWidth={2.2} />
            </button>
            <button onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}
              style={{
                ...tvNavBtn(pColor), width: 'auto', padding: '0 14px',
                background: weekOffset === 0 ? pColor : T.card,
                color: weekOffset === 0 ? '#fff' : T.textPrimary,
                fontSize: 12, fontWeight: 800,
                borderColor: weekOffset === 0 ? pColor : T.border,
                cursor: weekOffset === 0 ? 'default' : 'pointer',
                opacity: weekOffset === 0 ? 1 : 0.95,
              }}>
              {t('Tuần này', 'This week')}
            </button>
            <button onClick={() => setWeekOffset(o => o + 1)}
              style={tvNavBtn(pColor)} title={t('Tuần sau', 'Next week')}>
              <Icon name="chevronRight" size={14} color={T.textSecondary} strokeWidth={2.2} />
            </button>
            <div style={{
              fontSize: 13, fontWeight: 800, color: T.textPrimary,
              marginLeft: 6, fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtRangeVi(weekDates[0], weekDates[5])}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 99,
              background: T.bg, color: T.textMuted,
              fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Icon name="lock" size={11} color={T.textMuted} strokeWidth={2} />
              {t('Chỉ xem', 'Read-only')}
            </div>
          </div>
        ) : (
          <div style={{
            background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <TVSelectField icon="calendar" label={t('Năm học', 'Academic Year')}
              value={yearId} onChange={setYearId} options={TV_YEARS} lang={lang} />
            <TVSelectField icon="bookOpen" label={t('Học kỳ', 'Semester')}
              value={semesterId} onChange={setSemesterId} options={TV_SEMESTERS} lang={lang} />
            <div style={{ flex: 1 }} />
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 99,
              background: T.bg, color: T.textMuted,
              fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Icon name="lock" size={11} color={T.textMuted} strokeWidth={2} />
              {t('Chỉ xem', 'Read-only')}
            </div>
          </div>
        )}

        {/* PARENT only — child selector */}
        {isParent && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {TV_CHILDREN.map((c, i) => {
              const active = i === childIdx;
              return (
                <button key={i} onClick={() => setChildIdx(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 18px', borderRadius: 10, minWidth: 240,
                  border: `2px solid ${active ? c.color : T.border}`,
                  background: active ? c.color + '10' : T.card,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Avatar initials={c.avatar} color={c.color} size={34} />
                  <div style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>
                      {t(`Lớp ${c.className}`, `Class ${c.className}`)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Grid or empty state */}
        {hasTKB ? (
          <ReadOnlyTimetableGrid week={week} lang={lang} pColor={pColor} t={t}
            dates={isParent ? weekDates : null} />
        ) : (
          <EmptyTKB t={t} />
        )}

        {/* Legend — only subjects actually used in this week */}
        {hasTKB && subjectsUsed.length > 0 && (
          <div style={{
            background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>{t('Chú thích môn', 'Subjects')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {subjectsUsed.map(s => (
                <div key={s.key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 9px', borderRadius: 6,
                  background: s.color + '15', border: `1px solid ${s.color}30`,
                  fontSize: 11.5, fontWeight: 700, color: s.color,
                }}>{lang === 'en' ? s.en : s.vi}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

// ── Local styles ─────────────────────────────────────────────────────────────

const tvStyles = {
  headerTh: {
    padding: '8px 12px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: T.textPrimary,
  },
  cellTd: {
    padding: 0, verticalAlign: 'stretch',
    minWidth: 120, width: `${100 / 6}%`,
  },
};

// Compact icon-button used in the parent's week navigator (← / Tuần này / →).
const tvNavBtn = (pColor) => ({
  width: 30, height: 30, borderRadius: 8,
  border: `1px solid ${T.border}`, background: T.card,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
});

Object.assign(window, { TimetableViewScreen });
