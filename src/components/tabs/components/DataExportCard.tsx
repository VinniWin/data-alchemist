import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TEntity } from "@/constants";
import { Download, FileText } from "lucide-react";

export const DataExportCard = ({
  type,
  title,
  count,
  handleExportCSV,
}: {
  type: TEntity;
  title: string;
  count: number;
  handleExportCSV: (type: TEntity) => void;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <h3 className="font-medium">{title}</h3>
        </div>
        <Badge variant={count > 0 ? "secondary" : "outline"}>
          {count} records
        </Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full bg-transparent"
        onClick={() => handleExportCSV(type)}
        disabled={count === 0}
      >
        <Download className="w-3 h-3 mr-2" />
        Export CSV
      </Button>
    </CardContent>
  </Card>
);
