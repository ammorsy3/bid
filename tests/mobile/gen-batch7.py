#!/usr/bin/env python3
"""Adds the batch-7 states (settings tabs, integrations, profile editors) to states.json.
Real data only: 'seet' = the Seet company workspace, no workspace key = Ahmed's empty default workspace.
Re-runnable. Saves are blocked by the guard, so nothing is ever written."""
import json
P = "tests/mobile/states.json"
d = json.load(open(P))
d["states"] = [s for s in d["states"] if s["batch"] != "batch-7"]
S = []
def st(id_, page, title, route, ws="seet", kb=False, wait=2500, click=None):
    s = {"id": id_, "batch": "batch-7", "page": page, "title": title, "route": route, "keyboard": kb}
    if ws: s["workspace"] = ws
    acts = [{"wait": wait}]
    if click: acts += [{"click": click}, {"wait": 800}]
    s["actions"] = acts
    S.append(s)
st("b7-settings-account", "settings-account", "Settings: account tab (Seet workspace)", "/settings")
st("b7-settings-account-new", "settings-account", "Settings: account tab (empty default workspace)", "/settings", ws=None)
st("b7-settings-account-keyboard", "settings-account", "Settings: account tab, first text box tapped, keyboard open", "/settings", kb=True)
st("b7-settings-company", "settings-company", "Settings: company tab (Seet)", "/settings?tab=company")
st("b7-settings-company-verify", "settings-company", "Settings: company tab, verification highlighted", "/settings?tab=company&highlight=verification")
st("b7-settings-company-new", "settings-company", "Settings: company tab (empty default workspace)", "/settings?tab=company", ws=None)
st("b7-settings-billing", "settings-billing", "Settings: billing tab (Seet)", "/settings?tab=billing")
st("b7-settings-billing-new", "settings-billing", "Settings: billing tab (empty default workspace)", "/settings?tab=billing", ws=None)
st("b7-settings-notifications", "settings-notifications", "Settings: notifications tab (Seet)", "/settings?tab=notifications")
st("b7-settings-notifications-new", "settings-notifications", "Settings: notifications tab (empty default workspace)", "/settings?tab=notifications", ws=None)
st("b7-integrations", "settings-integrations", "Integrations page (Seet)", "/settings/integrations")
st("b7-integrations-new", "settings-integrations", "Integrations page (empty default workspace)", "/settings/integrations", ws=None)
st("b7-profile-editor", "profile-editor", "Profile editor (Seet workspace)", "/company/edit")
st("b7-profile-editor-new", "profile-editor", "Profile editor (empty default workspace)", "/company/edit", ws=None)
st("b7-profile-editor-keyboard", "profile-editor", "Profile editor, first text box tapped, keyboard open", "/company/edit", kb=True)
d["states"] += S
json.dump(d, open(P, "w"), ensure_ascii=False, indent=2)
print(len(S), "states")
