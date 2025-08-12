import { TEntity } from "@/constants";
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

export const normalizeHeaders = (data: any[], type: TEntity): any[] => {
  if (!data || data.length === 0) return [];

  const headerMappings = {
    clients: {
      // Map to exact required schema fields
      "client id": "clientId",
      "clientid": "clientId",
      "id": "clientId",
      "client_id": "clientId",
      "client": "clientId",
      "name": "ClientName",
      "client name": "ClientName",
      "clientname": "ClientName",
      "priority": "PriorityLevel",
      "priority level": "PriorityLevel",
      "prioritylevel": "PriorityLevel",
      "level": "PriorityLevel",
      "tasks": "RequestedTaskIDs",
      "requested tasks": "RequestedTaskIDs",
      "requestedtaskids": "RequestedTaskIDs",
      "task ids": "RequestedTaskIDs",
      "group": "GroupTag",
      "group tag": "GroupTag",
      "grouptag": "GroupTag",
      "tag": "GroupTag",
      "attributes": "AttributesJSON",
      "attributes json": "AttributesJSON",
      "attributesjson": "AttributesJSON",
      "metadata": "AttributesJSON",
      "json": "AttributesJSON",
    },
    workers: {
      // Map to exact required schema fields
      "worker id": "workerId",
      "workerid": "workerId",
      "id": "workerId",
      "worker_id": "workerId",
      "worker": "workerId",
      "name": "WorkerName",
      "worker name": "WorkerName",
      "workername": "WorkerName",
      "skills": "skills",
      "skill": "skills",
      "capabilities": "skills",
      "expertise": "skills",
      "available slots": "AvailableSlots",
      "availableslots": "AvailableSlots",
      "slots": "AvailableSlots",
      "phases": "AvailableSlots",
      "max load per phase": "MaxLoadPerPhase",
      "maxloadperphase": "MaxLoadPerPhase",
      "max load": "MaxLoadPerPhase",
      "capacity": "MaxLoadPerPhase",
      "load": "MaxLoadPerPhase",
      "worker group": "WorkerGroup",
      "workergroup": "WorkerGroup",
      "group": "WorkerGroup",
      "team": "WorkerGroup",
      "qualification level": "QualificationLevel",
      "qualificationlevel": "QualificationLevel",
      "qualification": "QualificationLevel",
      "level": "QualificationLevel",
      "experience": "QualificationLevel",
    },
    tasks: {
      // Map to exact required schema fields
      "task id": "taskId",
      "taskid": "taskId",
      "id": "taskId",
      "task_id": "taskId",
      "task": "taskId",
      "name": "TaskName",
      "task name": "TaskName",
      "taskname": "TaskName",
      "title": "TaskName",
      "category": "Category",
      "type": "Category",
      "duration": "Duration",
      "time": "Duration",
      "phases": "Duration",
      "required skills": "RequiredSkills",
      "requiredskills": "RequiredSkills",
      "skills": "RequiredSkills",
      "skill": "RequiredSkills",
      "preferred phases": "PreferredPhases",
      "preferredphases": "PreferredPhases",
      "timing": "PreferredPhases",
      "max concurrent": "MaxConcurrent",
      "maxconcurrent": "MaxConcurrent",
      "concurrent": "MaxConcurrent",
      "parallel": "MaxConcurrent",
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
