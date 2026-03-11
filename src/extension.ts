import * as vscode from "vscode";
import { runGenerateCommit } from "./commands/generateCommit";
import { SettingsPanel } from "./panels/settingsPanel";

export function activate(context: vscode.ExtensionContext) {
  const generateCommitCommand = vscode.commands.registerCommand(
    "ollamacommit.generateCommit",
    async () => {
      try {
        await runGenerateCommit();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Ollama Commit failed: ${message}`);
      }
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    "ollamacommit.openSettings",
    async () => {
      SettingsPanel.createOrShow(context.extensionUri);
    }
  );

  context.subscriptions.push(generateCommitCommand, openSettingsCommand);
}

export function deactivate() {}
