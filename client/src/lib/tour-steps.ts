import type { TourStep } from './tour';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const DASHBOARD_TOUR_STEPS: Record<'en' | 'ar', TourStep[]> = {
  en: [
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
      body: 'These cards give you a live snapshot of your activity — active tenders, total offers received, and tenders closing soon.',
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
  ],
  ar: [
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
      body: 'تُظهر هذه البطاقات لمحة حية عن نشاطك — المناقصات النشطة وإجمالي العروض المستلمة والمناقصات القريبة من الإغلاق.',
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
  ],
};

// ─── Tender Create Choice ─────────────────────────────────────────────────────

export const TENDER_CREATE_TOUR_STEPS: Record<'en' | 'ar', TourStep[]> = {
  en: [
    {
      id: 'ai-choice',
      target: '[data-tour="ai-choice"]',
      title: 'Let AI do the heavy lifting',
      body: 'Have a conversation with our AI Copilot and it will write a complete, professional tender for you — titles, scope, evaluation criteria, and more.',
      placement: 'top',
    },
    {
      id: 'manual-choice',
      target: '[data-tour="manual-choice"]',
      title: 'Prefer full control?',
      body: 'Fill in each section yourself with our guided step-by-step form. Great when you already know exactly what you need.',
      placement: 'top',
    },
  ],
  ar: [
    {
      id: 'ai-choice',
      target: '[data-tour="ai-choice"]',
      title: 'دع الذكاء الاصطناعي يتولى المهمة',
      body: 'تحدث مع مساعد الذكاء الاصطناعي وسيكتب لك مناقصة كاملة واحترافية — العناوين والنطاق ومعايير التقييم وأكثر.',
      placement: 'top',
    },
    {
      id: 'manual-choice',
      target: '[data-tour="manual-choice"]',
      title: 'تفضّل التحكم الكامل؟',
      body: 'أملأ كل قسم بنفسك باستخدام نموذجنا الموجّه خطوة بخطوة. مثالي عندما تعرف بالضبط ما تحتاجه.',
      placement: 'top',
    },
  ],
};

// ─── AI Copilot ───────────────────────────────────────────────────────────────

export const AI_COPILOT_TOUR_STEPS: Record<'en' | 'ar', TourStep[]> = {
  en: [
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Jump-start with a template',
      body: 'Pick a category that matches your project and the AI will pre-fill the conversation with the right context to get started fast.',
      placement: 'bottom',
    },
    {
      id: 'chat-orb',
      target: '[data-tour="chat-orb"]',
      title: 'Your AI assistant',
      body: 'Click the orb to start, or just type below. Describe what you need in plain language — the AI will ask follow-up questions and build your tender as you chat.',
      placement: 'bottom',
    },
    {
      id: 'preview-toggle',
      target: '[data-tour="preview-toggle"]',
      title: 'Watch your tender take shape',
      body: 'Toggle this panel to see your tender draft update in real-time as you chat. When it looks good, hit "Launch" to publish it.',
      placement: 'left',
    },
  ],
  ar: [
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'ابدأ بسرعة باستخدام قالب',
      body: 'اختر فئة تناسب مشروعك وسيقوم الذكاء الاصطناعي بملء المحادثة بالسياق المناسب للبدء بسرعة.',
      placement: 'bottom',
    },
    {
      id: 'chat-orb',
      target: '[data-tour="chat-orb"]',
      title: 'مساعدك الذكي',
      body: 'انقر على الكرة للبدء أو اكتب في الأسفل. صِف ما تحتاجه بلغة بسيطة — سيطرح الذكاء الاصطناعي أسئلة متابعة ويبني مناقصتك أثناء المحادثة.',
      placement: 'bottom',
    },
    {
      id: 'preview-toggle',
      target: '[data-tour="preview-toggle"]',
      title: 'شاهد مناقصتك تتشكل',
      body: 'بدّل هذه اللوحة لترى مسودة مناقصتك تتحدث في الوقت الفعلي. عندما تبدو جيدة، اضغط "إطلاق" لنشرها.',
      placement: 'right',
    },
  ],
};

// ─── Tender Details ───────────────────────────────────────────────────────────

