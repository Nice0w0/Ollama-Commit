export type GenerateCommitParams = {
  baseUrl: string;
  model: string;
  systemPrompt: string;
  diff: string;
  temperature: number;
};

type OllamaTagsResponse = {
  models?: Array<{
    name?: string;
  }>;
};

export async function generateCommitMessage(params: GenerateCommitParams): Promise<string> {
  const prompt = [
    "Write a git commit message for the following staged diff.",
    "Return only the commit message.",
    "",
    params.diff
  ].join("\n");

  const response = await fetch(`${params.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: params.model,
      stream: false,
      messages: [
        {
          role: "system",
          content: params.systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      options: {
        temperature: params.temperature
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    message?: { content?: string };
  };

  return (data.message?.content || "").trim();
}

export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/tags`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json() as OllamaTagsResponse;

  return (data.models || [])
    .map((model) => model.name?.trim() || "")
    .filter((name) => name.length > 0)
    .sort((left, right) => left.localeCompare(right));
}
