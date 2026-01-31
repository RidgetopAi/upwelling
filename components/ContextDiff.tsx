'use client';

import { useMemo, useState } from 'react';
import { X, GitCompare, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedContext } from '@/types';

interface ContextDiffProps {
  currentContext: ParsedContext;
  previousContext: ParsedContext;
  onClose: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  lineNumber?: number;
}

// Simple line-by-line diff algorithm
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: DiffLine[] = [];

  // Create a set of old lines for quick lookup
  const oldLinesSet = new Set(oldLines.map(l => l.trim()));
  const newLinesSet = new Set(newLines.map(l => l.trim()));

  // Track which old lines were matched
  const matchedOldLines = new Set<number>();

  let newLineNum = 1;

  for (const line of newLines) {
    const trimmedLine = line.trim();

    // Skip empty lines in diff (but include them visually)
    if (!trimmedLine) {
      diff.push({ type: 'unchanged', content: line, lineNumber: newLineNum++ });
      continue;
    }

    // Check if this is a section header (starts with # or ##)
    if (trimmedLine.startsWith('#')) {
      // Check if this header existed in old text
      if (oldLinesSet.has(trimmedLine)) {
        diff.push({ type: 'header', content: line, lineNumber: newLineNum++ });
      } else {
        diff.push({ type: 'added', content: line, lineNumber: newLineNum++ });
      }
      continue;
    }

    // Check if this line exists in old text
    if (oldLinesSet.has(trimmedLine)) {
      diff.push({ type: 'unchanged', content: line, lineNumber: newLineNum++ });
    } else {
      diff.push({ type: 'added', content: line, lineNumber: newLineNum++ });
    }
  }

  // Also track removed lines (in old but not in new)
  const removedLines: DiffLine[] = [];
  for (const line of oldLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !newLinesSet.has(trimmedLine)) {
      removedLines.push({ type: 'removed', content: line });
    }
  }

  return { diffLines: diff, removedLines } as any; // TypeScript workaround
}

