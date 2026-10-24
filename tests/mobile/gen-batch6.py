#!/usr/bin/env python3
"""Adds the batch-6 states (owner's tender page, proposal comparison, tender edit) to states.json.
Re-runnable: removes old batch-6 entries first. Made-up data only; the Seet workspace owns the tender."""
import json, copy
P = "tests/mobile/states.json"
d = json.load(open(P))
d["states"] = [s for s in d["states"] if s["batch"] != "batch-6"]
b4 = next(s for s in d["states"] if s["id"] == "b4-tender-open")
OWNER = "6866ad57-76fb-486e-b1f6-c8fb2c02dc59"
TID = "b6-demo"

def tender(**kw):
    t = copy.deepcopy(b4["overrides"]["GET /api/tenders/b4-demo"]["json"])
    t.update(dict(id=TID, companyId=OWNER, offersCount=4, invitedCount=3), **kw)
    return t

def offer(i, name, cat, status="submitted", price=None, ver="verified", video=None):
    return {"id": f"o{i}", "tenderId": TID, "companyId": f"c{i}", "createdBy": f"u{i}",
            "technicalFileUrl": f"/objects/uploads/t{i}", "financialFileUrl": f"/objects/uploads/f{i}",
            "combinedFileUrl": None, "notes": "", "quotePrice": price, "videoUrl": video,
            "conditionalSubmission": False, "resubmissionAllowed": False, "status": status,
            "submittedAt": f"2026-09-0{i+2}T10:00:00.000Z",
            "company": {"id": f"c{i}", "name": name, "category": cat, "verificationStatus": ver},
            "profile": {"displayName": name, "bio": None, "logoUrl": None}}

AR = [("شركة الأفق المتقدم للمقاولات العامة والصيانة والتشغيل", "Construction & Infrastructure", 98765432, "verified"),
      ("Nour Contracting & Building Systems Integration Company Ltd", "Construction & Infrastructure", 1250000, "verified"),
      ("مؤسسة ن", "Technology", 450000, "under_review"),
      ("Al-Rashid Energy Solutions", "Energy", 3300000, "verified")]
offers4 = [offer(i + 1, n, c, price=p, ver=v) for i, (n, c, p, v) in enumerate(AR)]
offers4[1]["status"] = "shortlisted"; offers4[2]["status"] = "rejected"

def analysis(i, done=True):
    return {"id": f"a{i}", "offerId": f"o{i}", "status": "completed" if done else "processing",
            "executiveSummary": "يقدّم المورّد حلاً متكاملاً لإدارة المباني الذكية خلال ١٨ شهراً مع ضمان خمس سنوات وفريق محلي. The vendor proposes an integrated solution with a five-year warranty and a local team, delivered in 18 months.",
            "tableOfContents": [{"section": "المواصفات الفنية وخطة التنفيذ", "pageRange": "1-12"}, {"section": "Price", "pageRange": "13"}],
            "criteriaMapping": {"سجل تجاري": "Found", "GOSI certificate": "Not Found", "شهادة الزكاة والدخل": "Found", "ISO 9001": "Partial"},
            "deliverables": ["التصميم التفصيلي", "Supply & install 1,250 control points"],
            "financial": {"total": 1250000 * i, "breakdown": [{"item": "أنظمة التحكم والمستشعرات", "amount": 800000}, {"item": "Installation", "amount": 450000}], "paymentTerms": "30% مقدماً / 30% on delivery / 40% بعد التسليم", "vat": 15},
            "errorMessage": None, "analyzedAt": "2026-09-10T10:00:00.000Z"}
an4 = [analysis(i) for i in (1, 2, 4)] + [analysis(3, False)]

base = {"GET /api/tenders/b6-demo/questions": {"json": []},
        "GET /api/tenders/b6-demo/invite-links": {"json": []},
        "GET /api/tenders/b6-demo/purchase-orders": {"json": []},
        "GET /api/tenders/b6-demo/negotiation-actions": {"json": []},
        "GET /api/tenders/b6-demo/my-offer": {"status": 404, "json": {"message": "none"}}}

def st(id_, page, title, route, ov, keyboard=False, actions=None):
    s = {"id": id_, "batch": "batch-6", "page": page, "title": title, "route": route,
         "keyboard": keyboard, "workspace": "seet", "actions": actions or [{"wait": 2500}]}
    if ov is not None: s["overrides"] = ov
    return s

