import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Coins,
  Grid,
  History,
  Lock,
  Play,
  Sparkles,
} from 'lucide-react';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  MutationExecutionLog,
  TaskEvaluationResult,
  TaskNode,
} from '../engine/types';

interface MultidimensionalMatrixViewProps {
  tasks: TaskNode[];
  evaluations: Record<string, TaskEvaluationResult>;
  conceptClasses: ConceptClass[];
  instances: ConceptInstance[];
  capabilities: CapabilityFormula[];
  mutationLogs: MutationExecutionLog[];
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export const MultidimensionalMatrixView: React.FC<MultidimensionalMatrixViewProps> = ({
  tasks,
  evaluations,
  conceptClasses,
  instances,
  capabilities,
  mutationLogs,
  onStartTask,
  onCompleteTask,
}) => {
  const [rowConceptSlug, setRowConceptSlug] = useState<string>('person');
  const [colConceptSlug, setColConceptSlug] = useState<string>('knowledge');

  const rowInstances = instances.filter((i) => {
    const cls = conceptClasses.find((c) => c.id === i.classId);
    return cls?.slug === rowConceptSlug;
  });

  const colInstances = instances.filter((i) => {
    const cls = conceptClasses.find((c) => c.id === i.classId);
    return cls?.slug === colConceptSlug;
  });

  const totalHours = Object.values(evaluations).reduce((acc, e) => acc + e.computedHours, 0);
  const totalCost = Object.values(evaluations).reduce((acc, e) => acc + e.computedCost, 0);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#0f1219] text-slate-100 space-y-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#161a25] border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">مجموع زمان محاسبه‌شده گراف</div>
              <div className="text-xl font-bold font-mono text-sky-300 mt-1">
                {totalHours} ساعت
              </div>
            </div>
            <Clock className="w-8 h-8 text-sky-400/40" />
          </div>

          <div className="p-4 rounded-2xl bg-[#161a25] border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">مجموع هزینه فرمول‌های مدیر</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                {totalCost.toLocaleString('fa-IR')} هزار تومان
              </div>
            </div>
            <Coins className="w-8 h-8 text-amber-400/40" />
          </div>

          <div className="p-4 rounded-2xl bg-[#161a25] border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">پیشرفت چرخه اجرای تسک‌ها</div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                {completedCount} از {tasks.length} تسک Done
              </div>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
          </div>

          <div className="p-4 rounded-2xl bg-[#161a25] border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">تغییرات وضعیت ثبت‌شده (Mutations)</div>
              <div className="text-xl font-bold font-mono text-purple-300 mt-1">
                {mutationLogs.length} رخداد
              </div>
            </div>
            <Activity className="w-8 h-8 text-purple-400/40" />
          </div>
        </div>

        {/* Multidimensional Pivot Matrix Controls */}
        <div className="p-5 rounded-2xl bg-[#161a25] border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-teal-400" />
                <span>ماتریس چندوجهی تقاطع مفاهیم (Multidimensional Concept Slice)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                هر خانه از ماتریس نشان می‌دهد کدام تسک‌ها به طور هم‌زمان از نمونهٔ سطر و نمونهٔ ستون (چه مستقیم و چه از طریق پیشینهٔ متصل) ارث برده‌اند.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">بُعد سطرها:</span>
                <select
                  value={rowConceptSlug}
                  onChange={(e) => setRowConceptSlug(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#10131c] border border-slate-700 text-white"
                >
                  {conceptClasses.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-600">×</span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">بُعد ستون‌ها:</span>
                <select
                  value={colConceptSlug}
                  onChange={(e) => setColConceptSlug(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#10131c] border border-slate-700 text-white"
                >
                  {conceptClasses.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pivot Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-3 bg-[#10131c] border border-slate-800 text-right text-slate-400 w-52">
                    سطر \ ستون
                  </th>
                  {colInstances.map((colInst) => (
                    <th
                      key={colInst.id}
                      className="p-3 bg-[#10131c] border border-slate-800 text-right text-slate-200 min-w-[220px]"
                    >
                      <div className="font-bold">{colInst.name}</div>
                      {colInst.generatedByTaskId && (
                        <span className="text-[10px] text-emerald-400 font-normal">
                          ★ خروجی تولیدشده در زنجیره تسک
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowInstances.map((rowInst) => (
                  <tr key={rowInst.id}>
                    <td className="p-3 bg-[#121621] border border-slate-800 font-bold text-slate-200 align-top">
                      <div>{rowInst.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {rowInst.subtitle}
                      </div>
                    </td>
                    {colInstances.map((colInst) => {
                      const intersectingTasks = tasks.filter((t) => {
                        const ev = evaluations[t.id];
                        if (!ev) return false;
                        const hasRow = ev.connectedInstances.some(
                          (ci) => ci.instance.id === rowInst.id,
                        );
                        const hasCol = ev.connectedInstances.some(
                          (ci) => ci.instance.id === colInst.id,
                        );
                        return hasRow && hasCol;
                      });

                      return (
                        <td
                          key={colInst.id}
                          className="p-2.5 bg-[#0f121b] border border-slate-800 align-top"
                        >
                          {intersectingTasks.length === 0 ? (
                            <span className="text-[11px] text-slate-600">—</span>
                          ) : (
                            <div className="space-y-2">
                              {intersectingTasks.map((t) => {
                                const ev = evaluations[t.id];
                                const cap = capabilities.find((c) => c.id === t.capabilityId);
                                const isBlocked = ev?.isBlockedByUpstream;
                                return (
                                  <div
                                    key={t.id}
                                    className="p-2.5 rounded-xl bg-[#171c29] border border-slate-700/80 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-white text-xs">
                                        {t.title}
                                      </span>
                                      <span className="font-mono text-[10px] text-teal-300">
                                        {ev?.computedHours}h |{' '}
                                        {ev?.computedCost.toLocaleString('fa-IR')}k
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      کارایی: {cap?.name}
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-[10px] text-slate-400">
                                        MRO: {ev?.mroChain.length} گره ارث‌بری
                                      </span>
                                      {t.status === 'completed' ? (
                                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Done
                                        </span>
                                      ) : isBlocked ? (
                                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                          <Lock className="w-3 h-3" /> منتظر خروجی قبلی
                                        </span>
                                      ) : t.status === 'in_progress' ? (
                                        <button
                                          onClick={() => onCompleteTask(t.id)}
                                          className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold"
                                        >
                                          تکمیل (Done)
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => onStartTask(t.id)}
                                          className="px-2 py-0.5 rounded bg-sky-600 text-white text-[10px] font-bold flex items-center gap-1"
                                        >
                                          <Play className="w-2.5 h-2.5" /> Start
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Object State Table & Mutation History Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live State of Concept Instances */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#161a25] border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>وضعیت زنده اشیاء سازمان (تغییریافته با اجرای تسک‌ها + خروجی‌های متولدشده)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {instances.map((inst) => {
                const cls = conceptClasses.find((c) => c.id === inst.classId);
                return (
                  <div
                    key={inst.id}
                    className="p-3 rounded-xl bg-[#11141d] border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{inst.name}</span>
                      <span
                        style={{ color: cls?.color }}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30"
                      >
                        {cls?.name}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {cls?.attributes.map((attr) => {
                        const val =
                          inst.attributeValues[attr.key] !== undefined
                            ? inst.attributeValues[attr.key]
                            : attr.defaultValue;
                        return (
                          <div
                            key={attr.key}
                            className="flex items-center justify-between text-[11px] bg-[#181c28] px-2 py-1 rounded"
                          >
                            <span className="text-slate-400">{attr.label}:</span>
                            <span className="font-mono text-emerald-300 font-bold">
                              {String(val)} {attr.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* State Mutation Execution Ledger */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#161a25] border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <span>دفتر کل تراکنش‌های تغییر وضعیت (State Mutation Log)</span>
            </h3>
            {mutationLogs.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#11141d] border border-slate-800 text-center text-xs text-slate-400">
                هنوز تسکی به وضعیت `Done` نرسیده است. تسک ۱ («تدوین سند معماری سایت») را `Start` و سپس `Done` کنید تا تغییرات بودجه پروژه، تجربه افراد و تولید خروجی دانش جدید را ببینید!
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {mutationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#11141d] border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">{log.description}</span>
                      <span className="font-mono text-[10px] text-slate-500">{log.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      در اثر تکمیل «<strong className="text-slate-200">{log.taskTitle}</strong>» روی شیء «
                      <strong className="text-sky-300">{log.instanceName}</strong>»
                    </div>
                    <div className="font-mono text-[11px] pt-1 flex items-center justify-between text-amber-300 dir-ltr">
                      <span>
                        {log.conceptSlug}.{log.attributeKey}
                      </span>
                      <span>
                        {String(log.previousValue)} → {String(log.newValue)} (
                        {log.delta >= 0 ? `+${log.delta}` : log.delta})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
