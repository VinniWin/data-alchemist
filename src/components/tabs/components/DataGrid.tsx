"use client";

import React, { useState, useEffect } from "react";
import { Edit2, Save, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Tooltipmsg from "../../ui/tooltipmsg";
import { ValidationError } from "@/lib/validation/rules";

interface DataGridProps {
  data: any[];
  entityType: "clients" | "workers" | "tasks";
  onDataChange: (data: any[]) => void;
  errors?: any[];
  className?: string;
}

export function DataGrid({
  data,
  entityType,
  onDataChange,
  errors = [],
  className,
}: Readonly<DataGridProps>) {
  const [editingCell, setEditingCell] = useState<{
    row: number;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const getColumns = () => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];

    return Object.keys(firstRow).map((key) => {
      const value = firstRow[key];

      let type: string = "text";
      if (Array.isArray(value)) {
        type = "array";
      } else if (typeof value === "object" && value !== null) {
        type = "json";
      } else if (typeof value === "number") {
        type = "number";
      }

      return {
        key,
        label: key.replace(/([A-Z])/g, " $1").trim(), // Optional: make the label readable
        type,
      };
    });
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "";

    switch (type) {
      case "array":
        return Array.isArray(value) ? value.join(", ") : value;
      case "json":
        return typeof value === "object" ? JSON.stringify(value) : value;
      default:
        return value.toString();
    }
  };

  const parseValue = (value: string, type: string) => {
    switch (type) {
      case "number":
        return parseFloat(value) || 0;
      case "array":
        return value
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);
      case "json":
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };
  const startEdit = (rowIndex: number, field: string) => {
    const value = data[rowIndex][field];
    const column = getColumns().find((col) => col.key === field);
    setEditingCell({ row: rowIndex, field });
    setEditValue(formatValue(value, column?.type || "text"));
  };

  const saveEdit = () => {
    if (!editingCell) return;

    const { row, field } = editingCell;
    const column = getColumns().find((col) => col.key === field);
    const newValue = parseValue(editValue, column?.type || "text");

    const updatedData = [...data];
    updatedData[row] = { ...updatedData[row], [field]: newValue };

    onDataChange(updatedData);
    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const getCellError = (rowIndex: number, field: string): ValidationError => {
    return errors.find(
      (error) => error.rowIndex === rowIndex && error.field === field
    );
  };

  const columns = getColumns();

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="capitalize">{entityType} Data</span>
          <Badge variant="outline" className="ml-2">
            {data.length} records
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="text-left capitalize p-3 font-semibold text-gray-700 bg-gray-50"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  {columns.map((column) => {
                    const cellError = getCellError(rowIndex, column.key);
                    const isEditing =
                      editingCell?.row === rowIndex &&
                      editingCell?.field === column.key;

                    return (
                      <td
                        key={column.key}
                        className={`p-3 relative ${
                          cellError ? "bg-red-50" : ""
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="min-w-32"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              variant="outline"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={cancelEdit}
                              variant="outline"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="group cursor-pointer flex items-center space-x-2 min-h-[32px]"
                            onClick={() => startEdit(rowIndex, column.key)}
                          >
                            <span className="flex-1">
                              {formatValue(row[column.key], column.type)}
                            </span>
                            <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                            {cellError && (
                              <div className="flex items-center">
                                <Tooltipmsg msg={cellError.message}>
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                </Tooltipmsg>
                              </div>
                            )}
                          </div>
                        )}

                        {cellError && (
                          <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-2 border-red-500 rounded" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
