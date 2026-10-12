#!/usr/bin/env python3
"""Adds the batch-10 states (pages that had no screen state yet). Session mode, Seet workspace.
Plan data is faked with overrides, so nothing real is read or saved. Re-runnable."""
import json
P = "tests/mobile/states.json"
d = json.load(open(P))
d["states"] = [s for s in d["states"] if s["batch"] != "batch-10"]

ALL = ["marketplace","aiBuilder","ownTemplates","qa","traction","seats","aiAnalysis","comparison","api"]
PRO = {"marketplace","aiBuilder","ownTemplates","qa","traction","seats"}
def ent(tier, manage=True):
    rank = {"free":0,"pro":1,"business":2}[tier]
    return {"json": {"tier": tier, "gated": True, "tendersUsed": 3 if tier=="free" else 12,
        "tenderLimit": 3 if tier=="free" else None, "canCreateTender": tier!="free",
        "seatsUsed": 1, "seatLimit": 1 if tier=="free" else None,
        "features": {f: (rank>=2 or (rank==1 and f in PRO)) for f in ALL}, "canManageBilling": manage}}
DETAILS = {"values": {"billingName": None,"billingEmail": None,"billingPhone": None,"vatNumber": None,"crNumber": None,"address": None,"city": None},
           "sources": {}, "missing": ["billingName","billingEmail"], "applicable": ["billingName","billingEmail","billingPhone","vatNumber","crNumber","address","city"]}
def bill(sub=None, manage=True):
    return {"json": {"subscription": sub, "details": DETAILS, "openCheckout": None, "canManage": manage}}
LIVE = lambda plan: {"plan": plan, "term": "yearly", "status": "active", "live": True,
                     "currentPeriodEnd": "2027-10-12T00:00:00.000Z", "cancelAtPeriodEnd": False}

def up(id_, title, route, tier, sub=None, manage=True, actions=None, extra=None):
    return {"id": id_, "batch": "batch-10", "page": "upgrade", "title": title, "route": route,
            "keyboard": False, "workspace": "seet",
            "overrides": {"GET /api/entitlements": ent(tier, manage), "GET /api/billing": bill(sub, manage), **(extra or {})},
            "actions": [{"wait": 2500}] + (actions or [])}
S = [
 up("b10-upgrade-free", "Upgrade: free plan, plan boxes", "/upgrade", "free"),
 up("b10-upgrade-yearly", "Upgrade: yearly switch", "/upgrade", "free", actions=[{"click": "[data-testid=billing-term-yearly]"}, {"wait": 600}]),
 up("b10-upgrade-reason-seats", "Upgrade: sent here by the seats limit (Pro)", "/upgrade?reason=seats", "free"),
 up("b10-upgrade-reason-api", "Upgrade: sent here by API keys (Business)", "/upgrade?reason=api", "free"),
 up("b10-upgrade-reason-tenders", "Upgrade: sent here by the tender limit", "/upgrade?reason=tenders", "free"),
 up("b10-upgrade-member", "Upgrade: a member who cannot pay (no buy buttons)", "/upgrade", "free", manage=False),
 up("b10-upgrade-unlocked-pro", "Upgrade: after paying, Pro unlocked", "/upgrade", "pro", sub=LIVE("pro")),
 up("b10-upgrade-unlocked-business", "Upgrade: after paying, Business unlocked", "/upgrade", "business", sub=LIVE("business")),
 up("b10-upgrade-details", "Upgrade: billing details step after choosing Pro", "/upgrade", "free",
    extra={"POST /api/billing/checkouts": {"json": {"checkoutId": "c-demo", "plan": "pro", "term": "monthly", "details": DETAILS}}},
    actions=[{"click": "[data-testid=billing-plan-pro]"}, {"wait": 2500}]),
]
def tr(slug, name, bio, tags, theme=None, extra=None):
    return {"json": {"company": {"id": "co-b10", "name": name, "category": "Construction & Infrastructure", "city": "Riyadh", "verificationStatus": "verified"},
        "profile": {"displayName": name, "bio": bio, "logoUrl": None, "headerUrl": None,
                    "socialLinks": {"website": "https://example.com", "linkedin": "https://linkedin.com/company/example"},
                    "tags": tags, "tractionTheme": theme}}}
