import { GitBranch } from 'lucide-react';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  GraphConnection,
  TaskEvaluationResult,
  TaskNode,
} from '../engine/types';
import { formatSmart, shownMetrics } from '../ui/display';

interface InheritanceInspectorProps {
  classes: ConceptClass[];
  instances: ConceptInstance[];
  tasks: TaskNode[];
  connections: GraphConnection[];
  selectedTask?: TaskNode;
  selectedEvaluation?: TaskEvaluationResult;
  selectedCapability?: CapabilityFormula;
  selectedInstance?: ConceptInstance;
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
  onDisconnect: (id: string) => void;
  onUpdateInstance: (instanceId: string, key: string, value: number) => void;
}

const STRATEGY_LABEL: Record<string, string> = {
  multiply: 'ضرب',
  sum: 'جمع',
  max: 'بیشینه',
  min: 'کمینه',
  mro_first: 'اولویت زنجیره',
};

export function InheritanceInspector(props: InheritanceInspectorProps) {
  const {
    classes,
    instances,
    tasks,
    connections,
    selectedTask,
    selectedEvaluation,
    selectedCapability,
    selectedInstance,
    selectedWireId,
    onSelectWire,
    onDisconnect,
    onUpdateInstance,
  } = props;

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <h2>Inspector</h2>
      </div>
      <div className="inspector-scroll">
        <div className="inspector-kicker">
          <GitBranch size={14} />
          سلسله مراتب وراثت
        </div>
        {selectedTask && selectedEvaluation && selectedCapability ? (
          <TaskInheritance
            task={selectedTask}
            evaluation={selectedEvaluation}
            capability={selectedCapability}
            classes={classes}
            instances={instances}
            tasks={tasks}
            connections={connections}
            selectedWireId={selectedWireId}
            onSelectWire={onSelectWire}
            onDisconnect={onDisconnect}
          />
        ) : selectedInstance ? (
          <InstanceInheritance
            instance={selectedInstance}
            classes={classes}
            instances={instances}
            onUpdateInstance={onUpdateInstance}
          />
        ) : (
          <p className="hint">یک تسک یا موجودیت را انتخاب کنید.</p>
        )}
      </div>
    </aside>
  );
}

