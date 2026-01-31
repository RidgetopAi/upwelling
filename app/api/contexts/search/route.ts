import { NextRequest, NextResponse } from 'next/server';
import { mandrelClient, parseContexts, calculateStats } from '@/lib/mandrel';
import type { ProjectName } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_PROJECTS: ProjectName[] = ['emergence-notes', 'upwelling'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const projectParam = searchParams.get('project') || 'emergence-notes';
    const limitParam = searchParams.get('limit');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Validate project name
    const project = VALID_PROJECTS.includes(projectParam as ProjectName)
      ? (projectParam as ProjectName)
      : 'emergence-notes';

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 20) : 10;

    const rawContexts = await mandrelClient.searchContexts(query, project, limit);
    const contexts = parseContexts(rawContexts);
    const stats = calculateStats(contexts);

    return NextResponse.json({
      query,
      project,
      contexts,
      stats,
      resultCount: contexts.length,
    });
  } catch (error) {
    console.error('Error searching contexts:', error);
    return NextResponse.json(
      { error: 'Failed to search contexts in Mandrel' },
      { status: 500 }
    );
  }
}
