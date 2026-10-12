#!/usr/bin/env python3
"""Adds the batch-8 states (admin pages) to states.json. Real data from Ahmed's admin account
(no workspace key = default sign-in). Reports for this batch contain real people's data: keep local.
Re-runnable. Saves are blocked by the guard."""
import json
P = "tests/mobile/states.json"
d = json.load(open(P))
d["states"] = [s for s in d["states"] if s["batch"] != "batch-8"]
PAGES = [
 ("dashboard", "admin-dashboard", "Admin: dashboard"),
 ("notifications", "admin-notifications", "Admin: notifications"),
 ("vendors", "admin-vendors", "Admin: company verification"),
 ("marketplace", "admin-marketplace", "Admin: marketplace approvals"),
 ("awards", "admin-awards", "Admin: blocked awards"),
 ("join-requests", "admin-join-requests", "Admin: join requests"),
 ("campaigns", "admin-campaigns", "Admin: campaigns"),
 ("checkouts", "admin-checkouts", "Admin: checkouts"),
 ("users", "admin-users", "Admin: user management"),
 ("audit-logs", "admin-audit-logs", "Admin: audit logs"),
 ("errors", "admin-errors", "Admin: error logs"),
]
S = []
for slug, page, title in PAGES:
    S.append({"id": f"b8-{slug}", "batch": "batch-8", "page": page, "title": title,
              "route": f"/admin/{slug}", "keyboard": False, "actions": [{"wait": 3000}]})
S.append({"id": "b8-shell-drawer", "batch": "batch-8", "page": "admin-shell", "title": "Admin: menu drawer open",
          "route": "/admin/dashboard", "keyboard": False, "expectDialog": True, "skipProjects": ["desktop"],
          "actions": [{"wait": 3000}, {"click": "[data-testid=button-admin-menu]"}, {"wait": 800}]})
S.append({"id": "b8-campaigns-delete-confirm", "batch": "batch-8", "page": "admin-campaigns", "title": "Admin: campaign delete confirm",
          "route": "/admin/campaigns", "keyboard": False, "expectDialog": True,
          "actions": [{"wait": 3000}, {"click": "[data-testid^=button-delete-]"}, {"wait": 800}]})
d["states"] += S
json.dump(d, open(P, "w"), ensure_ascii=False, indent=2)
print(len(S), "states")
