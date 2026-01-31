import { NextRequest, NextResponse } from 'next/server';
import { mandrelClient, parseContexts, calculateStats } from '@/lib/mandrel';
import type { ProjectName } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_PROJECTS: ProjectName[] = ['emergence-notes', 'upwelling'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectParam = searchParams.get('project') || 'emergence-notes';
    const formatParam = searchParams.get('format') || 'json';

    // Validate project name
    const project = VALID_PROJECTS.includes(projectParam as ProjectName)
      ? (projectParam as ProjectName)
      : 'emergence-notes';

    // Fetch all contexts (up to limit)
    const rawContexts = await mandrelClient.getRecentContexts(project, 20);
    const contexts = parseContexts(rawContexts);
    const stats = calculateStats(contexts);

    // Get project info
    const projectInfo = await mandrelClient.getProjectInfo(project);

    // Create export data structure
    const exportData = {
      metadata: {
        project: project,
        projectDescription: projectInfo.description,
        exportedAt: new Date().toISOString(),
        totalContexts: stats.totalContexts,
        instanceCount: stats.instanceCount,
        dateRange: stats.dateRange,
        contextsByType: stats.contextsByType,
        frameworks: stats.frameworks,
        source: 'upwelling.ridgetopai.net',
        note: 'This data represents accumulated AI collaboration from the emergence-notes and upwelling projects.',
      },
      contexts: contexts.map(ctx => ({
        id: ctx.id,
        type: ctx.type,
        content: ctx.content,
        title: ctx.title,
        instanceNumber: ctx.instanceNumber,
        tags: ctx.tags,
        created_at: ctx.created_at,
        wordCount: ctx.wordCount,
        frameworks: ctx.frameworks,
        keyInsights: ctx.keyInsights,
      })),
    };

    if (formatParam === 'json') {
      // Return as downloadable JSON file
      const jsonContent = JSON.stringify(exportData, null, 2);
      const filename = `${project}-contexts-${new Date().toISOString().split('T')[0]}.json`;

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: return JSON in response body (for preview)
    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting contexts:', error);
    return NextResponse.json(
      { error: 'Failed to export contexts from Mandrel' },
      { status: 500 }
    );
  }
}
