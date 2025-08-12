"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TEntity } from "@/constants";
import { ValidationEngine } from "@/lib/validation/rulesv2";
import { Data, useAppStore } from "@/stores/data";
import { normalizeHeaders, parseFile } from "@/utils/fileParser";
import { AlertCircle, CheckCircle2, FileText, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface FileUploadProps {
  entityType: TEntity;
  onDataParsed: (data: any[]) => void;
  className?: string;
}

export function FileUpload({
  entityType,
  onDataParsed,
  className,
}: Readonly<FileUploadProps>) {
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const { data: original, rules, priority, setValidation } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadStatus("processing");
      toast.info("Parsing file with AI...");

      try {
        const data = await parseFile(file);
        const parsedData = normalizeHeaders(data, entityType);

        setUploadStatus("success");

        toast.success(
          `Successfully parsed ${parsedData.length} ${entityType} records`
        );

        // Run validation
        const updatedData = { ...original, [entityType]: parsedData };

        const validationResults = ValidationEngine.validateDataSet(
          updatedData as unknown as Data,
          rules,
          priority
        );
        setValidation(validationResults);
        onDataParsed(parsedData);
      } catch (error) {
        const errmsg = `Error parsing file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        setUploadStatus("error");
        toast.error(errmsg);
      }
    },
    [entityType, onDataParsed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-lg ${className}`}
    >
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive
              ? "border-primary bg-primary/5"
              : uploadStatus === "success"
              ? "border-green-500 bg-green-50"
              : uploadStatus === "error"
              ? "border-red-500 bg-red-50"
              : "border-gray-300 hover:border-primary hover:bg-primary/5"
          }`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center space-y-4">
            {uploadStatus === "processing" && (
              <div className="animate-spin">
                <Upload className="w-12 h-12 text-primary" />
              </div>
            )}
            {uploadStatus === "success" && (
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            )}
            {uploadStatus === "error" && (
              <AlertCircle className="w-12 h-12 text-red-500" />
            )}
            {uploadStatus === "idle" && (
              <FileText className="w-12 h-12 text-gray-400" />
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload{" "}
                {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Data
              </h3>
              {uploadStatus === "idle" && (
                <p className="text-gray-500">
                  {isDragActive
                    ? "Drop your CSV or Excel file here..."
                    : "Drag & drop your CSV or Excel file, or click to select"}
                </p>
              )}
            </div>

            {uploadStatus === "idle" && (
              <Button variant="outline" className="mt-4">
                Choose File
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p className="font-semibold mb-1">AI-Powered Features:</p>
          <ul className="space-y-1">
            <li>• Smart column mapping for misnamed headers</li>
            <li>• Automatic data type detection and conversion</li>
            <li>• Intelligent parsing of arrays and JSON</li>
            <li>• Default value assignment for missing fields</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
