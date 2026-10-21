import { Check, Clock, Coins, Cpu, Lock, Play, Zap } from 'lucide-react';
import { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CycleDetectedError, sortTasksTopologically } from '../engine/dataflow';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  GraphConnection,
  TaskEvaluationResult,
  TaskNode,
} from '../engine/types';
import {
  STATUS_LABEL,
  displayStatus,
  formatSmart,
  kindLabel,
  shownMetrics,
} from '../ui/display';
import { InheritanceInspector } from './InheritanceInspector';

interface GraphWorkspaceProps {
  classes: ConceptClass[];
  instances: ConceptInstance[];
  capabilities: CapabilityFormula[];
  tasks: TaskNode[];
  connections: GraphConnection[];
  evaluations: Record<string, TaskEvaluationResult>;
  selectedTaskId: string | null;
  selectedInstanceId: string | null;
  onSelectTask: (id: string) => void;
  onSelectInstance: (id: string) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onParam: (id: string, key: 'baseEffortHours' | 'taskComplexity' | 'priorityWeight', value: number) => void;
  onConnect: (connection: GraphConnection) => void;
  onDisconnect: (id: string) => void;
  onUpdateInstance: (instanceId: string, key: string, value: number) => void;
}

interface Point { x: number; y: number }
type DraftSource = { type: 'instance' | 'task_output'; id: string };
type Draft = DraftSource & Point;

const SOCKETS = ['person', 'department', 'project', 'knowledge', 'resource'] as const;

const KIND_ORDER = ['person', 'department', 'project', 'knowledge', 'resource', 'custom'];

const PREVIEW_KEYS: Record<string, string[]> = {
  person: ['hourlyRate', 'experiencePoints'],
  department: ['overheadMultiplier', 'activeLoadHours'],
  project: ['remainingBudget', 'completedDeliverables'],
  knowledge: ['complexityFactor', 'learningCurveHours'],
  resource: ['hourlyCost', 'accelerationFactor'],
};

