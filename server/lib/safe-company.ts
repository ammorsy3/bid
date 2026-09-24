// A company row carries things that must never leave the company it belongs to
// — above all `joinCode`, which is a bearer credential: anyone who types it
// becomes a member of that workspace instantly (POST /api/companies/join-by-code).
//
// Several queries used to attach the whole row to a response: the public
// marketplace listing, the public invitation lookup, and the offer lists a buyer
// and a vendor show each other. That published every company's join code to
// people outside it. Anything that hands a company to someone who is not in
// that company must go through safeCompany() first.

import type { Company } from "@shared/schema";

export type SafeCompany = Omit<Company, "joinCode" | "documents" | "ownerUserId">;

export function safeCompany(company: Company): SafeCompany {
  const { joinCode, documents, ownerUserId, ...rest } = company;
  return rest;
}
