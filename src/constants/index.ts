import {
  Database,
  FileText,
  Settings,
  Sliders,
  Sparkles,
  Wand2,
} from "lucide-react";

export type TEntity = "clients" | "workers" | "tasks";

export const TabItems = [
  { value: "ingestion", label: "Data Ingestion", icon: Database },
  { value: "validation", label: "Validation", icon: Settings },
  { value: "search", label: "AI Search", icon: Sparkles },
  { value: "export", label: "Export", icon: FileText },
  { value: "rules", label: "Rules", icon: Settings },
  { value: "prioritization", label: "Weights", icon: Sliders },
  { value: "corrections", label: "AI Fixes", icon: Wand2 },
];

export const Presets = {
  "maximize-fulfillment": {
    name: "Maximize Fulfillment",
    description: "Focus on completing as many client requests as possible",
    weights: {
      priorityLevel: 15,
      taskFulfillment: 40,
      fairnessConstraints: 10,
      workloadBalance: 15,
      skillMatching: 15,
      phasePreference: 5,
    },
  },
  "fair-distribution": {
    name: "Fair Distribution",
    description: "Ensure equitable resource allocation across all clients",
    weights: {
      priorityLevel: 20,
      taskFulfillment: 20,
      fairnessConstraints: 35,
      workloadBalance: 15,
      skillMatching: 10,
      phasePreference: 0,
    },
  },
  "minimize-workload": {
    name: "Minimize Workload",
    description: "Optimize for balanced worker utilization",
    weights: {
      priorityLevel: 10,
      taskFulfillment: 20,
      fairnessConstraints: 15,
      workloadBalance: 40,
      skillMatching: 10,
      phasePreference: 5,
    },
  },
  "priority-focused": {
    name: "Priority Focused",
    description: "Heavily weight client priority levels",
    weights: {
      priorityLevel: 45,
      taskFulfillment: 25,
      fairnessConstraints: 10,
      workloadBalance: 10,
      skillMatching: 10,
      phasePreference: 0,
    },
  },
  "skill-optimized": {
    name: "Skill Optimized",
    description: "Optimize for best skill-task matching",
    weights: {
      priorityLevel: 15,
      taskFulfillment: 20,
      fairnessConstraints: 10,
      workloadBalance: 15,
      skillMatching: 35,
      phasePreference: 5,
    },
  },
};

export const CriteriaInfo = {
  priorityLevel: {
    name: "Priority Level",
    description: "Weight given to client priority levels (1-5)",
    icon: "🎯",
  },
  taskFulfillment: {
    name: "Task Fulfillment",
    description: "Importance of completing requested tasks",
    icon: "✅",
  },
  fairnessConstraints: {
    name: "Fairness Constraints",
    description: "Ensuring equitable distribution across clients",
    icon: "⚖️",
  },
  workloadBalance: {
    name: "Workload Balance",
    description: "Balancing load across workers and phases",
    icon: "📊",
  },
  skillMatching: {
    name: "Skill Matching",
    description: "Matching tasks to workers with optimal skills",
    icon: "🎯",
  },
  phasePreference: {
    name: "Phase Preference",
    description: "Respecting preferred phases for tasks",
    icon: "📅",
  },
};

export const RuleTypes = [
  {
    value: "coRun",
    label: "Co-Run Tasks",
    description: "Tasks that must run together",
  },
  {
    value: "slotRestriction",
    label: "Slot Restriction",
    description: "Limit slots for groups",
  },
  {
    value: "loadLimit",
    label: "Load Limit",
    description: "Maximum load per phase",
  },
  {
    value: "phaseWindow",
    label: "Phase Window",
    description: "Restrict tasks to specific phases",
  },
  {
    value: "patternMatch",
    label: "Pattern Match",
    description: "Regex-based rules",
  },
  {
    value: "precedenceOverride",
    label: "Precedence Override",
    description: "Priority overrides",
  },
];