export const TENDER_DETAILS_TOUR_STEPS: Record<'en' | 'ar', TourStep[]> = {
  en: [
    {
      id: 'offers-section',
      target: '[data-tour="offers-section"]',
      title: 'Vendor proposals are here',
      body: 'All submitted proposals appear in this section. Expand each one to view files, pricing, and submission details.',
      placement: 'top',
    },
    {
      id: 'negotiate-banner',
      target: '[data-tour="negotiate-banner"]',
      title: 'Negotiate before you decide',
      body: 'Enter negotiation mode to send discount requests, ask for resubmissions, or open a direct conversation with any vendor — without committing to an award.',
      placement: 'top',
    },
    {
      id: 'proposal-comparison',
      target: '[data-tour="proposal-comparison"]',
      title: 'AI-powered comparison',
      body: 'When you have 2+ proposals, BID automatically scores and ranks them side-by-side based on the evaluation criteria you set. Use this to award with confidence.',
      placement: 'top',
    },
  ],
  ar: [
    {
      id: 'offers-section',
      target: '[data-tour="offers-section"]',
      title: 'عروض الموردين هنا',
      body: 'تظهر جميع العروض المقدمة في هذا القسم. وسّع كل عرض لعرض الملفات والأسعار وتفاصيل التقديم.',
      placement: 'top',
    },
    {
      id: 'negotiate-banner',
      target: '[data-tour="negotiate-banner"]',
      title: 'تفاوض قبل اتخاذ القرار',
      body: 'ادخل وضع التفاوض لإرسال طلبات الخصم أو طلب إعادة التقديم أو فتح محادثة مباشرة مع أي مورد — دون الالتزام بإحالة.',
      placement: 'top',
    },
    {
      id: 'proposal-comparison',
      target: '[data-tour="proposal-comparison"]',
      title: 'مقارنة بالذكاء الاصطناعي',
      body: 'عندما يكون لديك عرضان أو أكثر، يقوم BID تلقائيًا بتسجيل النقاط وترتيبها جنبًا إلى جنب بناءً على معايير التقييم التي حددتها. استخدم هذا لإحالة العقود بثقة.',
      placement: 'top',
    },
  ],
};

// ─── Vendors Base ─────────────────────────────────────────────────────────────

