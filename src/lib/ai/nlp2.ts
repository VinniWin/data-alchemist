import { TEntity } from "@/constants";
import { Data } from "@/stores/data";
import { filterDatasetByEntity } from "@/utils/filters";

type NLPResponseItem = {
  entityType: TEntity;
  filters: { field: string; operator: any; value: any }[];
};

export class NLPProcessor {
  static async processQuery(
    query: string,
    dataset: Data
  ): Promise<{
    results: Record<TEntity, any[]>;
    totalFound: number;
  }> {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) throw new Error("Failed to process query through Gemini");

    const aiResults: NLPResponseItem[] = await res.json();

    const output: Record<TEntity, any[]> = {
      clients: [],
      workers: [],
      tasks: [],
    };

    let total = 0;
    aiResults.forEach(({ entityType, filters }) => {
      const filtered = filterDatasetByEntity(dataset, entityType, filters);
      output[entityType] = filtered;
      
      total += filtered.length;
    });
    return {
      results: output,
      totalFound: total,
    };
  }
}
