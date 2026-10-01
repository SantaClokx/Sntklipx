import { Router } from "express";
import { inspectUrl } from "./ytdlp.js";
import { downloadMedia } from "./download.js";
import { detectPlatform, isAllowedUrl } from "./validate.js";

async function inspectHandler(req, res, next) {
  try {
    const url = String(req.body?.url || req.query?.url || "").trim();

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
}

export function createRouter() {
  const router = Router();

  router.get("/inspect", inspectHandler);
  router.post("/inspect", inspectHandler);

  router.post("/download", async (req, res, next) => {
    try {
      const url = String(req.body?.url || "").trim();
      const format = String(req.body?.format || "MP4 HD");

      if (!url || !isAllowedUrl(url)) {
        return res.status(400).json({
          ok: false,
          error: "Enter a valid public URL from a supported platform."
        });
      }

      const result = await downloadMedia({ url, format });

      res.download(result.filePath, result.filename, async error => {
        try {
          const { rm } = await import("node:fs/promises");
          await rm(result.filePath, { force: true });
          await rm(result.filePath.split("/").slice(0, -1).join("/"), {
            recursive: true,
            force: true
          });
        } catch (cleanupError) {
          console.error("Cleanup failed:", cleanupError);
        }

        if (error && !res.headersSent) next(error);
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