THEME = {"themeId": "modern", "primaryColor": "#FE3C01", "accentColor": "#1a1a2e", "headerStyle": "gradient"}
S += [
 {"id": "b10-traction-editor", "batch": "batch-10", "page": "traction-editor", "title": "Traction link editor", "route": "/traction/b10-demo/edit",
  "keyboard": False, "workspace": "seet", "overrides": {"GET /api/r/b10-demo": tr("b10-demo", "Seet Contracting", "We deliver buildings.", ["Construction", "MEP"], THEME)},
  "actions": [{"wait": 2500}]},
 {"id": "b10-traction-editor-long", "batch": "batch-10", "page": "traction-editor", "title": "Traction link editor: long Arabic name",
  "route": "/traction/b10-demo/edit", "keyboard": False, "workspace": "seet",
  "overrides": {"GET /api/r/b10-demo": tr("b10-demo", "شركة الأفق المتقدم للمقاولات العامة والصيانة وتقنية المباني الذكية المحدودة", "نقدم حلول البناء والتشغيل والصيانة المتكاملة للمشاريع الكبرى في المملكة العربية السعودية ودول الخليج منذ أكثر من عشرين عاماً.", ["المقاولات العامة", "أنظمة المباني الذكية", "الطاقة الشمسية", "التشغيل والصيانة"], THEME)},
  "actions": [{"wait": 2500}]},
 {"id": "b10-traction-editor-error", "batch": "batch-10", "page": "traction-editor", "title": "Traction link editor: link not found",
  "route": "/traction/b10-missing/edit", "keyboard": False, "workspace": "seet",
  "overrides": {"GET /api/r/b10-missing": {"status": 404, "json": {"message": "Not found"}}}, "actions": [{"wait": 2500}]},
]
for slug in ["getting-started", "webhook", "mcp", "rate-limits"]:
    S.append({"id": f"b10-docs-{slug}", "batch": "batch-10", "page": "docs", "title": f"Developer docs: {slug}", "route": f"/docs/{slug}",
              "keyboard": False, "actions": [{"wait": 1500}]})
# ---- Part B: admin rows and popups (admin account, default workspace; reads faked/real, saves blocked) ----
def jr(i, vendor, requester, vs="unverified"):
    return {"id": f"jr{i}", "status": "pending", "createdAt": "2026-10-01T09:00:00.000Z",
            "vendorCompany": {"name": vendor, "verificationStatus": vs}, "requesterCompany": {"name": requester}}
JRS = [jr(1, "شركة الأفق المتقدم للمقاولات العامة والصيانة وتقنية المباني الذكية المحدودة", "Seet Contracting"),
       jr(2, "Al-Rashid International Engineering & Industrial Maintenance Services Company", "شركة نور للمقاولات", "pending"),
       jr(3, "Nour", "Seet", "verified")]
def ck(i, status, plan, term, co, user, email, total, fu=None, reason=None):
    return {"id": f"ck{i}", "plan": plan, "term": term, "status": status, "failureReason": reason,
            "lastActivityAt": "2026-10-10T12:00:00.000Z", "followupSentAt": fu, "createdAt": "2026-10-10T11:00:00.000Z",
            "companyId": f"co{i}", "companyName": co, "userName": user, "email": email, "phone": "+966501234567", "total": total}
CKS = [ck(1, "abandoned", "pro", "monthly", "شركة الأفق المتقدم للمقاولات العامة والصيانة", "عبدالرحمن بن محمد الشهري", "abdulrahman.alshehri.long.address@example-company-name.com.sa", 90.85),
       ck(2, "failed", "business", "yearly", "Seet Contracting", "Ahmed", "a@b.co", 2058.0, reason="Card declined by the issuing bank"),
       ck(3, "redirected", "pro", "yearly", "Nour", "Nour", "n@n.co", 910.8, fu="2026-10-11T09:00:00.000Z"),
       ck(4, "paid", "business", "monthly", "Al-Rashid International Engineering & Maintenance", "Khalid Al-Rashid", "khalid@example.com", 205.85),
       ck(5, "draft", "pro", "monthly", "Draft Co", "Sara", "sara@example.com", 90.85)]
