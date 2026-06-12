// ── Student Roster (Danh sách lớp học) ────────────────────────────────────────
// Route:   /admin/roster   |   /admin/classes/:classId/students
// Role:    ADMIN / MANAGER (BGH)
// Epic/US: US-043 — Student roster / class enrollment
// Purpose: ADMIN manages which students are enrolled in which class for a given
//          academic year. Enrollment is the prerequisite for grade entry and
//          attendance. Per US-043 a student may belong to AT MOST ONE class in
//          a given academic year; moving them from class X → Y is an explicit
//          transfer (warning surfaced in the "Thêm học sinh" panel).

// ── Mock data ────────────────────────────────────────────────────────────────

const ROSTER_CLASSES = [
  { id: 'cls-10a1', name: '10A1', gradeLevel: 10, homeroomTeacher: 'Nguyễn Thị Hương', homeroomTeacherEn: 'Nguyen Thi Huong', year: '2025–2026' },
  { id: 'cls-10a2', name: '10A2', gradeLevel: 10, homeroomTeacher: 'Trần Văn Minh', homeroomTeacherEn: 'Tran Van Minh', year: '2025–2026' },
  { id: 'cls-11b2', name: '11B2', gradeLevel: 11, homeroomTeacher: 'Lê Thị Hoa', homeroomTeacherEn: 'Le Thi Hoa', year: '2025–2026' },
  { id: 'cls-10b3', name: '10B3', gradeLevel: 10, homeroomTeacher: null, year: '2025–2026', empty: true }, // brand-new class for empty-state demo
];

// 32 students currently enrolled in 10A1. Two transferred out to demonstrate
// the "Đã chuyển lớp" muted/strikethrough state.
const ROSTER_BY_CLASS = {
  'cls-10a1': [
    { id: 'HS25001', name: 'Nguyễn Minh Anh', dob: '15/03/2010', gender: 'F', status: 'active' },
    { id: 'HS25002', name: 'Trần Văn Bình',   dob: '02/07/2010', gender: 'M', status: 'active' },
    { id: 'HS25003', name: 'Lê Thị Cẩm',      dob: '24/11/2010', gender: 'F', status: 'active' },
    { id: 'HS25004', name: 'Phạm Đức Dũng',   dob: '08/01/2010', gender: 'M', status: 'active' },
    { id: 'HS25005', name: 'Hoàng Thị Linh',  dob: '17/05/2010', gender: 'F', status: 'active' },
    { id: 'HS25006', name: 'Vũ Quốc Bảo',     dob: '29/09/2010', gender: 'M', status: 'active' },
    { id: 'HS25007', name: 'Đỗ Thu Hằng',     dob: '11/04/2010', gender: 'F', status: 'active' },
    { id: 'HS25008', name: 'Bùi Minh Tuấn',   dob: '06/12/2010', gender: 'M', status: 'transferred' },
    { id: 'HS25009', name: 'Nguyễn Hải Yến',  dob: '21/08/2010', gender: 'F', status: 'active' },
    { id: 'HS25010', name: 'Phan Trọng Nhân', dob: '03/02/2010', gender: 'M', status: 'active' },
    { id: 'HS25011', name: 'Lý Khánh Vy',     dob: '18/06/2010', gender: 'F', status: 'active' },
    { id: 'HS25012', name: 'Trương Quang Huy',dob: '27/10/2010', gender: 'M', status: 'active' },
    { id: 'HS25013', name: 'Đặng Phương Mai', dob: '14/03/2010', gender: 'F', status: 'active' },
    { id: 'HS25014', name: 'Cao Đức Anh',     dob: '09/07/2010', gender: 'M', status: 'active' },
    { id: 'HS25015', name: 'Nguyễn Ngọc Diệp',dob: '22/01/2010', gender: 'F', status: 'active' },
    { id: 'HS25016', name: 'Hồ Văn Khang',    dob: '04/09/2010', gender: 'M', status: 'active' },
    { id: 'HS25017', name: 'Trần Thuỳ Dương', dob: '30/05/2010', gender: 'F', status: 'active' },
    { id: 'HS25018', name: 'Phạm Hoàng Long', dob: '12/11/2010', gender: 'M', status: 'active' },
    { id: 'HS25019', name: 'Lê Bảo Trân',     dob: '07/04/2010', gender: 'F', status: 'transferred' },
    { id: 'HS25020', name: 'Vũ Đình Phúc',    dob: '25/02/2010', gender: 'M', status: 'active' },
    { id: 'HS25021', name: 'Nguyễn Thị Vy',   dob: '16/08/2010', gender: 'F', status: 'active' },
    { id: 'HS25022', name: 'Đỗ Quốc Đạt',     dob: '01/12/2010', gender: 'M', status: 'active' },
    { id: 'HS25023', name: 'Bùi Hà My',       dob: '19/06/2010', gender: 'F', status: 'active' },
    { id: 'HS25024', name: 'Hoàng Minh Đức',  dob: '13/10/2010', gender: 'M', status: 'active' },
    { id: 'HS25025', name: 'Nguyễn Khánh Linh',dob: '28/03/2010', gender: 'F', status: 'active' },
    { id: 'HS25026', name: 'Trần Văn Sơn',    dob: '05/07/2010', gender: 'M', status: 'active' },
    { id: 'HS25027', name: 'Phạm Thu Trang',  dob: '20/09/2010', gender: 'F', status: 'active' },
    { id: 'HS25028', name: 'Lê Thành Đạt',    dob: '10/01/2010', gender: 'M', status: 'active' },
    { id: 'HS25029', name: 'Vũ Thị Kim Ngân', dob: '26/05/2010', gender: 'F', status: 'active' },
    { id: 'HS25030', name: 'Nguyễn Anh Tú',   dob: '08/11/2010', gender: 'M', status: 'active' },
    { id: 'HS25031', name: 'Hoàng Diệu Linh', dob: '23/02/2010', gender: 'F', status: 'active' },
    { id: 'HS25032', name: 'Đỗ Mạnh Cường',   dob: '15/08/2010', gender: 'M', status: 'active' },
  ],
  'cls-10a2': [
    { id: 'HS25101', name: 'Nguyễn Anh Khoa', dob: '12/04/2010', gender: 'M', status: 'active' },
    { id: 'HS25102', name: 'Trần Mỹ Linh',    dob: '18/09/2010', gender: 'F', status: 'active' },
    { id: 'HS25103', name: 'Phạm Quốc Việt',  dob: '03/11/2010', gender: 'M', status: 'active' },
  ],
  'cls-11b2': [
    { id: 'HS24201', name: 'Lê Thị Cẩm',      dob: '24/11/2009', gender: 'F', status: 'active' },
  ],
  'cls-10b3': [],
};

