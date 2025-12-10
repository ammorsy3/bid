import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'ar';

const translations = {
  en: {
    settings: {
      accountSettings: "Account settings",
      personalInfo: "Personal information",
      teamSettings: "Team settings",
      firstName: "First name",
      lastName: "Last name",
      firstNameHelper: "The name others in your team will see you as.",
      lastNameHelper: "The name others in your team will see you as.",
      loginEmail: "Log in email",
      emailHelper: "Your account email for connection, information & notifications",
      jobTitle: "Job title",
      jobTitleHelper: "Your job title, can be shared with vendors and partners.",
      jobTitlePlaceholder: "e.g. CEO, Sales, Product designer, etc.",
      phoneNumber: "Phone number",
      phoneHelper: "Your phone number for contact purposes.",
      linkedinUrl: "LinkedIn URL",
      linkedinHelper: "Your LinkedIn profile URL for networking.",
      timezone: "Timezone",
      timezoneHelper: "Your timezone, can be used for scheduling meetings.",
      chooseTimezone: "Choose your timezone",
      uploadPicture: "Upload a picture",
      pictureHelper: "JPG, PNG or GIF. Max 5MB.",
      appearance: "Appearance",
      theme: "Theme",
      themeHelper: "Change the appearance of the platform.",
      light: "Light",
      dark: "Dark",
      system: "System",
      language: "Language",
      languageHelper: "Change the language of the product.",
      gdpr: "GDPR",
      gdprCheckbox: "I am compliant with local privacy laws when managing my prospects' data.",
      companyLogo: "Company Logo",
      companyLogoHelper: "Your company logo, visible to partners and vendors.",
      displayName: "Display name",
      displayNameHelper: "The name displayed to vendors and partners.",
      companyBio: "Company bio",
      companyBioHelper: "A brief description of your company.",
      companyBioPlaceholder: "Tell us about your company...",
      companySlug: "Company slug",
      companySlugHelper: "Your unique company identifier (read-only).",
      plansBilling: "Plans & Billing",
      notifications: "Notifications",
      shareFeedback: "Share Feedback",
    },
    dashboard: {
      overview: "Overview",
      tenders: "Tenders",
      proposals: "Proposals",
      vendorsBase: "Vendors Base",
      companies: "companies",
      welcomeTitle: "Welcome to Your Dashboard",
      welcomeDesc: "Manage tenders, proposals, and your vendor network all in one place.",
      companyStatus: "Company Status",
      profileComplete: "Profile complete",
      setupInProgress: "Setup in progress",
      yourRole: "Your Role",
      inThisCompany: "in this company",
      quickActions: "Quick Actions",
      createTender: "Create Tender",
      viewProfile: "View Profile",
      verificationPending: "Company Verification Pending",
      verificationPendingDesc: "Your company is under review. You can browse but some features are restricted until verified.",
      tendersTitle: "Tenders",
      tendersDesc: "Create and manage procurement tenders",
      newTender: "New Tender",
      searchTenders: "Search tenders...",
      all: "All",
      published: "Published",
      draft: "Draft",
      closed: "Closed",
      noTenders: "No tenders found",
      noTendersDesc: "Create your first tender to get started",
      deadline: "Deadline",
      budget: "Budget",
      offers: "offers",
      invited: "invited",
      copyLink: "Copy Link",
      linkCopied: "Link Copied!",
      edit: "Edit",
      delete: "Delete",
      view: "View",
      proposalsTitle: "Proposals",
      proposalsDesc: "Track your submitted proposals and respond to incoming offers",
      myProposals: "My Proposals",
      incomingOffers: "Incoming Offers",
      noProposals: "No proposals submitted yet",
      noProposalsDesc: "Submit proposals to active tenders to see them here",
      noIncomingOffers: "No incoming offers yet",
      noIncomingOffersDesc: "Offers from vendors will appear here",
      submittedOn: "Submitted on",
      viewDetails: "View Details",
      accept: "Accept",
      ignore: "Ignore",
      pending: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      vendorsBaseTitle: "Vendors Base",
      vendorsBaseDesc: "Manage your approved vendor network",
      searchVendors: "Search vendors...",
      tractionLink: "Traction Link",
      copyTractionLink: "Copy Traction Link",
      pendingRequests: "Pending Requests",
      noVendors: "No vendors in your base yet",
      noVendorsDesc: "Share your traction link to invite vendors",
      category: "Category",
      city: "City",
      verified: "Verified",
      unverified: "Unverified",
      joined: "Joined",
      approve: "Approve",
      reject: "Reject",
      noPendingRequests: "No pending join requests",
      technicalFile: "Technical File",
      financialFile: "Financial File",
      notes: "Notes",
      noNotes: "No notes provided",
      viewTender: "View Tender",
      company: "Company",
      owner: "Owner",
      admin: "Admin",
      member: "Member",
      viewer: "Viewer",
    }
  },
  ar: {
    settings: {
      accountSettings: "إعدادات الحساب",
      personalInfo: "المعلومات الشخصية",
      teamSettings: "إعدادات الفريق",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      firstNameHelper: "الاسم الذي سيراه الآخرون في فريقك.",
      lastNameHelper: "الاسم الذي سيراه الآخرون في فريقك.",
      loginEmail: "البريد الإلكتروني",
      emailHelper: "بريدك الإلكتروني للاتصال والمعلومات والإشعارات",
      jobTitle: "المسمى الوظيفي",
      jobTitleHelper: "مسماك الوظيفي، يمكن مشاركته مع الموردين والشركاء.",
      jobTitlePlaceholder: "مثال: مدير تنفيذي، مبيعات، مصمم منتجات، إلخ.",
      phoneNumber: "رقم الهاتف",
      phoneHelper: "رقم هاتفك لأغراض التواصل.",
      linkedinUrl: "رابط LinkedIn",
      linkedinHelper: "رابط ملفك الشخصي على LinkedIn للتواصل المهني.",
      timezone: "المنطقة الزمنية",
      timezoneHelper: "منطقتك الزمنية، يمكن استخدامها لجدولة الاجتماعات.",
      chooseTimezone: "اختر منطقتك الزمنية",
      uploadPicture: "تحميل صورة",
      pictureHelper: "JPG أو PNG أو GIF. الحد الأقصى 5 ميجابايت.",
      appearance: "المظهر",
      theme: "السمة",
      themeHelper: "تغيير مظهر المنصة.",
      light: "فاتح",
      dark: "داكن",
      system: "النظام",
      language: "اللغة",
      languageHelper: "تغيير لغة المنتج.",
      gdpr: "حماية البيانات",
      gdprCheckbox: "أنا ملتزم بقوانين الخصوصية المحلية عند إدارة بيانات العملاء المحتملين.",
      companyLogo: "شعار الشركة",
      companyLogoHelper: "شعار شركتك، مرئي للشركاء والموردين.",
      displayName: "الاسم المعروض",
      displayNameHelper: "الاسم المعروض للموردين والشركاء.",
      companyBio: "نبذة عن الشركة",
      companyBioHelper: "وصف موجز لشركتك.",
      companyBioPlaceholder: "أخبرنا عن شركتك...",
      companySlug: "معرف الشركة",
      companySlugHelper: "معرف شركتك الفريد (للقراءة فقط).",
      plansBilling: "الخطط والفوترة",
      notifications: "الإشعارات",
      shareFeedback: "شارك رأيك",
    },
    dashboard: {
      overview: "نظرة عامة",
      tenders: "المناقصات",
      proposals: "العروض",
      vendorsBase: "قاعدة الموردين",
      companies: "شركات",
      welcomeTitle: "مرحباً بك في لوحة التحكم",
      welcomeDesc: "إدارة المناقصات والعروض وشبكة الموردين في مكان واحد.",
      companyStatus: "حالة الشركة",
      profileComplete: "الملف مكتمل",
      setupInProgress: "الإعداد قيد التنفيذ",
      yourRole: "دورك",
      inThisCompany: "في هذه الشركة",
      quickActions: "إجراءات سريعة",
      createTender: "إنشاء مناقصة",
      viewProfile: "عرض الملف",
      verificationPending: "التحقق من الشركة قيد الانتظار",
      verificationPendingDesc: "شركتك قيد المراجعة. يمكنك التصفح لكن بعض الميزات محدودة حتى التحقق.",
      tendersTitle: "المناقصات",
      tendersDesc: "إنشاء وإدارة مناقصات المشتريات",
      newTender: "مناقصة جديدة",
      searchTenders: "بحث في المناقصات...",
      all: "الكل",
      published: "منشور",
      draft: "مسودة",
      closed: "مغلق",
      noTenders: "لا توجد مناقصات",
      noTendersDesc: "أنشئ أول مناقصة للبدء",
      deadline: "الموعد النهائي",
      budget: "الميزانية",
      offers: "عروض",
      invited: "مدعوين",
      copyLink: "نسخ الرابط",
      linkCopied: "تم نسخ الرابط!",
      edit: "تعديل",
      delete: "حذف",
      view: "عرض",
      proposalsTitle: "العروض",
      proposalsDesc: "تتبع عروضك المقدمة والرد على العروض الواردة",
      myProposals: "عروضي",
      incomingOffers: "العروض الواردة",
      noProposals: "لم يتم تقديم عروض بعد",
      noProposalsDesc: "قدم عروضاً للمناقصات النشطة لرؤيتها هنا",
      noIncomingOffers: "لا توجد عروض واردة بعد",
      noIncomingOffersDesc: "ستظهر عروض الموردين هنا",
      submittedOn: "تم التقديم في",
      viewDetails: "عرض التفاصيل",
      accept: "قبول",
      ignore: "تجاهل",
      pending: "قيد الانتظار",
      accepted: "مقبول",
      rejected: "مرفوض",
      vendorsBaseTitle: "قاعدة الموردين",
      vendorsBaseDesc: "إدارة شبكة الموردين المعتمدين",
      searchVendors: "بحث عن موردين...",
      tractionLink: "رابط الانضمام",
      copyTractionLink: "نسخ رابط الانضمام",
      pendingRequests: "طلبات الانتظار",
      noVendors: "لا يوجد موردون في قاعدتك بعد",
      noVendorsDesc: "شارك رابط الانضمام لدعوة الموردين",
      category: "الفئة",
      city: "المدينة",
      verified: "موثق",
      unverified: "غير موثق",
      joined: "انضم",
      approve: "موافقة",
      reject: "رفض",
      noPendingRequests: "لا توجد طلبات انضمام معلقة",
      technicalFile: "الملف الفني",
      financialFile: "الملف المالي",
      notes: "ملاحظات",
      noNotes: "لم يتم تقديم ملاحظات",
      viewTender: "عرض المناقصة",
      company: "الشركة",
      owner: "مالك",
      admin: "مدير",
      member: "عضو",
      viewer: "مشاهد",
    }
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'ar' ? 'ar' : 'en') as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (language === 'ar') {
      root.dir = 'rtl';
      root.lang = 'ar';
    } else {
      root.dir = 'ltr';
      root.lang = 'en';
    }
  }, [language]);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const isRtl = language === 'ar';

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
