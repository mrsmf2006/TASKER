import { FormEvent, useState } from 'react';
import { CapabilityFormula, ConceptClass, ConceptInstance, ConflictResolutionStrategy } from '../engine/types';

interface SettingsViewProps {
  classes: ConceptClass[];
  instances: ConceptInstance[];
  capabilities: CapabilityFormula[];
  onUpdateCapability: (capability: CapabilityFormula) => void;
  onUpdateClass: (concept: ConceptClass) => void;
  onCreateInstance: (instance: ConceptInstance) => void;
  onCreateClass: (concept: ConceptClass) => void;
  onReset: () => void;
}

export function SettingsView(props: SettingsViewProps) {
  const { classes, instances, capabilities, onUpdateCapability, onUpdateClass, onCreateInstance, onCreateClass, onReset } = props;
  const [capId, setCapId] = useState(capabilities[1]?.id ?? capabilities[0]?.id ?? '');
  const capability = capabilities.find((item) => item.id === capId) ?? capabilities[0];
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [name, setName] = useState('');
  const [lineage, setLineage] = useState<string[]>([]);
  const [conceptName, setConceptName] = useState('');
  const [conceptSlug, setConceptSlug] = useState('');

  const createInstance = (event: FormEvent) => {
    event.preventDefault();
    const concept = classes.find((item) => item.id === classId);
    if (!concept || !name.trim()) return;
    const attributeValues: Record<string, number> = {};
    concept.attributes.forEach((attr) => {
      attributeValues[attr.key] = Number(attr.defaultValue);
    });
    onCreateInstance({
      id: `inst-${crypto.randomUUID()}`,
      classId: concept.id,
      name: name.trim(),
      subtitle: `ساخته‌شده توسط مدیر · ارث از ${concept.name}`,
      attributeValues,
      customAttributes: {},
      lineageIds: lineage,
    });
    setName('');
    setLineage([]);
  };

  const createClass = (event: FormEvent) => {
    event.preventDefault();
    const slug = conceptSlug.trim().replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (!conceptName.trim() || !slug) return;
    onCreateClass({
      id: `cls-${crypto.randomUUID()}`,
      slug,
      name: conceptName.trim(),
      category: 'custom',
      color: '#f43f5e',
      icon: 'Layers',
      description: 'مفهومی که مدیر در تنظیمات ساخته است',
      parentClassIds: [],
      attributes: [
        {
          key: 'factor',
          label: 'ضریب مفهوم',
          type: 'number',
          defaultValue: 1,
          unit: 'ضریب',
          conflictStrategy: 'multiply',
        },
      ],
    });
    setConceptName('');
    setConceptSlug('');
  };

  return (
    <div className="page">
      <h1>تنظیمات</h1>
      <p className="lead">قالب مفهوم، قاعدهٔ تعارض و فرمول زمان و هزینه را مدیر همین‌جا عوض می‌کند. نتیجه روی گراف زنده است.</p>
      <div className="stack">
        <div>
          {capabilities.map((item) => (
            <button key={item.id} className={item.id === capability?.id ? 'cap-btn active' : 'cap-btn'} onClick={() => setCapId(item.id)}>
              <b>{item.name}</b>
              <div className="mini-status">{item.codeName}</div>
            </button>
          ))}
        </div>
        {capability && (
          <section className="panel">
            <h3>{capability.name}</h3>
            <FormulaField label="فرمول زمان" value={capability.timeFormula} onChange={(value) => onUpdateCapability({ ...capability, timeFormula: value })} />
            <FormulaField label="فرمول هزینه" value={capability.costFormula} onChange={(value) => onUpdateCapability({ ...capability, costFormula: value })} />
            <FormulaField label="فرمول بازدهی" value={capability.efficiencyFormula} onChange={(value) => onUpdateCapability({ ...capability, efficiencyFormula: value })} />
            <p className="hint">متغیرها: baseEffortHours، taskComplexity، priorityWeight، person.hourlyRate، knowledge.complexityFactor، project.riskMultiplier، department.toolingEfficiency، overheadMultiplier، computedHours</p>
          </section>
        )}
      </div>

      <div className="split" style={{ marginTop: 16 }}>
        <section className="panel">
          <h3>مفاهیم و قاعدهٔ تعارض</h3>
          {classes.map((concept) => (
            <article className="concept-card" key={concept.id}>
              <b style={{ color: concept.color }}>{concept.name}</b>
              <span className="mini-status"> .{concept.slug}</span>
              {concept.attributes.map((attr) => (
                <div className="attr-edit" key={attr.key}>
                  <span>{attr.label}</span>
                  <select
                    value={attr.conflictStrategy}
                    onChange={(event) =>
                      onUpdateClass({
                        ...concept,
                        attributes: concept.attributes.map((item) =>
                          item.key === attr.key
                            ? { ...item, conflictStrategy: event.target.value as ConflictResolutionStrategy }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="multiply">ضرب</option>
                    <option value="sum">جمع</option>
                    <option value="mro_first">اولویت زنجیره</option>
                    <option value="max">بیشینه</option>
                    <option value="min">کمینه</option>
                  </select>
                </div>
              ))}
            </article>
          ))}
          <form onSubmit={createClass} style={{ marginTop: 12 }}>
            <div className="field">
              <span>مفهوم تازه</span>
              <input value={conceptName} onChange={(event) => setConceptName(event.target.value)} placeholder="مثلاً قرارداد" />
            </div>
            <div className="field">
              <span>شناسهٔ انگلیسی برای فرمول</span>
              <input dir="ltr" value={conceptSlug} onChange={(event) => setConceptSlug(event.target.value)} placeholder="contract" />
            </div>
            <button className="primary" type="submit">ثبت مفهوم</button>
          </form>
        </section>

        <section className="panel">
          <h3>نمونهٔ تازه</h3>
          <form onSubmit={createInstance}>
            <div className="field">
              <span>از کدام مفهوم ارث ببرد</span>
              <select value={classId} onChange={(event) => setClassId(event.target.value)}>
                {classes.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>نام</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً رضا کریمی" />
            </div>
            <div className="field">
              <span>پیشینهٔ متصل</span>
              <div className="checks">
                {instances.map((instance) => (
                  <label key={instance.id}>
                    <input
                      type="checkbox"
                      checked={lineage.includes(instance.id)}
                      onChange={() =>
                        setLineage((prev) => prev.includes(instance.id) ? prev.filter((id) => id !== instance.id) : [...prev, instance.id])
                      }
                    />
                    {instance.name}
                  </label>
                ))}
              </div>
            </div>
            <button className="primary" type="submit">افزودن به موجودیت‌ها</button>
          </form>
          <button className="ghost" style={{ marginTop: 18 }} onClick={onReset}>بازگشت به وضعیت اولیهٔ دمو</button>
        </section>
      </div>
    </div>
  );
}

function FormulaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input dir="ltr" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
