import * as vscode from "vscode";
import { getConfig } from "../services/config";
import { getStagedDiff } from "../services/git";
import { generateCommitMessage } from "../services/ollama";

export async function runGenerateCommit() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }

  const cwd = workspaceFolder.uri.fsPath;
  const config = getConfig();

  const diff = await getStagedDiff(cwd);

  if (!diff) {
    vscode.window.showWarningMessage("No staged changes found");
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