export function GraphWorkspace(props: GraphWorkspaceProps) {
  const {
    classes,
    instances,
    capabilities,
    tasks,
    connections,
    evaluations,
    selectedTaskId,
    selectedInstanceId,
    onSelectTask,
    onSelectInstance,
    onStart,
    onComplete,
    onParam,
    onConnect,
    onDisconnect,
    onUpdateInstance,
  } = props;

  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const signature = `${instances.map((item) => item.id).join(',')}|${tasks.map((item) => item.id).join(',')}|${connections.length}|${JSON.stringify(positions)}|${selectedTaskId ?? ''}`;
  const { stageRef, anchors } = useAnchors(signature);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedWireId) {
        onDisconnect(selectedWireId);
        setSelectedWireId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDisconnect, selectedWireId]);

  const rel = useCallback((event: { clientX: number; clientY: number }): Point => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return { x: event.clientX, y: event.clientY };
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }, [stageRef]);

  const updateDraft = (next: Draft | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  const beginDrag = (event: ReactPointerEvent, source: DraftSource) => {
    event.stopPropagation();
    event.preventDefault();
    const point = rel(event);
    updateDraft({ ...source, ...point });
    const move = (ev: PointerEvent) => updateDraft({ ...source, ...rel(ev) });
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const sourceNow = draftRef.current;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const drop = hit?.closest('[data-drop-socket]') as HTMLElement | null;
      updateDraft(null);
      if (sourceNow && drop?.dataset.taskId && drop.dataset.slug) {
        connect(sourceNow, drop.dataset.taskId, drop.dataset.slug);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const connect = (source: DraftSource, taskId: string, slug: string) => {
    if (source.type === 'task_output' && source.id === taskId) {
      setToast('یک تسک نمی‌تواند به خودش وصل شود');
      return;
    }

    if (source.type === 'instance') {
      const instance = instances.find((item) => item.id === source.id);
      const concept = classes.find((item) => item.id === instance?.classId);
      if (!concept || concept.slug !== slug) {
        const expected = classes.find((item) => item.slug === slug)?.name ?? slug;
        setToast(`این سوکت فقط ${expected} را می‌پذیرد`);
        return;
      }
    } else {
      const task = tasks.find((item) => item.id === source.id);
      const capability = capabilities.find((item) => item.id === task?.capabilityId);
      const outputClass = classes.find((item) => item.id === capability?.outputArtifact.outputConceptClassId);
      if ((outputClass?.slug ?? 'knowledge') !== slug) {
        setToast('خروجی این تسک فقط به سوکت دانش وصل می‌شود');
        return;
      }
    }

    const next: GraphConnection = {
      id: `conn-${crypto.randomUUID()}`,
      sourceType: source.type,
      sourceId: source.id,
      sourceSocketKey: source.type === 'instance' ? 'out' : 'artifact_out',
      targetTaskId: taskId,
      targetSocketSlug: slug,
    };
    const duplicate = connections.some(
      (item) =>
        item.sourceType === next.sourceType &&
        item.sourceId === next.sourceId &&
        item.targetTaskId === next.targetTaskId &&
        item.targetSocketSlug === next.targetSocketSlug,
    );
    if (duplicate) return;

    if (next.sourceType === 'task_output') {
      try {
        sortTasksTopologically(tasks, [...connections, next]);
      } catch (error) {
        if (error instanceof CycleDetectedError) {
          setToast('این اتصال یک دور در گراف می‌سازد');
          return;
        }
        throw error;
      }
    }
    onConnect(next);
  };

  const ordered = [...instances].sort((a, b) => {
    const aSlug = classes.find((item) => item.id === a.classId)?.slug ?? 'custom';
    const bSlug = classes.find((item) => item.id === b.classId)?.slug ?? 'custom';
    const byKind = KIND_ORDER.indexOf(aSlug) - KIND_ORDER.indexOf(bSlug);
    if (byKind !== 0) return byKind;
    return Number(Boolean(a.generatedByTaskId)) - Number(Boolean(b.generatedByTaskId));
  });

  const directIds = new Set(
    connections
      .filter((item) => item.targetTaskId === selectedTaskId && item.sourceType === 'instance')
      .map((item) => item.sourceId),
  );
  const lineageIds = new Set<string>();
  directIds.forEach((id) => {
    instances.find((item) => item.id === id)?.lineageIds.forEach((lineageId) => {
      if (!directIds.has(lineageId)) lineageIds.add(lineageId);
    });
  });

  const resolved = tasks.map((task, index) => positions[task.id] ?? { x: 16 + index * 252, y: 18 });
  const boardWidth = Math.max(820, ...resolved.map((point) => point.x + 280));
  const boardHeight = Math.max(640, ...resolved.map((point) => point.y + 420));

  const selectedTask = tasks.find((item) => item.id === selectedTaskId);
  const selectedInstance = instances.find((item) => item.id === selectedInstanceId);

  return (
    <div className="workspace">
      <div className="stage" ref={stageRef}>
        <aside className="entities">
          <div className="side-head">
            <h2>موجودیت‌ها</h2>
            <p>سیم را از سوکت رنگی تا سوکت هم‌رنگ تسک بکشید.</p>
          </div>
          {ordered.map((instance) => {
            const concept = classes.find((item) => item.id === instance.classId);
            if (!concept) return null;
            const previewKeys = PREVIEW_KEYS[concept.slug] ?? concept.attributes.slice(0, 2).map((attr) => attr.key);
            const preview = previewKeys
              .map((key) => concept.attributes.find((attr) => attr.key === key))
              .filter((attr): attr is NonNullable<typeof attr> => Boolean(attr));
            return (
              <article
                key={instance.id}
                className={[
                  'entity',
                  selectedInstanceId === instance.id ? 'selected' : '',
                  directIds.has(instance.id) ? 'linked' : '',
                ].join(' ')}
                style={{ ['--entity-color' as string]: concept.color }}
                onClick={() => onSelectInstance(instance.id)}
              >
                <header className="entity-head" style={{ background: concept.color }} dir="ltr">
                  <span>{kindLabel(concept.slug, concept.name)}</span>
                </header>
                <div className="entity-body">
                  <div className="entity-name">{instance.name}</div>
                  {instance.subtitle && <div className="entity-sub">{instance.subtitle}</div>}
                  {preview.map((attr) => {
                    const value = instance.attributeValues[attr.key] ?? attr.defaultValue;
                    return (
                      <div className="attr-line" key={attr.key}>
                        <span>{attr.label}</span>
                        <b data-testid={`value-${instance.id}-${attr.key}`}>
                          {typeof value === 'number' ? formatSmart(value) : String(value)}
                        </b>
                      </div>
                    );
                  })}
                  {instance.generatedByTaskId && <span className="tag">خروجی تسک</span>}
                  {lineageIds.has(instance.id) && <span className="tag lineage">پیشینه</span>}
                </div>
                <button
                  className="socket socket-source"
                  style={{ background: concept.color }}
                  data-anchor={`out:${instance.id}`}
                  data-testid={`socket-out-${instance.id}`}
                  title="کشیدن سیم"
                  onPointerDown={(event) => beginDrag(event, { type: 'instance', id: instance.id })}
                  onClick={(event) => event.stopPropagation()}
                />
              </article>
            );
          })}
        </aside>

        <div className="canvas-wrap">
          <div className="canvas-scroll">
            <div className="canvas-inner" style={{ width: boardWidth, height: boardHeight }} data-testid="canvas">
              {tasks.map((task, index) => {
                const capability = capabilities.find((item) => item.id === task.capabilityId) ?? capabilities[0];
                const evaluation = evaluations[task.id];
                if (!capability || !evaluation) return null;
                const point = positions[task.id] ?? { x: 16 + index * 252, y: 18 };
                const status = displayStatus(task, evaluation.isBlockedByUpstream);
                const metrics = shownMetrics(task, evaluation);
                return (
                  <article
                    key={task.id}
                    className={selectedTaskId === task.id ? 'task-card selected' : 'task-card'}
                    style={{ left: point.x, top: point.y }}
                    onClick={() => onSelectTask(task.id)}
                  >
                    <div
                      className="task-head"
                      onPointerDown={(event) => dragTask(event, task.id, point, setPositions)}
                    >
                      <div className="eyebrow">
                        <Cpu size={12} /> Task
                      </div>
                      <div className="task-title">{task.title}</div>
                    </div>
                    <div className="section-label">پارامترها</div>
                    <Slider
                      label="حجم کار"
                      min={6}
                      max={80}
                      step={1}
                      value={task.parameters.baseEffortHours}
                      disabled={task.status === 'completed'}
                      onChange={(value) => onParam(task.id, 'baseEffortHours', value)}
                    />
                    <Slider
                      label="پیچیدگی"
                      min={0.6}
                      max={2.4}
                      step={0.05}
                      value={task.parameters.taskComplexity}
                      disabled={task.status === 'completed'}
                      onChange={(value) => onParam(task.id, 'taskComplexity', value)}
                    />
                    <Slider
                      label="اولویت"
                      min={0.5}
                      max={2}
                      step={0.05}
                      value={task.parameters.priorityWeight}
                      disabled={task.status === 'completed'}
                      onChange={(value) => onParam(task.id, 'priorityWeight', value)}
                    />
                    <div className="section-label">معیارها</div>
                    <div className="metrics">
                      <div className="metric time">
                        <span className="metric-label"><Clock size={11} /> زمان</span>
                        <b data-testid={`hours-${task.id}`}>{formatSmart(metrics.computedHours)}</b>
                        <small>ساعت</small>
                      </div>
                      <div className="metric cost">
                        <span className="metric-label"><Coins size={11} /> هزینه</span>
                        <b>{formatSmart(metrics.computedCost)}</b>
                        <small>هزار تومان</small>
                      </div>
                      <div className="metric eff">
                        <span className="metric-label"><Zap size={11} /> بازدهی</span>
                        <b>{formatSmart(metrics.computedEfficiency)}</b>
                        <small>درصد</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`status ${status}`}
                      data-testid={`status-${task.id}`}
                      disabled={status === 'locked' || status === 'completed'}
                      title={statusTitle(status)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (status === 'ready') onStart(task.id);
                        if (status === 'in_progress') onComplete(task.id);
                      }}
                    >
                      {status === 'completed' && <Check size={15} />}
                      {status === 'locked' && <Lock size={14} />}
                      {status === 'ready' && <Play size={13} />}
                      {STATUS_LABEL[status]}
                    </button>
                    <div className="socket-col">
                      {SOCKETS.map((slug) => {
                        const concept = classes.find((item) => item.slug === slug);
                        return (
                          <button
                            key={slug}
                            className="socket"
                            style={{ background: concept?.color ?? '#64748b' }}
                            data-anchor={`in:${task.id}:${slug}`}
                            data-drop-socket="1"
                            data-task-id={task.id}
                            data-slug={slug}
                            data-testid={`socket-in-${task.id}-${slug}`}
                            title={concept?.name ?? slug}
                            onClick={(event) => event.stopPropagation()}
                          />
                        );
                      })}
                    </div>
                    <button
                      className="socket socket-out"
                      style={{ background: task.status === 'completed' ? '#22c55e' : '#64748b' }}
                      data-anchor={`taskout:${task.id}`}
                      title="خروجی تسک"
                      onPointerDown={(event) => beginDrag(event, { type: 'task_output', id: task.id })}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </article>
                );
              })}
            </div>
          </div>
          <div className="legend">
            {classes.map((concept) => (
              <span key={concept.id}>
                <i style={{ background: concept.color }} />
                {concept.name}
              </span>
            ))}
          </div>
        </div>

        <svg className="wires" data-testid="wires">
          {connections.map((conn) => {
            const fromKey = conn.sourceType === 'instance' ? `out:${conn.sourceId}` : `taskout:${conn.sourceId}`;
            const toKey = `in:${conn.targetTaskId}:${conn.targetSocketSlug}`;
            const from = anchors[fromKey];
            const to = anchors[toKey];
            if (!from || !to) return null;
            const color = wireColor(conn, instances, classes);
            const d = curve(from, to);
            return (
              <path
                key={conn.id}
                className={selectedWireId === conn.id ? 'wire selected' : 'wire'}
                d={d}
                stroke={color}
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
                opacity={0.95}
              />
            );
          })}
          {draft && anchors[draft.type === 'instance' ? `out:${draft.id}` : `taskout:${draft.id}`] && (
            <path
              d={curve(anchors[draft.type === 'instance' ? `out:${draft.id}` : `taskout:${draft.id}`], draft)}
              stroke="#94a3b8"
              strokeWidth={2}
              fill="none"
              strokeDasharray="5 4"
            />
          )}
        </svg>
      </div>

      <InheritanceInspector
        classes={classes}
        instances={instances}
        tasks={tasks}
        connections={connections}
        selectedTask={selectedTask}
        selectedEvaluation={selectedTask ? evaluations[selectedTask.id] : undefined}
        selectedCapability={capabilities.find((item) => item.id === selectedTask?.capabilityId)}
        selectedInstance={selectedInstance}
        selectedWireId={selectedWireId}
        onSelectWire={setSelectedWireId}
        onDisconnect={(id) => {
          onDisconnect(id);
          setSelectedWireId(null);
        }}
        onUpdateInstance={onUpdateInstance}
      />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="param-row" onClick={(event) => event.stopPropagation()}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="param-value">{formatSmart(value)}</span>
    </label>
  );
}

