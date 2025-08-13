import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateRule(rule: any, dataset: any) {
  if (
    !["coRun", "loadLimit", "phaseWindow", "slotRestriction"].includes(
      rule.type
    )
  )
    return "Invalid rule type";
  if (!rule.name?.trim()) return "Name is required";
  if (isNaN(rule.priority) || rule.priority < 1 || rule.priority > 10)
    return "Priority must be between 1 and 10";

  switch (rule.type) {
    case "coRun":
      if (
        !Array.isArray(rule.parameters.tasks) ||
        rule.parameters.tasks.length < 2
      )
        return "coRun must have >= 2 tasks";
      if (
        !rule.parameters.tasks.every((t: string) => dataset.tasks.includes(t))
      )
        return "Invalid task IDs in coRun";
      break;

    case "loadLimit":
      if (!dataset.workers.includes(rule.parameters.workerGroup))
        return "Invalid workerGroup";
      if (rule.parameters.maxSlotsPerPhase <= 0)
        return "maxSlotsPerPhase must be > 0";
      break;

    case "phaseWindow":
      if (!dataset.tasks.includes(rule.parameters.taskId))
        return "Invalid taskId in phaseWindow";
      if (
        !Array.isArray(rule.parameters.allowedPhases) ||
        rule.parameters.allowedPhases.length === 0
      )
        return "allowedPhases must be non-empty";
      break;

    case "slotRestriction":
      if (typeof rule.parameters !== "object")
        return "parameters must be object";
      break;
  }

  if (rule.confidence < 0 || rule.confidence > 1)
    return "Confidence must be 0–1";
  return null;
}
