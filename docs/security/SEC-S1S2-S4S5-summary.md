# Security and verification candidate — final source acceptance

Decision: **ACCEPTED FOR A SEPARATELY USER-AUTHORIZED LOCAL COMMIT; NOT RELEASE ACCEPTANCE.**

Astra's final architectural disposition uses Codex's independent-from-Claude reviews and explicitly attributed implementation evidence. Astra is the final-review role in the same conversation, not a second independent execution of all tests.

## Identity and included work

Base HEAD: `74b21114f883899c0cd1d20879fd5dcf8ebdc147`.
Accepted candidate revision 3 SHA256: `6410ea60502b1740472b96f97f7387bfdfc1f37dbe88207da812d2e913cc48f4` (59 files). This document is a separate documentation-only addition: the proposed commit scope is those exact 59 files plus this summary, 60 files total. Adding this summary does not redefine the 59-file candidate hash.

Includes Package A as a whole (verification journey and locking), SEC-S1S2, SEC-S4S5 through r9, PO/AI authorization repairs, migration 0017 as source only, historical audit as source only, and CG-8 test transport repair. No migration or audit execution is authorized by this acceptance.

Excludes AGENTS.md, CLAUDE.md, .agents/, .claude/, scripts/bid_loop/, docs/ai/, .mobile-audit/, RFQ implementation and packages B–E. Never stage the entire shared worktree indiscriminately.

## Final decisions

- PA-GAP-1 CLOSED: accept Package A at the exact cumulative identity above, including its mixed security hunks. No detached earlier Package A hash is substituted.
- PA-GAP-2 CLOSED: r5 test changes, r9 verification attachment checks, and CG-8 transport substitutions have proportionate independent security/source review plus regression evidence. No further product rewrite/review is required for these changes. Browser evidence remains Claude-attributed.
- PA-GAP-3: accept Claude's 148/148 mocked-browser evidence for source acceptance; no independent rerun is claimed.
- CG-8 CLOSED: explicit awaited IPv4 loopback binding, unchanged assertions, teardown and response-origin tests independently rechecked.
- CG-3: explicit candidate-specific baseline exception for six pre-existing TypeScript diagnostics: App.tsx TS2322 at 123/153; view-transition.ts TS2305 at 1 and TS7006 three times at 57. Codex verified pristine HEAD and revision-2 candidate diagnostics were byte-identical; revision-3 isolated typecheck equivalence is Claude-reported. Those application files remain unchanged. Typecheck is FAIL WITH ACCEPTED BASELINE EXCEPTION, never PASS. Any new diagnostic invalidates this exception. Track a separate wouter typing repair; this exception does not waive other CI or release requirements.
- D-PO-ROLES ADOPTED: owner/admin/business_developer/member may create/delete; viewer read-only. Platform-admin status alone permits trusted read/delete, not create. Independently qualifying live company writers can create; active workspace must match; verified PO deletion restriction remains.
- D-PRIV ADOPTED as future design requirement: non-owner runtime DB role, separate migration owner. Current remote privileges UNKNOWN; no role change authorized.
- D-DOC: include this durable summary with the candidate. Internal task records and ignored evidence stay excluded.
- NF-3 dead helper and R9-UX-P3 phone hint overflow accepted as separate P3 follow-ups; neither expands this commit.

## Evidence and its limits

| Evidence | Attribution |
|---|---|
| Revision 3 regeneration, 13-patch chain, 11 baselines, unchanged application scope and all 125 removed test lines checked | Codex independent |
| Revision 3 unit 485/485 in three runs with self-owned foreign loopback listener; zero requests to that listener; transport 6/6 | Codex independent |
| Revision 2 real local PostgreSQL provenance 38/38 and mocked AI route tests 4/4 | Codex independent; subsequent changes test transport only |
| Earlier r9 focused security and recovery/browser checks | Codex independent at their recorded increments, not a new full revision-3 browser run |
| Revision 3 isolated build PASS, unit 5/5; workspace 40 runs; local Postgres provenance 38, locking 7, OTP/permissions 13 | Claude implementation evidence |
| Package A browser 148/148 on revision 2, application byte-identical in revision 3 | Claude implementation evidence; mocked APIs |
| Revision 3 typecheck six baseline errors | Claude implementation evidence, supported by prior independent baseline comparison |

object-access and tender-exchange storage-backed integration suites were not executed: they touch real Supabase objects. Their transport edits were mechanically reviewed. This is an explicit source-acceptance limitation, not a successful integration result. Real storage/CDN/AI provider and environment data/privileges remain unverified. No remote operations were used for this final acceptance.

## Release gates remain open

Historical ACL laundering is not remediated by new-upload provenance. Zero audit counts never prove safety, and references never prove ownership. Before deployment acceptance, each environment requires separately authorized identity/catalog/storage-policy inspection, historical audit and independent ownership evidence, disposition of unresolved files, approved quarantine/recovery implementation and legacy cutoff, verified storage capability/cache containment, backup and isolated restore verification, migration-before-code sequence, real-storage smoke checks, monitoring owner/thresholds, and a tested monotonic rollback floor. Development precedes production. Existing externally held copies cannot be recalled.

