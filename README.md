# Ollama Commit

Generate Git commit messages in VS Code with a local Ollama model.

`ollamacommit` reads your Git diff, sends it to Ollama, and fills the commit message input in Source Control for you.

## What It Does

- Generates commit messages from staged changes
- If nothing is staged, lets you:
  - stage everything and generate
  - generate from unstaged changes
- Adds a `Generate Commit` button to the Source Control toolbar
- Provides a dedicated settings page for:
  - Ollama URL
  - model
  - system prompt
  - thinking on/off
- Loads installed models from Ollama so you can pick one directly
- Tries to suppress model reasoning by:
  - sending `think: false` by default
  - stripping common `<think>...</think>` blocks from the final output
- Handles common Windows + WSL connection issues with automatic fallback host detection

## Requirements

- VS Code `1.90.0` or newer
- Git available in the same environment where the extension runs
- Ollama installed and running
- At least one Ollama model already pulled

## Quick Start

1. Start Ollama
2. Pull a model
3. Install the extension
4. Open the extension settings page
5. Select your model
6. Click `Generate Commit` in Source Control

Example:

```bash
ollama serve
ollama pull qwen2.5-coder:7b
```

## Install Ollama

If Ollama is not installed yet, install it first and make sure the server is running.

Typical local URL:

```text
http://127.0.0.1:11434
```

Test it manually:

```bash
curl http://127.0.0.1:11434/api/tags
```

If that returns model data, the extension should be able to connect.

## Install The Extension

### Option 1: Run In Development Mode

Use this if you are building or testing the extension locally.

```bash
npm install
npm run build
```

Then:

1. Open this repository in VS Code
2. Press `F5`
3. A new Extension Development Host window will open

### Option 2: Build A VSIX Package

Use this if you want to install the extension into your normal VS Code.

```bash
npm install
npm run build
npm run package
```

Then install it in VS Code:

1. Open Command Palette
2. Run `Extensions: Install from VSIX...`
3. Select the generated `.vsix`
4. Reload VS Code if needed

## Updating The Extension

### If You Use Development Mode

```bash
npm run build
```

Then reload the Extension Development Host or press `F5` again.

### If You Use A VSIX Package

```bash
npm run build
npm run package
```

Then install the new `.vsix` on top of the old version.

## Commands

The extension contributes these commands:

- `Ollama Commit: Generate Commit Message`
- `Ollama Commit: Open Settings Page`

You can access them from:

- Command Palette
- Source Control toolbar

## Source Control Integration

The extension adds its own `Generate Commit` action to the Source Control toolbar.

When generation succeeds, it tries to fill the Git commit input box directly and switches focus to the Source Control view.

Important limitation:

- the extension can add toolbar actions
- it cannot fully replace VS Code's built-in Git buttons without implementing a custom SCM provider

## Settings

Open the dedicated settings page:

```text
Ollama Commit: Open Settings Page
```

Or open normal VS Code Settings and search for `Ollama Commit`.

### `ollamacommit.baseUrl`

Base URL for the Ollama server.

Default:

```text
http://127.0.0.1:11434
```

Examples:

```text
http://127.0.0.1:11434
http://localhost:11434
http://192.168.1.10:11434
```

### `ollamacommit.model`

The Ollama model used to generate commit messages.

Default:

```text
qwen2.5-coder:7b
```

### `ollamacommit.systemPrompt`

The system prompt sent before the diff.

Current default:

```text
You are an assistant that writes concise, clear, professional git commit messages based on staged diff. Prefer conventional commits. Do not output any thinking, reasoning, analysis, or XML-style thinking tags. Return only the final commit message.
```

Note:

- if you already saved a custom prompt earlier, your saved value stays as-is
- changing the default in code does not overwrite an existing saved setting

### `ollamacommit.enableThinking`

Controls whether the extension asks Ollama to enable model thinking/reasoning mode.

Default:

```text
false
```

When `false`, the extension sends:

```text
think: false
```

When `true`, the extension sends:

```text
think: true
```

### `ollamacommit.maxDiffChars`

Maximum number of diff characters sent to Ollama.

Default:

```text
12000
```

### `ollamacommit.temperature`

Sampling temperature passed to Ollama.

Default:

```text
0.2
```

### `ollamacommit.copyToClipboard`

Also copy the generated commit message to the clipboard.

Default:

```text
false
```

## Settings Page

The settings page lets you:

- change the Ollama URL
- refresh the list of available models
- choose a model from detected models
- type a custom model manually
- edit the system prompt
- enable or disable thinking
- save the settings back to VS Code

If model loading succeeds through a fallback host while running in WSL, the page will show a message like:

```text
Connected through http://172.xx.xx.x:11434 while keeping your saved URL unchanged.
```

