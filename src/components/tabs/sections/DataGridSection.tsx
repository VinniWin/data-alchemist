"use client";
import { useAppStore } from "@/stores/data";
import { ValidationEngine } from "@/lib/validation/rules";
import { DataGrid } from "../components/DataGrid";

const DataGridSection = () => {
  const { data, validation, setData, setValidation } = useAppStore();

  const handleDataChange = (
    entityType: "clients" | "workers" | "tasks",
    savedData: any[]
  ) => {
    const updatedData = { ...data, [entityType]: savedData };
    const validationResults = ValidationEngine.validateDataSet(updatedData);
    setValidation(validationResults);
    setData({ [entityType]: savedData });
  };

  return (
    <div className="space-y-6">
      {data.clients.length > 0 && (
        <DataGrid
          data={data.clients}
          entityType="clients"
          onDataChange={(data) => handleDataChange("clients", data)}
          errors={validation.errors.filter((e) => e.entity === "clients")}
        />
      )}
      {data.workers.length > 0 && (
        <DataGrid
          data={data.workers}
          entityType="workers"
          onDataChange={(data) => handleDataChange("workers", data)}
          errors={validation.errors.filter((e) => e.entity === "workers")}
        />
      )}
      {data.tasks.length > 0 && (
        <DataGrid
          data={data.tasks}
          entityType="tasks"
          onDataChange={(data) => handleDataChange("tasks", data)}
          errors={validation.errors.filter((e) => e.entity === "tasks")}
        />
      )}
    </div>
  );
};

export default DataGridSection;
