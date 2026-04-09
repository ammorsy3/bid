import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from './queryClient';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  isAdmin: boolean;
  profilePictureUrl: string | null;
  jobTitle: string | null;
  timezone: string | null;
  linkedinUrl: string | null;
  phoneNumber: string | null;
  tenderInquiryEmail: string | null;
  language: 'en' | 'ar' | null;
  emailVerified: boolean;
  otpVerified: boolean;
}

interface CompanyProfile {
  displayName: string;
  bio: string | null;
  logoUrl: string | null;
  headerUrl: string | null;
  brochureUrl: string | null;
  socialLinks: Record<string, string> | null;
  isPublic: boolean;
  tractionSlug: string | null;
  tractionTheme: {
    themeId: string;
    primaryColor: string;
    accentColor: string;
    headerStyle: string;
    ctaText?: string;
    welcomeHeading?: string;
    welcomeSubtext?: string;
  } | null;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string;
  onboardingState: string;
  role: string; // User's role in this company: 'owner' | 'admin' | 'member' | 'viewer'
  profile: CompanyProfile | null;
}

interface AuthState {
  // User data
  user: User | null;
  token: string | null;
  
  // Company context
  activeCompany: Company | null;
  companies: Company[];
  
  // UI state
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string, trustedBrowserToken?: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  updateCompanies: (companies: Company[], activeCompany: Company | null) => void;
}

// Sync language between DB and localStorage.
// DB is source of truth if it has a value; otherwise push localStorage value to DB.
function syncLanguageFromUser(user: User | null, token: string | null) {
  if (!user) return;
  const localLang = localStorage.getItem('language') as 'en' | 'ar' | null;

  if (user.language === 'ar' || user.language === 'en') {
    // DB has a value — use it as source of truth
    localStorage.setItem('language', user.language);
  } else if ((localLang === 'ar' || localLang === 'en') && token) {
    // DB has no value but localStorage does — push to DB
    fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: user.name, language: localLang }),
    }).catch(() => {});
  }
}

// ============================================================================
// AUTH STORE
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      activeCompany: null,
      companies: [],
      isLoading: false,

      login: async (email: string, password: string, trustedBrowserToken?: string) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest('POST', '/api/auth/login', { email, password, trustedBrowserToken });
          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token,
            activeCompany: data.activeCompany || null,
            companies: data.companies || [],
            isLoading: false
          });

          // Set authorization header for future requests
          localStorage.setItem('token', data.token);
          syncLanguageFromUser(data.user, data.token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: any) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest('POST', '/api/auth/register', userData);
          const data = await response.json();

          set({
            user: data.user,
            token: data.token,
            activeCompany: data.autoJoinedCompany ?? null,
            companies: data.companies ?? [],
            isLoading: false
          });

          localStorage.setItem('token', data.token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        // Note: trustedBrowserToken is intentionally kept — it should survive logout
        // so the user doesn't need OTP again on re-login within 7 days
        set({
          user: null,
          token: null,
          activeCompany: null,
          companies: []
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            set({
              user: data.user,
              token,
              activeCompany: data.companies.find((c: Company) => c.id === data.activeCompanyId) || null,
              companies: data.companies || []
            });
            syncLanguageFromUser(data.user, token);
          } else {
            localStorage.removeItem('token');
            set({ 
              user: null, 
              token: null,
              activeCompany: null,
              companies: []
            });
          }
        } catch (error) {
          localStorage.removeItem('token');
          set({ 
            user: null, 
            token: null,
            activeCompany: null,
            companies: []
          });
        }
      },

      switchCompany: async (companyId: string) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest('POST', `/api/companies/switch/${companyId}`, {});
          const data = await response.json();
          
          set({ 
            token: data.token,
            activeCompany: data.activeCompany,
            isLoading: false 
          });

          // Update token in localStorage
          localStorage.setItem('token', data.token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateCompanies: (companies: Company[], activeCompany: Company | null) => {
        set({ companies, activeCompany });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        activeCompany: state.activeCompany,
        companies: state.companies
      }),
    }
  )
);
