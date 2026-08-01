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
      requiresMobileSidebar: true,
    },
    {
      id: 'create-tender',
      target: '[data-tour="create-tender"]',
      title: 'Start sourcing: Create a Tender',
      body: 'This is your primary action. Publish a tender to invite vendors to submit proposals — our AI Copilot can help you write it in minutes.',
      placement: 'right',
      requiresMobileSidebar: true,
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
      requiresMobileSidebar: true,
    },
  ],
  ar: [
    {
      id: 'sidebar-nav',
      target: '[data-tour="sidebar-nav"]',
      title: 'مركز التنقل',
      body: 'استخدم الشريط الجانبي للتنقّل بين طلبات العروض والعروض المقدمة والموردين والإعدادات. اضغط زر التبديل لطيّه لما تحتاج مساحة أكبر.',
      placement: 'left',
      requiresMobileSidebar: true,
    },
    {
      id: 'create-tender',
      target: '[data-tour="create-tender"]',
      title: 'ابدأ التوريد: أنشئ طلب عروض (RFP)',
      body: 'من هنا تنشئ طلب العروض (RFP) وتدعو الموردين للتقديم. يقدر المساعد الذكي يجهّز لك المسودة خلال دقائق.',
      placement: 'left',
      requiresMobileSidebar: true,
    },
    {
      id: 'dashboard-tabs',
      target: '[data-tour="dashboard-tabs"]',
      title: 'كل شيء في مكان واحد',
      body: 'تعطيك هذه البطاقات ملخصًا مباشرًا عن طلبات العروض النشطة، وإجمالي العروض المستلمة، والطلبات القريبة من الإغلاق.',
      placement: 'bottom',
    },
    {
      id: 'onboarding-tasks',
      target: '[data-tour="onboarding-tasks"]',
      title: 'تابع تقدّم الإعداد',
      body: 'أكمل الخطوات الخمس للاستفادة من كل مزايا Bid. كل مهمة تنقلك مباشرة إلى الإجراء المطلوب.',
      placement: 'top',
    },
    {
      id: 'user-menu',
      target: '[data-tour="user-menu"]',
      title: 'ملفك الشخصي والإعدادات',
      body: 'من قائمة ملفك تقدر تفتح الإعدادات، وتبدّل بين الحسابات، وتغيّر اللغة والمظهر، وتدير الإشعارات.',
      placement: 'top',
      requiresMobileSidebar: true,
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
      body: 'تحدّث مع المساعد الذكي، وبيجهّز لك طلب عروض (RFP) متكامل يشمل العنوان والنطاق ومعايير التقييم وغيرها.',
      placement: 'top',
    },
    {
      id: 'manual-choice',
      target: '[data-tour="manual-choice"]',
      title: 'تفضّل التحكم الكامل؟',
      body: 'املأ كل قسم بنفسك من خلال نموذج واضح خطوة بخطوة. هذا الخيار مناسب إذا كنت تعرف احتياجك بالتفصيل.',
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
  ],
  ar: [
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'ابدأ بسرعة باستخدام قالب',
      body: 'اختر الفئة الأقرب لمشروعك، وبيجهّز المساعد الذكي سياق المحادثة حتى تبدأ بسرعة.',
      placement: 'bottom',
    },
    {
      id: 'chat-orb',
      target: '[data-tour="chat-orb"]',
      title: 'مساعدك الذكي',
      body: 'اضغط الدائرة للبدء أو اكتب في الأسفل. صف احتياجك ببساطة، وبيسألك المساعد عن التفاصيل ويبني طلب العروض (RFP) معك.',
      placement: 'bottom',
    },
  ],
};

