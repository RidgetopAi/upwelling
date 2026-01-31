import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function extractInstanceNumber(content: string): number | undefined {
  const patterns = [
    /Claude\s+Instance\s+#(\d+)/i,      // "Claude Instance #36"
    /Instance\s*#(\d+)/i,                // "Instance #5" or "Instance#5"
    /Instance\s+(\d+)(?!\d)/i,           // "Instance 5" (not followed by more digits)
    /i\[(\d+)\]/i,                       // "i[36]"
    /INSTANCE\s+(\d+)/i,                 // "INSTANCE 5"
    /#(\d+)\s+handoff/i,                 // "#5 handoff"
    /Instance\s+(\d+)\s+of\s+\d+/i,      // "Instance 9 of 20"
    /(?:^|\n)\*\*Instance\s+(\d+)\*\*/i, // "**Instance 5**" at start of line
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return undefined;
}

// Extract total instance count from "Instance X of Y" patterns
// This gives us the accurate total for a SIRK run, not just what's loaded
export function extractInstanceTotal(content: string): number | undefined {
  // Pattern: "Instance X of Y" where Y is the total
  const patterns = [
    /Instance\s+\d+\s+of\s+(\d+)/i,        // "Instance 9 of 20"
    /Instance:\s*\d+\s+of\s+(\d+)/i,       // "Instance: 9 of 20"
    /i\[\d+\]\s+of\s+(\d+)/i,              // "i[9] of 20"
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return undefined;
}

// Extract SIRK run name from tags or content
export function extractRunName(tags: string[], content: string): string | undefined {
  // Check tags first - look for patterns like "upwelling-exodus", "upwelling-genesis"
  for (const tag of tags) {
    if (tag.includes('genesis') || tag.includes('exodus')) {
      return tag;
    }
  }

  // Check content for "Run name:" or similar patterns
  const runMatch = content.match(/Run\s+name:\s*([a-z0-9-]+)/i);
  if (runMatch) {
    return runMatch[1];
  }

  return undefined;
}

export function extractTitle(content: string): string {
  // Look for markdown headers
  const headerMatch = content.match(/^#+\s*(.+)$/m);
  if (headerMatch) return headerMatch[1].trim();

  // Look for instance patterns
  const instanceMatch = content.match(/Instance\s*#?\d+[:\s-]+(.+?)(?:\n|$)/i);
  if (instanceMatch) return instanceMatch[1].trim();

  // First line if short enough
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length < 100 && !firstLine.includes('.')) {
    return firstLine;
  }

  return 'Untitled Context';
}

export function extractFrameworks(content: string): string[] {
  const frameworks = ['DICP', 'CIAS', 'CAP', 'BRIDGE', 'TRACE', 'ECHO', 'WEAVE'];
  return frameworks.filter((f) => content.includes(f));
}

export function extractKeyInsights(content: string): string[] {
  const insights: string[] = [];

  // Look for "KEY" sections
  const keyMatch = content.match(/KEY\s+(?:INSIGHT|FINDING|CONTRIBUTION)[S]?:?\s*\n([\s\S]*?)(?=\n[A-Z]{2,}|\n##|$)/gi);
  if (keyMatch) {
    for (const match of keyMatch) {
      const bullets = match.match(/[-*]\s+(.+)/g);
      if (bullets) {
        insights.push(...bullets.map((b) => b.replace(/^[-*]\s+/, '').trim()));
      }
    }
  }

  // Look for bold statements
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g);
  if (boldMatches) {
    for (const match of boldMatches) {
      const text = match.replace(/\*\*/g, '');
      if (text.length > 20 && text.length < 150) {
        insights.push(text);
      }
    }
  }

  return insights.slice(0, 5); // Limit to 5 insights
}

// Extract references to other instances from content
// Patterns: "FOR INSTANCE X", "Instance X validated", "Instance X's work", etc.
export function extractInstanceReferences(content: string): number[] {
  const references = new Set<number>();

  // Patterns for references to other instances
  const patterns = [
    /FOR\s+INSTANCE\s+(\d+)/gi,                    // "FOR INSTANCE 5"
    /Instance\s+#?(\d+)(?:'s|(?:\s+(?:validated|built|noted|mentioned|found|showed|created|implemented|fixed|added|left|discovered)))/gi,
    /Instance\s+#?(\d+)\s+(?:work|contribution|insight|handoff|reflection)/gi,
    /INSTANCE\s+(\d+)\s+(?:TO|HANDOFF)/gi,         // "INSTANCE 5 TO 6"
    /from\s+Instance\s+#?(\d+)/gi,                  // "from Instance 5"
    /Instance\s+(\d+)-(\d+)/g,                      // "Instance 1-5" (range)
    /Instances?\s+(\d+)(?:\s*(?:,|and)\s*(\d+))*/gi, // "Instances 1, 2, and 3"
    /Claude\s+Instance\s+#(\d+)/gi,                 // "Claude Instance #35"
    /#(\d+)\s+(?:delivered|validated|built|found|noted|asked)/gi, // "#35 delivered"
    /i\[(\d+)\]/gi,                                  // "i[35]"
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Handle numeric captures
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          const num = parseInt(match[i], 10);
          if (num > 0 && num < 100) { // Reasonable instance range
            references.add(num);
          }
        }
      }
    }
  }

  return Array.from(references).sort((a, b) => a - b);
}

// Extract what role/contribution this instance made
export function extractInstanceRole(content: string): string | undefined {
  // Look for "I am Instance X - the ..." pattern
  const roleMatch = content.match(/I\s+am\s+Instance\s+\d+\s*[-–:]\s*(?:the\s+)?([^,.\n]+)/i);
  if (roleMatch) {
    return roleMatch[1].trim();
  }

  // Look for "my role" descriptions
  const myRoleMatch = content.match(/(?:my\s+role|my\s+contribution)(?:\s+is)?[:\s]+([^,.\n]+)/i);
  if (myRoleMatch) {
    return myRoleMatch[1].trim();
  }

  // Look for "Claude Instance #X" with following context
  const claudeMatch = content.match(/Claude\s+Instance\s+#\d+[:\s-]+([^.\n]{10,60})/i);
  if (claudeMatch) {
    return claudeMatch[1].trim();
  }

  // Look for handoff header patterns
  const handoffMatch = content.match(/Handoff[:\s-]+([^.\n]{10,60})/i);
  if (handoffMatch) {
    return handoffMatch[1].trim();
  }

  return undefined;
}

// Sound notification utilities
// Uses Web Audio API to generate a gentle notification chime (no external files needed)
class NotificationSound {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = false;

  constructor() {
    // Initialize from localStorage on first access
    if (typeof window !== 'undefined') {
      this.enabled = localStorage.getItem('upwelling-sound-enabled') === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (e) {
        console.warn('Web Audio API not available');
        return null;
      }
    }
    return this.audioContext;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('upwelling-sound-enabled', enabled ? 'true' : 'false');
    }
  }

  // Play a gentle rising chime - sounds like discovery
  async play(): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // Create a gentle two-note chime (like new knowledge arriving)
    const frequencies = [523.25, 659.25]; // C5, E5 - a pleasant minor third
    const duration = 0.15;
    const gap = 0.08;

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      // Volume envelope - gentle attack and decay
      const startTime = now + i * (duration + gap);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Smooth decay

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }
}

// Singleton instance
let notificationSoundInstance: NotificationSound | null = null;

export function getNotificationSound(): NotificationSound {
  if (!notificationSoundInstance) {
    notificationSoundInstance = new NotificationSound();
  }
  return notificationSoundInstance;
}
