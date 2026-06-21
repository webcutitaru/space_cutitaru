import { spawn } from "node:child_process";
import type { YtdlpInfo } from "@/lib/reelsave/types";
import {
  DOWNLOAD_TIMEOUT_MS,
  EXTRACT_TIMEOUT_MS,
} from "@/lib/reelsave/types";

const YTDLP_PATH = process.env.YTDLP_PATH ?? "yt-dlp";

function ytdlpErrorHint(stderr: string): string {
  if (/command not found|enoent/i.test(stderr)) {
    return "yt-dlp is not installed on the server.";
  }
  if (/private|login required|cookies/i.test(stderr)) {
    return "This video is private or requires login.";
  }
  if (/unsupported url|no video/i.test(stderr)) {
    return "No downloadable video found at this link.";
  }
  return stderr.trim().split("\n").pop() ?? "yt-dlp failed.";
}

function runYtdlp(
  args: string[],
  timeoutMs: number,
  collectStdout = true,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP_PATH, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        reject(new Error("Video extraction timed out."));
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      if (collectStdout) chunks.push(chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      errChunks.push(chunk);
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          err.message.includes("ENOENT")
            ? "yt-dlp is not installed on the server."
            : err.message,
        ),
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const stdout = Buffer.concat(chunks).toString("utf8");
      const stderr = Buffer.concat(errChunks).toString("utf8");

      if (code !== 0) {
        reject(new Error(ytdlpErrorHint(stderr || stdout)));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

export async function fetchVideoInfo(pageUrl: string): Promise<YtdlpInfo> {
  const { stdout } = await runYtdlp(
    ["--no-playlist", "--no-warnings", "-j", "--no-check-certificates", pageUrl],
    EXTRACT_TIMEOUT_MS,
  );

  const line = stdout.trim().split("\n").find(Boolean);
  if (!line) {
    throw new Error("No video metadata returned.");
  }

  try {
    return JSON.parse(line) as YtdlpInfo;
  } catch {
    throw new Error("Failed to parse video metadata.");
  }
}

export function streamVideoDownload(
  pageUrl: string,
  formatId: string,
): { stream: NodeJS.ReadableStream; kill: () => void } {
  const child = spawn(
    YTDLP_PATH,
    [
      "--no-playlist",
      "--no-warnings",
      "--no-check-certificates",
      "-f",
      `${formatId}+bestaudio/best`,
      "--merge-output-format",
      "mp4",
      "-o",
      "-",
      pageUrl,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  if (!child.stdout) {
    child.kill();
    throw new Error("Failed to start video download.");
  }

  const timer = setTimeout(() => child.kill("SIGKILL"), DOWNLOAD_TIMEOUT_MS);

  child.on("close", () => clearTimeout(timer));

  return {
    stream: child.stdout,
    kill: () => {
      clearTimeout(timer);
      child.kill("SIGKILL");
    },
  };
}

export async function checkYtdlpAvailable(): Promise<boolean> {
  try {
    await runYtdlp(["--version"], 5000);
    return true;
  } catch {
    return false;
  }
}
