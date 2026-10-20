/**
 * Rich Initial Domain Model matching the exact scenario discussed:
 *
 * 1. Concept Classes (قالب‌های مفهوم تعریف‌شده توسط مدیر):
 *    - آدم‌ها (`person`)
 *    - واحدها (`department`)
 *    - پروژه‌ها (`project`)
 *    - دانش (`knowledge`)
 *    - منابع زیرساخت (`resource`)
 *
 * 2. Concept Instances (نمونه‌های شیءگرا با ارث‌بری، ویژگی‌های اختصاصی و پیشینه متصل):
 *    - علی راد (ارث‌برده از `آدم‌ها` + پیشینه متصل به `واحد فنی و مهندسی` و `پروژه کلان تحول دیجیتال`)
 *    - سارا نیکنام (ارث‌برده از `آدم‌ها` + پیشینه متصل به `واحد محصول و طراحی`)
 *    - واحد فنی و مهندسی (`department`)
 *    - واحد محصول و طراحی (`department`)
 *    - پروژه کلان تحول دیجیتال و برند (`project` — که سایت بخشی از آن است)
 *    - دانش سازمانی و استانداردهای فنی شرکت (`knowledge`)
 *    - کلاستر ابری و CI/CD (`resource`)
 *
 * 3. Manager Capabilities / Formulas (کارایی‌ها و فرمول‌های مدیر):
 *    - کارایی تحقیق و تدوین معماری (تولیدکنندهٔ آبجکت `دانش: سند معماری سایت`)
 *    - کارایی توسعه و پیاده‌سازی سامانه وب (مصرف‌کنندهٔ خروجی تسک تحقیق + علی + پروژه کلان)
 *    - کارایی استقرار و بهره‌برداری نهایی
 */

import {
  CapabilityFormula,
  ConceptClass,
  ConceptInstance,
  GraphConnection,
  TaskNode,
} from './types';

