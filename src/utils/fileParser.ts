import Papa from "papaparse";
import * as XLSX from "xlsx";

export const parseFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          if (results.errors.length > 0) {
            reject(
              new Error(`CSV parsing error: ${results.errors[0].message}`)
            );
          } else {
            resolve(results.data as any[]);
          }
        },
        error: (error: Error) => reject(error),
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData as any[]);
        } catch (error) {
          reject(new Error(`Excel parsing error: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error("File reading error"));
      reader.readAsArrayBuffer(file);
    } else {
      reject(
        new Error("Unsupported file format. Please use CSV or XLSX files.")
      );
    }
  });
};

export const normalizeHeaders = (
  data: any[],
  type: "clients" | "workers" | "tasks"
): any[] => {
  if (!data || data.length === 0) return [];

  const headerMappings = {
    clients: {
      "client id": "clientId",
      clientid: "clientId",
      id: "clientId",
      name: "name",
      "client name": "name",
      email: "email",
      contact: "contact",
      phone: "contact",
    },
    workers: {
      "worker id": "workerId",
      workerid: "workerId",
      id: "workerId",
      name: "name",
      "worker name": "name",
      skills: "skills",
      skill: "skills",
      group: "group",
      team: "group",
      capacity: "capacity",
      load: "capacity",
    },
    tasks: {
      "task id": "taskId",
      taskid: "taskId",
      id: "taskId",
      title: "title",
      "task title": "title",
      name: "title",
      description: "description",
      desc: "description",
      priority: "priority",
      deadline: "deadline",
      "due date": "deadline",
      "assigned to": "assignedTo",
      worker: "assignedTo",
      status: "status",
    },
  };

  const mapping = headerMappings[type];

  return data.map((row) => {
    const normalizedRow: any = {};
    Object.keys(row).forEach((key) => {
      const normalizedKey = key.toLowerCase().trim();
      const mappedKey = mapping[normalizedKey as keyof typeof mapping] || key;
      normalizedRow[mappedKey] = row[key];
    });
    return normalizedRow;
  });
};
