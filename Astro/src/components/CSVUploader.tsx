import React from "react"

interface CSVUploaderProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  onProcessFiles: () => void
  isProcessing: boolean
  hasResults: boolean
}

export default function CSVUploader({ 
  files, 
  onFilesChange, 
  onProcessFiles, 
  isProcessing, 
  hasResults
}: CSVUploaderProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    onFilesChange(selectedFiles)
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  return (
    <div className="absolute top-4 left-4 z-50">
      <div className="bg-gray-800 bg-opacity-90 text-white p-4 rounded-lg shadow-lg border border-gray-600 max-w-sm">
        <h3 className="font-semibold mb-3 text-lg">Procesador de CSV</h3>
        
        {/* Input para subir archivos */}
        <label className="block mb-3">
          <input
            type="file"
            multiple
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <div className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 border-2 border-blue-500 cursor-pointer">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-medium">Subir CSV</span>
          </div>
        </label>
        
        {/* Botón para procesar archivos */}
        {files.length > 0 && (
          <button
            onClick={onProcessFiles}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white p-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 border-2 border-green-500 w-full mb-3"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h10a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z" />
            </svg>
            <span className="font-medium">
              {isProcessing ? 'Procesando...' : 'Procesar Datos'}
            </span>
          </button>
        )}

        {/* Lista de archivos */}
        {files.length > 0 && (
          <div className="bg-gray-700 bg-opacity-90 text-white p-3 rounded-lg shadow-lg border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Archivos seleccionados:</span>
              <span className="text-xs text-gray-400">{files.length}</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-600 p-2 rounded text-xs">
                  <span className="truncate flex-1 mr-2">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
