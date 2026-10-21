-- Historical provenance audit (SEC-S4S5 proposal C / C-4; revised r9 for Codex R8-R3).
-- PREPARED FOR REVIEW — run only with explicit approval naming the environment.
-- Output: ONE row of integer counts. No paths, IDs, names or file contents.
-- Results describe only the environment it runs in: development results are not
-- evidence about production data. Counts flag candidates, not proven abuse.
--
-- LIMITATION (cannot be closed by this audit): the original ACL backfill set
-- object_acl.owner_id FROM the referencing rows. If a forged reference existed when
-- it ran, the forger may be the recorded owner, so "owner = record author" checks
-- (c5_*) return FALSE NEGATIVES for exactly that laundering case. The only signal
-- this schema still holds is that the genuine record usually references the same
-- path too (c1_* multi-company paths). If the genuine reference was deleted, nothing
-- here can detect it. See the recovery policy in docs/ai/tasks/SEC-S4S5.md (r9).
begin read only;
set local statement_timeout = '60s';
set local lock_timeout = '2s';

with refs as (           -- every managed file reference: path, referencing company, record author, kind
  select o.technical_file_url as p, o.company_id as c, o.created_by as author, 'offer' as kind from offers o where o.technical_file_url like '/objects/%'
  union all select o.financial_file_url, o.company_id, o.created_by, 'offer' from offers o where o.financial_file_url like '/objects/%'
  union all select o.combined_file_url,  o.company_id, o.created_by, 'offer' from offers o where o.combined_file_url  like '/objects/%'
  -- attachments: only a JSON array, and only object elements with a string url (JSON null / scalars / odd shapes are skipped, and counted below)
  union all select a->>'url', t.company_id, t.created_by, 'request'
              from tenders t cross join lateral jsonb_array_elements(case when jsonb_typeof(t.attachments) = 'array' then t.attachments else '[]'::jsonb end) a
             where jsonb_typeof(a) = 'object' and jsonb_typeof(a->'url') = 'string' and a->>'url' like '/objects/%'
  union all select t.voice_note_url, t.company_id, t.created_by, 'request' from tenders t where t.voice_note_url like '/objects/%'
  union all select t.video_url,      t.company_id, t.created_by, 'request' from tenders t where t.video_url      like '/objects/%'
  union all select v.p, cp.company_id, c.owner_user_id, 'brand'
              from company_profiles cp join companies c on c.id = cp.company_id
              cross join lateral (values (cp.logo_url), (cp.logo_original_url), (cp.header_url), (cp.header_original_url), (cp.brochure_url)) v(p)
             where v.p like '/objects/%'
  -- verification documents (an access-granting path: company members and platform admins)
  union all select d.file_url, d.company_id, d.uploaded_by, 'verification' from company_documents d where d.file_url like '/objects/%'
),
multi as (select p from refs group by p having count(distinct c) > 1)
select
  -- C-0 inventory size
  (select count(*) from refs)                                                                                         as c0_references,
  (select count(distinct p) from refs)                                                                                as c0_distinct_objects,
  -- C-1 paths referenced by records of more than one company (cross-company reuse, forgery or laundering candidates)
  (select count(*) from multi)                                                                                        as c1_multi_company_objects,
  (select count(*) from refs r where r.p in (select p from multi))                                                    as c1_multi_company_references,
  -- C-2 request files whose ACL owner is not the request author (legacy colleague uploads: hidden until re-upload)
  (select count(*) from refs r join object_acl o on o.object_path = r.p where r.kind = 'request' and o.owner_id is distinct from r.author) as c2_request_references_not_author,
  (select count(distinct r.p) from refs r join object_acl o on o.object_path = r.p where r.kind = 'request' and o.owner_id is distinct from r.author) as c2_request_objects_not_author,
  -- C-3 referenced private uploads with no ACL row (denied to everyone)
  (select count(*) from refs r where r.p like '/objects/uploads/%' and not exists (select 1 from object_acl o where o.object_path = r.p)) as c3_references_without_acl,
  (select count(distinct r.p) from refs r where r.p like '/objects/uploads/%' and not exists (select 1 from object_acl o where o.object_path = r.p)) as c3_objects_without_acl,
  -- C-4 brand references neither public nor attributed to the company owner (hidden until re-upload)
  (select count(*) from refs r left join object_acl o on o.object_path = r.p
     where r.kind = 'brand' and r.p like '/objects/uploads/%'
       and (o.object_path is null or (o.visibility <> 'public' and o.owner_id is distinct from r.author)))                 as c4_untrusted_brand_references,
  -- C-5 offer and verification references whose ACL owner is not the record author (FALSE NEGATIVES for laundering — see header)
  (select count(*) from refs r join object_acl o on o.object_path = r.p where r.kind = 'offer' and o.owner_id is distinct from r.author) as c5_offer_references_not_author,
  (select count(*) from refs r join object_acl o on o.object_path = r.p where r.kind = 'verification' and o.owner_id is distinct from r.author) as c5_verification_references_not_author,
  -- C-6 users who are or were members of more than one company (scope of multi-company exposure)
  (select count(*) from (select user_id from user_companies group by user_id having count(distinct company_id) > 1) x) as c6_multi_company_users,
  -- C-7 tenders whose attachments column is JSON null / scalar / non-array (skipped by the inventory above)
  (select count(*) from tenders t where t.attachments is not null and jsonb_typeof(t.attachments) <> 'array')         as c7_non_array_attachments;

rollback;