That means the extension found a reachable Ollama host automatically even though your configured URL stayed the same.

## How Generation Works

High-level flow:

1. Resolve the Git repository for the current workspace
2. Collect the diff
3. Trim the diff with `ollamacommit.maxDiffChars`
4. Send a chat request to Ollama
5. Ask the model to return only the commit message
6. Remove common reasoning tags if they appear
7. Insert the final text into the Source Control commit box

## Usage

### Normal Flow

1. Open a Git repository in VS Code
2. Make code changes
3. Stage files if you want the message based only on staged changes
4. Open Source Control
5. Click `Generate Commit`
6. Review the generated message
7. Commit normally

You can also run the command from Command Palette:

```text
Ollama Commit: Generate Commit Message
```

### When Nothing Is Staged

If there are unstaged changes but no staged changes, the extension will ask:

- `Stage All and Generate`
- `Use Unstaged Changes`

If there are no changes at all, it shows:

```text
No changes found
```

## Windows And WSL

### Running VS Code On Windows

If VS Code and the extension run on Windows and Ollama also runs on Windows, this is usually enough:

```text
http://127.0.0.1:11434
```

### Running VS Code With Remote - WSL

If you open the repository with `Remote - WSL`, the extension runs inside WSL.

In that case:

- `127.0.0.1` may point to WSL itself, not Windows Ollama
- the extension will first try your configured `baseUrl`
- if that fails, it will try common Windows host candidates detected from WSL networking

Typical success case:

```text
Connected through http://172.xx.xx.x:11434 while keeping your saved URL unchanged.
```

If it still cannot connect, the problem is usually outside the extension:

- Windows Firewall blocks port `11434`
- Ollama only listens on localhost in a way WSL cannot reach
- the wrong Ollama URL is configured

## Reasoning / Thinking Output

Some Ollama models may emit reasoning text, thinking text, or XML-like tags such as:

```text
<think>...</think>
```

This extension reduces that in two ways:

1. It sends `think: false` in the chat request
2. It strips common thinking tags from the final message before inserting it

Important note:

- model behavior is still model-dependent
- if you use a custom prompt that explicitly encourages reasoning output, the model may still try to produce it
- if you want cleaner results, keep the system prompt strict and concise

## Troubleshooting

### `npm error code EJSONPARSE`

This means `package.json` is invalid JSON or was empty.

Fix the file and then run:

```bash
npm install
```

### `No staged changes found`

This is no longer a hard stop.

The extension should offer:

- `Stage All and Generate`
- `Use Unstaged Changes`

### `No changes found`

There are no staged or unstaged changes in the current repository.

### `Commit message generated` But Nothing Appeared

Current behavior is:

- try Git extension API first
- try VS Code SCM input box next
- fall back to clipboard if insertion fails

If insertion fails, the extension warns instead of silently pretending success.

### Cannot Connect To Ollama

Check these first:

1. Ollama is running
2. The URL is correct
3. The model exists locally
4. WSL can reach Windows networking if you use `Remote - WSL`

Manual tests:

```bash
curl http://127.0.0.1:11434/api/tags
```

For WSL, also test the resolved Windows host if needed.

### Models Do Not Load In The Settings Page

Usually one of these:

- Ollama is not running
- the configured URL is wrong
- WSL fallback could not find a reachable Windows host
- firewall or bind settings block the connection

### The Model Still Prints Thinking Output

Check:

1. Your saved `systemPrompt`
2. The model you selected
3. Whether the model ignores `think: false`

If needed, reset the system prompt and keep it strict.

## Development

### Scripts

```bash
npm run build
npm run watch
npm run package
```

### Project Structure

```text
src/
  commands/
  panels/
  services/
  extension.ts
media/
LICENSE
package.json
README.md
```

### File Responsibilities

- `src/extension.ts`
  Registers commands
- `src/commands/generateCommit.ts`
  Main generation flow, Git integration, Source Control insertion
- `src/services/git.ts`
  Git diff collection and staging helpers
- `src/services/ollama.ts`
  Ollama API requests, WSL fallback resolution, output sanitizing
- `src/services/config.ts`
  Reads and updates extension settings
- `src/panels/settingsPanel.ts`
  Dedicated settings webview UI
- `media/`
  Toolbar icons

## Privacy And Runtime Notes

- The extension sends your diff to the Ollama server configured in `ollamacommit.baseUrl`
- If you use a local Ollama instance, the data stays within that local environment
- Large diffs are trimmed before sending
- Output quality depends on:
  - the model
  - the prompt
  - the diff quality

## Current Limitations

- It does not replace VS Code's native Git commit action
- It currently targets the first matching workspace folder / repository flow
- Some models may still output non-ideal text even with strict prompts

## License

MIT. See [LICENSE](./LICENSE).
