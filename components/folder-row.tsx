"use client"

import { motion } from "framer-motion"
import { Folder, FolderOpen, ChevronRight } from "lucide-react"
import type { FileItem } from "@/components/scanner-screen"

interface FolderRowProps {
  folder: FileItem
  isExpanded: boolean
  onClick: () => void
}

export function FolderRow({ folder, isExpanded, onClick }: FolderRowProps) {
  return (
    <button
      onClick={onClick}
      style={{ paddingLeft: `${(folder.depth || 0) * 24 + 16}px` }}
      className="w-full flex items-center gap-3 p-4 text-left transition-colors bg-card hover:bg-accent/50 rounded-lg border border-border"
    >
      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </motion.div>

      {isExpanded ? (
        <FolderOpen className="h-5 w-5 flex-shrink-0 text-yellow-500" />
      ) : (
        <Folder className="h-5 w-5 flex-shrink-0 text-yellow-500" />
      )}

      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm text-foreground truncate">{folder.name}</div>
      </div>
    </button>
  )
}
