"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/stores/data";
import { Settings } from "lucide-react";
import { WeightingSystem } from "../components/WeightingSystem";

const WeightSection = () => {
  const { priority, setPriority, hasData } = useAppStore();

  return (
    <div>
        {hasData() ? (
          <WeightingSystem weights={priority} onWeightsChange={setPriority} />
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Data to Validate
              </h3>
              <p className="text-gray-500">
                Please upload some data files first to see validation results.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default WeightSection;
