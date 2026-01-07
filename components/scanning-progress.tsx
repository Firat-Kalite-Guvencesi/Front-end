"use client"

import { motion, AnimatePresence } from "framer-motion"
import { GitBranch, Filter, Search, FileSearch, CheckCircle2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type ScanningPhase = 
  | "github-communication" 
  | "elimination" 
  | "investigation" 
  | "identification"
  | "completion"

interface ScanningProgressProps {
  currentPhase: ScanningPhase
}

interface Stage {
  id: ScanningPhase
  label: string
  icon: React.ElementType
  tooltip: {
    title: string
    description: string
  }
}

const stages: Stage[] = [
  {
    id: "github-communication",
    label: "GitHub Communication",
    icon: GitBranch,
    tooltip: {
      title: "GitHub Communication",
      description: "Successfully connected to your repository and retrieved the project structure."
    }
  },
  {
    id: "elimination",
    label: "Elimination",
    icon: Filter,
    tooltip: {
      title: "File Elimination",
      description: "Analyzing your repository's file tree to identify and exclude non-essential files like dependencies (node_modules, .git), build artifacts, and configuration files. This optimizes the scanning process by focusing only on your source code."
    }
  },
  {
    id: "investigation",
    label: "Investigation",
    icon: Search,
    tooltip: {
      title: "Quick Investigation",
      description: "Performing a preliminary analysis to categorize files by risk level. Files are marked as: Pending (awaiting scan), Risky (potential issues detected), or Errored (problems identified). This helps prioritize which files need deeper examination."
    }
  },
  {
    id: "identification",
    label: "Identification",
    icon: FileSearch,
    tooltip: {
      title: "Problem Identification",
      description: "Deep-diving into each source file to identify code quality issues, potential bugs, security vulnerabilities, and best practice violations. Detailed analysis results will be provided for each file."
    }
  },
  {
    id: "completion",
    label: "Complete",
    icon: CheckCircle2,
    tooltip: {
      title: "Scan Complete",
      description: "All stages completed successfully. Your code analysis results are ready for review."
    }
  }
]

const getStageStatus = (stageId: ScanningPhase, currentPhase: ScanningPhase): "completed" | "active" | "pending" => {
  const stageIndex = stages.findIndex(s => s.id === stageId)
  const currentIndex = stages.findIndex(s => s.id === currentPhase)
  
  if (stageIndex < currentIndex) return "completed"
  if (stageIndex === currentIndex) return "active"
  return "pending"
}

export function ScanningProgress({ currentPhase }: ScanningProgressProps) {
  const currentPhaseIndex = stages.findIndex(s => s.id === currentPhase)
  // Show all stages up to and including current phase
  const visibleStages = stages.slice(0, currentPhaseIndex + 1)

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div 
        className="flex flex-col h-full justify-center py-8"
        layout
      >
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Progress line */}
          <motion.div
            className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"
            initial={{ height: "0%" }}
            animate={{
              height: `${(visibleStages.length - 1) / (stages.length - 1) * 100}%`
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />

          {/* Stages */}
          <motion.div 
            className="space-y-8"
            layout
          >
            <AnimatePresence mode="popLayout">
              {visibleStages.map((stage, index) => {
                const status = getStageStatus(stage.id, currentPhase)
                const Icon = stage.icon

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: index * 0.15,
                      ease: "easeOut"
                    }}
                    layout
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative flex items-center gap-4 cursor-help">
                          {/* Circle indicator */}
                          <motion.div
                            className={`relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                              status === "completed"
                                ? "bg-gradient-to-br from-blue-500 to-purple-500 border-transparent shadow-lg shadow-blue-500/50"
                                : status === "active"
                                ? "bg-card border-blue-500 shadow-lg shadow-blue-500/30"
                                : "bg-card border-border"
                            }`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.15 + 0.1, duration: 0.4, type: "spring", stiffness: 100 }}
                          >
                            {status === "active" && (
                              <motion.div
                                className="absolute inset-0 rounded-full border-2 border-blue-500"
                                animate={{
                                  scale: [1, 1.3, 1],
                                  opacity: [0.5, 0, 0.5]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              />
                            )}
                            <Icon
                              className={`h-5 w-5 ${
                                status === "completed"
                                  ? "text-white"
                                  : status === "active"
                                  ? "text-blue-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </motion.div>

                          {/* Label */}
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.15 + 0.2, duration: 0.3 }}
                            className="flex-1"
                          >
                            <div
                              className={`text-sm font-medium ${
                                status === "completed" || status === "active"
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {stage.label}
                            </div>
                            {status === "active" && (
                              <motion.div
                                className="text-xs text-blue-500 mt-0.5"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                In progress...
                              </motion.div>
                            )}
                            {status === "completed" && (
                              <motion.div 
                                className="text-xs text-green-500 mt-0.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.15 + 0.3, duration: 0.3 }}
                              >
                                Completed
                              </motion.div>
                            )}
                          </motion.div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-sm">
                        <div className="space-y-2">
                          <div className="font-semibold text-sm">{stage.tooltip.title}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            {stage.tooltip.description}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
