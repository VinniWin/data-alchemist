"use client";
import { useAppStore } from "@/stores/data";
import { FileUpload } from "../components/FileUploader";

const FileUploadSection = () => {
  const { data, setData } = useAppStore();

  const handleDataParsed = (
    entityType: "clients" | "workers" | "tasks",
    data: any[]
  ) => {
    setData({ [entityType]: data });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {!data.clients.length && (
        <FileUpload
          entityType="clients"
          onDataParsed={(data) => handleDataParsed("clients", data)}
        />
      )}
      {!data.workers.length && (
        <FileUpload
          entityType="workers"
          onDataParsed={(data) => handleDataParsed("workers", data)}
        />
      )}
      {!data.tasks.length && (
        <FileUpload
          entityType="tasks"
          onDataParsed={(data) => handleDataParsed("tasks", data)}
        />
      )}
    </div>
  );
};

export default FileUploadSection;