function TaskInheritance({
  task,
  evaluation,
  capability,
  classes,
  instances,
  tasks,
  connections,
  selectedWireId,
  onSelectWire,
  onDisconnect,
}: {
  task: TaskNode;
  evaluation: TaskEvaluationResult;
  capability: CapabilityFormula;
  classes: ConceptClass[];
  instances: ConceptInstance[];
  tasks: TaskNode[];
  connections: GraphConnection[];
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
  onDisconnect: (id: string) => void;
}) {
  const metrics = shownMetrics(task, evaluation);
  const entries = evaluation.mroChain.filter((entry) => entry.nodeType !== 'concept_class');
  const conflicts = Object.values(evaluation.resolvedAttributes).filter((attr) => attr.hadConflict);
  const incoming = connections.filter((conn) => conn.targetTaskId === task.id);

  return (
    <div data-testid="mro">
      <p className="hint">{task.title}</p>
      {entries.map((entry, index) => {
        const instance = instances.find((item) => item.id === entry.nodeId);
        const viaTask = tasks.find((item) => item.id === instance?.generatedByTaskId);
        let subtitle = 'پارامترهای خودِ تسک';
        if (entry.nodeType === 'direct_instance') subtitle = `اتصال مستقیم · ${entry.conceptSlug}`;
        if (entry.nodeType === 'lineage_instance') {
          subtitle = `پیشینه از طریق ${entry.viaInstanceName ?? 'نمونهٔ والد'} · ${entry.conceptSlug}`;
        }
        if (viaTask) subtitle = `خروجی «${viaTask.title}» · ${entry.conceptSlug}`;

        return (
          <div key={`${entry.nodeId}-${index}`}>
            <article className="mro-card">
              <div className="mro-kicker">{index + 1}</div>
              <div className="mro-name">{entry.name}</div>
              <div className="mro-sub">{subtitle}</div>
            </article>
            {index < entries.length - 1 && <div className="mro-arrow">↓</div>}
          </div>
        );
      })}

      {conflicts.slice(0, 3).map((attr) => (
        <div className="conflict" key={attr.key}>
          <b>
            {attr.label} = {typeof attr.finalValue === 'number' ? formatSmart(attr.finalValue) : String(attr.finalValue)}
          </b>
          <div className="sources">
            {STRATEGY_LABEL[attr.strategyUsed]} از {attr.sources.length} منبع
            {' · '}
            {attr.sources
              .map((source) => `${source.sourceName}: ${typeof source.rawValue === 'number' ? formatSmart(source.rawValue) : source.rawValue}`)
              .join(' · ')}
          </div>
        </div>
      ))}

      <details className="formula">
        <summary>فرمول {capability.name}</summary>
        <code>{evaluation.formulaBreakdown.timeFormulaRaw}</code>
        <code>{evaluation.formulaBreakdown.timeFormulaSubstituted}</code>
      </details>

      <div className="wire-list">
        <div className="section-label">سیم‌های این تسک</div>
        {incoming.map((conn) => {
          const sourceName =
            conn.sourceType === 'instance'
              ? instances.find((item) => item.id === conn.sourceId)?.name ?? conn.sourceId
              : tasks.find((item) => item.id === conn.sourceId)?.title ?? 'تسک قبلی';
          const slug = classes.find((item) => item.slug === conn.targetSocketSlug)?.name ?? conn.targetSocketSlug;
          return (
            <div key={conn.id} className={selectedWireId === conn.id ? 'wire-row selected' : 'wire-row'}>
              <button className="text-btn" style={{ color: 'inherit' }} onClick={() => onSelectWire(conn.id)}>
                {sourceName} ← {slug}
              </button>
              <button onClick={() => onDisconnect(conn.id)}>حذف</button>
            </div>
          );
        })}
      </div>

      <div className="inspector-foot">
        <div className="metric time">
          <span className="metric-label">زمان</span>
          <b>{formatSmart(metrics.computedHours)}</b>
        </div>
        <div className="metric cost">
          <span className="metric-label">هزینه</span>
          <b>{formatSmart(metrics.computedCost)}</b>
        </div>
        <div className="metric eff">
          <span className="metric-label">بازدهی</span>
          <b>{formatSmart(metrics.computedEfficiency)}</b>
        </div>
      </div>
    </div>
  );
}

function InstanceInheritance({
  instance,
  classes,
  instances,
  onUpdateInstance,
}: {
  instance: ConceptInstance;
  classes: ConceptClass[];
  instances: ConceptInstance[];
  onUpdateInstance: (instanceId: string, key: string, value: number) => void;
}) {
  const concept = classes.find((item) => item.id === instance.classId);
  const lineage = instance.lineageIds
    .map((id) => instances.find((item) => item.id === id))
    .filter((item): item is ConceptInstance => Boolean(item));

  const cards = [
    { name: instance.name, sub: 'همین نمونه' },
    ...lineage.map((item) => ({ name: item.name, sub: 'پیشینهٔ متصل' })),
    { name: concept?.name ?? 'مفهوم', sub: 'قالبی که از آن ارث برده' },
  ];

  return (
    <div>
      <p className="hint">{instance.subtitle}</p>
      {cards.map((card, index) => (
        <div key={`${card.name}-${index}`}>
          <article className="mro-card">
            <div className="mro-kicker">{index + 1}</div>
            <div className="mro-name">{card.name}</div>
            <div className="mro-sub">{card.sub}</div>
          </article>
          {index < cards.length - 1 && <div className="mro-arrow">↓</div>}
        </div>
      ))}
      <div className="section-label">مقدارهای قابل ویرایش</div>
      {concept?.attributes.map((attr) => {
        const value = instance.attributeValues[attr.key] ?? attr.defaultValue;
        return (
          <div className="editor" key={attr.key}>
            <label>
              {attr.label}
              {attr.unit ? ` (${attr.unit})` : ''}
            </label>
            <input
              type="number"
              step="0.05"
              value={Number(value)}
              onChange={(event) => onUpdateInstance(instance.id, attr.key, Number(event.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
