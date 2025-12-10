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
