"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ValidationResult } from "@/lib/validation/rules";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface ValidationPanelProps {
  validation: ValidationResult;
  className?: string;
}

export function ValidationPanel({
  validation,
  className,
}: Readonly<ValidationPanelProps>) {
  const { isValid, errors, warnings } = validation;

  const getIcon = (severity: "error" | "warning") => {
    switch (severity) {
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getVariant = (severity: "error" | "warning") => {
    switch (severity) {
      case "error":
        return "destructive" as const;
      case "warning":
        return "secondary" as const;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          {isValid && errors.length === 0 ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Validation Passed</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Validation Issues</span>
            </>
          )}
          <div className="flex space-x-2 ml-auto">
            {errors.length > 0 && (
              <Badge variant="destructive">{errors.length} errors</Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="secondary">{warnings.length} warnings</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isValid && errors.length === 0 && warnings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              All Clear!
            </h3>
            <p>Your data has passed all validation checks.</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {[...errors, ...warnings].map((issue, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge
                        variant={getVariant(issue.severity)}
                        className="text-xs"
                      >
                        {issue.type.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {issue.entity}
                      </Badge>
                      {issue.rowIndex !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          Row {issue.rowIndex + 1}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{issue.message}</p>
                    {issue.field && (
                      <p className="text-xs text-gray-500 mt-1">
                        Field:{" "}
                        <code className="bg-gray-200 px-1 rounded">
                          {issue.field}
                        </code>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Validation Summary
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  • <strong>{errors.length}</strong> critical errors that must
                  be fixed
                </p>
                <p>
                  • <strong>{warnings.length}</strong> warnings that should be
                  reviewed
                </p>
                <p>• Validation runs automatically on data changes</p>
                <p>
                  • Click on highlighted cells in the data grid to edit
                  problematic values
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
