'use client';

import { ChevronRight, Hash, Clock, Tag, Sparkles } from 'lucide-react';
import { useUpwellingStore } from '@/stores/upwellingStore';
import { cn, formatRelativeTime, truncateText } from '@/lib/utils';
import type { ParsedContext } from '@/types';

interface TimelineProps {
  contexts: ParsedContext[];
}

export function Timeline({ contexts }: TimelineProps) {
  const { view, selectedContextId, selectContext, expandedContextIds, toggleExpanded } =
    useUpwellingStore();

  if (contexts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--muted)]">No contexts match your filters.</p>
      </div>
    );
  }

  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {contexts.map((context) => (
          <ContextCard
            key={context.id}
            context={context}
            isSelected={context.id === selectedContextId}
            onSelect={() => selectContext(context.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />

      <div className="space-y-4">
        {contexts.map((context, index) => (
          <TimelineItem
            key={context.id}
            context={context}
            isSelected={context.id === selectedContextId}
            isExpanded={expandedContextIds.has(context.id)}
            onSelect={() => selectContext(context.id)}
            onToggleExpand={() => toggleExpanded(context.id)}
            isFirst={index === 0}
            isLast={index === contexts.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface TimelineItemProps {
  context: ParsedContext;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function TimelineItem({
  context,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
}: TimelineItemProps) {
  const typeColorClass = `context-${context.type}`;

  return (
    <div className="relative pl-10 animate-fade-in">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-2 w-5 h-5 rounded-full border-2 bg-[var(--background)]',
          isSelected ? 'border-[var(--primary)]' : 'border-[var(--border)]'
        )}
      />

      {/* Content card */}
      <div
        className={cn(
          'border-l-4 rounded-lg p-4 transition-all cursor-pointer',
          'bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
          typeColorClass,
          isSelected && 'ring-2 ring-[var(--primary)]'
        )}
        onClick={onSelect}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {context.instanceNumber !== undefined && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                  <Hash className="w-3 h-3" />
                  {context.instanceNumber}
                </span>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--background)] text-[var(--muted)]">
                {context.type}
              </span>
              <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(context.created_at)}
              </span>
              {context.similarity !== undefined && (
                <span className="text-xs text-[var(--primary)] flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3" />
                  {context.similarity.toFixed(1)}% match
                </span>
              )}
            </div>
            <h3 className="mt-2 font-medium text-[var(--foreground)] line-clamp-1">
              {context.title}
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1 hover:bg-[var(--background)] rounded transition-colors"
          >
            <ChevronRight
              className={cn(
                'w-5 h-5 text-[var(--muted)] transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        </div>

        {/* Preview */}
        <p className="mt-2 text-sm text-[var(--muted)] line-clamp-2">
          {truncateText(context.content, 200)}
        </p>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <pre className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono bg-[var(--background)] p-4 rounded-lg overflow-x-auto max-h-96">
              {context.content}
            </pre>
          </div>
        )}

        {/* Frameworks and tags */}
        {(context.frameworks.length > 0 || context.tags.length > 0) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {context.frameworks.map((framework) => (
              <span
                key={framework}
                className={cn('framework-badge', `framework-${framework}`)}
              >
                {framework}
              </span>
            ))}
            {context.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--background)] text-[var(--muted)]"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {context.tags.length > 3 && (
              <span className="text-xs text-[var(--muted)]">
                +{context.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ContextCardProps {
  context: ParsedContext;
  isSelected: boolean;
  onSelect: () => void;
}

function ContextCard({ context, isSelected, onSelect }: ContextCardProps) {
  const typeColorClass = `context-${context.type}`;

  return (
    <div
      className={cn(
        'border-l-4 rounded-lg p-4 transition-all cursor-pointer',
        'bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
        typeColorClass,
        isSelected && 'ring-2 ring-[var(--primary)]'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {context.instanceNumber !== undefined && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
            <Hash className="w-3 h-3" />
            {context.instanceNumber}
          </span>
        )}
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--background)] text-[var(--muted)]">
          {context.type}
        </span>
      </div>
      <h3 className="font-medium text-[var(--foreground)] line-clamp-2">
        {context.title}
      </h3>
      <p className="mt-2 text-sm text-[var(--muted)] line-clamp-3">
        {truncateText(context.content, 150)}
      </p>
      <div className="mt-3 text-xs text-[var(--muted)] flex items-center justify-between">
        <span>{context.wordCount} words</span>
        {context.similarity !== undefined && (
          <span className="text-[var(--primary)] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {context.similarity.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