S = []
T = f"/tenders/{TID}"
S.append(st("b6-owner-open-4", "tender-details-owner", "Owner page: open tender, long Arabic text, 4 offers (made-up)", T,
    {**base, f"GET /api/tenders/{TID}": {"json": tender()}, f"GET /api/tenders/{TID}/offers": {"json": offers4},
     f"GET /api/ai/proposal-analysis/{TID}": {"json": an4}}))
S.append(st("b6-owner-open-0", "tender-details-owner", "Owner page: open tender, no offers yet", T,
    {**base, f"GET /api/tenders/{TID}": {"json": tender(offersCount=0, invitedCount=0)}, f"GET /api/tenders/{TID}/offers": {"json": []},
     f"GET /api/ai/proposal-analysis/{TID}": {"json": []}}))
t_en = tender(); t_en.update(language="en", title="Supply, installation and operation of an integrated smart-building and solar-energy management system for the northern residential and commercial complex", submissionType="quote_only")
S.append(st("b6-owner-open-en", "tender-details-owner", "Owner page: open tender, English, quote-only, 4 offers", T,
    {**base, f"GET /api/tenders/{TID}": {"json": t_en}, f"GET /api/tenders/{TID}/offers": {"json": offers4},
     f"GET /api/ai/proposal-analysis/{TID}": {"json": []}}))
S.append(st("b6-owner-closed-4", "tender-details-owner", "Owner page: closed tender, 4 offers, one shortlisted", T,
    {**base, f"GET /api/tenders/{TID}": {"json": tender(status="closed")}, f"GET /api/tenders/{TID}/offers": {"json": offers4},
     f"GET /api/ai/proposal-analysis/{TID}": {"json": an4}}))
S.append(st("b6-owner-marketplace", "tender-details-owner", "Owner page: marketplace tender waiting for approval", T,
    {**base, f"GET /api/tenders/{TID}": {"json": tender(isMarketplace=True, marketplaceStatus="pending")}, f"GET /api/tenders/{TID}/offers": {"json": []},
     f"GET /api/ai/proposal-analysis/{TID}": {"json": []}}))
S.append(st("b6-owner-loading", "tender-details-owner", "Owner page: still loading", T,
    {**base, f"GET /api/tenders/{TID}": {"hang": True}}))
S.append(st("b6-owner-real-closed", "tender-details-owner", "Owner page: a real closed tender with 2 offers (Seet data)", "/tenders/bfd8855e-7341-48dc-8a10-0fc1331b132b", None))
S.append(st("b6-owner-real-closed-1", "tender-details-owner", "Owner page: a real closed tender with 1 offer, English", "/tenders/aaf13cb3-a32e-4714-b018-efa20bcfc14a", None))
S.append(st("b6-compare-closed", "proposal-comparison", "Comparison: closed tender, 4 offers, one still analysing", T,
    {**base, f"GET /api/tenders/{TID}": {"json": tender(status="closed")}, f"GET /api/tenders/{TID}/offers": {"json": offers4},
     f"GET /api/ai/proposal-analysis/{TID}": {"json": an4}},
    actions=[{"wait": 2500}]))
S.append(st("b6-compare-real", "proposal-comparison", "Comparison: real closed tender, 2 offers", "/tenders/bfd8855e-7341-48dc-8a10-0fc1331b132b", None,
    actions=[{"wait": 2500}]))
S.append(st("b6-edit-real", "tender-edit", "Edit page: real closed tender (Seet data)", "/tenders/bfd8855e-7341-48dc-8a10-0fc1331b132b/edit", None))
S.append(st("b6-edit-real-en", "tender-edit", "Edit page: real English tender", "/tenders/aaf13cb3-a32e-4714-b018-efa20bcfc14a/edit", None))
S.append(st("b6-edit-open", "tender-edit", "Edit page: open made-up tender, long Arabic text", f"/tenders/{TID}/edit",
    {**base, f"GET /api/tenders/{TID}": {"json": tender()}, f"GET /api/tenders/{TID}/offers": {"json": offers4}}))
S.append(st("b6-edit-open-keyboard", "tender-edit", "Edit page: first text box tapped, keyboard open", f"/tenders/{TID}/edit",
    {**base, f"GET /api/tenders/{TID}": {"json": tender()}, f"GET /api/tenders/{TID}/offers": {"json": offers4}}, keyboard=True))
d["states"] += S
json.dump(d, open(P, "w"), ensure_ascii=False, indent=2)
print(len(S), "states:", ",".join(s["id"] for s in S))
