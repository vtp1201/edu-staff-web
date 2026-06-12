// ── Subject Master Editor (ADMIN · /admin/subjects) — Dialogs & Detail Sheet ──

// Locked-field descriptors, shared by the detail sheet.
const SM_LOCKED_FIELDS = [
  { key: 'periodCount',              type: 'number',   vi: 'Số tiết',                   en: 'Period count',         hint: '/ năm', enHint: '/ year', placeholder: 'VD: 105' },
  { key: 'requiredAssessmentCount',  type: 'number',   vi: 'Yêu cầu số bài kiểm tra',   en: 'Required assessments', hint: '/ kỳ',  enHint: '/ term', placeholder: 'VD: 4' },
  { key: 'outcomeTargets',           type: 'textarea', vi: 'Chỉ tiêu đầu ra',           en: 'Learning outcomes',    placeholder: 'Mô tả ngắn các mục tiêu/kết quả đầu ra của chương trình…' },
  { key: 'masterSyllabus',           type: 'url',      vi: 'Giáo án gốc',               en: 'Master syllabus',      placeholder: 'URL hoặc tham chiếu tài liệu' },
  { key: 'exerciseBankRef',          type: 'text',     vi: 'Kho bài tập chung',         en: 'Shared exercise bank', placeholder: 'URL hoặc mã định danh' },
  { key: 'examBankRef',              type: 'text',     vi: 'Kho đề kiểm tra chung',     en: 'Shared exam bank',     placeholder: 'URL hoặc mã định danh' },
];

// ── Subject Master Detail Sheet ──────────────────────────────────────────────

