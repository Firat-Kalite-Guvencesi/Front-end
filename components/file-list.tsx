"use client"

import { useState } from "react"
import { FileRow } from "@/components/file-row"
import { FolderRow } from "@/components/folder-row"
import type { FileItem } from "@/components/scanner-screen"
import { motion, AnimatePresence } from "framer-motion"

interface FileListProps {
  files: FileItem[]
}

export function FileList({ files }: FileListProps) {
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

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

  const getVisibleFiles = () => {
    return files.filter((file) => {
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

  const visibleFiles = getVisibleFiles()

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visibleFiles.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
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
              <FileRow file={file} isExpanded={expandedFileId === file.id} onClick={() => handleFileClick(file.id)} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
