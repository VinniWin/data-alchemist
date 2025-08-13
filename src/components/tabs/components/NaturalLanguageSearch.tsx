"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NLPProcessor as SearchProcessor } from "@/lib/ai/nlp2";
import { Data } from "@/stores/data";
import { Filter, Search, Zap } from "lucide-react";
import { useState } from "react";

interface NaturalLanguageSearchProps {
  dataset: Data;
  onSearchResults: (results: any) => void;
  className?: string;
}

export function NaturalLanguageSearch({
  dataset,
  onSearchResults,
  className,
}: Readonly<NaturalLanguageSearchProps>) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearch, setLastSearch] = useState<string>("");

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setLastSearch(query);

    try {
      const results = await SearchProcessor.processQuery(query, dataset);
      onSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-purple-500" />
          <span>AI-Powered Natural Language Search</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search using natural language... e.g., 'tasks with duration more than 2 phases'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="shrink-0"
          >
            {isSearching ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Filter className="w-4 h-4" />
            )}
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>

        {lastSearch && (
          <div className="p-3 bg-green-50/20 border border-green-200 rounded-lg">
            <p className="text-sm text-green-300">
              <strong>Last search:</strong> &quot;{lastSearch}&quot;
            </p>
          </div>
        )}

        <div className="p-4 bg-card border border-blue-100 rounded-lg">
          <h4 className="font-semibold text-blue-300 mb-2">
            Natural Language Features:
          </h4>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• Query across all data entities with plain English</li>
            <li>• Supports complex conditions and comparisons</li>
            <li>• Automatic entity type detection</li>
            <li>• Smart filtering on skills, phases, priorities, and more</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
