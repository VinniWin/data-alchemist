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
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleSearchResults = (results: any, entityType: string) => {
    setSearchResults({ ...results, entityType });
  };

  const clearSearch = () => {
    setSearchResults(null);
  };

  return (
    <>
      {" "}
      {hasData() ? (
        <>
          <NaturalLanguageSearch
            dataset={data}
            onSearchResults={handleSearchResults}
          />

          {searchResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Search Results</span>
                  <div className="flex items-center space-x-2">
                    <Badge>{searchResults.totalFound} results</Badge>
                    <Badge variant="outline">{searchResults.entityType}</Badge>
                    <Button size="sm" variant="outline" onClick={clearSearch}>
                      Clear
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataGrid
                  data={searchResults.results}
                  entityType={searchResults.entityType}
                  onDataChange={() => {}}
                  editableFields={false}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Data to Search
            </h3>
            <p className="text-gray-500">
              Please upload some data files first to use AI search.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AiSearchSection;
