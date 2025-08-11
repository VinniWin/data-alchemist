import { Data } from "@/stores/data";
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  type: string;
  message: string;
  entity: "clients" | "workers" | "tasks";
  rowIndex?: number;
  field?: string;
  severity: "error" | "warning";
}
export class ValidationEngine {
  static validateDataSet(dataset: Data): ValidationResult {
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
    errors.push(...this.validateCircularCoRuns(dataset));
    errors.push(...this.validateOverloadedWorkers(dataset));
    errors.push(...this.validatePhaseSlotSaturation(dataset));
    errors.push(...this.validateSkillCoverage(dataset));
    warnings.push(...this.validateMaxConcurrencyFeasibility(dataset));

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
      client.RequestedTaskIDs.forEach((taskId) => {
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

  private static validateCircularCoRuns(dataset: Data): ValidationError[] {
    // This would require analyzing business rules, simplified for now

    return [];
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

    // Calculate phase capacity vs demand
    const phaseCapacity: Record<number, number> = {};
    const phaseDemand: Record<number, number> = {};

    dataset.workers.forEach((worker) => {
      worker?.AvailableSlots?.forEach((phase) => {
        phaseCapacity[phase] =
          (phaseCapacity[phase] || 0) + worker.MaxLoadPerPhase;
      });
    });

    dataset.tasks.forEach((task) => {
      task.PreferredPhases.forEach((phase) => {
        phaseDemand[phase] = (phaseDemand[phase] || 0) + task.Duration;
      });
    });
    Object.entries(phaseDemand).forEach(([phase, demand]) => {
      const capacity = phaseCapacity[parseInt(phase)] || 0;
      if (demand > capacity) {
        errors.push({
          type: "phase_saturation",
          message: `Phase ${phase} demand (${demand}) exceeds capacity (${capacity})`,
          entity: "tasks",
          field: "PreferredPhases",
          severity: "error",
        });
      }
    });

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
}
