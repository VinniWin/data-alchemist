import {
    Database,
    FileText,
    Settings,
    Sliders,
    Sparkles,
    Wand2,
} from "lucide-react";

export type TEntity = "clients" | "workers" | "tasks";


export const TabItems = [
  { value: "ingestion", label: "Data Ingestion", icon: Database },
  { value: "validation", label: "Validation", icon: Settings },
  { value: "search", label: "AI Search", icon: Sparkles },
  { value: "export", label: "Export", icon: FileText },
  { value: "rules", label: "Rules", icon: Settings },
  { value: "prioritization", label: "Weights", icon: Sliders },
  { value: "corrections", label: "AI Fixes", icon: Wand2 },
];


