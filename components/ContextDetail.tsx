'use client';

import { X, Hash, Clock, Tag, Lightbulb, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useUpwellingStore } from '@/stores/upwellingStore';
import { cn, formatDate } from '@/lib/utils';
import { ProcessSections } from './ProcessSections';
import type { ParsedContext } from '@/types';

interface ContextDetailProps {
  context: ParsedContext;
}

export function ContextDetail({ context }: ContextDetailProps) {
  const { selectContext } = useUpwellingStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(context.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeColorClass = `context-${context.type}`;

  return (
    <div className="sticky top-8 bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden animate-fade-in">
      {/* Header */}
      <div
        className={cn(
          'p-4 border-b border-[var(--border)] border-l-4',
          typeColorClass
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {context.instanceNumber !== undefined && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
                  <Hash className="w-4 h-4" />
                  Instance {context.instanceNumber}
                </span>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--background)] text-[var(--muted)]">
                {context.type}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {context.title}
            </h2>
          </div>
          <button
            onClick={() => selectContext(null)}
            className="p-1 hover:bg-[var(--background)] rounded transition-colors"
          >
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="p-4 border-b border-[var(--border)] space-y-3">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Clock className="w-4 h-4" />
          {formatDate(context.created_at)}
        </div>
        <div className="text-sm text-[var(--muted)]">
          {context.wordCount.toLocaleString()} words
        </div>

        {/* Frameworks */}
        {context.frameworks.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {context.frameworks.map((framework) => (
              <span
                key={framework}
                className={cn('framework-badge', `framework-${framework}`)}
              >
                {framework}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {context.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {context.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--background)] text-[var(--muted)]"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Key insights */}
      {context.keyInsights.length > 0 && (
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-3">
            <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
            Key Insights
          </h3>
          <ul className="space-y-2">
            {context.keyInsights.map((insight, i) => (
              <li
                key={i}
                className="text-sm text-[var(--muted)] pl-4 border-l-2 border-[var(--accent)]"
              >
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full content with process sections */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Content
          </h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[var(--accent)]" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <ProcessSections content={context.content} />
      </div>
    </div>
  );
}
