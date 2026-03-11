import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getStagedDiff(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--cached", "--no-color"],
    { cwd, maxBuffer: 10 * 1024 * 1024 }
  );

  return stdout?.trim() || "";
}