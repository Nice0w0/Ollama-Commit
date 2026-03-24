import * as vscode from "vscode";

export const defaultSystemPrompt =
  [
    "You are a Git commit message generator.",
    "",
    "Write a concise, clear, professional commit message from the provided staged diff.",
    "",
    "Requirements:",
    "- Use Conventional Commits format:",
    "  <type>(optional scope): <subject>",
    "- Allowed types:",
    "  feat, fix, docs, style, refactor, perf, test, chore, build, ci",
    "- Subject rules:",
    "  - lowercase",
    "  - imperative mood",
    "  - no trailing period",
    "  - maximum 72 characters",
    "",
    "Body rules:",
    "- Add a body only when necessary",
    "- Explain why, not what",
    "- Wrap body lines at 72 characters",
    "",
    "Behavior:",
    "- Infer the most appropriate type and optional scope from the diff",
    "- Do not include file names, diffs, bullets, or explanations",
    "- Do not include reasoning, analysis, or thinking text",
    "- Do not use markdown, XML tags, or code fences",
    "",
    "Output:",
    "- Return only the final commit message",
  ].join("\n");

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
  const updates: Array<[keyof EditableSettings, string | boolean]> = [];

  if (config.get<string>("baseUrl", "http://127.0.0.1:11434") !== settings.baseUrl) {
    updates.push(["baseUrl", settings.baseUrl]);
  }

  if (config.get<string>("model", "qwen2.5-coder:7b") !== settings.model) {
    updates.push(["model", settings.model]);
  }

  if (config.get<string>("systemPrompt", defaultSystemPrompt) !== settings.systemPrompt) {
    updates.push(["systemPrompt", settings.systemPrompt]);
  }

  if (config.get<boolean>("enableThinking", false) !== settings.enableThinking) {
    updates.push(["enableThinking", settings.enableThinking]);
  }

  for (const [key, value] of updates) {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }
}
