"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ValidationEngine } from "@/lib/validation/rules";
import { Data, useAppStore } from "@/stores/data";
import {
  Database,
  Download,
  Sparkles
} from "lucide-react";
import TabNavigation from "./TabNavigation";
import IngestionTab from "./components/IngestionTab";

const TabsWithData = () => {
  const { data, validation, setData, setValidation } = useAppStore();

  const handleDataParsed = (
    entityType: "clients" | "workers" | "tasks",
    data: any[]
  ) => {
    setData({ [entityType]: data });
  };

  const handleDataChange = (
    entityType: "clients" | "workers" | "tasks",
    saveddata: any[]
  ) => {
    const updatedData = { ...data, [entityType]: saveddata };

    const validationResults = ValidationEngine.validateDataSet(
      updatedData as unknown as Data
    );
    setValidation(validationResults);
    setData({ [entityType]: saveddata });
  };

  const totalRecords =
    data.clients.length + data.workers.length + data.tasks.length;
  const hasData = totalRecords > 0;
  return (
    <>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Data Alchemist
          </h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          AI-Enabled Resource Allocation Configurator - Transform spreadsheet
          chaos into clean, validated data with intelligent business rules
        </p>
        {hasData && (
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="outline" className="text-sm">
              <Database className="w-4 h-4 mr-1" />
              {totalRecords} total records
            </Badge>
            <Badge
              variant={validation.isValid ? "default" : "destructive"}
              className="text-sm"
            >
              {validation.isValid
                ? "Validated ✓"
                : `${validation.errors.length} errors`}
            </Badge>
            {hasData && validation.isValid && (
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Export Configuration
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="ingestion" className="space-y-6">
        <TabNavigation />

        <TabsContent value="ingestion" className="space-y-6">
          <IngestionTab />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default TabsWithData;
