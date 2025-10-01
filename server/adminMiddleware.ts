import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export async function isAdmin(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user.claims || !req.user.claims.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error in admin middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
