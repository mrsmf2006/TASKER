import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  BookOpen,
  Briefcase,
  Building2,
  Cpu,
  GitBranch,
  Layers,
  Sparkles,
  User,
} from 'lucide-react';
import { ConceptClass, ConceptInstance } from '../../engine/types';

export interface InstanceNodeData extends Record<string, unknown> {
  instance: ConceptInstance;
  conceptClass: ConceptClass;
  lineageInstances: ConceptInstance[];
  isSelected: boolean;
  onSelectInstance: (instanceId: string) => void;
}

const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({
  iconName,
  className = 'w-4 h-4',
}) => {
  switch (iconName) {
    case 'User':
      return <User className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    default:
      return <Layers className={className} />;
  }
};

export const ConceptInstanceNode: React.FC<{ data: InstanceNodeData }> = ({ data }) => {
  const { instance, conceptClass, lineageInstances, isSelected, onSelectInstance } = data;

  return (
    <div
      onClick={() => onSelectInstance(instance.id)}
      style={{
        borderColor: isSelected ? conceptClass.color : 'rgba(148, 163, 184, 0.22)',
        boxShadow: isSelected
          ? `0 0 0 2px ${conceptClass.color}40, 0 16px 35px -10px rgba(0,0,0,0.7)`
          : '0 12px 28px -8px rgba(0,0,0,0.65)',
      }}
      className="w-[270px] rounded-xl bg-[#161922]/95 backdrop-blur-md border transition-all duration-150 cursor-pointer select-none overflow-visible"
      dir="rtl"
    >
      {/* Blender Geometry Nodes Style Coloured Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${conceptClass.color}dd, ${conceptClass.color}88)`,
        }}
        className="px-3 py-2 rounded-t-[11px] flex items-center justify-between text-slate-950 font-bold"
      >
        <div className="flex items-center gap-1.5 truncate">
          <CategoryIcon iconName={conceptClass.icon} className="w-4 h-4 shrink-0" />
          <span className="text-xs tracking-tight truncate">{instance.name}</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/25 text-white font-mono">
          :{conceptClass.slug}
        </span>
      </div>

      {/* Inheritance Subtitle */}
      <div className="px-3 py-1.5 bg-[#11131a] border-b border-slate-800/80 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 flex items-center gap-1">
          <span>ارث‌برده از:</span>
          <strong className="text-slate-200">{conceptClass.name}</strong>
        </span>
        {instance.generatedByTaskId && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" />
            تولیدشده
          </span>
        )}
      </div>

      {/* Attributes List */}
      <div className="p-2.5 space-y-1.5 text-xs">
        {conceptClass.attributes.map((attr) => {
          const val =
            instance.attributeValues[attr.key] !== undefined
              ? instance.attributeValues[attr.key]
              : attr.defaultValue;
          return (
            <div
              key={attr.key}
              className="flex items-center justify-between bg-[#1d212d] px-2 py-1 rounded border border-slate-800/70"
            >
              <span className="text-slate-300 text-[11px] truncate">{attr.label}</span>
              <span className="font-mono text-[11px] text-emerald-300 font-semibold">
                {String(val)}{' '}
                {attr.unit && <span className="text-[9px] text-slate-400">{attr.unit}</span>}
              </span>
            </div>
          );
        })}

        {/* Instance Custom Overrides */}
        {Object.entries(instance.customAttributes).map(([k, custom]) => (
          <div
            key={k}
            className="flex items-center justify-between bg-sky-950/30 px-2 py-1 rounded border border-sky-500/30"
          >
            <span className="text-sky-200 text-[10px] truncate">★ {custom.label}</span>
            <span className="font-mono text-[11px] text-sky-300 font-semibold">
              {String(custom.value)}
            </span>
          </div>
        ))}

        {/* Connected Lineage (پیشینه متصل) */}
        {lineageInstances.length > 0 && (
          <div className="pt-1.5 mt-1.5 border-t border-slate-800/90">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-purple-400" />
              <span>پیشینهٔ متصل (همراه شیء منتقل می‌شود):</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {lineageInstances.map((lin) => (
                <span
                  key={lin.id}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200"
                >
                  {lin.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Output Socket (Right side for LTR flow / connects into Task Input Sockets) */}
      <div className="px-3 py-1.5 bg-[#12151e] rounded-b-[11px] border-t border-slate-800/80 flex items-center justify-between relative">
        <span className="text-[10px] text-slate-400">سوکت خروجی نمونه</span>
        <span
          style={{ color: conceptClass.color }}
          className="text-[10px] font-mono font-semibold"
        >
          {conceptClass.slug} ●
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{
            background: conceptClass.color,
            width: 13,
            height: 13,
            border: '2px solid #0d0f14',
            right: -7,
          }}
        />
      </div>
    </div>
  );
};
