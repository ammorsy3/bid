import { useAuthStore } from "@/lib/auth";
import CompanyProfileEditor from "@/pages/CompanyProfileEditor";
import IndividualProfileEditor from "@/pages/IndividualProfileEditor";

// Picks the right profile editor for the active workspace. Individuals get the
// minimal, social-style editor; companies and teams keep the full editor.
export default function ProfileEditorRouter() {
  const accountType = useAuthStore((s) => s.activeCompany?.accountType);
  if (accountType === "individual") return <IndividualProfileEditor />;
  return <CompanyProfileEditor />;
}
