import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { setupGlobalErrorHandlers } from "./lib/errorLogger";

setupGlobalErrorHandlers();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(document.getElementById("root")!);

if (!PUBLISHABLE_KEY) {
  console.warn("[Clerk] VITE_CLERK_PUBLISHABLE_KEY is not set; social sign-in will be disabled.");
  root.render(<App />);
} else {
  root.render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
      <App />
    </ClerkProvider>
  );
}
