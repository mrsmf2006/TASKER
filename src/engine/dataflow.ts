/**
 * Topological Dataflow & Real-Time Execution Engine
 *
 * Adapted from:
 * - `newcat/baklavajs` (`topologicalSorting.ts` & `dependencyEngine.ts`) for Kahn's DAG sorting
 * - `retejs/engine` (`dataflow.ts`) for recursive upstream socket fetching
 * - Blender Geometry Nodes' evaluation & attribute mutation pipeline
 */

import { resolveTaskInheritance } from './mro';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  GraphConnection,
  MutationExecutionLog,
  TaskEvaluationResult,
  TaskNode,
} from './types';

export class CycleDetectedError extends Error {
  constructor(message = 'دور (Cycle) در گراف وابستگی تسک‌ها شناسایی شد') {
    super(message);
    this.name = 'CycleDetectedError';
  }
}

/**
 * Kahn's algorithm for topological sorting of TaskNodes connected via `task_output` edges.
 * Adapted from `newcat/baklavajs/packages/engine/src/topologicalSorting.ts`.
 */
export function sortTasksTopologically(
  tasks: ReadonlyArray<TaskNode>,
  connections: ReadonlyArray<GraphConnection>,
): TaskNode[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();

  for (const t of tasks) {
    inDegree.set(t.id, 0);
    adjacency.set(t.id, new Set());
  }

  for (const conn of connections) {
    if (conn.sourceType === 'task_output') {
      if (taskMap.has(conn.sourceId) && taskMap.has(conn.targetTaskId)) {
        const neighbors = adjacency.get(conn.sourceId)!;
        if (!neighbors.has(conn.targetTaskId)) {
          neighbors.add(conn.targetTaskId);
          inDegree.set(conn.targetTaskId, (inDegree.get(conn.targetTaskId) ?? 0) + 1);
        }
      }
    }
  }

  const queue: TaskNode[] = [];
  for (const t of tasks) {
    if ((inDegree.get(t.id) ?? 0) === 0) {
      queue.push(t);
    }
  }

  const sorted: TaskNode[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighborId of adjacency.get(current.id) ?? []) {
      const nextDeg = (inDegree.get(neighborId) ?? 1) - 1;
      inDegree.set(neighborId, nextDeg);
      if (nextDeg === 0) {
        const neighborTask = taskMap.get(neighborId);
        if (neighborTask) queue.push(neighborTask);
      }
    }
  }

  if (sorted.length < tasks.length) {
    throw new CycleDetectedError();
  }

  return sorted;
}

/**
 * Safe mathematical & attribute expression evaluator for Manager Formulas.
 * Supports:
 * - Namespaced references like `person.hourlyRate`, `knowledge.complexityFactor`, `department.overheadMultiplier`
 * - Direct MRO-resolved variable names like `hourlyRate`, `overheadMultiplier`, `baseEffortHours`
 * - Built-in math helpers: `min`, `max`, `round`, `ceil`, `floor`, `sqrt`, `abs`, `clamp`
 */
