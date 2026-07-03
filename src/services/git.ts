import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// git quotes non-ASCII bytes in paths by default (core.quotepath=true), turning
// names like "café.js" into "caf\303\251.js" in the diff. Disable it so the
// model — and any path parsing — sees real filenames.
const QUOTE_PATH_OFF = ["-c", "core.quotepath=false"];

export async function getStagedDiff(cwd: string): Promise<string> {
  const { stdout } = await runGit(cwd, [...QUOTE_PATH_OFF, "diff", "--cached", "--no-color"]);

  return stdout?.trim() || "";
}

export async function getWorkingTreeDiff(cwd: string): Promise<string> {
  const { stdout } = await runGit(cwd, [...QUOTE_PATH_OFF, "diff", "--no-color"]);

  return stdout?.trim() || "";
}

export async function stageAllChanges(cwd: string): Promise<void> {
  await runGit(cwd, ["add", "-A"]);
}

export async function hasUntrackedFiles(cwd: string): Promise<boolean> {
  const { stdout } = await runGit(cwd, ["ls-files", "--others", "--exclude-standard"]);

  return stdout.trim().length > 0;
}

export async function getRepositoryRoot(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await runGit(cwd, ["rev-parse", "--show-toplevel"]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function runGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("git", args, {
      cwd,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (error) {
    throw normalizeGitError(error);
  }
}

function normalizeGitError(error: unknown): Error {
  const err = error as NodeJS.ErrnoException;

  if (err?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" || /maxBuffer/i.test(err?.message ?? "")) {
    return new Error("The git diff is too large to process. Try staging fewer changes.");
  }

  if (err?.code === "ENOENT") {
    return new Error("Could not find the 'git' executable on your PATH.");
  }

  return err instanceof Error ? err : new Error(String(error));
}
