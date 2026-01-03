// Super intelligent context-aware suggestion engine
// Predicts what users want based on their previous inputs

import { capitalizeSentences } from './capitalize-helpers';

interface ProjectContext {
  title?: string;
  projectType?: string;
  objective?: string;
  deliverables?: string[];
}

interface ProjectPattern {
  keywords: string[];
  objectives: string[];
  deliverables: string[];
  descriptions: string[];
}

// Comprehensive project patterns - maps project types to likely objectives and deliverables
const PROJECT_PATTERNS: Record<string, ProjectPattern> = {
  // Social Media
  "social_media": {
    keywords: ["social media", "instagram", "facebook", "twitter", "linkedin", "tiktok", "social", "posts"],
    objectives: [
      "Manage and grow my social media presence",
      "Increase social media engagement and followers",
      "Build brand awareness on social platforms",
      "Create engaging social media content strategy",
      "Boost social media visibility and reach",
      "Establish strong social media community",
      "Drive traffic from social media channels",
      "Improve social media ROI and conversions",
      "Enhance brand presence across social platforms",
      "Generate leads through social media marketing",
    ],
    deliverables: [
      "social media posts",
      "content calendar",
      "caption writing",
      "hashtag research",
      "Instagram templates",
      "Facebook graphics",
      "story templates",
      "posting schedule",
      "engagement strategy",
      "social media analytics",
      "performance reports",
      "community management",
      "influencer outreach",
      "competitor analysis",
      "audience insights",
    ],
    descriptions: [
      "seeking experienced social media manager to",
      "looking for creative social media specialist who",
      "need professional to handle our social platforms",
      "require expert in social media growth and",
      "planning to expand our social media presence",
    ],
  },

  // Web Development
  "web_development": {
    keywords: ["website", "web", "develop", "site", "online", "landing page", "responsive", "frontend", "backend"],
    objectives: [
      "Build professional website for my business",
      "Create modern online presence for brand",
      "Launch responsive website to attract customers",
      "Develop custom website with excellent UX",
      "Establish professional digital presence online",
      "Modernize existing website with latest features",
      "Increase online visibility and credibility",
      "Provide seamless user experience for visitors",
      "Generate leads through optimized website",
      "Showcase products and services professionally",
    ],
    deliverables: [
      "responsive design",
      "mobile responsive",
      "website deployment",
      "contact form",
      "SEO optimization",
      "Google Analytics",
      "admin dashboard",
      "content management",
      "SSL certificate",
      "hosting configuration",
      "performance optimization",
      "cross-browser compatibility",
      "user authentication",
      "payment integration",
      "database integration",
    ],
    descriptions: [
      "seeking experienced web developer to build",
      "looking for talented developer who can create",
      "need professional website that represents our brand",
      "require modern responsive website with clean design",
      "planning to launch professional website that converts",
    ],
  },

  // E-commerce
  "ecommerce": {
    keywords: ["shop", "store", "ecommerce", "e-commerce", "shopify", "woocommerce", "product", "cart"],
    objectives: [
      "Launch online store to sell products",
      "Increase online sales and revenue",
      "Create seamless shopping experience for customers",
      "Expand business into e-commerce market",
      "Build professional online store with easy checkout",
      "Drive product sales through optimized store",
      "Establish credible online shopping platform",
      "Maximize conversion rates and customer satisfaction",
      "Grow online retail business efficiently",
      "Provide excellent shopping experience for buyers",
    ],
    deliverables: [
      "shopping cart",
      "payment gateway",
      "product catalog",
      "checkout system",
      "inventory management",
      "order management",
      "customer accounts",
      "shipping integration",
      "tax calculation",
      "discount system",
      "product filtering",
      "search functionality",
      "wishlist feature",
      "email notifications",
      "admin dashboard",
    ],
    descriptions: [
      "seeking experienced e-commerce developer to create",
      "looking for specialist to build online store",
      "need professional to develop shopping platform that",
      "require expert in e-commerce solutions who can",
      "planning to launch online store with seamless",
    ],
  },

  // Logo & Branding
  "logo_branding": {
    keywords: ["logo", "brand", "identity", "branding", "visual identity", "rebrand"],
    objectives: [
      "Create memorable brand identity for business",
      "Establish strong visual presence in market",
      "Build recognizable brand that stands out",
      "Modernize brand image and visual identity",
      "Develop professional brand identity system",
      "Strengthen brand recognition and credibility",
      "Launch new brand with cohesive visual style",
      "Differentiate brand from competitors visually",
      "Create lasting impression with target audience",
      "Establish trustworthy and professional brand image",
    ],
    deliverables: [
      "logo variations",
      "brand guidelines",
      "color palette",
      "typography guide",
      "business cards",
      "letterhead design",
      "brand assets",
      "style guide",
      "social templates",
      "vector files",
      "source files",
      "brand book",
      "usage guidelines",
      "email signatures",
      "presentation template",
    ],
    descriptions: [
      "seeking talented designer to create unique brand",
      "looking for creative professional who can develop",
      "need professional brand identity that reflects our",
      "require memorable logo and cohesive brand system",
      "planning to establish strong visual identity that",
    ],
  },

  // Video Editing
  "video": {
    keywords: ["video", "edit", "footage", "youtube", "content creator", "vlog", "reel", "animation"],
    objectives: [
      "Create engaging video content for audience",
      "Produce professional videos to promote brand",
      "Build YouTube channel with quality content",
      "Increase engagement through compelling videos",
      "Establish video content strategy for growth",
      "Create viral-worthy content for social media",
      "Produce educational videos for customers",
      "Showcase products through professional videography",
      "Build audience with consistent video content",
      "Drive conversions through video marketing",
    ],
    deliverables: [
      "edited video",
      "final cut",
      "color grading",
      "audio mixing",
      "motion graphics",
      "intro animation",
      "outro animation",
      "thumbnail design",
      "subtitle files",
      "multiple formats",
      "HD quality",
      "sound effects",
      "background music",
      "visual effects",
      "transitions",
    ],
    descriptions: [
      "seeking skilled video editor who can transform",
      "looking for creative editor to produce engaging",
      "need professional video editing that captivates",
      "require expert who can create polished videos",
      "planning to produce high-quality video content that",
    ],
  },

  // Marketing & Advertising
  "marketing_ads": {
    keywords: ["marketing", "ads", "campaign", "advertising", "facebook ads", "google ads", "ppc"],
    objectives: [
      "Generate qualified leads for business growth",
      "Increase sales through targeted advertising campaigns",
      "Build brand awareness in target market",
      "Drive conversions with optimized ad campaigns",
      "Maximize ROI on advertising spend",
      "Reach ideal customers through strategic marketing",
      "Grow business with effective marketing strategy",
      "Increase website traffic and conversions",
      "Build customer base through paid advertising",
      "Establish market presence and brand recognition",
    ],
    deliverables: [
      "ad campaign",
      "marketing strategy",
      "ad creatives",
      "ad copy",
      "targeting strategy",
      "landing pages",
      "campaign optimization",
      "performance reports",
      "A/B testing",
      "analytics dashboard",
      "ROI analysis",
      "competitor analysis",
      "audience research",
      "conversion tracking",
      "monthly reports",
    ],
    descriptions: [
      "seeking experienced marketer to drive results and",
      "looking for advertising expert who can generate",
      "need professional marketing strategist to help us",
      "require proven ad specialist who can maximize",
      "planning to launch marketing campaign that delivers",
    ],
  },

  // SEO & Content
  "seo_content": {
    keywords: ["seo", "content", "blog", "article", "copywriting", "writer", "keyword"],
    objectives: [
      "Increase organic traffic to website",
      "Improve search engine rankings for keywords",
      "Build authority through quality content",
      "Drive qualified traffic from search engines",
      "Establish thought leadership in industry",
      "Generate leads through content marketing",
      "Boost website visibility on Google",
      "Create valuable content for target audience",
      "Improve online discoverability and reach",
      "Build sustainable organic traffic growth",
    ],
    deliverables: [
      "SEO optimization",
      "keyword research",
      "blog posts",
      "SEO articles",
      "meta descriptions",
      "meta titles",
      "content strategy",
      "on-page SEO",
      "link building",
      "competitor analysis",
      "content calendar",
      "website content",
      "product descriptions",
      "analytics setup",
      "performance tracking",
    ],
    descriptions: [
      "seeking experienced SEO specialist to boost our",
      "looking for content writer who can create engaging",
      "need professional who understands SEO and can",
      "require expert copywriter to produce content that",
      "planning to improve search rankings through quality",
    ],
  },

  // Graphic Design
  "graphic_design": {
    keywords: ["graphic", "design", "flyer", "poster", "banner", "brochure", "print"],
    objectives: [
      "Create eye-catching marketing materials for campaigns",
      "Build professional visual assets for brand",
      "Design compelling graphics to attract customers",
      "Establish consistent visual communication style",
      "Produce print materials that represent brand well",
      "Create impactful designs that drive engagement",
      "Develop versatile graphics for multiple channels",
      "Strengthen visual presence across all materials",
      "Design memorable promotional materials",
      "Communicate brand message through great design",
    ],
    deliverables: [
      "banner design",
      "flyer design",
      "poster design",
      "brochure design",
      "business cards",
      "print-ready files",
      "social media graphics",
      "ad creatives",
      "presentation design",
      "infographic design",
      "brand assets",
      "marketing collateral",
      "vector files",
      "high resolution",
      "editable templates",
    ],
    descriptions: [
      "seeking creative graphic designer who can produce",
      "looking for talented designer to create stunning",
      "need professional graphics that capture attention and",
      "require skilled designer with strong portfolio to",
      "planning to develop visual materials that stand out",
    ],
  },

  // Mobile App
  "mobile_app": {
    keywords: ["app", "mobile", "ios", "android", "react native", "flutter"],
    objectives: [
      "Launch mobile app to serve customers better",
      "Expand business reach through mobile platform",
      "Provide convenient mobile experience for users",
      "Build innovative app to solve customer problems",
      "Create engaging mobile solution for target market",
      "Establish mobile presence in competitive market",
      "Drive user engagement through mobile app",
      "Monetize through mobile application platform",
      "Improve customer experience with mobile access",
      "Scale business with mobile-first approach",
    ],
    deliverables: [
      "iOS app",
      "Android app",
      "app design",
      "user authentication",
      "push notifications",
      "API integration",
      "payment integration",
      "admin dashboard",
      "app deployment",
      "app store optimization",
      "user onboarding",
      "analytics integration",
      "testing report",
      "documentation",
      "source code",
    ],
    descriptions: [
      "seeking experienced mobile developer to build robust",
      "looking for app developer who can create intuitive",
      "need professional to develop mobile app that users",
      "require expert in mobile development who can deliver",
      "planning to launch mobile app with excellent UX",
    ],
  },

  // Virtual Assistant
  "virtual_assistant": {
    keywords: ["virtual assistant", "admin", "administrative", "assistant", "support"],
    objectives: [
      "Streamline daily operations and administrative tasks",
      "Free up time to focus on core business",
      "Improve productivity and operational efficiency",
      "Manage routine tasks professionally and reliably",
      "Maintain organized business operations smoothly",
      "Handle administrative workload efficiently",
      "Support business growth through excellent admin",
      "Ensure smooth day-to-day business operations",
      "Optimize time management and task completion",
      "Reduce operational overhead and stress",
    ],
    deliverables: [
      "email management",
      "calendar management",
      "data entry",
      "customer support",
      "document preparation",
      "research tasks",
      "travel arrangements",
      "meeting coordination",
      "file organization",
      "social media management",
      "invoice processing",
      "appointment scheduling",
      "report preparation",
      "correspondence handling",
      "task prioritization",
    ],
    descriptions: [
      "seeking reliable virtual assistant who can handle",
      "looking for organized professional to manage daily",
      "need dependable assistant to support business with",
      "require experienced VA who can efficiently manage",
      "planning to delegate administrative tasks to trusted",
    ],
  },

  // Data & Analytics
  "data_analytics": {
    keywords: ["data", "analytics", "analysis", "excel", "dashboard", "reporting", "insights"],
    objectives: [
      "Make data-driven business decisions confidently",
      "Gain actionable insights from business data",
      "Understand customer behavior and trends better",
      "Optimize operations through data analysis",
      "Track key metrics and performance indicators",
      "Identify growth opportunities through analytics",
      "Improve decision-making with clear reporting",
      "Measure ROI and business performance accurately",
      "Transform raw data into strategic insights",
      "Build data infrastructure for informed decisions",
    ],
    deliverables: [
      "data analysis",
      "analytics dashboard",
      "performance reports",
      "data visualization",
      "Excel automation",
      "KPI tracking",
      "trend analysis",
      "predictive modeling",
      "custom reports",
      "data cleaning",
      "database setup",
      "reporting automation",
      "business intelligence",
      "insights documentation",
      "presentation deck",
    ],
    descriptions: [
      "seeking data analyst who can extract meaningful",
      "looking for analytics expert to help us understand",
      "need professional who can transform data into",
      "require skilled analyst to provide actionable insights",
      "planning to leverage data for better business",
    ],
  },
};

