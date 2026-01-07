"use client"

import { useState } from "react"
import { FileRow } from "@/components/file-row"
import { FolderRow } from "@/components/folder-row"
import type { FileItem } from "@/components/scanner-screen"
import type { ScanningPhase } from "@/components/scanning-progress"
import { motion, AnimatePresence } from "framer-motion"

interface FileListProps {
  files: FileItem[]
  currentPhase?: ScanningPhase
  filterStatus?: "ignored" | "not-ignored"  // Filter by status
  onGenerateFile?: (file: FileItem) => void
  generatedFileIds?: Set<string>
}

export function FileList({ files, currentPhase, filterStatus, onGenerateFile, generatedFileIds }: FileListProps) {
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Apply status filter if provided
  const getFilteredFiles = () => {
    if (!filterStatus) return files
    
    console.log(`[FileList] Filtering with status: ${filterStatus}, total files: ${files.length}`)
    
    // First, identify which files match the filter
    const matchingLeafFiles = new Set<string>()
    files.forEach((file) => {
      if (!file.isFolder) {
        if (filterStatus === "ignored" && file.status === "ignored") {
          matchingLeafFiles.add(file.path)
        } else if (filterStatus === "not-ignored" && file.status !== "ignored") {
          matchingLeafFiles.add(file.path)
        }
      }
    })
    
    console.log(`[FileList] Matching leaf files: ${matchingLeafFiles.size}`)
    if (matchingLeafFiles.size > 0) {
      console.log(`[FileList] Sample matching paths:`, Array.from(matchingLeafFiles).slice(0, 3))
    }
    
    // Then, include folders that have matching descendants or are ancestors of matching files
    const result = files.filter((file) => {
      if (!file.isFolder) {
        // Include non-folders only if they match the filter
        return matchingLeafFiles.has(file.path)
      }
      
      // For folders, include if any descendant matches
      // A folder matches if any file path starts with the folder path
      return Array.from(matchingLeafFiles).some((filePath) =>
        filePath.startsWith(file.path + "/")
      )
    })
    
    console.log(`[FileList] Filtered result: ${result.length} items`)
    return result
  }

  const filteredFiles = getFilteredFiles()

  const handleFileClick = (fileId: string) => {
    setExpandedFileId((prev) => (prev === fileId ? null : fileId))
  }

  const handleFolderClick = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath)
      } else {
        newSet.add(folderPath)
      }
      return newSet
    })
  }

  // Filter visible files based on expanded folders
  const getVisibleFiles = (fileList: FileItem[]) => {
    return fileList.filter((file) => {
      if (file.depth === 0) return true

      // Check if all parent folders are expanded
      const pathParts = file.path.split("/")
      for (let i = 1; i < pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i).join("/")
        if (!expandedFolders.has(parentPath)) {
          return false
        }
      }
      return true
    })
  }

  const visibleFiles = getVisibleFiles(filteredFiles)

  if (visibleFiles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No files to display
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {visibleFiles.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.15,
              delay: index * 0.005,
              ease: "easeOut",
            }}
          >
            {file.isFolder ? (
              <FolderRow
                folder={file}
                isExpanded={expandedFolders.has(file.path)}
                onClick={() => handleFolderClick(file.path)}
              />
            ) : (
              <FileRow 
                file={file} 
                isExpanded={expandedFileId === file.id} 
                onClick={() => handleFileClick(file.id)} 
                currentPhase={currentPhase}
                onGenerate={onGenerateFile}
                isGenerated={generatedFileIds?.has(file.id) ?? false}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