def mt(i, title, company, city):
    return {"id": f"mt{i}", "title": title, "description": "وصف طويل للمناقصة يشمل نطاق العمل والمتطلبات الفنية والمالية وجميع الشروط الخاصة بالتقديم والتقييم والترسية والتنفيذ.",
            "category": "Construction & Infrastructure", "deadline": "2026-12-01T00:00:00.000Z", "budget": "1250000", "status": "published",
            "invitationToken": "tok", "referenceNumber": "BID-0001", "tenderType": "open_tender", "documentFee": 500, "inquiryDeadline": "2026-11-01T00:00:00.000Z",
            "marketplaceStatus": "pending", "createdAt": "2026-10-01T09:00:00.000Z",
            "company": {"id": "c1", "name": company, "city": city, "verificationStatus": "verified"}, "profile": {"displayName": None, "logoUrl": None}}
MTS = [mt(1, "توريد وتركيب وتشغيل منظومة متكاملة لإدارة المباني الذكية وأنظمة الطاقة الشمسية للمجمع السكني والتجاري", "شركة الأفق المتقدم للمقاولات العامة والصيانة", "الرياض"),
       mt(2, "Supply and installation of an integrated smart building management system", "Al-Rashid International Engineering", "Jeddah")]
A = lambda id_, page, title, route, ov=None, actions=None, dialog=False, **kw: {"id": id_, "batch": "batch-10", "page": page, "title": title, "route": route,
     "keyboard": False, "overrides": ov or {}, "actions": [{"wait": 3000}] + (actions or []), **({"expectDialog": True} if dialog else {}), **kw}
JROV = {"GET /api/admin/join-requests": {"json": JRS}}
S += [
 A("b10-admin-joinreq-rows", "admin-join-requests", "Admin: join requests (3 pending rows)", "/admin/join-requests", JROV),
 A("b10-admin-joinreq-approve", "admin-join-requests", "Admin: approve join request popup", "/admin/join-requests", JROV, [{"click": "[data-testid=button-approve-jr1]"}, {"wait": 800}], True),
 A("b10-admin-joinreq-reject", "admin-join-requests", "Admin: reject join request popup (reason typed)", "/admin/join-requests", JROV,
   [{"click": "[data-testid=button-reject-jr1]"}, {"wait": 600}, {"fill": ["[data-testid=input-reason]", "سبب الرفض: المستندات غير مكتملة"]}, {"wait": 400}], True),
 A("b10-admin-checkouts-rows", "admin-checkouts", "Admin: checkouts (5 rows, every status)", "/admin/checkouts", {"GET /api/admin/billing/checkouts": {"json": CKS}},
   [{"click": "[data-testid=filter-checkouts-all]"}, {"wait": 600}]),
 A("b10-admin-campaign-create", "admin-campaigns", "Admin: new campaign popup", "/admin/campaigns", None, [{"click": "[data-testid=button-new-campaign]"}, {"wait": 800}], True),
 A("b10-admin-campaign-detail", "admin-campaigns", "Admin: campaign detail popup", "/admin/campaigns", None, [{"click": "[data-testid^=button-detail-]"}, {"wait": 2500}], True),
 A("b10-admin-vendors-approve", "admin-vendors", "Admin: approve company popup", "/admin/vendors", None, [{"click": "[data-testid^=button-approve-]"}, {"wait": 800}], True),
 A("b10-admin-vendors-reject", "admin-vendors", "Admin: reject company popup", "/admin/vendors", None, [{"click": "[data-testid^=button-reject-]"}, {"wait": 800}], True),
 A("b10-admin-vendors-view", "admin-vendors", "Admin: company details popup", "/admin/vendors", None, [{"click": "[data-testid^=button-view-]"}, {"wait": 1500}], True),
 A("b10-admin-marketplace-rows", "admin-marketplace", "Admin: marketplace pending (2 tenders)", "/admin/marketplace", {"GET /api/admin/marketplace/pending": {"json": MTS}}),
 A("b10-admin-marketplace-reject", "admin-marketplace", "Admin: reject marketplace tender popup", "/admin/marketplace", {"GET /api/admin/marketplace/pending": {"json": MTS}},
   [{"click": "button[class*=destructive]"}, {"wait": 800}], True),
]
# ---- Part B: logged-in tender invite page (Seet workspace signed in; tender data faked; voice note = silent WAV) ----
import datetime, struct
PD = json.load(open("tests/mobile/fixtures/public-data.json"))["routes"]
def in_days(n): return (datetime.datetime.utcnow() + datetime.timedelta(days=n)).strftime("%Y-%m-%dT20:59:00.000Z")
def wav():  # 1 s of silence, every byte < 0x80 so it survives the text body
    rate, n = 8192, 8192
    h = b"RIFF" + struct.pack("<I", 36 + n * 2) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) + b"data" + struct.pack("<I", n * 2)
    return (h + b"\x00" * (n * 2)).decode("latin1")
