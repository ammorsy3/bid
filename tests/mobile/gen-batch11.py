#!/usr/bin/env python3
"""Adds the batch-11 states (templates and custom templates in the RFP wizard, for the "no squeezed rows" re-check). Session mode, Seet workspace.
Plan data is faked with overrides, so nothing real is read or saved. Re-runnable."""
import json
P = "tests/mobile/states.json"
d = json.load(open(P))
d["states"] = [s for s in d["states"] if s["batch"] != "batch-11"]

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

_src = json.load(open(P))["states"]
get = lambda sid: json.loads(json.dumps(next(x for x in _src if x["id"] == sid)))
LONG = "قالب مناقصة توريد وتركيب وتشغيل أنظمة المباني الذكية والطاقة الشمسية للمجمعات السكنية والتجارية Smart Buildings Phase 2 Template"
S = []
def add(c, sid, title, extra_actions, pro=True):
    c["id"] = sid; c["batch"] = "batch-11"; c["page"] = "wizard-templates"; c["title"] = title
    if pro: c["overrides"] = {**(c.get("overrides") or {}), "GET /api/entitlements": ent("pro")}
    c["actions"] = list(c.get("actions") or []) + extra_actions
    S.append(c)
add(get("b5-start-method-templates"), "b11-tpl-start-pick", "Wizard start: saved template picked (Continue becomes active)", [{"click": "[data-testid^=template-]"}, {"wait": 500}])
add(get("b5-review"), "b11-tpl-review-save", "Review: Save as template switched on, name and description typed", [
    {"click": "[data-testid=switch-save-template]"}, {"wait": 600},
    {"fill": ["#template-section input[type=text]", "قالب توريد المعدات التقنية"]}, {"fill": ["#template-section textarea", "للمشتريات المتكررة"]}, {"wait": 400}])
add(get("b5-review"), "b11-tpl-review-save-long", "Review: Save as template, very long name", [
    {"click": "[data-testid=switch-save-template]"}, {"wait": 600},
    {"fill": ["#template-section input[type=text]", LONG]}, {"fill": ["#template-section textarea", LONG + " " + LONG]}, {"wait": 400}])
add(get("b5-review"), "b11-tpl-review-locked", "Review: Save as template on a free plan (upgrade popup)", [
    {"click": "[data-testid=switch-save-template]"}, {"wait": 900}], pro=False)
d["states"] += S
json.dump(d, open(P, "w"), ensure_ascii=False, indent=2)
print(len(S), "states")
