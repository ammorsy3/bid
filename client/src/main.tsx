import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { setupGlobalErrorHandlers } from "./lib/errorLogger";
import { CLERK_KEY, HAS_CLERK } from "./lib/clerkConfig";

setupGlobalErrorHandlers();

const root = createRoot(document.getElementById("root")!);

if (!HAS_CLERK) {
  console.warn("[Clerk] No publishable key found; social sign-in will be disabled.");
  root.render(<App />);
} else {
  root.render(
    <ClerkProvider publishableKey={CLERK_KEY!} afterSignOutUrl="/login">
      <App />
    </ClerkProvider>
  );
}
