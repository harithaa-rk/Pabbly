'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Map,
  EyeOff,
  Undo2,
  Redo2,
  Check,
} from 'lucide-react';
import { NodeCard } from './NodeCard';
import { WorkflowNode, WorkflowEdge, WorkflowItem } from '../../store/workflowStore';
import { cn } from '../../lib/utils';

interface VisualCanvasProps {
  workflow: WorkflowItem;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectApp: (nodeId: string) => void;
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onAddNode: (afterNodeId?: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasUnsavedChanges?: boolean;
}

const NODE_WIDTH = 260;
const NODE_HEIGHT = 125;

export const VisualCanvas: React.FC<VisualCanvasProps> = ({
  workflow,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onSelectApp,
  onUpdateNodePosition,
  onAddNode,
  onDeleteNode,
  onDuplicateNode,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  hasUnsavedChanges = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(workflow.canvasViewport?.zoom || 1);
  const [pan, setPan] = useState({
    x: workflow.canvasViewport?.x || 0,
    y: workflow.canvasViewport?.y || 0,
  });

  // Mini-map toggle
  const [showMiniMap, setShowMiniMap] = useState(true);

  // Dragging Canvas State
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Dragging Node State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Canvas pan on mouse down
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.builder-node-wrapper') ||
      target.closest('.canvas-controls') ||
      target.closest('.canvas-minimap')
    ) {
      return;
    }

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
    onSelectNode(null);
  };

  // Node drag start
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    onSelectNode(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    dragOffsetRef.current = {
      x: e.clientX / zoom - node.position.x,
      y: e.clientY / zoom - node.position.y,
    };
  };

  // Global mouse listeners for pan & node drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      } else if (draggingNodeId) {
        const newX = Math.round(e.clientX / zoom - dragOffsetRef.current.x);
        const newY = Math.round(e.clientY / zoom - dragOffsetRef.current.y);
        onUpdateNodePosition(draggingNodeId, { x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setDraggingNodeId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, draggingNodeId, zoom, onUpdateNodePosition]);

