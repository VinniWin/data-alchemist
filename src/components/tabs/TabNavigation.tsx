"use client";
import {
  Database,
  Settings,
  Sparkles,
  FileText,
  Sliders,
  Wand2,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const TabNavigation = () => {
  return (
    <TabsList className="w-full lg:w-fit mx-auto">
      <TabsTrigger value="ingestion" className="flex items-center space-x-2">
        <Database className="w-4 h-4" />
        <span>Data Ingestion</span>
      </TabsTrigger>
      <TabsTrigger value="validation" className="flex items-center space-x-2">
        <Settings className="w-4 h-4" />
        <span>Validation</span>
      </TabsTrigger>
      <TabsTrigger value="search" className="flex items-center space-x-2">
        <Sparkles className="w-4 h-4" />
        <span>AI Search</span>
      </TabsTrigger>
      <TabsTrigger value="export" className="flex items-center space-x-2">
        <FileText className="w-4 h-4" />
        <span>Export</span>
      </TabsTrigger>
      <TabsTrigger value="rules" className="flex items-center space-x-2">
        <Settings className="w-4 h-4" />
        <span>Rules</span>
      </TabsTrigger>
      <TabsTrigger
        value="prioritization"
        className="flex items-center space-x-2"
      >
        <Sliders className="w-4 h-4" />
        <span>Weights</span>
      </TabsTrigger>
      <TabsTrigger value="corrections" className="flex items-center space-x-2">
        <Wand2 className="w-4 h-4" />
        <span>AI Fixes</span>
      </TabsTrigger>
    </TabsList>
  );
};

export default TabNavigation;
