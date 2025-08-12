import { TEntity } from "@/constants";
import { Data, Priority } from "@/stores/data";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  type: string;
  message: string;
  entity: TEntity;
  rowIndex?: number;
  field?: string;
  severity: "error" | "warning";
}
export class ValidationEngine {
  static validateDataSet(
    dataset: Data,
    businessRules: any[] = [],
    weights: Priority | null = null
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    this.normalizeDataset(dataset);

    // Run all validation rules
    errors.push(...this.validateMissingColumns(dataset));
    errors.push(...this.validateDuplicateIds(dataset));
    errors.push(...this.validateMalformedLists(dataset));
    errors.push(...this.validateOutOfRange(dataset));
    errors.push(...this.validateBrokenJSON(dataset));
    errors.push(...this.validateUnknownReferences(dataset));
    errors.push(...this.validateCircularCoRuns(dataset, businessRules));
    errors.push(...this.validateOverloadedWorkers(dataset));
    errors.push(...this.validatePhaseSlotSaturation(dataset));
    errors.push(...this.validateSkillCoverage(dataset));
    warnings.push(...this.validateMaxConcurrencyFeasibility(dataset));

    // Validate business rules with enhanced logic
    errors.push(...this.validateBusinessRules(dataset, businessRules));

    // Enhanced validation based on prioritization weights
    if (weights) {
      warnings.push(...this.validatePrioritizationWeights(weights));
      // Add weight-based validation logic
      warnings.push(...this.validateWeightBasedConstraints(dataset, weights));
    }

    // Validate rule conflicts and dependencies
    errors.push(...this.validateRuleConflicts(businessRules, dataset));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  private static normalizeField<T extends string | number>(
    value: any,
    parser: (v: string) => T,
    allowRange: boolean = false
  ): T[] {
    if (Array.isArray(value)) {
      return value.flatMap((v) =>
        this.parseValueWithRange(v, parser, allowRange)
      );
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((v) =>
            this.parseValueWithRange(v, parser, allowRange)
          );
        }
      } catch {
        return value
          .split(",")
          .flatMap((v: string) =>
            this.parseValueWithRange(v.trim(), parser, allowRange)
          );
      }
    }

    if (typeof value === "number" && !isNaN(value)) {
      return [value as T];
    }

