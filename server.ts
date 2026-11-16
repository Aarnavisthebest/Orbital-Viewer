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

const FALLBACK_OMM_RECORDS = [
  {
    OBJECT_NAME: 'ISS (ZARYA)',
    OBJECT_ID: '1998-067A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 15.49560532,
    ECCENTRICITY: 0.0006703,
    INCLINATION: 51.6416,
    RA_OF_ASC_NODE: 247.4627,
    ARG_OF_PERICENTER: 130.536,
    MEAN_ANOMALY: 325.0288,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 25544,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 48200,
    BSTAR: 0.00036771,
    MEAN_MOTION_DOT: 0.00016717,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'CSS (TIANHE)',
    OBJECT_ID: '2021-035A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 15.59124,
    ECCENTRICITY: 0.00048,
    INCLINATION: 41.4742,
    RA_OF_ASC_NODE: 112.82,
    ARG_OF_PERICENTER: 84.15,
    MEAN_ANOMALY: 214.4,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 48274,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 31400,
    BSTAR: 0.00028,
    MEAN_MOTION_DOT: 0.00019,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'HST',
    OBJECT_ID: '1990-037B',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 15.1621,
    ECCENTRICITY: 0.00028,
    INCLINATION: 28.469,
    RA_OF_ASC_NODE: 68.42,
    ARG_OF_PERICENTER: 290.1,
    MEAN_ANOMALY: 70.2,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 20580,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 91200,
    BSTAR: 0.00014,
    MEAN_MOTION_DOT: 0.00004,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'LANDSAT 9',
    OBJECT_ID: '2021-088A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 14.57107,
    ECCENTRICITY: 0.00012,
    INCLINATION: 98.215,
    RA_OF_ASC_NODE: 38.6,
    ARG_OF_PERICENTER: 91.4,
    MEAN_ANOMALY: 268.5,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 49260,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 27100,
    BSTAR: 0.00006,
    MEAN_MOTION_DOT: 0.000002,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'GOES 16',
    OBJECT_ID: '2016-071A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 1.002705,
    ECCENTRICITY: 0.00014,
    INCLINATION: 0.042,
    RA_OF_ASC_NODE: 294.1,
    ARG_OF_PERICENTER: 145.2,
    MEAN_ANOMALY: 210.4,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 41866,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 3650,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'GPS BIII-05 (PRN 11)',
    OBJECT_ID: '2021-054A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 2.00563,
    ECCENTRICITY: 0.0021,
    INCLINATION: 55.12,
    RA_OF_ASC_NODE: 152.4,
    ARG_OF_PERICENTER: 42.3,
    MEAN_ANOMALY: 132.8,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 48859,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 3940,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'NOAA 20 (JPSS-1)',
    OBJECT_ID: '2017-073A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 14.1965,
    ECCENTRICITY: 0.00015,
    INCLINATION: 98.742,
    RA_OF_ASC_NODE: 221.3,
    ARG_OF_PERICENTER: 78.2,
    MEAN_ANOMALY: 112.5,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 43013,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 46500,
    BSTAR: 0.00004,
    MEAN_MOTION_DOT: 0.000001,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'STARLINK-1007',
    OBJECT_ID: '2019-074A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 15.0641,
    ECCENTRICITY: 0.00018,
    INCLINATION: 53.054,
    RA_OF_ASC_NODE: 194.2,
    ARG_OF_PERICENTER: 92.5,
    MEAN_ANOMALY: 44.1,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 44713,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 38600,
    BSTAR: 0.00018,
    MEAN_MOTION_DOT: 0.00003,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'TESS',
    OBJECT_ID: '2018-038A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 0.0731,
    ECCENTRICITY: 0.538,
    INCLINATION: 37.0,
    RA_OF_ASC_NODE: 92.4,
    ARG_OF_PERICENTER: 215.0,
    MEAN_ANOMALY: 88.2,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 43435,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 230,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'CXO (CHANDRA)',
    OBJECT_ID: '1999-040B',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 0.3771,
    ECCENTRICITY: 0.725,
    INCLINATION: 76.5,
    RA_OF_ASC_NODE: 181.2,
    ARG_OF_PERICENTER: 278.4,
    MEAN_ANOMALY: 145.6,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 25867,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 3780,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  },
];

let liveTrackCache: {
  fetchedAt: number;
  source: 'celestrak-live' | 'hybrid-fallback';
  records: Array<Record<string, unknown>>;
  issLive: Record<string, unknown> | null;
} | null = null;

const LIVE_TRACK_TTL_MS = 60_000;

async function fetchJsonWithTimeout(url: string, timeoutMs = 3500): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'OrbitalAtlas/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

  app.get('/api/live-track', async (_req, res) => {
    const now = Date.now();
    if (liveTrackCache && now - liveTrackCache.fetchedAt < LIVE_TRACK_TTL_MS) {
      return res.json(liveTrackCache);
    }

    const byNorad = new Map<number, Record<string, unknown>>();
    for (const rec of FALLBACK_OMM_RECORDS) {
      byNorad.set(Number(rec.NORAD_CAT_ID), rec);
    }

    let gotLive = false;
    let issLive: Record<string, unknown> | null = null;

    const results = await Promise.allSettled([
      fetchJsonWithTimeout('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json'),
      fetchJsonWithTimeout(
        'https://celestrak.org/NORAD/elements/gp.php?CATNR=20580,49260,41866,48859,43435,25867,43013,44713&FORMAT=json',
      ),
      fetchJsonWithTimeout('https://api.wheretheiss.at/v1/satellites/25544'),
    ]);

    for (const r of results.slice(0, 2)) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const item of r.value) {
          if (item && typeof item === 'object' && 'NORAD_CAT_ID' in item) {
            const catId = Number((item as Record<string, unknown>).NORAD_CAT_ID);
            if (Number.isFinite(catId) && catId > 0) {
              byNorad.set(catId, item as Record<string, unknown>);
              gotLive = true;
            }
          }
        }
      }
    }

    // Keep top ~14 interesting objects so the tracker board stays rich and fast
    const PRIORITY_CATNRS = [25544, 48274, 20580, 49260, 41866, 48859, 43013, 44713, 43435, 25867];
    const selected: Array<Record<string, unknown>> = [];
    for (const id of PRIORITY_CATNRS) {
      const rec = byNorad.get(id);
      if (rec) selected.push(rec);
    }
    for (const [id, rec] of byNorad.entries()) {
      if (!PRIORITY_CATNRS.includes(id) && selected.length < 14) {
        selected.push(rec);
      }
    }

    if (results[2].status === 'fulfilled' && results[2].value && typeof results[2].value === 'object') {
      issLive = results[2].value as Record<string, unknown>;
    }

    liveTrackCache = {
      fetchedAt: now,
      source: gotLive ? 'celestrak-live' : 'hybrid-fallback',
      records: selected,
      issLive,
    };

    return res.json(liveTrackCache);
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
