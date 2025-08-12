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

    // Validate business rules
    errors.push(...this.validateBusinessRules(dataset, businessRules));

    // Validate prioritization weights
    if (weights) {
      warnings.push(...this.validatePrioritizationWeights(weights));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  private static normalizeField<T extends string | number>(
    value: any,
    parser: (v: string) => T
  ): T[] {
    if (Array.isArray(value)) {
      return value.map(parser).filter((v) => v !== undefined && v !== null);
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map(parser)
            .filter((v) => v !== undefined && v !== null);
        }
      } catch {
        // Fall back to comma-separated
        return value
          .split(",")
          .map((v: string) => parser(v.trim()))
          .filter((v) => v !== undefined && v !== null);
      }
    }

    if (typeof value === "number" && !isNaN(value)) {
      return [value as T];
    }

    return [];
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
      task.PreferredPhases = this.normalizeField(task.PreferredPhases, Number);
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
}
