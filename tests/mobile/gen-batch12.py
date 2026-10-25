#!/usr/bin/env python3
"""Adds the batch-12 states (company verification flow: Settings > Company tab and the
"verify to continue" screen at /tenders/new). Session mode. Verify details and documents are
faked with overrides, so nothing real is read or saved (every write is blocked by the guard).
Settings states use the Seet workspace; gate states use Ahmed's empty default workspace
(unverified, so the gate really shows). Re-runnable."""
import json
P = "tests/mobile/states.json"
d = json.load(open(P))
d["states"] = [s for s in d["states"] if s["batch"] != "batch-12"]
S = []

AR_NAME = "شركة الأفق الحديثة للمقاولات العامة والتوريدات الصناعية والخدمات اللوجستية المحدودة ذات المسؤولية"
EN_NAME = "International Consolidated Engineering, Procurement and Construction Contracting Company Limited"
AR_FILE = "شهادة السجل التجاري للشركة النسخة المحدثة 2026 نهائي مع التعديلات الأخيرة.pdf"
EN_FILE = "Commercial_Registration_Certificate_Updated_Final_Version_With_Latest_Amendments_2026.pdf"

def info(status="not_verified", name="", cr="", vat="", city="", reason=None):
    return {"json": {"legalName": name, "crNumber": cr, "vatNumber": vat, "city": city,
                     "verificationStatus": status, "rejectionReason": reason}}
def docs(*items):
    return {"json": [{"id": f"d{i}", "documentType": t, "fileUrl": f"/objects/x{i}", "originalName": n}
                     for i, (t, n) in enumerate(items)]}
def ov(i, dc):
    return {"GET /api/companies/:id/verify-info": i, "GET /api/companies/:id/documents": dc}

def st(sid, title, route, overrides=None, ws="seet", kb=False, actions=None, expect_dialog=False):
    s = {"id": sid, "batch": "batch-12", "page": "verification-gate" if route.startswith("/tenders") else "verification-settings",
         "title": title, "route": route, "keyboard": kb}
    if ws: s["workspace"] = ws
    if overrides: s["overrides"] = overrides
    if expect_dialog: s["expectDialog"] = True
    s["actions"] = [{"wait": 2500}] + (actions or [])
    S.append(s)

SET = "/settings?tab=company&highlight=verification"
FILLED = dict(name="شركة الأفق للمقاولات", cr="1010123456", vat="300123456700003", city="الرياض")
FILLED_EN = dict(name="Horizon Contracting Co.", cr="1010123456", vat="300123456700003", city="Riyadh")

# ── Settings > Company tab ────────────────────────────────────────────────
st("b12-set-empty", "Settings verification: empty company", SET, ov(info(), docs()))
st("b12-set-keyboard", "Settings verification: first field tapped, keyboard open", SET, ov(info(), docs()), kb=True)
st("b12-set-typing", "Settings verification: typing legal name, CR number and VAT", SET, ov(info(), docs()),
   actions=[{"fill": ["#verify-legal-name", "Horizon Contracting Co."]}, {"fill": ["#verify-cr", "10101"]},
            {"click": "#verify-city"}, {"fill": ["#verify-vat", "3001234567"]}, {"wait": 500}])
st("b12-set-filled", "Settings verification: details saved, CR certificate uploaded (ready to submit)", SET,
   ov(info(**FILLED), docs(("cr_certificate", "السجل التجاري.pdf"))))
st("b12-set-all-docs", "Settings verification: all four documents uploaded, long file names", SET,
   ov(info(**FILLED), docs(("cr_certificate", AR_FILE), ("vat_certificate", EN_FILE),
                           ("gosi_certificate", "gosi.png"), ("national_address_certificate", EN_FILE))))
st("b12-set-long-ar", "Settings verification: very long Arabic company name", SET,
   ov(info(name=AR_NAME, cr="1010123456", vat="300123456700003", city="المدينة المنورة والمناطق المجاورة لها"), docs(("cr_certificate", AR_FILE))))
st("b12-set-long-en", "Settings verification: very long English company name", SET,
   ov(info(name=EN_NAME, cr="1010123456", vat="300123456700003", city="Jeddah"), docs(("cr_certificate", EN_FILE))))
st("b12-set-review", "Settings verification: under review (fields locked)", SET,
   ov(info("under_review", **FILLED), docs(("cr_certificate", AR_FILE))))
st("b12-set-rejected", "Settings verification: rejected, with a long reason", SET,
   ov(info("rejected", **FILLED, reason="رقم السجل التجاري في الشهادة المرفوعة لا يطابق الرقم المدخل، وتاريخ انتهاء الشهادة قد مضى. يرجى رفع نسخة سارية ومقروءة من الشهادة ثم إعادة الإرسال. Reference: CR-MISMATCH-2026-0042-LONG-TOKEN-WITHOUT-SPACES"),
      docs(("cr_certificate", EN_FILE))))
st("b12-set-verified", "Settings verification: verified", SET,
   ov(info("verified", **FILLED), docs(("cr_certificate", AR_FILE))))
st("b12-set-verified-edit", "Settings verification: verified, legal name edited (badge-removal warning)", SET,
   ov(info("verified", **FILLED), docs(("cr_certificate", AR_FILE))),
   actions=[{"fill": ["#verify-legal-name", "اسم جديد للشركة"]}, {"wait": 500}])
st("b12-set-load-error", "Settings verification: could not load", SET,
   {"GET /api/companies/:id/verify-info": {"status": 500, "json": {"message": "boom"}}, "GET /api/companies/:id/documents": docs()})
st("b12-set-loading", "Settings verification: loading", SET,
   {"GET /api/companies/:id/verify-info": {"hang": True}, "GET /api/companies/:id/documents": docs()})
st("b12-set-upload-popup", "Settings verification: upload popup opened", SET, ov(info(**FILLED), docs()),
   actions=[{"click": "[data-testid=doc-slot-cr_certificate] button >> nth=-1"}, {"wait": 1200}], expect_dialog=True)

# ── "Verify to continue" screen (default workspace = unverified) ─────────────
G = "/tenders/new"
st("b12-gate-empty", "Verify-to-continue: empty company (real default workspace)", G, ws=None)
st("b12-gate-keyboard", "Verify-to-continue: first field tapped, keyboard open", G, ws=None, kb=True)
st("b12-gate-filled", "Verify-to-continue: details + CR certificate ready", G, ov(info(**FILLED), docs(("cr_certificate", AR_FILE))), ws=None)
st("b12-gate-all-docs", "Verify-to-continue: all documents, long file names", G,
   ov(info(name=AR_NAME, cr="1010123456", vat="300123456700003", city="الرياض"),
      docs(("cr_certificate", AR_FILE), ("vat_certificate", EN_FILE), ("gosi_certificate", "gosi.png"), ("national_address_certificate", EN_FILE))), ws=None)
st("b12-gate-review", "Verify-to-continue: under review", G, ov(info("under_review", **FILLED), docs(("cr_certificate", AR_FILE))), ws=None)
st("b12-gate-rejected", "Verify-to-continue: rejected", G,
   ov(info("rejected", **FILLED, reason="الشهادة المرفوعة غير مقروءة. يرجى رفع نسخة أوضح."), docs(("cr_certificate", EN_FILE))), ws=None)
st("b12-gate-long-en", "Verify-to-continue: very long English name", G,
   ov(info(name=EN_NAME, cr="1010123456", city="Jeddah"), docs(("cr_certificate", EN_FILE))), ws=None)

d["states"] += S
json.dump(d, open(P, "w"), ensure_ascii=False, indent=2)
print(len(S), "states")
