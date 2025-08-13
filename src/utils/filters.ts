import { TEntity } from "@/constants";
import { Data } from "@/stores/data";

type FilterCondition = {
  field: string;
  operator: ">" | "<" | "=" | "includes";
  value: string | number;
};

export function applyFilters<T extends Record<string, any>>(
  data: T[],
  filters: FilterCondition[]
): T[] {
  return data.filter((item) =>
    filters.every((filter) => {
      const fieldValue = item[filter.field];

      switch (filter.operator) {
        case ">":
          return (
            typeof fieldValue === "number" && fieldValue > Number(filter.value)
          );
        case "<":
          return (
            typeof fieldValue === "number" && fieldValue < Number(filter.value)
          );
        case "=":
          if (
            typeof fieldValue === "string" &&
            typeof filter.value === "string"
          ) {
            return (
              fieldValue.trim().toLowerCase() ===
              filter.value.trim().toLowerCase()
            );
          }
          return fieldValue === filter.value;
        case "includes":
          if (Array.isArray(fieldValue)) {
            return fieldValue.some(
              (v) =>
                String(v).toLowerCase() === String(filter.value).toLowerCase()
            );
          }
          return String(fieldValue)
            .toLowerCase()
            .includes(String(filter.value).toLowerCase());
        default:
          return false;
      }
    })
  );
}

export function filterDatasetByEntity(
  dataset: Data,
  entityType: TEntity,
  filters: FilterCondition[]
) {
  const entityData = dataset[entityType];
  console.log({ entityData });
  return applyFilters(entityData, filters);
}
