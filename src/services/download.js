import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const binary = process.env.YTDLP_BIN || "yt-dlp";
const tempRoot = path.resolve(process.env.TEMP_DIR || "./tmp/sntklipx");

const formatMap = {
  "MP4 HD": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
  "MP4": "best[ext=mp4]/best",
  "Audio": "bestaudio/best"
};

function safeFilename(value) {
  return String(value || "sntklipx-download")
    .replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, "")
    .replace(/\\s+/g, " ")
    .trim()
    .slice(0, 120) || "sntklipx-download";
}

export async function downloadMedia({ url, format }) {
  const selectedFormat = formatMap[format];
  if (!selectedFormat) {
    const error = new Error("Unsupported format.");
    error.statusCode = 400;
    error.publicMessage = "That download format is not available.";
    throw error;
  }

  await fs.mkdir(tempRoot, { recursive: true });

  const jobId = randomUUID();
  const jobDir = path.join(tempRoot, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  const outputTemplate = path.join(jobDir, "%(title).120B.%(ext)s");

  const args = [
    "--no-playlist",
    "--no-warnings",
    "--restrict-filenames",
    "-f", selectedFormat,
    "-o", outputTemplate,
    url
  ];

  if (format === "Audio") {
    args.push("-x", "--audio-format", "mp3");
  }

  try {
    await run(binary, args, 120000);

    const entries = await fs.readdir(jobDir);
    const file = entries.find(name => !name.endsWith(".part"));

    if (!file) {
      const error = new Error("Download produced no file.");
      error.statusCode = 502;
      error.publicMessage = "The media service could not produce a downloadable file.";
      throw error;
    }

    return {
      jobId,
      filePath: path.join(jobDir, file),
      filename: safeFilename(file)
    };
  } catch (error) {
    await fs.rm(jobDir, { recursive: true, force: true });
    throw error;
  }
}

function run(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      const error = new Error("Download timed out.");
      error.statusCode = 504;
      error.publicMessage = "The download took too long. Please try again.";
      reject(error);
    }, timeoutMs);

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });

    child.on("error", error => {
      clearTimeout(timer);
      if (error.code === "ENOENT") {
        error.statusCode = 503;
        error.publicMessage = "The media engine is not installed on the server.";
      }
      reject(error);
    });

    child.on("close", code => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      const error = new Error(`yt-dlp exited with code ${code}: ${stderr}`);
      error.statusCode = 502;
      error.publicMessage = "The media service could not download this URL.";
      reject(error);
    });
  });
}
