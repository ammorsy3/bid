import { QueryClient, QueryFunction, MutationCache } from "@tanstack/react-query";
import { reportError } from "./errorLogger";
import { toast } from "@/hooks/use-toast";

export class ApiError extends Error {
  code?: string;
  statusCode: number;
  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    
    if (res.status === 401 || res.status === 403) {
      if (text.includes('token') || text.includes('Access token required') || text.includes('Invalid token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        const lang = localStorage.getItem('language') === 'ar' ? 'ar' : 'en';
        throw new Error(lang === 'ar' ? 'انتهت الجلسة. يُرجى تسجيل الدخول مرة أخرى.' : 'Session expired. Please log in again.');
      }
    }

    if (!res.url.includes('/api/errors')) {
      reportError({
        message: text || res.statusText || `HTTP ${res.status}`,
        statusCode: res.status,
        method: res.type || undefined,
        path: new URL(res.url).pathname,
      });
    }

    // Extract a user-friendly message from the response body
    let userMessage = res.statusText || 'Something went wrong';
    let code: string | undefined;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.message) {
          userMessage = parsed.message;
        }
        if (parsed.code) {
          code = parsed.code;
        }
      } catch {
        userMessage = text;
      }
    }
    throw new ApiError(userMessage, res.status, code);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Safety net: any mutation that does NOT define its own onError still surfaces
// a visible error toast, so a failed write can never fail silently. Mutations
// with their own onError keep full control of their UX (no double toast).
// Runs outside React, so it reads the language from localStorage directly.
const globalErrorFallback = {
  en: { title: "Something went wrong", desc: "The action couldn't be completed. Please try again." },
  ar: { title: "حدث خطأ ما", desc: "تعذّر إكمال العملية. يُرجى المحاولة مرة أخرى." },
};

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    if (mutation.options.onError) return; // the mutation handles its own errors
    const lang = localStorage.getItem('language') === 'ar' ? 'ar' : 'en';
    const fallback = globalErrorFallback[lang];
    toast({
      title: fallback.title,
      description: error instanceof Error && error.message ? error.message : fallback.desc,
      variant: "destructive",
    });
  },
});

export const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
