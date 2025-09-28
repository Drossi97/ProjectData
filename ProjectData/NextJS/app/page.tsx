"use client"

import { useState } from "react"
import { FileUploader } from "@/components/FileUploader"
import { IntervalChart } from "@/components/IntervalChart"
import { NavigationPieChart } from "@/components/NavigationPieChart"
import { useCSVProcessor } from "@/hooks/useCSVProcessor"

export default function CSVAnalyzerPage() {
  const [files, setFiles] = useState<File[]>([])
  const { results, isProcessing, processFiles, clearResults } = useCSVProcessor()

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles)
    if (newFiles.length === 0) {
      clearResults()
    }
  }

  const handleAnalyze = () => {
    processFiles(files)
  }


  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <FileUploader
          files={files}
          onFilesChange={handleFilesChange}
          onAnalyze={handleAnalyze}
          isProcessing={isProcessing}
        />

        <IntervalChart results={results} />

        <NavigationPieChart results={results} />
              </div>
    </div>
  )
}
