declare module 'force-graph' {
  interface GraphDataInput {
    nodes: Array<Record<string, any>>;
    links: Array<{ source: string | number; target: string | number }>;
  }

  interface ForceGraphInstance {
    (element: HTMLElement | null): ForceGraphInstance;
    graphData(data: GraphDataInput): ForceGraphInstance;
    nodeLabel(val: string | ((node: any) => string)): ForceGraphInstance;
    nodeColor(val: string | ((node: any) => string)): ForceGraphInstance;
    nodeRelSize(val: number): ForceGraphInstance;
    nodeAutoColorBy(val: string | null): ForceGraphInstance;
    linkWidth(val: number | ((link: any) => number)): ForceGraphInstance;
    linkDirectionalParticles(val: number): ForceGraphInstance;
    linkDirectionalParticleWidth(val: number): ForceGraphInstance;
    linkColor(val: string | ((link: any) => string)): ForceGraphInstance;
    onNodeClick(callback: (node: any) => void): ForceGraphInstance;
    onNodeHover(callback: (node: any | null) => void): ForceGraphInstance;
    d3AlphaDecay(val: number): ForceGraphInstance;
    d3VelocityDecay(val: number): ForceGraphInstance;
    backgroundColor(val: string): ForceGraphInstance;
    width(val: number): ForceGraphInstance;
    height(val: number): ForceGraphInstance;
    cooldownTicks(val: number): ForceGraphInstance;
    onEngineTick(callback: () => void): ForceGraphInstance;
    onEngineStop(callback: () => void): ForceGraphInstance;
    d3Force(
      forceName: string,
      forceFn: any | null
    ): ForceGraphInstance;
    zoom(val: number, transitionMs?: number): ForceGraphInstance;
    centerAt(x?: number, y?: number, transitionMs?: number): ForceGraphInstance;
  }

  const ForceGraph2D: () => ForceGraphInstance;
  export default ForceGraph2D;
}
