import { TEntity } from "@/constants";
import { Data } from "@/stores/data";

export class NLPProcessor {
  static processQuery(query: string, dataset: Data) {
    const normalizedQuery = query.toLowerCase();
    let results: any[] = [];
    let entityType: TEntity = "tasks";

    // Determine entity type
    if (
      normalizedQuery.includes("client") ||
      normalizedQuery.includes("customer")
    ) {
      entityType = "clients";
      results = dataset.clients;
    } else if (
      normalizedQuery.includes("worker") ||
      normalizedQuery.includes("employee")
    ) {
      entityType = "workers";
      results = dataset.workers;
    } else {
      results = dataset.tasks;
    }

    // Apply filters based on query
    results = this.applyFilters(normalizedQuery, results, entityType);

    return { results, entityType, totalFound: results.length };
  }

  private static applyFilters(query: string, data: any[], entityType: string) {
    let filtered = [...data];

    // Duration filters
    const durationMatch = query.match(
      /duration\s*(?:of\s*)?(?:more than|greater than|>\s*|above\s*)(\d+)/
    );
    if (durationMatch && entityType === "tasks") {
      const threshold = parseInt(durationMatch[1]);
      filtered = filtered.filter((item) => item.Duration > threshold);
    }

    const durationExactMatch = query.match(
      /duration\s*(?:of\s*)?(?:equals?\s*|=\s*)(\d+)/
    );
    if (durationExactMatch && entityType === "tasks") {
      const value = parseInt(durationExactMatch[1]);
      filtered = filtered.filter((item) => item.Duration === value);
    }

    // Priority level filters
    const priorityMatch = query.match(
      /priority\s*(?:level\s*)?(?:of\s*)?(?:more than|greater than|>\s*|above\s*)(\d+)/
    );
    if (priorityMatch && entityType === "clients") {
      const threshold = parseInt(priorityMatch[1]);
      filtered = filtered.filter((item) => item.PriorityLevel > threshold);
    }

    const priorityExactMatch = query.match(
      /priority\s*(?:level\s*)?(?:of\s*)?(?:equals?\s*|=\s*)(\d+)/
    );
    if (priorityExactMatch && entityType === "clients") {
      const value = parseInt(priorityExactMatch[1]);
      filtered = filtered.filter((item) => item.PriorityLevel === value);
    }

    // Phase filters
    const phaseMatch = query.match(/phase\s*(\d+)/);
    if (phaseMatch) {
      const phase = parseInt(phaseMatch[1]);
      if (entityType === "tasks") {
        filtered = filtered.filter((item) =>
          item.PreferredPhases?.includes(phase)
        );
      } else if (entityType === "workers") {
        filtered = filtered.filter((item) =>
          item.AvailableSlots?.includes(phase)
        );
      }
    }

    // Skill filters
    const skillMatch = query.match(
      /skill[s]?\s*(?:of\s*)?['""]?([a-zA-Z\s]+)['""]?/
    );
    if (skillMatch) {
      const skill = skillMatch[1].trim();
      if (entityType === "tasks") {
        filtered = filtered.filter((item) =>
          item.RequiredSkills?.some((s: string) =>
            s.toLowerCase().includes(skill.toLowerCase())
          )
        );
      } else if (entityType === "workers") {
        filtered = filtered.filter((item) =>
          item.Skills?.some((s: string) =>
            s.toLowerCase().includes(skill.toLowerCase())
          )
        );
      }
    }

    // Group filters
    const groupMatch = query.match(/group\s*['""]?([a-zA-Z\s]+)['""]?/);
    if (groupMatch) {
      const group = groupMatch[1].trim();
      if (entityType === "clients") {
        filtered = filtered.filter((item) =>
          item.GroupTag?.toLowerCase().includes(group.toLowerCase())
        );
      } else if (entityType === "workers") {
        filtered = filtered.filter((item) =>
          item.WorkerGroup?.toLowerCase().includes(group.toLowerCase())
        );
      }
    }

    // Category filters
    const categoryMatch = query.match(/category\s*['""]?([a-zA-Z\s]+)['""]?/);
    if (categoryMatch && entityType === "tasks") {
      const category = categoryMatch[1].trim();
      filtered = filtered.filter((item) =>
        item.Category?.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Name search
    const nameMatch = query.match(
      /name\s*(?:contains?\s*|like\s*|with\s*)['""]?([a-zA-Z\s]+)['""]?/
    );
    if (nameMatch) {
      const name = nameMatch[1].trim();
      filtered = filtered.filter((item) => {
        const nameField =
          entityType === "clients"
            ? "ClientName"
            : entityType === "workers"
            ? "WorkerName"
            : "TaskName";
        return item[nameField]?.toLowerCase().includes(name.toLowerCase());
      });
    }

    return filtered;
  }

  static generateRuleFromNaturalLanguage(input: string, dataset?: Data) {
    const normalized = input.toLowerCase();

    // Co-run rule detection
    const corunMatch = normalized.match(
      /(?:tasks?\s*)?([a-z0-9,\s]+)\s*(?:should\s*)?(?:always\s*)?(?:run\s*)?together/
    );
    if (corunMatch) {
      const taskIds = corunMatch[1].split(",").map((s) => s.trim());
      return {
        type: "coRun" as const,
        name: `Co-run Tasks: ${taskIds.join(", ")}`,
        description: `Tasks ${taskIds.join(", ")} must run together`,
        parameters: { tasks: taskIds },
        confidence: 0.85,
      };
    }

    // Load limit rule detection
    const loadMatch = normalized.match(
      /(?:limit|restrict)\s*([a-z\s]+)\s*(?:to\s*)?(\d+)\s*(?:slots?\s*)?(?:per\s*phase)?/
    );
    if (loadMatch) {
      const group = loadMatch[1].trim();
      const limit = parseInt(loadMatch[2]);
      return {
        type: "loadLimit" as const,
        name: `Load Limit: ${group}`,
        description: `Limit ${group} to ${limit} slots per phase`,
        parameters: { workerGroup: group, maxSlotsPerPhase: limit },
        confidence: 0.9,
      };
    }

    // Phase window rule detection
    const phaseMatch = normalized.match(
      /(?:task\s*)?([a-z0-9]+)\s*(?:can\s*only\s*run\s*in\s*)?phases?\s*([0-9,-]+)/
    );
    if (phaseMatch) {
      const taskId = phaseMatch[1].trim();
      const phases = phaseMatch[2]
        .split(",")
        .map((s) => {
          if (s.includes("-")) {
            const [start, end] = s.split("-").map((n) => parseInt(n.trim()));
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
          }
          return [parseInt(s.trim())];
        })
        .flat();

      return {
        type: "phaseWindow" as const,
        name: `Phase Window: ${taskId}`,
        description: `Task ${taskId} can only run in phases ${phases.join(
          ", "
        )}`,
        parameters: { taskId, allowedPhases: phases },
        confidence: 0.88,
      };
    }

    return null;
  }
}
