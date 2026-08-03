import type { WorkspaceKind } from "./useWorkspaceKind";

type DbRole = "owner" | "admin" | "business_developer" | "member" | "viewer";

// NOTE: the team column historically labelled the `member` role "Business Dev",
// because no real business_developer role existed on the server. It does now
// (routes.ts roleHierarchy, level 2.5), so `business_developer` gets its own
// label here. The legacy `member: "Business Dev"` mapping is left as-is on
// purpose — changing it would relabel every existing team member — but it means
// two distinct roles currently render the same string for teams. See Q-018.
const ROLE_LABELS: Record<WorkspaceKind, Partial<Record<DbRole, string>>> = {
  company: {
    owner: "Owner",
    admin: "Admin",
    business_developer: "Business Dev",
    member: "Member",
    viewer: "Viewer",
  },
  team: {
    owner: "Admin",
    admin: "Admin",
    business_developer: "Business Dev",
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
