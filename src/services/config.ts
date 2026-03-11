import * as vscode from "vscode";

export const defaultSystemPrompt =
  "You are an assistant that writes concise, clear, professional git commit messages based on staged diff. Prefer conventional commits. Do not output any thinking, reasoning, analysis, or XML-style thinking tags. Return only the final commit message.";

export type OllamaCommitConfig = {
  baseUrl: string;
  model: string;
  systemPrompt: string;
  enableThinking: boolean;
  maxDiffChars: number;
  temperature: number;
  copyToClipboard: boolean;
};

export function getConfig(): OllamaCommitConfig {
  const config = vscode.workspace.getConfiguration("ollamacommit");

  return {
    baseUrl: config.get<string>("baseUrl", "http://127.0.0.1:11434"),
    model: config.get<string>("model", "qwen2.5-coder:7b"),
    systemPrompt: config.get<string>("systemPrompt", defaultSystemPrompt),
    enableThinking: config.get<boolean>("enableThinking", false),
    maxDiffChars: config.get<number>("maxDiffChars", 12000),
    temperature: config.get<number>("temperature", 0.2),
    copyToClipboard: config.get<boolean>("copyToClipboard", false),
  };
}

export type EditableSettings = Pick<OllamaCommitConfig, "baseUrl" | "model" | "systemPrompt" | "enableThinking">;

export async function updateEditableSettings(settings: EditableSettings): Promise<void> {
  const config = vscode.workspace.getConfiguration("ollamacommit");

  await Promise.all([
    config.update("baseUrl", settings.baseUrl, vscode.ConfigurationTarget.Global),
    config.update("model", settings.model, vscode.ConfigurationTarget.Global),
    config.update("systemPrompt", settings.systemPrompt, vscode.ConfigurationTarget.Global),
    config.update("enableThinking", settings.enableThinking, vscode.ConfigurationTarget.Global),
  ]);
}
