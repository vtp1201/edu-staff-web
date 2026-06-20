// ── Timetable Builder (Thời khoá biểu) ────────────────────────────────────────
// Route:   /admin/timetable
// Role:    ADMIN / MANAGER (BGH)
// Epic/US: US-045 — Timetable with conflict detection
// Purpose: BGH creates and edits the school timetable, assigning a teacher,
//          class, subject, and room to each (day, period) slot. Teacher conflict
//          is detected (a teacher cannot be in two classes at the same period).

// ── Mock data ────────────────────────────────────────────────────────────────

const TT_YEARS = [
  { id: '2024-2025', name: '2024–2025', label: '2024–2025' },
  { id: '2025-2026', name: '2025–2026', label: '2025–2026 (hiện tại)', labelEn: '2025–2026 (current)' },
];

const TT_CLASSES = [
  { id: 'cls-10a1', name: '10A1', gradeLevel: 10 },
  { id: 'cls-10a2', name: '10A2', gradeLevel: 10 },
  { id: 'cls-11a1', name: '11A1', gradeLevel: 11 },
  { id: 'cls-11b2', name: '11B2', gradeLevel: 11 },
  { id: 'cls-12c1', name: '12C1', gradeLevel: 12 },
];

const TT_SUBJECTS = [
  { id: 'sub-math',  name: 'Toán',      nameEn: 'Math',       short: 'Toán',  color: '#5D87FF' },
  { id: 'sub-lit',   name: 'Ngữ Văn',   nameEn: 'Literature', short: 'Văn',   color: '#7B5EA7' },
  { id: 'sub-eng',   name: 'Tiếng Anh', nameEn: 'English',    short: 'Anh',   color: '#13DEB9' },
  { id: 'sub-phys',  name: 'Vật Lý',    nameEn: 'Physics',    short: 'Lý',    color: '#FFAE1F' },
  { id: 'sub-chem',  name: 'Hoá Học',   nameEn: 'Chemistry',  short: 'Hoá',   color: '#FA896B' },
  { id: 'sub-bio',   name: 'Sinh Học',  nameEn: 'Biology',    short: 'Sinh',  color: '#00B8A9' },
  { id: 'sub-hist',  name: 'Lịch Sử',   nameEn: 'History',    short: 'Sử',    color: '#539BFF' },
  { id: 'sub-geo',   name: 'Địa Lý',    nameEn: 'Geography',  short: 'Địa',   color: '#946000' },
  { id: 'sub-civic', name: 'GDCD',      nameEn: 'Civics',     short: 'GDCD',  color: '#8898A9' },
  { id: 'sub-pe',    name: 'Thể Dục',   nameEn: 'PE',         short: 'TD',    color: '#4570EA' },
];

// TeachingAssignment: which teacher teaches which subject in which classes.
// Drives the Teacher select filter in the slot editor (per ADR 0029).
const TT_TEACHERS = [
  { id: 'tch-1', name: 'Nguyễn Thị Hương', subjectId: 'sub-math',  classIds: ['cls-10a1','cls-10a2','cls-11b2'] },
  { id: 'tch-2', name: 'Trần Văn Minh',    subjectId: 'sub-phys',  classIds: ['cls-10a1','cls-11b2','cls-12c1'] },
  { id: 'tch-3', name: 'Lê Thị Hoa',       subjectId: 'sub-chem',  classIds: ['cls-10a1','cls-11a1','cls-12c1'] },
  { id: 'tch-4', name: 'Phạm Quốc Bảo',    subjectId: 'sub-lit',   classIds: ['cls-10a1','cls-10a2','cls-12c1'] },
  { id: 'tch-5', name: 'Đỗ Thị Mai',       subjectId: 'sub-eng',   classIds: ['cls-10a1','cls-11a1','cls-11b2'] },
  { id: 'tch-6', name: 'Vũ Văn Tài',       subjectId: 'sub-hist',  classIds: ['cls-10a1','cls-10a2','cls-11a1'] },
  { id: 'tch-7', name: 'Nguyễn Văn Long',  subjectId: 'sub-bio',   classIds: ['cls-10a1','cls-11a1','cls-12c1'] },
  { id: 'tch-8', name: 'Mai Thị Trang',    subjectId: 'sub-geo',   classIds: ['cls-10a1','cls-11a1','cls-11b2'] },
  { id: 'tch-9', name: 'Hoàng Văn Khôi',   subjectId: 'sub-civic', classIds: ['cls-10a1','cls-10a2','cls-11b2'] },
  { id: 'tch-10',name: 'Lê Văn Sơn',       subjectId: 'sub-pe',    classIds: ['cls-10a1','cls-10a2','cls-11b2','cls-12c1'] },
  // Second math teacher — so a conflict can be resolved by reassigning.
  { id: 'tch-11',name: 'Phan Thị Lan',     subjectId: 'sub-math',  classIds: ['cls-10a2','cls-11a1','cls-12c1'] },
];