// The preview toggle only exists once the AI has actually produced a draft, which
// never happens before autoStartDelay fires on a fresh visit — so it runs as its own
// tour, triggered by that draft appearing rather than by a fixed timer. See
// TenderAICopilot.tsx's second usePageTour call.
export const AI_COPILOT_PREVIEW_TOUR_STEPS: Record<'en' | 'ar', TourStep[]> = {
  en: [
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
      id: 'preview-toggle',
      target: '[data-tour="preview-toggle"]',
      title: 'شاهد طلبك وهو يكتمل',
      body: 'افتح هذه اللوحة لمتابعة تحديث مسودة طلب العروض (RFP) أثناء المحادثة. لما تجهز، اضغط «نشر».',
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
      body: 'تظهر كل العروض المقدمة في هذا القسم. افتح أي عرض لمراجعة ملفاته وسعره وتفاصيله.',
      placement: 'top',
    },
    {
      id: 'negotiate-banner',
      target: '[data-tour="negotiate-banner"]',
      title: 'تفاوض قبل اتخاذ القرار',
      body: 'ادخل وضع التفاوض لطلب خصم أو عرض معدّل، أو لفتح محادثة مباشرة مع المورد قبل الترسية.',
      placement: 'top',
    },
    {
      id: 'proposal-comparison',
      target: '[data-tour="proposal-comparison"]',
      title: 'مقارنة بالذكاء الاصطناعي',
      body: 'إذا وصلك عرضان أو أكثر، يرتّبها Bid جنبًا إلى جنب حسب معايير التقييم التي حدّدتها، حتى تقارن وترسّي بثقة.',
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
      body: 'عندك تبويبان مهمان: «الموردون» لعرض قائمتك المعتمدة ودعوتهم للمناقصات، و«طلبات الانضمام» لمراجعة الموردين اللي طلبوا الانضمام لشركتك.',
      placement: 'bottom',
    },
    {
      id: 'vendors-search',
      target: '[data-tour="vendors-search"]',
      title: 'ابحث عن أي مورد بسرعة',
      body: 'ابحث باسم الشركة أو جهة الاتصال أو الفئة. تتحدّث النتائج أثناء الكتابة بدون الحاجة للضغط على Enter.',
      placement: 'bottom',
    },
    {
      id: 'vendors-requests-tab',
      target: '[data-tour="vendors-requests-tab"]',
      title: 'مراجعة الطلبات الجديدة',
      body: 'لما يطلب مورد الانضمام إلى قاعدتك تظهر شارة هنا. وافق لإضافته، أو ارفض الطلب وأضف السبب اللي بنرسله له.',
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
      body: 'ارفع صورتك وحدّد مسماك الوظيفي ومنطقتك الزمنية ولغتك. تظهر هذه المعلومات لفريقك والموردين.',
      placement: 'left',
    },
    {
      id: 'settings-company-tab',
      target: '[data-tour="settings-company-tab"]',
      title: 'ملف شركتك',
      body: 'أضف شعار شركتك واسمها ونبذة عنها. الملف المكتمل يبني الثقة مع الموردين ويسرّع التوثيق.',
      placement: 'left',
    },
    {
      id: 'settings-team-section',
      target: '[data-tour="settings-team-section"]',
      title: 'إدارة فريقك',
      body: 'ادعُ زملاءك وحدّد أدوارهم. يقدر المالكون والمسؤولون إنشاء طلبات العروض وإدارة الموردين، بينما تكون صلاحيات الأعضاء والمشاهدين محدودة.',
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
      body: 'هذه هي الصفحة اللي يشوفها الموردون. الحقول المعلّمة بـ★ مطلوبة، ولازم تكملها قبل النشر.',
    },
  },
  submissionProcess: {
    en: {
      title: 'Choosing how vendors submit',
      body: '"Full Proposal" works best for complex projects. "Price Only" suits simple purchases. "Video Pitch" is great for creative or service-based work.',
    },
    ar: {
      title: 'اختيار طريقة تقديم الموردين',
      body: '«العرض الكامل» يناسب المشاريع المعقّدة، و«السعر فقط» للمشتريات البسيطة، و«عرض الفيديو» للأعمال الإبداعية أو الخدمية.',
    },
  },
  evaluationCriteria: {
    en: {
      title: 'Setting your scoring weights',
      body: 'Distribute 100% across Experience, Financial, and Technical criteria. Once they add up to 100%, you\'ll unlock the vendor requirements section below.',
    },
    ar: {
      title: 'حدّد أوزان التقييم',
      body: 'وزّع 100% بين معايير الخبرة والجانب المالي والجانب التقني. لما يكتمل المجموع، يفتح لك قسم متطلبات الموردين.',
    },
  },
  formBuilder: {
    en: {
      title: 'Build your tender structure',
      body: 'Drag cards from the left panel onto the canvas to add sections. Required cards (marked ★) must stay. Add optional ones like Budget or Milestones to get richer proposals from vendors.',
    },
    ar: {
      title: 'ابنِ هيكل مناقصتك',
      body: 'اسحب البطاقات من اللوحة الجانبية إلى مساحة البناء. البطاقات المعلّمة بـ★ إلزامية، وتقدر تضيف الميزانية والمراحل وغيرها لاستقبال عروض أوضح.',
    },
  },
  formFill: {
    en: {
      title: 'Fill in your tender details',
      body: 'Complete every required field — these are what vendors will read before submitting a proposal. The more detail you provide, the better the proposals you\'ll receive.',
    },
    ar: {
      title: 'أدخل تفاصيل مناقصتك',
      body: 'أكمل كل الحقول المطلوبة؛ هذا هو المحتوى اللي يقرأه المورد قبل التقديم. كل ما وضّحت التفاصيل أكثر، صارت العروض أدق.',
    },
  },
  negotiationMode: {
    en: {
      title: 'You\'re in negotiation mode',
      body: 'You can now send a counter-offer, request a revised submission, or open a private chat with any vendor — without committing to an award yet. Exit when you\'re ready to decide.',
    },
    ar: {
      title: 'أنت الآن في وضع التفاوض',
      body: 'تقدر الآن ترسل عرضًا مضادًا، أو تطلب عرضًا معدّلًا، أو تفتح محادثة خاصة مع أي مورد. اخرج من وضع التفاوض لما تكون جاهزًا للقرار.',
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
