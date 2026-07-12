// ── P5: Email Verification Flow ───────────────────────────────────────────────
// No new screens — an app-shell banner, a profile email-status field, and an
// OTP dialog. app.jsx owns the verified/dismissed/dialog state and guards all
// usages with `typeof … !== 'undefined'` so pages that don't load this file
// keep working unchanged.

// Emails per role (mirrors PROFILE_DATA in profile.jsx, which is file-scoped).
const EV_EMAILS = {
  teacher: 'nguyen.huong@email.com',
  principal: 'tran.quan@email.com',
  student: 'minh.khoa@student.edu.vn',
  parent: 'nguyen.duc@email.com',
};

// 60s resend cooldown, SR-readable.
const useEVCooldown = () => {
  const [left, setLeft] = React.useState(0);
  React.useEffect(() => {
    if (left <= 0) return;
    const id = window.setInterval(() => setLeft(l => (l > 0 ? l - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [left > 0]);
  return [left, setLeft];
};

// ── 1. App-shell banner (below header, above content) ─────────────────────────
const EmailVerifyBanner = ({ email, onDismiss, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [sent, setSent] = React.useState(false);
  const [cooldown, setCooldown] = useEVCooldown();

  const send = () => { setSent(true); setCooldown(60); };

  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 24px',
      background: T.warning + '1A', borderBottom: `1px solid ${T.warning}55`,
      flexShrink: 0, animation: 'ev-banner-in 0.2s ease-out',
    }}>
      <style>{`@keyframes ev-banner-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: T.warning + '26',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <Icon name="mail" size={14} color={T.warning} strokeWidth={2.2} />
        <span aria-hidden="true" style={{
          position: 'absolute', top: -3, right: -3, width: 11, height: 11, borderRadius: '50%',
          background: T.warning, color: T.warningForeground, fontSize: 8, fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>!</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.warningForeground, lineHeight: 1.45 }}>
        {sent ? (
          <>
            <strong>{t('Đã gửi.', 'Sent.')}</strong>{' '}
            {t(`Kiểm tra hộp thư ${email}.`, `Check the inbox of ${email}.`)}{' '}
            {cooldown > 0 ? (
              <span aria-live="polite" style={{ fontWeight: 700, opacity: 0.75 }}>
                {t(`Gửi lại được sau ${cooldown} giây.`, `Resend available in ${cooldown} seconds.`)}
              </span>
            ) : (
              <a href="#" onClick={e => { e.preventDefault(); setCooldown(60); }}
                style={{ fontWeight: 800, color: T.warningForeground, textDecoration: 'underline' }}>
                {t('Gửi lại', 'Resend')}
              </a>
            )}
          </>
        ) : (
          <>
            <strong>{t('Email của bạn chưa được xác thực.', 'Your email is not verified yet.')}</strong>{' '}
            {t('Xác thực để nhận thông báo quan trọng.', 'Verify it to receive important notifications.')}
          </>
        )}
      </div>
      {!sent && (
        <button onClick={send}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 7, flexShrink: 0,
            border: `1px solid ${T.warning}66`, background: 'transparent',
            color: T.warningForeground, fontSize: 12, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
          <Icon name="send" size={11} color={T.warningForeground} strokeWidth={2.2} />
          {t('Gửi mail xác thực', 'Send verification mail')}
        </button>
      )}
      <button onClick={onDismiss} aria-label={t('Đóng thông báo xác thực email', 'Dismiss email verification notice')}
        style={{
          width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.warning + '26'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <Icon name="x" size={13} color={T.warningForeground} strokeWidth={2.2} />
      </button>
    </div>
  );
};

// ── 2. Profile email field with status badge ──────────────────────────────────
const EVEmailField = ({ email, verified, onVerify, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>Email</label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <Icon name="mail" size={15} color={T.textMuted} />
        </div>
        <input value={email} disabled
          style={{
            width: '100%', padding: '10px 130px 10px 38px', borderRadius: 9,
            border: `1.5px solid ${T.border}`, fontSize: 13.5, outline: 'none',
            fontFamily: 'inherit', color: T.textMuted, background: T.bg,
          }} />
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
          {verified ? (
            <Badge color={T.teal}>
              <Icon name="check" size={11} color={T.teal} strokeWidth={2.6} />
              {t('Đã xác thực', 'Verified')}
            </Badge>
          ) : (
            <Badge color={T.warningText} bg={T.warningLight}>
              <Icon name="alertTriangle" size={11} color={T.warningText} strokeWidth={2.4} />
              {t('Chưa xác thực', 'Not verified')}
            </Badge>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <span style={{ fontSize: 11, color: T.textMuted }}>{t('Email không thể thay đổi', 'Email cannot be changed')}</span>
        {!verified && onVerify && (
          <button onClick={onVerify}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0,
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 11.5, fontWeight: 800, color: T.primary,
            }}>
            <Icon name="userCheck" size={12} color={T.primary} strokeWidth={2.2} />
            {t('Xác thực ngay', 'Verify now')}
          </button>
        )}
      </div>
    </div>
  );
};

// ── 3. OTP verification dialog ────────────────────────────────────────────────
// Demo codes: 123456 = valid · 000000 = expired · anything else = wrong.
const EmailVerifyDialog = ({ email, onClose, onVerified, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [digits, setDigits] = React.useState(['', '', '', '', '', '']);
  const [error, setError] = React.useState(null); // 'wrong' | 'expired'
  const [checking, setChecking] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [cooldown, setCooldown] = useEVCooldown();
  const inputsRef = React.useRef([]);
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    const prev = document.activeElement;
    const el = dialogRef.current;
    if (el) { const f = el.querySelector('input, button'); if (f) f.focus(); }
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll('button:not([disabled]), input');
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);

  const code = digits.join('');
  const complete = code.length === 6 && digits.every(d => d !== '');

  const setDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    setDigits(ds => { const next = [...ds]; next[i] = v; return next; });
    setError(null);
    if (v && i < 5 && inputsRef.current[i + 1]) inputsRef.current[i + 1].focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0 && inputsRef.current[i - 1]) {
      inputsRef.current[i - 1].focus();
    }
    if (e.key === 'Enter' && complete) verify();
  };

  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    setError(null);
    const last = Math.min(text.length, 6) - 1;
    if (inputsRef.current[last]) inputsRef.current[last].focus();
  };

  const verify = () => {
    if (!complete || checking) return;
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      if (code === '123456') { setSuccess(true); onVerified && onVerified(); }
      else if (code === '000000') setError('expired');
      else setError('wrong');
    }, 650);
  };

  const resend = () => { setCooldown(60); setError(null); setDigits(['', '', '', '', '', '']); if (inputsRef.current[0]) inputsRef.current[0].focus(); };

  const errText = error === 'wrong'
    ? t('Mã không đúng. Vui lòng kiểm tra lại email và nhập lại.', 'Incorrect code. Please check your email and try again.')
    : t('Mã đã hết hạn. Bấm "Gửi lại mã" để nhận mã mới.', 'This code has expired. Press "Resend code" to get a new one.');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8000, padding: 20,
    }}>
      <div ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ev-dialog-title"
        style={{
          background: T.card, borderRadius: 14, width: '100%', maxWidth: 420,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}>
        {success ? (
          <div style={{ padding: '36px 28px 28px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.tealLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Icon name="check" size={34} color={T.teal} strokeWidth={2.4} />
            </div>
            <div id="ev-dialog-title" style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, marginBottom: 8 }}>
              {t('Email đã được xác thực', 'Email verified')}
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
              {t(`${email} giờ sẽ nhận đầy đủ thông báo quan trọng từ nhà trường.`, `${email} will now receive all important school notifications.`)}
            </div>
            <Button style={{ width: '100%', justifyContent: 'center' }} icon="check" onClick={onClose}>
              {t('Hoàn tất', 'Done')}
            </Button>
          </div>
        ) : (
          <>
            <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="mail" size={16} color={pColor} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div id="ev-dialog-title" style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Xác thực email', 'Verify your email')}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1, lineHeight: 1.5 }}>
                  {t(`Chúng tôi đã gửi mã 6 số tới ${email}.`, `We sent a 6-digit code to ${email}.`)}
                </div>
              </div>
              <button onClick={onClose} aria-label={t('Đóng', 'Close')}
                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: T.bg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="x" size={13} color={T.textMuted} />
              </button>
            </div>

            <div style={{ padding: '20px 22px 6px' }}>
              <div role="group" aria-label={t('Mã xác thực 6 chữ số', '6-digit verification code')}
                style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={onPaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => inputsRef.current[i] = el}
                    value={d} maxLength={1} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    aria-label={t(`Chữ số thứ ${i + 1}`, `Digit ${i + 1}`)}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'ev-otp-err' : undefined}
                    onChange={e => setDigit(i, e.target.value)}
                    onKeyDown={e => onKeyDown(i, e)}
                    style={{
                      width: 46, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 800,
                      borderRadius: 10, border: `1.5px solid ${error ? T.errorDark : T.border}`,
                      outline: 'none', fontFamily: 'inherit', color: T.textPrimary,
                      background: error ? T.errorDarkLight + '55' : T.card,
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { if (!error) e.target.style.borderColor = pColor; }}
                    onBlur={e => { if (!error) e.target.style.borderColor = T.border; }} />
                ))}
              </div>
              {error && (
                <div id="ev-otp-err" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, justifyContent: 'center', marginTop: 10, fontSize: 12, fontWeight: 700, color: T.errorText, lineHeight: 1.5 }}>
                  <Icon name="alertTriangle" size={12} color={T.errorText} strokeWidth={2.2} />
                  <span>{errText}</span>
                </div>
              )}
              <div aria-live="polite" style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: T.textMuted }}>
                {cooldown > 0 ? (
                  <span>{t(`Gửi lại mã được sau ${cooldown} giây`, `You can resend the code in ${cooldown} seconds`)}</span>
                ) : (
                  <button onClick={resend}
                    style={{ background: 'none', border: 'none', color: pColor, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    {t('Gửi lại mã', 'Resend code')}
                  </button>
                )}
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10.5, color: T.textMuted, opacity: 0.8 }}>
                {t('Demo: mã đúng 123456 · mã hết hạn 000000', 'Demo: valid code 123456 · expired code 000000')}
              </div>
            </div>

            <div style={{ padding: '14px 22px 18px' }}>
              <Button style={{ width: '100%', justifyContent: 'center' }} disabled={!complete || checking} onClick={verify}>
                {checking ? t('Đang xác minh…', 'Verifying…') : t('Xác nhận', 'Confirm')}
              </Button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes ev-banner-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

Object.assign(window, { EmailVerifyBanner, EVEmailField, EmailVerifyDialog, EV_EMAILS });
