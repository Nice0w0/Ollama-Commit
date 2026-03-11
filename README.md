# Ollama Commit

VS Code extension for generating git commit messages from staged changes using a local Ollama model.

## Features

- Reads `git diff --cached`
- Sends the staged diff to Ollama
- Writes the generated message into the Source Control input box
- Exposes settings for model, system prompt, base URL, temperature, and diff size
- Includes a dedicated settings page with model picker and system prompt editor

## Settings

Run `Ollama Commit: Open Settings Page` to edit the extension settings in a dedicated UI.

You can also open VS Code Settings and search for `Ollama Commit`.

- `ollamacommit.baseUrl`
- `ollamacommit.model`
- `ollamacommit.systemPrompt`
- `ollamacommit.maxDiffChars`
- `ollamacommit.temperature`
- `ollamacommit.copyToClipboard`

## Development

```bash
npm install
npm run build
```

Press `F5` in VS Code to launch the extension host.

## Usage

1. Stage your changes.
2. Open the Command Palette.
3. Run `Ollama Commit: Generate Commit Message`.

To jump straight to the extension settings page, run `Ollama Commit: Open Settings Page`.
