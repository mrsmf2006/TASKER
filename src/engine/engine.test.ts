import { describe, expect, it } from 'vitest';
import { executeTaskCompletion, evaluateTaskGraph, sortTasksTopologically, CycleDetectedError } from './dataflow';
import { c3Merge } from './mro';
import { createOpeningState } from './opening';
import {
  INITIAL_CAPABILITIES,
  INITIAL_CONCEPT_CLASSES,
  INITIAL_CONCEPT_INSTANCES,
  INITIAL_CONNECTIONS,
  INITIAL_TASKS,
} from './seedData';

describe('C3 merge', () => {
  it('linearizes a diamond without duplicates', () => {
    const merged = c3Merge([
      ['B', 'D'],
      ['C', 'D'],
      ['B', 'C'],
    ]);
    expect(merged.filter((item) => item === 'D')).toHaveLength(1);
    expect(merged.indexOf('B')).toBeLessThan(merged.indexOf('D'));
    expect(merged.indexOf('C')).toBeLessThan(merged.indexOf('D'));
  });
});

describe('task graph', () => {
  it('keeps a downstream task locked until the upstream task is done', () => {
    const results = evaluateTaskGraph(
      INITIAL_TASKS,
      INITIAL_CONNECTIONS,
      INITIAL_CONCEPT_INSTANCES,
      INITIAL_CONCEPT_CLASSES,
      INITIAL_CAPABILITIES,
    );

    expect(results['task-architecture-doc'].isBlockedByUpstream).toBe(false);
    expect(results['task-website-main'].isBlockedByUpstream).toBe(true);
    expect(results['task-website-main'].blockingTaskIds).toContain('task-architecture-doc');
  });

  it('pulls a person lineage into the task and combines shared attributes', () => {
    const website = evaluateTaskGraph(
      INITIAL_TASKS,
      INITIAL_CONNECTIONS,
      INITIAL_CONCEPT_INSTANCES,
      INITIAL_CONCEPT_CLASSES,
      INITIAL_CAPABILITIES,
    )['task-website-main'];

    const ali = website.connectedInstances.find((entry) => entry.instance.id === 'inst-person-ali');
    const dept = website.connectedInstances.find((entry) => entry.instance.id === 'inst-dept-tech');

    expect(ali?.viaLineageFrom).toBeUndefined();
    expect(dept?.viaLineageFrom?.id).toBe('inst-person-ali');
    expect(website.namespacedScope.department.toolingEfficiency).toBe(1.25);
    expect(website.namespacedScope.person.hourlyRate).toBe(650);

    const overhead = website.resolvedAttributes.overheadMultiplier;
    expect(overhead.hadConflict).toBe(true);
    expect(overhead.strategyUsed).toBe('multiply');
    expect(overhead.finalValue).toBeCloseTo(1.05 * 1.15 * 1.1, 3);
  });

  it('rejects a cycle between tasks', () => {
    expect(() =>
      sortTasksTopologically(INITIAL_TASKS, [
        ...INITIAL_CONNECTIONS,
        {
          id: 'loop',
          sourceType: 'task_output',
          sourceId: 'task-site-deploy',
          sourceSocketKey: 'artifact_out',
          targetTaskId: 'task-architecture-doc',
          targetSocketSlug: 'knowledge',
        },
      ]),
    ).toThrow(CycleDetectedError);
  });
});

describe('completion', () => {
  it('mutates project and person, emits knowledge, and unlocks the next task', () => {
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

    const project = done.updatedInstances.find((item) => item.id === 'inst-proj-brand');
    const sara = done.updatedInstances.find((item) => item.id === 'inst-person-sara');
    const website = done.updatedTasks.find((task) => task.id === 'task-website-main');

    expect(project?.attributeValues.remainingBudget).toBeLessThan(150000);
    expect(sara?.attributeValues.experiencePoints).toBeGreaterThan(150);
    expect(done.producedInstance?.generatedByTaskId).toBe('task-architecture-doc');
    expect(done.producedInstance?.lineageIds).not.toContain('inst-person-sara');
    expect(website?.status).toBe('ready');
    expect(done.newLogs.length).toBeGreaterThan(0);

    const next = evaluateTaskGraph(
      done.updatedTasks,
      INITIAL_CONNECTIONS,
      done.updatedInstances,
      INITIAL_CONCEPT_CLASSES,
      INITIAL_CAPABILITIES,
    )['task-website-main'];

    expect(next.isBlockedByUpstream).toBe(false);
    expect(next.namespacedScope.knowledge.complexityFactor).toBeCloseTo(1.15 * 1.25, 3);
    expect(next.namespacedScope.knowledge.learningCurveHours).toBe(5);
    expect(next.namespacedScope.person.hourlyRate).toBe(650);
    expect(next.connectedInstances.some((entry) => entry.instance.id === 'inst-person-sara')).toBe(false);
  });
});

describe('opening state', () => {
  it('matches the sketch: done, in progress, locked', () => {
    const opening = createOpeningState();
    const byId = Object.fromEntries(opening.tasks.map((task) => [task.id, task.status]));

    expect(byId['task-architecture-doc']).toBe('completed');
    expect(byId['task-website-main']).toBe('in_progress');
    expect(byId['task-site-deploy']).toBe('locked');
    expect(opening.logs.length).toBeGreaterThan(0);
  });
});