// Search pool — students NOT in the currently selected class. Some are already
// enrolled in another class this year (currentClassName !== null) so the
// "transfer warning" state can be demonstrated; others are unassigned.
const ROSTER_SEARCH_POOL = [
  { id: 'HS25201', name: 'Nguyễn Hồng Quân',  currentClassId: null,        currentClassName: null },
  { id: 'HS25202', name: 'Trần Thuỵ Vân',     currentClassId: 'cls-10a2',  currentClassName: '10A2' },
  { id: 'HS25203', name: 'Phạm Quang Vinh',   currentClassId: null,        currentClassName: null },
  { id: 'HS25204', name: 'Lê Thị Hồng Hạnh',  currentClassId: null,        currentClassName: null },
  { id: 'HS25205', name: 'Vũ Đức Trí',        currentClassId: 'cls-10a2',  currentClassName: '10A2' },
  { id: 'HS25206', name: 'Hoàng Thanh Tùng',  currentClassId: null,        currentClassName: null },
  { id: 'HS25207', name: 'Đỗ Phương Anh',     currentClassId: null,        currentClassName: null },
  { id: 'HS25208', name: 'Bùi Trọng Khang',   currentClassId: 'cls-11b2',  currentClassName: '11B2' },
  { id: 'HS25209', name: 'Nguyễn Lê Bảo Châu',currentClassId: null,        currentClassName: null },
  { id: 'HS25210', name: 'Phan Hồng Phúc',    currentClassId: null,        currentClassName: null },
  { id: 'HS25211', name: 'Lý Thu Hương',      currentClassId: null,        currentClassName: null },
  { id: 'HS25212', name: 'Trương Văn Toàn',   currentClassId: 'cls-10a2',  currentClassName: '10A2' },
];

