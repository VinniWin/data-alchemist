"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/stores/data";
import { AlertTriangle, Settings } from "lucide-react";
import { RuleBuilder } from "../components/RuleBuilder";

const RulesSection = () => {
  const { data, rules, setRules, hasData, validation } = useAppStore();

  if (!hasData()) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold dark:text-slate-200 text-gray-700 mb-2">
            No Data for Rules
          </h3>
          <p className="text-gray-500">
            Please upload some data files first to create business rules.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!validation.isValid) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
            Data Validation Required
          </h3>
          <p className="text-gray-500">
            Your uploaded data has validation errors. Please fix them before
            creating rules.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <RuleBuilder dataset={data} rules={rules} onRulesChange={setRules} />;
};

export default RulesSection;