    return [];
  }
  private static parseValueWithRange<T extends string | number>(
    val: any,
    parser: (v: string) => T,
    allowRange: boolean
  ): T[] {
    if (typeof val === "string" && allowRange && val.includes("-")) {
      const [startStr, endStr] = val.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end) && start <= end) {
        return Array.from({ length: end - start + 1 }, (_, i) =>
          parser((start + i).toString())
        );
      }
    }

    const parsed = parser(val);
    return parsed !== undefined && parsed !== null && !Number.isNaN(parsed)
      ? [parsed]
      : [];
  }

  private static normalizeDataset(dataset: Data): void {
    dataset.workers.forEach((worker) => {
      worker.AvailableSlots = this.normalizeField(
        worker.AvailableSlots,
        Number
      );
      worker.skills = this.normalizeField(worker.skills, String);
    });

    dataset.clients.forEach((client) => {
      client.RequestedTaskIDs = this.normalizeField(
        client.RequestedTaskIDs,
        String
      );
    });

    dataset.tasks.forEach((task) => {
      task.PreferredPhases = this.normalizeField(
        task.PreferredPhases,
        Number,
        true
      );

      task.RequiredSkills = this.normalizeField(task.RequiredSkills, String);
    });
  }

  private static validateMissingColumns(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    const requiredFields = {
      clients: [
        "clientId",
        "ClientName",
        "PriorityLevel",
        "RequestedTaskIDs",
        "GroupTag",
        "AttributesJSON",
      ],
      workers: [
        "workerId",
        "WorkerName",
        "skills",
        "AvailableSlots",
        "MaxLoadPerPhase",
        "WorkerGroup",
        "QualificationLevel",
      ],
      tasks: [
        "taskId",
        "TaskName",
        "Category",
        "Duration",
        "RequiredSkills",
        "PreferredPhases",
        "MaxConcurrent",
      ],
    };

    Object.entries(requiredFields).forEach(([entityType, fields]) => {
      const data = dataset[entityType as keyof Data];
      if (data.length === 0) return;

      fields.forEach((field) => {
        if (
          data.some((item) => item[field] === undefined || item[field] === null)
        ) {
          errors.push({
            type: "missing_column",
            message: `Missing required field: ${field}`,
            entity: entityType as any,
            field,
            severity: "error",
          });
        }
      });
    });

    return errors;
  }

  private static validateDuplicateIds(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    const idFields = {
      clients: "clientId",
      workers: "workerId",
      tasks: "taskId",
    };
    Object.entries(idFields).forEach(([entityType, idField]) => {
      const data = dataset[entityType as keyof Data];
      const seenIds = new Set<string>();

      data.forEach((item, index) => {
        const id = item[idField];
        if (seenIds.has(id)) {
          errors.push({
            type: "duplicate_id",
            message: `Duplicate ${idField}: ${id}`,
            entity: entityType as any,
            rowIndex: index,
            field: idField,
            severity: "error",
          });
        }
        seenIds.add(id);
      });
    });

    return errors;
  }

  private static validateMalformedLists(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate AvailableSlots
    dataset.workers.forEach((worker, index) => {
      if (!Array.isArray(worker.AvailableSlots)) {
        errors.push({
          type: "malformed_list",
          message: `AvailableSlots must be an array of numbers`,
          entity: "workers",
          rowIndex: index,
          field: "AvailableSlots",
          severity: "error",
        });
      } else if (
        worker.AvailableSlots.some(
          (slot: any) => typeof slot !== "number" || slot < 1
        )
      ) {
        errors.push({
          type: "malformed_list",
          message: `AvailableSlots contains invalid phase numbers`,
          entity: "workers",
          rowIndex: index,
          field: "AvailableSlots",
          severity: "error",
        });
      }
    });

    // Validate PreferredPhases
    dataset.tasks.forEach((task, index) => {
      if (!Array.isArray(task.PreferredPhases)) {
        errors.push({
          type: "malformed_list",
          message: `PreferredPhases must be an array of numbers`,
          entity: "tasks",
          rowIndex: index,
          field: "PreferredPhases",
          severity: "error",
        });
      } else if (
        task.PreferredPhases.some(
          (phase: any) => typeof phase !== "number" || phase < 1
        )
      ) {
        errors.push({
          type: "malformed_list",
          message: `PreferredPhases contains invalid phase numbers`,
          entity: "tasks",
          rowIndex: index,
          field: "PreferredPhases",
          severity: "error",
        });
      }
    });

    return errors;
  }

  private static validateOutOfRange(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate PriorityLevel (1-5)
    dataset.clients.forEach((client, index) => {
      if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
        errors.push({
          type: "out_of_range",
          message: `PriorityLevel must be between 1 and 5, got ${client.PriorityLevel}`,
          entity: "clients",
          rowIndex: index,
          field: "PriorityLevel",
          severity: "error",
        });
      }
    });

    // Validate Duration (≥1)
    dataset.tasks.forEach((task, index) => {
      if (task.Duration < 1) {
        errors.push({
          type: "out_of_range",
          message: `Duration must be at least 1, got ${task.Duration}`,
          entity: "tasks",
          rowIndex: index,
          field: "Duration",
          severity: "error",
        });
      }
    });

    return errors;
  }

  private static validateBrokenJSON(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    dataset.clients.forEach((client, index) => {
      if (typeof client.AttributesJSON === "string") {
        try {
          JSON.parse(client.AttributesJSON);
        } catch {
          errors.push({
            type: "broken_json",
            message: `Invalid JSON in AttributesJSON`,
            entity: "clients",
            rowIndex: index,
            field: "AttributesJSON",
            severity: "error",
          });
        }
      }
    });

    return errors;
  }

  private static validateUnknownReferences(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    const taskIds = new Set(dataset.tasks.map((t) => t.taskId));

    dataset.clients.forEach((client, index) => {
      client.RequestedTaskIDs.forEach((taskId: any) => {
        if (!taskIds.has(taskId)) {
          errors.push({
            type: "unknown_reference",
            message: `Referenced task ${taskId} does not exist`,
            entity: "clients",
            rowIndex: index,
            field: "RequestedTaskIDs",
            severity: "error",
          });
        }
      });
    });

    return errors;
  }

  private static validateCircularCoRuns(
    dataset: Data,
    businessRules: any[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    const coRunRules = businessRules.filter(
      (rule) => rule.type === "coRun" && rule.active
    );
    const taskGroups = new Map<string, string[]>();

    // Build task groups from co-run rules
    coRunRules.forEach((rule) => {
      const tasks = rule.parameters.tasks || [];
      tasks.forEach((taskId) => {
        if (!taskGroups.has(taskId)) {
          taskGroups.set(taskId, []);
        }
        taskGroups.get(taskId)!.push(...tasks.filter((t) => t !== taskId));
      });
    });

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) return true;
      if (visited.has(taskId)) return false;

      visited.add(taskId);
      recursionStack.add(taskId);

      const relatedTasks = taskGroups.get(taskId) || [];
      for (const relatedTask of relatedTasks) {
        if (hasCycle(relatedTask)) return true;
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of taskGroups.keys()) {
      if (hasCycle(taskId)) {
        errors.push({
          type: "circular_corun",
          message: `Circular co-run dependency detected involving task ${taskId}`,
          entity: "tasks",
          field: "taskId",
          severity: "error",
        });
        break; // Only report one circular dependency to avoid spam
      }
    }

    return errors;
  }

  private static validateOverloadedWorkers(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    dataset.workers.forEach((worker, index) => {
      if (worker.AvailableSlots.length < worker.MaxLoadPerPhase) {
        errors.push({
          type: "overloaded_worker",
          message: `Worker has ${worker.AvailableSlots.length} available slots but MaxLoadPerPhase is ${worker.MaxLoadPerPhase}`,
          entity: "workers",
          rowIndex: index,
          field: "MaxLoadPerPhase",
          severity: "error",
        });
      }
    });

    return errors;
  }

  private static validatePhaseSlotSaturation(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    const phaseCapacity: Record<number, number> = {};
    const phaseDemand: Record<number, number> = {};
    const phaseToTaskRows: Record<number, number[]> = {}; // phase -> contributing task row indices
    // Calculate phase capacity
    for (const worker of dataset.workers) {
      for (const phase of worker.AvailableSlots) {
        const load = Number(worker.MaxLoadPerPhase);
        phaseCapacity[phase] = (phaseCapacity[phase] || 0) + load;
      }
    }

    // Calculate phase demand and record contributing task rows
    dataset.tasks.forEach((task, taskIndex) => {
      const duration = Number(task.Duration);
      for (const phase of task.PreferredPhases) {
        phaseDemand[phase] = (phaseDemand[phase] || 0) + duration;

        if (!phaseToTaskRows[phase]) {
          phaseToTaskRows[phase] = [];
        }
        phaseToTaskRows[phase].push(taskIndex);
      }
    });

    // Generate errors for oversaturated phases
    for (const [phaseStr, demand] of Object.entries(phaseDemand)) {
      const phase = parseInt(phaseStr, 10);
      const capacity = phaseCapacity[phase] || 0;

      if (demand > capacity) {
        const contributingTasks = phaseToTaskRows[phase] || [];

        // Optional: limit to first few rows to avoid flooding
        const rowsToReport = contributingTasks.slice(0, 5); // Limit to 5 for readability

        for (const rowIndex of rowsToReport) {
          errors.push({
            type: "phase_saturation",
            message: `Phase ${phase} demand (${demand.toLocaleString()}) exceeds capacity (${capacity.toLocaleString()})`,
            entity: "tasks",
            rowIndex,
            field: "PreferredPhases",
            severity: "error",
          });
        }
      }
    }

    return errors;
  }

  private static validateSkillCoverage(dataset: Data): ValidationError[] {
    const errors: ValidationError[] = [];

    const availableSkills = new Set<string>();
    dataset.workers.forEach((worker) => {
      worker.skills.forEach((skill) => availableSkills.add(skill));
    });

    dataset.tasks.forEach((task, index) => {
      task.RequiredSkills.forEach((skill) => {
        if (!availableSkills.has(skill)) {
          errors.push({
            type: "skill_coverage",
            message: `Required skill "${skill}" not available in any worker`,
            entity: "tasks",
            rowIndex: index,
            field: "RequiredSkills",
            severity: "error",
          });
        }
      });
    });

    return errors;
  }

  private static validateMaxConcurrencyFeasibility(
    dataset: Data
  ): ValidationError[] {
    const warnings: ValidationError[] = [];

    dataset.tasks.forEach((task, index) => {
      const qualifiedWorkers = dataset.workers.filter((worker) =>
        task.RequiredSkills.every((skill) => worker.skills.includes(skill))
      );

      if (task.MaxConcurrent > qualifiedWorkers.length) {
        warnings.push({
          type: "max_concurrency",
          message: `MaxConcurrent (${task.MaxConcurrent}) exceeds qualified workers (${qualifiedWorkers.length})`,
          entity: "tasks",
          rowIndex: index,
          field: "MaxConcurrent",
          severity: "warning",
        });
      }
    });

    return warnings;
  }

  private static validateBusinessRules(
    dataset: Data,
    businessRules: any[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    businessRules
      .filter((rule) => rule.active)
      .forEach((rule) => {
        switch (rule.type) {
          case "coRun":
            errors.push(...this.validateCoRunRule(dataset, rule));
            break;
          case "loadLimit":
            errors.push(...this.validateLoadLimitRule(dataset, rule));
            break;
          case "phaseWindow":
            errors.push(...this.validatePhaseWindowRule(dataset, rule));
            break;
          case "slotRestriction":
            errors.push(...this.validateSlotRestrictionRule(dataset, rule));
            break;
        }
      });

    return errors;
  }

  private static validateCoRunRule(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const tasks = rule.parameters.tasks || [];

    // Check if all tasks in co-run rule exist
    const existingTaskIds = new Set(dataset.tasks.map((t) => t.taskId));
    tasks.forEach((taskId) => {
      if (!existingTaskIds.has(taskId)) {
        errors.push({
          type: "invalid_corun_task",
          message: `Co-run rule "${rule.name}" references non-existent task: ${taskId}`,
          entity: "tasks",
          field: "taskId",
          severity: "error",
        });
      }
    });

    // Check if co-run tasks have compatible phases
    const ruleTasks = dataset.tasks.filter((t) => tasks.includes(t.taskId));
    if (ruleTasks.length > 1) {
      const commonPhases = ruleTasks.reduce(
        (common, task) =>
          common.filter((phase) => task.PreferredPhases.includes(phase)),
        ruleTasks[0].PreferredPhases
      );

      if (commonPhases.length === 0) {
        errors.push({
          type: "incompatible_corun_phases",
          message: `Co-run rule "${rule.name}" contains tasks with no common preferred phases`,
          entity: "tasks",
          field: "PreferredPhases",
          severity: "error",
        });
      }
    }

    return errors;
  }

  private static validateLoadLimitRule(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { workerGroup, maxSlotsPerPhase } = rule.parameters;

    if (!workerGroup || maxSlotsPerPhase === undefined) {
      errors.push({
        type: "invalid_load_limit_params",
        message: `Load limit rule "${rule.name}" has invalid parameters`,
        entity: "workers",
        field: "WorkerGroup",
        severity: "error",
      });
      return errors;
    }

    // Check if worker group exists
    const groupWorkers = dataset.workers.filter(
      (w) => w.WorkerGroup === workerGroup
    );
    if (groupWorkers.length === 0) {
      errors.push({
        type: "nonexistent_worker_group",
        message: `Load limit rule "${rule.name}" references non-existent worker group: ${workerGroup}`,
        entity: "workers",
        field: "WorkerGroup",
        severity: "error",
      });
    }

    // Check if limit is reasonable
    const totalGroupCapacity = groupWorkers.reduce(
      (sum, worker) =>
        sum + worker.AvailableSlots.length * worker.MaxLoadPerPhase,
      0
    );

    if (maxSlotsPerPhase > totalGroupCapacity) {
      errors.push({
        type: "excessive_load_limit",
        message: `Load limit rule "${rule.name}" sets limit (${maxSlotsPerPhase}) higher than group capacity (${totalGroupCapacity})`,
        entity: "workers",
        field: "MaxLoadPerPhase",
        severity: "error",
      });
    }

    return errors;
  }

  private static validatePhaseWindowRule(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { taskId, allowedPhases } = rule.parameters;

    if (!taskId || !Array.isArray(allowedPhases)) {
      errors.push({
        type: "invalid_phase_window_params",
        message: `Phase window rule "${rule.name}" has invalid parameters`,
        entity: "tasks",
        field: "taskId",
        severity: "error",
      });
      return errors;
    }

    // Check if task exists
    const task = dataset.tasks.find((t) => t.taskId === taskId);
    if (!task) {
      errors.push({
        type: "nonexistent_task_in_rule",
        message: `Phase window rule "${rule.name}" references non-existent task: ${taskId}`,
        entity: "tasks",
        field: "taskId",
        severity: "error",
      });
      return errors;
    }

    // Check if allowed phases overlap with task's preferred phases
    const overlap = task.PreferredPhases.filter((phase: any) =>
      allowedPhases.includes(phase)
    );
    if (overlap.length === 0) {
      errors.push({
        type: "no_phase_overlap",
        message: `Phase window rule "${
          rule.name
        }" allows phases [${allowedPhases.join(
          ","
        )}] but task ${taskId} prefers [${task.PreferredPhases.join(",")}]`,
        entity: "tasks",
        field: "PreferredPhases",
        severity: "error",
      });
    }

    return errors;
  }

  private static validateSlotRestrictionRule(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // For example, let's assume the rule looks like this:
    // { phase: number, maxSlotsPerWorker: number, maxTotalSlots: number }

    // Assuming rule contains phase, maxSlotsPerWorker, and maxTotalSlots constraints

    // Validate per-worker slot restriction per phase
    dataset.workers.forEach((worker, workerIndex) => {
      worker.AvailableSlots.forEach((phase) => {
        // Check if the worker exceeds the maxSlotsPerWorker for a given phase
        if (
          rule.maxSlotsPerWorker &&
          worker.MaxLoadPerPhase > rule.maxSlotsPerWorker
        ) {
          errors.push({
            type: "slot_restriction",
            message: `Worker ${workerIndex} exceeds max slot load of ${rule.maxSlotsPerWorker} in phase ${phase}`,
            entity: "workers",
            rowIndex: workerIndex,
            field: "AvailableSlots",
            severity: "error",
          });
        }
      });
    });

    // Validate total slot usage for each phase
    const phaseTotalSlots: Record<number, number> = {}; // phase -> total slots assigned
    dataset.tasks.forEach((task, taskIndex) => {
      const taskDuration = Number(task.Duration);

      task.PreferredPhases.forEach((phase) => {
        // Calculate the total slots being used in the phase by all tasks
        phaseTotalSlots[phase] = (phaseTotalSlots[phase] || 0) + taskDuration;

        // Check if the total slots in the phase exceed the maximum allowed for the phase
        if (rule.maxTotalSlots && phaseTotalSlots[phase] > rule.maxTotalSlots) {
          errors.push({
            type: "slot_restriction",
            message: `Total slot demand exceeds the limit of ${rule.maxTotalSlots} for phase ${phase}`,
            entity: "tasks",
            rowIndex: taskIndex,
            field: "PreferredPhases",
            severity: "error",
          });
        }
      });
    });

    return errors;
  }

  private static validatePrioritizationWeights(
    weights: Priority
  ): ValidationError[] {
    const warnings: ValidationError[] = [];

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

    if (totalWeight !== 100) {
      warnings.push({
        type: "weight_sum_mismatch",
        message: `Prioritization weights sum to ${totalWeight}% instead of 100%`,
        entity: "tasks",
        field: "PriorityLevel",
        severity: "warning",
      });
    }

    // Check for zero weights that might indicate missing configuration
    Object.entries(weights).forEach(([key, value]) => {
      if (value === 0) {
        warnings.push({
          type: "zero_weight",
          message: `${key} has zero weight - this criterion will be ignored in allocation`,
          entity: "tasks",
          field: "PriorityLevel",
          severity: "warning",
        });
      }
    });

    // Warn about extreme weight distributions
    const maxWeight = Math.max(...Object.values(weights));
    if (maxWeight > 70) {
      warnings.push({
        type: "extreme_weight_distribution",
        message: `One criterion has ${maxWeight}% weight - consider more balanced distribution`,
        entity: "tasks",
        field: "PriorityLevel",
        severity: "warning",
      });
    }

    return warnings;
  }
  private static validateWeightBasedConstraints(
    dataset: Data,
    weights: Priority
  ): ValidationError[] {
    const warnings: ValidationError[] = [];

    const skillWeight = weights.skillMatching || 1;
    const maxConcurrencyWeight = weights.workloadBalance || 1;

    dataset.tasks.forEach((task, taskIndex) => {
      task.RequiredSkills.forEach((skill: string) => {
        const workerWithSkill = dataset.workers.find((worker) =>
          worker.skills.includes(skill)
        );

        if (!workerWithSkill) {
          warnings.push({
            type: "skill_coverage_weight",
            message: `Task ${task.taskId} requires skill "${skill}" but no worker has it. This might affect allocation.`,
            entity: "tasks",
            rowIndex: taskIndex,
            field: "RequiredSkills",
            severity: skillWeight > 0.5 ? "error" : "warning",
          });
        }
      });
    });

    dataset.tasks.forEach((task, taskIndex) => {
      const qualifiedWorkers = dataset.workers.filter((worker) =>
        task.RequiredSkills.every((skill: string) =>
          worker.skills.includes(skill)
        )
      );

      const requiredWorkers = task.MaxConcurrent * maxConcurrencyWeight;

      if (qualifiedWorkers.length < requiredWorkers) {
        warnings.push({
          type: "max_concurrency_weight",
          message: `Task ${task.taskId} has MaxConcurrent (${task.MaxConcurrent}) but only ${qualifiedWorkers.length} workers are qualified. This might affect allocation.`,
          entity: "tasks",
          rowIndex: taskIndex,
          field: "MaxConcurrent",
          severity: maxConcurrencyWeight > 0.5 ? "error" : "warning",
        });
      }
    });

    return warnings;
  }

  private static validateRuleConflicts(
    businessRules: any[],
    dataset: Data
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const taskGroups = new Map<string, string[]>();
    businessRules
      .filter((rule) => rule.type === "coRun" && rule.active)
      .forEach((rule) => {
        const tasks = rule.parameters.tasks || [];
        tasks.forEach((taskId: string) => {
          if (!taskGroups.has(taskId)) {
            taskGroups.set(taskId, []);
          }
          taskGroups.get(taskId)!.push(rule.name);
        });
      });

    for (const [taskId, ruleNames] of taskGroups.entries()) {
      if (ruleNames.length > 1) {
        errors.push({
          type: "rule_conflict",
          message: `Task ${taskId} is in multiple co-run rules: ${ruleNames.join(
            ", "
          )}. This might lead to conflicting assignments.`,
          entity: "tasks",
          field: "taskId",
          severity: "warning",
        });
      }
    }

    // Example: Check if any task is in multiple phase window rules
    const taskPhaseWindows = new Map<string, string[]>();
    businessRules
      .filter((rule) => rule.type === "phaseWindow" && rule.active)
      .forEach((rule) => {
        const { taskId } = rule.parameters;
        if (taskId) {
          if (!taskPhaseWindows.has(taskId)) {
            taskPhaseWindows.set(taskId, []);
          }
          taskPhaseWindows.get(taskId)!.push(rule.name);
        }
      });

    for (const [taskId, ruleNames] of taskPhaseWindows.entries()) {
      if (ruleNames.length > 1) {
        errors.push({
          type: "rule_conflict",
          message: `Task ${taskId} is in multiple phase window rules: ${ruleNames.join(
            ", "
          )}. This might lead to conflicting assignments.`,
          entity: "tasks",
          field: "taskId",
          severity: "warning",
        });
      }
    }

    return errors;
  }

  // Enhanced validation methods that actually use business rules and weights
  static validateWithRules(
    dataset: Data,
    businessRules: any[],
    weights: Priority
  ): ValidationResult {
    const baseValidation = this.validateDataSet(
      dataset,
      businessRules,
      weights
    );
    const ruleBasedErrors: ValidationError[] = [];
    const weightBasedWarnings: ValidationError[] = [];

    // Apply business rules to actual validation
    businessRules
      .filter((rule) => rule.active)
      .forEach((rule) => {
        switch (rule.type) {
          case "coRun":
            ruleBasedErrors.push(
              ...this.validateCoRunEnforcement(dataset, rule)
            );
            break;
          case "loadLimit":
            ruleBasedErrors.push(
              ...this.validateLoadLimitEnforcement(dataset, rule)
            );
            break;
          case "phaseWindow":
            ruleBasedErrors.push(
              ...this.validatePhaseWindowEnforcement(dataset, rule)
            );
            break;
          case "slotRestriction":
            ruleBasedErrors.push(
              ...this.validateSlotRestrictionEnforcement(dataset, rule)
            );
            break;
        }
      });

    // Apply weight-based validation logic
    weightBasedWarnings.push(
      ...this.validateWeightBasedAllocation(dataset, weights)
    );

    return {
      isValid:
        baseValidation.errors.length === 0 && ruleBasedErrors.length === 0,
      errors: [...baseValidation.errors, ...ruleBasedErrors],
      warnings: [...baseValidation.warnings, ...weightBasedWarnings],
    };
  }

  private static validateCoRunEnforcement(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const tasks = rule.parameters.tasks || [];

    // Check if co-run tasks can actually be scheduled together
    const ruleTasks = dataset.tasks.filter((t: any) =>
      tasks.includes(t.taskId)
    );

    if (ruleTasks.length > 1) {
      // Check for common available phases
      const commonPhases = ruleTasks.reduce(
        (common, task) =>
          common.filter((phase: number) =>
            task.PreferredPhases.includes(phase)
          ),
        ruleTasks[0].PreferredPhases
      );

      if (commonPhases.length === 0) {
        errors.push({
          type: "corun_phase_conflict",
          message: `Co-run rule "${rule.name}" cannot be satisfied - no common phases available`,
          entity: "tasks",
          severity: "error",
        });
      }

      // Check if enough workers are available for all tasks
      const totalConcurrency = ruleTasks.reduce(
        (sum, task) => sum + task.MaxConcurrent,
        0
      );
      const availableWorkers = dataset.workers.filter((worker) =>
        ruleTasks.some((task) =>
          task.RequiredSkills.every((skill: string) =>
            worker.skills.includes(skill)
          )
        )
      );

      if (availableWorkers.length < totalConcurrency) {
        errors.push({
          type: "corun_worker_insufficient",
          message: `Co-run rule "${rule.name}" requires ${totalConcurrency} workers but only ${availableWorkers.length} are available`,
          entity: "tasks",
          severity: "error",
        });
      }
    }

    return errors;
  }

  private static validateLoadLimitEnforcement(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { workerGroup, maxSlotsPerPhase } = rule.parameters;

    if (!workerGroup || maxSlotsPerPhase === undefined) return errors;

    // Check if the rule is being violated by current data
    const groupWorkers = dataset.workers.filter(
      (w: any) => w.WorkerGroup === workerGroup
    );

    if (groupWorkers.length === 0) {
      errors.push({
        type: "load_limit_no_group",
        message: `Load limit rule "${rule.name}" references non-existent worker group: ${workerGroup}`,
        entity: "workers",
        severity: "error",
      });
      return errors;
    }

    // Calculate current load per phase for this group
    const phaseLoads: Record<number, number> = {};
    groupWorkers.forEach((worker) => {
      worker.AvailableSlots.forEach((phase: number) => {
        phaseLoads[phase] = (phaseLoads[phase] || 0) + worker.MaxLoadPerPhase;
      });
    });

    // Check for violations
    Object.entries(phaseLoads).forEach(([phase, load]) => {
      if (load > maxSlotsPerPhase) {
        errors.push({
          type: "load_limit_violation",
          message: `Load limit rule "${rule.name}" violated in phase ${phase}: ${load} > ${maxSlotsPerPhase}`,
          entity: "workers",
          severity: "error",
        });
      }
    });

    return errors;
  }

  private static validatePhaseWindowEnforcement(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { taskId, allowedPhases } = rule.parameters;

    if (!taskId || !Array.isArray(allowedPhases)) return errors;

    const task = dataset.tasks.find((t: any) => t.taskId === taskId);
    if (!task) {
      errors.push({
        type: "phase_window_no_task",
        message: `Phase window rule "${rule.name}" references non-existent task: ${taskId}`,
        entity: "tasks",
        severity: "error",
      });
      return errors;
    }

    // Check if task's preferred phases conflict with allowed phases
    const conflictingPhases = task.PreferredPhases.filter(
      (phase: number) => !allowedPhases.includes(phase)
    );
    if (conflictingPhases.length > 0) {
      errors.push({
        type: "phase_window_conflict",
        message: `Phase window rule "${
          rule.name
        }" conflicts with task ${taskId} preferences: ${conflictingPhases.join(
          ", "
        )} not allowed`,
        entity: "tasks",
        severity: "error",
      });
    }

    return errors;
  }

  private static validateSlotRestrictionEnforcement(
    dataset: Data,
    rule: any
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check slot restrictions per phase
    const phaseRestrictions: Record<number, number> = {};
    dataset.tasks.forEach((task, taskIndex) => {
      const duration = Number(task.Duration);
      task.PreferredPhases.forEach((phase: number) => {
        phaseRestrictions[phase] = (phaseRestrictions[phase] || 0) + duration;
      });
    });

    // Apply rule constraints
    Object.entries(phaseRestrictions).forEach(([phase, totalSlots]) => {
      if (rule.maxTotalSlots && totalSlots > rule.maxTotalSlots) {
        errors.push({
          type: "slot_restriction_violation",
          message: `Slot restriction rule violated in phase ${phase}: ${totalSlots} > ${rule.maxTotalSlots}`,
          entity: "tasks",
          severity: "error",
        });
      }
    });

    return errors;
  }

  private static validateWeightBasedAllocation(
    dataset: Data,
    weights: Priority
  ): ValidationError[] {
    const warnings: ValidationError[] = [];

    // High priority level weight - check if high-priority clients have sufficient resources
    if (weights.priorityLevel > 30) {
      const highPriorityClients = dataset.clients.filter(
        (c: any) => c.PriorityLevel >= 4
      );
      const totalHighPriorityTasks = highPriorityClients.reduce(
        (sum, client) => sum + (client.RequestedTaskIDs?.length || 0),
        0
      );

      if (totalHighPriorityTasks > dataset.workers.length * 2) {
        warnings.push({
          type: "high_priority_overload",
          message: `High priority weight (${weights.priorityLevel}%) may cause resource conflicts - ${totalHighPriorityTasks} high-priority tasks vs ${dataset.workers.length} workers`,
          entity: "clients",
          severity: "warning",
        });
      }
    }

    // High workload balance weight - check worker utilization
    if (weights.workloadBalance > 30) {
      const totalWorkerSlots = dataset.workers.reduce(
        (sum, worker) =>
          sum + worker.AvailableSlots.length * worker.MaxLoadPerPhase,
        0
      );
      const totalTaskDemand = dataset.tasks.reduce(
        (sum, task) => sum + task.Duration * task.PreferredPhases.length,
        0
      );

      if (totalTaskDemand > totalWorkerSlots * 0.8) {
        warnings.push({
          type: "workload_balance_strain",
          message: `High workload balance weight (${weights.workloadBalance}%) may strain resources - demand ${totalTaskDemand} vs capacity ${totalWorkerSlots}`,
          entity: "workers",
          severity: "warning",
        });
      }
    }

    // High skill matching weight - check skill coverage
    if (weights.skillMatching > 30) {
      const allRequiredSkills = new Set<string>();
      dataset.tasks.forEach((task) => {
        task.RequiredSkills.forEach((skill: string) =>
          allRequiredSkills.add(skill)
        );
      });

      const coveredSkills = new Set<string>();
      dataset.workers.forEach((worker) => {
        worker.skills.forEach((skill: string) => coveredSkills.add(skill));
      });

      const uncoveredSkills = Array.from(allRequiredSkills).filter(
        (skill) => !coveredSkills.has(skill)
      );
      if (uncoveredSkills.length > 0) {
        warnings.push({
          type: "skill_matching_gaps",
          message: `High skill matching weight (${
            weights.skillMatching
          }%) but ${
            uncoveredSkills.length
          } skills are uncovered: ${uncoveredSkills.join(", ")}`,
          entity: "tasks",
          severity: "warning",
        });
      }
    }

    return warnings;
  }
}
