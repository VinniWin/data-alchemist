"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/stores/data";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { DataGrid } from "../components/DataGrid";
import { NaturalLanguageSearch } from "../components/NaturalLanguageSearch";

const AiSearchSection = () => {
  const { data, hasData } = useAppStore();
  const [searchResults, setSearchResults] = useState<{
    clients: any[];
    workers: any[];
    tasks: any[];
  }>({ clients: [], workers: [], tasks: [] });

  const handleSearchResults = (response: {
    results: { clients: any[]; workers: any[]; tasks: any[] };
  }) => {
    if (!response.results) {
      setSearchResults({ clients: [], workers: [], tasks: [] });
      return;
    }
    setSearchResults(response.results);
  };

  const clearSearch = () => {
    setSearchResults({ clients: [], workers: [], tasks: [] });
  };

  const renderEntityCard = (entityType: "clients" | "workers" | "tasks") => {
    const results = searchResults[entityType];
    if (!results || results.length === 0) return null;

    return (
      <Card className="mt-4" key={entityType}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Search Results</span>
            <div className="flex items-center space-x-2">
              <Badge>{results.length} results</Badge>
              <Badge variant="outline">{entityType}</Badge>
              <Button size="sm" variant="outline" onClick={clearSearch}>
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataGrid
            data={results}
            entityType={entityType as any}
            onDataChange={() => {}}
            editableFields={false}
          />
        </CardContent>
      </Card>
    );
  };

  return hasData() ? (
    <>
      <NaturalLanguageSearch
        dataset={data}
        onSearchResults={handleSearchResults}
      />
      {renderEntityCard("clients")}
      {renderEntityCard("workers")}
      {renderEntityCard("tasks")}
    </>
  ) : (
    <Card>
      <CardContent className="text-center py-12">
        <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold dark:text-slate-200 text-gray-700 mb-2">
          No Data to Search
        </h3>
        <p className="text-gray-500">
          Please upload some data files first to use AI search.
        </p>
      </CardContent>
    </Card>
  );
};

export default AiSearchSection;
