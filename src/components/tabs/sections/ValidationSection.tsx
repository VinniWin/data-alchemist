"use client";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { useAppStore } from "@/stores/data";
import { Settings } from "lucide-react";
import { ValidationPanel } from "../components/ValidationPanel";

const ValidationSection = () => {
  const { data, validation } = useAppStore();

  const totalRecords =
    data.clients.length + data.workers.length + data.tasks.length;
  const hasData = totalRecords > 0;
  return (
    <div>
      <TabsContent value="validation" className="space-y-6">
        {hasData ? (
          <ValidationPanel validation={validation} />
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
      </TabsContent>
    </div>
  );
};

export default ValidationSection;
