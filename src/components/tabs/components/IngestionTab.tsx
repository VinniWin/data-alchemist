"use client";

import DataGridSection from "../sections/DataGridSection";
import FileUploadSection from "../sections/FileUploadSection";

const IngestionTab = () => {
  return (
    <div className="space-y-6">
      <FileUploadSection />
      <DataGridSection />
    </div>
  );
};

export default IngestionTab;
