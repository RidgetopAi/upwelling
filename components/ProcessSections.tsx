'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  FileText,
  Lightbulb,
  AlertCircle,
  GitCommit,
  Users,
  Target,
  Code,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Section types with metadata
const SECTION_TYPES = {
  'WHAT I DID': {
    icon: CheckSquare,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    description: 'Actions completed this session',
  },
  'FOR INSTANCE': {
    icon: Users,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    description: 'Recommendations for next instance',
  },
  'KEY TECHNICAL NOTES': {
    icon: Code,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    description: 'Important implementation details',
  },
  'FILES CREATED': {
    icon: FileText,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    description: 'New files added',
  },
  'FILES MODIFIED': {
    icon: FileText,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    description: 'Existing files changed',
  },
  COMMITS: {
    icon: GitCommit,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    description: 'Git commits made',
  },
  REMINDERS: {
    icon: AlertCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    description: 'Important notes to remember',
  },
  'WHAT I BELIEVE': {
    icon: Lightbulb,
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
    description: 'Assumptions to challenge',
  },
  'CURRENT STATE': {
    icon: Target,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    description: 'Current project status',
  },
  'KEY DISCOVERY': {
    icon: Lightbulb,
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10',
    description: 'Important findings',
  },
  'ON ': {
    icon: BookOpen,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
    description: 'Reflections',
  },
} as const;

interface ProcessSection {
  title: string;
  content: string;
  type: keyof typeof SECTION_TYPES | null;
}

function parseProcessSections(content: string): ProcessSection[] {
  const sections: ProcessSection[] = [];

  // Match markdown headers (## or ###) that look like process sections
  const sectionPattern = /^(#{2,3})\s+(.+?)(?=\n|$)([\s\S]*?)(?=\n#{2,3}\s|\n---\s*$|$)/gm;

  let lastEnd = 0;
  let match;

  while ((match = sectionPattern.exec(content)) !== null) {
    // Capture any content before this section as "preamble"
    if (match.index > lastEnd && sections.length === 0) {
      const preamble = content.slice(lastEnd, match.index).trim();
      if (preamble) {
        sections.push({
          title: 'Overview',
          content: preamble,
          type: null,
        });
      }
    }

    const title = match[2].trim();
    const sectionContent = match[3].trim();

    // Match against known section types
    let matchedType: keyof typeof SECTION_TYPES | null = null;
    for (const typeKey of Object.keys(SECTION_TYPES) as (keyof typeof SECTION_TYPES)[]) {
      if (title.toUpperCase().includes(typeKey)) {
        matchedType = typeKey;
        break;
      }
    }

    sections.push({
      title,
      content: sectionContent,
      type: matchedType,
    });

    lastEnd = match.index + match[0].length;
  }

  // If no sections found, return the whole content
  if (sections.length === 0) {
    return [
      {
        title: 'Content',
        content: content,
        type: null,
      },
    ];
  }

  return sections;
}

interface ProcessSectionCardProps {
  section: ProcessSection;
  defaultExpanded?: boolean;
}

function ProcessSectionCard({ section, defaultExpanded = false }: ProcessSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const typeInfo = section.type ? SECTION_TYPES[section.type] : null;
  const Icon = typeInfo?.icon || FileText;

  // Count items in content (bullet points or numbered items)
  const itemCount = (section.content.match(/^[-*\d]+[.)]\s/gm) || []).length;

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] overflow-hidden transition-all',
        isExpanded ? 'bg-[var(--surface)]' : 'bg-[var(--background)]'
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-3 text-left transition-colors',
          'hover:bg-[var(--surface-hover)]'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-1.5 rounded', typeInfo?.bgColor || 'bg-[var(--surface)]')}>
            <Icon className={cn('w-4 h-4', typeInfo?.color || 'text-[var(--muted)]')} />
          </div>
          <div>
            <span className="font-medium text-[var(--foreground)]">{section.title}</span>
            {typeInfo && (
              <span className="ml-2 text-xs text-[var(--muted)]">
                {typeInfo.description}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {itemCount > 0 && (
            <span className="text-xs text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded">
              {itemCount} items
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)]">
          <pre className="mt-3 text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono bg-[var(--background)] p-3 rounded-lg overflow-x-auto max-h-80">
            {section.content}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ProcessSectionsProps {
  content: string;
}

export function ProcessSections({ content }: ProcessSectionsProps) {
  const sections = parseProcessSections(content);
  const [showRaw, setShowRaw] = useState(false);

  // If only one section (i.e., couldn't parse structure), show raw by default
  const hasStructure = sections.length > 1 || sections[0]?.type !== null;

  if (!hasStructure) {
    return (
      <pre className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono bg-[var(--background)] p-4 rounded-lg overflow-x-auto max-h-[60vh]">
        {content}
      </pre>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Process Sections
          </span>
          <span className="text-xs text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded">
            {sections.length} sections
          </span>
        </div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          {showRaw ? 'Show Structured' : 'Show Raw'}
        </button>
      </div>

      {showRaw ? (
        <pre className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono bg-[var(--background)] p-4 rounded-lg overflow-x-auto max-h-[60vh]">
          {content}
        </pre>
      ) : (
        <div className="space-y-2">
          {sections.map((section, index) => (
            <ProcessSectionCard
              key={index}
              section={section}
              defaultExpanded={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
