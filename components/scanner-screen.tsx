"use client"

// @refresh reset

import { useEffect, useState, useRef } from "react"
import { FileList } from "@/components/file-list"
import { ScanningProgress, type ScanningPhase } from "@/components/scanning-progress"
import { TestGenerationModal } from "@/components/test-generation-modal"
import { motion } from "framer-motion"
import { CheckCircle, Scan, ArrowLeft, EyeOff, ChevronRight, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TreeNode, ProjectData } from "@/components/entry-screen"

interface ScannerScreenProps {
  githubUrl: string
  onBack?: () => void
}

const API_BASE_URL = "http://localhost:8000"

// Animated stat indicator component
function StatIndicator({ value, label, color }: { value: number; label: string; color: string }) {
  const prevValueRef = useRef(value)
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsAnimating(true)
      const diff = value - prevValueRef.current
      const steps = Math.abs(diff)
      let currentStep = 0

      const interval = setInterval(() => {
        currentStep++
        const newValue = prevValueRef.current + (diff > 0 ? currentStep : -currentStep)
        setDisplayValue(newValue)

        if (currentStep >= steps) {
          setDisplayValue(value)
          prevValueRef.current = value
          setIsAnimating(false)
          clearInterval(interval)
        }
      }, 20)

      return () => clearInterval(interval)
    }
  }, [value])

  return (
    <motion.div 
      className="text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className={`text-2xl font-bold ${color}`}
        key={value}
        animate={{ scale: isAnimating ? 1 : [1, 1.1, 1] }}
        transition={{ duration: 0.3 }}
        style={{
          filter: isAnimating ? "blur(4px)" : "blur(0px)"
        }}
      >
        {displayValue}
      </motion.div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  )
}

export type FileStatus = "ignored" | "pending" | "scanning" | "suspect" | "error" | "critical"

// Finding from identification phase
export interface Finding {
  line_range: string
  severity: "Critical" | "High" | "Medium" | "Low"
  type: string
  description: string
  trigger: string
  fix?: string  // Optional, for displaying suggested fixes
}

export interface FileItem {
  id: string
  name: string
  path: string
  status: FileStatus
  content: string
  // Investigation phase data
  investigationReason?: string  // Why it was marked as suspect/error
  // Identification phase data (detailed findings)
  findings?: Finding[]
  // Identifier category - 'critical' or 'error'
  identifierCategory?: "critical" | "error"
  isFolder?: boolean
  children?: FileItem[]
  depth?: number
}

// Convert TreeNode to flat FileItem array for display
const flattenTree = (node: TreeNode, depth = 0, parentPath = ""): FileItem[] => {
  const items: FileItem[] = []
  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name
  
  const item: FileItem = {
    id: `item-${currentPath}`,
    name: node.name,
    path: currentPath,  // Always use display path for visibility tracking
    status: node.status as FileStatus,
    content: "",
    isFolder: node.type === "directory",
    depth
  }
  
  items.push(item)
  
  if (node.children) {
    for (const child of node.children) {
      items.push(...flattenTree(child, depth + 1, currentPath))
    }
  }
  
  return items
}

