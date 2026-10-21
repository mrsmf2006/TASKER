/**
 * Multiple Inheritance & Lineage Resolution Engine (C3 MRO + Geometry Nodes Modifier Aggregation)
 *
 * Adapted from CPython's C3 Linearization (`Lib/functools.py`: `_c3_merge` / `_c3_mro`)
 * and Blender Geometry Nodes' attribute domain/modifier resolution.
 *
 * When a Task Node inherits from multiple connected Concept Instances (e.g. Ali + Site Doc + Brand Project),
 * each Instance brings:
 *   1. Its own overridden/custom attributes (`direct_instance`)
 *   2. Its connected Lineage / Background instances (`lineage_instance`, e.g., Ali -> Technical Dept)
 *   3. Its Concept Class prototype (`concept_class`, e.g., Person, Knowledge, Project)
 */

import {
  ConceptClass,
  ConceptInstance,
  ConflictResolutionStrategy,
  GraphConnection,
  MROChainEntry,
  ResolvedAttribute,
  ResolvedAttributeSource,
  TaskNode,
} from './types';

/**
 * Pure C3 Linearization merge adapted directly from CPython `Lib/functools.py` `_c3_merge`.
 * Merges a list of MRO sequences into a single monotonic linearization without duplicates.
 */
export function c3Merge(sequences: string[][]): string[] {
  const working = sequences
    .map((seq) => [...seq])
    .filter((seq) => seq.length > 0);
  const result: string[] = [];

  while (working.length > 0) {
    let candidate: string | null = null;

    for (const seq1 of working) {
      const head = seq1[0];
      const appearsInTail = working.some((seq2) => seq2.slice(1).includes(head));
      if (!appearsInTail) {
        candidate = head;
        break;
      }
    }

    if (candidate === null) {
      // Fallback if user graph introduces cyclic lineage: pick first available head deterministically
      candidate = working[0][0];
    }

    result.push(candidate);

    for (let i = working.length - 1; i >= 0; i--) {
      if (working[i][0] === candidate) {
        working[i].shift();
      }
      if (working[i].length === 0) {
        working.splice(i, 1);
      }
    }
  }

  return result;
}

/**
 * Computes the C3 MRO sequence for a ConceptClass hierarchy.
 */
export function computeClassMRO(
  classId: string,
  classMap: Map<string, ConceptClass>,
  visited = new Set<string>(),
): string[] {
  if (visited.has(classId)) return [classId];
  visited.add(classId);

  const cls = classMap.get(classId);
  if (!cls || cls.parentClassIds.length === 0) {
    return [`class:${classId}`];
  }

  const parentMROs = cls.parentClassIds.map((pid) =>
    computeClassMRO(pid, classMap, new Set(visited)),
  );
  const directParents = cls.parentClassIds.map((pid) => `class:${pid}`);

  return [`class:${classId}`, ...c3Merge([...parentMROs, directParents])];
}

/**
 * Computes the C3 MRO sequence for a ConceptInstance:
 * `[instance:<id>, ...lineageMROs, ...classMRO]`
 */
export function computeInstanceMRO(
  instanceId: string,
  instanceMap: Map<string, ConceptInstance>,
  classMap: Map<string, ConceptClass>,
  visited = new Set<string>(),
): string[] {
  if (visited.has(instanceId)) return [];
  visited.add(instanceId);

  const inst = instanceMap.get(instanceId);
  if (!inst) return [];

  const lineageMROs = inst.lineageIds
    .filter((lid) => instanceMap.has(lid) && !visited.has(lid))
    .map((lid) => computeInstanceMRO(lid, instanceMap, classMap, new Set(visited)));

  const classMRO = computeClassMRO(inst.classId, classMap);

  const directLineageHeads = inst.lineageIds
    .filter((lid) => instanceMap.has(lid))
    .map((lid) => `instance:${lid}`);

  return [
    `instance:${instanceId}`,
    ...c3Merge([
      ...lineageMROs,
      directLineageHeads,
      classMRO,
    ]),
  ];
}