export const VENDORS_BASE_TOUR_STEPS: Record<'en' | 'ar', TourStep[]> = {
  en: [
    {
      id: 'vendors-tabs',
      target: '[data-tour="vendors-tabs"]',
      title: 'Your vendor database',
      body: 'Two tabs, two jobs: "Vendors" is your approved list you can invite to any tender. "Join Requests" is where vendors who found your company page ask to be added.',
      placement: 'bottom',
    },
    {
      id: 'vendors-search',
      target: '[data-tour="vendors-search"]',
      title: 'Find any vendor instantly',
      body: 'Search by company name, contact name, or category. The results update as you type — no need to press Enter.',
      placement: 'bottom',
    },
    {
      id: 'vendors-requests-tab',
      target: '[data-tour="vendors-requests-tab"]',
      title: 'Review new applications',
      body: 'When a vendor requests to join your base you\'ll see a badge here. Approve to add them to your list, or reject with a reason that gets sent to them by email.',
      placement: 'bottom',
    },
  ],
  ar: [
    {
      id: 'vendors-tabs',
      target: '[data-tour="vendors-tabs"]',
      title: 'قاعدة بيانات الموردين',
      body: 'علامتا تبويب، مهمتان: "الموردون" قائمتك المعتمدة التي يمكنك دعوتهم لأي مناقصة. "طلبات الانضمام" يطلب فيها الموردون الانضمام لشركتك.',
      placement: 'bottom',
    },
    {
      id: 'vendors-search',
      target: '[data-tour="vendors-search"]',
      title: 'ابحث عن أي مورد فوراً',
      body: 'ابحث باسم الشركة أو اسم جهة الاتصال أو الفئة. تتحدث النتائج أثناء الكتابة دون الحاجة للضغط على Enter.',
      placement: 'bottom',
    },
    {
      id: 'vendors-requests-tab',
      target: '[data-tour="vendors-requests-tab"]',
      title: 'مراجعة الطلبات الجديدة',
      body: 'عندما يطلب مورد الانضمام لقاعدتك سترى شارة هنا. وافق لإضافته لقائمتك، أو ارفض مع سبب يُرسل له عبر البريد الإلكتروني.',
      placement: 'bottom',
    },
  ],
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const SETTINGS_TOUR_STEPS: Record<'en' | 'ar', TourStep[]> = {
  en: [
    {
      id: 'settings-account-tab',
      target: '[data-tour="settings-account-tab"]',
      title: 'Your personal profile',
      body: 'Upload a profile picture, set your job title, timezone, and language. This info is visible to your team and vendors.',
      placement: 'right',
    },
    {
      id: 'settings-company-tab',
      target: '[data-tour="settings-company-tab"]',
      title: 'Your company profile',
      body: 'Add your company logo, display name, and bio. A complete company profile builds trust with vendors and speeds up verification.',
      placement: 'right',
    },
    {
      id: 'settings-team-section',
      target: '[data-tour="settings-team-section"]',
      title: 'Manage your team',
      body: 'Invite teammates and assign roles. Owners and Admins can create tenders and manage vendors. Members and Viewers have read-only access.',
      placement: 'top',
    },
  ],
  ar: [
    {
      id: 'settings-account-tab',
      target: '[data-tour="settings-account-tab"]',
      title: 'ملفك الشخصي',
      body: 'ارفع صورة شخصية وحدد مسماك الوظيفي ومنطقتك الزمنية ولغتك. هذه المعلومات مرئية لفريقك والموردين.',
      placement: 'left',
    },
    {
      id: 'settings-company-tab',
      target: '[data-tour="settings-company-tab"]',
      title: 'ملف شركتك',
      body: 'أضف شعار شركتك واسمها ونبذة عنها. الملف الكامل يبني الثقة مع الموردين ويسرع عملية التحقق.',
      placement: 'left',
    },
    {
      id: 'settings-team-section',
      target: '[data-tour="settings-team-section"]',
      title: 'إدارة فريقك',
      body: 'ادعُ زملاءك وحدد أدوارهم. المالكون والمسؤولون يمكنهم إنشاء المناقصات وإدارة الموردين. الأعضاء والمشاهدون لديهم صلاحية القراءة فقط.',
      placement: 'top',
    },
  ],
};

// ─── Banner content (wizard step pages) ──────────────────────────────────────

export const TOUR_BANNERS = {
  tenderReview: {
    en: {
      title: 'Almost ready to launch',
      body: 'This is exactly how vendors will see your tender. Required fields are marked ★ — all must be filled before you can publish.',
    },
    ar: {
      title: 'على وشك الإطلاق',
      body: 'هذا بالضبط ما سيراه الموردون في مناقصتك. الحقول المطلوبة مميزة بـ★ — يجب ملؤها جميعاً قبل النشر.',
    },
  },
  submissionProcess: {
    en: {
      title: 'Choosing how vendors submit',
      body: '"Full Proposal" works best for complex projects. "Price Only" suits simple purchases. "Video Pitch" is great for creative or service-based work.',
    },
    ar: {
      title: 'اختيار طريقة تقديم الموردين',
      body: '"العرض الكامل" يناسب المشاريع المعقدة. "السعر فقط" يناسب المشتريات البسيطة. "عرض الفيديو" رائع للأعمال الإبداعية أو الخدمية.',
    },
  },
  evaluationCriteria: {
    en: {
      title: 'Setting your scoring weights',
      body: 'Distribute 100% across Experience, Financial, and Technical criteria. Once they add up to 100%, you\'ll unlock the vendor requirements section below.',
    },
    ar: {
      title: 'تحديد أوزان التسجيل',
      body: 'وزّع 100% على معايير الخبرة والمالية والتقنية. بمجرد أن تصل إلى 100%، ستتمكن من الوصول إلى قسم متطلبات الموردين أدناه.',
    },
  },
  formBuilder: {
    en: {
      title: 'Build your tender structure',
      body: 'Drag cards from the left panel onto the canvas to add sections. Required cards (marked ★) must stay. Add optional ones like Budget or Milestones to get richer proposals from vendors.',
    },
    ar: {
      title: 'ابنِ هيكل مناقصتك',
      body: 'اسحب البطاقات من اللوحة اليسرى إلى منطقة البناء. البطاقات المطلوبة (المميزة بـ★) إلزامية. أضف البطاقات الاختيارية مثل الميزانية أو المراحل للحصول على عروض أكثر تفصيلاً.',
    },
  },
  formFill: {
    en: {
      title: 'Fill in your tender details',
      body: 'Complete every required field — these are what vendors will read before submitting a proposal. The more detail you provide, the better the proposals you\'ll receive.',
    },
    ar: {
      title: 'أدخل تفاصيل مناقصتك',
      body: 'أكمل كل الحقول المطلوبة — هذا ما سيقرأه الموردون قبل تقديم عروضهم. كلما قدمت تفاصيل أكثر، كلما حصلت على عروض أفضل.',
    },
  },
  negotiationMode: {
    en: {
      title: 'You\'re in negotiation mode',
      body: 'You can now send a counter-offer, request a revised submission, or open a private chat with any vendor — without committing to an award yet. Exit when you\'re ready to decide.',
    },
    ar: {
      title: 'أنت الآن في وضع التفاوض',
      body: 'يمكنك الآن إرسال عرض مضاد أو طلب تقديم معدّل أو فتح محادثة خاصة مع أي مورد — دون الالتزام بالإحالة بعد. اخرج من الوضع عندما تكون مستعداً للقرار.',
    },
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

export function getSteps(
  map: Record<'en' | 'ar', TourStep[]>,
  language: string
): TourStep[] {
  return map[language === 'ar' ? 'ar' : 'en'];
}