const PAGE_SIZE = 10;

// ── Sub-components ───────────────────────────────────────────────────────────

const RosterBreadcrumb = ({ classList, currentClassId, onChange, t }) => {
  const [open, setOpen] = React.useState(false);
  const current = classList.find(c => c.id === currentClassId);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.textMuted, flexWrap: 'wrap' }}>
      <span>{t('Lớp học', 'Classes')}</span>
      <Icon name="chevronRight" size={13} color={T.textMuted} />
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: 'none', padding: '2px 6px',
            borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700, color: T.textPrimary,
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {t(`Lớp ${current.name}`, `Class ${current.name}`)}
          <Icon name="chevronDown" size={12} color={T.textMuted} />
        </button>
        {open && (
          <React.Fragment>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 51,
              background: '#fff', border: `1px solid ${T.border}`, borderRadius: 9,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, minWidth: 200,
            }}>
              {classList.map(c => (
                <button key={c.id} onClick={() => { onChange(c.id); setOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: c.id === currentClassId ? T.primary + '12' : 'transparent',
                    color: c.id === currentClassId ? T.primary : T.textPrimary,
                    fontSize: 12.5, fontWeight: c.id === currentClassId ? 700 : 500,
                    fontFamily: 'inherit', textAlign: 'left',
                  }}>
                  <Icon name="grid" size={12} color={c.id === currentClassId ? T.primary : T.textMuted} />
                  <span style={{ flex: 1 }}>{t(`Lớp ${c.name}`, `Class ${c.name}`)}</span>
                  <span style={{ fontSize: 10, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>K{c.gradeLevel}</span>
                </button>
              ))}
            </div>
          </React.Fragment>
        )}
      </div>
      <Icon name="chevronRight" size={13} color={T.textMuted} />
      <span style={{ color: T.textSecondary, fontWeight: 600 }}>{t('Danh sách học sinh', 'Student roster')}</span>
    </div>
  );
};