export function evaluateFormulaExpression(
  expression: string,
  variables: Record<string, number>,
  namespacedScope: Record<string, Record<string, number | string | boolean>>,
): { value: number; substituted: string } {
  if (!expression || !expression.trim()) {
    return { value: 0, substituted: '0' };
  }

  let normalized = expression.trim();
  let substituted = normalized;

  // 1. Replace namespaced tokens `namespace.attributeKey` first
  normalized = normalized.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
    (fullMatch, ns: string, key: string) => {
      const nsObj = namespacedScope[ns];
      if (nsObj && nsObj[key] !== undefined) {
        const num = Number(nsObj[key]);
        const safeNum = Number.isNaN(num) ? 0 : num;
        substituted = substituted.replace(fullMatch, `${safeNum}`);
        return `${safeNum}`;
      }
      // Fallback to resolved flat variable or 1 for multipliers / 0 for amounts
      const fallback = variables[key] ?? (key.toLowerCase().includes('multiplier') || key.toLowerCase().includes('factor') || key.toLowerCase().includes('efficiency') ? 1 : 0);
      substituted = substituted.replace(fullMatch, `${fallback}`);
      return `${fallback}`;
    },
  );

  // 2. Replace flat variable identifiers
  const mathBuiltins = new Set(['min', 'max', 'round', 'ceil', 'floor', 'sqrt', 'abs', 'clamp', 'Math']);
  normalized = normalized.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (ident) => {
    if (mathBuiltins.has(ident)) return ident;
    if (variables[ident] !== undefined) {
      return `${variables[ident]}`;
    }
    return '0';
  });

  substituted = substituted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (ident) => {
    if (mathBuiltins.has(ident)) return ident;
    if (variables[ident] !== undefined) {
      return `${variables[ident]}`;
    }
    return ident;
  });

  try {
    const fn = new Function(
      'min',
      'max',
      'round',
      'ceil',
      'floor',
      'sqrt',
      'abs',
      'clamp',
      `"use strict"; return Number((${normalized}) || 0);`,
    );
    const rawResult = fn(
      Math.min,
      Math.max,
      Math.round,
      Math.ceil,
      Math.floor,
      Math.sqrt,
      Math.abs,
      (val: number, lo: number, hi: number) => Math.min(Math.max(val, lo), hi),
    );
    const finalNum = Number.isFinite(rawResult) ? Number(rawResult.toFixed(2)) : 0;
    return { value: finalNum, substituted };
  } catch {
    return { value: 0, substituted: `${substituted} [خطای فرمول]` };
  }
}

/**
 * Evaluates all Task Nodes in topological order, resolving MRO inheritance,
 * lineage propagation, and manager capability formulas.
 */
