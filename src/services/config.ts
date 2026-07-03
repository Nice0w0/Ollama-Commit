import * as vscode from "vscode";

export const defaultSystemPrompt =
  [
    "You are an assistant that writes concise, clear, professional git commit messages based on staged diff.",
    "Prefer conventional commits.",
    "Do not output any thinking, reasoning, analysis, or XML-style thinking tags.",
    "Return only the final commit message.",
  ].join("\n");

export type OllamaCommitConfig = {
  baseUrl: string;
  model: string;
  groqApiKey: string;
  groqModel: string;
  geminiApiKey: string;
  geminiModel: string;
  openaiModel: string;
  codexPath: string;
  claudePath: string;
  claudeModel: string;
  systemPrompt: string;
  enableThinking: boolean;
  enableCodex: boolean;
  enableClaude: boolean;
  ollamaUnavailableCooldownMs: number;
  maxDiffChars: number;
  temperature: number;
  copyToClipboard: boolean;
};

export function getConfig(): OllamaCommitConfig {
  const config = vscode.workspace.getConfiguration("ollamacommit");

  return {
    baseUrl: getString(config, "baseUrl", "http://127.0.0.1:11434"),
    model: getString(config, "model", "qwen2.5-coder:7b"),
    groqApiKey: getString(config, "groqApiKey", ""),
    groqModel: getString(config, "groqModel", "openai/gpt-oss-20b"),
    geminiApiKey: getString(config, "geminiApiKey", ""),
    geminiModel: getString(config, "geminiModel", "gemini-2.0-flash-lite"),
    openaiModel: getString(config, "openaiModel", ""),
    codexPath: getString(config, "codexPath", ""),
    claudePath: getString(config, "claudePath", ""),
    claudeModel: getString(config, "claudeModel", "sonnet"),
    systemPrompt: getString(config, "systemPrompt", defaultSystemPrompt),
    enableThinking: getBoolean(config, "enableThinking", false),
    enableCodex: getBoolean(config, "enableCodex", false),
    enableClaude: getBoolean(config, "enableClaude", false),
    ollamaUnavailableCooldownMs: getNumber(config, "ollamaUnavailableCooldownMs", 172800000),
    maxDiffChars: getNumber(config, "maxDiffChars", 12000),
    temperature: getNumber(config, "temperature", 0.2),
    copyToClipboard: getBoolean(config, "copyToClipboard", false),
  };
}

// vscode's config.get() only substitutes the default for `undefined`, so an
// explicit null or wrong-typed value in settings.json flows through unchecked.
// These guard against that (e.g. `null.trim()` or a string where a number is
// expected) by falling back to the default on any type mismatch.
function getString(config: vscode.WorkspaceConfiguration, key: string, fallback: string): string {
  const value = config.get(key);
  return typeof value === "string" ? value : fallback;
}

function getNumber(config: vscode.WorkspaceConfiguration, key: string, fallback: number): number {
  const value = config.get(key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getBoolean(config: vscode.WorkspaceConfiguration, key: string, fallback: boolean): boolean {
  const value = config.get(key);
  return typeof value === "boolean" ? value : fallback;
}

export type EditableSettings = Pick<
  OllamaCommitConfig,
  "baseUrl" | "model" | "groqApiKey" | "groqModel" | "geminiApiKey" | "geminiModel" | "openaiModel" | "codexPath" | "claudePath" | "claudeModel" | "systemPrompt" | "enableThinking" | "enableCodex" | "enableClaude" | "ollamaUnavailableCooldownMs"
>;

export async function updateEditableSettings(settings: EditableSettings): Promise<void> {
  const config = vscode.workspace.getConfiguration("ollamacommit");
  const updates: Array<[keyof EditableSettings, string | boolean | number]> = [];

  if (config.get<string>("baseUrl", "http://127.0.0.1:11434") !== settings.baseUrl) {
    updates.push(["baseUrl", settings.baseUrl]);
  }

  if (config.get<string>("model", "qwen2.5-coder:7b") !== settings.model) {
    updates.push(["model", settings.model]);
  }

  if (config.get<string>("groqApiKey", "") !== settings.groqApiKey) {
    updates.push(["groqApiKey", settings.groqApiKey]);
  }

  if (config.get<string>("groqModel", "openai/gpt-oss-20b") !== settings.groqModel) {
    updates.push(["groqModel", settings.groqModel]);
  }

  if (config.get<string>("geminiApiKey", "") !== settings.geminiApiKey) {
    updates.push(["geminiApiKey", settings.geminiApiKey]);
  }

  if (config.get<string>("geminiModel", "gemini-2.0-flash-lite") !== settings.geminiModel) {
    updates.push(["geminiModel", settings.geminiModel]);
  }

  if (config.get<string>("openaiModel", "") !== settings.openaiModel) {
    updates.push(["openaiModel", settings.openaiModel]);
  }

  if (config.get<string>("codexPath", "") !== settings.codexPath) {
    updates.push(["codexPath", settings.codexPath]);
  }

  if (config.get<string>("claudePath", "") !== settings.claudePath) {
    updates.push(["claudePath", settings.claudePath]);
  }

  if (config.get<string>("claudeModel", "sonnet") !== settings.claudeModel) {
    updates.push(["claudeModel", settings.claudeModel]);
  }

  if (config.get<string>("systemPrompt", defaultSystemPrompt) !== settings.systemPrompt) {
    updates.push(["systemPrompt", settings.systemPrompt]);
  }

  if (config.get<boolean>("enableThinking", false) !== settings.enableThinking) {
    updates.push(["enableThinking", settings.enableThinking]);
  }

  if (config.get<boolean>("enableCodex", false) !== settings.enableCodex) {
    updates.push(["enableCodex", settings.enableCodex]);
  }

  if (config.get<boolean>("enableClaude", false) !== settings.enableClaude) {
    updates.push(["enableClaude", settings.enableClaude]);
  }

  if (config.get<number>("ollamaUnavailableCooldownMs", 172800000) !== settings.ollamaUnavailableCooldownMs) {
    updates.push(["ollamaUnavailableCooldownMs", settings.ollamaUnavailableCooldownMs]);
  }

  for (const [key, value] of updates) {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }
}
