import * as vscode from "vscode";
import { getConfig } from "../services/config";
import { getStagedDiff, getWorkingTreeDiff, stageAllChanges } from "../services/git";
import { generateCommitMessage } from "../services/ollama";

export async function runGenerateCommit() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }

  const cwd = workspaceFolder.uri.fsPath;
  const config = getConfig();

  const diff = await resolveDiff(cwd);
  if (!diff) {
    return;
  }

  const trimmedDiff = diff.slice(0, config.maxDiffChars);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Generating commit message with Ollama...",
      cancellable: false
    },
    async () => {
      const message = await generateCommitMessage({
        baseUrl: config.baseUrl,
        model: config.model,
        systemPrompt: config.systemPrompt,
        diff: trimmedDiff,
        temperature: config.temperature
      });

      if (!message) {
        vscode.window.showWarningMessage("Ollama returned an empty commit message");
        return;
      }

      const scm = vscode.scm;
      if (scm.inputBox) {
        scm.inputBox.value = message;
      } else {
        await vscode.env.clipboard.writeText(message);
      }

      if (config.copyToClipboard) {
        await vscode.env.clipboard.writeText(message);
      }

      vscode.window.showInformationMessage("Commit message generated");
    }
  );
}

async function resolveDiff(cwd: string): Promise<string | null> {
  const stagedDiff = await getStagedDiff(cwd);
  if (stagedDiff) {
    return stagedDiff;
  }

  const workingTreeDiff = await getWorkingTreeDiff(cwd);
  if (!workingTreeDiff) {
    vscode.window.showWarningMessage("No changes found");
    return null;
  }

  const action = await vscode.window.showWarningMessage(
    "No staged changes found",
    { modal: true },
    "Stage All and Generate",
    "Use Unstaged Changes"
  );

  if (action === "Stage All and Generate") {
    await stageAllChanges(cwd);
    return getStagedDiff(cwd);
  }

  if (action === "Use Unstaged Changes") {
    return workingTreeDiff;
  }

  return null;
}
