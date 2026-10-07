import { Fragment, useEffect, useRef, useState } from "react";
import { Arrow, Circle, Ellipse, Group, Layer, Line, Rect, Shape, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import { ArrowDownLeft, ArrowRight, CircleDot, Goal, Hand, MoveRight, Plus, RotateCcw, RotateCw, Save, Trash2, Type } from "lucide-react";
import { Button } from "./ui";
import type { DiagramItem } from "../types";
import { localize } from "../lib/i18n";

const tools = [
  { type: "player", label: "Player", icon: Hand },
  { type: "keeper", label: "Goalkeeper", icon: CircleDot },
  { type: "cone", label: "Cone", icon: ArrowDownLeft },
  { type: "goal", label: "Goal", icon: Goal },
  { type: "ball", label: "Ball", icon: CircleDot },
  { type: "arrow", label: "Arrow", icon: ArrowRight },
  { type: "pass", label: "Pass", icon: ArrowRight },
  { type: "movement", label: "Move", icon: MoveRight },
  { type: "text", label: "Text", icon: Type },
] as const;
const colors = { player: "#3158d6", keeper: "#ed9c35", cone: "#e5764d", goal: "#34415c", ball: "#d5aa35", pass: "#32a57b", movement: "#8058cc", arrow: "#68748d", text: "#293550" };
const initialItems: DiagramItem[] = [
  { id: "p1", type: "player", x: 140, y: 115, width: 36, height: 36 },
  { id: "p2", type: "player", x: 245, y: 215, width: 36, height: 36 },
  { id: "gk1", type: "keeper", x: 452, y: 160, width: 38, height: 38 },
  { id: "goal1", type: "goal", x: 525, y: 145, width: 48, height: 80 },
  { id: "a1", type: "pass", x: 160, y: 125, width: 110, height: 88 },
];

export default function DiagramEditor({ value, onSave }: { value: string; onSave: (value: string) => Promise<void> }) {
  const [items, setItems] = useState<DiagramItem[]>(() => {
    try { return value ? JSON.parse(value) as DiagramItem[] : initialItems; } catch { return initialItems; }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Node>());
  const selectedItem = items.find((item) => item.id === selectedId);

  useEffect(() => {
    const selected = selectedId ? nodes.current.get(selectedId) : undefined;
    transformerRef.current?.nodes(selected ? [selected] : []);
    transformerRef.current?.getLayer()?.batchDraw();
  }, [selectedId, items]);
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) {
        setItems((current) => current.filter((item) => item.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [selectedId]);
  const add = (type: DiagramItem["type"]) => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, type, x: 180 + Math.random() * 140, y: 90 + Math.random() * 130, width: type === "arrow" || type === "pass" || type === "movement" ? 120 : type === "text" ? 100 : 40, height: type === "arrow" || type === "pass" || type === "movement" ? 70 : 40, text: type === "text" ? "Text" : undefined }]);
    setSelectedId(id);
  };
  const updateItem = (id: string, change: Partial<DiagramItem>) =>
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...change } : item));
  const save = async () => {
    await onSave(JSON.stringify(items));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return localize((
    <div className="diagram-editor">
      <div className="diagram-toolbar">
        <div className="tool-list">{tools.map(({ type, label, icon: Icon }) =>
          <button className="tool-button" key={type} onClick={() => add(type)} title={`Add ${label}`}><Icon size={16} /><span>{label}</span></button>
        )}</div>
        <div className="diagram-actions">
          <Button variant="ghost" onClick={() => { setItems([]); setSelectedId(null); }}><RotateCcw size={15} /> Clear</Button>
          {selectedId && <Button variant="ghost" onClick={() => updateItem(selectedId, { rotation: ((selectedItem?.rotation || 0) + 15) % 360 })}><RotateCw size={15} /> Rotate 15°</Button>}
          {selectedId && <Button variant="ghost" onClick={() => { setItems((current) => current.filter((item) => item.id !== selectedId)); setSelectedId(null); }}><Trash2 size={15} /> Delete</Button>}
          <Button onClick={() => void save()}><Save size={15} /> {saved ? "Saved!" : "Save diagram"}</Button>
        </div>
      </div>
      <div className="canvas-wrap">
        <Stage
          ref={stageRef}
          width={620}
          height={360}
          onMouseDown={(event) => { if (event.target === event.target.getStage()) setSelectedId(null); }}
          className="court-canvas"
        >
          <Layer listening={false}>
            <Rect x={4} y={4} width={612} height={352} fill="#fff" stroke="#dfe5ee" strokeWidth={2} cornerRadius={8} />
            <Line points={[34, 10, 586, 10, 586, 158]} stroke="#dce3ec" strokeWidth={2} />
            <Line points={[586, 202, 586, 350, 34, 350, 34, 202]} stroke="#dce3ec" strokeWidth={2} />
            <Line points={[34, 158, 34, 10]} stroke="#dce3ec" strokeWidth={2} />
            <Line points={[310, 10, 310, 350]} stroke="#dce3ec" strokeWidth={2} />
            <Circle x={310} y={180} radius={55} stroke="#dce3ec" strokeWidth={2} />
            {[{ x: 34, direction: 1 }, { x: 586, direction: -1 }].map(({ x, direction }) => (
              <Fragment key={x}>
                <Shape
                  sceneFunc={(context, shape) => {
                    context.beginPath();
                    context.arc(0, 0, 88, direction === 1 ? -Math.PI / 2 : Math.PI / 2, direction === 1 ? Math.PI / 2 : Math.PI * 1.5);
                    context.strokeShape(shape);
                  }}
                  x={x} y={180} stroke="#9cadc0" strokeWidth={2}
                />
                <Shape
                  sceneFunc={(context, shape) => {
                    context.beginPath();
                    context.arc(0, 0, 132, direction === 1 ? -Math.PI / 2 : Math.PI / 2, direction === 1 ? Math.PI / 2 : Math.PI * 1.5);
                    context.strokeShape(shape);
                  }}
                  x={x} y={180} stroke="#b8c4d2" strokeWidth={1.5} dash={[7, 6]}
                />
                <Line points={[x + direction * 103, 171, x + direction * 103, 189]} stroke="#9cadc0" strokeWidth={2} />
                <Line points={[x + direction * 59, 173, x + direction * 59, 187]} stroke="#c1ccd8" strokeWidth={1.5} />
                <Rect x={direction === 1 ? 8 : 586} y={158} width={26} height={44} fill="#f7f9fc" stroke="#8b9bb0" strokeWidth={2} />
                <Line points={[direction === 1 ? 34 : 586, 158, direction === 1 ? 34 : 586, 202]} stroke="#65778e" strokeWidth={3} />
                <Line points={[direction === 1 ? 8 : 612, 158, direction === 1 ? 8 : 612, 202]} stroke="#b7c3d0" strokeWidth={1} />
                <Line points={[direction === 1 ? 8 : 586, 158, direction === 1 ? 34 : 612, 158]} stroke="#b7c3d0" strokeWidth={1} />
                <Line points={[direction === 1 ? 8 : 586, 202, direction === 1 ? 34 : 612, 202]} stroke="#b7c3d0" strokeWidth={1} />
              </Fragment>
            ))}
          </Layer>
          <Layer>
            {items.map((item) => {
              const common = {
                key: item.id, x: item.x, y: item.y, draggable: true,
                rotation: item.rotation || 0,
                onClick: () => setSelectedId(item.id), onTap: () => setSelectedId(item.id),
                onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => updateItem(item.id, { x: event.target.x(), y: event.target.y() }),
                onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
                  const node = event.target;
                  updateItem(item.id, { x: node.x(), y: node.y(), width: Math.max(20, item.width * node.scaleX()), height: Math.max(20, item.height * node.scaleY()), rotation: node.rotation() });
                  node.scaleX(1); node.scaleY(1);
                },
                ref: (node: Konva.Node | null) => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id); },
              };
              if (["arrow", "pass", "movement"].includes(item.type)) {
                return <Arrow {...common} points={[0, 0, item.width, item.height]} stroke={colors[item.type]} fill={colors[item.type]} strokeWidth={item.type === "movement" ? 3 : 2.5} pointerLength={9} pointerWidth={9} dash={item.type === "movement" ? [8, 6] : undefined} />;
              }
              if (item.type === "player" || item.type === "keeper") {
                return <Group {...common} offsetX={item.width / 2} offsetY={item.height / 2}>
                  <Circle radius={item.width / 2} fill={colors[item.type]} stroke="#fff" strokeWidth={2} shadowColor="#263550" shadowBlur={4} shadowOpacity={0.12} />
                  <Text text={item.type === "player" ? "P" : "GK"} width={item.width} height={item.height} align="center" verticalAlign="middle" fontSize={item.type === "player" ? 14 : 10} fontStyle="bold" fill="#fff" />
                </Group>;
              }
              if (item.type === "cone") return <Line {...common} points={[0, item.height, item.width / 2, 0, item.width, item.height]} closed fill={colors.cone} stroke="#fff" strokeWidth={2} />;
              if (item.type === "goal") return <Group {...common}><Rect width={item.width} height={item.height} stroke={colors.goal} strokeWidth={4} /><Line points={[4, 5, item.width - 4, item.height - 5]} stroke="#edf0f5" /><Line points={[item.width - 4, 5, 4, item.height - 5]} stroke="#edf0f5" /></Group>;
              if (item.type === "ball") return <Ellipse {...common} radiusX={item.width / 2} radiusY={item.height / 2} fill={colors.ball} stroke="#fff" strokeWidth={2} />;
              return <Text {...common} text={item.text || "Text"} width={item.width} height={item.height} wrap="word" fontSize={16} fontStyle="bold" fill={colors.text} />;
            })}
            <Transformer ref={transformerRef} rotateEnabled enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]} boundBoxFunc={(oldBox, newBox) => newBox.width < 20 || newBox.height < 20 ? oldBox : newBox} />
          </Layer>
        </Stage>
      </div>
      <div className="canvas-caption"><span><Plus size={13} /> Court markings and goals stay fixed</span><span>Drag to move · Select to resize or rotate · Delete key to remove</span></div>
    </div>
  ));
}
