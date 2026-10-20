/**
 * Core Type System for the Modular Object-Oriented & Geometry-Nodes Task Engine
 *
 * Architectural foundations adapted from:
 * - CPython `Lib/functools.py` (`_c3_merge` / `_c3_mro`) for multiple inheritance & lineage resolution
 * - `retejs/rete` (`ClassicPreset.Socket`, `Port`, `Node`, `Connection`) for typed node sockets
 * - `newcat/baklavajs` (`topologicalSorting.ts`, `dependencyEngine.ts`) for DAG execution & dataflow propagation
 */

export type AttributeValueType = 'number' | 'string' | 'boolean';

/**
 * When multiple connected concepts or lineages expose the same attribute key
 * (e.g., both Department and Project define `overheadMultiplier`), how should
 * the Task Node resolve the diamond/collision?
 */
export type ConflictResolutionStrategy =
  | 'mro_first' // Python MRO style: first in C3 linearization wins
  | 'multiply'  // Blender Geometry Nodes modifier stack style: multiply factors together
  | 'sum'       // Additive aggregation across inherited sources
  | 'max'       // Highest constraint wins
  | 'min';      // Strictest lower bound wins

export interface AttributeDefinition {
  key: string;
  label: string;
  type: AttributeValueType;
  defaultValue: number | string | boolean;
  unit?: string;
  conflictStrategy: ConflictResolutionStrategy;
  description?: string;
}

export type ConceptCategory = 'human' | 'department' | 'project' | 'knowledge' | 'resource' | 'custom';

/**
 * Layer 1: Concept Class (قالب مفهوم)
 * Defined by the Manager in the UI (e.g., Person/آدم, Department/واحد, Project/پروژه, Knowledge/دانش).
 */
export interface ConceptClass {
  id: string;
  slug: string; // Used as namespace in formulas, e.g. `person`, `project`, `knowledge`, `department`
  name: string;
  category: ConceptCategory;
  color: string; // Blender Geometry Nodes socket/header color
  icon: string;
  description: string;
  parentClassIds: string[]; // Supports class-level prototype chain if needed
  attributes: AttributeDefinition[];
}

/**
 * Layer 2: Concept Instance / Object (نمونه شیء در سازمان)
 * Inherits attributes from its `ConceptClass`, can override values, add instance-specific
 * attributes, and hold `lineageIds` (پیشینه متصل — e.g., Ali belongs to Technical Dept & Brand Project).
 */
export interface ConceptInstance {
  id: string;
  classId: string;
  name: string;
  subtitle?: string;
  /** Overrides of ConceptClass attributes */
  attributeValues: Record<string, number | string | boolean>;
  /** Extra dynamic traits specific to this instance (e.g., Ali's special skill bonus) */
  customAttributes: Record<string, {
    label: string;
    value: number | string | boolean;
    unit?: string;
    conflictStrategy?: ConflictResolutionStrategy;
  }>;
  /**
   * Connected background/lineage instances (پیشینه متصل).
   * When this instance is wired into a Task, its lineage instances automatically
   * propagate into the Task's C3 MRO chain unless overridden.
   */
  lineageIds: string[];
  /** Indicates if this instance was dynamically generated as the output of a completed Task */
  generatedByTaskId?: string;
}

/**
 * State Mutation Rule (قانون تغییر وضعیت موجودیت‌ها پس از تکمیل تسک)
 * Executed when a Task transitions to `completed` (Done).
 */
export interface StateMutationRule {
  id: string;
  label: string;
  /** Target concept namespace slug (e.g., `project`, `person`, `department`) */
  targetConceptSlug: string;
  /** Target attribute key on that connected instance (e.g., `budget`, `experiencePoints`) */
  targetAttributeKey: string;
  operation: 'add' | 'subtract' | 'set' | 'multiply';
  /** Formula expression evaluated in the Task's context (e.g., `computedCost` or `computedHours * 0.25`) */
  valueExpression: string;
}

/**
 * Output Artifact Specification (تولید موجودیت جدید در خروجی تسک برای زنجیره تسک‌های بعدی)
 */
export interface OutputArtifactSpec {
  enabled: boolean;
  outputConceptClassId: string;
  outputNameTemplate: string; // e.g. "خروجی {{taskName}}"
  /** Expressions to initialize attributes of the newly created output instance */
  initialAttributeExpressions: Record<string, string>;
}

/**
 * Capability / Function (کارایی و فرمول مدیر)
 * Reusable computation & state-transition blueprint defined by the manager.
 */