const SubjectDetailSheet = ({ subject, parent, pColor, lang, onClose, onSave }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);

  const [draft, setDraft] = React.useState({ ...subject });
  const [lockedTooltipKey, setLockedTooltipKey] = React.useState(null);
  const [saved, setSaved] = React.useState(false);

  const set = (key, val) => { setDraft(d => ({ ...d, [key]: val })); setSaved(false); };

  const nameValid = draft.name.trim().length > 0 && draft.name.trim().length <= 128;
  const codeValid = !draft.code || (/^[A-Z0-9]{1,16}$/.test(draft.code));
  const canSave = nameValid && codeValid;

  const handleSave = () => {
    if (!canSave) return;
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const isArchived = draft.status === 'ARCHIVED';

  return (
    <React.Fragment>
      {/* Scrim */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.45)', zIndex: 1000 }} />
      {/* Sheet */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="bookOpen" size={20} color={pColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
                  {draft.name || t('Môn học mới', 'New subject')}
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: pColor + '15', color: pColor, letterSpacing: '0.03em', whiteSpace: 'nowrap',
                }}>
                  {t(`Lớp ${draft.gradeLevel}`, `Grade ${draft.gradeLevel}`)}
                </span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                  border: `1px solid ${isArchived ? T.border : T.success + '33'}`,
                  background: isArchived ? T.bg : T.successLight,
                  color: isArchived ? T.textMuted : T.success, letterSpacing: '0.04em',
                }}>
                  {isArchived ? t('Đã lưu trữ', 'Archived') : t('Hoạt động', 'Active')}
                </span>
              </div>
              <div style={{ fontSize: 12, color: T.textMuted }}>
                {parent?.name} · <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{draft.code || '—'}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="x" size={16} color={T.textMuted} />
            </button>
          </div>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          {/* Editable section */}
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            {t('Thông tin cơ bản', 'Basic information')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
                {t('Tên môn học', 'Subject name')} <span style={{ color: T.error }}>*</span>
              </label>
              <input value={draft.name} maxLength={128} onChange={e => set('name', e.target.value)}
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 9, boxSizing: 'border-box',
                  border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit',
                  outline: 'none', color: T.textPrimary, background: '#fff', transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = pColor}
                onBlur={e => e.target.style.borderColor = T.border} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: T.textMuted }}>
                <span>{t('1–128 ký tự', '1–128 characters')}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{draft.name.length}/128</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6, display: 'block' }}>
                {t('Mã môn', 'Subject code')}
                <span style={{ color: T.textMuted, fontSize: 11, fontWeight: 500, marginLeft: 6 }}>
                  ({t('không bắt buộc', 'optional')})
                </span>
              </label>
              <input value={draft.code} maxLength={16}
                onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="VD: MATH10"
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 9, boxSizing: 'border-box',
                  border: `1.5px solid ${codeValid ? T.border : T.error}`, fontSize: 14, fontFamily: 'ui-monospace, Menlo, monospace',
                  outline: 'none', color: T.textPrimary, background: '#fff', letterSpacing: '0.04em',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { if (codeValid) e.target.style.borderColor = pColor; }}
                onBlur={e => { if (codeValid) e.target.style.borderColor = T.border; }} />
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                {t('Chữ hoa & chữ số, tối đa 16 ký tự.', 'Uppercase letters & digits, up to 16 chars.')}
              </div>
            </div>
          </div>

          {/* Locked section */}
          <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name="lockClosed" size={14} color={T.warning} />
              <div style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary }}>
                {t('Chuẩn chương trình', 'Curriculum standard')}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.warning, background: T.warningLight, border: `1px solid ${T.warning}33`, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em' }}>
                {t('Khoá ở cấp lớp', 'Locked at class level')}
              </span>
            </div>
            <div style={{ background: T.warningLight + '88', border: `1px solid ${T.warning}28`, borderRadius: 9, padding: '11px 13px', fontSize: 12, color: T.textSecondary, lineHeight: 1.55, marginBottom: 18 }}>
              {t('Các trường này là chuẩn chương trình — không thể thay đổi ở cấp lớp. Giáo viên sẽ thấy các thông số này khi nhập điểm.',
                 'These fields are the curriculum standard — they cannot be changed at the class level. Teachers will see these values when entering grades.')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SM_LOCKED_FIELDS.map(field => {
                const showTip = lockedTooltipKey === field.key;
                const val = draft[field.key] ?? '';
                const inputStyle = {
                  width: '100%', padding: '10px 36px 10px 13px', borderRadius: 9, boxSizing: 'border-box',
                  border: `1.5px solid ${T.border}`, fontSize: 13.5, fontFamily: 'inherit',
                  outline: 'none', color: T.textPrimary, background: T.bg, transition: 'border-color 0.15s',
                };
                return (
                  <div key={field.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, position: 'relative' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary }}>
                        {t(field.vi, field.en)}
                      </span>
                      {field.hint && (
                        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>
                          {t(field.hint, field.enHint)}
                        </span>
                      )}
                      <span onMouseEnter={() => setLockedTooltipKey(field.key)}
                        onMouseLeave={() => setLockedTooltipKey(null)}
                        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                        <Icon name="lockClosed" size={11} color={T.warning} />
                      </span>
                      {showTip && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, background: T.textPrimary, color: '#fff', fontSize: 11, fontWeight: 600, padding: '7px 10px', borderRadius: 7, maxWidth: 280, lineHeight: 1.4, zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
                          <div style={{ position: 'absolute', top: '100%', left: 20, width: 8, height: 8, background: T.textPrimary, transform: 'translateY(-50%) rotate(45deg)' }} />
                          {t('Giá trị này sẽ hiển thị ở cấp lớp và không thể thay đổi bởi giáo viên.',
                             'This value flows down to the class level and cannot be edited by teachers.')}
                        </div>
                      )}
                    </div>

                    <div style={{ position: 'relative' }}>
                      {field.type === 'textarea' ? (
                        <textarea value={val} onChange={e => set(field.key, e.target.value)}
                          placeholder={field.placeholder} rows={3}
                          style={{ ...inputStyle, resize: 'vertical', minHeight: 76, fontFamily: 'inherit' }}
                          onFocus={e => e.target.style.borderColor = pColor}
                          onBlur={e => e.target.style.borderColor = T.border} />
                      ) : field.type === 'number' ? (
                        <input type="number" min={0} value={val}
                          onChange={e => set(field.key, e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={field.placeholder} style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
                          onFocus={e => e.target.style.borderColor = pColor}
                          onBlur={e => e.target.style.borderColor = T.border} />
                      ) : (
                        <input value={val} onChange={e => set(field.key, e.target.value)}
                          placeholder={field.placeholder} style={inputStyle}
                          onFocus={e => e.target.style.borderColor = pColor}
                          onBlur={e => e.target.style.borderColor = T.border} />
                      )}
                      {/* Lock badge in upper-right corner of input */}
                      {field.type !== 'textarea' && (
                        <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                          <Icon name="lockClosed" size={12} color={T.textMuted} />
                        </div>
                      )}
                      {field.type === 'url' && val && (
                        <a href={val} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                          style={{ position: 'absolute', right: 30, top: 11, color: T.textMuted, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                          <Icon name="externalLink" size={12} color={T.textMuted} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {saved && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: T.success, marginRight: 'auto' }}>
              <Icon name="check" size={13} color={T.success} strokeWidth={2.4} /> {t('Đã lưu', 'Saved')}
            </span>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('Đóng', 'Close')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave} icon="check">
            {t('Lưu thay đổi', 'Save changes')}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

// ── Create SubjectParent Dialog ───────────────────────────────────────────────

const CreateSubjectParentDialog = ({ pColor, lang, onClose, onCreate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const [name, setName] = React.useState('');
  const [conceptMode, setConceptMode] = React.useState('BO_MON');
  const [customLabel, setCustomLabel] = React.useState('');

  const nameValid = name.trim().length > 0 && name.trim().length <= 128;
  const customValid = conceptMode !== 'CUSTOM' || customLabel.trim().length > 0;
  const canSave = nameValid && customValid;

  const handleCreate = () => {
    if (!canSave) return;
    const conceptType = conceptMode === 'CUSTOM' || conceptMode === 'NONE' ? null : conceptMode;
    const conceptLabelCustom = conceptMode === 'CUSTOM' ? customLabel.trim() : null;
    onCreate({ name: name.trim(), conceptType, conceptLabelCustom });
  };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: T.card, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="layers" size={18} color={pColor} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
              {t('Thêm bộ môn', 'New department')}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
              {t('Bộ môn nhóm các môn học cùng chuyên ngành.', 'Departments group subjects by discipline.')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}>
            <Icon name="x" size={16} color={T.textMuted} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
              {t('Tên bộ môn', 'Department name')} <span style={{ color: T.error }}>*</span>
            </label>
            <input autoFocus value={name} maxLength={128}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) handleCreate(); }}
              placeholder={t('VD: Bộ môn Vật lý', 'e.g. Physics department')}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = pColor}
              onBlur={e => e.target.style.borderColor = T.border} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
              {t('Nhãn phân loại', 'Concept label')}
              <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>({t('không bắt buộc', 'optional')})</span>
              <span title={t('Nhãn này giúp phân loại bộ môn theo cơ cấu tổ chức của trường.', 'Helps classify departments by your school\u2019s organisational structure.')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: T.bg, color: T.textMuted, fontSize: 9, fontWeight: 700, cursor: 'help' }}>?</span>
            </div>
            <div style={{ display: 'flex', gap: 5, background: T.bg, padding: 4, borderRadius: 9, border: `1px solid ${T.border}` }}>
              {[
                { id: 'BO_MON', vi: 'Bộ môn', en: 'Department' },
                { id: 'TO',     vi: 'Tổ',     en: 'Team' },
                { id: 'KHOA',   vi: 'Khoa',   en: 'Faculty' },
                { id: 'CUSTOM', vi: 'Tùy chỉnh', en: 'Custom' },
              ].map(opt => {
                const active = conceptMode === opt.id;
                return (
                  <button key={opt.id} onClick={() => setConceptMode(opt.id)}
                    style={{
                      flex: 1, padding: '7px 8px', borderRadius: 6, border: 'none',
                      background: active ? T.card : 'transparent',
                      color: active ? pColor : T.textSecondary,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap',
                    }}>
                    {t(opt.vi, opt.en)}
                  </button>
                );
              })}
            </div>
            {conceptMode === 'CUSTOM' && (
              <input value={customLabel} maxLength={32}
                onChange={e => setCustomLabel(e.target.value)}
                placeholder={t('Nhãn tuỳ chỉnh (VD: Trung tâm)', 'Custom label (e.g. Center)')}
                style={{ width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = pColor}
                onBlur={e => e.target.style.borderColor = T.border} />
            )}
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>{t('Hủy', 'Cancel')}</Button>
          <Button onClick={handleCreate} disabled={!canSave} icon="check">
            {t('Tạo bộ môn', 'Create department')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Create Subject Dialog ─────────────────────────────────────────────────────

const CreateSubjectDialog = ({ parents, initialParentId, gradeRange, pColor, lang, onClose, onCreate, onSwitchParent }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const [parentId, setParentId] = React.useState(initialParentId);
  const [switching, setSwitching] = React.useState(false);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [gradeLevel, setGradeLevel] = React.useState(gradeRange.minGrade);

  const parent = parents.find(p => p.id === parentId);

  const nameValid = name.trim().length > 0 && name.trim().length <= 128;
  const gradeNum = Number(gradeLevel);
  const gradeValid = Number.isInteger(gradeNum) && gradeNum >= gradeRange.minGrade && gradeNum <= gradeRange.maxGrade;
  const codeValid = !code || /^[A-Z0-9]{1,16}$/.test(code);
  const canSave = parentId && nameValid && gradeValid && codeValid;

  const handleCreate = () => {
    if (!canSave) return;
    onCreate({ parentId, name: name.trim(), code: code.trim() || null, gradeLevel: gradeNum });
  };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: T.card, borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bookOpen" size={18} color={pColor} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
              {t('Thêm môn học', 'New subject')}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
              {t('Môn học gắn với một khối lớp cụ thể.', 'Each subject is scoped to a single grade level.')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}>
            <Icon name="x" size={16} color={T.textMuted} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Parent (read-only with change link) */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6, display: 'block' }}>
              {t('Bộ môn', 'Department')}
            </label>
            {!switching ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 9, border: `1.5px solid ${T.border}`, background: T.bg }}>
                <Icon name="layers" size={14} color={pColor} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: T.textPrimary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {parent?.name || '—'}
                </span>
                <button onClick={() => setSwitching(true)}
                  style={{ background: 'transparent', border: 'none', color: pColor, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  {t('Thay đổi', 'Change')}
                </button>
              </div>
            ) : (
              <select value={parentId} onChange={e => { setParentId(e.target.value); setSwitching(false); }}
                style={{ width: '100%', padding: '10px 13px', borderRadius: 9, border: `1.5px solid ${pColor}`, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', boxSizing: 'border-box' }}>
                {parents.filter(p => p.status === 'ACTIVE').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
              {t('Tên môn học', 'Subject name')} <span style={{ color: T.error }}>*</span>
            </label>
            <input autoFocus value={name} maxLength={128}
              onChange={e => setName(e.target.value)}
              placeholder={t('VD: Toán lớp 10', 'e.g. Mathematics Grade 10')}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = pColor}
              onBlur={e => e.target.style.borderColor = T.border} />
          </div>

          {/* Grade + Code (side-by-side) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
                {t('Khối lớp', 'Grade level')} <span style={{ color: T.error }}>*</span>
              </label>
              <input type="number" min={gradeRange.minGrade} max={gradeRange.maxGrade} step={1}
                value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${gradeValid ? T.border : T.error}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: T.textPrimary, background: '#fff', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums' }}
                onFocus={e => { if (gradeValid) e.target.style.borderColor = pColor; }}
                onBlur={e => { if (gradeValid) e.target.style.borderColor = T.border; }} />
              <div style={{ fontSize: 11, color: gradeValid ? T.textMuted : T.error, marginTop: 4 }}>
                {t(`Khối lớp hợp lệ: ${gradeRange.minGrade}–${gradeRange.maxGrade}`, `Valid range: ${gradeRange.minGrade}–${gradeRange.maxGrade}`)}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 6, display: 'block' }}>
                {t('Mã môn', 'Code')}
                <span style={{ color: T.textMuted, fontSize: 11, fontWeight: 500, marginLeft: 6 }}>
                  ({t('không bắt buộc', 'optional')})
                </span>
              </label>
              <input value={code} maxLength={16}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="MATH10"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${codeValid ? T.border : T.error}`, fontSize: 14, fontFamily: 'ui-monospace, Menlo, monospace', outline: 'none', color: T.textPrimary, background: '#fff', boxSizing: 'border-box', letterSpacing: '0.04em' }}
                onFocus={e => { if (codeValid) e.target.style.borderColor = pColor; }}
                onBlur={e => { if (codeValid) e.target.style.borderColor = T.border; }} />
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                {t('A–Z, 0–9, ≤16 ký tự', 'A–Z, 0–9, ≤16 chars')}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>{t('Hủy', 'Cancel')}</Button>
          <Button onClick={handleCreate} disabled={!canSave} icon="check">
            {t('Tạo môn học', 'Create subject')}
          </Button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SubjectDetailSheet, CreateSubjectParentDialog, CreateSubjectDialog, SM_LOCKED_FIELDS });