// Intelligent suggestion engine that predicts based on context
export class SmartSuggestionEngine {
  private context: ProjectContext = {};

  // Update context with new information
  updateContext(field: string, value: string | string[]) {
    if (field === "title") {
      this.context.title = value as string;
    } else if (field === "projectType") {
      this.context.projectType = value as string;
    } else if (field === "objective") {
      this.context.objective = value as string;
    } else if (field === "deliverables") {
      this.context.deliverables = value as string[];
    }
  }

  // Detect project type from title
  private detectProjectType(title: string): string | null {
    const lowerTitle = title.toLowerCase();

    for (const [type, pattern] of Object.entries(PROJECT_PATTERNS)) {
      for (const keyword of pattern.keywords) {
        if (lowerTitle.includes(keyword.toLowerCase())) {
          return type;
        }
      }
    }
    return null;
  }

  // Get smart suggestions based on context
  getSmartSuggestions(field: "objective" | "deliverable" | "description"): string[] {
    // Detect project type from title
    const projectType = this.context.title ? this.detectProjectType(this.context.title) : null;

    if (!projectType || !PROJECT_PATTERNS[projectType]) {
      return []; // No context-aware suggestions
    }

    const pattern = PROJECT_PATTERNS[projectType];

    let suggestions: string[] = [];
    switch (field) {
      case "objective":
        suggestions = pattern.objectives;
        break;
      case "deliverable":
        suggestions = pattern.deliverables;
        break;
      case "description":
        suggestions = pattern.descriptions;
        break;
      default:
        return [];
    }

    // Apply proper capitalization
    return capitalizeSentences(suggestions);
  }

  // Get top N smart suggestions for quick chips
  getTopSuggestions(field: "objective", count: number = 3): string[] {
    const allSuggestions = this.getSmartSuggestions(field);
    return allSuggestions.slice(0, count);
  }

  // Get combined suggestions (smart + general)
  getCombinedSuggestions(field: "objective" | "deliverable" | "description", generalSuggestions: string[]): string[] {
    const smartSuggestions = this.getSmartSuggestions(field);

    if (smartSuggestions.length === 0) {
      return generalSuggestions;
    }

    // Prioritize smart suggestions, then add general ones
    const combined = [...smartSuggestions];

    // Add general suggestions that aren't already in smart suggestions
    for (const suggestion of generalSuggestions) {
      const suggestionLower = suggestion.toLowerCase();
      const alreadyExists = combined.some(s => s.toLowerCase() === suggestionLower);
      if (!alreadyExists) {
        combined.push(suggestion);
      }
    }

    return combined;
  }

  // Get current context
  getContext(): ProjectContext {
    return { ...this.context };
  }
}

// Export singleton instance
export const smartSuggestionEngine = new SmartSuggestionEngine();
