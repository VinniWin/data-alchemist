"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ValidationResult } from "@/lib/validation/rules";
import { Data } from "@/stores/data";
import { AlertTriangle, CheckCircle2, Lightbulb, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DataCorrectionsProps {
  dataset: Data;
  validation: ValidationResult;
  onDataChange: (
    entityType: "clients" | "workers" | "tasks",
    data: any[]
  ) => void;
  className?: string;
}

interface AIAnalysis {
  suggestions: string[];
  corrections: {
    entity: "clients" | "workers" | "tasks";
    rowIndex: number;
    field: string;
    currentValue: any;
    suggestedValue: any;
    confidence: number;
    reasoning: string;
  }[];
  ruleRecommendations: {
    type: string;
    description: string;
    parameters: Record<string, any>;
    confidence: number;
    reasoning: string;
  }[];
}

export function DataCorrections({
  dataset,
  validation,
  onDataChange,
  className,
}: Readonly<DataCorrectionsProps>) {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(
    new Set()
  );

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, validation }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze data");
      }

      const analysis: AIAnalysis = await response.json();
      console.log({ analysis });
      setAiAnalysis(analysis);
      toast.success("AI analysis completed successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Error during AI analysis: " + (error as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const applyCorrection = (correction: AIAnalysis["corrections"][0]) => {
    const correctionId = `${correction.entity}-${correction.rowIndex}-${correction.field}`;

    if (appliedCorrections.has(correctionId)) return;

    const entityData = [...dataset[correction.entity]];
    if (entityData[correction.rowIndex]) {
      entityData[correction.rowIndex] = {
        ...entityData[correction.rowIndex],
        [correction.field]: correction.suggestedValue,
      };

      onDataChange(correction.entity, entityData);
      setAppliedCorrections((prev) => new Set([...prev, correctionId]));
    }
  };
  const applyAllCorrections = () => {
    if (!aiAnalysis) return;

    const updatedDataset: Data = {
      clients: [...dataset.clients],
      workers: [...dataset.workers],
      tasks: [...dataset.tasks],
    };

    const newApplied = new Set(appliedCorrections);

    aiAnalysis.corrections.forEach((correction) => {
      const correctionId = `${correction.entity}-${correction.rowIndex}-${correction.field}`;
      if (newApplied.has(correctionId)) return;

      const entityData = updatedDataset[correction.entity];
      if (entityData[correction.rowIndex]) {
        entityData[correction.rowIndex] = {
          ...entityData[correction.rowIndex],
          [correction.field]: correction.suggestedValue,
        };
        newApplied.add(correctionId);
      }
    });

    onDataChange("clients", updatedDataset.clients);
    onDataChange("workers", updatedDataset.workers);
    onDataChange("tasks", updatedDataset.tasks);
    setAppliedCorrections(newApplied);
    toast.info("All corrections were already applied.");
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-300 bg-green-50/20 border-green-200";
    if (confidence >= 0.6)
      return "text-yellow-300 bg-yellow-50/20 border-yellow-200";
    return "text-red-300 bg-red-50/20 border-red-200";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              <span>AI Data Corrections</span>
            </div>
            <Button
              onClick={generateAIAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-slate-300"
            >
              {isAnalyzing ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <Lightbulb className="w-4 h-4 mr-2" />
              )}
              {isAnalyzing ? "Analyzing..." : "Analyze Data"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!aiAnalysis && !isAnalyzing && (
            <div className="text-center py-8 text-gray-500">
              <Wand2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">
                AI Analysis Ready
              </h3>
              <p>
                Click &quot;Analyze Data&quot; to get intelligent suggestions
                for improving your data quality.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <div className="animate-spin w-16 h-16 mx-auto mb-4 border-4 border-purple-200 border-t-purple-600 rounded-full " />
              <h3 className="text-lg font-semibold dark:text-slate-300 text-gray-700 mb-2">
                Analyzing Your Data
              </h3>
              <p className="text-gray-500">
                AI is examining patterns, inconsistencies, and optimization
                opportunities...
              </p>
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-slate-300 mb-3 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                  General Insights
                </h4>
                <div className="space-y-2">
                  {aiAnalysis.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 bg-blue-50/20 border border-blue-200 rounded-lg"
                    >
                      <p className="text-sm text-blue-300">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 dark:text-slate-300 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    Suggested Corrections ({aiAnalysis.corrections.length})
                  </h4>
                  {aiAnalysis.corrections.length > 0 && (
                    <Button size="sm" variant={'outline'} onClick={applyAllCorrections}>
                      Apply All
                    </Button>
                  )}
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {aiAnalysis.corrections.map((correction, index) => {
                      const correctionId = `${correction.entity}-${correction.rowIndex}-${correction.field}`;
                      const isApplied = appliedCorrections.has(correctionId);

                      return (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg ${
                            isApplied
                              ? "bg-green-50/5 border-green-200"
                              : "bg-card border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline">
                                  {correction.entity}
                                </Badge>
                                <Badge variant="outline">
                                  Row {correction.rowIndex + 1}
                                </Badge>
                                <Badge variant="outline">
                                  {correction.field}
                                </Badge>
                                <Badge
                                  className={`text-xs ${getConfidenceColor(
                                    correction.confidence
                                  )}`}
                                >
                                  {getConfidenceLabel(correction.confidence)}{" "}
                                  Confidence
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-sm">
                                  <span className="text-gray-600 dark:text-slate-300">
                                    Current:
                                  </span>
                                  <code className="bg-red-100/20 text-red-300 px-2 py-1 rounded">
                                    {JSON.stringify(correction.currentValue)}
                                  </code>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <span className="text-gray-600 dark:text-slate-300">
                                    Suggested:
                                  </span>
                                  <code className="bg-green-100/20 text-green-300 px-2 py-1 rounded">
                                    {JSON.stringify(correction.suggestedValue)}
                                  </code>
                                </div>
                                <p className="text-xs text-gray-600 mt-2 dark:text-slate-300">
                                  <strong>Reasoning:</strong>{" "}
                                  {correction.reasoning}
                                </p>
                              </div>
                            </div>

                            <div className="ml-4">
                              {isApplied ? (
                                <Badge className="bg-green-600 dark:text-slate-100">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Applied
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => applyCorrection(correction)}
                                >
                                  Apply
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Rule Recommendations */}
              {aiAnalysis.ruleRecommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-slate-300 mb-3 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                    Rule Recommendations
                  </h4>
                  <div className="space-y-3">
                    {aiAnalysis.ruleRecommendations.map(
                      (recommendation, index) => (
                        <div
                          key={index}
                          className="p-4 bg-orange-50/5 border border-orange-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline">
                                  {recommendation.type}
                                </Badge>
                                <Badge
                                  className={`text-xs ${getConfidenceColor(
                                    recommendation.confidence
                                  )}`}
                                >
                                  {getConfidenceLabel(
                                    recommendation.confidence
                                  )}{" "}
                                  Confidence
                                </Badge>
                              </div>
                              <p className="text-sm text-orange-300 mb-2">
                                {recommendation.description}
                              </p>
                              <p className="text-xs text-orange-600">
                                <strong>Reasoning:</strong>{" "}
                                {recommendation.reasoning}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              Create Rule
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
