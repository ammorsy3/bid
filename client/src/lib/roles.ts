import type { WorkspaceKind } from "./useWorkspaceKind";

type DbRole = "owner" | "admin" | "business_developer" | "member" | "viewer";

// Maps to i18n KEYS, not literal strings. These used to be hardcoded English,
// so Arabic users saw "Owner" / "Admin" / "Business Dev" untranslated in the
// members list and the workspace switcher. The translations already existed —
// they just were not wired up.
//
// NOTE: the team column historically labelled the `member` role "Business Dev",
// because no real business_developer role existed on the server. It does now
// (routes.ts roleHierarchy, level 2.5), so `business_developer` gets its own
// entry. The legacy `member` mapping is left as-is on purpose — changing it
// would relabel every existing team member — but it does mean two distinct
// roles render the same string for teams. See Q-018.
const ROLE_LABEL_KEYS: Record<WorkspaceKind, Partial<Record<DbRole, string>>> = {
  company: {
    owner: "dashboard.roleOwner",
    admin: "dashboard.roleAdmin",
    business_developer: "settings.roleBusinessDeveloper",
    member: "dashboard.roleMember",
    viewer: "dashboard.roleViewer",
  },
  team: {
    owner: "dashboard.roleAdmin",
    admin: "dashboard.roleAdmin",
    business_developer: "settings.roleBusinessDeveloper",
    member: "settings.roleBusinessDeveloper",
    viewer: "dashboard.roleMember",
  },
  individual: {
    owner: "dashboard.roleOwner",
  },
};

/**
 * Human-readable role name for a workspace kind, translated.
 *
 * Takes `t` rather than importing it so this stays a pure function usable from
 * tests without an I18nProvider. Falls back to the raw role string for anything
 * unmapped, which is what a legacy or unexpected value should do rather than
 * rendering blank.
 */
export function displayRoleName(
  role: string,
  kind: WorkspaceKind,
  t: (key: string) => string,
): string {
  const key = ROLE_LABEL_KEYS[kind]?.[role as DbRole];
  return key ? t(key) : role;
}
