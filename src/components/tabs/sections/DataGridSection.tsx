"use client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEntity } from "@/constants";
import { ValidationEngine } from "@/lib/validation/rules";
import { useAppStore } from "@/stores/data";
import { Settings2, Sparkles, User2 } from "lucide-react";
import { ReactNode } from "react";
import { DataGrid } from "../components/DataGrid";

const entityConfig: {
  key: TEntity;
  label: string;
  icon: ReactNode;
}[] = [
  { key: "clients", label: "Client", icon: <User2 className="w-4 h-4" /> },
  { key: "workers", label: "Worker", icon: <Settings2 className="w-4 h-4" /> },
  { key: "tasks", label: "Task", icon: <Sparkles className="w-4 h-4" /> },
];
const DataGridSection = () => {
  const { data, validation, rules, priority, setData, setValidation } =
    useAppStore();

  const handleDataChange = (entityType: TEntity, savedData: any[]) => {
    const updatedData = { ...data, [entityType]: savedData };
    const validationResults = ValidationEngine.validateWithRules(
      updatedData,
      rules,
      priority
    );
    setValidation(validationResults);
    setData({ [entityType]: savedData });
  };
  const getEntityErrors = (entity: TEntity) =>
    validation.errors.filter((e) => e.entity === entity);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="w-full lg:w-fit self-center">
          {entityConfig.map(({ key, label, icon }) => {
            const errors = getEntityErrors(key);
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center space-x-1"
              >
                {icon}
                <span>{label}</span>
                {errors.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-2 px-1.5 py-0 text-xs"
                  >
                    {errors.length}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {entityConfig.map(({ key }) => {
          const entityData = data[key];
          const entityErrors = getEntityErrors(key);

          return (
            <TabsContent key={key} value={key} className="space-y-6">
              {entityData.length > 0 && (
                <DataGrid
                  data={entityData}
                  entityType={key}
                  onDataChange={(updated) => handleDataChange(key, updated)}
                  errors={entityErrors}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default DataGridSection;