export function evaluateTaskGraph(
  tasks: TaskNode[],
  connections: GraphConnection[],
  instances: ConceptInstance[],
  classes: ConceptClass[],
  capabilities: CapabilityFormula[],
): Record<string, TaskEvaluationResult> {
  const capabilityMap = new Map(capabilities.map((c) => [c.id, c]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  let orderedTasks: TaskNode[];
  try {
    orderedTasks = sortTasksTopologically(tasks, connections);
  } catch {
    orderedTasks = [...tasks];
  }

  const results: Record<string, TaskEvaluationResult> = {};

  for (const task of orderedTasks) {
    // Check upstream task dependencies
    const upstreamTaskConns = connections.filter(
      (c) => c.targetTaskId === task.id && c.sourceType === 'task_output',
    );
    const blockingTaskIds = upstreamTaskConns
      .map((c) => c.sourceId)
      .filter((sourceTaskId) => {
        const upTask = taskMap.get(sourceTaskId);
        return upTask && upTask.status !== 'completed';
      });

    const isBlockedByUpstream = blockingTaskIds.length > 0;

    // Resolve Multiple Inheritance + Lineage MRO
    const inheritance = resolveTaskInheritance(task, connections, instances, classes, tasks);

    // Build flat numeric variable map for formulas
    const formulaVariables: Record<string, number> = {
      baseEffortHours: task.parameters.baseEffortHours,
      taskComplexity: task.parameters.taskComplexity,
      priorityWeight: task.parameters.priorityWeight,
      ...task.parameters.customParams,
    };

    for (const [k, attr] of Object.entries(inheritance.resolvedAttributes)) {
      if (typeof attr.finalValue === 'number') {
        formulaVariables[k] = attr.finalValue;
      } else {
        const parsed = Number(attr.finalValue);
        if (!Number.isNaN(parsed)) {
          formulaVariables[k] = parsed;
        }
      }
    }

    const capability = capabilityMap.get(task.capabilityId) ?? capabilities[0];

    const timeEval = evaluateFormulaExpression(
      capability?.timeFormula ?? 'baseEffortHours * taskComplexity',
      formulaVariables,
      inheritance.namespacedScope,
    );
    const computedHours = Math.max(0.5, timeEval.value);

    // Expose `computedHours` to cost and efficiency formulas!
    formulaVariables.computedHours = computedHours;
    inheritance.namespacedScope.task.computedHours = computedHours;

    const costEval = evaluateFormulaExpression(
      capability?.costFormula ?? 'computedHours * person.hourlyRate',
      formulaVariables,
      inheritance.namespacedScope,
    );
    const computedCost = Math.max(0, costEval.value);

    formulaVariables.computedCost = computedCost;
    inheritance.namespacedScope.task.computedCost = computedCost;

    const effEval = evaluateFormulaExpression(
      capability?.efficiencyFormula ?? '100',
      formulaVariables,
      inheritance.namespacedScope,
    );
    const computedEfficiency = Math.min(200, Math.max(0, effEval.value));

    results[task.id] = {
      taskId: task.id,
      isBlockedByUpstream,
      blockingTaskIds,
      mroChain: inheritance.mroChain,
      resolvedAttributes: inheritance.resolvedAttributes,
      namespacedScope: inheritance.namespacedScope,
      formulaVariables,
      computedHours,
      computedCost,
      computedEfficiency,
      formulaBreakdown: {
        timeFormulaRaw: capability?.timeFormula ?? '',
        timeFormulaSubstituted: timeEval.substituted,
        costFormulaRaw: capability?.costFormula ?? '',
        costFormulaSubstituted: costEval.substituted,
        efficiencyFormulaRaw: capability?.efficiencyFormula ?? '',
      },
      connectedInstances: inheritance.connectedInstances,
    };
  }

  return results;
}

/**
 * Executes real-time Task Completion (`in_progress` -> `completed` / Done):
 * 1. Applies all Manager `StateMutationRules` to connected instances (including lineage instances!)
 * 2. Generates the output `ConceptInstance` if `capability.outputArtifact.enabled` is true
 * 3. Unlocks downstream tasks connected to this task's output socket
 */
export function executeTaskCompletion(params: {
  taskId: string;
  tasks: TaskNode[];
  connections: GraphConnection[];
  instances: ConceptInstance[];
  classes: ConceptClass[];
  capabilities: CapabilityFormula[];
}): {
  updatedTasks: TaskNode[];
  updatedInstances: ConceptInstance[];
  newLogs: MutationExecutionLog[];
  producedInstance?: ConceptInstance;
} {
  const { taskId, tasks, connections, instances, classes, capabilities } = params;
  const evaluations = evaluateTaskGraph(tasks, connections, instances, classes, capabilities);
  const evalResult = evaluations[taskId];
  const targetTask = tasks.find((t) => t.id === taskId);

  if (!targetTask || !evalResult) {
    return { updatedTasks: tasks, updatedInstances: instances, newLogs: [] };
  }

  const capability = capabilities.find((c) => c.id === targetTask.capabilityId);
  const updatedInstances = instances.map((inst) => ({
    ...inst,
    attributeValues: { ...inst.attributeValues },
    customAttributes: { ...inst.customAttributes },
    lineageIds: [...inst.lineageIds],
  }));

  const newLogs: MutationExecutionLog[] = [];
  const nowIso = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Apply State Mutation Rules on connected instances (direct or lineage)
  if (capability) {
    for (const rule of capability.mutations) {
      // Find matching instance in connectedInstances (matches conceptSlug)
      const matchingEntries = evalResult.connectedInstances.filter(
        (ci) => ci.conceptClass.slug === rule.targetConceptSlug,
      );

      for (const entry of matchingEntries) {
        const instIndex = updatedInstances.findIndex((i) => i.id === entry.instance.id);
        if (instIndex === -1) continue;

        const targetInst = updatedInstances[instIndex];
        const classDef = classes.find((c) => c.id === targetInst.classId);
        const attrDef = classDef?.attributes.find((a) => a.key === rule.targetAttributeKey);

        const currentValRaw =
          targetInst.attributeValues[rule.targetAttributeKey] ??
          targetInst.customAttributes[rule.targetAttributeKey]?.value ??
          attrDef?.defaultValue ??
          0;

        const currentNum = Number(currentValRaw) || 0;
        const { value: operand } = evaluateFormulaExpression(
          rule.valueExpression,
          evalResult.formulaVariables,
          evalResult.namespacedScope,
        );

        let nextNum = currentNum;
        switch (rule.operation) {
          case 'add':
            nextNum = Number((currentNum + operand).toFixed(2));
            break;
          case 'subtract':
            nextNum = Number((currentNum - operand).toFixed(2));
            break;
          case 'multiply':
            nextNum = Number((currentNum * operand).toFixed(2));
            break;
          case 'set':
            nextNum = Number(operand.toFixed(2));
            break;
        }

        if (targetInst.customAttributes[rule.targetAttributeKey]) {
          targetInst.customAttributes[rule.targetAttributeKey] = {
            ...targetInst.customAttributes[rule.targetAttributeKey],
            value: nextNum,
          };
        } else {
          targetInst.attributeValues[rule.targetAttributeKey] = nextNum;
        }

        newLogs.push({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: nowIso,
          taskId: targetTask.id,
          taskTitle: targetTask.title,
          instanceId: targetInst.id,
          instanceName: targetInst.name,
          conceptSlug: rule.targetConceptSlug,
          attributeKey: rule.targetAttributeKey,
          previousValue: currentNum,
          newValue: nextNum,
          delta: Number((nextNum - currentNum).toFixed(2)),
          description: rule.label,
        });
      }
    }
  }

  // 2. Generate Output ConceptInstance if configured on the capability
  let producedInstance: ConceptInstance | undefined;
  if (capability?.outputArtifact.enabled) {
    const outClass =
      classes.find((c) => c.id === capability.outputArtifact.outputConceptClassId) ??
      classes.find((c) => c.slug === 'knowledge');

    if (outClass) {
      const existingProduced = updatedInstances.find((i) => i.generatedByTaskId === targetTask.id);
      const attrVals: Record<string, number | string | boolean> = {};

      for (const attr of outClass.attributes) {
        attrVals[attr.key] = attr.defaultValue;
      }

      for (const [attrKey, expr] of Object.entries(
        capability.outputArtifact.initialAttributeExpressions,
      )) {
        const evaluated = evaluateFormulaExpression(
          expr,
          evalResult.formulaVariables,
          evalResult.namespacedScope,
        );
        attrVals[attrKey] = evaluated.value;
      }

      // Inherit lineage to the project/person that produced it
      const directLineageIds = evalResult.connectedInstances
        .filter((ci) => !ci.viaLineageFrom && (ci.conceptClass.slug === 'project' || ci.conceptClass.slug === 'person'))
        .map((ci) => ci.instance.id);

      const outputName = capability.outputArtifact.outputNameTemplate.replace(
        '{{taskTitle}}',
        targetTask.title,
      );

      if (existingProduced) {
        existingProduced.attributeValues = attrVals;
        existingProduced.name = outputName;
        producedInstance = existingProduced;
      } else {
        producedInstance = {
          id: `inst-out-${targetTask.id}`,
          classId: outClass.id,
          name: outputName,
          subtitle: `خروجی تولیدشده از «${targetTask.title}»`,
          attributeValues: attrVals,
          customAttributes: {},
          lineageIds: directLineageIds,
          generatedByTaskId: targetTask.id,
        };
        updatedInstances.push(producedInstance);
      }
    }
  }

  // 3. Update Task status & unlock downstream tasks whose upstream dependencies are now all completed
  const firstPassTasks = tasks.map((t) => {
    if (t.id !== taskId) return t;
    return {
      ...t,
      status: 'completed' as const,
      completedAt: nowIso,
      producedInstanceId: producedInstance?.id ?? t.producedInstanceId,
      actualExecutionSnapshot: {
        computedHours: evalResult.computedHours,
        computedCost: evalResult.computedCost,
        computedEfficiency: evalResult.computedEfficiency,
        mutationsApplied: newLogs,
      },
    };
  });

  const updatedTaskMap = new Map(firstPassTasks.map((t) => [t.id, t]));
  const updatedTasks = firstPassTasks.map((t) => {
    if (t.status === 'completed' || t.status === 'in_progress') return t;
    const upstreamTaskConns = connections.filter(
      (c) => c.targetTaskId === t.id && c.sourceType === 'task_output',
    );
    const stillBlocked = upstreamTaskConns.some((c) => {
      const up = updatedTaskMap.get(c.sourceId);
      return up && up.status !== 'completed';
    });
    return {
      ...t,
      status: stillBlocked ? ('locked' as const) : ('ready' as const),
    };
  });

  return {
    updatedTasks,
    updatedInstances,
    newLogs,
    producedInstance,
  };
}
