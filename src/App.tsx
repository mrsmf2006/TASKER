import { useMemo, useState } from 'react';
import { DashboardView } from './components/DashboardView';
import { GraphWorkspace } from './components/GraphWorkspace';
import { SettingsView } from './components/SettingsView';
import { TopBar } from './components/TopBar';
import { executeTaskCompletion, evaluateTaskGraph } from './engine/dataflow';
import { createOpeningState } from './engine/opening';
import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  GraphConnection,
  MutationExecutionLog,
  TaskNode,
} from './engine/types';
import { ThemeName, ViewId } from './ui/display';

export default function App() {
  const [opening] = useState(createOpeningState);
  const [classes, setClasses] = useState<ConceptClass[]>(opening.classes);
  const [instances, setInstances] = useState<ConceptInstance[]>(opening.instances);
  const [capabilities, setCapabilities] = useState<CapabilityFormula[]>(opening.capabilities);
  const [connections, setConnections] = useState<GraphConnection[]>(opening.connections);
  const [tasks, setTasks] = useState<TaskNode[]>(opening.tasks);
  const [logs, setLogs] = useState<MutationExecutionLog[]>([...opening.logs].reverse());
  const [view, setView] = useState<ViewId>('graph');
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [help, setHelp] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('task-website-main');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  const evaluations = useMemo(
    () => evaluateTaskGraph(tasks, connections, instances, classes, capabilities),
    [tasks, connections, instances, classes, capabilities],
  );

  const applyTheme = (next: ThemeName) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  const complete = (taskId: string) => {
    const result = executeTaskCompletion({
      taskId,
      tasks,
      connections,
      instances,
      classes,
      capabilities,
    });
    setTasks(result.updatedTasks);
    setInstances(result.updatedInstances);
    setLogs((prev) => [...result.newLogs].reverse().concat(prev));
  };

  return (
    <div className="app">
      <TopBar
        view={view}
        theme={theme}
        onView={setView}
        onTheme={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
        onHelp={() => setHelp(true)}
      />
      {view === 'graph' && (
        <GraphWorkspace
          classes={classes}
          instances={instances}
          capabilities={capabilities}
          tasks={tasks}
          connections={connections}
          evaluations={evaluations}
          selectedTaskId={selectedTaskId}
          selectedInstanceId={selectedInstanceId}
          onSelectTask={(id) => {
            setSelectedTaskId(id);
            setSelectedInstanceId(null);
          }}
          onSelectInstance={(id) => {
            setSelectedInstanceId(id);
            setSelectedTaskId(null);
          }}
          onStart={(id) =>
            setTasks((prev) =>
              prev.map((task) =>
                task.id === id && task.status !== 'completed' ? { ...task, status: 'in_progress' } : task,
              ),
            )
          }
          onComplete={complete}
          onParam={(id, key, value) =>
            setTasks((prev) =>
              prev.map((task) =>
                task.id === id ? { ...task, parameters: { ...task.parameters, [key]: value } } : task,
              ),
            )
          }
          onConnect={(connection) => setConnections((prev) => [...prev, connection])}
          onDisconnect={(id) => setConnections((prev) => prev.filter((item) => item.id !== id))}
          onUpdateInstance={(instanceId, key, value) =>
            setInstances((prev) =>
              prev.map((instance) =>
                instance.id === instanceId
                  ? { ...instance, attributeValues: { ...instance.attributeValues, [key]: value } }
                  : instance,
              ),
            )
          }
        />
      )}
      {view === 'dashboard' && (
        <DashboardView
          classes={classes}
          instances={instances}
          tasks={tasks}
          evaluations={evaluations}
          logs={logs}
          onStart={(id) =>
            setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: 'in_progress' } : task)))
          }
          onComplete={complete}
        />
      )}
      {view === 'settings' && (
        <SettingsView
          classes={classes}
          instances={instances}
          capabilities={capabilities}
          onUpdateCapability={(capability) =>
            setCapabilities((prev) => prev.map((item) => (item.id === capability.id ? capability : item)))
          }
          onUpdateClass={(concept) => setClasses((prev) => prev.map((item) => (item.id === concept.id ? concept : item)))}
          onCreateInstance={(instance) => setInstances((prev) => [...prev, instance])}
          onCreateClass={(concept) => setClasses((prev) => [...prev, concept])}
          onReset={() => {
            const next = createOpeningState();
            setClasses(next.classes);
            setInstances(next.instances);
            setCapabilities(next.capabilities);
            setConnections(next.connections);
            setTasks(next.tasks);
            setLogs([...next.logs].reverse());
            setSelectedTaskId('task-website-main');
            setSelectedInstanceId(null);
            setView('graph');
          }}
        />
      )}
      {help && (
        <div className="modal-back" onClick={() => setHelp(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>این صفحه چطور کار می‌کند</h3>
            <p>ستون چپ موجودیت‌های سازمان است: آدم، واحد، پروژه، دانش و منبع. هر کارت از یک مفهوم ارث برده و مقدارهای خودش را دارد.</p>
            <p>سیم رنگی یعنی اتصال مستقیم به تسک. اگر علی به واحد فنی وصل باشد، آن واحد پیشینهٔ اوست و بدون سیم جدا وارد همان تسک می‌شود. زنجیره‌اش در بازرس سمت راست است.</p>
            <p>دکمهٔ in progress را بزنید تا تسک تمام شود: هزینه از بودجهٔ پروژه کم می‌شود، تجربهٔ آدم زیاد می‌شود و خروجی دانش برای تسک بعدی آزاد می‌شود. تسک قفل تا آن لحظه locked می‌ماند.</p>
            <p>فرمول زمان و هزینه و قاعدهٔ تعارض را در تنظیمات عوض کنید. اعداد گراف همان لحظه عوض می‌شوند.</p>
            <button className="primary" onClick={() => setHelp(false)}>باشه</button>
          </div>
        </div>
      )}
    </div>
  );
}