  // Wheel zoom & pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.45), 1.8));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX * 0.8,
        y: prev.y - e.deltaY * 0.8,
      }));
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.45));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const bounds = nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        maxX: Math.max(acc.maxX, node.position.x + NODE_WIDTH),
        minY: Math.min(acc.minY, node.position.y),
        maxY: Math.max(acc.maxY, node.position.y + NODE_HEIGHT),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const padding = 120;
    const scaleX = (containerWidth - padding) / Math.max(width, 100);
    const scaleY = (containerHeight - padding) / Math.max(height, 100);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.15);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: containerWidth / 2 - centerX * newZoom,
      y: containerHeight / 2 - centerY * newZoom,
    });
  }, [nodes]);

  // Center once on initial mount if viewport has not been set
  useEffect(() => {
    if (workflow.canvasViewport?.x === 0 && workflow.canvasViewport?.y === 0) {
      handleFitToScreen();
    }
  }, [handleFitToScreen, workflow.canvasViewport]);

  // HORIZONTAL Left-to-Right Connections
  const renderHorizontalConnections = () => {
    return edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return null;

      // Source anchor: Right-center of source node
      const x1 = sourceNode.position.x + NODE_WIDTH;
      const y1 = sourceNode.position.y + NODE_HEIGHT / 2;

      // Target anchor: Left-center of target node
      const x2 = targetNode.position.x;
      const y2 = targetNode.position.y + NODE_HEIGHT / 2;

      // Smooth horizontal cubic bezier curve
      const deltaX = Math.max(Math.abs(x2 - x1), 50);
      const controlX1 = x1 + deltaX * 0.45;
      const controlX2 = x2 - deltaX * 0.45;

      const pathData = `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;

      // Midpoint for intermediate (+) add button
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      return (
        <g key={edge.id} className="transition-all duration-150">
          {/* Transparent wider line for easy hover/interaction */}
          <path
            d={pathData}
            fill="none"
            stroke="transparent"
            strokeWidth="18"
            className="cursor-pointer"
          />

          {/* Horizontal connection line */}
          <path
            d={pathData}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
          />

          {/* Animated signal dot moving left to right */}
          <circle r="3.5" fill="#E85D8A">
            <animateMotion
              path={pathData}
              dur="2.4s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Midpoint (+) Button between nodes */}
          <g
            transform={`translate(${midX}, ${midY})`}
            className="cursor-pointer group/edge-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddNode(sourceNode.id);
            }}
          >
            <circle
              r="12"
              fill="white"
              stroke="#E9E5E4"
              strokeWidth="2"
              className="group-hover/edge-btn:stroke-[#E85D8A] group-hover/edge-btn:fill-[#FFF7F4] shadow-xs transition-all"
            />
            <path
              d="M -4 0 L 4 0 M 0 -4 L 0 4"
              stroke="#667085"
              strokeWidth="2"
              strokeLinecap="round"
              className="group-hover/edge-btn:stroke-[#E85D8A] transition-colors"
            />
          </g>
        </g>
      );
    });
  };

  // Mini-map calculations
  const miniMapBounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 600 };
    return nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x - 100),
        maxX: Math.max(acc.maxX, node.position.x + NODE_WIDTH + 100),
        minY: Math.min(acc.minY, node.position.y - 100),
        maxY: Math.max(acc.maxY, node.position.y + NODE_HEIGHT + 100),
      }),
      { minX: 0, maxX: 1000, minY: 0, maxY: 600 }
    );
  }, [nodes]);

  const mapWidth = 140;
  const mapHeight = 90;
  const totalWorldWidth = Math.max(miniMapBounds.maxX - miniMapBounds.minX, 600);
  const totalWorldHeight = Math.max(miniMapBounds.maxY - miniMapBounds.minY, 400);
  const mapScale = Math.min(mapWidth / totalWorldWidth, mapHeight / totalWorldHeight);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      className={cn(
        'relative w-full h-full overflow-hidden select-none outline-none',
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      )}
      style={{
        backgroundColor: '#FFFDFB',
        backgroundImage: `radial-gradient(#CBD5E1 1.25px, transparent 1.25px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Transformed Canvas Viewport */}
      <div
        className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Horizontal Connections Layer */}
        <svg
          className="absolute top-0 left-0 w-[10000px] h-[10000px] overflow-visible pointer-events-auto"
          style={{ transform: 'translate(0px, 0px)' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="8"
              refX="8"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 9 4, 0 8" fill="#94A3B8" />
            </marker>
          </defs>

          {renderHorizontalConnections()}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute top-0 left-0 pointer-events-auto">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="builder-node-wrapper absolute"
              style={{
                transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0)`,
                width: NODE_WIDTH,
              }}
            >
              <NodeCard
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={() => onSelectNode(node.id)}
                onSelectApp={() => onSelectApp(node.id)}
                onAddNextStep={() => onAddNode(node.id)}
                onDelete={() => onDeleteNode(node.id)}
                onDuplicate={onDuplicateNode ? () => onDuplicateNode(node.id) : undefined}
                canDelete={nodes.length > 1}
                isDragging={draggingNodeId === node.id}
                onMouseDownDrag={(e) => handleNodeDragStart(node.id, e)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Canvas Controls (Bottom-Right) */}
      <div className="canvas-controls absolute bottom-5 right-5 flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-[#E9E5E4] shadow-sm p-1 gap-1 z-30 select-none">
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              canUndo
                ? "text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4]"
                : "text-[#D0D5DD] cursor-not-allowed"
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        )}

        {onRedo && (
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              canRedo
                ? "text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4]"
                : "text-[#D0D5DD] cursor-not-allowed"
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        )}

        {(onUndo || onRedo) && <div className="h-3.5 w-px bg-[#E9E5E4] mx-0.5" />}

        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          className="px-2 py-0.5 text-xs font-bold text-[#182033] hover:bg-[#FFF7F4] rounded-md transition-colors min-w-[48px] text-center"
          title="Reset Zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-3.5 w-px bg-[#E9E5E4] mx-0.5" />

        <button
          type="button"
          onClick={handleFitToScreen}
          className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          className="p-1.5 rounded-lg text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Mini-Map Navigator (Bottom-Left) */}
      <div className="canvas-minimap absolute bottom-5 left-5 z-30 select-none">
        {showMiniMap ? (
          <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-[#E9E5E4] shadow-xs space-y-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1">
                <Map className="w-2.5 h-2.5 text-[#E85D8A]" />
                Map
              </span>
              <button
                type="button"
                onClick={() => setShowMiniMap(false)}
                className="text-[#98A2B3] hover:text-[#182033] p-0.5"
                title="Hide Map"
              >
                <EyeOff className="w-2.5 h-2.5" />
              </button>
            </div>

            <div
              className="relative rounded-md bg-[#FAF8F6] border border-[#E9E5E4] overflow-hidden"
              style={{ width: mapWidth, height: mapHeight }}
            >
              {nodes.map((node) => {
                const nodeX = (node.position.x - miniMapBounds.minX) * mapScale;
                const nodeY = (node.position.y - miniMapBounds.minY) * mapScale;
                const nodeW = Math.max(NODE_WIDTH * mapScale, 14);
                const nodeH = Math.max(NODE_HEIGHT * mapScale, 8);

                return (
                  <div
                    key={node.id}
                    className={cn(
                      'absolute rounded-xs',
                      node.type === 'trigger' ? 'bg-[#E85D8A]' : 'bg-[#3B66DE]'
                    )}
                    style={{
                      left: Math.max(nodeX, 2),
                      top: Math.max(nodeY, 2),
                      width: nodeW,
                      height: nodeH,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMiniMap(true)}
            className="p-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#E9E5E4] shadow-xs text-[#667085] hover:text-[#182033] hover:bg-[#FFF7F4] transition-colors"
            title="Open Mini-map"
          >
            <Map className="w-3.5 h-3.5 text-[#E85D8A]" />
          </button>
        )}
      </div>

      {/* Flow & Save State Indicator (Top-Left) */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#E9E5E4] text-[10px] text-[#667085] flex items-center gap-1.5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
          <span>Horizontal Canvas: [ Trigger ] → [ Action ]</span>
        </div>
        {hasUnsavedChanges ? (
          <div className="bg-[#FFF4E5] border border-[#FFD6A4] text-[#B54708] px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F79009] animate-pulse" />
            Unsaved Changes
          </div>
        ) : (
          <div className="bg-[#EDFDF3] border border-[#ABEFC6] text-[#067647] px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 shadow-2xs">
            <Check className="w-2.5 h-2.5 text-[#12B76A]" />
            Saved
          </div>
        )}
      </div>
    </div>
  );
};
