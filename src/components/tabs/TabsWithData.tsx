"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAppStore } from "@/stores/data";
import { Database, Download, Sparkles } from "lucide-react";
import IngestionTab from "./components/IngestionTab";
import MainTabNavigation from "./MainTabNavigation";
import AiSearchSection from "./sections/AiSearchSection";
import ExportSection from "./sections/ExportSection";
import RulesSection from "./sections/RulesSection";
import ValidationSection from "./sections/ValidationSection";
import WeightSection from "./sections/WeightSection";
import AiFixesSection from "./sections/AiFixesSection";

const TabsWithData = () => {
  const { data, validation, hasData } = useAppStore();

  const totalRecords =
    data.clients.length + data.workers.length + data.tasks.length;
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
        {hasData() && (
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
            {hasData() && validation.isValid && (
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Export Configuration
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="ingestion" className="space-y-6 ">
        <MainTabNavigation />

        <TabsContent value="ingestion" className="space-y-6">
          <IngestionTab />
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          <ValidationSection />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <AiSearchSection />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <ExportSection />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <RulesSection />
        </TabsContent>

        <TabsContent value="prioritization" className="space-y-6">
          <WeightSection />
        </TabsContent>

        <TabsContent value="corrections" className="space-y-6">
          <AiFixesSection />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default TabsWithData;