Migration 0018, expanded inventory and quarantine are design proposals, not implemented controls. After provenance writes, no provenance-unaware rollback; after quarantine/cutoff state, no quarantine-unaware rollback. No baseline exception here authorizes unsafe deployment.

## Exact candidate file allowlist

File hashes below pin the accepted content, independently of working-tree staging. This summary itself is the sole additional commit file; its hash is recorded in the internal final-acceptance record to avoid self-reference.

- `client/src/components/ObjectUploader.tsx` — `c6bf43eaf538d40f6cbc17ee33dacd00670a66ff237ce086119b0da971ad4d55`
- `client/src/components/create-tender-modal.tsx` — `720f71661012bb1855a5365fbc78097f9dcff1baf08d9e18be801940b60d0c2f`
- `client/src/components/submit-offer-modal.tsx` — `d24deba359a2e430664da27ea10fe9b1a46b64b3f6c90196644d530538dd73da`
- `client/src/lib/i18n.tsx` — `2eb8e44c40804015222f57b8e14e8917d1758d0497ae299a9788524d82ff5862`
- `client/src/lib/queryClient.ts` — `f49247a3c7574183caf0041cda68db9effcea93bd6cb786ee1b2f014778f9519`
- `client/src/pages/CreateTender.tsx` — `45c52ccfe2d8a613a5582800fd4263f25966d431a551ccd445ca9b4069acc508`
- `client/src/pages/Dashboard.tsx` — `b261bd2bb4a6cf8117fd50aec339b0c62c6080025fad7d91af4fc00022b71736`
- `client/src/pages/Settings.tsx` — `05bfbee1f4b784f616dd2bfe7e8b3925a09fa63f8d73b7f6fade628890b08b8d`
- `client/src/pages/TenderCreateChoice.tsx` — `fe48b7c7e06fe8c01305c9944f64f182c1280e15d09c4f6ff929c0604cff63d8`
- `client/src/pages/TenderInviteLink.tsx` — `2f33c5a901d9730d728fdcfdcc966d4c083eb3b1721a801ca94ebabdc994f0ec`
- `client/src/pages/onboarding/company-documents.tsx` — `f9200db97e12d49b1ce8a752eec0b511343641866f06a4156e4f1ea7c8d76068`
- `client/src/pages/onboarding/company-profile.tsx` — `4ac05e7cca43b535b04a4a4fa6a4b1ea0825b229486212b5b520e9988df71f6a`
- `client/src/pages/onboarding/invite-team.tsx` — `6e4ba0547e04f3ea23923fef9a9e42b8a307a34ec2f1196991dd87be1601d972`
- `client/src/pages/tender-details.tsx` — `aa51e695ee5bc90fd2dc8222fb73e6c0ecbd372445ad97fec28aaa031073af6a`
- `server/lib/launch-tender.ts` — `edebcce7a675e2c21cc3c4a9e513d94d0fae4e01ea3dc411a4cca2226d5cd8a5`
- `server/objectAcl.ts` — `03a784dddd810feedefc7e91cda4709a70398fe429d9f1c097b45c7373a0802b`
- `server/objectStorage.ts` — `14ba5cb3db9494ecac03d96d06c233cb13139293d3ee67723abdc539be3f6f09`
- `server/routes.ts` — `61beae384b52727b7f3d3e597f1e76362f8d8a95efad2d4d928ccd0cc9206639`
- `server/storage.ts` — `77bad99f2ac75694a09e866faa520a2fa8896837ed1e4726a41557dac5024dca`
- `shared/schema.ts` — `da964be985891f9d46f701980cc763e61d20ca3735d32f41ed435f662b6a48b6`
- `tests/billing-routes.test.ts` — `fb33918e3fd3ed11516c9adf4fdb9f4e14449944d20b68bd4782f114de85c94d`
- `tests/entitlements.test.ts` — `756b0bc9a5f1f51c758408f2b1d3c11e52345e2b5d6f7303c6bd107c701638ea`
- `tests/object-access.integration.test.ts` — `fdf7f1fa0ea1e584f2deaac939a95e64f76f88c25559f883fa7db8576672e6b2`
- `tests/otp-enforcement.integration.test.ts` — `d7ec415bc169ec81678db53e9f0d03b77dbf71793ab9aa8b4f78933482fecf4c`
- `tests/permissions.integration.test.ts` — `62fcb211ea376b553c9705cde202c5fdaeb0994a2b3b7e48d16cbbbd14686639`
- `tests/rate-limit.test.ts` — `9415b78b6a258ed66fb4cc16b4eb609536c0097025a80effdee8505be312ae91`
- `tests/setup.ts` — `3f57788f79476d7e390d32f65f828f608f374ccde8fd0bf34dbdd8d171c1ddcf`
- `tests/streampay.test.ts` — `3ea283fce16b3c6c2c4dc605c8ec5f306506813aa478c07ee1cb1f97c88bcc27`
- `tests/tender-exchange.integration.test.ts` — `4340f7be77f3d4c7aeadf146a5866e363149672c85d8afb3be20613afb26a925`
- `client/src/components/CompanyVerificationFlow.tsx` — `f3e6d6a6c2b0daaa5e082e53a515d10963ff292a399c34ebe17efe816768c0c3`
- `client/src/lib/verification-flow-state.ts` — `7d40598dd37420cd6432b1ce24b131f37bbc1a0b4554d1d671a7dfb49930b4ea`
- `migrations/0017_object_acl_provenance.sql` — `4de31044c66fb94c7ca92efec6af0b72505c4230f135976b117028bfc5518dfa`
- `scripts/security/historical-provenance-audit.sql` — `8241c6e6f4f8cda59691e8b5739083edf18b4b45a1ca2a8f28b129c3170f40b5`
- `server/lib/brand-assets.ts` — `55fd92471e621e430cbdb5261ea9e22b2340da21cf38bdca3e468d0e34248d19`
- `server/lib/company-onboarding.ts` — `2da213a4865ae05ca292a070e0097894667f6fa998e7f0b90a546f448ee2626b`
- `server/lib/company-verification-store.ts` — `168fb6e13e4c8cf15f5f55b2f60586dc4a9961175cfc47ae46b665142d357c19`
- `server/lib/object-provenance.ts` — `fd9ce73173413b304c1eba545193f395215215e41cb6cfd85778438078f55814`
- `server/lib/offer-file-extraction.ts` — `30d3ac434ff83dbb8c8438e536c48008c485c982006708044b6b812dd0e6cfb5`
- `server/lib/offer-files.ts` — `a4f001eaa53b20e8c37e12ee5d819a4c219e7fdbeb39b83318045b4f93f3346e`
- `server/lib/tender-access.ts` — `9b5c0f20856e2c3fc268b1795d86d3599d256d6b66c871a923ea0b73654280a9`
- `server/lib/tender-audience.ts` — `1e9c91a0f8efdfcbab832bd8caf404d8fb655d6db70c6d11d17a3d1cfba15991`
- `server/lib/tender-files.ts` — `9867657d2a53fa560bcd6954598b11e13ce4ca71b238ef64ba4da42c01e28fec`
- `server/routes/company-verification.ts` — `3f3c246d5363d3313b4554537191928b422a717d3ef89171bd42aca464e3608e`
- `shared/company-verification.ts` — `75cfc9f930d8f049b68de5cd304f680e3e27354cbb37461b3dcfeb7a2567762d`
- `tests/brand-submission-security.test.ts` — `ebad075eead214c46f32489ef272afc03319268e3b18cf7163d9d6fb581b592e`
- `tests/company-verification-locking.integration.test.ts` — `37016ffe8e53c3ef49b46b4fed2bf517b88d8a4573bc5e4afe48cee15dfc32d0`
- `tests/company-verification-profile.test.ts` — `02884e90a213be36f74246fb439b795efaa29a7f0f39100158af92888bd6d531`
- `tests/company-verification.test.ts` — `77c66f465be866f4e5797ce2368ab7895a9978788601d994e18def7433d7fc86`
- `tests/helpers/fake-verification-db.ts` — `63db249be21b06800fca36d00d9086fe667dc55db52e8b6638479bb6169f5559`
- `tests/helpers/locking-harness.ts` — `2ed031afaaaba94e0d57fe31a4a854c34bd6400e265a8b5cb80630e20f091955`
- `tests/helpers/test-server.ts` — `3febd26d9050d4ce3e4653f9daad8e536f7f96588ddbaba6a253233b2d05d45b`
- `tests/locking-harness.test.ts` — `c5eb69616043ce8fd59e194656ff2ab7fbffa7056d649cb49fa5e2c151c03d89`
- `tests/object-provenance.integration.test.ts` — `f3a1b09ea3fa510e547e2e6348e573a0456a71b0896b8d5a33c080ee06d32d6f`
- `tests/offer-analysis-file-trust.test.ts` — `744cab526b1df55ff56d2c6b0e0d0dd19a7b72f9fc0f592990870827975e2a93`
- `tests/offer-tender-security.test.ts` — `8c2b6331934c476269676de4ab56cfb913b43d04f7e959dd9585396b27068eff`
- `tests/request-file-access.test.ts` — `2fc18a08637c4679a7a4bea8b9107565796c91491d8659d3d24a75ee9d681241`
- `tests/tender-write-contract.test.ts` — `8c82a1c00fa9bef91a70bebf488bfba865706d1035b05e3ae8ec217629f7f08c`
- `tests/test-server-transport.test.ts` — `cc8afe1a0b6180c601c6ed22bc88ae767a82f64fa2edccc9f28656b9317c66c9`
- `tests/verification-flow-state.test.ts` — `36e9277dfc5dba2e06e6baefb22380b67fe4f0dc54ad8a2d6347468608682a54`
