import { useState, useEffect, type CSSProperties } from 'react';

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type?: 'agent' | 'tool' | 'data' | 'decision';
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}

interface DiagramStep {
  title: string;
  description: string;
  activeNodes: string[];
  activeEdges: number[];
}

interface AgentFlowDiagramProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps: DiagramStep[];
  title?: string;
  width?: number;
  height?: number;
  isRtl?: boolean;
  labelPrev?: string;
  labelNext?: string;
  labelStep?: string;
  labelOf?: string;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  agent:    { fill: '#1a1a4a', stroke: '#ffcc00' },
  tool:     { fill: '#1a2a1a', stroke: '#4ade80' },
  data:     { fill: '#1a1a3e', stroke: '#60a5fa' },
  decision: { fill: '#2a1a2a', stroke: '#c084fc' },
};

export default function AgentFlowDiagram({
  nodes, edges, steps, title,
  width = 600, height = 350,
  isRtl = false,
  labelPrev = 'Prev', labelNext = 'Next',
  labelStep = 'Step', labelOf = 'of',
}: AgentFlowDiagramProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const step = steps[currentStep];

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const isNodeActive = (id: string) => step?.activeNodes.includes(id);
  const isEdgeActive = (idx: number) => step?.activeEdges.includes(idx);

  const prevArrow = isRtl ? '→' : '←';
  const nextArrow = isRtl ? '←' : '→';

  return (
    <div className="afd-container">
      {title && <div className="afd-title">{title}</div>}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="afd-svg"
        style={{ maxWidth: width, width: '100%', height: 'auto' }}
      >
        <defs>
          <marker id="afd-arrow" viewBox="0 0 10 7" refX="10" refY="3.5"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
          <marker id="afd-arrow-active" viewBox="0 0 10 7" refX="10" refY="3.5"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ffcc00" />
          </marker>
          <filter id="afd-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, idx) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;
          const active = isEdgeActive(idx);
          return (
            <g key={`edge-${idx}`}>
              <line
                x1={fromNode.x} y1={fromNode.y}
                x2={toNode.x} y2={toNode.y}
                stroke={active ? '#ffcc00' : '#333366'}
                strokeWidth={active ? 2.5 : 1.5}
                markerEnd={active ? 'url(#afd-arrow-active)' : 'url(#afd-arrow)'}
                style={{
                  transition: 'stroke 0.4s, stroke-width 0.4s',
                  opacity: active ? 1 : 0.4,
                  strokeDasharray: edge.animated && active ? '6 4' : 'none',
                }}
              >
                {edge.animated && active && (
                  <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />
                )}
              </line>
              {edge.label && (
                <text
                  x={(fromNode.x + toNode.x) / 2}
                  y={(fromNode.y + toNode.y) / 2 - 8}
                  textAnchor="middle"
                  fill={active ? '#ffcc00' : '#666'}
                  fontSize="10"
                  style={{ transition: 'fill 0.4s' }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const active = isNodeActive(node.id);
          const colors = NODE_COLORS[node.type || 'agent'];
          const nodeW = 110;
          const nodeH = 36;
          return (
            <g key={node.id} style={{ transition: 'opacity 0.4s' }}>
              <rect
                x={node.x - nodeW / 2} y={node.y - nodeH / 2}
                width={nodeW} height={nodeH}
                rx={node.type === 'decision' ? 0 : 6}
                fill={active ? colors.fill : '#0f0f23'}
                stroke={active ? colors.stroke : '#333366'}
                strokeWidth={active ? 2 : 1}
                filter={active ? 'url(#afd-glow)' : 'none'}
                style={{ transition: 'all 0.4s' }}
                transform={node.type === 'decision' ? `rotate(45 ${node.x} ${node.y})` : undefined}
              />
              <text
                x={node.x} y={node.y + 4}
                textAnchor="middle"
                fill={active ? '#ffffff' : '#888'}
                fontSize="12"
                fontWeight={active ? 600 : 400}
                fontFamily="Inter, system-ui, sans-serif"
                style={{ transition: 'fill 0.4s', pointerEvents: 'none' }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Step description */}
      {step && (
        <div className="afd-description" dir={isRtl ? 'rtl' : 'ltr'}>
          <strong>{step.title}</strong>
          <p>{step.description}</p>
        </div>
      )}

      {/* Controls */}
      <div className="afd-controls">
        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="afd-btn">
          {prevArrow} {labelPrev}
        </button>
        <span className="afd-step-indicator">
          {labelStep} {currentStep + 1} {labelOf} {steps.length}
        </span>
        <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))} disabled={currentStep === steps.length - 1} className="afd-btn">
          {labelNext} {nextArrow}
        </button>
      </div>
    </div>
  );
}
