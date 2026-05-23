import type { WorkspaceKind } from "./useWorkspaceKind";

type DbRole = "owner" | "admin" | "member" | "viewer";

const ROLE_LABELS: Record<WorkspaceKind, Partial<Record<DbRole, string>>> = {
  company: {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
  },
  team: {
    owner: "Admin",
    admin: "Admin",
    member: "Business Dev",
    viewer: "Member",
  },
  individual: {
    owner: "Owner",
  },
};

export function displayRoleName(role: string, kind: WorkspaceKind): string {
  return ROLE_LABELS[kind]?.[role as DbRole] ?? role;
}