// Compute section-level diff for better readability
function computeSectionDiff(oldText: string, newText: string): {
  sections: Array<{
    header: string;
    status: 'added' | 'modified' | 'unchanged';
    content: string;
    oldContent?: string;
  }>;
  stats: { added: number; modified: number; unchanged: number };
} {
  // Split into sections by ## headers
  const splitIntoSections = (text: string): Map<string, string> => {
    const sections = new Map<string, string>();
    const parts = text.split(/(?=^##\s)/m);

    for (const part of parts) {
      const lines = part.trim().split('\n');
      if (lines.length === 0) continue;

      const firstLine = lines[0].trim();
      if (firstLine.startsWith('##')) {
        const header = firstLine;
        const content = lines.slice(1).join('\n').trim();
        sections.set(header, content);
      } else if (firstLine.startsWith('#')) {
        // Top-level header
        sections.set('__title__', part.trim());
      } else if (part.trim()) {
        // Content before first section
        const existing = sections.get('__preamble__') || '';
        sections.set('__preamble__', existing + part.trim());
      }
    }

    return sections;
  };

  const oldSections = splitIntoSections(oldText);
  const newSections = splitIntoSections(newText);

  const result: Array<{
    header: string;
    status: 'added' | 'modified' | 'unchanged';
    content: string;
    oldContent?: string;
  }> = [];

  let added = 0;
  let modified = 0;
  let unchanged = 0;

  // Process new sections
  for (const [header, content] of newSections) {
    if (oldSections.has(header)) {
      const oldContent = oldSections.get(header)!;
      if (oldContent.trim() === content.trim()) {
        result.push({ header, status: 'unchanged', content });
        unchanged++;
      } else {
        result.push({ header, status: 'modified', content, oldContent });
        modified++;
      }
    } else {
      result.push({ header, status: 'added', content });
      added++;
    }
  }

  return {
    sections: result,
    stats: { added, modified, unchanged }
  };
}

export function ContextDiff({ currentContext, previousContext, onClose }: ContextDiffProps) {
  const [viewMode, setViewMode] = useState<'sections' | 'lines'>('sections');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Compute diffs
  const sectionDiff = useMemo(
    () => computeSectionDiff(previousContext.content, currentContext.content),
    [previousContext.content, currentContext.content]
  );

  const toggleSection = (header: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(header)) {
        next.delete(header);
      } else {
        next.add(header);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(sectionDiff.sections.map(s => s.header)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Compare Instances
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Instance {previousContext.instanceNumber} → Instance {currentContext.instanceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--background)] rounded transition-colors"
            aria-label="Close diff view"
          >
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-green-500 font-medium">{sectionDiff.stats.added} new</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-500 font-medium">{sectionDiff.stats.modified} modified</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span className="text-[var(--muted)]">{sectionDiff.stats.unchanged} unchanged</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Expand all
            </button>
            <span className="text-[var(--muted)]">·</span>
            <button
              onClick={collapseAll}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sectionDiff.sections.map((section, idx) => {
            const isExpanded = expandedSections.has(section.header);
            const displayHeader = section.header === '__title__'
              ? 'Title'
              : section.header === '__preamble__'
              ? 'Preamble'
              : section.header.replace(/^#+\s*/, '');

            return (
              <div
                key={idx}
                className={cn(
                  'rounded-lg border transition-colors',
                  section.status === 'added' && 'border-green-500/50 bg-green-500/5',
                  section.status === 'modified' && 'border-amber-500/50 bg-amber-500/5',
                  section.status === 'unchanged' && 'border-[var(--border)] bg-[var(--background)]'
                )}
              >
                <button
                  onClick={() => toggleSection(section.header)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      section.status === 'added' && 'bg-green-500',
                      section.status === 'modified' && 'bg-amber-500',
                      section.status === 'unchanged' && 'bg-slate-500'
                    )} />
                    <span className={cn(
                      'font-medium',
                      section.status === 'added' && 'text-green-500',
                      section.status === 'modified' && 'text-amber-500',
                      section.status === 'unchanged' && 'text-[var(--muted)]'
                    )}>
                      {displayHeader}
                    </span>
                    {section.status === 'added' && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-500 rounded">
                        NEW
                      </span>
                    )}
                    {section.status === 'modified' && (
                      <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-500 rounded">
                        CHANGED
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--border)]/50">
                    {section.status === 'modified' && section.oldContent && (
                      <div className="mt-3 mb-2">
                        <div className="text-xs text-[var(--muted)] mb-1 flex items-center gap-1">
                          <Minus className="w-3 h-3" />
                          Instance {previousContext.instanceNumber} (old)
                        </div>
                        <div className="p-3 rounded bg-red-500/10 text-red-400/80 text-sm font-mono whitespace-pre-wrap opacity-75">
                          {section.oldContent.slice(0, 500)}
                          {section.oldContent.length > 500 && '...'}
                        </div>
                      </div>
                    )}
                    <div className="mt-3">
                      {section.status === 'modified' && (
                        <div className="text-xs text-[var(--muted)] mb-1 flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          Instance {currentContext.instanceNumber} (new)
                        </div>
                      )}
                      <div className={cn(
                        'p-3 rounded text-sm font-mono whitespace-pre-wrap',
                        section.status === 'added' && 'bg-green-500/10 text-green-300',
                        section.status === 'modified' && 'bg-green-500/10 text-green-300',
                        section.status === 'unchanged' && 'bg-[var(--surface)] text-[var(--muted)]'
                      )}>
                        {section.content.slice(0, 1000)}
                        {section.content.length > 1000 && '...'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sectionDiff.sections.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)]">
              No sections to compare
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
          <p className="text-xs text-[var(--muted)] text-center">
            Showing what Instance {currentContext.instanceNumber} added or modified compared to Instance {previousContext.instanceNumber}.
            This is how knowledge compounds.
          </p>
        </div>
      </div>
    </div>
  );
}
