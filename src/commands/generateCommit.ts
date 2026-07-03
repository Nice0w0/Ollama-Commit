import * as path from "node:path";
import * as vscode from "vscode";
import { getConfig } from "../services/config";
import {
  getRepositoryRoot,
  getStagedDiff,
  getWorkingTreeDiff,
  hasUntrackedFiles,
  stageAllChanges,
} from "../services/git";
import { generateCommitMessage } from "../services/ollama";

// Distinguishes "the user dismissed the repository picker" from "no repository
// was found", so cancelling the quick pick doesn't surface an error.
const REPOSITORY_SELECTION_CANCELLED = Symbol("repository-selection-cancelled");

type GitExtensionApi = {
  getAPI(version: 1): GitApi;
};

type GitApi = {
  repositories: GitRepository[];
};

type GitRepository = {
  rootUri: vscode.Uri;
  inputBox: {
    value: string;
  };
};

export async function runGenerateCommit(sourceControl?: vscode.SourceControl) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }

  const repositoryRoot = await resolveRepositoryRoot(sourceControl, workspaceFolder);
  if (repositoryRoot === REPOSITORY_SELECTION_CANCELLED) {
    return;
  }
  if (!repositoryRoot) {
    vscode.window.showErrorMessage("No git repository found in the current workspace");
    return;
  }

  const cwd = repositoryRoot.fsPath;
  const config = getConfig();

  const diff = await resolveDiff(cwd);
  if (!diff) {
    return;
  }

  const trimmedDiff = diff.slice(0, config.maxDiffChars);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Generating commit message...",
      cancellable: false
    },
    async () => {
      const result = await generateCommitMessage({
        baseUrl: config.baseUrl,
        model: config.model,
        groqApiKey: config.groqApiKey,
        groqModel: config.groqModel,
        geminiApiKey: config.geminiApiKey,
        geminiModel: config.geminiModel,
        openaiModel: config.openaiModel,
        codexPath: config.codexPath,
        claudePath: config.claudePath,
        claudeModel: config.claudeModel,
        systemPrompt: config.systemPrompt,
        enableThinking: config.enableThinking,
        enableCodex: config.enableCodex,
        enableClaude: config.enableClaude,
        ollamaUnavailableCooldownMs: config.ollamaUnavailableCooldownMs,
        diff: trimmedDiff,
        temperature: config.temperature,
        cwd
      });

      const { message, provider, model } = result;

      const insertedIntoInput = await tryInsertCommitMessage(repositoryRoot, message);

      if (!insertedIntoInput || config.copyToClipboard) {
        await vscode.env.clipboard.writeText(message);
      }

      if (insertedIntoInput) {
        await vscode.commands.executeCommand("workbench.view.scm");
        vscode.window.setStatusBarMessage(
          `Ollama Commit filled the Source Control commit message using ${provider} (${model})`,
          5000
        );
        return;
      }

      const action = await vscode.window.showWarningMessage(
        "Could not insert into the Source Control input box. The commit message was copied to the clipboard.",
        "Preview"
      );

      if (action === "Preview") {
        await showCommitMessagePreview(message);
      }
    }
  );
}

async function resolveDiff(cwd: string): Promise<string | null> {
  const stagedDiff = await getStagedDiff(cwd);
  if (stagedDiff) {
    return stagedDiff;
  }

  const workingTreeDiff = await getWorkingTreeDiff(cwd);
  const hasUntracked = workingTreeDiff ? false : await hasUntrackedFiles(cwd);
  if (!workingTreeDiff && !hasUntracked) {
    vscode.window.showWarningMessage("No changes found");
    return null;
  }

  // "Use Unstaged Changes" only makes sense when there is a tracked-file diff;
  // brand-new (untracked) files appear in a diff only after `git add -A`.
  const stageAll = "Stage All and Generate";
  const useUnstaged = "Use Unstaged Changes";
  const choices = workingTreeDiff ? [stageAll, useUnstaged] : [stageAll];

  const action = await vscode.window.showWarningMessage(
    "No staged changes found",
    { modal: true },
    ...choices
  );

  if (action === stageAll) {
    await stageAllChanges(cwd);
    return getStagedDiff(cwd);
  }

  if (action === useUnstaged) {
    return workingTreeDiff;
  }

  return null;
}

