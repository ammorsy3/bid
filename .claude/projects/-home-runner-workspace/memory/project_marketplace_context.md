---
name: Marketplace platform context
description: Bid marketplace definition, user journey, PO requirement, binding enforcement, and design benchmarks
type: project
---

The Marketplace is a separate platform page (planned subdomain: marketplace.bidd.sa) that displays public tenders.

**User journey:** Create RFP → Publish → Select "Marketplace" → Submit request → Admin reviews & approves → Tender goes public.

**Purchase Order (PO):** The most critical step. A signed/stamped official document confirming the client will pay a specific amount to the awarded vendor based on average tender value. Only visible to admin + requester, never public. Can be added by user or admin.

**Why:** The PO + admin approval exist to prevent fake tenders and time-wasters. Every marketplace tender is BINDING — the requester MUST award a vendor. If they don't, account is permanently banned. Tenders cannot be cancelled after publishing.

**Benchmark platforms:** Etimad (official gov tenders — reference "tender document purchase fee" concept), Forsah (large private + smaller gov entities), Tenders SA (low quality but UI reference).

**Design principles:** Familiar to users of Saudi procurement platforms, sharp and modern (Bid identity), not dull like Etimad. Simple and fast but capable of handling detailed/complex tender info from large companies.

**How to apply:** The marketplace submission flow should convey seriousness and trust (binding commitment, not casual sharing). The intro/guide should educate users about what publishing means, especially the PO requirement and the binding nature.