export interface CapabilityFormula {
  id: string;
  name: string;
  codeName: string;
  description: string;
  color: string;
  /** Required concept class slugs as inputs (sockets) */
  requiredConceptSlugs: string[];
  /** Formula expression for calculating total hours (زمان) */
  timeFormula: string;
  /** Formula expression for calculating total cost (هزینه) */
  costFormula: string;
  /** Formula expression for quality/efficiency score (کیفیت/بازدهی) */
  efficiencyFormula: string;
  /** Mutations applied to connected objects when the task is marked Done */
  mutations: StateMutationRule[];
  /** Optional generated concept instance emitted from the Task's output socket */
  outputArtifact: OutputArtifactSpec;
}

export type TaskExecutionStatus = 'locked' | 'ready' | 'in_progress' | 'completed';

/**
 * Typed Input Socket on a Task Node (inspired by Rete.js ClassicPreset.Input)
 */
export interface TaskInputSocket {
  id: string;
  key: string;
  label: string;
  acceptsConceptSlug: string; // e.g. 'person', 'knowledge', 'project', 'department', or '*'
  multiple: boolean;
}

/**
 * Layer 3: Task Node (نود ترکیب‌کننده تسک)
 */
export interface TaskNode {
  id: string;
  title: string;
  description: string;
  capabilityId: string;
  status: TaskExecutionStatus;
  position: { x: number; y: number };
  /** Task-own local parameters (پارامترهای داخلی خود تسک) */
  parameters: {
    baseEffortHours: number;
    taskComplexity: number;
    priorityWeight: number;
    customParams: Record<string, number>;
  };
  /** ID of the generated output ConceptInstance once status === 'completed' */
  producedInstanceId?: string;
  startedAt?: string;
  completedAt?: string;
  actualExecutionSnapshot?: {
    computedHours: number;
    computedCost: number;
    computedEfficiency: number;
    mutationsApplied: MutationExecutionLog[];
  };
}

/**
 * Graph Edge / Wire connecting either:
 * 1. An Instance Node (`sourceType: 'instance'`) -> Task Input Socket
 * 2. A Predecessor Task Output Socket (`sourceType: 'task_output'`) -> Successor Task Input Socket
 */
export interface GraphConnection {
  id: string;
  sourceType: 'instance' | 'task_output';
  /** Either `ConceptInstance.id` or `TaskNode.id` */
  sourceId: string;
  sourceSocketKey: string;
  targetTaskId: string;
  /** Target concept slug socket on the task, e.g., `person`, `knowledge`, `project`, `department` */
  targetSocketSlug: string;
}

export interface MROChainEntry {
  nodeId: string;
  nodeType: 'task_local' | 'direct_instance' | 'lineage_instance' | 'concept_class';
  name: string;
  conceptSlug: string;
  color: string;
  depth: number;
  viaInstanceName?: string; // If brought in via lineage (پیشینه), who brought it?
}

export interface ResolvedAttributeSource {
  sourceId: string;
  sourceName: string;
  sourceType: 'task_local' | 'direct_instance' | 'lineage_instance' | 'concept_class';
  conceptSlug: string;
  rawValue: number | string | boolean;
}

export interface ResolvedAttribute {
  key: string;
  label: string;
  finalValue: number | string | boolean;
  unit?: string;
  strategyUsed: ConflictResolutionStrategy;
  hadConflict: boolean;
  sources: ResolvedAttributeSource[];
}

export interface MutationExecutionLog {
  id: string;
  timestamp: string;
  taskId: string;
  taskTitle: string;
  instanceId: string;
  instanceName: string;
  conceptSlug: string;
  attributeKey: string;
  previousValue: number | string | boolean;
  newValue: number | string | boolean;
  delta: number;
  description: string;
}

export interface TaskEvaluationResult {
  taskId: string;
  isBlockedByUpstream: boolean;
  blockingTaskIds: string[];
  /** C3 Linearized inheritance order for this Task */
  mroChain: MROChainEntry[];
  /** Flat resolved attributes (handling conflicts via MRO or aggregation strategy) */
  resolvedAttributes: Record<string, ResolvedAttribute>;
  /** Namespaced lookup table (e.g. `person.hourlyRate`, `department.overheadMultiplier`) */
  namespacedScope: Record<string, Record<string, number | string | boolean>>;
  /** Flat evaluation variables available to formulas */
  formulaVariables: Record<string, number>;
  computedHours: number;
  computedCost: number;
  computedEfficiency: number;
  formulaBreakdown: {
    timeFormulaRaw: string;
    timeFormulaSubstituted: string;
    costFormulaRaw: string;
    costFormulaSubstituted: string;
    efficiencyFormulaRaw: string;
  };
  connectedInstances: {
    instance: ConceptInstance;
    conceptClass: ConceptClass;
    viaLineageFrom?: ConceptInstance;
    viaTaskOutputFrom?: TaskNode;
  }[];
}
