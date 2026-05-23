import { useAuthStore } from "./auth";

export type WorkspaceKind = "company" | "team" | "individual";

export function useWorkspaceKind(): WorkspaceKind {
  const { activeCompany } = useAuthStore();
  return (activeCompany?.accountType as WorkspaceKind) ?? "company";
}