function mergeNamespacedValue(
  bucket: Record<string, number | string | boolean>,
  key: string,
  value: number | string | boolean,
  strategy: ConflictResolutionStrategy,
) {
  if (bucket[key] === undefined || strategy === 'mro_first') {
    if (bucket[key] === undefined) bucket[key] = value;
    return;
  }

  const prev = Number(bucket[key]);
  const next = Number(value);
  if (Number.isNaN(prev) || Number.isNaN(next)) return;

  if (strategy === 'multiply') bucket[key] = Number((prev * next).toFixed(4));
  else if (strategy === 'sum') bucket[key] = Number((prev + next).toFixed(4));
  else if (strategy === 'max') bucket[key] = Math.max(prev, next);
  else if (strategy === 'min') bucket[key] = Math.min(prev, next);
}

export interface TaskInheritanceResolution {
  mroChain: MROChainEntry[];
  resolvedAttributes: Record<string, ResolvedAttribute>;
  namespacedScope: Record<string, Record<string, number | string | boolean>>;
  connectedInstances: {
    instance: ConceptInstance;
    conceptClass: ConceptClass;
    viaLineageFrom?: ConceptInstance;
    viaTaskOutputFrom?: TaskNode;
  }[];
}

/**
 * Resolves the complete multiple-inheritance tree (MRO), lineage graph, and attribute table
 * for a given Task Node.
 */