// Days Mon..Sat (index 0..5)
const TT_DAYS = [
  { vi: 'Thứ 2', en: 'Mon' },
  { vi: 'Thứ 3', en: 'Tue' },
  { vi: 'Thứ 4', en: 'Wed' },
  { vi: 'Thứ 5', en: 'Thu' },
  { vi: 'Thứ 6', en: 'Fri' },
  { vi: 'Thứ 7', en: 'Sat' },
];

// Periods 1..10 with a lunch recess inserted between periods 5 and 6.
const TT_PERIODS = [
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

// Seed timetable. Key: `${classId}|${day}|${period}` → { subjectId, teacherId, room }
// We deliberately plant THREE teacher conflicts so the conflict UI is exercised:
//   • tch-1 (Hương) at Mon-1 in BOTH cls-10a1 and cls-10a2
//   • tch-2 (Minh)  at Tue-3 in BOTH cls-10a1 and cls-11b2
//   • tch-5 (Mai)   at Wed-4 in BOTH cls-10a1 and cls-11b2
const TT_SEED = (() => {
  const s = {};
  const set = (cls, day, p, subjectId, teacherId, room) => {
    s[`${cls}|${day}|${p}`] = { subjectId, teacherId, room };
  };

  // ── 10A1 — fairly complete week ──
  // Mon
  set('cls-10a1', 0, 1, 'sub-math',  'tch-1', 'P.201');
  set('cls-10a1', 0, 2, 'sub-math',  'tch-1', 'P.201');
  set('cls-10a1', 0, 3, 'sub-lit',   'tch-4', 'P.201');
  set('cls-10a1', 0, 4, 'sub-eng',   'tch-5', 'P.201');
  set('cls-10a1', 0, 5, 'sub-phys',  'tch-2', 'P.LAB1');
  set('cls-10a1', 0, 7, 'sub-pe',    'tch-10','Sân TD');
  set('cls-10a1', 0, 8, 'sub-pe',    'tch-10','Sân TD');
  // Tue
  set('cls-10a1', 1, 1, 'sub-eng',   'tch-5', 'P.201');
  set('cls-10a1', 1, 2, 'sub-lit',   'tch-4', 'P.201');
  set('cls-10a1', 1, 3, 'sub-phys',  'tch-2', 'P.LAB1');
  set('cls-10a1', 1, 4, 'sub-chem',  'tch-3', 'P.LAB2');
  set('cls-10a1', 1, 5, 'sub-math',  'tch-1', 'P.201');
  set('cls-10a1', 1, 7, 'sub-hist',  'tch-6', 'P.201');
  // Wed
  set('cls-10a1', 2, 1, 'sub-math',  'tch-1', 'P.201');
  set('cls-10a1', 2, 2, 'sub-bio',   'tch-7', 'P.LAB3');
  set('cls-10a1', 2, 3, 'sub-geo',   'tch-8', 'P.201');
  set('cls-10a1', 2, 4, 'sub-eng',   'tch-5', 'P.201');
  set('cls-10a1', 2, 5, 'sub-lit',   'tch-4', 'P.201');
  // Thu
  set('cls-10a1', 3, 1, 'sub-chem',  'tch-3', 'P.LAB2');
  set('cls-10a1', 3, 2, 'sub-chem',  'tch-3', 'P.LAB2');
  set('cls-10a1', 3, 3, 'sub-math',  'tch-1', 'P.201');
  set('cls-10a1', 3, 4, 'sub-civic', 'tch-9', 'P.201');
  set('cls-10a1', 3, 7, 'sub-hist',  'tch-6', 'P.201');
  set('cls-10a1', 3, 8, 'sub-geo',   'tch-8', 'P.201');
  // Fri
  set('cls-10a1', 4, 1, 'sub-lit',   'tch-4', 'P.201');
  set('cls-10a1', 4, 2, 'sub-eng',   'tch-5', 'P.201');
  set('cls-10a1', 4, 3, 'sub-bio',   'tch-7', 'P.LAB3');
  set('cls-10a1', 4, 4, 'sub-math',  'tch-1', 'P.201');
  set('cls-10a1', 4, 5, 'sub-phys',  'tch-2', 'P.LAB1');
  // Sat (half day)
  set('cls-10a1', 5, 1, 'sub-civic', 'tch-9', 'P.201');
  set('cls-10a1', 5, 2, 'sub-pe',    'tch-10','Sân TD');

  // ── 10A2 — partial; we want collisions only on a few slots ──
  set('cls-10a2', 0, 1, 'sub-math',  'tch-1', 'P.202'); // ← collides with cls-10a1 (tch-1 conflict)
  set('cls-10a2', 0, 2, 'sub-lit',   'tch-4', 'P.202');
  set('cls-10a2', 0, 3, 'sub-eng',   'tch-5', 'P.202');
  set('cls-10a2', 2, 1, 'sub-hist',  'tch-6', 'P.202');

  // ── 11B2 — partial; further collisions ──
  set('cls-11b2', 1, 3, 'sub-phys',  'tch-2', 'P.301'); // ← collides with cls-10a1 (tch-2 conflict)
  set('cls-11b2', 2, 4, 'sub-eng',   'tch-5', 'P.301'); // ← collides with cls-10a1 (tch-5 conflict)
  set('cls-11b2', 0, 4, 'sub-math',  'tch-1', 'P.301');

  // ── 12C1, 11A1 — sparse seed ──
  set('cls-12c1', 0, 1, 'sub-chem',  'tch-3', 'P.401');
  set('cls-12c1', 0, 2, 'sub-math',  'tch-11','P.401');
  set('cls-11a1', 2, 5, 'sub-bio',   'tch-7', 'P.LAB3');

  return s;
})();

const ttSlotKey = (classId, day, period) => `${classId}|${day}|${period}`;
const ttLookup = {
  cls: (id) => TT_CLASSES.find(c => c.id === id),
  subj: (id) => TT_SUBJECTS.find(s => s.id === id),
  tch: (id) => TT_TEACHERS.find(x => x.id === id),
};

// Detect ALL teacher conflicts across all classes. Returns:
//   { teacherKeyMap: Map(teacherId|day|period → [conflictingClassIds]),
//     conflictSlotKeys: Set(of slot keys that are conflicting) }
const computeConflicts = (timetable) => {
  const byTeacher = new Map(); // teacherId|day|period → [{ classId, slotKey }]
  for (const [slotKey, slot] of Object.entries(timetable)) {
    if (!slot?.teacherId) continue;
    const [classId, day, period] = slotKey.split('|');
    const tkey = `${slot.teacherId}|${day}|${period}`;
    if (!byTeacher.has(tkey)) byTeacher.set(tkey, []);
    byTeacher.get(tkey).push({ classId, slotKey });
  }
  const teacherKeyMap = new Map();
  const conflictSlotKeys = new Set();
  for (const [tkey, occurrences] of byTeacher) {
    if (occurrences.length < 2) continue;
    teacherKeyMap.set(tkey, occurrences.map(o => ({ classId: o.classId, slotKey: o.slotKey })));
    for (const o of occurrences) conflictSlotKeys.add(o.slotKey);
  }
  return { teacherKeyMap, conflictSlotKeys };
};

// ── Sub-components ───────────────────────────────────────────────────────────

const TTTopBar = ({ yearId, setYearId, classId, setClassId, pColor, t }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '14px 20px',
    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
  }}>
    <TTSelectField icon="calendar" label={t('Năm học', 'Academic Year')}
      value={yearId} onChange={setYearId}
      options={TT_YEARS.map(y => ({ value: y.id, label: y.name }))} />
    <TTSelectField icon="grid" label={t('Lớp', 'Class')}
      value={classId} onChange={setClassId}
      options={TT_CLASSES.map(c => ({ value: c.id, label: c.name, subtitle: `K${c.gradeLevel}` }))} />
    <div style={{ flex: 1 }} />
    <Button variant="ghost" icon="download" size="sm">{t('Xuất TKB (PDF)', 'Export PDF')}</Button>
    <Button variant="secondary" icon="upload" size="sm">{t('Import TKB', 'Import')}</Button>
  </div>
);

