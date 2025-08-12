"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TEntity } from "@/constants";
import { useAppStore } from "@/stores/data";
import {
  exportRulesJSON,
  exportToCSV,
  exportToExcel,
} from "@/utils/exportUtils";
import { BarChart3, Download, FileText, Settings } from "lucide-react";
import { toast } from "sonner";
import { DataExportCard } from "../components/DataExportCard";

const ExportSection = () => {
  const { data, rules, priority, validation, hasData } = useAppStore();

  const handleExportCSV = async (type: TEntity) => {
    const csvData = data[type];
    if (csvData.length === 0) {
      toast.error(`No ${type} data to export`);
      return;
    }

    await exportToCSV(csvData, `${type}.csv`);
  };

  const handleExportExcel = async () => {
    const hasData =
      data.clients.length > 0 ||
      data.workers.length > 0 ||
      data.tasks.length > 0;
    if (!hasData) {
      toast.error("No data to export");
      return;
    }

    await exportToExcel(
      {
        clients: data.clients,
        workers: data.workers,
        tasks: data.tasks,
      },
      "cleaned_data.xlsx"
    );
  };

  const handleExportRules = async () => {
    if (rules.length === 0) {
      toast.error("No rules to export");
      return;
    }

    const rulesConfig = {
      rules,
      priority,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    await exportRulesJSON(rulesConfig, "rules_config.json");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Summary</CardTitle>
          <CardDescription>
            Export your cleaned data and configuration files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{data.clients.length}</div>
              <div className="text-sm text-muted-foreground">Clients</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.workers.length}</div>
              <div className="text-sm text-muted-foreground">Workers</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{data.tasks.length}</div>
              <div className="text-sm text-muted-foreground">Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{rules.length}</div>
              <div className="text-sm text-muted-foreground">Rules</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataExportCard
          type="clients"
          title="Clients Data"
          count={data.clients.length}
          handleExportCSV={handleExportCSV}
        />
        <DataExportCard
          type="workers"
          title="Workers Data"
          count={data.workers.length}
          handleExportCSV={handleExportCSV}
        />
        <DataExportCard
          type="tasks"
          title="Tasks Data"
          count={data.tasks.length}
          handleExportCSV={handleExportCSV}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Complete Data Export
            </CardTitle>
            <CardDescription>
              Export all data in a single Excel file with multiple sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportExcel}
              disabled={hasData() && validation.errors.length > 0}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel Workbook
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Rules Configuration
            </CardTitle>
            <CardDescription>
              Export rules and priority settings as JSON configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Active Rules:</span>
                <Badge>{rules.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Priority Weights:</span>
                <Badge>{Object.keys(priority).length}</Badge>
              </div>
              <Button
                variant="outline"
                onClick={handleExportRules}
                disabled={rules.length === 0}
                className="w-full bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Rules JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Export Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>Individual CSV files:</strong> Export each data type
              separately for targeted analysis
            </p>
            <p>
              • <strong>Excel Workbook:</strong> All data in one file with
              separate sheets for easy comparison
            </p>
            <p>
              • <strong>Rules JSON:</strong> Configuration file that can be
              imported later or used by other systems
            </p>
            <p>
              • <strong>File naming:</strong> Exports include timestamps to
              avoid overwriting previous versions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportSection;
