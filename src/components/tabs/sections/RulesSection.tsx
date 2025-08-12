"use client";
import { useAppStore } from "@/stores/data";
import { RuleBuilder } from "../components/RuleBuilder";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

const RulesSection = () => {
  const { data, rules, setRules, hasData } = useAppStore();

  return (
    <>
      {hasData() ? (
        <RuleBuilder dataset={data} rules={rules} onRulesChange={setRules} />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Data for Rules
            </h3>
            <p className="text-gray-500">
              Please upload some data files first to create business rules.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default RulesSection;
