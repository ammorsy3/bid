// Reading a request's bill of quantities (RFQ-B3).
//
//   GET /api/tenders/:id/items            signed in: the owner gets everything;
//                                          other readers (tender read policy) the vendor view
//   GET /api/tenders/:idOrToken/invite/items  public, like the invitation page: published only,
//                                          vendor view
//
// The vendor view (shared/boq-items.ts vendorItemView) leaves hidden reference
// prices OUT of the response and suppresses optional columns nobody filled.
// Items are never written here: they are created with the request and locked.

import type { Express, RequestHandler } from "express";
import { vendorItemView } from "@shared/boq-items";
import { storage } from "../storage";
import { resolveTenderReadGrant } from "../lib/tender-access";
import { tenderItemsStore as defaultStore, type TenderItemsStore } from "../lib/tender-items-store";
import type { AuthRequest } from "../middleware/auth-types";

interface Deps {
  authenticateToken: RequestHandler;
  store?: TenderItemsStore;
}

export function registerTenderItemRoutes(app: Express, { authenticateToken, store = defaultStore }: Deps) {
  app.get("/api/tenders/:id/items", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) return res.status(404).json({ message: "Tender not found" });
      // PB-1: the token's active company counts only while the caller is still a
      // member of it; a removed member is treated as having no company.
      const claimed = req.auth!.activeCompanyId;
      const companyId = claimed && (await storage.getUserRoleInCompany(req.auth!.userId, claimed)) ? claimed : null;
      const isOwner = !!companyId && tender.companyId === companyId;
      if (!isOwner && !(await resolveTenderReadGrant(tender, { userId: req.auth!.userId, companyId }, storage))) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!tender.itemizedPricing) return res.json({ itemized: false, items: [], columns: [] });
      const items = await store.getItems(tender.id, tender.itemsRevision);
      if (isOwner) {
        return res.json({
          itemized: true, owner: true, requestType: tender.requestType, itemsRevision: tender.itemsRevision,
          showReferencePrices: tender.showReferencePrices, columns: tender.itemColumns ?? [], items,
        });
      }
      res.json({ itemized: true, owner: false, requestType: tender.requestType, itemsRevision: tender.itemsRevision, ...vendorItemView(items, tender.itemColumns, tender.showReferencePrices) });
    } catch (error) {
      console.error("Get tender items error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tenders/:idOrToken/invite/items", async (req, res) => {
    try {
      const tender = (await storage.getTenderByInvitationToken(req.params.idOrToken)) ?? (await storage.getTender(req.params.idOrToken));
      if (!tender || tender.status !== "published") return res.status(404).json({ message: "Tender not available" });
      if (!tender.itemizedPricing) return res.json({ itemized: false, items: [], columns: [] });
      const items = await store.getItems(tender.id, tender.itemsRevision);
      res.json({ itemized: true, owner: false, requestType: tender.requestType, itemsRevision: tender.itemsRevision, ...vendorItemView(items, tender.itemColumns, tender.showReferencePrices) });
    } catch (error) {
      console.error("Get invite items error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}
