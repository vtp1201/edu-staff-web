// EduPortal Design Tokens
window.T = {
  primary: '#5D87FF',
  primaryLight: '#ECF2FF',
  primaryDark: '#4570EA',
  success: '#13DEB9',
  successLight: '#E6FFFA',
  warning: '#FFAE1F',
  warningLight: '#FEF5E5',
  error: '#FA896B',
  errorLight: '#FFF5F2',
  errorText: '#C0392B',        // AA on white/light (5.1:1) — decision 0027
  errorDark: '#B91C1C',        // solid fill for white text (8.2:1) — decision 0040
  errorDarkLight: '#FEE2E2',
  // Foreground colors for solid status backgrounds (mirror tokens.css)
  successForeground: '#FFFFFF',
  warningForeground: '#2A3547', // never white on warning yellow (a11y, decision 0013)
  errorForeground: '#FFFFFF',
  info: '#539BFF',
  infoLight: '#EBF3FE',
  purple: '#7B5EA7',
  purpleLight: '#F0EBF9',
  teal: '#00B8A9',
  tealLight: '#E0F7F5',
  textPrimary: '#2A3547',
  textSecondary: '#5A6A85',
  textMuted: '#8898A9',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5EAF2',
  sidebarWidth: 260,
  sidebarCollapsedWidth: 72,
  headerHeight: 64,
};

// Mock data
window.MOCK = {
  teacher: {
    name: 'Nguyễn Thị Hương',
    nameEn: 'Nguyen Thi Huong',
    subject: 'Toán học',
    subjectEn: 'Mathematics',
    school: 'THPT Nguyễn Du',
    schoolEn: 'Nguyen Du High School',
    avatar: 'NH',
    role: 'teacher',
  },
  principal: {
    name: 'Trần Minh Quân',
    nameEn: 'Tran Minh Quan',
    school: 'THPT Nguyễn Du',
    schoolEn: 'Nguyen Du High School',
    avatar: 'TQ',
    role: 'principal',
  },
  student: {
    name: 'Nguyễn Minh Khoa',
    nameEn: 'Nguyen Minh Khoa',
    class: '11A2',
    school: 'THPT Nguyễn Du',
    schoolEn: 'Nguyen Du High School',
    avatar: 'NK',
    role: 'student',
  },
  parent: {
    name: 'Nguyễn Văn Đức',
    nameEn: 'Nguyen Van Duc',
    avatar: 'ND',
    role: 'parent',
    children: ['Nguyễn Minh Khoa (11A2)', 'Nguyễn Thu Hà (8B1)'],
  },
};
