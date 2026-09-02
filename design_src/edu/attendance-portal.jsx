// ── Chuyên cần — Student & Parent portal views ───────────────────────────────
// Đầu nhận của luồng Điểm danh (classops.jsx): học sinh xem chuyên cần của mình,
// phụ huynh xem chuyên cần của con + gửi đơn xin phép nghỉ.

// Per-month attendance (Học kỳ II 2025–2026 demo)
const AP_MONTHS = [
  { id: '2026-01', vi: 'Tháng 1', en: 'January',  total: 100, excused: 2, absent: 0 },
  { id: '2026-02', vi: 'Tháng 2', en: 'February', total: 80,  excused: 0, absent: 1 },
  { id: '2026-03', vi: 'Tháng 3', en: 'March',    total: 110, excused: 3, absent: 0 },
  { id: '2026-04', vi: 'Tháng 4', en: 'April',    total: 95,  excused: 1, absent: 1 },
];

const AP_ABSENCES = [
  { date: '22/04/2026', period: 'Tiết 3–5', subject: 'Vật Lý, Hóa Học', subjectEn: 'Physics, Chemistry', status: 'absent',  reason: '', reasonEn: '' },
  { date: '09/04/2026', period: 'Cả ngày',  subject: '—', subjectEn: '—', status: 'excused', reason: 'Khám sức khỏe định kỳ (có đơn PH)', reasonEn: 'Health check-up (parent note)' },
  { date: '17/03/2026', period: 'Tiết 1–2', subject: 'Toán học', subjectEn: 'Mathematics', status: 'excused', reason: 'Việc gia đình (có đơn PH)', reasonEn: 'Family matter (parent note)' },
  { date: '05/03/2026', period: 'Cả ngày',  subject: '—', subjectEn: '—', status: 'excused', reason: 'Ốm — sốt virus (có đơn PH)', reasonEn: 'Sick — viral fever (parent note)' },
  { date: '12/02/2026', period: 'Tiết 4',   subject: 'Ngữ Văn', subjectEn: 'Literature', status: 'absent', reason: '', reasonEn: '' },
  { date: '20/01/2026', period: 'Tiết 6–7', subject: 'Tiếng Anh', subjectEn: 'English', status: 'excused', reason: 'Thi đấu thể thao cấp trường', reasonEn: 'School sports competition' },
];

const AP_STATUS = {
  excused: { vi: 'Vắng có phép',    en: 'Excused', color: '#FFAE1F' },
  absent:  { vi: 'Vắng không phép', en: 'Absent',  color: '#FA896B' },
  pending: { vi: 'Chờ duyệt',       en: 'Pending', color: '#5D87FF' },
};

const apStats = (months) => {
  const total = months.reduce((s, m) => s + m.total, 0);
  const excused = months.reduce((s, m) => s + m.excused, 0);
  const absent = months.reduce((s, m) => s + m.absent, 0);
  const present = total - excused - absent;
  return { total, excused, absent, present, rate: Math.round(present / total * 1000) / 10 };
};

