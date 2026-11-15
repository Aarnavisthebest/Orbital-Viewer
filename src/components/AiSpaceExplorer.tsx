import React, { useEffect, useState } from 'react';
import { Cpu, ExternalLink, Loader2, Send, Sparkles } from 'lucide-react';

interface GroundingSource {
  title: string;
  uri: string;
}

interface AiSpaceExplorerProps {
  contextTopic: string;
  contextCategory: string;
  epochYear: number;
  externalPromptTrigger?: { topic: string; category: string; question?: string; nonce: number } | null;
}

const AI_MODELS = [
  { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 · 1T MoE', badge: 'Flagship' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS · 120B', badge: 'Reasoning' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick · 400B', badge: '128E MoE' },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 · 32B', badge: 'Compact' },
] as const;

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-slate-800/80 text-cyan-300 font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderFormattedBrief(raw: string): React.ReactNode {
  const lines = raw.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={keyPrefix} className="space-y-1.5 pl-4 list-disc marker:text-cyan-400 text-slate-300">
        {listItems.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInlineFormatting(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${i}`);
      return;
    }

    if (/^#{1,4}\s+/.test(trimmed)) {
      flushList(`list-${i}`);
      const headingText = trimmed.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '');
      nodes.push(
        <h4
          key={`h-${i}`}
          className="text-xs font-mono uppercase tracking-wider text-cyan-300 pt-2 first:pt-0"
        >
          {headingText}
        </h4>,
      );
      return;
    }

    if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^([-*•]|\d+[.)])\s+/, ''));
      return;
    }

    flushList(`list-${i}`);
    nodes.push(
      <p key={`p-${i}`} className="text-slate-200 leading-relaxed">
        {renderInlineFormatting(trimmed)}
      </p>,
    );
  });

  flushList('list-end');
  return <div className="space-y-2.5 text-sm">{nodes}</div>;
}

export const AiSpaceExplorer: React.FC<AiSpaceExplorerProps> = ({
  contextTopic,
  contextCategory,
  epochYear,
  externalPromptTrigger,
}) => {
  const [question, setQuestion] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [briefText, setBriefText] = useState<string>('');
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState<string>(contextTopic);
  const [providerInfo, setProviderInfo] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const runBrief = async (topic: string, category: string, customQ?: string, modelOverride?: string) => {
    setLoading(true);
    setError(null);
    setLastTopic(topic);

    try {
      const res = await fetch('/api/space-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          category,
          question: customQ || '',
          epochYear: Math.round(epochYear),
          model: modelOverride || selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setBriefText(data.text || '');
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setProviderInfo(
        data.provider && data.model
          ? `${String(data.provider).toUpperCase()} · ${data.model}`
          : null,
      );
      setGeneratedAt(data.generatedAt || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI briefing service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalPromptTrigger) {
      runBrief(
        externalPromptTrigger.topic,
        externalPromptTrigger.category,
        externalPromptTrigger.question,
      );
    }
  }, [externalPromptTrigger]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && !contextTopic) return;
    runBrief(contextTopic, contextCategory, question.trim());
  };

  const quickQueries = [
    {
      label: `Live status of ${contextTopic}`,
      topic: contextTopic,
      cat: contextCategory,
      q: `What is the latest 2026 operational status and scientific update for ${contextTopic}?`,
    },
    {
      label: 'Apollo 18 & Skylab hardware history',
      topic: 'Apollo 18 & Saturn V SA-513',
      cat: 'Launch History',
      q: 'What happened to Apollo 18 and its Saturn V hardware, and how did it become Skylab?',
    },
    {
      label: 'Bennu vs Comet 67P findings',
      topic: '101955 Bennu & 67P/Churyumov–Gerasimenko',
      cat: 'Asteroids & Comets',
      q: 'Compare OSIRIS-REx findings at Bennu with Rosetta findings at bi-lobed comet 67P.',
    },
    {
      label: 'Artemis II, III & IV outlook',
      topic: 'NASA Artemis Program',
      cat: 'Lunar Exploration',
      q: 'Summarize the 2026 completion of Artemis II and the revised plans for Artemis III and Artemis IV.',
    },
  ];

  return (
    <section id="ai-explorer" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            Real-Time AI Mission & Astrophysics Briefings
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            Live Cosmic Research Console
          </h2>
        </div>

        <button
          type="button"
          onClick={() => runBrief(contextTopic, contextCategory)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>Fetch Live Update on {contextTopic}</span>
        </button>
      </div>

      <div className="bg-[#0E131D] border border-slate-800 rounded-lg p-6 space-y-5">
        {/* Frontier Non-Versatile Model Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Astrophysics Model Architecture:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {AI_MODELS.map((m) => {
              const active = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setSelectedModel(m.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 font-medium'
                      : 'border-slate-800 bg-[#07090E] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">· {m.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Suggested Inquiries */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Quick Research:</span>
          {quickQueries.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuestion(item.q);
                runBrief(item.topic, item.cat, item.q);
              }}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-700 bg-[#07090E] text-slate-200 hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Query Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask about ${contextTopic}, stars in the Milky Way, Bennu, or future missions...`}
            className="flex-1 bg-[#07090E] border border-slate-700 rounded-md px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-950 hover:bg-white disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Analyze</span>
          </button>
        </form>

        {/* Output Area */}
        {error && (
          <div className="border border-rose-500/40 bg-rose-950/30 rounded-md p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="border border-slate-800 bg-[#07090E] rounded-md p-6 flex items-center gap-3 text-sm text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>
              Querying{' '}
              <span className="font-mono text-cyan-300">
                {AI_MODELS.find((m) => m.id === selectedModel)?.label || selectedModel}
              </span>{' '}
              for {lastTopic}...
            </span>
          </div>
        )}

        {!loading && briefText && (
          <div className="border border-slate-800 bg-[#07090E] rounded-md p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 text-xs text-slate-400">
              <span className="font-mono text-cyan-400">Briefing Topic: {lastTopic}</span>
              <span className="font-mono tabular-nums">
                {providerInfo ? `${providerInfo} · ` : ''}
                {generatedAt ? `Updated ${new Date(generatedAt).toLocaleTimeString()}` : ''}
              </span>
            </div>

            {renderFormattedBrief(briefText)}

            {sources.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <p className="text-xs font-mono text-slate-400">Grounded Web Sources</p>
                <div className="flex flex-wrap gap-3">
                  {sources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                    >
                      <span className="truncate max-w-[240px]">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !briefText && !error && (
          <div className="border border-slate-800/80 bg-[#07090E] rounded-md p-5 text-sm text-slate-400">
            Select any spacecraft, planet, star, asteroid (such as Bennu or 67P), or launch record,
            pick your preferred reasoning model above, and click{' '}
            <span className="text-slate-200 font-medium">Fetch Live Update</span> for authoritative
            mission intelligence.
          </div>
        )}
      </div>
    </section>
  );
};
