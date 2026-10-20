import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  GitMerge,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CapabilityFormula,
  ConceptClass,
  TaskEvaluationResult,
  TaskNode,
} from '../../engine/types';

export interface GeometryTaskNodeData extends Record<string, unknown> {
  task: TaskNode;
  capability: CapabilityFormula;
  evaluation: TaskEvaluationResult;
  conceptClasses: ConceptClass[];
  isSelected: boolean;
  onSelectTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onResetTask: (taskId: string) => void;
  onUpdateTaskParam: (taskId: string, key: 'baseEffortHours' | 'taskComplexity', value: number) => void;
}

export const GeometryTaskNode: React.FC<{ data: GeometryTaskNodeData }> = ({ data }) => {
  const {
    task,
    capability,
    evaluation,
    conceptClasses,
    isSelected,
    onSelectTask,
    onStartTask,
    onCompleteTask,
    onResetTask,
    onUpdateTaskParam,
  } = data;

  const isLocked = evaluation.isBlockedByUpstream;
  const effectiveStatus =
    task.status === 'completed'
      ? 'completed'
      : task.status === 'in_progress'
      ? 'in_progress'
      : isLocked
      ? 'locked'
      : 'ready';

  const headerGradient =
    effectiveStatus === 'completed'
      ? 'linear-gradient(135deg, #059669, #047857)'
      : effectiveStatus === 'in_progress'
      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
      : effectiveStatus === 'locked'
      ? 'linear-gradient(135deg, #475569, #334155)'
      : 'linear-gradient(135deg, #0d9488, #0f766e)';

  const socketSlugs = Array.from(
    new Set([...capability.requiredConceptSlugs, 'department']),
  );

  return (
    <div
      onClick={() => onSelectTask(task.id)}
      style={{
        borderColor: isSelected ? '#2dd4bf' : 'rgba(148, 163, 184, 0.25)',
        boxShadow: isSelected
          ? '0 0 0 2px rgba(45, 212, 191, 0.35), 0 20px 45px -12px rgba(0,0,0,0.85)'
          : '0 16px 36px -10px rgba(0,0,0,0.75)',
      }}
      className="w-[345px] rounded-xl bg-[#181b24]/95 backdrop-blur-md border transition-all duration-150 cursor-pointer select-none overflow-visible"
      dir="rtl"
    >
      {/* Geometry Nodes Header */}
      <div
        style={{ background: headerGradient }}
        className="px-3.5 py-2.5 rounded-t-[11px] flex items-center justify-between text-white"
      >
        <div className="flex items-center gap-2 truncate">
          <Cpu className="w-4 h-4 shrink-0 text-teal-200" />
          <span className="text-xs font-bold truncate">{task.title}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 font-medium shrink-0">
          {effectiveStatus === 'completed' && 'تکمیل‌شده (Done)'}
          {effectiveStatus === 'in_progress' && 'در حال اجرا'}
          {effectiveStatus === 'ready' && 'آماده اجرا'}
          {effectiveStatus === 'locked' && 'قفل (منتظر پیش‌نیاز)'}
        </span>
      </div>

      {/* Capability Function Subtitle */}
      <div className="px-3.5 py-1.5 bg-[#12141c] border-b border-slate-800 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 truncate">
          کارایی/فرمول:{' '}
          <strong className="text-teal-300 font-medium">{capability.name}</strong>
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          MRO:{evaluation.mroChain.length}
        </span>
      </div>

      {/* Input Sockets Section (Left Handles) */}
      <div className="py-2 px-3 space-y-1.5 border-b border-slate-800/80">
        <div className="text-[10px] text-slate-400 font-medium mb-1">
          سوکت‌های ورودی (ارث‌بری چندگانه مفاهیم):
        </div>
        {socketSlugs.map((slug) => {
          const cls = conceptClasses.find((c) => c.slug === slug);
          const socketColor = cls?.color ?? '#94a3b8';
          const connectedHere = evaluation.connectedInstances.filter(
            (ci) => ci.conceptClass.slug === slug,
          );

          return (
            <div
              key={slug}
              className="relative flex items-center justify-between bg-[#1f2430] px-2.5 py-1.5 rounded-lg border border-slate-800/90"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`in-${slug}`}
                style={{
                  background: socketColor,
                  width: 13,
                  height: 13,
                  border: '2px solid #0d0f14',
                  left: -18,
                }}
              />
              <div className="flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: socketColor }}
                  className="w-2 h-2 rounded-full shrink-0"
                />
                <span className="text-[11px] font-semibold text-slate-200">
                  {cls?.name ?? slug}
                </span>
              </div>
              <div className="flex flex-wrap justify-end gap-1 max-w-[165px]">
                {connectedHere.length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic">بدون اتصال</span>
                ) : (
                  connectedHere.map((ci) => (
                    <span
                      key={ci.instance.id}
                      style={{
                        borderColor: `${socketColor}55`,
                        backgroundColor: `${socketColor}18`,
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border text-slate-100 truncate max-w-[155px]"
                      title={
                        ci.viaLineageFrom
                          ? `آمده از پیشینهٔ ${ci.viaLineageFrom.name}`
                          : ci.viaTaskOutputFrom
                          ? `خروجی تسک ${ci.viaTaskOutputFrom.title}`
                          : ci.instance.name
                      }
                    >
                      {ci.viaLineageFrom ? `↳ ${ci.instance.name}` : ci.instance.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Local Parameters (Sliders/Inputs like Blender Node Controls) */}
      <div
        className="p-3 space-y-2 border-b border-slate-800/80 bg-[#151821]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">حجم کار پایه تسک (ساعت):</span>
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={2}
              max={80}
              step={2}
              value={task.parameters.baseEffortHours}
              onChange={(e) =>
                onUpdateTaskParam(task.id, 'baseEffortHours', Number(e.target.value))
              }
              className="w-20 accent-teal-400 cursor-pointer"
            />
            <span className="font-mono text-xs text-teal-300 font-bold w-8 text-left">
              {task.parameters.baseEffortHours}h
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">ضریب پیچیدگی داخلی تسک:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={task.parameters.taskComplexity}
              onChange={(e) =>
                onUpdateTaskParam(task.id, 'taskComplexity', Number(e.target.value))
              }
              className="w-20 accent-teal-400 cursor-pointer"
            />
            <span className="font-mono text-xs text-teal-300 font-bold w-8 text-left">
              {task.parameters.taskComplexity}x
            </span>
          </div>
        </div>
      </div>

      {/* Live Evaluated Metrics (Computed via Manager Formula + MRO) */}
      <div className="p-3 grid grid-cols-3 gap-2 bg-[#12151e] border-b border-slate-800/80">
        <div className="bg-[#1b202c] p-2 rounded-lg border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>زمان کل</span>
          </div>
          <div className="font-mono text-xs font-bold text-sky-300">
            {evaluation.computedHours} ساعت
          </div>
        </div>

        <div className="bg-[#1b202c] p-2 rounded-lg border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Coins className="w-3 h-3 text-amber-400" />
            <span>هزینه کل</span>
          </div>
          <div className="font-mono text-xs font-bold text-amber-300">
            {evaluation.computedCost.toLocaleString('fa-IR')}
            <span className="text-[9px] text-slate-400 mr-0.5">هزار</span>
          </div>
        </div>

        <div className="bg-[#1b202c] p-2 rounded-lg border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>بازدهی</span>
          </div>
          <div className="font-mono text-xs font-bold text-emerald-300">
            {evaluation.computedEfficiency}%
          </div>
        </div>
      </div>

      {/* Real-Time Lifecycle Execution Controls (Start -> Done) */}
      <div
        className="px-3 py-2 bg-[#161a24] border-b border-slate-800/80 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {effectiveStatus === 'locked' && (
          <div className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800/70 border border-slate-700/70 text-slate-400 text-[11px] flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>منتظر تکمیل (Done) تسکِ پیش‌نیاز و تولید خروجی آن</span>
          </div>
        )}

        {effectiveStatus === 'ready' && (
          <button
            onClick={() => onStartTask(task.id)}
            className="w-full py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-sky-900/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>شروع اجرای تسک (Start)</span>
          </button>
        )}

        {effectiveStatus === 'in_progress' && (
          <button
            onClick={() => onCompleteTask(task.id)}
            className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-900/40 animate-pulse"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تکمیل تسک (Done) + اعمال تغییرات و آزادسازی خروجی</span>
          </button>
        )}

        {effectiveStatus === 'completed' && (
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              اجرا شد و وضعیت موجودیت‌ها آپدیت شد
            </span>
            <button
              onClick={() => onResetTask(task.id)}
              title="بازگردانی وضعیت تسک به حالت آماده"
              className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              بازنشانی
            </button>
          </div>
        )}
      </div>

      {/* Output Artifact Socket (Right Handle -> Feeds into Next Task!) */}
      <div className="px-3.5 py-2 bg-[#10131a] rounded-b-[11px] flex items-center justify-between relative">
        <div className="flex items-center gap-1.5 truncate">
          <GitMerge className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] text-slate-300 truncate">
            {capability.outputArtifact.enabled
              ? capability.outputArtifact.outputNameTemplate.replace('{{taskTitle}}', task.title)
              : 'خروجی تسک'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 shrink-0 flex items-center gap-1">
          {task.status === 'completed' ? (
            <>
              <Sparkles className="w-3 h-3" /> فعال
            </>
          ) : (
            'قفل تا Done'
          )}
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="artifact_out"
          style={{
            background: task.status === 'completed' ? '#10b981' : '#64748b',
            width: 14,
            height: 14,
            border: '2px solid #0d0f14',
            right: -7,
          }}
        />
      </div>
    </div>
  );
};