const ClassInfoCard = ({ cls, activeCount, transferredCount, pColor, t, lang }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 14, background: pColor + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon name="grid" size={26} color={pColor} strokeWidth={1.8} />
    </div>
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.01em' }}>
          {t(`Lớp ${cls.name}`, `Class ${cls.name}`)}
        </div>
        <Badge color={pColor}>{t(`Khối ${cls.gradeLevel}`, `Grade ${cls.gradeLevel}`)}</Badge>
        <Badge color={T.textMuted} bg={T.bg}>
          <Icon name="calendar" size={10} color={T.textMuted} /> {cls.year}
        </Badge>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 8, fontSize: 12.5, color: T.textSecondary, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="userCheck" size={13} color={T.textMuted} />
          <span style={{ color: T.textMuted }}>{t('GVCN', 'Homeroom')}:</span>
          {cls.homeroomTeacher ? (
            <span style={{ fontWeight: 700, color: T.textPrimary }}>
              {lang === 'en' ? (cls.homeroomTeacherEn || cls.homeroomTeacher) : cls.homeroomTeacher}
            </span>
          ) : (
            <span style={{ fontStyle: 'italic', color: T.warning, fontWeight: 600 }}>
              {t('Chưa phân công', 'Unassigned')}
            </span>
          )}
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
      <div style={{
        padding: '10px 16px', background: T.success + '10', border: `1px solid ${T.success}30`,
        borderRadius: 10, minWidth: 100,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.success, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t('Đang học', 'Active')}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.success, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
          {activeCount}
        </div>
      </div>
      {transferredCount > 0 && (
        <div style={{
          padding: '10px 16px', background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 10, minWidth: 100,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('Đã chuyển', 'Transferred')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textSecondary, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
            {transferredCount}
          </div>
        </div>
      )}
    </div>
  </div>
);

// ── Left column: enrolled student table ──────────────────────────────────────

const RosterTable = ({ roster, pColor, t, onRemoveMany, onRemoveOne }) => {
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(new Set());
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(s =>
      s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [roster, search]);

  React.useEffect(() => { setPage(1); setSelected(new Set()); }, [roster]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageRowIds = pageRows.map(s => s.id);
  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every(id => selected.has(id));
  const somePageSelected = pageRowIds.some(id => selected.has(id));

  const togglePageAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageRowIds.forEach(id => next.delete(id));
      else pageRowIds.forEach(id => next.add(id));
      return next;
    });
  };
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      {/* Top bar: search + bulk action */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '8px 12px',
        }}>
          <Icon name="search" size={14} color={T.textMuted} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('Tìm theo tên hoặc mã học sinh...', 'Search by name or student ID...')}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit',
            }} />
          {search && (
            <button onClick={() => setSearch('')} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 2,
              display: 'flex', color: T.textMuted,
            }}>
              <Icon name="x" size={12} color="currentColor" />
            </button>
          )}
        </div>
        <Button variant="secondary" size="sm" icon="download">{t('Xuất CSV', 'Export CSV')}</Button>
      </div>

      {/* Bulk action bar — only when ≥1 selected */}
      {selected.size > 0 && (
        <div style={{
          padding: '10px 20px', background: pColor + '0E', borderBottom: `1px solid ${pColor}30`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: pColor }}>
            {t(`Đã chọn ${selected.size} học sinh`, `${selected.size} student${selected.size > 1 ? 's' : ''} selected`)}
          </div>
          <button onClick={() => setSelected(new Set())}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: T.textSecondary, fontFamily: 'inherit',
              padding: '4px 8px', borderRadius: 6,
            }}>
            {t('Bỏ chọn', 'Clear')}
          </button>
          <button onClick={() => { onRemoveMany(Array.from(selected)); setSelected(new Set()); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, border: 'none',
              background: T.error, color: '#fff', fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
            <Icon name="x" size={11} color="#fff" strokeWidth={2.4} />
            {t('Xoá khỏi lớp', 'Remove from class')}
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.bg }}>
              <th style={rosterStyles.thCheckbox}>
                <input type="checkbox" checked={allPageSelected}
                  ref={el => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                  onChange={togglePageAll}
                  style={rosterStyles.checkbox(pColor)} />
              </th>
              <th style={{ ...rosterStyles.th, width: 36 }}>#</th>
              <th style={rosterStyles.th}>{t('Họ và tên', 'Full name')}</th>
              <th style={rosterStyles.th}>{t('Mã học sinh', 'Student ID')}</th>
              <th style={rosterStyles.th}>{t('Ngày sinh', 'Date of birth')}</th>
              <th style={{ ...rosterStyles.th, textAlign: 'center' }}>{t('Giới tính', 'Gender')}</th>
              <th style={rosterStyles.th}>{t('Trạng thái', 'Status')}</th>
              <th style={{ ...rosterStyles.th, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 20px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                  {t('Không tìm thấy học sinh nào khớp.', 'No matching students.')}
                </td>
              </tr>
            ) : pageRows.map((s, i) => {
              const isSelected = selected.has(s.id);
              const isTransferred = s.status === 'transferred';
              const absoluteIndex = (safePage - 1) * PAGE_SIZE + i + 1;
              return (
                <tr key={s.id} style={{
                  borderTop: `1px solid ${T.border}`,
                  background: isSelected ? pColor + '0A' : 'transparent',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                  <td style={rosterStyles.tdCheckbox}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(s.id)}
                      style={rosterStyles.checkbox(pColor)} />
                  </td>
                  <td style={{ ...rosterStyles.td, color: T.textMuted, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    {absoluteIndex}
                  </td>
                  <td style={rosterStyles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar initials={s.name.split(' ').slice(-1)[0][0]} color={pColor} size={28} />
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: isTransferred ? T.textMuted : T.textPrimary,
                        textDecoration: isTransferred ? 'line-through' : 'none',
                      }}>
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...rosterStyles.td, fontSize: 12.5, color: T.textSecondary, fontVariantNumeric: 'tabular-nums', fontFamily: '"SF Mono", Menlo, Consolas, monospace' }}>
                    {s.id}
                  </td>
                  <td style={{ ...rosterStyles.td, fontSize: 12.5, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {s.dob}
                  </td>
                  <td style={{ ...rosterStyles.td, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: '50%',
                      background: s.gender === 'F' ? '#FFE6F1' : '#E6F0FF',
                      color: s.gender === 'F' ? '#D6336C' : '#3B7BD9',
                      fontSize: 10.5, fontWeight: 800,
                    }}>{s.gender}</span>
                  </td>
                  <td style={rosterStyles.td}>
                    {isTransferred ? (
                      <Badge color={T.textMuted} bg={T.bg}>{t('Đã chuyển lớp', 'Transferred')}</Badge>
                    ) : (
                      <Badge color={T.success}>{t('Đang học', 'Active')}</Badge>
                    )}
                  </td>
                  <td style={{ ...rosterStyles.td, textAlign: 'right' }}>
                    <button onClick={() => onRemoveOne(s.id)}
                      title={t('Xoá khỏi lớp', 'Remove from class')}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: `1px solid ${T.border}`, background: 'transparent',
                        color: T.textMuted, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.error; e.currentTarget.style.color = T.error; e.currentTarget.style.background = T.errorLight; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'transparent'; }}>
                      <Icon name="x" size={12} color="currentColor" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <RosterPagination
        page={safePage} totalPages={totalPages} setPage={setPage}
        totalCount={filtered.length} pageRowCount={pageRows.length} pColor={pColor} t={t} />
    </div>
  );
};

const RosterPagination = ({ page, totalPages, setPage, totalCount, pageRowCount, pColor, t }) => {
  if (totalCount === 0) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + pageRowCount;
  // Build visible page list: always show first, last, current ±1, ellipsis between.
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {t(`Hiển thị ${from}–${to} / ${totalCount} học sinh`, `Showing ${from}–${to} of ${totalCount} students`)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          style={rosterStyles.pageBtn(false, page === 1, pColor)}>
          <Icon name="chevronLeft" size={12} color="currentColor" />
        </button>
        {pages.map((p, i) => p === '…' ? (
          <span key={`e-${i}`} style={{ padding: '0 4px', fontSize: 12, color: T.textMuted }}>…</span>
        ) : (
          <button key={p} onClick={() => setPage(p)}
            style={rosterStyles.pageBtn(p === page, false, pColor)}>
            {p}
          </button>
        ))}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          style={rosterStyles.pageBtn(false, page === totalPages, pColor)}>
          <Icon name="chevronRight" size={12} color="currentColor" />
        </button>
      </div>
    </div>
  );
};

// ── Right column: Thêm học sinh panel ────────────────────────────────────────

const AddStudentPanel = ({ searchPool, rosterIds, pColor, t, onAdd }) => {
  const [query, setQuery] = React.useState('');
  const [recentlyAdded, setRecentlyAdded] = React.useState(new Set());

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    // Show all when empty; filter when typing.
    const base = q
      ? searchPool.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      : searchPool;
    return base.slice(0, 25);
  }, [query, searchPool]);

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', height: 'fit-content',
      position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="plus" size={14} color={pColor} strokeWidth={2.4} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>
              {t('Thêm học sinh', 'Add students')}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
              {t('Tìm và thêm học sinh vào lớp này.', 'Find and add students to this class.')}
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '8px 12px',
        }}>
          <Icon name="search" size={14} color={T.textMuted} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('Tên hoặc mã học sinh...', 'Name or student ID...')}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, color: T.textPrimary, width: '100%', fontFamily: 'inherit',
            }} />
        </div>
      </div>

      {/* Results list */}
      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {results.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', color: T.textMuted, fontSize: 12.5 }}>
            {t('Không tìm thấy học sinh.', 'No students found.')}
          </div>
        ) : results.map(s => {
          const alreadyEnrolled = rosterIds.has(s.id) || recentlyAdded.has(s.id);
          const conflictClass = !alreadyEnrolled && s.currentClassName;
          return (
            <div key={s.id} style={{
              padding: '12px 20px', borderTop: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <Avatar initials={s.name.split(' ').slice(-1)[0][0]} color={pColor} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums', fontFamily: '"SF Mono", Menlo, Consolas, monospace' }}>
                  {s.id}
                </div>
                {conflictClass && (
                  <div style={{
                    marginTop: 6, padding: '6px 8px', background: T.warning + '15',
                    border: `1px solid ${T.warning}33`, borderRadius: 6,
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                  }}>
                    <Icon name="alertTriangle" size={11} color={T.warning} strokeWidth={2.2} />
                    <div style={{ fontSize: 10.5, color: '#946000', lineHeight: 1.4, fontWeight: 600 }}>
                      {t(`Học sinh đang trong lớp ${s.currentClassName} — thêm vào lớp này sẽ chuyển lớp.`,
                        `Currently in class ${s.currentClassName} — adding will transfer.`)}
                    </div>
                  </div>
                )}
                {!conflictClass && !alreadyEnrolled && (
                  <Badge color={T.textMuted} bg={T.bg} style={{ marginTop: 4, fontSize: 10 }}>
                    {t('Chưa thuộc lớp nào', 'Unassigned')}
                  </Badge>
                )}
              </div>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                {alreadyEnrolled ? (
                  <button disabled style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                    background: T.bg, color: T.textMuted, fontSize: 11, fontWeight: 700,
                    fontFamily: 'inherit', cursor: 'not-allowed',
                  }}>
                    <Icon name="check" size={11} color="currentColor" strokeWidth={2.5} />
                    {t('Đã trong lớp', 'In class')}
                  </button>
                ) : (
                  <button onClick={() => {
                    onAdd(s);
                    setRecentlyAdded(prev => { const n = new Set(prev); n.add(s.id); return n; });
                  }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 10px', borderRadius: 6, border: 'none',
                      background: conflictClass ? T.warning : pColor, color: '#fff',
                      fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                      transition: 'opacity 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <Icon name="plus" size={11} color="#fff" strokeWidth={2.4} />
                    {conflictClass ? t('Chuyển lớp', 'Transfer') : t('Thêm vào lớp', 'Add')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CSV import footer */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, background: T.bg }}>
        <button style={{
          width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '8px 12px', borderRadius: 8, border: `1px dashed ${T.border}`,
          background: 'transparent', color: T.textSecondary, fontSize: 12.5, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}>
          <Icon name="upload" size={13} color="currentColor" strokeWidth={2} />
          {t('Import từ CSV', 'Import from CSV')}
        </button>
      </div>
    </div>
  );
};

// ── Empty state (new class, 0 students) ──────────────────────────────────────

const RosterEmptyState = ({ pColor, t, onAddFirst }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '60px 32px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16,
  }}>
    {/* Iconographic illustration — stacked silhouettes inside a soft circle */}
    <div style={{
      width: 120, height: 120, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${pColor}1F, ${pColor}08)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 22, top: 38, opacity: 0.5 }}>
        <Icon name="user" size={36} color={pColor} strokeWidth={1.5} />
      </div>
      <div style={{ position: 'absolute', right: 22, top: 38, opacity: 0.5 }}>
        <Icon name="user" size={36} color={pColor} strokeWidth={1.5} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Icon name="userCheck" size={52} color={pColor} strokeWidth={1.6} />
      </div>
    </div>
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
        {t('Lớp chưa có học sinh', 'No students yet')}
      </div>
      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55, maxWidth: 360 }}>
        {t(
          'Hãy thêm học sinh để bắt đầu nhập điểm và điểm danh cho lớp này.',
          'Add students to begin grade entry and attendance for this class.',
        )}
      </div>
    </div>
    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
      <Button onClick={onAddFirst} icon="plus">
        {t('Thêm học sinh đầu tiên cho lớp này', 'Add the first student to this class')}
      </Button>
      <Button variant="secondary" icon="upload">
        {t('Import từ CSV', 'Import from CSV')}
      </Button>
    </div>
  </div>
);

