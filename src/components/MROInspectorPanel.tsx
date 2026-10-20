import React from 'react';
import {
  Activity,
  ArrowDown,
  Calculator,
  CheckCircle2,
  GitBranch,
  Layers,
  Link2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  GraphConnection,
  TaskEvaluationResult,
  TaskNode,
} from '../engine/types';

interface MROInspectorPanelProps {
  selectedTask?: TaskNode;
  selectedTaskEvaluation?: TaskEvaluationResult;
  selectedTaskCapability?: CapabilityFormula;
  selectedInstance?: ConceptInstance;
  conceptClasses: ConceptClass[];
  instances: ConceptInstance[];
  connections: GraphConnection[];
  onDisconnectEdge: (connectionId: string) => void;
  onQuickConnectInstance: (instanceId: string, targetTaskId: string, targetSlug: string) => void;
  onUpdateInstanceAttribute: (instanceId: string, attrKey: string, newValue: number) => void;
}

export const MROInspectorPanel: React.FC<MROInspectorPanelProps> = ({
  selectedTask,
  selectedTaskEvaluation,
  selectedTaskCapability,
  selectedInstance,
  conceptClasses,
  instances,
  connections,
  onDisconnectEdge,
  onQuickConnectInstance,
  onUpdateInstanceAttribute,
}) => {
  if (selectedInstance && !selectedTask) {
    const cls = conceptClasses.find((c) => c.id === selectedInstance.classId);
    const lineageObjs = selectedInstance.lineageIds
      .map((id) => instances.find((i) => i.id === id))
      .filter((x): x is ConceptInstance => Boolean(x));

    return (
      <div className="h-full overflow-y-auto p-4 space-y-4 bg-[#12151e] border-r border-slate-800/90 text-xs" dir="rtl">
        <div className="p-3 rounded-xl bg-[#181c28] border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400">بازرس شیء (Instance Inspector)</span>
            <span
              style={{
                backgroundColor: `${cls?.color ?? '#38bdf8'}22`,
                color: cls?.color ?? '#38bdf8',
              }}
              className="px-2 py-0.5 rounded font-mono text-[10px]"
            >
              class:{cls?.slug}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">{selectedInstance.name}</h3>
          {selectedInstance.subtitle && (
            <p className="text-[11px] text-slate-400 mt-1">{selectedInstance.subtitle}</p>
          )}
        </div>

        {/* Live Editable Attributes of Instance */}
        <div className="p-3 rounded-xl bg-[#181c28] border border-slate-800 space-y-2.5">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>ویژگی‌های به ارث‌برده از «{cls?.name}» (قابل تغییر زنده):</span>
          </div>
          {cls?.attributes.map((attr) => {
            const val =
              selectedInstance.attributeValues[attr.key] !== undefined
                ? selectedInstance.attributeValues[attr.key]
                : attr.defaultValue;
            return (
              <div
                key={attr.key}
                className="p-2 rounded-lg bg-[#12151e] border border-slate-800/80 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">{attr.label}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {cls.slug}.{attr.key}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    value={Number(val)}
                    onChange={(e) =>
                      onUpdateInstanceAttribute(
                        selectedInstance.id,
                        attr.key,
                        Number(e.target.value),
                      )
                    }
                    className="w-full px-2.5 py-1 rounded bg-[#1b202e] border border-slate-700 text-emerald-300 font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                  {attr.unit && (
                    <span className="text-[10px] text-slate-400 shrink-0">{attr.unit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lineage List */}
        <div className="p-3 rounded-xl bg-[#181c28] border border-slate-800 space-y-2">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span>پیشینهٔ متصل (Lineage Graph):</span>
          </div>
          {lineageObjs.length === 0 ? (
            <p className="text-slate-500 text-[11px]">
              این نمونه پیشینهٔ متصل دیگری ندارد.
            </p>
          ) : (
            <div className="space-y-1.5">
              {lineageObjs.map((lin) => (
                <div
                  key={lin.id}
                  className="p-2 rounded-lg bg-purple-950/20 border border-purple-500/30 flex items-center justify-between"
                >
                  <span className="text-purple-200 font-medium">{lin.name}</span>
                  <span className="text-[10px] text-purple-400">انتقال خودکار به تسک</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedTask || !selectedTaskEvaluation || !selectedTaskCapability) {
    return (
      <div className="h-full p-5 bg-[#12151e] border-r border-slate-800 flex items-center justify-center text-center text-slate-400 text-xs">
        روی یکی از نودهای تسک یا نمونه‌ها در گراف کلیک کنید تا زنجیرهٔ ارث‌بری چندگانه (MRO) و فرمول‌ها را ببینید.
      </div>
    );
  }

  const taskConnections = connections.filter((c) => c.targetTaskId === selectedTask.id);

  return (
    <div
      className="h-full overflow-y-auto p-3.5 space-y-3.5 bg-[#12151e] border-r border-slate-800/90 text-xs"
      dir="rtl"
    >
      {/* Task Header Summary */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-teal-950/50 to-[#181c28] border border-teal-500/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-teal-300 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            بازرس ارث‌بری چندگانه تسک (Python C3 MRO)
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
            {selectedTaskCapability.codeName}
          </span>
        </div>
        <h3 className="text-sm font-bold text-white">{selectedTask.title}</h3>
        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
          {selectedTask.description}
        </p>
      </div>

      {/* Section 1: Python C3 MRO Linearization Chain */}
      <div className="p-3 rounded-xl bg-[#171b26] border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span>زنجیره ارث‌بری خطی‌شده (`__mro__`):</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            C3 Linearization
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          ترتیب دقیق به ارث بردن ویژگی‌ها از خود تسک، نمونه‌های متصل، پیشینهٔ آن‌ها و قالب‌های مفهوم:
        </p>

        <div className="space-y-1 pt-1">
          {selectedTaskEvaluation.mroChain.map((entry, idx) => (
            <React.Fragment key={`${entry.nodeId}-${idx}`}>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#11141d] border border-slate-800/90">
                <div className="flex items-center gap-2 truncate">
                  <span
                    style={{ backgroundColor: entry.color }}
                    className="w-2 h-2 rounded-full shrink-0"
                  />
                  <div className="truncate">
                    <div className="text-[11px] font-semibold text-slate-200 truncate">
                      {idx + 1}. {entry.name}
                    </div>
                    {entry.viaInstanceName && (
                      <div className="text-[9px] text-purple-300">
                        ↳ آمده از پیشینهٔ متصلِ «{entry.viaInstanceName}»
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono shrink-0">
                  {entry.nodeType === 'task_local' && 'پارامتر تسک'}
                  {entry.nodeType === 'direct_instance' && `شیء:${entry.conceptSlug}`}
                  {entry.nodeType === 'lineage_instance' && `پیشینه:${entry.conceptSlug}`}
                  {entry.nodeType === 'concept_class' && `کلاس:${entry.conceptSlug}`}
                </span>
              </div>
              {idx < selectedTaskEvaluation.mroChain.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown className="w-3 h-3 text-slate-600" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Section 2: Attribute Resolution & Conflict Aggregation Table */}
      <div className="p-3 rounded-xl bg-[#171b26] border border-slate-800 space-y-2">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>جدول ترکیب ویژگی‌ها و حل تعارض (Modifier Stack):</span>
        </div>

        <div className="space-y-1.5">
          {Object.values(selectedTaskEvaluation.resolvedAttributes).map((attr) => (
            <div
              key={attr.key}
              className={`p-2 rounded-lg border ${
                attr.hadConflict
                  ? 'bg-amber-950/15 border-amber-500/35'
                  : 'bg-[#11141d] border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-[11px]">
                  {attr.label}{' '}
                  <span className="font-mono text-[10px] text-slate-500">({attr.key})</span>
                </span>
                <span className="font-mono text-xs font-bold text-emerald-300">
                  {String(attr.finalValue)}{' '}
                  {attr.unit && <span className="text-[9px] text-slate-400">{attr.unit}</span>}
                </span>
              </div>

              {attr.hadConflict && (
                <div className="mt-1 pt-1 border-t border-amber-500/20 text-[10px] text-amber-200/90 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>تعارض بین {attr.sources.length} مفهوم ارث‌برده شده:</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      استراتژی:{' '}
                      {attr.strategyUsed === 'multiply'
                        ? 'ضرب (Multiply)'
                        : attr.strategyUsed === 'sum'
                        ? 'جمع (Sum)'
                        : attr.strategyUsed === 'mro_first'
                        ? 'اولویت MRO'
                        : attr.strategyUsed}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {attr.sources.map((src) => (
                      <span
                        key={src.sourceId}
                        className="px-1.5 py-0.5 rounded bg-black/30 text-slate-300 font-mono text-[9px]"
                      >
                        {src.sourceName}: {String(src.rawValue)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Formula Breakdown (Live Math Evaluation) */}
      <div className="p-3 rounded-xl bg-[#171b26] border border-slate-800 space-y-2.5">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-sky-400" />
          <span>محاسبه زنده فرمول مدیر روی این تسک:</span>
        </div>

        <div className="p-2 rounded-lg bg-[#11141d] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">فرمول زمان (Time Formula):</span>
            <span className="font-mono font-bold text-sky-300">
              = {selectedTaskEvaluation.computedHours} ساعت
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-300 dir-ltr text-left bg-black/30 p-1.5 rounded overflow-x-auto">
            {selectedTaskEvaluation.formulaBreakdown.timeFormulaRaw}
          </div>
          <div className="font-mono text-[10px] text-emerald-400/90 dir-ltr text-left">
            ↳ {selectedTaskEvaluation.formulaBreakdown.timeFormulaSubstituted}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#11141d] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">فرمول هزینه (Cost Formula):</span>
            <span className="font-mono font-bold text-amber-300">
              = {selectedTaskEvaluation.computedCost.toLocaleString('fa-IR')} هزار تومان
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-300 dir-ltr text-left bg-black/30 p-1.5 rounded overflow-x-auto">
            {selectedTaskEvaluation.formulaBreakdown.costFormulaRaw}
          </div>
          <div className="font-mono text-[10px] text-amber-400/90 dir-ltr text-left">
            ↳ {selectedTaskEvaluation.formulaBreakdown.costFormulaSubstituted}
          </div>
        </div>

        {/* Mutations that will happen on Done */}
        <div className="pt-1 space-y-1">
          <div className="text-[10px] text-slate-400 font-semibold">
            تغییرات وضعیت موجودیت‌ها هنگام تکمیل (Done):
          </div>
          {selectedTaskCapability.mutations.map((m) => (
            <div
              key={m.id}
              className="px-2 py-1 rounded bg-emerald-950/20 border border-emerald-500/25 flex items-center justify-between text-[10px]"
            >
              <span className="text-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                {m.label}
              </span>
              <span className="font-mono text-emerald-300 dir-ltr">
                {m.targetConceptSlug}.{m.targetAttributeKey} ({m.operation})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Active Wire Connections & Quick Connect */}
      <div className="p-3 rounded-xl bg-[#171b26] border border-slate-800 space-y-2">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-teal-400" />
          <span>سیم‌کشی‌های ورودی این تسک ({taskConnections.length}):</span>
        </div>

        <div className="space-y-1">
          {taskConnections.map((conn) => {
            const inst =
              conn.sourceType === 'instance'
                ? instances.find((i) => i.id === conn.sourceId)
                : undefined;
            return (
              <div
                key={conn.id}
                className="flex items-center justify-between px-2 py-1 rounded bg-[#11141d] border border-slate-800"
              >
                <span className="text-[11px] text-slate-300 truncate">
                  {conn.sourceType === 'instance'
                    ? `${inst?.name ?? conn.sourceId} ← سوکت ${conn.targetSocketSlug}`
                    : `خروجی تسک قبلی ← سوکت ${conn.targetSocketSlug}`}
                </span>
                <button
                  onClick={() => onDisconnectEdge(conn.id)}
                  className="text-rose-400 hover:text-rose-300 p-1"
                  title="قطع اتصال"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-800">
          <label className="block text-[10px] text-slate-400 mb-1">
            اتصال سریع یک نمونه جدید به این تسک:
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              const instId = e.target.value;
              if (!instId) return;
              const inst = instances.find((i) => i.id === instId);
              const cls = conceptClasses.find((c) => c.id === inst?.classId);
              if (inst && cls) {
                onQuickConnectInstance(inst.id, selectedTask.id, cls.slug);
              }
              e.target.value = '';
            }}
            className="w-full px-2 py-1.5 rounded bg-[#11141d] border border-slate-700 text-slate-200 text-xs"
          >
            <option value="">+ انتخاب نمونه برای اتصال به «{selectedTask.title}»...</option>
            {instances.map((inst) => {
              const cls = conceptClasses.find((c) => c.id === inst.classId);
              return (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({cls?.name})
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
};