export const INITIAL_CONCEPT_CLASSES: ConceptClass[] = [
  {
    id: 'cls-person',
    slug: 'person',
    name: 'آدم‌ها (نیروی انسانی)',
    category: 'human',
    color: '#38bdf8', // Sky Blue (Blender Geometry Socket style)
    icon: 'User',
    description: 'قالب پایه برای اعضای سازمان؛ هر فرد از این مفهوم ارث می‌برد و می‌تواند ویژگی‌های اختصاصی و پیشینهٔ سازمانی داشته باشد.',
    parentClassIds: [],
    attributes: [
      {
        key: 'hourlyRate',
        label: 'نرخ ساعتی پایه',
        type: 'number',
        defaultValue: 450,
        unit: 'هزار تومان/ساعت',
        conflictStrategy: 'sum',
        description: 'هزینه هر ساعت کارکرد فرد',
      },
      {
        key: 'velocityFactor',
        label: 'ضریب سرعت و مهارت اجرا',
        type: 'number',
        defaultValue: 1.0,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
        description: 'ضریب سرعت انجام تسک (بالاتر از ۱ یعنی سریع‌تر)',
      },
      {
        key: 'experiencePoints',
        label: 'امتیاز تجربه انباشته (XP)',
        type: 'number',
        defaultValue: 100,
        unit: 'امتیاز',
        conflictStrategy: 'max',
        description: 'با تکمیل هر تسک از طریق قوانین تغییر وضعیت افزایش می‌یابد',
      },
      {
        key: 'overheadMultiplier',
        label: 'ضریب سربار هماهنگی',
        type: 'number',
        defaultValue: 1.05,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
    ],
  },
  {
    id: 'cls-department',
    slug: 'department',
    name: 'واحدها (دپارتمان سازمانی)',
    category: 'department',
    color: '#a855f7', // Purple Socket
    icon: 'Building2',
    description: 'واحدهای سازمانی که ضریب سربار، استاندارد کیفی و ظرفیت ابزار را به افراد و تسک‌ها منتقل می‌کنند.',
    parentClassIds: [],
    attributes: [
      {
        key: 'overheadMultiplier',
        label: 'ضریب سربار سازمانی',
        type: 'number',
        defaultValue: 1.2,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
        description: 'سربار اداری/فنی واحد که با سایر سربارها ترکیب می‌شود',
      },
      {
        key: 'toolingEfficiency',
        label: 'راندمان ابزارهای واحد',
        type: 'number',
        defaultValue: 1.15,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
      {
        key: 'activeLoadHours',
        label: 'بار کاری تجمعی واحد',
        type: 'number',
        defaultValue: 40,
        unit: 'ساعت',
        conflictStrategy: 'sum',
      },
    ],
  },
  {
    id: 'cls-project',
    slug: 'project',
    name: 'پروژه‌ها (پروژه کلان)',
    category: 'project',
    color: '#f59e0b', // Amber Socket
    icon: 'Briefcase',
    description: 'پروژه‌های کلان که بودجه، ضریب ریسک و اولویت استراتژیک را به تسک‌های زیرمجموعه (مثل سایت) به ارث می‌دهند.',
    parentClassIds: [],
    attributes: [
      {
        key: 'remainingBudget',
        label: 'بودجه باقی‌مانده پروژه',
        type: 'number',
        defaultValue: 120000,
        unit: 'هزار تومان',
        conflictStrategy: 'min',
        description: 'با تکمیل هر تسک، هزینهٔ واقعی تسک از این بودجه کسر می‌شود',
      },
      {
        key: 'riskMultiplier',
        label: 'ضریب ریسک و حساسیت پروژه',
        type: 'number',
        defaultValue: 1.25,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
      {
        key: 'overheadMultiplier',
        label: 'ضریب سربار مدیریت پروژه',
        type: 'number',
        defaultValue: 1.1,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
      {
        key: 'completedDeliverables',
        label: 'تعداد خروجی‌های تحویل‌شده',
        type: 'number',
        defaultValue: 0,
        unit: 'مورد',
        conflictStrategy: 'sum',
      },
    ],
  },
  {
    id: 'cls-knowledge',
    slug: 'knowledge',
    name: 'دانش و اسناد (Knowledge)',
    category: 'knowledge',
    color: '#10b981', // Emerald Green Socket
    icon: 'BookOpen',
    description: 'دانش شرکت، اسناد معماری و مستندات فنی که هم ورودی تسک‌ها هستند و هم می‌توانند خروجی یک تسک برای تسک بعدی باشند.',
    parentClassIds: [],
    attributes: [
      {
        key: 'complexityFactor',
        label: 'ضریب پیچیدگی فنی سند',
        type: 'number',
        defaultValue: 1.3,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
      {
        key: 'learningCurveHours',
        label: 'زمان مطالعه و تسلط (پیش‌نیاز)',
        type: 'number',
        defaultValue: 4,
        unit: 'ساعت',
        conflictStrategy: 'sum',
      },
      {
        key: 'reusabilityScore',
        label: 'ضریب بازاستفاده و بلوغ دانش',
        type: 'number',
        defaultValue: 1.1,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
    ],
  },
  {
    id: 'cls-resource',
    slug: 'resource',
    name: 'منابع و زیرساخت (Resource)',
    category: 'resource',
    color: '#ec4899', // Pink Socket
    icon: 'Cpu',
    description: 'منابع سخت‌افزاری، سرورهای ابری یا ابزارهای مصرفی که هزینهٔ ساعتی و شتاب پردازشی دارند.',
    parentClassIds: [],
    attributes: [
      {
        key: 'hourlyCost',
        label: 'هزینه مصرف ساعتی منبع',
        type: 'number',
        defaultValue: 120,
        unit: 'هزار تومان/ساعت',
        conflictStrategy: 'sum',
      },
      {
        key: 'accelerationFactor',
        label: 'ضریب شتاب‌دهی زیرساخت',
        type: 'number',
        defaultValue: 1.2,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
    ],
  },
];

export const INITIAL_CONCEPT_INSTANCES: ConceptInstance[] = [
  {
    id: 'inst-dept-tech',
    classId: 'cls-department',
    name: 'واحد فنی و مهندسی',
    subtitle: 'دپارتمان توسعه نرم‌افزار و زیرساخت',
    attributeValues: {
      overheadMultiplier: 1.15,
      toolingEfficiency: 1.25,
      activeLoadHours: 64,
    },
    customAttributes: {},
    lineageIds: [],
  },
  {
    id: 'inst-dept-product',
    classId: 'cls-department',
    name: 'واحد محصول و تجربه کاربری',
    subtitle: 'دپارتمان تحلیل، طراحی و معماری اطلاعات',
    attributeValues: {
      overheadMultiplier: 1.1,
      toolingEfficiency: 1.2,
      activeLoadHours: 32,
    },
    customAttributes: {},
    lineageIds: [],
  },
  {
    id: 'inst-proj-brand',
    classId: 'cls-project',
    name: 'پروژه کلان تحول دیجیتال برند',
    subtitle: 'پروژه مادر که «سایت جدید» یک بخش از آن است',
    attributeValues: {
      remainingBudget: 150000,
      riskMultiplier: 1.2,
      overheadMultiplier: 1.1,
      completedDeliverables: 1,
    },
    customAttributes: {
      strategicBonus: {
        label: 'ضریب اهمیت استراتژیک هیئت‌مدیره',
        value: 1.15,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
    },
    lineageIds: [],
  },
  {
    id: 'inst-person-ali',
    classId: 'cls-person',
    name: 'علی راد (Senior Full-Stack)',
    subtitle: 'ارث‌برده از «آدم‌ها» + متصل به پیشینهٔ واحد فنی و پروژه برند',
    attributeValues: {
      hourlyRate: 650,
      velocityFactor: 1.35,
      experiencePoints: 180,
      overheadMultiplier: 1.05,
    },
    customAttributes: {
      frontendMastery: {
        label: 'تسلط اختصاصی معماری وب (ویژگی شخصی علی)',
        value: 1.25,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
    },
    // پیشینه متصل علی: واحد فنی + پروژه کلان برند
    lineageIds: ['inst-dept-tech', 'inst-proj-brand'],
  },
  {
    id: 'inst-person-sara',
    classId: 'cls-person',
    name: 'سارا نیکنام (System Architect)',
    subtitle: 'ارث‌برده از «آدم‌ها» + متصل به پیشینهٔ واحد محصول',
    attributeValues: {
      hourlyRate: 580,
      velocityFactor: 1.25,
      experiencePoints: 150,
      overheadMultiplier: 1.04,
    },
    customAttributes: {
      domainResearchSkill: {
        label: 'مهارت استخراج دانش دامنه',
        value: 1.3,
        unit: 'ضریب',
        conflictStrategy: 'multiply',
      },
    },
    lineageIds: ['inst-dept-product'],
  },
  {
    id: 'inst-know-company',
    classId: 'cls-knowledge',
    name: 'دانش پایه شرکت و استانداردهای برند',
    subtitle: 'مخزن دانش سازمانی و گایدلاین‌های موجود شرکت',
    attributeValues: {
      complexityFactor: 1.15,
      learningCurveHours: 3,
      reusabilityScore: 1.2,
    },
    customAttributes: {},
    lineageIds: [],
  },
  {
    id: 'inst-res-cloud',
    classId: 'cls-resource',
    name: 'کلاستر ابری و پایپ‌لاین CI/CD',
    subtitle: 'منبع پردازشی و استقرار خودکار',
    attributeValues: {
      hourlyCost: 140,
      accelerationFactor: 1.25,
    },
    customAttributes: {},
    lineageIds: ['inst-dept-tech'],
  },
];

export const INITIAL_CAPABILITIES: CapabilityFormula[] = [
  {
    id: 'cap-research-doc',
    name: 'کارایی تحلیل و تولید سند معماری',
    codeName: 'fn_architectural_discovery',
    description: 'ترکیب یک نفر + دانش پایه شرکت + پروژه مادر برای استخراج و تولید یک آبجکت جدید از جنس «دانش (سند معماری سایت)».',
    color: '#10b981',
    requiredConceptSlugs: ['person', 'knowledge', 'project'],
    timeFormula: 'round((baseEffortHours * taskComplexity * knowledge.complexityFactor) / person.velocityFactor + knowledge.learningCurveHours)',
    costFormula: 'round(computedHours * person.hourlyRate * overheadMultiplier)',
    efficiencyFormula: 'round(100 * person.velocityFactor * department.toolingEfficiency / taskComplexity)',
    mutations: [
      {
        id: 'mut-res-1',
        label: 'کسر هزینه تحقیق از بودجه پروژه مادر',
        targetConceptSlug: 'project',
        targetAttributeKey: 'remainingBudget',
        operation: 'subtract',
        valueExpression: 'computedCost',
      },
      {
        id: 'mut-res-2',
        label: 'افزایش تجربه (XP) فرد تحلیل‌گر',
        targetConceptSlug: 'person',
        targetAttributeKey: 'experiencePoints',
        operation: 'add',
        valueExpression: 'round(computedHours * 1.5)',
      },
      {
        id: 'mut-res-3',
        label: 'ثبت ساعات کارکرد روی بار واحد سازمانی',
        targetConceptSlug: 'department',
        targetAttributeKey: 'activeLoadHours',
        operation: 'add',
        valueExpression: 'computedHours',
      },
    ],
    outputArtifact: {
      enabled: true,
      outputConceptClassId: 'cls-knowledge',
      outputNameTemplate: 'سند معماری و طراحی سایت (خروجی: {{taskTitle}})',
      initialAttributeExpressions: {
        complexityFactor: '1.25',
        learningCurveHours: '2',
        reusabilityScore: '1.4',
      },
    },
  },
  {
    id: 'cap-web-implementation',
    name: 'کارایی توسعه و مهندسی تسک سایت',
    codeName: 'fn_site_engineering',
    description: 'فرمول ترکیبی مدیر برای «تسک سایت»: ارث‌بری هم‌زمان از علی (با پیشینه واحد فنی و پروژه)، سند معماری سایت و پروژه کلان.',
    color: '#38bdf8',
    requiredConceptSlugs: ['person', 'knowledge', 'project'],
    timeFormula: 'round(((baseEffortHours * taskComplexity * knowledge.complexityFactor * project.riskMultiplier) / (person.velocityFactor * department.toolingEfficiency)) + knowledge.learningCurveHours)',
    costFormula: 'round(computedHours * person.hourlyRate * overheadMultiplier)',
    efficiencyFormula: 'round(100 * (person.velocityFactor * department.toolingEfficiency * knowledge.reusabilityScore) / project.riskMultiplier)',
    mutations: [
      {
        id: 'mut-web-1',
        label: 'کسر هزینه توسعه سایت از بودجه پروژه کلان',
        targetConceptSlug: 'project',
        targetAttributeKey: 'remainingBudget',
        operation: 'subtract',
        valueExpression: 'computedCost',
      },
      {
        id: 'mut-web-2',
        label: 'افزایش امتیاز تجربه (XP) علی پس از توسعه سایت',
        targetConceptSlug: 'person',
        targetAttributeKey: 'experiencePoints',
        operation: 'add',
        valueExpression: 'round(computedHours * 2)',
      },
      {
        id: 'mut-web-3',
        label: 'افزایش تعداد خروجی‌های تحویل‌شده پروژه مادر',
        targetConceptSlug: 'project',
        targetAttributeKey: 'completedDeliverables',
        operation: 'add',
        valueExpression: '1',
      },
      {
        id: 'mut-web-4',
        label: 'افزایش بار کاری ثبت‌شده واحد فنی',
        targetConceptSlug: 'department',
        targetAttributeKey: 'activeLoadHours',
        operation: 'add',
        valueExpression: 'computedHours',
      },
    ],
    outputArtifact: {
      enabled: true,
      outputConceptClassId: 'cls-knowledge',
      outputNameTemplate: 'بسته اجرایی و دانش فنی سایت (خروجی: {{taskTitle}})',
      initialAttributeExpressions: {
        complexityFactor: '1.1',
        learningCurveHours: '1',
        reusabilityScore: '1.5',
      },
    },
  },
  {
    id: 'cap-cloud-release',
    name: 'کارایی استقرار ابری و انتشار نهایی',
    codeName: 'fn_cloud_deployment',
    description: 'ترکیب خروجی تسک سایت + زیرساخت ابری + علی برای استقرار نهایی محصول در محیط عملیاتی.',
    color: '#f59e0b',
    requiredConceptSlugs: ['person', 'knowledge', 'resource', 'project'],
    timeFormula: 'round((baseEffortHours * taskComplexity) / (person.velocityFactor * resource.accelerationFactor) + knowledge.learningCurveHours)',
    costFormula: 'round(computedHours * (person.hourlyRate + resource.hourlyCost) * overheadMultiplier)',
    efficiencyFormula: 'round(100 * resource.accelerationFactor * person.velocityFactor)',
    mutations: [
      {
        id: 'mut-dep-1',
        label: 'کسر هزینه استقرار و سرور از بودجه پروژه کلان',
        targetConceptSlug: 'project',
        targetAttributeKey: 'remainingBudget',
        operation: 'subtract',
        valueExpression: 'computedCost',
      },
      {
        id: 'mut-dep-2',
        label: 'ثبت تحویل نهایی روی پروژه کلان',
        targetConceptSlug: 'project',
        targetAttributeKey: 'completedDeliverables',
        operation: 'add',
        valueExpression: '1',
      },
    ],
    outputArtifact: {
      enabled: true,
      outputConceptClassId: 'cls-knowledge',
      outputNameTemplate: 'سرویس آنلاین سایت و مستندات بهره‌برداری',
      initialAttributeExpressions: {
        complexityFactor: '1.0',
        learningCurveHours: '1',
        reusabilityScore: '1.6',
      },
    },
  },
];

export const INITIAL_TASKS: TaskNode[] = [
  {
    id: 'task-architecture-doc',
    title: '۱. تسک تدوین سند معماری سایت',
    description: 'سارا با ترکیب «دانش پایه شرکت» و «پروژه کلان برند»، خروجیِ «سند معماری سایت» را تولید می‌کند که به ورودی تسک سایت وصل است.',
    capabilityId: 'cap-research-doc',
    status: 'ready',
    position: { x: 470, y: 70 },
    parameters: {
      baseEffortHours: 14,
      taskComplexity: 1.15,
      priorityWeight: 1.2,
      customParams: {},
    },
  },
  {
    id: 'task-website-main',
    title: '۲. تسک طراحی و توسعه سایت',
    description: 'مثال اصلی: ارث‌بری هم‌زمان از «علی» (که خودش از آدم‌ها ارث برده و پیشینهٔ واحد فنی و پروژه برند را دارد)، «دانش شرکت + سند معماری سایت» و «پروژه کلان برند».',
    capabilityId: 'cap-web-implementation',
    status: 'locked', // Locked until Task 1 produces the Site Architecture Document!
    position: { x: 960, y: 210 },
    parameters: {
      baseEffortHours: 28,
      taskComplexity: 1.25,
      priorityWeight: 1.5,
      customParams: {},
    },
  },
  {
    id: 'task-site-deploy',
    title: '۳. تسک استقرار ابری و لانچ سایت',
    description: 'دریافت خروجیِ تسک توسعه سایت + اتصال کلاستر ابری CI/CD + علی برای انتشار نهایی و به‌روزرسانی بودجه پروژه.',
    capabilityId: 'cap-cloud-release',
    status: 'locked',
    position: { x: 1450, y: 290 },
    parameters: {
      baseEffortHours: 12,
      taskComplexity: 1.1,
      priorityWeight: 1.3,
      customParams: {},
    },
  },
];

export const INITIAL_CONNECTIONS: GraphConnection[] = [
  // Connections into Task 1 (Architecture Doc)
  {
    id: 'conn-sara-to-t1',
    sourceType: 'instance',
    sourceId: 'inst-person-sara',
    sourceSocketKey: 'out',
    targetTaskId: 'task-architecture-doc',
    targetSocketSlug: 'person',
  },
  {
    id: 'conn-company-know-to-t1',
    sourceType: 'instance',
    sourceId: 'inst-know-company',
    sourceSocketKey: 'out',
    targetTaskId: 'task-architecture-doc',
    targetSocketSlug: 'knowledge',
  },
  {
    id: 'conn-brand-proj-to-t1',
    sourceType: 'instance',
    sourceId: 'inst-proj-brand',
    sourceSocketKey: 'out',
    targetTaskId: 'task-architecture-doc',
    targetSocketSlug: 'project',
  },

  // Connections into Task 2 (تسک سایت - Main Example)
  {
    id: 'conn-ali-to-t2',
    sourceType: 'instance',
    sourceId: 'inst-person-ali',
    sourceSocketKey: 'out',
    targetTaskId: 'task-website-main',
    targetSocketSlug: 'person',
  },
  {
    id: 'conn-company-know-to-t2',
    sourceType: 'instance',
    sourceId: 'inst-know-company',
    sourceSocketKey: 'out',
    targetTaskId: 'task-website-main',
    targetSocketSlug: 'knowledge',
  },
  {
    id: 'conn-t1-output-to-t2',
    sourceType: 'task_output',
    sourceId: 'task-architecture-doc',
    sourceSocketKey: 'artifact_out',
    targetTaskId: 'task-website-main',
    targetSocketSlug: 'knowledge',
  },
  {
    id: 'conn-brand-proj-to-t2',
    sourceType: 'instance',
    sourceId: 'inst-proj-brand',
    sourceSocketKey: 'out',
    targetTaskId: 'task-website-main',
    targetSocketSlug: 'project',
  },

  // Connections into Task 3 (Cloud Deployment)
  {
    id: 'conn-t2-output-to-t3',
    sourceType: 'task_output',
    sourceId: 'task-website-main',
    sourceSocketKey: 'artifact_out',
    targetTaskId: 'task-site-deploy',
    targetSocketSlug: 'knowledge',
  },
  {
    id: 'conn-ali-to-t3',
    sourceType: 'instance',
    sourceId: 'inst-person-ali',
    sourceSocketKey: 'out',
    targetTaskId: 'task-site-deploy',
    targetSocketSlug: 'person',
  },
  {
    id: 'conn-cloud-to-t3',
    sourceType: 'instance',
    sourceId: 'inst-res-cloud',
    sourceSocketKey: 'out',
    targetTaskId: 'task-site-deploy',
    targetSocketSlug: 'resource',
  },
  {
    id: 'conn-brand-proj-to-t3',
    sourceType: 'instance',
    sourceId: 'inst-proj-brand',
    sourceSocketKey: 'out',
    targetTaskId: 'task-site-deploy',
    targetSocketSlug: 'project',
  },
];