// ── Main screen ──────────────────────────────────────────────────────────────

const StudentRosterScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [currentClassId, setCurrentClassId] = React.useState('cls-10a1');
  const [rosterByClass, setRosterByClass] = React.useState(() => {
    // Deep clone seed so we can mutate locally.
    const out = {};
    for (const k of Object.keys(ROSTER_BY_CLASS)) out[k] = ROSTER_BY_CLASS[k].map(s => ({ ...s }));
    return out;
  });

  const cls = ROSTER_CLASSES.find(c => c.id === currentClassId);
  const roster = rosterByClass[currentClassId] || [];
  const rosterIds = React.useMemo(() => new Set(roster.map(s => s.id)), [roster]);
  const activeCount = roster.filter(s => s.status === 'active').length;
  const transferredCount = roster.filter(s => s.status === 'transferred').length;

  // Search pool excludes the currently-enrolled students.
  const searchPool = React.useMemo(
    () => ROSTER_SEARCH_POOL.filter(s => !rosterIds.has(s.id)),
    [rosterIds],
  );

  const removeStudents = (ids) => {
    const idSet = new Set(ids);
    setRosterByClass(prev => ({
      ...prev,
      [currentClassId]: prev[currentClassId].filter(s => !idSet.has(s.id)),
    }));
  };
  const addStudent = (poolStudent) => {
    setRosterByClass(prev => {
      const next = { ...prev };
      // If currently enrolled elsewhere, remove from that class too (transfer).
      if (poolStudent.currentClassId && next[poolStudent.currentClassId]) {
        next[poolStudent.currentClassId] = next[poolStudent.currentClassId]
          .filter(s => s.id !== poolStudent.id);
      }
      const newRecord = {
        id: poolStudent.id, name: poolStudent.name,
        dob: '01/01/2010', gender: poolStudent.name.endsWith('a') || /[ếêi]nh|Vy|Mai|Hằng|Châu|Hương/.test(poolStudent.name) ? 'F' : 'M',
        status: 'active',
      };
      next[currentClassId] = [...(next[currentClassId] || []), newRecord];
      return next;
    });
  };

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: T.bg }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Breadcrumb + page-level actions */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <RosterBreadcrumb classList={ROSTER_CLASSES} currentClassId={currentClassId}
              onChange={setCurrentClassId} t={t} />
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 6 }}>
              {t('Danh sách học sinh', 'Student roster')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {t(
                'Quản lý ghi danh học sinh — điều kiện bắt buộc trước khi nhập điểm và điểm danh.',
                'Manage student enrollment — required before grade entry and attendance.',
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="md" icon="upload">{t('Import CSV', 'Import CSV')}</Button>
            <Button variant="secondary" size="md" icon="download">{t('Xuất danh sách', 'Export list')}</Button>
          </div>
        </div>

        {/* Class info header card */}
        <ClassInfoCard cls={cls} activeCount={activeCount}
          transferredCount={transferredCount} pColor={pColor} t={t} lang={lang} />

        {/* Two-column layout: enrolled (60%) + add panel (40%) */}
        {roster.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 18 }}>
            <RosterEmptyState pColor={pColor} t={t} onAddFirst={() => {/* focus right-col search */}} />
            <AddStudentPanel searchPool={searchPool} rosterIds={rosterIds}
              pColor={pColor} t={t} onAdd={addStudent} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 1fr)', gap: 18, alignItems: 'flex-start' }}>
            <RosterTable roster={roster} pColor={pColor} t={t}
              onRemoveMany={removeStudents}
              onRemoveOne={(id) => removeStudents([id])} />
            <AddStudentPanel searchPool={searchPool} rosterIds={rosterIds}
              pColor={pColor} t={t} onAdd={addStudent} />
          </div>
        )}
      </div>
    </main>
  );
};

// ── Local styles ─────────────────────────────────────────────────────────────

const rosterStyles = {
  th: {
    padding: '11px 16px', textAlign: 'left',
    fontSize: 10.5, fontWeight: 700, color: T.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  },
  thCheckbox: {
    width: 38, padding: '11px 8px 11px 20px',
  },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  tdCheckbox: { padding: '12px 8px 12px 20px', verticalAlign: 'middle' },
  checkbox: (pColor) => ({
    width: 16, height: 16, cursor: 'pointer', accentColor: pColor,
    margin: 0, verticalAlign: 'middle',
  }),
  pageBtn: (active, disabled, pColor) => ({
    minWidth: 30, height: 30, padding: '0 8px', borderRadius: 7,
    border: `1px solid ${active ? pColor : T.border}`,
    background: active ? pColor : 'transparent',
    color: active ? '#fff' : (disabled ? T.textMuted : T.textSecondary),
    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.12s',
  }),
};

Object.assign(window, { StudentRosterScreen });
