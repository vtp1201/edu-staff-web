// ── Shared screen-state primitives (loading / empty / error / coming-soon) ────
// Chuẩn hoá state cho MỌI màn: dùng các component này thay vì tự vẽ.
// Tokens-only. Mirror sang production: src/components/ui/screen-states/.

// Skeleton shimmer — dùng khi đang tải dữ liệu lần đầu.
// variant: 'rows' (danh sách/bảng) | 'cards' (grid stat-card)
const EduSkeleton = ({ variant = 'rows', count = 4, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const bar = (w, h = 12) => (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: `linear-gradient(90deg, ${T.border}66 25%, ${T.bg} 50%, ${T.border}66 75%)`,
      backgroundSize: '200% 100%', animation: 'edu-shimmer 1.4s linear infinite',
    }} />
  );
  return (
    <div role="status" aria-label={t('Đang tải dữ liệu…', 'Loading…')}
      style={variant === 'cards'
        ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }
        : { display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
          padding: variant === 'cards' ? '20px 24px' : '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: variant === 'cards' ? 52 : 40, height: variant === 'cards' ? 52 : 40,
            borderRadius: variant === 'cards' ? 12 : 10, flexShrink: 0,
            background: `linear-gradient(90deg, ${T.border}66 25%, ${T.bg} 50%, ${T.border}66 75%)`,
            backgroundSize: '200% 100%', animation: 'edu-shimmer 1.4s linear infinite',
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bar('55%')}
            {bar('35%', 10)}
          </div>
        </div>
      ))}
      <style>{`@keyframes edu-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
};

// Empty state — có dữ liệu rỗng hợp lệ (khác coming-soon).
// icon: tên icon; action: { label, icon?, onClick } (CTA duy nhất, optional)
const EduEmpty = ({ icon = 'inbox', title, desc, action, lang, color }) => {
  const c = color || T.primary;
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: '56px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: c + '14',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Icon name={icon} size={26} color={c} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>{desc}</div>}
      {action && (
        <div style={{ marginTop: 18 }}>
          <Button size="sm" icon={action.icon || 'plus'} onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  );
};

// Error state — lỗi tải dữ liệu, luôn kèm retry.
const EduError = ({ title, desc, onRetry, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div role="alert" style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      padding: '56px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: T.errorLight,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Icon name="alertTriangle" size={26} color={T.error} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
        {title || t('Không tải được dữ liệu', 'Failed to load data')}
      </div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
        {desc || t('Đã có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại.', 'Something went wrong while contacting the server. Please try again.')}
      </div>
      {onRetry && (
        <div style={{ marginTop: 18 }}>
          <Button size="sm" variant="secondary" icon="refreshCw" onClick={onRetry}>{t('Thử lại', 'Retry')}</Button>
        </div>
      )}
    </div>
  );
};

// Coming-soon — module có trong nav nhưng chưa thiết kế xong.
const EduComingSoon = ({ title, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
      padding: '56px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: T.bg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Icon name="clock" size={26} color={T.textMuted} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{title}</div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 6 }}>
        {t('Phân hệ này đang được thiết kế — sẽ có trong bản cập nhật tới.', 'This module is being designed — coming in a future update.')}
      </div>
    </div>
  );
};

Object.assign(window, { EduSkeleton, EduEmpty, EduError, EduComingSoon });