export function resolveTaskInheritance(
  task: TaskNode,
  connections: GraphConnection[],
  instances: ConceptInstance[],
  classes: ConceptClass[],
  allTasks: TaskNode[],
): TaskInheritanceResolution {
  const instanceMap = new Map(instances.map((i) => [i.id, i]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));

  // 1. Find all directly connected instances (either direct instance nodes or completed upstream task outputs)
  const incomingConnections = connections.filter((c) => c.targetTaskId === task.id);

  const directInstanceIds: string[] = [];
  const viaTaskMap = new Map<string, TaskNode>();

  for (const conn of incomingConnections) {
    if (conn.sourceType === 'instance') {
      if (instanceMap.has(conn.sourceId) && !directInstanceIds.includes(conn.sourceId)) {
        directInstanceIds.push(conn.sourceId);
      }
    } else if (conn.sourceType === 'task_output') {
      const upstreamTask = taskMap.get(conn.sourceId);
      if (upstreamTask?.producedInstanceId && instanceMap.has(upstreamTask.producedInstanceId)) {
        if (!directInstanceIds.includes(upstreamTask.producedInstanceId)) {
          directInstanceIds.push(upstreamTask.producedInstanceId);
          viaTaskMap.set(upstreamTask.producedInstanceId, upstreamTask);
        }
      }
    }
  }

  // Track which direct instance brought which lineage instance
  const lineageOriginMap = new Map<string, ConceptInstance>();
  for (const directId of directInstanceIds) {
    const directInst = instanceMap.get(directId);
    if (!directInst) continue;
    for (const linId of directInst.lineageIds) {
      if (!directInstanceIds.includes(linId) && !lineageOriginMap.has(linId)) {
        lineageOriginMap.set(linId, directInst);
      }
    }
  }

  // 2. Compute C3 Linearization across Task + all connected Instance MROs
  const instanceMROSequences = directInstanceIds.map((id) =>
    computeInstanceMRO(id, instanceMap, classMap),
  );
  const directHeads = directInstanceIds.map((id) => `instance:${id}`);

  const mergedTokens = [
    `task:${task.id}`,
    ...c3Merge([...instanceMROSequences, directHeads]),
  ];

  // 3. Build structured MROChainEntry list and ConnectedInstances list
  const mroChain: MROChainEntry[] = [];
  const connectedInstances: TaskInheritanceResolution['connectedInstances'] = [];
  const seenInstanceIds = new Set<string>();

  mergedTokens.forEach((token, idx) => {
    if (token.startsWith('task:')) {
      mroChain.push({
        nodeId: task.id,
        nodeType: 'task_local',
        name: task.title,
        conceptSlug: 'task',
        color: '#10b981',
        depth: idx,
      });
      return;
    }

    if (token.startsWith('instance:')) {
      const instId = token.slice('instance:'.length);
      const inst = instanceMap.get(instId);
      if (!inst) return;
      const cls = classMap.get(inst.classId);
      if (!cls) return;

      const isDirect = directInstanceIds.includes(instId);
      const viaOrigin = lineageOriginMap.get(instId);

      mroChain.push({
        nodeId: inst.id,
        nodeType: isDirect ? 'direct_instance' : 'lineage_instance',
        name: inst.name,
        conceptSlug: cls.slug,
        color: cls.color,
        depth: idx,
        viaInstanceName: viaOrigin?.name,
      });

      if (!seenInstanceIds.has(inst.id)) {
        seenInstanceIds.add(inst.id);
        connectedInstances.push({
          instance: inst,
          conceptClass: cls,
          viaLineageFrom: isDirect ? undefined : viaOrigin,
          viaTaskOutputFrom: viaTaskMap.get(inst.id),
        });
      }
      return;
    }

    if (token.startsWith('class:')) {
      const clsId = token.slice('class:'.length);
      const cls = classMap.get(clsId);
      if (!cls) return;

      mroChain.push({
        nodeId: cls.id,
        nodeType: 'concept_class',
        name: `کلاس مفهوم: ${cls.name}`,
        conceptSlug: cls.slug,
        color: cls.color,
        depth: idx,
      });
    }
  });

  // 4. Collect attributes along the MRO chain and resolve collisions
  const attributeMetaMap = new Map<
    string,
    {
      label: string;
      unit?: string;
      strategy: ConflictResolutionStrategy;
      sources: ResolvedAttributeSource[];
    }
  >();

  const namespacedScope: Record<string, Record<string, number | string | boolean>> = {
    task: {
      baseEffortHours: task.parameters.baseEffortHours,
      taskComplexity: task.parameters.taskComplexity,
      priorityWeight: task.parameters.priorityWeight,
      ...task.parameters.customParams,
    },
  };

  // Seed task-local attributes first (highest priority in MRO)
  const taskLocalAttrs: Array<{ key: string; label: string; value: number; unit?: string }> = [
    { key: 'baseEffortHours', label: 'حجم کار پایه تسک', value: task.parameters.baseEffortHours, unit: 'ساعت' },
    { key: 'taskComplexity', label: 'ضریب پیچیدگی تسک', value: task.parameters.taskComplexity, unit: 'ضریب' },
    { key: 'priorityWeight', label: 'وزن اولویت تسک', value: task.parameters.priorityWeight, unit: 'ضریب' },
  ];

  for (const tAttr of taskLocalAttrs) {
    attributeMetaMap.set(tAttr.key, {
      label: tAttr.label,
      unit: tAttr.unit,
      strategy: 'mro_first',
      sources: [
        {
          sourceId: task.id,
          sourceName: task.title,
          sourceType: 'task_local',
          conceptSlug: 'task',
          rawValue: tAttr.value,
        },
      ],
    });
  }

  // Traverse MRO entries to gather instance overrides, custom attributes, and class defaults
  const namespacedSeen = new Set<string>();
  for (const entry of mroChain) {
    if (entry.nodeType === 'direct_instance' || entry.nodeType === 'lineage_instance') {
      const inst = instanceMap.get(entry.nodeId);
      if (!inst) continue;
      const cls = classMap.get(inst.classId);
      if (!cls) continue;

      if (!namespacedScope[cls.slug]) {
        namespacedScope[cls.slug] = {};
      }

      // First: defined class attributes on this instance
      for (const attrDef of cls.attributes) {
        const val =
          inst.attributeValues[attrDef.key] !== undefined
            ? inst.attributeValues[attrDef.key]
            : attrDef.defaultValue;

        // Same concept slug on several instances (two knowledge docs, two people)
        // combines with that attribute's strategy, so a task output actually
        // changes the next task's `knowledge.*` variables.
        const seenKey = `${inst.id}:${cls.slug}:${attrDef.key}`;
        if (!namespacedSeen.has(seenKey)) {
          namespacedSeen.add(seenKey);
          mergeNamespacedValue(
            namespacedScope[cls.slug],
            attrDef.key,
            val,
            attrDef.conflictStrategy,
          );
        }

        const existing = attributeMetaMap.get(attrDef.key);
        const sourceRecord: ResolvedAttributeSource = {
          sourceId: inst.id,
          sourceName: entry.viaInstanceName
            ? `${inst.name} (پیشینهٔ ${entry.viaInstanceName})`
            : inst.name,
          sourceType: entry.nodeType,
          conceptSlug: cls.slug,
          rawValue: val,
        };

        if (!existing) {
          attributeMetaMap.set(attrDef.key, {
            label: attrDef.label,
            unit: attrDef.unit,
            strategy: attrDef.conflictStrategy,
            sources: [sourceRecord],
          });
        } else {
          // Avoid duplicate source entry for the exact same instance
          if (!existing.sources.some((s) => s.sourceId === inst.id)) {
            existing.sources.push(sourceRecord);
          }
        }
      }

      // Second: custom instance-only attributes (e.g., Ali's specific bonus attribute)
      for (const [customKey, customObj] of Object.entries(inst.customAttributes)) {
        mergeNamespacedValue(
          namespacedScope[cls.slug],
          customKey,
          customObj.value,
          customObj.conflictStrategy ?? 'mro_first',
        );

        const existing = attributeMetaMap.get(customKey);
        const sourceRecord: ResolvedAttributeSource = {
          sourceId: inst.id,
          sourceName: `${inst.name} (ویژگی اختصاصی)`,
          sourceType: entry.nodeType,
          conceptSlug: cls.slug,
          rawValue: customObj.value,
        };

        if (!existing) {
          attributeMetaMap.set(customKey, {
            label: customObj.label,
            unit: customObj.unit,
            strategy: customObj.conflictStrategy ?? 'mro_first',
            sources: [sourceRecord],
          });
        } else if (!existing.sources.some((s) => s.sourceId === inst.id)) {
          existing.sources.push(sourceRecord);
        }
      }
    }
  }

  // 5. Finalize ResolvedAttribute values according to each attribute's ConflictResolutionStrategy
  const resolvedAttributes: Record<string, ResolvedAttribute> = {};

  for (const [key, meta] of attributeMetaMap.entries()) {
    const numericSources = meta.sources
      .map((s) => (typeof s.rawValue === 'number' ? s.rawValue : Number(s.rawValue)))
      .filter((n) => !Number.isNaN(n));

    let finalValue: number | string | boolean = meta.sources[0]?.rawValue ?? 0;

    if (meta.sources.length > 1 && numericSources.length === meta.sources.length) {
      switch (meta.strategy) {
        case 'mro_first':
          finalValue = numericSources[0];
          break;
        case 'multiply':
          finalValue = Number(
            numericSources.reduce((acc, v) => acc * v, 1).toFixed(4),
          );
          break;
        case 'sum':
          finalValue = Number(
            numericSources.reduce((acc, v) => acc + v, 0).toFixed(4),
          );
          break;
        case 'max':
          finalValue = Math.max(...numericSources);
          break;
        case 'min':
          finalValue = Math.min(...numericSources);
          break;
      }
    } else {
      finalValue = meta.sources[0]?.rawValue ?? 0;
    }

    resolvedAttributes[key] = {
      key,
      label: meta.label,
      finalValue,
      unit: meta.unit,
      strategyUsed: meta.strategy,
      hadConflict: meta.sources.length > 1,
      sources: meta.sources,
    };
  }

  return {
    mroChain,
    resolvedAttributes,
    namespacedScope,
    connectedInstances,
  };
}