const TTSelectField = ({ icon, label, value, onChange, options }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div style={{ position: 'relative', minWidth: 200 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {label}
      </div>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`,
          background: '#fff', fontFamily: 'inherit', fontSize: 13, color: T.textPrimary,
          fontWeight: 700, cursor: 'pointer',
        }}>
        <Icon name={icon} size={13} color={T.textMuted} />
        <span style={{ flex: 1, textAlign: 'left' }}>{current?.label}</span>
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
                  fontSize: 12.5, fontWeight: o.value === value ? 700 : 500, fontFamily: 'inherit', textAlign: 'left',
                }}>
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.subtitle && <span style={{ fontSize: 10, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{o.subtitle}</span>}
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

// ── Cell ─────────────────────────────────────────────────────────────────────

const TTCell = ({ slot, isConflict, conflictTeacherName, conflictClasses, isHighlighted, onClick, pColor, t }) => {
  const [hover, setHover] = React.useState(false);
  const subj = slot ? ttLookup.subj(slot.subjectId) : null;
  const tch  = slot ? ttLookup.tch(slot.teacherId) : null;

  if (!slot) {
    return (
      <td style={ttStyles.cellTd}>
        <button onClick={onClick}
          style={{
            width: '100%', height: '100%', minHeight: 76,
            border: `1.5px dashed ${T.border}`, background: T.bg,
            borderRadius: 9, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.textMuted, fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.background = pColor + '08'; e.currentTarget.style.color = pColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg; e.currentTarget.style.color = T.textMuted; }}>
          <Icon name="plus" size={14} color="currentColor" strokeWidth={2} />
        </button>
      </td>
    );
  }

  const subjColor = subj?.color || pColor;
  const bg     = isConflict ? T.errorLight : (isHighlighted ? '#FFFBEA' : pColor + '15');
  const accent = isConflict ? T.error      : (isHighlighted ? T.warning  : subjColor);

  return (
    <td style={ttStyles.cellTd}
      data-slot-key={slot.__slotKey}
      title={isConflict
        ? t(`Xung đột: ${conflictTeacherName} đã có lịch dạy tiết này tại ${conflictClasses?.join(', ')}.`,
            `Conflict: ${conflictTeacherName} is already teaching this period in ${conflictClasses?.join(', ')}.`)
        : undefined}>
      <button onClick={onClick}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          width: '100%', minHeight: 76, padding: '8px 10px',
          background: bg, border: `1px solid ${accent}30`,
          borderRadius: 9, cursor: 'pointer', textAlign: 'left',
          fontFamily: 'inherit', position: 'relative',
          boxShadow: hover ? `inset 0 0 0 1.5px ${accent}40` : 'none',
          transition: 'box-shadow 0.12s',
          outline: isHighlighted ? `2px solid ${T.warning}` : 'none', outlineOffset: 2,
        }}>
        <div style={{
          fontSize: 12.5, fontWeight: 700,
          color: isConflict ? T.error : subjColor,
          marginBottom: 2, lineHeight: 1.2, paddingRight: 16,
        }}>
          {subj?.name}
        </div>
        <div style={{ fontSize: 10.5, color: T.textMuted, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16 }}>
          {tch?.name}
        </div>
        {slot.room && (
          <div style={{ fontSize: 10.5, color: T.textMuted, lineHeight: 1.3, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
            {slot.room}
          </div>
        )}
        {/* status icon top-right */}
        <div style={{ position: 'absolute', top: 6, right: 8, display: 'flex' }}>
          {isConflict ? (
            <Icon name="alertTriangle" size={12} color={T.error} strokeWidth={2.2} />
          ) : (hover && (
            <Icon name="edit" size={12} color={T.textMuted} strokeWidth={1.8} />
          ))}
        </div>
      </button>
    </td>
  );
};

// ── Grid ─────────────────────────────────────────────────────────────────────

const TimetableGrid = ({ classId, timetable, conflictSlotKeys, teacherKeyMap, highlightedSlotKey, onCellClick, pColor, t, lang }) => {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 4, padding: 12, minWidth: 920 }}>
          <thead>
            <tr>
              <th style={{ ...ttStyles.headerTh, width: 100 }}></th>
              {TT_DAYS.map((d, i) => (
                <th key={i} style={ttStyles.headerTh}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.textPrimary }}>{t(d.vi, d.en)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TT_PERIODS.map((p, ri) => {
              if (p.recess) {
                return (
                  <tr key={`recess-${ri}`}>
                    <td colSpan={7} style={{
                      padding: '7px 12px',
                      background: 'repeating-linear-gradient(45deg, #FAFBFD, #FAFBFD 8px, #F1F3F8 8px, #F1F3F8 16px)',
                      border: `1px dashed ${T.border}`, borderRadius: 6,
                      textAlign: 'center',
                    }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        ☕ {t(p.vi, p.en)}
                      </span>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={`p-${p.n}`}>
                  <td style={{ width: 100, padding: '6px 10px', verticalAlign: 'top', borderRight: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.15 }}>
                      {t(`Tiết ${p.n}`, `Period ${p.n}`)}
                    </div>
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {p.start} – {p.end}
                    </div>
                  </td>
                  {TT_DAYS.map((_, di) => {
                    const key = ttSlotKey(classId, di, p.n);
                    const slot = timetable[key];
                    const enrichedSlot = slot ? { ...slot, __slotKey: key } : null;
                    const isConflict = conflictSlotKeys.has(key);
                    let conflictTeacherName, conflictClasses;
                    if (isConflict && slot) {
                      const tkey = `${slot.teacherId}|${di}|${p.n}`;
                      const occ = teacherKeyMap.get(tkey) || [];
                      conflictTeacherName = ttLookup.tch(slot.teacherId)?.name;
                      conflictClasses = occ.map(o => ttLookup.cls(o.classId)?.name).filter(Boolean);
                    }
                    return (
                      <TTCell key={di} slot={enrichedSlot}
                        isConflict={isConflict}
                        conflictTeacherName={conflictTeacherName}
                        conflictClasses={conflictClasses}
                        isHighlighted={highlightedSlotKey === key}
                        onClick={() => onCellClick(di, p.n)}
                        pColor={pColor} t={t} />
                    );
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

// ── Slot Editor (modal dialog) ───────────────────────────────────────────────

const SlotEditorDialog = ({ classId, day, period, initial, timetable, pColor, t, onSave, onDelete, onClose }) => {
  const [subjectId, setSubjectId] = React.useState(initial?.subjectId || '');
  const [teacherId, setTeacherId] = React.useState(initial?.teacherId || '');
  const [room, setRoom] = React.useState(initial?.room || '');

  // Reset teacher when subject changes (teacher list depends on subject + class)
  React.useEffect(() => { if (initial?.subjectId !== subjectId) setTeacherId(initial?.teacherId === undefined ? '' : (subjectId === initial?.subjectId ? initial?.teacherId : '')); }, [subjectId]); // eslint-disable-line

  // Teacher list: filtered to those who teach (subjectId) in (classId) via TeachingAssignment
  const availableTeachers = React.useMemo(() => {
    if (!subjectId) return [];
    return TT_TEACHERS.filter(tch =>
      tch.subjectId === subjectId && tch.classIds.includes(classId));
  }, [subjectId, classId]);

  // For each candidate teacher, check whether they already have a slot at
  // (day, period) in a DIFFERENT class — that would be a conflict.
  const teacherConflictMap = React.useMemo(() => {
    const out = {};
    for (const tch of availableTeachers) {
      for (const [k, s] of Object.entries(timetable)) {
        const [cId, d, p] = k.split('|');
        if (s.teacherId !== tch.id) continue;
        if (Number(d) !== day || Number(p) !== period) continue;
        if (cId === classId && k === ttSlotKey(classId, day, period)) continue; // own slot
        out[tch.id] = cId;
        break;
      }
    }
    return out;
  }, [availableTeachers, timetable, classId, day, period]);

  const dayLabel  = t(TT_DAYS[day].vi, TT_DAYS[day].en);
  const periodLbl = t(`Tiết ${period}`, `Period ${period}`);

  const canSave = subjectId && teacherId;
  const handleSave = () => onSave({ subjectId, teacherId, room: room.trim() });

  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.45)', zIndex: 1000 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 460, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)',
        background: T.card, borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        zIndex: 1001, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'inherit',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t(`Lớp ${ttLookup.cls(classId)?.name}`, `Class ${ttLookup.cls(classId)?.name}`)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginTop: 3 }}>
                {t(`Chỉnh sửa tiết: ${dayLabel} — ${periodLbl}`, `Edit slot: ${dayLabel} — ${periodLbl}`)}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7,
              display: 'flex', color: T.textMuted,
            }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="x" size={15} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Subject */}
          <div>
            <label style={ttStyles.fieldLabel}>
              {t('Môn học', 'Subject')} <span style={{ color: T.error }}>*</span>
            </label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
              style={ttStyles.select}>
              <option value="">{t('— Chọn môn học —', '— Select subject —')}</option>
              {TT_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Teacher */}
          <div>
            <label style={ttStyles.fieldLabel}>
              {t('Giáo viên', 'Teacher')} <span style={{ color: T.error }}>*</span>
            </label>
            {!subjectId ? (
              <div style={ttStyles.helperBox(T.textMuted)}>
                <Icon name="info" size={12} color={T.textMuted} />
                {t('Chọn môn học trước để xem danh sách giáo viên.', 'Pick a subject first to see eligible teachers.')}
              </div>
            ) : availableTeachers.length === 0 ? (
              <div style={ttStyles.helperBox(T.warning)}>
                <Icon name="alertTriangle" size={12} color={T.warning} />
                {t('Không có giáo viên dạy môn này cho lớp đã chọn.', 'No teacher is assigned to teach this subject in this class.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {availableTeachers.map(tch => {
                  const conflictClass = teacherConflictMap[tch.id];
                  const isSelected = tch.id === teacherId;
                  return (
                    <button key={tch.id} type="button" onClick={() => setTeacherId(tch.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '9px 11px', borderRadius: 8,
                        border: `1.5px solid ${isSelected ? pColor : T.border}`,
                        background: isSelected ? pColor + '0E' : '#fff',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}>
                      <Avatar initials={tch.name.split(' ').slice(-1)[0][0]} color={pColor} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{tch.name}</div>
                        {conflictClass && (
                          <div style={{
                            marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 5,
                            fontSize: 10.5, color: '#946000', fontWeight: 600, lineHeight: 1.4,
                          }}>
                            <Icon name="alertTriangle" size={11} color={T.warning} strokeWidth={2.2} />
                            {t(`Thầy/Cô ${tch.name.split(' ').slice(-1)[0]} đã có lịch tiết này tại lớp ${ttLookup.cls(conflictClass)?.name}.`,
                              `${tch.name} already teaches this period in class ${ttLookup.cls(conflictClass)?.name}.`)}
                          </div>
                        )}
                      </div>
                      {isSelected && <Icon name="check" size={14} color={pColor} strokeWidth={2.4} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Room */}
          <div>
            <label style={ttStyles.fieldLabel}>{t('Phòng học', 'Room')}</label>
            <input value={room} onChange={e => setRoom(e.target.value)}
              placeholder={t('VD: P.201, P.LAB1, Sân TD…', 'e.g. P.201, P.LAB1, Gym…')}
              style={{ ...ttStyles.select, paddingRight: 14 }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
          {initial && (
            <button onClick={onDelete}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${T.error}`,
                background: 'transparent', color: T.error, fontSize: 12.5, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>
              <Icon name="x" size={12} color="currentColor" strokeWidth={2.2} />
              {t('Xoá tiết', 'Delete slot')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>{t('Huỷ', 'Cancel')}</Button>
          <Button onClick={handleSave} disabled={!canSave} icon="check">
            {t('Lưu', 'Save')}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

// ── Conflict summary panel ───────────────────────────────────────────────────

const ConflictSummary = ({ teacherKeyMap, currentClassId, onJump, t }) => {
  const [open, setOpen] = React.useState(true);
  const items = React.useMemo(() => {
    const out = [];
    for (const [tkey, occurrences] of teacherKeyMap.entries()) {
      const [teacherId, day, period] = tkey.split('|');
      const teacher = ttLookup.tch(teacherId);
      out.push({
        teacherId, teacherName: teacher?.name,
        day: Number(day), period: Number(period),
        classes: occurrences.map(o => ({ classId: o.classId, slotKey: o.slotKey, name: ttLookup.cls(o.classId)?.name })),
      });
    }
    out.sort((a, b) => a.day - b.day || a.period - b.period || a.teacherName.localeCompare(b.teacherName));
    return out;
  }, [teacherKeyMap]);

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${items.length ? T.error + '55' : T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 20px', border: 'none', background: items.length ? T.errorLight : T.bg,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: items.length ? T.error + '20' : T.success + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={items.length ? 'alertTriangle' : 'check'} size={15}
            color={items.length ? T.error : T.success} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: items.length ? T.error : T.success }}>
            {items.length
              ? t(`${items.length} xung đột phát hiện`, `${items.length} conflict${items.length > 1 ? 's' : ''} detected`)
              : t('Không có xung đột', 'No conflicts')}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
            {items.length
              ? t('Bấm vào một xung đột để xem ô liên quan.', 'Click a conflict to highlight the cell.')
              : t('TKB hợp lệ trên toàn trường.', 'Timetable is valid across the school.')}
          </div>
        </div>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} color={T.textMuted} />
      </button>
      {open && items.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {items.map((c, i) => {
            const target = c.classes.find(x => x.classId === currentClassId) || c.classes[0];
            const others = c.classes.filter(x => x !== target).map(x => x.name).join(t(' và ', ' and '));
            return (
              <button key={i} onClick={() => onJump(target.classId, target.slotKey)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 20px', borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.errorLight}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: T.error + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: 11, fontWeight: 800, color: T.error,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 800 }}>{c.teacherName}</span>{' '}
                    <span style={{ color: T.textMuted }}>—</span>{' '}
                    <span style={{ fontWeight: 700 }}>{t(TT_DAYS[c.day].vi, TT_DAYS[c.day].en)}</span>{' '}
                    <span style={{ color: T.textMuted }}>—</span>{' '}
                    <span style={{ fontWeight: 700 }}>{t(`Tiết ${c.period}`, `Period ${c.period}`)}</span>
                    {': '}
                    <span style={{ color: T.error, fontWeight: 700 }}>
                      {t(`trùng với lớp ${others}`, `conflicts with class ${others}`)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {c.classes.map(x => (
                      <Badge key={x.classId} color={x.classId === currentClassId ? T.error : T.textMuted}
                        bg={x.classId === currentClassId ? T.errorLight : T.bg}
                        style={{ fontSize: 10 }}>
                        {x.classId === currentClassId ? `📍 ${x.name}` : x.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Icon name="arrowRight" size={14} color={T.textMuted} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main screen ──────────────────────────────────────────────────────────────

const TimetableBuilderScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [yearId, setYearId] = React.useState('2025-2026');
  const [classId, setClassId] = React.useState('cls-10a1');
  const [timetable, setTimetable] = React.useState(() => ({ ...TT_SEED }));
  const [editingSlot, setEditingSlot] = React.useState(null); // { day, period }
  const [highlightedSlotKey, setHighlightedSlotKey] = React.useState(null);

  const { teacherKeyMap, conflictSlotKeys } = React.useMemo(
    () => computeConflicts(timetable), [timetable]);

  // Auto-clear highlight after a few seconds.
  React.useEffect(() => {
    if (!highlightedSlotKey) return;
    const id = setTimeout(() => setHighlightedSlotKey(null), 3000);
    return () => clearTimeout(id);
  }, [highlightedSlotKey]);

  const openEditor = (day, period) => setEditingSlot({ day, period });

  const handleSave = ({ subjectId, teacherId, room }) => {
    const key = ttSlotKey(classId, editingSlot.day, editingSlot.period);
    setTimetable(prev => ({ ...prev, [key]: { subjectId, teacherId, room } }));
    setEditingSlot(null);
  };
  const handleDelete = () => {
    const key = ttSlotKey(classId, editingSlot.day, editingSlot.period);
    setTimetable(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingSlot(null);
  };

  const jumpToConflict = (targetClassId, slotKey) => {
    if (targetClassId !== classId) setClassId(targetClassId);
    setHighlightedSlotKey(slotKey);
    // Smooth-scroll the cell into view shortly after class swap renders.
    setTimeout(() => {
      const cell = document.querySelector(`[data-slot-key="${slotKey.replace(/"/g, '\\"')}"]`);
      if (cell) {
        const grid = cell.closest('.tt-grid-container');
        if (grid) {
          const rect = cell.getBoundingClientRect();
          const gRect = grid.getBoundingClientRect();
          if (rect.top < gRect.top || rect.bottom > gRect.bottom) {
            grid.scrollTo({ top: cell.offsetTop - 80, behavior: 'smooth' });
          }
        }
      }
    }, 50);
  };

  // For the legend strip
  const subjectsUsed = React.useMemo(() => {
    const seen = new Set();
    for (const k of Object.keys(timetable)) {
      const [cId] = k.split('|');
      if (cId === classId) seen.add(timetable[k].subjectId);
    }
    return TT_SUBJECTS.filter(s => seen.has(s.id));
  }, [timetable, classId]);

  const currentClassName = ttLookup.cls(classId)?.name;
  const classConflictCount = React.useMemo(() => {
    let n = 0;
    for (const k of conflictSlotKeys) {
      if (k.startsWith(`${classId}|`)) n++;
    }
    return n;
  }, [conflictSlotKeys, classId]);

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: T.bg }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              US-045 · {t('Thời khoá biểu', 'Timetable')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
              {t(`Thời khoá biểu — Lớp ${currentClassName}`, `Timetable — Class ${currentClassName}`)}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {t('Bấm vào ô để chỉnh sửa. Xung đột giáo viên được phát hiện tự động trên toàn trường.',
                 'Click a cell to edit. Teacher conflicts are detected automatically across the school.')}
            </div>
          </div>
          {classConflictCount > 0 && (
            <Badge color={T.error} bg={T.errorLight} style={{ fontSize: 11, padding: '5px 11px' }}>
              <Icon name="alertTriangle" size={11} color={T.error} />
              {t(`${classConflictCount} xung đột ở lớp này`, `${classConflictCount} conflict${classConflictCount > 1 ? 's' : ''} in this class`)}
            </Badge>
          )}
        </div>

        {/* Top bar */}
        <TTTopBar yearId={yearId} setYearId={setYearId} classId={classId} setClassId={setClassId} pColor={pColor} t={t} />

        {/* Grid */}
        <div className="tt-grid-container">
          <TimetableGrid classId={classId} timetable={timetable}
            conflictSlotKeys={conflictSlotKeys} teacherKeyMap={teacherKeyMap}
            highlightedSlotKey={highlightedSlotKey}
            onCellClick={openEditor} pColor={pColor} t={t} lang={lang} />
        </div>

        {/* Subject legend */}
        {subjectsUsed.length > 0 && (
          <div style={{
            background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {t('Chú thích môn', 'Subjects')}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {subjectsUsed.map(s => (
                <div key={s.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 9px', borderRadius: 6,
                  background: s.color + '15', border: `1px solid ${s.color}30`,
                  fontSize: 11.5, fontWeight: 700, color: s.color,
                }}>
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflict summary */}
        <ConflictSummary teacherKeyMap={teacherKeyMap} currentClassId={classId}
          onJump={jumpToConflict} t={t} />

        {editingSlot && (
          <SlotEditorDialog
            classId={classId} day={editingSlot.day} period={editingSlot.period}
            initial={timetable[ttSlotKey(classId, editingSlot.day, editingSlot.period)] || null}
            timetable={timetable}
            pColor={pColor} t={t}
            onSave={handleSave} onDelete={handleDelete}
            onClose={() => setEditingSlot(null)} />
        )}
      </div>
    </main>
  );
};

// ── Local styles ─────────────────────────────────────────────────────────────

const ttStyles = {
  headerTh: {
    padding: '8px 12px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: T.textPrimary,
  },
  cellTd: {
    padding: 0, verticalAlign: 'stretch',
    minWidth: 120, width: `${100 / 6}%`,
  },
  fieldLabel: {
    display: 'block', fontSize: 11.5, fontWeight: 700,
    color: T.textSecondary, marginBottom: 6, letterSpacing: '0.02em',
  },
  select: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit',
    outline: 'none', color: T.textPrimary, background: '#fff', boxSizing: 'border-box',
  },
  helperBox: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 10px', borderRadius: 7, background: color + '10',
    border: `1px solid ${color}33`, color, fontSize: 11.5, fontWeight: 600,
    width: '100%', boxSizing: 'border-box',
  }),
};

Object.assign(window, { TimetableBuilderScreen });
