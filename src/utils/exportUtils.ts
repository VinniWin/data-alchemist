import * as XLSX from "xlsx";

export const exportToCSV = async (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || "";
          // Escape commas and quotes
          return typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = async (
  data: { clients: any[]; workers: any[]; tasks: any[] },
  filename: string
) => {
  const workbook = XLSX.utils.book_new();

  // Add clients sheet
  if (data.clients.length > 0) {
    const clientsSheet = XLSX.utils.json_to_sheet(data.clients);
    XLSX.utils.book_append_sheet(workbook, clientsSheet, "Clients");
  }

  // Add workers sheet
  if (data.workers.length > 0) {
    const workersSheet = XLSX.utils.json_to_sheet(data.workers);
    XLSX.utils.book_append_sheet(workbook, workersSheet, "Workers");
  }

  // Add tasks sheet
  if (data.tasks.length > 0) {
    const tasksSheet = XLSX.utils.json_to_sheet(data.tasks);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, "Tasks");
  }

  // Write and download
  XLSX.writeFile(workbook, filename);
};

export const exportRulesJSON = async (rulesConfig: any, filename: string) => {
  const jsonString = JSON.stringify(rulesConfig, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
