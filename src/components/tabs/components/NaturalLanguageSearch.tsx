"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NLPProcessor as SearchProcessor } from "@/lib/ai/nlp2";
import { Data } from "@/stores/data";
import { Filter, Search, Zap } from "lucide-react";
import { useState } from "react";

interface NaturalLanguageSearchProps {
  dataset: Data;
  onSearchResults: (results: any, entityType: string) => void;
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

  const exampleQueries = [
    "All tasks having a Duration of more than 1 phase and having phase 2 in their Preferred Phases list",
    "Workers with JavaScript skills available in phase 3",
    "Clients with priority level greater than 3",
    "Tasks in Development category requiring Python skills",
    "Workers in Engineering group with qualification level 4 or higher",
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setLastSearch(query);

    try {
      // Simulate AI processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const results = await SearchProcessor.processQuery(query, dataset);
      onSearchResults(results, results.entityType);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
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
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Last search:</strong> &quot;{lastSearch}&quot;
            </p>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 text-sm">
            Example Queries:
          </h4>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs py-1"
                onClick={() => handleExampleClick(example)}
              >
                {example.length > 50
                  ? `${example.substring(0, 50)}...`
                  : example}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">
            Natural Language Features:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
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
