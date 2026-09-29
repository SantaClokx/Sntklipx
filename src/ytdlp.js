import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const binary = process.env.YTDLP_BIN || "yt-dlp";

export async function inspectUrl(url) {
  const { stdout } = await execFileAsync(
    binary,
    [
      "--dump-single-json",
      "--no-playlist",
      "--skip-download",
      "--no-warnings",
      url
    ],
    {
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024
    }
  );

  const data = JSON.parse(stdout);

  const formats = Array.isArray(data.formats)
    ? data.formats
        .filter(f => f.vcodec && f.vcodec !== "none")
        .map(f => ({
          id: f.format_id,
          ext: f.ext,
          height: f.height || null,
          width: f.width || null,
          fps: f.fps || null,
          filesize: f.filesize || f.filesize_approx || null,
          hasAudio: Boolean(f.acodec && f.acodec !== "none")
        }))
        .filter(f => f.height)
        .sort((a, b) => (b.height || 0) - (a.height || 0))
        .slice(0, 20)
    : [];

  return {
    title: data.title,
    thumbnail: data.thumbnail,
    duration: data.duration,
    formats
  };
}
