-- 0017: company-level provenance for uploaded files (SEC-S4S5 r8).
-- Proposal: docs/ai/tasks/SEC-PROVENANCE-PROPOSAL.md (accepted revision f02d50f2…333).
--
-- Additive and backward compatible: three nullable columns, one check, one index.
-- Existing rows keep provenance NULL (= legacy: never bindable, never trusted for
-- the company rules; served only under the authorship fallback). Grants and RLS
-- on public.object_acl are deliberately left unchanged.
--
-- owner_company_id  the company the upload was issued for (server-set, never reassigned)
-- provenance        'company' | 'pending_onboarding' | NULL (legacy)
-- issued_at         server clock at issuance; bounds the onboarding binding window
--
-- NOT for automatic execution: apply per environment only with explicit approval.

alter table public.object_acl
  add column if not exists owner_company_id varchar references public.companies(id),
  add column if not exists provenance text,
  add column if not exists issued_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'object_acl_provenance_chk' and conrelid = 'public.object_acl'::regclass
  ) then
    alter table public.object_acl add constraint object_acl_provenance_chk check (
         provenance is null
      or (provenance = 'company'            and owner_company_id is not null)
      or (provenance = 'pending_onboarding' and owner_company_id is null and issued_at is not null)
    );
  end if;
end $$;

create index if not exists object_acl_owner_company_idx on public.object_acl (owner_company_id);

-- Rollback (separate approval; only before any row carries provenance):
--   drop index if exists object_acl_owner_company_idx;
--   alter table public.object_acl drop constraint if exists object_acl_provenance_chk;
--   alter table public.object_acl drop column if exists issued_at,
--     drop column if exists provenance, drop column if exists owner_company_id;
