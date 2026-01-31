import { NextRequest, NextResponse } from 'next/server';
import { mandrelClient, parseContexts } from '@/lib/mandrel';
import { extractInstanceNumber, extractInstanceReferences, extractInstanceRole } from '@/lib/utils';
import type { ProjectName, GraphNode, GraphEdge, InstanceGraph, ContextType } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_PROJECTS: ProjectName[] = ['emergence-notes', 'upwelling'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectParam = searchParams.get('project') || 'emergence-notes';

    const project = VALID_PROJECTS.includes(projectParam as ProjectName)
      ? (projectParam as ProjectName)
      : 'emergence-notes';

    // Get contexts for this project
    const rawContexts = await mandrelClient.getRecentContexts(project, 20);
    const contexts = parseContexts(rawContexts);

    // Build graph from contexts
    const nodeMap = new Map<number, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const ctx of contexts) {
      const instanceNum = extractInstanceNumber(ctx.content);
      if (instanceNum === undefined) continue;

      // Create or update node for this instance
      if (!nodeMap.has(instanceNum)) {
        nodeMap.set(instanceNum, {
          id: instanceNum,
          label: `Instance ${instanceNum}`,
          type: ctx.type as ContextType,
          role: extractInstanceRole(ctx.content),
          contextCount: 1,
          contextId: ctx.id,
        });
      } else {
        const existing = nodeMap.get(instanceNum)!;
        existing.contextCount++;
        // Update role if we find one and don't have one
        if (!existing.role) {
          existing.role = extractInstanceRole(ctx.content);
        }
      }

      // Extract references to other instances
      const references = extractInstanceReferences(ctx.content);
      for (const ref of references) {
        // Only add edge if target is different from source
        if (ref !== instanceNum) {
          // Determine edge type based on content patterns
          let edgeType: GraphEdge['type'] = 'references';
          const lowerContent = ctx.content.toLowerCase();
          if (lowerContent.includes('validat') || lowerContent.includes('confirm')) {
            edgeType = 'validates';
          } else if (lowerContent.includes('build') || lowerContent.includes('extend') || lowerContent.includes('continu')) {
            edgeType = 'builds_on';
          }

          edges.push({
            source: instanceNum,
            target: ref,
            type: edgeType,
          });

          // Ensure referenced instance exists as a node (even if we don't have its context)
          if (!nodeMap.has(ref)) {
            nodeMap.set(ref, {
              id: ref,
              label: `Instance ${ref}`,
              type: 'discussion', // Default type for referenced-but-not-seen instances
              contextCount: 0,
            });
          }
        }
      }
    }

    // Convert map to sorted array
    const nodes = Array.from(nodeMap.values()).sort((a, b) => a.id - b.id);

    // Deduplicate edges (keep only unique source-target pairs)
    const edgeSet = new Set<string>();
    const uniqueEdges = edges.filter(edge => {
      const key = `${edge.source}-${edge.target}`;
      if (edgeSet.has(key)) return false;
      edgeSet.add(key);
      return true;
    });

    const graph: InstanceGraph = {
      nodes,
      edges: uniqueEdges,
      metadata: {
        project,
        totalInstances: nodes.length,
        totalConnections: uniqueEdges.length,
      },
    };

    return NextResponse.json(graph);
  } catch (error) {
    console.error('Error building graph:', error);
    return NextResponse.json(
      { error: 'Failed to build instance graph' },
      { status: 500 }
    );
  }
}
