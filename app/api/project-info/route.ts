import { NextRequest, NextResponse } from 'next/server';
import { mandrelClient } from '@/lib/mandrel';
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

    const info = await mandrelClient.getProjectInfo(project);

    return NextResponse.json(info);
  } catch (error) {
    console.error('Error fetching project info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project info from Mandrel' },
      { status: 500 }
    );
  }
}
