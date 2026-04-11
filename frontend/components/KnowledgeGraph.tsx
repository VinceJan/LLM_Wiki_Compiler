'use client';

import { useRef, useEffect } from 'react';
import ForceGraph2D from 'force-graph';

interface GraphNode {
  id: string;
  title: string;
  type: 'concept' | 'entity' | 'source' | 'query' | 'other';
  links_count: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphLink[];
}

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
}

// 节点颜色映射 — 与新配色协调的柔和色调
const NODE_COLORS: Record<string, string> = {
  concept: '#c9a87c',   // 琥珀 - 概念页
  entity: '#7da87b',    // 鼠尾草绿 - 实体页
  source: '#c9a84c',    // 暖黄 - 来源页
  query: '#a08ab5',     // 柔和紫 - 查询页
  other: '#666666',     // 中灰 - 其他
};

// 连线颜色
const LINK_COLOR = '#2a2a2a';

export default function KnowledgeGraph({ data, onNodeClick }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ReturnType<typeof ForceGraph2D> | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.nodes.length) return;

    // 仅在首次初始化时创建图谱实例
    if (!graphRef.current) {
      graphRef.current = ForceGraph2D()(containerRef.current)
        .nodeLabel('title')
        .nodeColor((node: GraphNode) => NODE_COLORS[node.type] || NODE_COLORS.other)
        .nodeRelSize(6)
        .linkWidth(1)
        .linkColor(LINK_COLOR)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(2)
        .onNodeClick((node: GraphNode) => onNodeClick(node))
        .d3AlphaDecay(0.02)
        .d3VelocityDecay(0.3)
        .backgroundColor('#111111'); // 与 bg 色匹配
    }

    // 每次 data 变化时更新图谱数据（保留节点物理位置）
    const fgData = {
      nodes: data.nodes.map(n => ({ ...n })),
      links: data.edges.map(e => ({ source: e.source, target: e.target })),
    };
    graphRef.current.graphData(fgData);
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px]"
    />
  );
}
