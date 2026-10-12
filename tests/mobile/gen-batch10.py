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
d["states"] += S
json.dump(d, open(P, "w"), ensure_ascii=False, indent=2)
print(len(S), "states")
