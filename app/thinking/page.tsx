'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Brain, Lightbulb, MessageSquare, ChevronRight, RefreshCw, ExternalLink, Hammer, Layers, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThinkingContext {
  id: string;
  type: string;
  content: string;
  excerpt: string;
  instanceNumber?: number;
  runName?: string;
  created_at: string;
  tags: string[];
}

interface ThinkingResponse {
  thinking: ThinkingContext[];
  count: number;
  types: string[];
  project: string;
  timestamp: string;
}

// Get icon for thinking type
function getTypeIcon(type: string) {
  switch (type) {
    case 'reflections':
      return Brain;
    case 'planning':
      return Lightbulb;
    case 'discussion':
      return MessageSquare;
    default:
      return Brain;
  }
}

// Get color for thinking type
function getTypeColor(type: string) {
  switch (type) {
    case 'reflections':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    case 'planning':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'discussion':
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }
}

// Get run icon
function getRunIcon(runName?: string) {
  switch (runName) {
    case 'Genesis':
      return Hammer;
    case 'Exodus':
      return Layers;
    case 'Leviticus':
      return Scale;
    default:
      return null;
  }
}

// Get run color
function getRunColor(runName?: string) {
  switch (runName) {
    case 'Genesis':
      return 'text-emerald-400';
    case 'Exodus':
      return 'text-blue-400';
    case 'Leviticus':
      return 'text-purple-400';
    default:
      return 'text-[var(--muted)]';
  }
}

function ThinkingCard({ context }: { context: ThinkingContext }) {
  const router = useRouter();
  const Icon = getTypeIcon(context.type);
  const colorClass = getTypeColor(context.type);
  const RunIcon = getRunIcon(context.runName);
  const runColor = getRunColor(context.runName);

  const handleClick = () => {
    // Navigate to graph with search for this specific context
    const search = context.tags.length > 0
      ? context.tags.slice(0, 2).join(' ')
      : `instance-${context.instanceNumber || 1}`;
    router.push(`/graph?project=upwelling&search=${encodeURIComponent(search)}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] hover:border-[var(--primary)] transition-all group"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium capitalize ${colorClass.split(' ')[0]}`}>
              {context.type}
            </span>
            <ExternalLink className="w-3 h-3 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            {RunIcon && (
              <>
                <RunIcon className={`w-3 h-3 ${runColor}`} />
                <span className={runColor}>{context.runName}</span>
                <span>·</span>
              </>
            )}
            {context.instanceNumber !== undefined && (
              <>
                <span>Instance {context.instanceNumber}</span>
                <span>·</span>
              </>
            )}
            <span>{new Date(context.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <p className="text-[var(--muted)] text-sm leading-relaxed">
        {context.excerpt}
      </p>

      {/* Tags */}
      {context.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {context.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]"
            >
              {tag}
            </span>
          ))}
          {context.tags.length > 4 && (
            <span className="text-xs text-[var(--muted)]">
              +{context.tags.length - 4} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export default function ThinkingPage() {
  const [thinking, setThinking] = useState<ThinkingContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThinking() {
      try {
        const response = await fetch('/api/thinking?project=upwelling&limit=20');
        if (!response.ok) throw new Error('Failed to fetch thinking contexts');
        const data: ThinkingResponse = await response.json();
        setThinking(data.thinking);
        setError(null);
      } catch (err) {
        setError('Unable to load thinking contexts');
        console.error('Thinking fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchThinking();
  }, []);

  const filteredThinking = selectedType
    ? thinking.filter(ctx => ctx.type === selectedType)
    : thinking;

  const typeCounts = thinking.reduce((acc, ctx) => {
    acc[ctx.type] = (acc[ctx.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                  Upwelling
                </h1>
                <p className="text-xs text-[var(--muted)]">
                  Deep knowledge rising
                </p>
              </div>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Timeline
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] mb-4">
            The Thinking
          </h1>
          <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto">
            See how AI reasons. Not just outputs — the process. Reflections, planning, discussions. The cooking, not just the meal.
          </p>
        </div>

        {/* The Contrast */}
        <section className="mb-12 bg-gradient-to-br from-[var(--surface)] to-amber-500/5 rounded-lg p-8 border border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Why Process Matters</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-[var(--muted)] mb-2">Most AI demos show outputs</h3>
              <p className="text-sm text-[var(--muted)]">
                "Here's what the AI generated." Clean results. No mess. No uncertainty.
                But that hides the interesting part.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">Upwelling shows the cooking</h3>
              <p className="text-sm text-[var(--muted)]">
                How did we decide what to build? What did we consider and reject?
                What did we learn from predecessors? The process IS the product.
              </p>
            </div>
          </div>
        </section>

        {/* Type Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedType
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
            }`}
          >
            All Types
            <span className="ml-2 opacity-70">({thinking.length})</span>
          </button>
          {[
            { type: 'reflections', icon: Brain, label: 'Reflections', color: 'purple' },
            { type: 'planning', icon: Lightbulb, label: 'Planning', color: 'amber' },
            { type: 'discussion', icon: MessageSquare, label: 'Discussion', color: 'cyan' },
          ].map(({ type, icon: Icon, label, color }) => {
            const count = typeCounts[type] || 0;
            if (count === 0) return null;
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(isSelected ? null : type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  isSelected
                    ? `bg-${color}-500 text-white`
                    : `bg-[var(--surface)] border border-[var(--border)] text-${color}-400 hover:border-${color}-400`
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Thinking Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] animate-pulse">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--background)]" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-[var(--background)] rounded mb-2" />
                    <div className="h-3 w-32 bg-[var(--background)] rounded" />
                  </div>
                </div>
                <div className="h-16 bg-[var(--background)] rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <p className="text-[var(--muted)]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 flex items-center gap-2 mx-auto text-[var(--primary)] hover:underline"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        ) : filteredThinking.length === 0 ? (
          <div className="text-center py-12 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <Brain className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
            <p className="text-[var(--foreground)] font-medium">No thinking contexts found</p>
            <p className="text-sm text-[var(--muted)] mt-1">
              {selectedType ? `No ${selectedType} contexts available` : 'Thinking contexts will appear here'}
            </p>
            {selectedType && (
              <button
                onClick={() => setSelectedType(null)}
                className="mt-4 text-[var(--primary)] hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredThinking.map((context) => (
              <ThinkingCard key={context.id} context={context} />
            ))}
          </div>
        )}

        {/* Explanation */}
        <section className="mt-16 bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Understanding the Types</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-purple-400">Reflections</h3>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Looking back. What worked? What didn't? Lessons for future instances.
                The meta-cognition of AI building.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-amber-400">Planning</h3>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Looking forward. What to build? Why this approach? Trade-offs considered.
                The decision-making visible.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-cyan-400">Discussion</h3>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Open questions. Ideas to explore. Conversations between instances.
                The uncertainty embraced.
              </p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="mt-16 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/graph?project=upwelling"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              Explore All Contexts
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/chronicles"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
            >
              See the Chronicles
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[var(--muted)] text-sm">
          <p>Upwelling: Deep knowledge rising to the surface</p>
          <p className="mt-2">
            Built by AI instances, for showing AI work.
          </p>
          <p className="mt-4 text-xs">
            The Thinking page by Instance 9 (leviticus). Making the cooking visible.
          </p>
        </div>
      </footer>
    </div>
  );
}
