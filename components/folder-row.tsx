"use client"

import { motion } from "framer-motion"
import { Folder, FolderOpen, ChevronRight, EyeOff } from "lucide-react"
import type { FileItem } from "@/components/scanner-screen"

interface FolderRowProps {
  folder: FileItem
  isExpanded: boolean
  onClick: () => void
}

export function FolderRow({ folder, isExpanded, onClick }: FolderRowProps) {
  const isIgnoredFolder = folder.name === "Ignored Files" || folder.status === "ignored"
  
  return (
    <button
      onClick={onClick}
      style={{ paddingLeft: `${(folder.depth || 0) * 24 + 16}px` }}
      className={`w-full flex items-center gap-3 p-4 text-left transition-colors rounded-lg border ${
        isIgnoredFolder 
          ? "bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30" 
          : "bg-card hover:bg-accent/50 border-border"
      }`}
    >
      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
        <ChevronRight className={`h-4 w-4 ${isIgnoredFolder ? "text-gray-500" : "text-muted-foreground"}`} />
      </motion.div>

      {isIgnoredFolder ? (
        <EyeOff className="h-5 w-5 flex-shrink-0 text-gray-500" />
      ) : isExpanded ? (
        <FolderOpen className="h-5 w-5 flex-shrink-0 text-white" />
      ) : (
        <Folder className="h-5 w-5 flex-shrink-0 text-white" />
      )}

      <div className="flex-1 min-w-0">
        <div className={`font-mono text-sm truncate ${isIgnoredFolder ? "text-gray-400" : "text-foreground"}`}>
          {folder.name}
        </div>
      </div>
    </button>
  )
}
