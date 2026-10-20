import React, { useState } from 'react';
import {
  Blocks,
  Calculator,
  Check,
  Code2,
  GitBranch,
  Layers,
  Plus,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  ConflictResolutionStrategy,
  TaskNode,
} from '../engine/types';

interface ManagerStudioPanelProps {
  conceptClasses: ConceptClass[];
  instances: ConceptInstance[];
  capabilities: CapabilityFormula[];
  tasks: TaskNode[];
  onCreateConceptClass: (newClass: ConceptClass) => void;
  onCreateInstance: (newInstance: ConceptInstance) => void;
  onUpdateCapabilityFormula: (updated: CapabilityFormula) => void;
  onCreateCapabilityFormula: (newCap: CapabilityFormula) => void;
  onCreateTaskNode: (newTask: TaskNode, initialInstanceIds: string[]) => void;
}

export const ManagerStudioPanel: React.FC<ManagerStudioPanelProps> = ({
  conceptClasses,
  instances,
  capabilities,
  tasks,
  onCreateConceptClass,
  onCreateInstance,
  onUpdateCapabilityFormula,
  onCreateCapabilityFormula,
  onCreateTaskNode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'formulas' | 'instances' | 'classes' | 'new_task'
  >('formulas');

  // --- Formula Editor State ---
  const [selectedCapId, setSelectedCapId] = useState<string>(capabilities[1]?.id ?? capabilities[0]?.id ?? '');
  const activeCap = capabilities.find((c) => c.id === selectedCapId) ?? capabilities[0];

  // --- New Instance Form State ---
  const [instClassId, setInstClassId] = useState<string>(conceptClasses[0]?.id ?? '');
  const [instName, setInstName] = useState<string>('');
  const [instSubtitle, setInstSubtitle] = useState<string>('');
  const [instAttrOverrides, setInstAttrOverrides] = useState<Record<string, number>>({});
  const [instLineageIds, setInstLineageIds] = useState<string[]>([]);
  const [customAttrKey, setCustomAttrKey] = useState<string>('');
  const [customAttrLabel, setCustomAttrLabel] = useState<string>('');
  const [customAttrVal, setCustomAttrVal] = useState<number>(1.2);

  // --- New Concept Class Form State ---
  const [className, setClassName] = useState<string>('');
  const [classSlug, setClassSlug] = useState<string>('');
  const [classColor, setClassColor] = useState<string>('#f43f5e');
  const [classDesc, setClassDesc] = useState<string>('');
  const [classAttrs, setClassAttrs] = useState<
    Array<{
      key: string;
      label: string;
      defaultValue: number;
      unit: string;
      conflictStrategy: ConflictResolutionStrategy;
    }>
  >([
    {
      key: 'efficiencyFactor',
      label: 'ضریب کارایی مفهوم',
      defaultValue: 1.15,
      unit: 'ضریب',
      conflictStrategy: 'multiply',
    },
  ]);

  // --- New Task Form State ---
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [taskCapId, setTaskCapId] = useState<string>(capabilities[1]?.id ?? capabilities[0]?.id ?? '');
  const [taskHours, setTaskHours] = useState<number>(20);
  const [taskComplexity, setTaskComplexity] = useState<number>(1.2);
  const [taskInitialInstances, setTaskInitialInstances] = useState<string[]>([]);

  const selectedClassForNewInstance = conceptClasses.find((c) => c.id === instClassId);

  const handleCreateInstanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim() || !selectedClassForNewInstance) return;

    const attrValues: Record<string, number> = {};
    for (const attr of selectedClassForNewInstance.attributes) {
      attrValues[attr.key] =
        instAttrOverrides[attr.key] !== undefined
          ? instAttrOverrides[attr.key]
          : Number(attr.defaultValue);
    }

    const customAttributes: ConceptInstance['customAttributes'] = {};
    if (customAttrKey.trim() && customAttrLabel.trim()) {
      customAttributes[customAttrKey.trim()] = {
        label: customAttrLabel.trim(),
        value: customAttrVal,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      };
    }

    const newInst: ConceptInstance = {
      id: `inst-${Date.now()}`,
      classId: selectedClassForNewInstance.id,
      name: instName.trim(),
      subtitle: instSubtitle.trim() || `ارث‌برده از ${selectedClassForNewInstance.name}`,
      attributeValues: attrValues,
      customAttributes,
      lineageIds: instLineageIds,
    };

    onCreateInstance(newInst);
    setInstName('');
    setInstSubtitle('');
    setInstAttrOverrides({});
    setInstLineageIds([]);
    setCustomAttrKey('');
    setCustomAttrLabel('');
  };

  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classSlug.trim()) return;

    const newCls: ConceptClass = {
      id: `cls-${Date.now()}`,
      slug: classSlug.trim().replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'custom',
      name: className.trim(),
      category: 'custom',
      color: classColor,
      icon: 'Layers',
      description: classDesc.trim() || 'مفهوم سفارشی تعریف‌شده توسط مدیر',
      parentClassIds: [],
      attributes: classAttrs.map((a) => ({
        key: a.key,
        label: a.label,
        type: 'number',
        defaultValue: a.defaultValue,
        unit: a.unit,
        conflictStrategy: a.conflictStrategy,
      })),
    };

    onCreateConceptClass(newCls);
    setClassName('');
    setClassSlug('');
    setClassDesc('');
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: TaskNode = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      description: taskDesc.trim() || 'تسک ترکیب‌کننده مفاهیم سازمانی',
      capabilityId: taskCapId,
      status: 'ready',
      position: {
        x: 520 + (tasks.length % 3) * 420,
        y: 120 + tasks.length * 140,
      },
      parameters: {
        baseEffortHours: taskHours,
        taskComplexity,
        priorityWeight: 1.0,
        customParams: {},
      },
    };

    onCreateTaskNode(newTask, taskInitialInstances);
    setTaskTitle('');
    setTaskDesc('');
    setTaskInitialInstances([]);
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#0f1219] text-slate-100" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Studio Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#161a25] border border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span>استودیوی طراحی مدیر (مفاهیم، نمونه‌های شیءگرا، پیشینه و فرمول‌ها)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              در این بخش مدیر قالب مفاهیم (Classes)، اشیاء سازمان (Instances + Lineage) و فرمول‌های محاسباتی/تغییر وضعیت (Capabilities) را تعریف و ویرایش می‌کند.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#10131c] p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('formulas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === 'formulas'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>۱. کارایی‌ها و فرمول‌های مدیر</span>
            </button>

            <button
              onClick={() => setActiveSubTab('instances')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === 'instances'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>۲. ساخت شیء / نمونه (ارث‌بری + پیشینه)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('classes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === 'classes'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>۳. تعریف مفهوم جدید (Class)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('new_task')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === 'new_task'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Blocks className="w-3.5 h-3.5" />
              <span>۴. افزودن تسک جدید به گراف</span>
            </button>
          </div>
        </div>

        {/* SUB-TAB 1: CAPABILITY FORMULAS & STATE MUTATIONS */}
        {activeSubTab === 'formulas' && activeCap && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Capability Selector List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="p-4 rounded-2xl bg-[#161a25] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">فهرست کارایی‌ها (Functions)</h3>
                  <button
                    onClick={() => {
                      const newCap: CapabilityFormula = {
                        id: `cap-${Date.now()}`,
                        name: `کارایی سفارشی ${capabilities.length + 1}`,
                        codeName: `fn_custom_${capabilities.length + 1}`,
                        description: 'فرمول سفارشی مدیر برای محاسبه زمان، هزینه و تغییر وضعیت',
                        color: '#ec4899',
                        requiredConceptSlugs: ['person', 'knowledge', 'project'],
                        timeFormula:
                          'round((baseEffortHours * taskComplexity * knowledge.complexityFactor) / person.velocityFactor)',
                        costFormula: 'round(computedHours * person.hourlyRate * overheadMultiplier)',
                        efficiencyFormula: 'round(100 * person.velocityFactor)',
                        mutations: [
                          {
                            id: `mut-${Date.now()}`,
                            label: 'کسر هزینه از بودجه پروژه',
                            targetConceptSlug: 'project',
                            targetAttributeKey: 'remainingBudget',
                            operation: 'subtract',
                            valueExpression: 'computedCost',
                          },
                        ],
                        outputArtifact: {
                          enabled: true,
                          outputConceptClassId: 'cls-knowledge',
                          outputNameTemplate: 'دانش خروجی {{taskTitle}}',
                          initialAttributeExpressions: {
                            complexityFactor: '1.15',
                            learningCurveHours: '2',
                            reusabilityScore: '1.3',
                          },
                        },
                      };
                      onCreateCapabilityFormula(newCap);
                      setSelectedCapId(newCap.id);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    کارایی جدید
                  </button>
                </div>

                <div className="space-y-2">
                  {capabilities.map((cap) => (
                    <div
                      key={cap.id}
                      onClick={() => setSelectedCapId(cap.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        cap.id === activeCap.id
                          ? 'bg-teal-950/30 border-teal-500/60'
                          : 'bg-[#11141d] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{cap.name}</span>
                        <span className="font-mono text-[10px] text-teal-400">{cap.codeName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {cap.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Available Variables Cheat Sheet */}
                <div className="p-3 rounded-xl bg-[#11141d] border border-slate-800 space-y-2 text-[11px]">
                  <div className="font-bold text-sky-300 flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>متغیرهای در دسترس در فرمول مدیر:</span>
                  </div>
                  <div className="space-y-1 font-mono text-[10px] text-slate-300 dir-ltr text-left">
                    <div>• baseEffortHours, taskComplexity</div>
                    <div>• person.hourlyRate, person.velocityFactor</div>
                    <div>• knowledge.complexityFactor, knowledge.learningCurveHours</div>
                    <div>• project.riskMultiplier, project.remainingBudget</div>
                    <div>• department.overheadMultiplier, department.toolingEfficiency</div>
                    <div>• resource.hourlyCost, resource.accelerationFactor</div>
                    <div>• overheadMultiplier (MRO-resolved combined)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Formula Editor */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-[#161a25] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{activeCap.name}</h3>
                  <span className="text-xs text-slate-400">
                    هر تغییری در فرمول زیر درجا روی تمام تسک‌های متصل در گراف اعمال می‌شود.
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 font-mono text-xs">
                  {activeCap.codeName}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    فرمول محاسبه زمان تسک (ساعت) — `timeFormula`:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={activeCap.timeFormula}
                    onChange={(e) =>
                      onUpdateCapabilityFormula({
                        ...activeCap,
                        timeFormula: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 font-mono text-xs text-sky-300 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    فرمول محاسبه هزینه تسک (هزار تومان) — `costFormula` (می‌تواند از `computedHours` استفاده کند):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={activeCap.costFormula}
                    onChange={(e) =>
                      onUpdateCapabilityFormula({
                        ...activeCap,
                        costFormula: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 font-mono text-xs text-amber-300 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    فرمول امتیاز بازدهی و کیفیت — `efficiencyFormula`:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={activeCap.efficiencyFormula}
                    onChange={(e) =>
                      onUpdateCapabilityFormula({
                        ...activeCap,
                        efficiencyFormula: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 font-mono text-xs text-emerald-300 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* State Mutation Rules Editor */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-200">
                  قوانین تغییر وضعیت موجودیت‌ها پس از تکمیل تسک (State Mutation on Done):
                </div>
                {activeCap.mutations.map((mut, idx) => (
                  <div
                    key={mut.id}
                    className="p-3 rounded-xl bg-[#11141d] border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="md:col-span-5">
                      <span className="text-slate-300 font-medium">{mut.label}</span>
                    </div>
                    <div className="md:col-span-3 font-mono text-[11px] text-purple-300 dir-ltr text-left">
                      {mut.targetConceptSlug}.{mut.targetAttributeKey} ({mut.operation})
                    </div>
                    <div className="md:col-span-4">
                      <input
                        type="text"
                        dir="ltr"
                        value={mut.valueExpression}
                        onChange={(e) => {
                          const nextMuts = [...activeCap.mutations];
                          nextMuts[idx] = { ...mut, valueExpression: e.target.value };
                          onUpdateCapabilityFormula({
                            ...activeCap,
                            mutations: nextMuts,
                          });
                        }}
                        className="w-full px-2 py-1 rounded bg-[#181c28] border border-slate-700 font-mono text-[11px] text-emerald-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: CREATE INSTANCE WITH INHERITANCE + LINEAGE */}
        {activeSubTab === 'instances' && (
          <form
            onSubmit={handleCreateInstanceSubmit}
            className="p-5 rounded-2xl bg-[#161a25] border border-slate-800 space-y-5"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-400" />
              <span>ساخت نمونه / شیء جدید با ارث‌بری از مفهوم و اتصال پیشینه (Lineage)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  ۱. ارث‌بری از کدام مفهوم (Class)؟
                </label>
                <select
                  value={instClassId}
                  onChange={(e) => setInstClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs text-white"
                >
                  {conceptClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (:{cls.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  ۲. نام نمونه (مثلاً «رضا کریمی» یا «سند API»):
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: رضا کریمی (DevOps)"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">توضیح کوتاه:</label>
                <input
                  type="text"
                  placeholder="مثلاً: مهندس زیرساخت متصل به واحد فنی"
                  value={instSubtitle}
                  onChange={(e) => setInstSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            {/* Inherited Attributes with Override option */}
            {selectedClassForNewInstance && (
              <div className="p-4 rounded-xl bg-[#11141d] border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-sky-300">
                  ۳. ویژگی‌های به ارث رسیده از «{selectedClassForNewInstance.name}» (می‌توانید مقدار پیش‌فرض را برای این نمونه تغییر دهید):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedClassForNewInstance.attributes.map((attr) => (
                    <div
                      key={attr.key}
                      className="p-2.5 rounded-lg bg-[#171b26] border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{attr.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          پیش‌فرض: {String(attr.defaultValue)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        value={
                          instAttrOverrides[attr.key] !== undefined
                            ? instAttrOverrides[attr.key]
                            : Number(attr.defaultValue)
                        }
                        onChange={(e) =>
                          setInstAttrOverrides({
                            ...instAttrOverrides,
                            [attr.key]: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-[#10131c] border border-slate-700 font-mono text-xs text-emerald-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Instance-Specific Trait */}
            <div className="p-4 rounded-xl bg-[#11141d] border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-amber-300">
                ۴. ویژگی اختصاصیِ خودِ این نمونه (فراتر از کلاس والد — اختیاری):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  dir="ltr"
                  placeholder="کلید انگلیسی (مثلاً specialBonus)"
                  value={customAttrKey}
                  onChange={(e) => setCustomAttrKey(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#171b26] border border-slate-700 text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="عنوان فارسی (مثلاً تسلط ویژه امنیت)"
                  value={customAttrLabel}
                  onChange={(e) => setCustomAttrLabel(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#171b26] border border-slate-700 text-xs"
                />
                <input
                  type="number"
                  step="0.05"
                  value={customAttrVal}
                  onChange={(e) => setCustomAttrVal(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-[#171b26] border border-slate-700 text-xs font-mono text-amber-300"
                />
              </div>
            </div>

            {/* Connected Lineage Selection */}
            <div className="p-4 rounded-xl bg-[#11141d] border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4" />
                <span>۵. پیشینهٔ متصل (Lineage): این نمونه از قبل به کدام واحدها، پروژه‌ها یا دانش‌ها وصل است؟</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {instances.map((existing) => {
                  const selected = instLineageIds.includes(existing.id);
                  return (
                    <button
                      type="button"
                      key={existing.id}
                      onClick={() =>
                        setInstLineageIds((prev) =>
                          selected
                            ? prev.filter((id) => id !== existing.id)
                            : [...prev, existing.id],
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 transition ${
                        selected
                          ? 'bg-purple-600/30 border-purple-400 text-purple-100'
                          : 'bg-[#171b26] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-purple-300" />}
                      <span>{existing.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد نمونه و افزودن به بوم Geometry Nodes</span>
            </button>
          </form>
        )}

        {/* SUB-TAB 3: CREATE NEW CONCEPT CLASS */}
        {activeSubTab === 'classes' && (
          <form
            onSubmit={handleCreateClassSubmit}
            className="p-5 rounded-2xl bg-[#161a25] border border-slate-800 space-y-5"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>تعریف قالب مفهوم جدید (Concept Class) توسط مدیر</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  نام مفهوم (مثلاً «تجهیزات آزمایشگاهی» یا «قراردادها»):
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: قراردادهای پیمانکاری"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  شناسه فرمولی انگلیسی (Slug برای استفاده در فرمول):
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="contract"
                  value={classSlug}
                  onChange={(e) => setClassSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs font-mono text-purple-300"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">رنگ سوکت در Geometry Nodes:</label>
                <input
                  type="color"
                  value={classColor}
                  onChange={(e) => setClassColor(e.target.value)}
                  className="w-full h-9 rounded-xl bg-[#10131c] border border-slate-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  ویژگی‌های پایه این مفهوم و استراتژی حل تعارض در ارث‌بری چندگانه:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setClassAttrs([
                      ...classAttrs,
                      {
                        key: `attr_${classAttrs.length + 1}`,
                        label: `ویژگی ${classAttrs.length + 1}`,
                        defaultValue: 1,
                        unit: 'ضریب',
                        conflictStrategy: 'multiply',
                      },
                    ])
                  }
                  className="px-2.5 py-1 rounded bg-purple-600/20 text-purple-300 text-xs border border-purple-500/30"
                >
                  + افزودن ویژگی پایه
                </button>
              </div>

              {classAttrs.map((attr, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#11141d] border border-slate-800"
                >
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="کلید (key)"
                    value={attr.key}
                    onChange={(e) => {
                      const copy = [...classAttrs];
                      copy[idx] = { ...attr, key: e.target.value };
                      setClassAttrs(copy);
                    }}
                    className="px-2.5 py-1.5 rounded bg-[#171b26] border border-slate-700 text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="نام فارسی ویژگی"
                    value={attr.label}
                    onChange={(e) => {
                      const copy = [...classAttrs];
                      copy[idx] = { ...attr, label: e.target.value };
                      setClassAttrs(copy);
                    }}
                    className="px-2.5 py-1.5 rounded bg-[#171b26] border border-slate-700 text-xs"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={attr.defaultValue}
                    onChange={(e) => {
                      const copy = [...classAttrs];
                      copy[idx] = { ...attr, defaultValue: Number(e.target.value) };
                      setClassAttrs(copy);
                    }}
                    className="px-2.5 py-1.5 rounded bg-[#171b26] border border-slate-700 text-xs font-mono"
                  />
                  <select
                    value={attr.conflictStrategy}
                    onChange={(e) => {
                      const copy = [...classAttrs];
                      copy[idx] = {
                        ...attr,
                        conflictStrategy: e.target.value as ConflictResolutionStrategy,
                      };
                      setClassAttrs(copy);
                    }}
                    className="px-2.5 py-1.5 rounded bg-[#171b26] border border-slate-700 text-xs"
                  >
                    <option value="multiply">ترکیب ضربی (Multiply Modifier)</option>
                    <option value="sum">ترکیب جمعی (Sum)</option>
                    <option value="mro_first">اولویت زنجیره C3 MRO</option>
                    <option value="max">بیشترین مقدار (Max)</option>
                    <option value="min">کمترین مقدار (Min)</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت مفهوم جدید در سیستم نوع</span>
            </button>
          </form>
        )}

        {/* SUB-TAB 4: CREATE NEW TASK NODE */}
        {activeSubTab === 'new_task' && (
          <form
            onSubmit={handleCreateTaskSubmit}
            className="p-5 rounded-2xl bg-[#161a25] border border-slate-800 space-y-5"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Blocks className="w-4 h-4 text-emerald-400" />
              <span>افزودن نود تسک ترکیب‌کننده جدید به گراف</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">عنوان تسک:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: ۴. تسک بهینه‌سازی سئو و امنیت سایت"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  کارایی / فرمول محاسباتی تسک:
                </label>
                <select
                  value={taskCapId}
                  onChange={(e) => setTaskCapId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs text-white"
                >
                  {capabilities.map((cap) => (
                    <option key={cap.id} value={cap.id}>
                      {cap.name} ({cap.codeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  حجم کار پایه تسک (ساعت):
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={taskHours}
                  onChange={(e) => setTaskHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs font-mono text-teal-300"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">ضریب پیچیدگی تسک:</label>
                <input
                  type="number"
                  step="0.05"
                  min={0.5}
                  max={3}
                  value={taskComplexity}
                  onChange={(e) => setTaskComplexity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#10131c] border border-slate-700 text-xs font-mono text-teal-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-2">
                از کدام نمونه‌ها (آدم، دانش، پروژه، واحد، منبع) ارث ببرد؟
              </label>
              <div className="flex flex-wrap gap-2">
                {instances.map((inst) => {
                  const selected = taskInitialInstances.includes(inst.id);
                  return (
                    <button
                      type="button"
                      key={inst.id}
                      onClick={() =>
                        setTaskInitialInstances((prev) =>
                          selected
                            ? prev.filter((id) => id !== inst.id)
                            : [...prev, inst.id],
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 transition ${
                        selected
                          ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100'
                          : 'bg-[#11141d] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                      <span>{inst.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>ساخت تسک و سیم‌کشی خودکار روی گراف</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