def invite_ov(tid, src, voice=False):
    inv = json.loads(json.dumps(PD[f"GET /api/tenders/{src}/invite"]))
    inv["json"]["id"] = tid
    if inv["json"].get("deadline", "").startswith("{{"): inv["json"]["deadline"] = in_days(40)
    ov = {f"GET /api/tenders/{tid}/invite": inv}
    if f"GET /api/tenders/{src}/questions" in PD: ov[f"GET /api/tenders/{tid}/questions"] = PD[f"GET /api/tenders/{src}/questions"]
    cid = inv["json"]["company"]["id"]
    if f"GET /api/companies/{cid}/profile" in PD: ov[f"GET /api/companies/{cid}/profile"] = PD[f"GET /api/companies/{cid}/profile"]
    if voice: ov["GET /objects/uploads/demo-voice-note"] = {"body": wav(), "contentType": "audio/wav"}
    return ov
def IN(id_, title, tid, src, actions=None, dialog=False, kb=False, voice=True, **kw):
    return {"id": id_, "batch": "batch-10", "page": "tender-invite-in", "title": title, "route": f"/invite/{tid}", "keyboard": kb,
            "workspace": "seet", "overrides": invite_ov(tid, src, voice), "actions": [{"wait": 3500}] + (actions or []),
            **({"expectDialog": True} if dialog else {}), **kw}
S += [
 IN("b10-invite-in-demo", "Tender invite, signed in: full page with voice note player", "demo-tender", "demo-tender"),
 IN("b10-invite-in-question", "Tender invite, signed in: asking a question (keyboard open)", "demo-tender", "demo-tender",
    [{"click": "[data-testid=input-question]"}, {"type": "هل يمكن تمديد موعد التقديم؟"}, {"wait": 500}], kb=True),
 IN("b10-invite-in-offer-popup", "Tender invite, signed in: submit-offer popup", "demo-tender", "demo-tender",
    [{"click": "[data-testid=button-submit-offer-inline]:visible, [data-testid=button-submit-offer]:visible"}, {"wait": 1200}], dialog=True),
 IN("b10-invite-in-closing", "Tender invite, signed in: closes today", "closing-tender", "closing-tender", voice=False),
 IN("b10-invite-in-expired", "Tender invite, signed in: closed", "expired-tender", "expired-tender", voice=False),
]
# Logged out (fixture mode): the voice note asks you to log in
vo = {"id": "b10-invite-out-voice", "batch": "batch-10", "page": "tender-invite-in", "title": "Tender invite, signed out: voice note says log in",
      "route": "/invite/demo-tender", "persona": "public-data", "keyboard": False, "actions": [{"wait": 2500}]}
S.append(vo)
# ---- Part B: invite-return journey (fixture mode; the social leg itself leaves the site, so it is not photographable) ----
RET = "%2Finvite%2Fdemo-tender"
def RS(id_, title, route, persona, extra=None):
    return {"id": id_, "batch": "batch-10", "page": "invite-return", "title": title, "route": route, "persona": persona, "keyboard": False,
            "overrides": invite_ov("demo-tender", "demo-tender", False), "actions": [{"wait": 3500}], **(extra or {})}
S += [
 RS("b10-return-login-out", "Invite return: logged-out visitor on /login?redirect (what a person sees)", f"/login?redirect={RET}", "logged-out"),
 RS("b10-return-signup-out", "Invite return: logged-out visitor on /signup?redirect", f"/signup?redirect={RET}", "logged-out"),
 RS("b10-return-login-in", "Invite return: already signed-in company user opens /login?redirect (should land back on the invite)", f"/login?redirect={RET}", "company-owner"),
 RS("b10-return-login-new", "Invite return: signed-in person with no company opens /login?redirect (should go to onboarding)", f"/login?redirect={RET}", "verified-new"),
 RS("b10-return-login-unverified", "Invite return: signed-in but email code not entered opens /login?redirect (should go to verify-email, then back)", f"/login?redirect={RET}", "unverified"),
 RS("b10-return-onboarding-new", "Invite return: new account lands in onboarding after sign-up", f"/signup?redirect={RET}", "verified-new"),
]
d["states"] += S
json.dump(d, open(P, "w"), ensure_ascii=False, indent=2)
print(len(S), "states")
