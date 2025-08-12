"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CriteriaInfo, Presets } from "@/constants";
import { Priority } from "@/stores/data";
import { RotateCcw, Sliders, Target, TrendingUp } from "lucide-react";
import { useState } from "react";

interface WeightingSystemProps {
  weights: Priority;
  onWeightsChange: (weights: Priority) => void;
  className?: string;
}

export function WeightingSystem({
  weights,
  onWeightsChange,
  className,
}: Readonly<WeightingSystemProps>) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const updateWeight = (key: keyof Priority, value: number) => {
    const newWeights = { ...weights, [key]: value };

    // Ensure weights sum to 100
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (total !== 100) {
      // Proportionally adjust other weights
      const otherKeys = Object.keys(newWeights).filter(
        (k) => k !== key
      ) as (keyof Priority)[];
      const otherTotal = total - value;
      const targetOtherTotal = 100 - value;

      if (otherTotal > 0) {
        otherKeys.forEach((otherKey) => {
          newWeights[otherKey] = Math.round(
            (newWeights[otherKey] / otherTotal) * targetOtherTotal
          );
        });
      }
    }

    onWeightsChange(newWeights);
  };

  const applyPreset = (presetKey: string) => {
    const preset = Presets[presetKey as keyof typeof Presets];
    if (preset) {
      onWeightsChange(preset.weights);
      setSelectedPreset(presetKey);
    }
  };

  const resetWeights = () => {
    onWeightsChange({
      priorityLevel: 20,
      taskFulfillment: 20,
      fairnessConstraints: 20,
      workloadBalance: 20,
      skillMatching: 20,
      phasePreference: 0,
    });
    setSelectedPreset("");
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Preset Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span>Prioritization Presets</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(Presets).map(([key, preset]) => (
              <Button
                key={key}
                variant={selectedPreset === key ? "default" : "outline"}
                onClick={() => applyPreset(key)}
                className="h-auto p-4 flex flex-col items-start space-y-2"
              >
                <span className="font-semibold">{preset.name}</span>
                <span className="text-xs text-left opacity-80">
                  {preset.description}
                </span>
              </Button>
            ))}
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={resetWeights}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Equal Weights
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weight Sliders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-purple-500" />
              <span>Prioritization Weights</span>
            </div>
            <Badge variant={totalWeight === 100 ? "default" : "destructive"}>
              Total: {totalWeight}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(CriteriaInfo).map(([key, info]) => {
            const weight = weights[key as keyof Priority];
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{info.icon}</span>
                    <div>
                      <Label className="font-semibold">{info.name}</Label>
                      <p className="text-xs text-gray-500">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="min-w-[60px] justify-center"
                  >
                    {weight}%
                  </Badge>
                </div>

                <Slider
                  value={[weight]}
                  onValueChange={([value]) =>
                    updateWeight(key as keyof Priority, value)
                  }
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            );
          })}

          {totalWeight !== 100 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    Weight Adjustment Needed
                  </p>
                  <p className="text-sm text-yellow-700">
                    Total weights should equal 100%. Current total:{" "}
                    {totalWeight}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weight Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Weight Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(CriteriaInfo)
              .sort(
                ([a], [b]) =>
                  weights[b as keyof Priority] - weights[a as keyof Priority]
              )
              .map(([key, info]) => {
                const weight = weights[key as keyof Priority];
                const percentage =
                  totalWeight > 0 ? (weight / totalWeight) * 100 : 0;

                return (
                  <div key={key} className="flex items-center space-x-3">
                    <span className="text-sm font-medium min-w-[140px]">
                      {info.name}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 min-w-[40px]">
                      {weight}%
                    </span>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Weight Impact Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-purple-500" />
            <span>Weight Impact Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">High Priority Areas</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  {Object.entries(weights)
                    .filter(([_, weight]) => weight > 20)
                    .sort(([_, a], [__, b]) => b - a)
                    .map(([key, weight]) => (
                      <div key={key} className="flex justify-between">
                        <span>{CriteriaInfo[key as keyof typeof CriteriaInfo]?.name || key}</span>
                        <Badge variant="outline">{weight}%</Badge>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Validation Impact</h4>
                <div className="space-y-2 text-sm text-green-800">
                  <div>• Priority Level: {weights.priorityLevel > 30 ? 'High impact on client satisfaction' : 'Balanced approach'}</div>
                  <div>• Workload Balance: {weights.workloadBalance > 30 ? 'Strict resource constraints' : 'Flexible allocation'}</div>
                  <div>• Skill Matching: {weights.skillMatching > 30 ? 'Quality-focused assignment' : 'Efficiency-focused'}</div>
                  <div>• Fairness: {weights.fairnessConstraints > 30 ? 'Equitable distribution' : 'Performance-based'}</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">System Behavior</h4>
              <p className="text-sm text-yellow-800">
                These weights now actively influence validation by checking for resource conflicts, 
                skill coverage gaps, workload imbalances, and priority-based constraints. 
                The system will show warnings when weight distributions may cause allocation issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