export function ScannerScreen({ githubUrl, onBack }: ScannerScreenProps) {
  const [mainFiles, setMainFiles] = useState<FileItem[]>([])
  const [downloadableFiles, setDownloadableFiles] = useState<FileItem[]>([])
  const [isProjectExpanded, setIsProjectExpanded] = useState(true)
  const [isDownloadExpanded, setIsDownloadExpanded] = useState(true)
  const [isIgnoredExpanded, setIsIgnoredExpanded] = useState(false)
  const [expandedDownloadFileId, setExpandedDownloadFileId] = useState<string | null>(null)
  const [generatedFileIds, setGeneratedFileIds] = useState<Set<string>>(new Set())
  const [currentPhase, setCurrentPhase] = useState<ScanningPhase>("github-communication")
  const [phaseStatus, setPhaseStatus] = useState<"in-progress" | "completed">("in-progress")
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [repoName, setRepoName] = useState<string>("")
  const [isGeneratingTest, setIsGeneratingTest] = useState(false)
  const [generatingFileName, setGeneratingFileName] = useState("")
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [stats, setStats] = useState({ 
    total: 0, 
    scanned: 0, 
    ignored: 0,
    pending: 0,
    critical: 0,
    error: 0,
    suspect: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const dataLoadedRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const projectDataRef = useRef<any>(null);  // Store project data for access in investigation phase
  
  // Handle back navigation with cleanup
  const handleBack = async () => {
    try {
      // Trigger cleanup to remove Google files and clear mapping
      await fetch(`${API_BASE_URL}/api/cleanup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionIdRef.current
        }),
      })
      console.log("Cleanup completed")
    } catch (err) {
      console.error("Cleanup error:", err)
    }
    
    // Go back to entry screen
    onBack?.()
  }
  
  // Generate session_id once on component mount
  useEffect(() => {
    if (!sessionIdRef.current) {
      // Generate a unique session ID for this pipeline run
      const timestamp = new Date().toISOString().replace(/[:-]/g, '').slice(0, 15);
      const random = Math.random().toString(36).substring(2, 10);
      sessionIdRef.current = `${timestamp}_${random}`;
      console.log("Generated session_id:", sessionIdRef.current);
    }
  }, [])
  useEffect(() => {
    // Prevent duplicate loads
    if (dataLoadedRef.current) {
      console.log("Data already loaded, skipping refetch")
      return
    }
    
    // Cancel previous request if one exists (React Strict Mode protection)
    if (abortControllerRef.current) {
      console.log("Cancelling previous request due to effect re-run")
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()
    
    let aborted = false
    console.log("Starting SSE fetch for:", githubUrl)
    const startElimination = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/eliminate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            url: githubUrl,
            session_id: sessionIdRef.current  // Send session_id from frontend
          }),
          signal: abortControllerRef.current?.signal  // Add abort signal
        })
        if (!response.ok) {
          throw new Error("Failed to start repository elimination phase")
        }
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        if (!reader) {
          throw new Error("Failed to initialize stream reader")
        }
        while (true) {
          if (aborted) break
          const { done, value } = await reader.read()
          if (done) {
            console.log("SSE stream completed")
            break
          }
          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6))
                if (data.phase && data.status) {
                  console.log("SSE Event:", data.phase, data.status, data.message)
                  if (data.status === "failed") {
                    setPhaseError(data.error || `${data.phase} phase failed`)
                    setIsLoading(false)
                    return
                  }
                  setCurrentPhase(data.phase as ScanningPhase)
                  setPhaseStatus(data.status as "in-progress" | "completed")
                  if (data.phase === "data" && data.data) {
                    console.log("Received project data:", data.data)
                    const projectData = data.data
                    projectDataRef.current = projectData  // Store for use in investigation phase
                    setRepoName(projectData.repo)
                    const mainItems = flattenTree(projectData.tree)
                    
                    // Also include eliminated files (ignored_tree) with "ignored" status
                    let allItems = [...mainItems]
                    if (projectData.ignored_tree) {
                      const ignoredItems = flattenTree(projectData.ignored_tree)
                      allItems = [...allItems, ...ignoredItems]
                    }
                    
                    console.log("Main files:", mainItems.length, "items")
                    console.log("Flattened tree sample:", mainItems.slice(0, 5).map(f => ({name: f.name, path: f.path, status: f.status})))
                    console.log("Total items (including eliminated):", allItems.length)
                    setMainFiles(allItems)
                    if (projectData.ignored_tree && projectData.ignored_tree.children) {
                      const ignoredItems: FileItem[] = projectData.ignored_tree.children.map((child: any, index: number) => ({
                        id: `ignored-${index}-${child.name}`,
                        name: child.name,
                        path: child.path || child.name,
                        status: child.status as FileStatus,
                        content: "",
                        isFolder: child.type === "directory",
                        depth: 0
                      }))
                      console.log("Ignored files:", ignoredItems.length)
                    }
                    setStats({
                      total: projectData.file_count,
                      scanned: 0,
                      ignored: projectData.ignored_count,
                      pending: projectData.pending_count,
                      critical: 0,
                      error: 0,
                      suspect: 0
                    })
                    setIsLoading(false)
                    dataLoadedRef.current = true
                    console.log("Data loaded, starting investigation phase")
                    if (!aborted && projectData.pending_files) {
                      // Pass all items (including eliminated) to investigation
                      const allItemsForInvestigation = [...mainItems]
                      if (projectData.ignored_tree) {
                        const ignoredItems = flattenTree(projectData.ignored_tree)
                        allItemsForInvestigation.push(...ignoredItems)
                      }
                      startInvestigation({
                        owner: projectData.owner,
                        repo: projectData.repo,
                        branch: projectData.branch,
                        pending_files: projectData.pending_files,
                        session_id: sessionIdRef.current || undefined  // Use frontend-generated session_id
                      }, allItemsForInvestigation)
                    }
                  }
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError)
              }
            }
          }
        }
      } catch (err) {
        console.error("Error during elimination phase:", err)
        // Ignore abort errors (cleanup)
        if (err instanceof DOMException && err.name === "AbortError") {
          console.log("Elimination phase aborted (cleanup)")
          return
        }
        setPhaseError(err instanceof Error ? err.message : "Failed to eliminate files in repository")
        setIsLoading(false)
      }
    }
    startElimination()
    return () => {
      console.log("Cleaning up SSE connection")
      aborted = true
      // Also abort the fetch request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [githubUrl])

  // Generate a test file from file details
  const handleGenerateFile = async (file: FileItem) => {
    // Check if already generated
    if (generatedFileIds.has(file.id)) {
      console.log("File already generated:", file.id)
      return
    }

    setIsGeneratingTest(true)
    setGeneratingFileName(file.name)
    setGenerationError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_name: file.name,
          file_path: file.path,  // Send the full path for Google file lookup
          analysis_reason: file.investigationReason,
          findings: file.findings || [],
          session_id: sessionIdRef.current
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to generate file")
      }

      const generatedFile = await response.json()
      console.log("Generated file received:", generatedFile)

      // Mark this file as generated
      setGeneratedFileIds((prev) => new Set([...prev, file.id]))

      // Add the generated file to downloadable files
      setDownloadableFiles((prev) => [...prev, generatedFile])

      // Complete the modal animation and close it
      setTimeout(() => {
        setIsGeneratingTest(false)
      }, 1500)
    } catch (err) {
      console.error("Error generating file:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setGenerationError(errorMessage)
      
      // Auto close error after 3 seconds
      setTimeout(() => {
        setIsGeneratingTest(false)
      }, 3000)
    }
  }

  // Stage 2: Investigation - download pending files to backend
  const startInvestigation = async (
    investigateData: { owner: string; repo: string; branch: string; pending_files: string[]; session_id?: string },
    mainItems: FileItem[]
  ) => {
    try {
      setCurrentPhase("investigation")
      setPhaseStatus("in-progress")
      
      const response = await fetch(`${API_BASE_URL}/api/investigate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(investigateData),
      })

      if (!response.ok) {
        throw new Error("Failed to start investigation")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Failed to initialize stream reader")
      }

      let investigationReport: any[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log("Investigation SSE stream completed")
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6))
              console.log("Investigation SSE Event:", data.phase, data.status, data.message)
              
              if (data.status === "failed") {
                setPhaseError(data.error || "Investigation phase failed")
                return
              }
              
              setPhaseStatus(data.status as "in-progress" | "completed")
              
              // When investigation completes, update file statuses based on report
              if (data.status === "completed" && data.data?.report) {
                investigationReport = data.data.report
                console.log("Investigation report received:", investigationReport.length, "files")
                console.log("Full investigation report:", JSON.stringify(investigationReport.slice(0, 3), null, 2))
                
                // Update file statuses based on investigation report
                console.log("Processing investigation report, mainItems count:", mainItems.length)
                console.log("mainItems sample paths:", mainItems.slice(0, 3).map((f: FileItem) => f.path))
                console.log("Report items sample:", investigationReport.slice(0, 2).map((r: any) => ({path: r.filepath || r.path, category: r.category})))
                
                setMainFiles((prev) => {
                  return mainItems.map((file) => {
                    if (file.isFolder) return file
                    
                    // Find this file in the investigation report
                    const reportItem = investigationReport.find((r: any) => {
                      const reportPath = (r.filepath || r.path).replace(/\\/g, "/")  // Normalize backslashes to forward slashes
                      return (
                        reportPath === file.path || 
                        file.path.endsWith(reportPath) || 
                        reportPath.endsWith(file.path)
                      )
                    })
                    
                    if (reportItem) {
                      const newStatus = reportItem.category === "ignore" ? "ignored" : reportItem.category
                      console.log(`Updating ${file.path} -> ${newStatus}`)
                      return {
                        ...file,
                        status: newStatus as FileStatus,
                        investigationReason: reportItem.reason || reportItem.rationale
                      }
                    }
                    return file
                  })
                })
                
                // Update stats - count all ignored (both elimination + investigation phases)
                const summary = data.data.summary || {}
                const ignoredByInvestigation = summary.ignore || 0
                const ignoredByElimination = projectDataRef.current?.ignored_count || 0
                const totalIgnored = ignoredByElimination + ignoredByInvestigation
                console.log("Investigation summary:", summary)
                console.log("Ignored by investigation:", ignoredByInvestigation)
                console.log("Ignored by elimination:", ignoredByElimination)
                console.log("Total ignored:", totalIgnored)
                setStats((prev) => ({
                  ...prev,
                  scanned: investigationReport.length,
                  ignored: totalIgnored,
                  pending: (summary.suspect || 0) + (summary.error || 0),
                  suspect: summary.suspect || 0,
                  error: summary.error || 0
                }))
                
                // Start identification phase for suspect/error files
                const highRiskFiles = investigationReport.filter(
                  (f: any) => f.category === "suspect" || f.category === "error"
                )
                
                if (highRiskFiles.length > 0) {
                  startIdentification(investigationReport, sessionIdRef.current || undefined)
                } else {
                  // No high-risk files, scan complete
                  setCurrentPhase("completion")
                  setPhaseStatus("completed")
                }
              }
            } catch (parseError) {
              console.error("Error parsing investigation SSE data:", parseError)
            }
          }
        }
      }
    } catch (err) {
      console.error("Error during investigation:", err)
      // Ignore abort errors (cleanup)
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("Investigation phase aborted (cleanup)")
        return
      }
      setPhaseError(err instanceof Error ? err.message : "Failed to investigate repository")
    }
  }

  // Stage 3: Identification - deep-dive analysis on suspect/error files
  const startIdentification = async (investigationReport: any[], sessionId?: string) => {
    try {
      setCurrentPhase("identification")
      setPhaseStatus("in-progress")
      
      const response = await fetch(`${API_BASE_URL}/api/identify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          investigation_report: investigationReport,
          session_id: sessionId  // Pass session_id for logging continuity
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start identification")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Failed to initialize stream reader")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log("Identification SSE stream completed")
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6))
              console.log("Identification SSE Event:", data.phase, data.status, data.message)
              
              if (data.status === "failed") {
                setPhaseError(data.error || "Identification phase failed")
                return
              }
              
              setPhaseStatus(data.status as "in-progress" | "completed")
              
              // When identification completes, update files with detailed findings
              if (data.status === "completed" && data.data?.findings) {
                // New format: findings is Record<string, {findings: Finding[], category: 'critical' | 'error'}>
                const findingsData = data.data.findings as Record<string, { findings: Finding[], category: "critical" | "error" }>
                console.log("Identification findings received:", Object.keys(findingsData).length, "files")
                
                // Update files with findings
                setMainFiles((prev) => {
                  return prev.map((file) => {
                    if (file.isFolder) return file
                    
                    // Find findings for this file
                    const fileFindingsEntry = Object.entries(findingsData).find(([path]) => {
                      const normalizedPath = path.replace(/\\/g, "/")  // Normalize backslashes to forward slashes
                      return (
                        normalizedPath === file.path || 
                        file.path.endsWith(normalizedPath) || 
                        normalizedPath.endsWith(file.path)
                      )
                    })
                    
                    if (fileFindingsEntry) {
                      const [, fileData] = fileFindingsEntry
                      // Use the category from identifier ('critical' or 'error')
                      const newStatus = fileData.category as FileStatus
                      return {
                        ...file,
                        status: newStatus,
                        findings: fileData.findings,
                        identifierCategory: fileData.category
                      }
                    }
                    return file
                  })
                })
                
                // Update severity counts based on categories
                const categories = data.data.categories || {}
                setStats((prev) => ({
                  ...prev,
                  critical: categories.critical || 0,
                  error: categories.error || 0,
                  suspect: categories.suspect || 0,
                  pending: categories.pending || 0
                }))
                
                // Move to completion phase
                setCurrentPhase("completion")
                setPhaseStatus("completed")
              }
            } catch (parseError) {
              console.error("Error parsing identification SSE data:", parseError)
            }
          }
        }
      }
    } catch (err) {
      console.error("Error during identification:", err)
      // Ignore abort errors (cleanup)
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("Identification phase aborted (cleanup)")
        return
      }
      setPhaseError(err instanceof Error ? err.message : "Failed to identify issues")
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col relative overflow-hidden">
      {/* Animated background effects */}
      <motion.div
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -60, 40, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-cyan-500/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -80, 100, 0],
          y: [0, 100, -50, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-1/3 right-0 w-96 h-96 bg-gradient-to-tl from-purple-600/10 to-blue-500/5 rounded-full blur-3xl pointer-events-none"
      />
      
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto flex flex-col gap-6 flex-1 w-full relative z-10"
      >
        {phaseError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
            <strong>Error:</strong> {phaseError}
          </div>
        )}
        
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Main content area */}
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            <div className="flex items-center justify-between border-b border-border/30 pb-4 bg-gradient-to-r from-transparent via-slate-800/30 to-transparent rounded-lg px-4 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {onBack && (
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" onClick={handleBack} className="text-white hover:bg-white/10">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}
                <div>
                  <motion.h1
                    className="text-2xl font-bold text-foreground flex items-center gap-2"
                    animate={{ textShadow: ["0 0 0px rgba(34, 211, 238, 0)", "0 0 20px rgba(34, 211, 238, 0.3)", "0 0 0px rgba(34, 211, 238, 0)"] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                      <Scan className="h-6 w-6 text-cyan-400" />
                    </motion.div>
                    LLM-QA Analyzer
                  </motion.h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isLoading ? "🔗 Connecting to repository..." : `✨ Scanning ${repoName} (${stats.total} files)`}
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <StatIndicator value={stats.scanned} label="Scanned" color="text-cyan-400" />
                <StatIndicator value={stats.pending} label="Pending" color="text-blue-400" />
                <StatIndicator value={stats.ignored} label="Ignored" color="text-gray-400" />
                <StatIndicator value={stats.critical} label="Critical" color="text-red-500" />
                <StatIndicator value={stats.error} label="Error" color="text-red-500" />
                <StatIndicator value={stats.suspect} label="Suspect" color="text-yellow-500" />
              </div>
            </div>

            {/* Split layout: Main files and Ignored files - take remaining space */}
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Main Project Files - stretches to show all content */}
              <div className={`rounded-lg border border-border bg-card/50 overflow-hidden flex flex-col transition-all`}>
                <button
                  onClick={() => setIsProjectExpanded(!isProjectExpanded)}
                  className="w-full p-4 flex items-center gap-2 text-left hover:bg-accent/30 transition-colors"
                >
                  <motion.div animate={{ rotate: isProjectExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                  <Scan className="h-4 w-4" />
                  <span className="text-sm font-semibold text-foreground">Project Files</span>
                  <span className="text-xs text-muted-foreground ml-auto">({stats.pending} files)</span>
                </button>
                {isProjectExpanded && (
                  <div className="px-4 pb-4 flex-1 min-h-0 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading files...
                      </div>
                    ) : mainFiles.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        No files found
                      </div>
                    ) : (
                      <FileList files={mainFiles} currentPhase={currentPhase} filterStatus="not-ignored" onGenerateFile={handleGenerateFile} generatedFileIds={generatedFileIds} />
                    )}
                  </div>
                )}
              </div>

              {/* Ignored Files - scrollable when expanded */}
              <div className={`rounded-lg border border-gray-500/30 bg-gray-500/5 overflow-hidden flex flex-col transition-all ${isIgnoredExpanded ? 'h-80' : ''}`}>
                <button
                  onClick={() => setIsIgnoredExpanded(!isIgnoredExpanded)}
                  className="w-full p-4 flex items-center gap-2 text-left hover:bg-gray-500/10 transition-colors"
                >
                  <motion.div animate={{ rotate: isIgnoredExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </motion.div>
                  <EyeOff className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-400">Ignored Files</span>
                  <span className="text-xs text-gray-500 ml-auto">({stats.ignored} files)</span>
                </button>
                {isIgnoredExpanded && (
                  <div className="px-4 pb-4 overflow-y-auto flex-1 min-h-0">
                    <FileList files={mainFiles} filterStatus="ignored" onGenerateFile={handleGenerateFile} generatedFileIds={generatedFileIds} />
                  </div>
                )}
              </div>
            </div>

            {currentPhase === "completion" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border"
              >
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-foreground">Scan complete - {(stats.critical + stats.error) > 0 ? `${stats.critical + stats.error} issues found` : 'No issues found'}</span>
              </motion.div>
            )}
          </div>

          {/* Right side progress and downloads */}
          <div className="w-80 flex flex-col gap-4 sticky top-6">
            {/* Scanning Progress */}
            <div className="rounded-lg border border-border bg-card/50 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Scanning Progress</h2>
                <p className="text-xs text-muted-foreground mt-1">Processing stages</p>
              </div>
              <ScanningProgress currentPhase={currentPhase} />
            </div>

            {/* Downloadable Files */}
            <div className="rounded-lg border border-border bg-card/50 overflow-hidden flex flex-col">
              <button
                onClick={() => setIsDownloadExpanded(!isDownloadExpanded)}
                className="w-full p-4 flex items-center gap-2 text-left hover:bg-accent/30 transition-colors"
              >
                <motion.div animate={{ rotate: isDownloadExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
                <Download className="h-4 w-4" />
                <span className="text-sm font-semibold text-foreground">Downloads</span>
                <span className="text-xs text-muted-foreground ml-auto">({downloadableFiles.length})</span>
              </button>
              {isDownloadExpanded && (
                <div className="px-4 pb-4 flex-1 min-h-0 overflow-y-auto space-y-2">
                  {downloadableFiles.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      No files available
                    </div>
                  ) : (
                    <>
                      {downloadableFiles.map((file) => {
                        const isFileExpanded = expandedDownloadFileId === file.id
                        
                        return (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`rounded-lg border transition-all duration-200 ${
                              isFileExpanded 
                                ? "border-green-500/40 bg-green-500/10" 
                                : "border-border bg-card/50 hover:bg-accent/30"
                            }`}
                          >
                            {/* File Header */}
                            <button
                              onClick={() => setExpandedDownloadFileId(isFileExpanded ? null : file.id)}
                              className="w-full flex items-center gap-3 p-4 text-left transition-colors"
                            >
                              <motion.div
                                animate={{ rotate: isFileExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </motion.div>
                              
                              <Download className="h-4 w-4 text-green-500 flex-shrink-0" />
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-sm text-foreground truncate">{file.name}</div>
                              </div>
                              
                              {/* Download button on header */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Download individual file
                                  const element = document.createElement("a")
                                  const fileContent = file.content
                                  const blob = new Blob([fileContent], { type: "text/plain" })
                                  element.href = URL.createObjectURL(blob)
                                  element.download = file.name
                                  document.body.appendChild(element)
                                  element.click()
                                  document.body.removeChild(element)
                                  URL.revokeObjectURL(element.href)
                                }}
                                className="flex-shrink-0 p-2 rounded hover:bg-green-500/20 transition-colors"
                              >
                                <Download className="h-4 w-4 text-green-500" />
                              </button>
                            </button>
                            
                            {/* File Content Preview - Expandable */}
                            {isFileExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-border/50 bg-accent/10"
                              >
                                <div className="p-4 max-h-64 overflow-y-auto">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                                    Preview
                                  </div>
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono bg-background/50 p-3 rounded border border-border/30">
                                    {file.content.slice(0, 500)}
                                    {file.content.length > 500 ? "\n\n[... content truncated]" : ""}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )
                      })}
                      
                      {/* Download All - Expandable Ball */}
                      <motion.div
                        className="pt-2 flex justify-end"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <motion.button
                          onClick={() => {
                            // Download each file individually with a small delay
                            downloadableFiles.forEach((file, index) => {
                              setTimeout(() => {
                                const element = document.createElement("a")
                                const fileContent = file.content
                                const blob = new Blob([fileContent], { type: "text/plain" })
                                element.href = URL.createObjectURL(blob)
                                element.download = file.name
                                document.body.appendChild(element)
                                element.click()
                                document.body.removeChild(element)
                                URL.revokeObjectURL(element.href)
                              }, index * 200) // 200ms delay between each download
                            })
                          }}
                          whileHover="hover"
                          initial="rest"
                          className="relative"
                        >
                          {/* Ball background */}
                          <motion.div
                            variants={{
                              rest: { width: 40, height: 40 },
                              hover: { width: "auto" }
                            }}
                            transition={{ duration: 0.3 }}
                            className="rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center px-3 py-2 h-10"
                          >
                            {/* Icon */}
                            <Download className="h-5 w-5 text-green-500 flex-shrink-0" />
                            
                            {/* Text that appears on hover */}
                            <motion.span
                              variants={{
                                rest: { opacity: 0, width: 0, marginLeft: 0 },
                                hover: { opacity: 1, width: "auto", marginLeft: 8 }
                              }}
                              transition={{ duration: 0.3 }}
                              className="text-sm font-medium text-green-500 whitespace-nowrap overflow-hidden"
                            >
                              Download All
                            </motion.span>
                          </motion.div>
                        </motion.button>
                      </motion.div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Test Generation Modal */}
      <TestGenerationModal
        isOpen={isGeneratingTest}
        fileName={generatingFileName}
        isGenerating={isGeneratingTest && !generationError}
        error={generationError || undefined}
      />
    </div>
  )
}
