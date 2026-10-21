import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  MutationExecutionLog,
  TaskEvaluationResult,
  TaskNode,
} from '../engine/types';
import { STATUS_LABEL, displayStatus, formatSmart } from '../ui/display';

interface DashboardViewProps {
  classes: ConceptClass[];
  instances: ConceptInstance[];
  tasks: TaskNode[];
  evaluations: Record<string, TaskEvaluationResult>;
  logs: MutationExecutionLog[];
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
}

export function DashboardView(props: DashboardViewProps) {
  const { classes, instances, tasks, evaluations, logs, onStart, onComplete } = props;
  const forecastCost = Object.values(evaluations).reduce((sum, item) => sum + item.computedCost, 0);
  const forecastHours = Object.values(evaluations).reduce((sum, item) => sum + item.computedHours, 0);
  const spent = tasks.reduce((sum, task) => sum + (task.actualExecutionSnapshot?.computedCost ?? 0), 0);
  const done = tasks.filter((task) => task.status === 'completed').length;
  const people = instances.filter((item) => classes.find((concept) => concept.id === item.classId)?.slug === 'person');
  const projects = instances.filter((item) => classes.find((concept) => concept.id === item.classId)?.slug === 'project');

  return (
    <div className="page">
      <h1>داشبورد</h1>
      <p className="lead">برآورد کل گراف، هزینهٔ ثبت‌شده بعد از Done، و برش آدم در پروژه.</p>
      <div className="kpi-grid">
        <div className="kpi"><span>برآورد زمان</span><strong>{formatSmart(forecastHours)} ساعت</strong></div>
        <div className="kpi"><span>برآورد هزینه</span><strong>{formatSmart(forecastCost)}</strong></div>
        <div className="kpi"><span>هزینهٔ ثبت‌شده</span><strong>{formatSmart(spent)}</strong></div>
        <div className="kpi"><span>تسک‌های انجام‌شده</span><strong>{done} از {tasks.length}</strong></div>
      </div>
      <div className="split">
        <section className="panel">
          <h3>چرخه اجرا</h3>
          {tasks.map((task) => {
            const evaluation = evaluations[task.id];
            const status = displayStatus(task, Boolean(evaluation?.isBlockedByUpstream));
            return (
              <div className="task-line" key={task.id}>
                <div>
                  <b>{task.title}</b>
                  <div className="mini-status">
                    {formatSmart(evaluation?.computedHours ?? 0)} ساعت · {formatSmart(evaluation?.computedCost ?? 0)} هزار تومان
                  </div>
                </div>
                <button
                  className={`status ${status}`}
                  style={{ width: 'auto', marginTop: 0, padding: '0 14px' }}
                  disabled={status === 'locked' || status === 'completed'}
                  onClick={() => {
                    if (status === 'ready') onStart(task.id);
                    if (status === 'in_progress') onComplete(task.id);
                  }}
                >
                  {STATUS_LABEL[status]}
                </button>
              </div>
            );
          })}
          <h3 style={{ marginTop: 18 }}>آدم × پروژه</h3>
          <table className="matrix">
            <thead>
              <tr>
                <th>آدم / پروژه</th>
                {projects.map((project) => <th key={project.id}>{project.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <th>{person.name}</th>
                  {projects.map((project) => {
                    const hits = tasks.filter((task) => {
                      const linked = evaluations[task.id]?.connectedInstances ?? [];
                      return linked.some((item) => item.instance.id === person.id) && linked.some((item) => item.instance.id === project.id);
                    });
                    return (
                      <td key={project.id}>
                        {hits.length === 0 ? '—' : hits.map((task) => <div key={task.id}>{task.title}</div>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h3>دفتر تغییر وضعیت</h3>
          {logs.length === 0 && <p className="hint">هنوز تسکی Done نشده است.</p>}
          {logs.map((log) => (
            <article className="log-item" key={log.id}>
              <b>{log.description}</b>
              <div className="mini-status">{log.instanceName} · {log.taskTitle}</div>
              <div className="delta">{String(log.previousValue)} → {String(log.newValue)} ({log.delta > 0 ? `+${log.delta}` : log.delta})</div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
