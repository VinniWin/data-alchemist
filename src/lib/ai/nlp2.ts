import { TEntity } from "@/constants";
import { Data } from "@/stores/data";

export class NLPProcessor {
  static async processQuery(
    query: string,
    dataset: Data
  ): Promise<{
    results: any[];
    entityType: TEntity;
    totalFound: number;
  }> {
    // 1. Pre-process only to decide what entity to send (optional — or send all)
    const normalizedQuery = query.toLowerCase();
    let entityType: TEntity = "tasks";

    if (
      normalizedQuery.includes("client") ||
      normalizedQuery.includes("customer")
    ) {
      entityType = "clients";
    } else if (
      normalizedQuery.includes("worker") ||
      normalizedQuery.includes("employee")
    ) {
      entityType = "workers";
    }

    // 2. Slice only the necessary part of the dataset to reduce size
    const slicedDataset: Data = {
      clients: dataset.clients.slice(0, 100), // send only sample
      workers: dataset.workers.slice(0, 100),
      tasks: dataset.tasks.slice(0, 100),
    };

    // 3. Send to your Gemini-powered API
    const res = await fetch("/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        dataset: slicedDataset,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to process query through Gemini");
    }

    const data = await res.json();

    return {
      results: data.results || [],
      entityType: data.entityType || entityType,
      totalFound: data.totalFound || 0,
    };
  }
}
