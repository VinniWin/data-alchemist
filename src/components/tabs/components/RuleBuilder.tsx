"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RuleTypes } from "@/constants";
import { NLPProcessor } from "@/lib/ai/nlp";
import { validateRule } from "@/lib/utils";
import { Data } from "@/stores/data";
import { Lightbulb, Save, Settings, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RuleBuilderProps {
  dataset: Data;
  rules: any[];
  onRulesChange: (rules: any[]) => void;
  className?: string;
}

export function RuleBuilder({
  dataset,
  rules,
  onRulesChange,
  className,
}: Readonly<RuleBuilderProps>) {
  const [activeRule, setActiveRule] = useState<Partial<any> | null>(null);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isProcessingNL, setIsProcessingNL] = useState(false);

  const startNewRule = (type: any["type"]) => {
    setActiveRule({
      id: `rule_${Date.now()}`,
      type,
      name: "",
      description: "",
      parameters: {},
      priority: 1,
      active: true,
    });
  };

  const saveRule = () => {
    if (!activeRule || !activeRule.name) return;

    const newRule: any = {
      id: activeRule.id || `rule_${Date.now()}`,
      type: activeRule.type!,
      name: activeRule.name,
      description: activeRule.description || "",
      parameters: activeRule.parameters || {},
      priority: activeRule.priority || 1,
      active: activeRule.active !== false,
    };

    const existingIndex = rules.findIndex((r) => r.id === newRule.id);
    if (existingIndex >= 0) {
      const updatedRules = [...rules];
      updatedRules[existingIndex] = newRule;
      onRulesChange(updatedRules);
    } else {
      onRulesChange([...rules, newRule]);
    }

    setActiveRule(null);
  };

  const deleteRule = (ruleId: string) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId));
  };

  const processNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) return;
    try {
      await generateAIRecommendations(naturalLanguageInput);
    } catch (error) {
      console.error(error);
      toast.error("Error while creating rule");
    }
  };

  const acceptAISuggestion = (suggestion: any) => {
    const error = validateRule(suggestion, dataset);
    if (error) {
      toast.error(`AI suggestion invalid: ${error}`);
      return;
    }

    setActiveRule({
      id: `rule_${Date.now()}`,
      type: suggestion.type,
      name: suggestion.name,
      description: suggestion.description,
      parameters: suggestion.parameters,
      priority: 1,
      active: true,
    });

    setAiSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    setNaturalLanguageInput("");

    toast.success(`✅ AI suggestion "${suggestion.name}" accepted`);
  };

  const generateAIRecommendations = async (prompt?: string) => {
    setIsProcessingNL(true);
    try {
      const res = await fetch("/api/generate-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          prompt:
            prompt ??
            "Suggest me some of the 4 to 5 rules after analyzing data",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to generate suggestion");
        return;
      }
      if (data.suggestion) {
        setAiSuggestions(data.suggestion);
        toast.info(
          `Generated a ${data.suggestion.type} rule: ${data.suggestion.name}`
        );
      }
    } catch (error) {
      console.error("Error processing natural language:", error);
    } finally {
      setIsProcessingNL(false);
    }
  };

  const renderRuleParameters = () => {
    if (!activeRule) return null;

    switch (activeRule.type) {
      case "coRun":
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2">Tasks to Co-Run</Label>
              <Select
                onValueChange={(value) => {
                  const tasks = activeRule.parameters?.tasks || [];
                  if (!tasks.includes(value)) {
                    setActiveRule({
                      ...activeRule,
                      parameters: {
                        ...activeRule.parameters,
                        tasks: [...tasks, value],
                      },
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tasks" />
                </SelectTrigger>
                <SelectContent>
                  {dataset.tasks.map((task) => (
                    <SelectItem key={task.taskId} value={task.taskId}>
                      {task.taskId} - {task.TaskName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {(activeRule.parameters?.tasks || []).map((taskId: string) => (
                  <Badge
                    key={taskId}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      const tasks =
                        activeRule.parameters?.tasks?.filter(
                          (t: string) => t !== taskId
                        ) || [];
                      setActiveRule({
                        ...activeRule,
                        parameters: { ...activeRule.parameters, tasks },
                      });
                    }}
                  >
                    {taskId} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "loadLimit":
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2">Worker Group</Label>
              <Select
                onValueChange={(value) =>
                  setActiveRule({
                    ...activeRule,
                    parameters: {
                      ...activeRule.parameters,
                      workerGroup: value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select worker group" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    new Set(dataset.workers.map((w) => w.WorkerGroup))
                  ).map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2">Max Slots Per Phase</Label>
              <Input
                type="number"
                value={activeRule.parameters?.maxSlotsPerPhase || ""}
                onChange={(e) =>
                  setActiveRule({
                    ...activeRule,
                    parameters: {
                      ...activeRule.parameters,
                      maxSlotsPerPhase: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        );

      case "phaseWindow":
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2">Task ID</Label>
              <Select
                onValueChange={(value) =>
                  setActiveRule({
                    ...activeRule,
                    parameters: { ...activeRule.parameters, taskId: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {dataset.tasks.map((task) => (
                    <SelectItem key={task.taskId} value={task.taskId}>
                      {task.taskId} - {task.TaskName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Allowed Phases (comma-separated)</Label>
              <Input
                placeholder="e.g., 1,2,3"
                value={activeRule.parameters?.allowedPhases?.join(",") || ""}
                onChange={(e) => {
                  const phases = e.target.value
                    .split(",")
                    .map((p) => parseInt(p.trim()))
                    .filter((p) => !isNaN(p));
                  setActiveRule({
                    ...activeRule,
                    parameters: {
                      ...activeRule.parameters,
                      allowedPhases: phases,
                    },
                  });
                }}
              />
            </div>
          </div>
        );

      default:
        return (
          <div>
            <Label className="mb-2">Parameters (JSON)</Label>
            <Textarea
              placeholder='{"key": "value"}'
              onChange={(e) => {
                try {
                  const params = JSON.parse(e.target.value);
                  setActiveRule({ ...activeRule, parameters: params });
                } catch {
                  // Invalid JSON, ignore
                }
              }}
            />
          </div>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Natural Language Rule Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-purple-500" />
            <span>Natural Language Rule Creator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Textarea
              placeholder="Describe your rule in plain English... e.g., 'Tasks T001 and T003 should always run together' or 'Limit Backend workers to 3 slots per phase'"
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={processNaturalLanguage}
              disabled={isProcessingNL || !naturalLanguageInput.trim()}
              className="shrink-0"
            >
              {isProcessingNL ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isProcessingNL ? "Processing..." : "Create Rule"}
            </Button>
          </div>

          {aiSuggestions.length > 0 && (
            <ScrollArea className="mt-4 h-96 overflow-x-auto rounded-md border p-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">AI Suggestions:</h4>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 bg-blue-50/20 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-semibold text-blue-300">
                          {suggestion.name}
                        </h5>
                        <p className="text-sm text-blue-200 mt-1">
                          {suggestion.description}
                        </p>
                        {suggestion.reasoning && (
                          <p className="text-xs text-blue-100 mt-2">
                            <strong>Reasoning:</strong> {suggestion.reasoning}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-2">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => acceptAISuggestion(suggestion)}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <Button
            variant="outline"
            onClick={() => generateAIRecommendations()}
            className="w-full"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Generate AI Rule Recommendations
          </Button>
        </CardContent>
      </Card>

      {/* Rule Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Business Rules</span>
            </div>
            <Badge variant="outline">{rules.length} rules</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rule Type Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {RuleTypes.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                onClick={() => startNewRule(type.value as any["type"])}
                className="h-auto p-4 flex flex-col items-start space-y-1"
              >
                <span className="font-semibold">{type.label}</span>
                <span className="text-xs text-gray-500">
                  {type.description}
                </span>
              </Button>
            ))}
          </div>

          {/* Active Rule Editor */}
          {activeRule && (
            <Card className="border-2 ">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {RuleTypes.find((t) => t.value === activeRule.type)?.label ||
                    "New Rule"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2">Rule Name</Label>
                    <Input
                      value={activeRule.name || ""}
                      onChange={(e) =>
                        setActiveRule({ ...activeRule, name: e.target.value })
                      }
                      placeholder="Enter rule name"
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Priority</Label>
                    <Input
                      type="number"
                      value={activeRule.priority || 1}
                      onChange={(e) =>
                        setActiveRule({
                          ...activeRule,
                          priority: parseInt(e.target.value),
                        })
                      }
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2">Description</Label>
                  <Textarea
                    value={activeRule.description || ""}
                    onChange={(e) =>
                      setActiveRule({
                        ...activeRule,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe what this rule does"
                  />
                </div>

                {renderRuleParameters()}

                <div className="flex space-x-2">
                  <Button onClick={saveRule} disabled={!activeRule.name}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Rule
                  </Button>
                  <Button variant="outline" onClick={() => setActiveRule(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Rules */}
          {rules.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <h4 className="font-semibold">Active Rules</h4>
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-gray-50/5 hover:bg-gray-50/10 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{rule.type}</Badge>
                      <span className="font-semibold">{rule.name}</span>
                      <Badge variant="secondary">
                        Priority {rule.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {rule.description}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveRule(rule)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rules Impact Analysis */}
          {rules.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-green-500" />
                  <span>Rules Impact Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/20 rounded-lg">
                      <h4 className="font-semibold text-blue-300 mb-2">
                        Active Rules
                      </h4>
                      <div className="space-y-2">
                        {rules
                          .filter((r) => r.active)
                          .map((rule, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-blue-100">{rule.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {rule.type}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="p-4 bg-green-50/20 rounded-lg">
                      <h4 className="font-semibold text-green-300 mb-2">
                        System Impact
                      </h4>
                      <div className="space-y-2 text-sm text-green-200">
                        <div>
                          • {rules.filter((r) => r.type === "coRun").length}{" "}
                          co-run constraints
                        </div>
                        <div>
                          • {rules.filter((r) => r.type === "loadLimit").length}{" "}
                          load limits
                        </div>
                        <div>
                          •{" "}
                          {rules.filter((r) => r.type === "phaseWindow").length}{" "}
                          phase restrictions
                        </div>
                        <div>
                          •{" "}
                          {
                            rules.filter((r) => r.type === "slotRestriction")
                              .length
                          }{" "}
                          slot constraints
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50/20 rounded-lg">
                    <h4 className="font-semibold text-yellow-300 mb-2">
                      Validation Enhancement
                    </h4>
                    <p className="text-sm text-yellow-200">
                      These business rules are now actively used in validation
                      to check for: rule violations, resource conflicts,
                      scheduling constraints, and allocation feasibility. The
                      system will show errors when rules cannot be satisfied.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
