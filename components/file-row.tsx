"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileCode, AlertCircle, Loader2, FileWarning, Info, AlertTriangle, Sparkles, Eye, EyeOff, ChevronDown } from "lucide-react"
import type { FileItem, Finding } from "@/components/scanner-screen"
import type { ScanningPhase } from "@/components/scanning-progress"
import { EditorPanel } from "@/components/editor-panel"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FileRowProps {
  file: FileItem
  isExpanded: boolean
  onClick: () => void
  currentPhase?: ScanningPhase
  onGenerate?: (file: FileItem) => void
  isGenerated?: boolean
}

const statusConfig = {
  ignored: {
    color: "text-gray-500",
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
    dot: "bg-gray-500",
  },
  pending: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  scanning: {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    dot: "bg-blue-400",
  },
  suspect: {
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  error: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  critical: {
    color: "text-red-600",
    bg: "bg-red-600/15",
    border: "border-red-600/40",
    dot: "bg-red-600",
  },
}

const severityColors = {
  Critical: "text-red-500 bg-red-500/10",
  High: "text-orange-500 bg-orange-500/10",
  Medium: "text-yellow-500 bg-yellow-500/10",
  Low: "text-green-500 bg-green-500/10",
}

function FindingsTooltip({ file }: { file: FileItem }) {
  const hasContent = file.investigationReason || (file.findings && file.findings.length > 0)
  
  if (!hasContent) return null
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-1 rounded hover:bg-white/10 cursor-help">
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          className="max-w-md p-0 bg-popover border border-border shadow-xl"
        >
          <div className="p-3 space-y-3">
            {/* Investigation reason */}
            {file.investigationReason && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Analysis Reason
                </div>
                <p className="text-sm text-foreground">
                  {file.investigationReason}
                </p>
              </div>
            )}
            
            {/* Detailed findings */}
            {file.findings && file.findings.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Issues Found ({file.findings.length})
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {file.findings.map((finding, idx) => (
                    <div 
                      key={idx} 
                      className="p-2 rounded bg-accent/30 border border-border/50"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded font-medium",
                          severityColors[finding.severity]
                        )}>
                          {finding.severity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Lines {finding.line_range}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-foreground mb-1">
                        {finding.type}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {finding.description}
                      </p>
                      {finding.trigger && (
                        <div className="mt-2 text-xs text-muted-foreground bg-accent/50 p-1.5 rounded">
                          <div className="font-medium text-yellow-600 mb-0.5">Trigger:</div>
                          <p className="line-clamp-2">{finding.trigger}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function FileRow({ file, isExpanded, onClick, currentPhase, onGenerate, isGenerated }: FileRowProps) {
  const config = statusConfig[file.status]
  const [expandedSeverities, setExpandedSeverities] = useState<Set<string>>(new Set(["Critical", "High"]))
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set())
  const prevStatusRef = useRef(file.status)
  const [hasStatusChanged, setHasStatusChanged] = useState(false)

  // Track status changes and trigger animation
  useEffect(() => {
    if (file.status !== prevStatusRef.current) {
      prevStatusRef.current = file.status
      setHasStatusChanged(true)
      const timer = setTimeout(() => setHasStatusChanged(false), 600)
      return () => clearTimeout(timer)
    }
  }, [file.status])
  
  // Determine if this file should pulsate based on current phase
  const shouldPulsate = 
    (currentPhase === "investigation" && file.status === "pending") ||
    (currentPhase === "identification" && (file.status === "suspect" || file.status === "error"));
  
  // Show Generate button for critical or error files that have findings
  const showGenerateButton = 
    (file.status === "critical" || file.status === "error") && 
    file.findings && 
    file.findings.length > 0;

  const handleGenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGenerate) {
      onGenerate(file);
    }
  };

  const toggleSeverityExpand = (severity: string) => {
    setExpandedSeverities((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(severity)) {
        newSet.delete(severity)
      } else {
        newSet.add(severity)
      }
      return newSet
    })
  };

  const toggleFindingExpand = (findingIdx: number) => {
    setExpandedFindings((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(findingIdx)) {
        newSet.delete(findingIdx)
      } else {
        newSet.add(findingIdx)
      }
      return newSet
    })
  };

  // Group findings by severity
  const groupedFindings = file.findings?.reduce((acc, finding, idx) => {
    if (!acc[finding.severity]) {
      acc[finding.severity] = []
    }
    acc[finding.severity].push({ finding, originalIdx: idx })
    return acc
  }, {} as Record<string, Array<{ finding: Finding; originalIdx: number }>>) || {}

  return (
    <motion.div
      className={cn(
        "rounded-lg border transition-all duration-200",
        config.border,
        isExpanded ? config.bg : "bg-card hover:bg-accent/50",
      )}
      animate={
        hasStatusChanged 
          ? {
              boxShadow: [
                `inset 0 0 0 0 ${config.color === "text-red-600" ? "rgb(220, 38, 38)" : config.color === "text-red-500" ? "rgb(239, 68, 68)" : config.color === "text-yellow-500" ? "rgb(234, 179, 8)" : "rgb(59, 130, 246)"}00`,
                `inset 0 0 20 6 ${config.color === "text-red-600" ? "rgb(220, 38, 38)" : config.color === "text-red-500" ? "rgb(239, 68, 68)" : config.color === "text-yellow-500" ? "rgb(234, 179, 8)" : "rgb(59, 130, 246)"}40`,
                `inset 0 0 0 0 ${config.color === "text-red-600" ? "rgb(220, 38, 38)" : config.color === "text-red-500" ? "rgb(239, 68, 68)" : config.color === "text-yellow-500" ? "rgb(234, 179, 8)" : "rgb(59, 130, 246)"}00`
              ]
            }
          : {}
      }
      transition={{
        duration: 2.2,
        ease: "easeInOut"
      }}
    >
      <div
        style={{ paddingLeft: `${(file.depth || 0) * 24 + 16}px` }}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors"
      >
        <button onClick={onClick} className="flex-shrink-0">
          <FileCode className={cn("h-5 w-5", config.color)} />
        </button>

        <button onClick={onClick} className="flex-1 flex items-start flex-col justify-center min-w-0">
          <div className="font-mono text-sm text-foreground truncate">{file.name}</div>
          {file.path && file.path !== file.name && (
            <div className="font-mono text-xs text-muted-foreground truncate">{file.path}</div>
          )}
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Critical status indicator with pulsating animation */}
          {file.status === "critical" && (
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <AlertTriangle className={cn("h-4 w-4", config.color)} />
            </motion.div>
          )}
          
          {/* Generate button for critical/error files with findings */}
          {showGenerateButton && (
            <motion.div
              animate={isGenerated ? { opacity: 0.5 } : { opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateClick}
                disabled={isGenerated}
                className={cn(
                  "h-7 px-2 text-xs",
                  isGenerated
                    ? "border-gray-400/50 text-gray-400 hover:bg-transparent cursor-not-allowed"
                    : "border-green-500/50 text-green-500 hover:bg-green-500/10"
                )}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {isGenerated ? "Generated" : "Generate"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

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
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Investigation reason */}
              {file.investigationReason && (
                <div className="p-3 rounded-lg bg-accent/30 border border-border">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Analysis Reason
                  </div>
                  <p className="text-sm text-foreground">
                    {file.investigationReason}
                  </p>
                </div>
              )}
              
              {/* Detailed findings from identification */}
              {file.findings && file.findings.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                    Issues Found ({file.findings.length})
                  </div>
                  <div className="space-y-3">
                    {Object.entries(groupedFindings).map(([severity, findingsInGroup]) => (
                      <div key={severity}>
                        {/* Severity group header - collapsible */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSeverityExpand(severity)
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded font-semibold mb-2 transition-colors",
                            severity === "Critical" && "bg-red-500/10 border border-red-500/30 text-red-600 hover:bg-red-500/20",
                            severity === "High" && "bg-orange-500/10 border border-orange-500/30 text-orange-600 hover:bg-orange-500/20",
                            severity === "Medium" && "bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/20",
                            severity === "Low" && "bg-green-500/10 border border-green-500/30 text-green-600 hover:bg-green-500/20"
                          )}
                        >
                          <motion.div
                            animate={{ rotate: expandedSeverities.has(severity) ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </motion.div>
                          <span className="text-xs">{severity}</span>
                          <span className="text-xs opacity-70 ml-auto">({findingsInGroup.length})</span>
                        </button>

                        {/* Findings in this severity group */}
                        <AnimatePresence>
                          {expandedSeverities.has(severity) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden space-y-2 mb-2"
                            >
                              {findingsInGroup.map(({ finding, originalIdx }) => (
                                <div 
                                  key={originalIdx}
                                  className={cn(
                                    "p-3 rounded-lg border",
                                    severity === "Critical" && "bg-red-500/10 border-red-500/30",
                                    severity === "High" && "bg-orange-500/10 border-orange-500/30",
                                    severity === "Medium" && "bg-yellow-500/10 border-yellow-500/30",
                                    severity === "Low" && "bg-green-500/10 border-green-500/30"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="font-medium text-sm text-foreground">
                                      {finding.type}
                                    </div>
                                    <span className="text-xs text-muted-foreground text-right">
                                      Lines {finding.line_range}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground mb-2">
                                    {finding.description}
                                  </p>
                                  
                                  {/* Collapsible How to Trigger section */}
                                  {finding.trigger && (
                                    <div className="mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleFindingExpand(originalIdx)
                                        }}
                                        className="w-full flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
                                      >
                                        <motion.div
                                          animate={{ rotate: expandedFindings.has(originalIdx) ? 180 : 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <ChevronDown className="h-4 w-4 text-yellow-600" />
                                        </motion.div>
                                        <div className="text-xs font-semibold text-yellow-600">🎯 How to Trigger</div>
                                      </button>
                                      <AnimatePresence>
                                        {expandedFindings.has(originalIdx) && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <p className="text-xs text-muted-foreground whitespace-pre-wrap p-2 bg-yellow-500/5">
                                              {finding.trigger}
                                            </p>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                  
                                  {/* Collapsible Suggested Fix section */}
                                  {finding.fix && (
                                    <div className="mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleFindingExpand(originalIdx * 1000 + 1)
                                        }}
                                        className="w-full flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-colors"
                                      >
                                        <motion.div
                                          animate={{ rotate: expandedFindings.has(originalIdx * 1000 + 1) ? 180 : 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <ChevronDown className="h-4 w-4 text-green-600" />
                                        </motion.div>
                                        <div className="text-xs font-semibold text-green-600">💡 Suggested Fix</div>
                                      </button>
                                      <AnimatePresence>
                                        {expandedFindings.has(originalIdx * 1000 + 1) && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <p className="text-xs text-muted-foreground p-2 bg-green-500/5">
                                              {finding.fix}
                                            </p>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Code editor panel */}
              {file.content && <EditorPanel content={file.content} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
