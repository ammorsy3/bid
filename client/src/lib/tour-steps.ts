import type { TourStep } from './tour';

export const DASHBOARD_TOUR_STEPS_EN: TourStep[] = [
  {
    id: 'sidebar-nav',
    target: '[data-tour="sidebar-nav"]',
    title: 'Your navigation hub',
    body: 'Use the sidebar to move between your Tenders, Proposals, Vendors, and Settings. Click the toggle at the top to collapse it when you need more space.',
    placement: 'right',
  },
  {
    id: 'create-tender',
    target: '[data-tour="create-tender"]',
    title: 'Start sourcing: Create a Tender',
    body: 'This is your primary action. Publish a tender to invite vendors to submit proposals — our AI Copilot can help you write it in minutes.',
    placement: 'right',
  },
  {
    id: 'dashboard-tabs',
    target: '[data-tour="dashboard-tabs"]',
    title: 'Everything in one place',
    body: 'Switch between your active tenders, proposals you\'ve submitted, incoming offers from vendors, and your approved vendor base — all from these tabs.',
    placement: 'bottom',
  },
  {
    id: 'onboarding-tasks',
    target: '[data-tour="onboarding-tasks"]',
    title: 'Track your setup progress',
    body: 'Complete these 5 steps to unlock the full power of BID. Each task links directly to the action you need to take.',
    placement: 'top',
  },
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'Your profile & settings',
    body: 'Access account settings, switch between companies, change language and theme, and manage notifications — all from your profile menu.',
    placement: 'top',
  },
];

export const DASHBOARD_TOUR_STEPS_AR: TourStep[] = [
  {
    id: 'sidebar-nav',
    target: '[data-tour="sidebar-nav"]',
    title: 'مركز التنقل',
    body: 'استخدم الشريط الجانبي للتنقل بين المناقصات والعروض والموردين والإعدادات. انقر على زر التبديل لطيه عند الحاجة.',
    placement: 'left',
  },
  {
    id: 'create-tender',
    target: '[data-tour="create-tender"]',
    title: 'ابدأ التوريد: أنشئ مناقصة',
    body: 'هذا هو إجراؤك الأساسي. انشر مناقصة لدعوة الموردين لتقديم عروضهم — يمكن لمساعد الذكاء الاصطناعي مساعدتك في كتابتها خلال دقائق.',
    placement: 'left',
  },
  {
    id: 'dashboard-tabs',
    target: '[data-tour="dashboard-tabs"]',
    title: 'كل شيء في مكان واحد',
    body: 'تنقل بين مناقصاتك النشطة والعروض المقدمة والعروض الواردة من الموردين وقاعدة الموردين المعتمدين — كل ذلك من هذه التبويبات.',
    placement: 'bottom',
  },
  {
    id: 'onboarding-tasks',
    target: '[data-tour="onboarding-tasks"]',
    title: 'تتبع تقدم الإعداد',
    body: 'أكمل هذه الخطوات الـ5 لاستخدام BID بكامل إمكانياته. كل مهمة ترتبط مباشرة بالإجراء الذي تحتاج إلى اتخاذه.',
    placement: 'top',
  },
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'ملفك الشخصي والإعدادات',
    body: 'الوصول إلى إعدادات الحساب والتبديل بين الشركات وتغيير اللغة والمظهر وإدارة الإشعارات — كل ذلك من قائمة ملفك الشخصي.',
    placement: 'top',
  },
];

export function getDashboardTourSteps(language: 'en' | 'ar'): TourStep[] {
  return language === 'ar' ? DASHBOARD_TOUR_STEPS_AR : DASHBOARD_TOUR_STEPS_EN;
}