// ── Shared summary block (stat cards + monthly bars + absence list) ──────────
const APSummary = ({ lang, pColor, months, absences, ownerLabel }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const s = apStats(months);
  const rateColor = s.rate >= 95 ? T.success : s.rate >= 90 ? T.warning : T.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard icon="percent" iconColor={rateColor} label={t('Tỉ lệ chuyên cần', 'Attendance Rate')} value={s.rate + '%'} lang={lang} />
        <StatCard icon="userCheck" iconColor={T.success} label={t('Tiết có mặt', 'Periods Present')} value={`${s.present}/${s.total}`} lang={lang} />
        <StatCard icon="fileText" iconColor={T.warning} label={t('Vắng có phép', 'Excused Absences')} value={s.excused} lang={lang} />
        <StatCard icon="alertTriangle" iconColor={T.error} label={t('Vắng không phép', 'Unexcused Absences')} value={s.absent} lang={lang} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>
        {/* Monthly breakdown */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>{t('Theo tháng', 'By Month')}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{t('Học kỳ II · 2025–2026', 'Semester II · 2025–2026')}</div>
          {months.map((m, i) => {
            const present = m.total - m.excused - m.absent;
            const rate = Math.round(present / m.total * 100);
            return (
              <div key={m.id} style={{ marginBottom: i < months.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, flexShrink: 0 }}>{t(m.vi, m.en)}</span>
                  <span style={{ fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {m.excused > 0 && <span style={{ color: T.warning, fontWeight: 700 }}>{m.excused}P </span>}
                    {m.absent > 0 && <span style={{ color: T.error, fontWeight: 700 }}>{m.absent}KP </span>}
                    <span style={{ fontWeight: 700, color: rate >= 95 ? T.success : T.warning }}>{rate}%</span>
                  </span>
                </div>
                <ProgressBar value={rate} color={rate >= 95 ? T.success : rate >= 90 ? T.warning : T.error} height={6} />
              </div>
            );
          })}
          <div style={{ marginTop: 16, padding: '10px 12px', background: pColor + '0C', border: `1px solid ${pColor}20`, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="info" size={13} color={pColor} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: T.textSecondary, lineHeight: 1.5 }}>
              {t('Theo quy chế, nghỉ quá 45 buổi/năm học (kể cả có phép) sẽ không được lên lớp.',
                 'Per regulation, more than 45 absence days per year (incl. excused) means no grade promotion.')}
            </span>
          </div>
        </div>

        {/* Absence history */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Lịch sử vắng mặt', 'Absence History')}</div>
            <Badge color={pColor}>{absences.length} {t('lần', 'records')}</Badge>
          </div>
          {absences.length === 0 && typeof EduEmpty !== 'undefined' && (
            <EduEmpty icon="userCheck" title={t('Không có buổi vắng nào', 'No absences')} lang={lang} />
          )}
          {absences.map((a, i) => {
            const sc = AP_STATUS[a.status];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px', borderBottom: i < absences.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: sc.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={a.status === 'absent' ? 'alertTriangle' : a.status === 'pending' ? 'clock' : 'fileText'} size={15} color={sc.color} strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{a.date}</span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{a.period === 'Cả ngày' ? t('Cả ngày', 'Full day') : a.period}</span>
                    {a.subject !== '—' && <span style={{ fontSize: 12, color: T.textMuted }}>· {lang === 'en' ? a.subjectEn : a.subject}</span>}
                  </div>
                  {a.reason
                    ? <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 3 }}>{lang === 'en' ? a.reasonEn : a.reason}</div>
                    : a.status === 'absent' && <div style={{ fontSize: 12, color: T.error, marginTop: 3 }}>{t('Chưa có lý do — GVCN đã thông báo phụ huynh', 'No reason recorded — homeroom teacher notified parent')}</div>
                  }
                </div>
                <Badge color={sc.color} style={{ flexShrink: 0 }}>{t(sc.vi, sc.en)}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Student view ──────────────────────────────────────────────────────────────
const StudentAttendanceScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Chuyên cần của tôi', 'My Attendance')}</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Tổng hợp từ điểm danh theo tiết của giáo viên', "Aggregated from teachers' per-period attendance")}</div>
        </div>
        <APSummary lang={lang} pColor={pColor} months={AP_MONTHS} absences={AP_ABSENCES} />
      </div>
    </div>
  );
};

// ── Parent view — child selector + excuse request ────────────────────────────
const AP_CHILDREN = [
  { name: 'Nguyễn Minh Khoa', class: '11A2', avatar: 'NK',
    months: AP_MONTHS, absences: AP_ABSENCES },
  { name: 'Nguyễn Thu Hà', class: '8B1', avatar: 'NH',
    months: [
      { id: '2026-01', vi: 'Tháng 1', en: 'January',  total: 100, excused: 0, absent: 0 },
      { id: '2026-02', vi: 'Tháng 2', en: 'February', total: 80,  excused: 1, absent: 0 },
      { id: '2026-03', vi: 'Tháng 3', en: 'March',    total: 110, excused: 0, absent: 0 },
      { id: '2026-04', vi: 'Tháng 4', en: 'April',    total: 95,  excused: 0, absent: 0 },
    ],
    absences: [
      { date: '18/02/2026', period: 'Cả ngày', subject: '—', subjectEn: '—', status: 'excused', reason: 'Ốm — có đơn xin phép', reasonEn: 'Sick — excuse note submitted' },
    ] },
];

const ParentAttendanceScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [selectedChild, setSelectedChild] = React.useState(0);
  const [showRequest, setShowRequest] = React.useState(false);
  const [requests, setRequests] = React.useState([]);
  const child = AP_CHILDREN[selectedChild];
  const childColors = [pColor, T.success];

  // Merge submitted excuse requests (pending) into the absence list for this child
  const absences = [
    ...requests.filter(r => r.childIdx === selectedChild).map(r => ({
      date: r.date.split('-').reverse().join('/'), period: r.scope === 'day' ? 'Cả ngày' : r.periods,
      subject: '—', subjectEn: '—', status: 'pending', reason: r.reason, reasonEn: r.reason,
    })),
    ...child.absences,
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Chuyên cần của con', "Child's Attendance")}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Theo dõi vắng mặt và gửi đơn xin phép nghỉ học', 'Track absences and submit excuse requests')}</div>
          </div>
          <button onClick={() => setShowRequest(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: 'none', borderRadius: 9, background: pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Icon name="plus" size={13} color="#fff" strokeWidth={2.5} />
            {t('Xin phép nghỉ học', 'Request Absence')}
          </button>
        </div>

        {/* Child selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {AP_CHILDREN.map((c, i) => (
            <button key={i} onClick={() => setSelectedChild(i)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
              borderRadius: 10, border: `2px solid ${selectedChild === i ? childColors[i] : T.border}`,
              background: selectedChild === i ? childColors[i] + '10' : T.card, cursor: 'pointer',
            }}>
              <Avatar initials={c.avatar} color={childColors[i]} size={34} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{t(`Lớp ${c.class}`, `Class ${c.class}`)}</div>
              </div>
            </button>
          ))}
        </div>

        <APSummary lang={lang} pColor={childColors[selectedChild]} months={child.months} absences={absences} />

        {showRequest && (
          <APExcuseRequestDialog lang={lang} pColor={pColor} child={child}
            onClose={() => setShowRequest(false)}
            onSubmit={(req) => { setRequests(prev => [{ ...req, childIdx: selectedChild }, ...prev]); setShowRequest(false); }} />
        )}
      </div>
    </div>
  );
};

// ── Excuse request dialog ────────────────────────────────────────────────────
const APExcuseRequestDialog = ({ lang, pColor, child, onClose, onSubmit }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [dateFrom, setDateFrom] = React.useState('2026-05-04');
  const [dateTo, setDateTo] = React.useState('2026-05-04');
  const [files, setFiles] = React.useState([]);
  const [reason, setReason] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const fileRef = React.useRef(null);

  const addFiles = (list) => {
    const ok = Array.from(list).filter(f => /\.(jpe?g|png|pdf)$/i.test(f.name) && f.size <= 5 * 1024 * 1024);
    setFiles(fs => [...fs, ...ok.map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(1) + ' MB' }))].slice(0, 3));
  };

  const submit = () => {
    if (!reason.trim()) return;
    setSending(true);
    setTimeout(() => onSubmit({ dateFrom, dateTo, files, reason: reason.trim() }), 700);
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.textPrimary, outline: 'none', background: T.bg };
  const labelStyle = { fontSize: 11.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 };

  return (
    <div role="dialog" aria-modal="true" aria-label={t('Đơn xin phép nghỉ học', 'Absence excuse request')}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 9600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 460, maxWidth: '100%', background: T.card, borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Xin phép nghỉ học', 'Request Absence')}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{child.name} · {t(`Lớp ${child.class}`, `Class ${child.class}`)}</div>
          </div>
          <button onClick={onClose} aria-label={t('Đóng', 'Close')} style={{ background: T.bg, border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={13} color={T.textMuted} />
          </button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>{t('Nghỉ từ ngày', 'From date')}</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value); }} style={inputStyle}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
            <div>
              <label style={labelStyle}>{t('Đến hết ngày', 'To date')}</label>
              <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('Lý do', 'Reason')}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder={t('VD: Cháu bị sốt, gia đình xin phép cho cháu nghỉ...', 'e.g. My child has a fever...')}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
          </div>
          <div>
            <label style={labelStyle}>{t('Minh chứng đính kèm', 'Attachments')}</label>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 6, background: T.bg }}>
                <Icon name="paperclip" size={12} color={T.textMuted} strokeWidth={2.1} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: T.textPrimary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>{f.size}</span>
                <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label={t('Xoá tệp', 'Remove file')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}><Icon name="x" size={11} color={T.textMuted} strokeWidth={2.4} /></button>
              </div>
            ))}
            {files.length < 3 && (
              <button onClick={() => fileRef.current && fileRef.current.click()}
                style={{ width: '100%', padding: '11px 12px', border: `1.5px dashed ${T.border}`, borderRadius: 9, background: 'transparent', color: T.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Icon name="upload" size={13} color={T.textMuted} strokeWidth={2} />
                {t('Thêm tệp (đơn viết tay, giấy khám…)', 'Add file (note, medical slip…)')}
              </button>
            )}
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 5 }}>{t('Tối đa 3 tệp · JPG/PNG/PDF · ≤ 5 MB mỗi tệp', 'Max 3 files · JPG/PNG/PDF · ≤ 5 MB each')}</div>
          </div>
          <div style={{ padding: '10px 12px', background: T.warningLight, border: `1px solid ${T.warning}30`, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="info" size={13} color={T.warning} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: T.warningText || '#9A6A0F', lineHeight: 1.5 }}>
              {t('Đơn sẽ gửi tới GVCN để phê duyệt. Buổi nghỉ được tính "có phép" sau khi duyệt.',
                 'The request goes to the homeroom teacher. The absence counts as "excused" once approved.')}
            </span>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: 'transparent', color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t('Huỷ', 'Cancel')}
          </button>
          <button onClick={submit} disabled={sending || !reason.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', border: 'none', borderRadius: 8, background: !reason.trim() ? T.textMuted : pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: sending || !reason.trim() ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
            <Icon name="send" size={13} color="#fff" strokeWidth={2.2} />
            {sending ? t('Đang gửi...', 'Sending...') : t('Gửi đơn', 'Submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { StudentAttendanceScreen, ParentAttendanceScreen });
