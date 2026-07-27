// Individuals get their own "/people/:slug" public profile URLs instead of
// "/company/:slug" — they aren't companies. Use this wherever a profile link
// is generated so the two account types stay consistent.
export function profilePath(entity: { slug: string; accountType?: string | null }): string {
  return entity.accountType === "individual" ? `/people/${entity.slug}` : `/company/${entity.slug}`;
}
