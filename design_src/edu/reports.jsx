// ── Reports (Hiệu trưởng) — báo cáo toàn trường ───────────────────────────────
// Dùng bộ state chuẩn edu/states.jsx: skeleton khi tải, error + retry (demo
// lần refresh đầu), empty khi bộ lọc không có dữ liệu.

const RP_SUBJECT_AVG = [
  { vi: 'Toán',     en: 'Math',       score: 7.8 },
  { vi: 'Ngữ văn',  en: 'Literature', score: 7.1 },
  { vi: 'T. Anh',   en: 'English',    score: 6.9 },
  { vi: 'Vật lý',   en: 'Physics',    score: 7.4 },
  { vi: 'Hoá học',  en: 'Chemistry',  score: 7.0 },
  { vi: 'Sinh học', en: 'Biology',    score: 7.6 },
  { vi: 'Lịch sử',  en: 'History',    score: 8.1 },
  { vi: 'Địa lý',   en: 'Geography',  score: 7.9 },
];

const RP_ATTENDANCE = [
  { week: 'T1', pct: 97.2 }, { week: 'T2', pct: 96.8 }, { week: 'T3', pct: 95.1 },
  { week: 'T4', pct: 96.9 }, { week: 'T5', pct: 97.6 }, { week: 'T6', pct: 96.4 },
];

const RP_REPORTS = [
  { id: 'r1', vi: 'Báo cáo sơ kết Học kỳ I',        en: 'Semester I summary report',      term: 'HK I', date: '10/01/2026', status: 'ready' },
  { id: 'r2', vi: 'Thống kê điểm giữa kỳ II',        en: 'Mid-term II grade statistics',   term: 'HK II', date: '20/03/2026', status: 'ready' },
  { id: 'r3', vi: 'Báo cáo chuyên cần tháng 6',      en: 'June attendance report',         term: 'HK II', date: '01/07/2026', status: 'ready' },
  { id: 'r4', vi: 'Báo cáo tổng kết năm học',        en: 'Year-end summary report',        term: 'Cả năm', date: '—', status: 'generating' },
];

const ReportsScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [status, setStatus] = React.useState('loading'); // loading | error | ready
  const [term, setTerm] = React.useState('hk2');
  const failedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setStatus('ready'), 700);
    return () => window.clearTimeout(id);
  }, []);

  // Refresh — lần đầu mô phỏng lỗi để review EduError, retry sẽ thành công
  const refresh = () => {
    setStatus('loading');
    window.setTimeout(() => {
      if (!failedOnce.current) { failedOnce.current = true; setStatus('error'); }
      else setStatus('ready');
    }, 700);
  };

  const TERMS = [
    { id: 'hk1', vi: 'Học kỳ I', en: 'Semester I' },
    { id: 'hk2', vi: 'Học kỳ II', en: 'Semester II' },
    { id: 'year', vi: 'Cả năm', en: 'Full year' },
  ];

  const maxScore = 10;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div role="radiogroup" aria-label={t('Kỳ báo cáo', 'Reporting term')}
            style={{ display: 'inline-flex', gap: 4, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4 }}>
            {TERMS.map(x => {
              const active = term === x.id;
              return (
                <button key={x.id} onClick={() => setTerm(x.id)} role="radio" aria-checked={active}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: active ? pColor : 'transparent',
                    color: active ? '#fff' : T.textSecondary,
                    fontSize: 12.5, fontWeight: active ? 700 : 500, fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}>{t(x.vi, x.en)}</button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" icon="refreshCw" onClick={refresh}>{t('Làm mới', 'Refresh')}</Button>
          <Button size="sm" icon="download">{t('Xuất Excel', 'Export Excel')}</Button>
        </div>

        {status === 'loading' && <EduSkeleton variant="cards" count={4} lang={lang} />}
        {status === 'error' && (
          <EduError lang={lang} onRetry={refresh}
            title={t('Không tải được báo cáo', 'Failed to load reports')}
            desc={t('Máy chủ báo cáo không phản hồi. Vui lòng thử lại.', 'The reporting service did not respond. Please try again.')} />
        )}

        {status === 'ready' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
              <StatCard icon="users" iconColor={pColor} label={t('Tổng số học sinh', 'Total students')} value="1.248" trend={2.1} trendLabel={t('so với HK trước', 'vs last term')} />
              <StatCard icon="award" iconColor={T.success} label={t('Điểm TB toàn trường', 'School grade average')} value="7.42" trend={0.8} trendLabel={t('so với HK trước', 'vs last term')} />
              <StatCard icon="userCheck" iconColor={T.warning} label={t('Tỷ lệ chuyên cần', 'Attendance rate')} value="96,4%" trend={-0.5} trendLabel={t('so với HK trước', 'vs last term')} />
              <StatCard icon="shield" iconColor={T.error} label={t('Vi phạm trong kỳ', 'Incidents this term')} value="23" trend={-12} trendLabel={t('so với HK trước', 'vs last term')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 20 }}>
              {/* Bar chart: điểm TB theo môn */}
              <Card style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>{t('Điểm trung bình theo môn', 'Grade average by subject')}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted }}>{t('Thang điểm 10', 'Scale of 10')}</div>
                </div>
                <div role="img" aria-label={t('Biểu đồ cột điểm trung bình theo môn', 'Bar chart of grade average by subject')}
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${RP_SUBJECT_AVG.length}, 1fr)`, gap: 12, alignItems: 'end', height: 180 }}>
                  {RP_SUBJECT_AVG.map((s, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{s.score.toFixed(1)}</div>
                      <div style={{
                        width: '100%', maxWidth: 34, borderRadius: '6px 6px 3px 3px',
                        height: `${(s.score / maxScore) * 130}px`,
                        background: `linear-gradient(180deg, ${pColor}, ${pColor}99)`,
                      }} />
                      <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>{t(s.vi, s.en)}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Column chart: chuyên cần theo tuần */}
              <Card style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>{t('Chuyên cần 6 tuần gần nhất', 'Attendance, last 6 weeks')}</div>
                </div>
                <div role="img" aria-label={t('Biểu đồ chuyên cần theo tuần', 'Weekly attendance chart')}
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${RP_ATTENDANCE.length}, 1fr)`, gap: 12, alignItems: 'end', height: 180 }}>
                  {RP_ATTENDANCE.map((w, i) => {
                    const low = w.pct < 96;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: low ? T.warning : T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{String(w.pct).replace('.', ',')}%</div>
                        <div style={{
                          width: '100%', maxWidth: 30, borderRadius: '6px 6px 3px 3px',
                          height: `${(w.pct - 90) / 10 * 130}px`,
                          background: low ? T.warning : T.success,
                          opacity: low ? 1 : 0.85,
                        }} />
                        <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600 }}>{w.week}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Bảng báo cáo định kỳ */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>{t('Báo cáo định kỳ', 'Periodic reports')}</div>
                <Button variant="ghost" size="sm" icon="plus" style={{ border: `1px solid ${T.border}` }}>{t('Tạo báo cáo', 'New report')}</Button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {[t('Tên báo cáo', 'Report'), t('Kỳ', 'Term'), t('Ngày tạo', 'Created'), t('Trạng thái', 'Status'), ''].map((h, i) => (
                      <th key={i} scope="col" style={{ textAlign: i >= 3 ? 'center' : 'left', padding: '10px 24px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RP_REPORTS.map(r => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td style={{ padding: '12px 24px', fontWeight: 600, color: T.textPrimary }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 32, height: 32, borderRadius: 8, background: pColor + '14', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="fileText" size={14} color={pColor} />
                          </span>
                          {t(r.vi, r.en)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 24px', color: T.textSecondary }}>{r.term}</td>
                      <td style={{ padding: '12px 24px', color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{r.date}</td>
                      <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                        {r.status === 'ready'
                          ? <Badge color={T.success}>{t('Sẵn sàng', 'Ready')}</Badge>
                          : <Badge color={T.warning}>{t('Đang tạo…', 'Generating…')}</Badge>}
                      </td>
                      <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                        <Button variant="ghost" size="sm" icon="download" disabled={r.status !== 'ready'}
                          style={{ border: `1px solid ${T.border}` }}>{t('Tải về', 'Download')}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { ReportsScreen });
