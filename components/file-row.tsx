"use client"

import { motion, AnimatePresence } from "framer-motion"
import { FileCode, AlertCircle, Loader2, FileWarning } from "lucide-react"
import type { FileItem } from "@/components/scanner-screen"
import { EditorPanel } from "@/components/editor-panel"
import { ErrorDetails } from "@/components/error-details"
import { cn } from "@/lib/utils"

interface FileRowProps {
  file: FileItem
  isExpanded: boolean
  onClick: () => void
}

const statusConfig = {
  ignored: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-muted",
    dot: "bg-muted-foreground",
  },
  pending: {
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
    dot: "bg-chart-2",
  },
  scanning: {
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
    dot: "bg-chart-2",
  },
  suspect: {
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  error: {
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    dot: "bg-destructive",
  },
}

export function FileRow({ file, isExpanded, onClick }: FileRowProps) {
  const config = statusConfig[file.status]

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        config.border,
        isExpanded ? config.bg : "bg-card hover:bg-accent/50",
      )}
    >
      <button
        onClick={onClick}
        style={{ paddingLeft: `${(file.depth || 0) * 24 + 16}px` }}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors"
      >
        <FileCode className={cn("h-5 w-5 flex-shrink-0", config.color)} />

        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm text-foreground truncate">{file.name}</div>
          <div className="font-mono text-xs text-muted-foreground truncate">{file.path}</div>
        </div>

        <div className="flex items-center gap-2">
          {file.status === "scanning" && <Loader2 className={cn("h-4 w-4 animate-spin", config.color)} />}
          {file.status === "error" && <AlertCircle className={cn("h-4 w-4", config.color)} />}
          {file.status === "suspect" && <FileWarning className={cn("h-4 w-4", config.color)} />}

          <motion.div
            className={cn("h-2 w-2 rounded-full", config.dot)}
            animate={
              file.status === "scanning"
                ? {
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.6, 1],
                  }
                : {}
            }
            transition={
              file.status === "scanning"
                ? {
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }
                : {}
            }
          />
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <EditorPanel content={file.content} />
              {file.error && <ErrorDetails error={file.error} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
