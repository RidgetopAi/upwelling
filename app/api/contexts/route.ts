import { NextRequest, NextResponse } from 'next/server';
import { loadProjectData } from '@/lib/mandrel';
import type { ProjectName } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_PROJECTS: ProjectName[] = ['emergence-notes', 'upwelling'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectParam = searchParams.get('project') || 'emergence-notes';

    // Validate project name
    const project = VALID_PROJECTS.includes(projectParam as ProjectName)
      ? (projectParam as ProjectName)
      : 'emergence-notes';

    const data = await loadProjectData(project);
    return NextResponse.json({
      ...data,
      project,
    });
  } catch (error) {
    console.error('Error fetching contexts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contexts from Mandrel' },
      { status: 500 }
    );
  }
}