async function resolveRepositoryRoot(
  sourceControl: vscode.SourceControl | undefined,
  workspaceFolder: vscode.WorkspaceFolder
): Promise<vscode.Uri | null | typeof REPOSITORY_SELECTION_CANCELLED> {
  if (sourceControl?.rootUri) {
    return sourceControl.rootUri;
  }

  const repositories = await getGitRepositories();

  const activeEditorUri = vscode.window.activeTextEditor?.document.uri;
  if (activeEditorUri?.scheme === "file") {
    const repository = pickRepository(repositories, activeEditorUri);
    if (repository) {
      return repository.rootUri;
    }
  }

  const workspaceRepository = pickRepository(repositories, workspaceFolder.uri);
  if (workspaceRepository) {
    return workspaceRepository.rootUri;
  }

  if (repositories.length === 1) {
    return repositories[0].rootUri;
  }

  if (repositories.length > 1) {
    const picked = await pickRepositoryFromQuickPick(repositories);
    return picked ?? REPOSITORY_SELECTION_CANCELLED;
  }

  // Fallback: ask git directly. Prefer the active editor's directory so a repo
  // in a workspace subfolder is still found when the Git API hasn't surfaced it
  // (e.g. a non-git parent folder opened over nested repositories).
  const fallbackDirs: string[] = [];
  if (activeEditorUri?.scheme === "file") {
    fallbackDirs.push(path.dirname(activeEditorUri.fsPath));
  }
  fallbackDirs.push(workspaceFolder.uri.fsPath);

  for (const dir of fallbackDirs) {
    const root = await getRepositoryRoot(dir);
    if (root) {
      return vscode.Uri.file(root);
    }
  }

  return null;
}

async function pickRepositoryFromQuickPick(repositories: GitRepository[]): Promise<vscode.Uri | null> {
  const items = repositories.map((repository) => ({
    label: vscode.workspace.asRelativePath(repository.rootUri),
    description: repository.rootUri.fsPath,
    rootUri: repository.rootUri,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Select the git repository to generate a commit message for",
  });

  return picked?.rootUri ?? null;
}

async function getGitRepositories(): Promise<GitRepository[]> {
  const gitApi = await getGitApi();
  return gitApi?.repositories ?? [];
}

async function getGitApi(): Promise<GitApi | null> {
  const gitExtension = vscode.extensions.getExtension<GitExtensionApi>("vscode.git");
  if (!gitExtension) {
    return null;
  }

  return gitExtension.isActive
    ? gitExtension.exports.getAPI(1)
    : (await gitExtension.activate()).getAPI(1);
}

async function tryInsertCommitMessage(repositoryUri: vscode.Uri, message: string): Promise<boolean> {
  const insertedWithGitApi = await tryInsertWithGitExtension(repositoryUri, message);
  if (insertedWithGitApi) {
    return true;
  }

  const scm = vscode.scm;
  if (scm.inputBox) {
    scm.inputBox.value = message;
    return true;
  }

  return false;
}

async function tryInsertWithGitExtension(repositoryUri: vscode.Uri, message: string): Promise<boolean> {
  const gitApi = await getGitApi();
  if (!gitApi) {
    return false;
  }

  const repository = pickRepository(gitApi.repositories, repositoryUri);
  if (!repository) {
    return false;
  }

  repository.inputBox.value = message;
  return true;
}

function pickRepository(repositories: GitRepository[], targetUri: vscode.Uri): GitRepository | undefined {
  const targetPath = targetUri.fsPath;

  return repositories
    .filter((repository) => isPathInside(targetPath, repository.rootUri.fsPath))
    .sort((left, right) => right.rootUri.fsPath.length - left.rootUri.fsPath.length)[0];
}

function isPathInside(target: string, parent: string): boolean {
  const relative = path.relative(normalizeCasing(parent), normalizeCasing(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

// macOS and Windows use case-insensitive filesystems, and VS Code may open a
// folder via a differently-cased path than git reports. Compare case-insensitively
// there so repository matching doesn't silently miss.
function normalizeCasing(value: string): string {
  return process.platform === "win32" || process.platform === "darwin"
    ? value.toLowerCase()
    : value;
}

async function showCommitMessagePreview(message: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    content: message,
    language: "plaintext",
  });

  await vscode.window.showTextDocument(document, {
    preview: true,
    viewColumn: vscode.ViewColumn.Beside,
  });
}
