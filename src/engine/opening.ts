import { executeTaskCompletion } from './dataflow';
import {
  INITIAL_CAPABILITIES,
  INITIAL_CONCEPT_CLASSES,
  INITIAL_CONCEPT_INSTANCES,
  INITIAL_CONNECTIONS,
  INITIAL_TASKS,
} from './seedData';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  GraphConnection,
  MutationExecutionLog,
  TaskNode,
} from './types';

export interface OpeningState {
  classes: ConceptClass[];
  instances: ConceptInstance[];
  capabilities: CapabilityFormula[];
  connections: GraphConnection[];
  tasks: TaskNode[];
  logs: MutationExecutionLog[];
}

/**
 * Opens on the same beat as the node-canvas sketch:
 * task 1 already done, task 2 in progress, task 3 still locked.
 */
export function createOpeningState(): OpeningState {
  const primed = INITIAL_TASKS.map((task) =>
    task.id === 'task-architecture-doc' ? { ...task, status: 'in_progress' as const } : task,
  );

  const done = executeTaskCompletion({
    taskId: 'task-architecture-doc',
    tasks: primed,
    connections: INITIAL_CONNECTIONS,
    instances: INITIAL_CONCEPT_INSTANCES,
    classes: INITIAL_CONCEPT_CLASSES,
    capabilities: INITIAL_CAPABILITIES,
  });

  return {
    classes: INITIAL_CONCEPT_CLASSES,
    capabilities: INITIAL_CAPABILITIES,
    connections: INITIAL_CONNECTIONS,
    instances: done.updatedInstances,
    logs: done.newLogs,
    tasks: done.updatedTasks.map((task) =>
      task.id === 'task-website-main' ? { ...task, status: 'in_progress' as const } : task,
    ),
  };
}
