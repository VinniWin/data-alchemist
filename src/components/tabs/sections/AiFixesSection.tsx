"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/stores/data";
import { Wand2 } from "lucide-react";
import { DataCorrections } from "../components/DataCorrections";
import { TEntity } from "@/constants";
import { ValidationEngine } from "@/lib/validation/rules";

const AiFixesSection = () => {
  const { data, validation, hasData, setData, setValidation, rules, priority } =
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
  return (
    <>
      {hasData() ? (
        <DataCorrections
          dataset={data}
          validation={validation}
          onDataChange={handleDataChange}
        />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Wand2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Data to Analyze
            </h3>
            <p className="text-gray-500">
              Please upload some data files first to get AI-powered corrections.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AiFixesSection;