function dragTask(
  event: ReactPointerEvent,
  taskId: string,
  origin: Point,
  setPositions: Dispatch<SetStateAction<Record<string, Point>>>,
) {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement).closest('button, input, a')) return;
  event.stopPropagation();
  const startX = event.clientX;
  const startY = event.clientY;
  const host = event.currentTarget as HTMLElement;
  host.setPointerCapture(event.pointerId);
  const move = (ev: PointerEvent) => {
    setPositions((prev) => ({
      ...prev,
      [taskId]: {
        x: Math.max(12, origin.x + ev.clientX - startX),
        y: Math.max(12, origin.y + ev.clientY - startY),
      },
    }));
  };
  const up = () => {
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerup', up);
  };
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up);
}

function wireColor(conn: GraphConnection, instances: ConceptInstance[], classes: ConceptClass[]) {
  if (conn.sourceType === 'task_output') return '#38bdf8';
  const instance = instances.find((item) => item.id === conn.sourceId);
  return classes.find((item) => item.id === instance?.classId)?.color ?? '#94a3b8';
}

function curve(from: Point, to: Point) {
  const distance = Math.abs(to.x - from.x);
  const handle = Math.min(140, distance * 0.42);
  const direction = to.x >= from.x ? 1 : -1;
  return `M ${from.x} ${from.y} C ${from.x + handle * direction} ${from.y}, ${to.x - handle * direction} ${to.y}, ${to.x} ${to.y}`;
}

function statusTitle(status: string) {
  if (status === 'in_progress') return 'کلیک برای تکمیل. بودجه، تجربه و خروجی تسک به‌روز می‌شود';
  if (status === 'ready') return 'کلیک برای شروع';
  if (status === 'locked') return 'منتظر تمام شدن تسک قبلی';
  return 'انجام شده';
}

function useAnchors(signature: string) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<Record<string, Point>>({});

  const measure = useCallback(() => {
    const root = stageRef.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const next: Record<string, Point> = {};
    root.querySelectorAll<HTMLElement>('[data-anchor]').forEach((element) => {
      const id = element.dataset.anchor;
      if (!id) return;
      const rect = element.getBoundingClientRect();
      next[id] = {
        x: rect.left - box.left + rect.width / 2,
        y: rect.top - box.top + rect.height / 2,
      };
    });
    setAnchors((prev) => {
      const keys = Object.keys(next);
      const same =
        keys.length === Object.keys(prev).length &&
        keys.every((key) => prev[key] && prev[key].x === next[key].x && prev[key].y === next[key].y);
      return same ? prev : next;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, signature]);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    root.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(() => measure()).catch(() => undefined);
    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return { stageRef, anchors };
}
