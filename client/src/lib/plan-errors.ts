// For raw fetch() calls that bypass apiRequest (e.g. the AI copilot's streaming
// chat): if the response is a 403 PLAN_REQUIRED, open the upgrade dialog.
import { openUpgrade } from "./upgrade-store";
import { isFeature } from "@shared/entitlements";

/** Returns true when the response was a plan limit (and the dialog is now open). */
export async function openUpgradeIfPlanRequired(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const body = await res.clone().json();
    if (body?.code === "PLAN_REQUIRED" && (body.feature === "tenders" || isFeature(body.feature))) {
      openUpgrade(body.feature, body.message);
      return true;
    }
  } catch { /* not JSON */ }
  return false;
}
