import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const DEFAULT_GROQ_MODEL = 'moonshotai/kimi-k2-instruct';
const GEMINI_MODEL = 'gemini-2.5-flash';

const ALLOWED_GROQ_MODELS = new Set<string>([
  'moonshotai/kimi-k2-instruct',
  'moonshotai/kimi-k2-instruct-0905',
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'qwen/qwen3-32b',
]);

const GROQ_FALLBACK_ORDER = [
  'moonshotai/kimi-k2-instruct',
  'moonshotai/kimi-k2-instruct-0905',
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'qwen/qwen3-32b',
];

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function queryGroqSingleModel(
  groqApiKey: string,
  modelId: string,
  systemInstruction: string,
  promptText: string,
): Promise<{ text: string; model: string }> {
  const requestBody: Record<string, unknown> = {
    model: modelId,
    temperature: 0.35,
    max_completion_tokens: 2048,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: promptText },
    ],
  };

  if (modelId === 'openai/gpt-oss-120b') {
    requestBody.reasoning_effort = 'medium';
    requestBody.reasoning_format = 'parsed';
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string; code?: string };
    model?: string;
  };

  if (!response.ok) {
    const errMsg = payload.error?.message || `Groq API request failed (${response.status})`;
    const error = new Error(errMsg) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = payload.error?.code;
    throw error;
  }

  const rawContent = payload.choices?.[0]?.message?.content || '';
  const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return {
    text: cleaned || 'No briefing text returned.',
    model: payload.model || modelId,
  };
}

async function queryGroqBriefing(
  groqApiKey: string,
  preferredModel: string,
  systemInstruction: string,
  promptText: string,
): Promise<{ text: string; model: string }> {
  const safePreferred =
    ALLOWED_GROQ_MODELS.has(preferredModel) && !preferredModel.includes('versatile')
      ? preferredModel
      : DEFAULT_GROQ_MODEL;

  const candidates = [
    safePreferred,
    ...GROQ_FALLBACK_ORDER.filter((m) => m !== safePreferred),
  ];

  let lastError: (Error & { status?: number; code?: string }) | null = null;
  for (const modelId of candidates) {
    try {
      return await queryGroqSingleModel(groqApiKey, modelId, systemInstruction, promptText);
    } catch (err: unknown) {
      const e = err as Error & { status?: number; code?: string };
      lastError = e;
      const msg = (e?.message || '').toLowerCase();
      const isModelIssue =
        e?.status === 404 ||
        e?.code === 'model_not_found' ||
        msg.includes('model') ||
        msg.includes('does not exist') ||
        msg.includes('decommissioned');
      if (!isModelIssue) {
        throw e;
      }
    }
  }

  throw lastError || new Error('All Groq briefing models failed.');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const hasGroqKey = Boolean(process.env.GROQ_API_KEY);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      ok: true,
      provider: hasGroqKey ? 'groq' : hasGeminiKey ? 'gemini' : 'none',
      defaultModel: hasGroqKey ? DEFAULT_GROQ_MODEL : GEMINI_MODEL,
      hasGroqKey,
      hasGeminiKey,
    });
  });

  app.post('/api/space-brief', async (req, res) => {
    const groqApiKey = process.env.GROQ_API_KEY;
    const ai = !groqApiKey ? getGeminiClient() : null;

    if (!groqApiKey && !ai) {
      return res.status(503).json({
        error:
          'GROQ_API_KEY is not configured on the server. Add GROQ_API_KEY in Settings > Secrets to enable AI cosmic briefings.',
      });
    }

    const { topic, category, question, epochYear, model } = req.body as {
      topic?: string;
      category?: string;
      question?: string;
      epochYear?: number;
      model?: string;
    };

    const targetTopic = (topic || 'Nancy Grace Roman Space Telescope').slice(0, 160);
    const targetCategory = (category || 'Space Mission').slice(0, 60);
    const userPrompt = (question || '').trim().slice(0, 600);
    const simYear = typeof epochYear === 'number' ? epochYear : 2026;
    const requestedModel = typeof model === 'string' ? model.trim() : DEFAULT_GROQ_MODEL;

    const systemInstruction =
      'You are a senior astrophysics and aerospace flight director inside Orbital Atlas. Deliver authoritative, accurate briefings (170–260 words) with clear ### section headings and concise bullet points. Cite exact orbital regimes, distances, instruments, or mission outcomes. Never invent telemetry or unverified launches.';

    const promptText = userPrompt
      ? `Context: The user is exploring "${targetTopic}" (${targetCategory}) inside Orbital Atlas at simulation year ${simYear}. Answer their question accurately with real astrophysics, orbital mechanics, and mission status: ${userPrompt}`
      : `Provide a crisp, scientifically authoritative cosmic briefing on "${targetTopic}" (${targetCategory}) for simulation epoch ${simYear}. Structure with ### Operational Status & Environment, ### Key Science & Instruments, and ### Milestones & Trajectory.`;

    try {
      if (groqApiKey) {
        const result = await queryGroqBriefing(
          groqApiKey,
          requestedModel,
          systemInstruction,
          promptText,
        );
        return res.json({
          text: result.text,
          sources: [],
          provider: 'groq',
          model: result.model,
          generatedAt: new Date().toISOString(),
        });
      }

      const response = await ai!.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptText,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c: { web?: { uri?: string; title?: string } }) =>
          c.web?.uri ? { title: c.web.title || c.web.uri, uri: c.web.uri } : null,
        )
        .filter((item): item is { title: string; uri: string } => Boolean(item))
        .slice(0, 5);

      return res.json({
        text: response.text || 'No briefing text returned.',
        sources,
        provider: 'gemini',
        model: GEMINI_MODEL,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const errorObj = err as Error & { status?: number };
      const message = errorObj?.message || 'Failed to query AI briefing service';
      const status =
        typeof errorObj?.status === 'number'
          ? errorObj.status
          : message.includes('401') || message.includes('invalid_api_key')
            ? 401
            : message.includes('403') || message.includes('PERMISSION_DENIED')
              ? 403
              : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
                ? 429
                : 500;
      return res.status(status).json({
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        const fs = await import('fs/promises');
        const htmlPath = path.resolve(__dirname, 'index.html');
        let html = await fs.readFile(htmlPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Orbital Atlas server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
