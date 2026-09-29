import { Router } from "express";
import { inspectUrl } from "./ytdlp.js";
import { detectPlatform, isAllowedUrl } from "./validate.js";

export function createRouter() {
  const router = Router();

  router.post("/inspect", async (req, res, next) => {
    try {
      const url = String(req.body?.url || "").trim();

      if (!url || !isAllowedUrl(url)) {
        return res.status(400).json({
          ok: false,
          error: "Enter a valid public URL from a supported platform."
        });
      }

      const platform = detectPlatform(url);
      const info = await inspectUrl(url);

      res.json({
        ok: true,
        platform,
        title: info.title || "Untitled video",
        thumbnail: info.thumbnail || null,
        duration: info.duration || null,
        formats: info.formats || []
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
