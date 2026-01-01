"use client"

import { useEffect, useState } from "react"
import { FileList } from "@/components/file-list"
import { motion } from "framer-motion"
import { CheckCircle, Scan, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScannerScreenProps {
  uploadedFiles: any[]
  onBack?: () => void
}

export type FileStatus = "ignored" | "pending" | "scanning" | "suspect" | "error"

export interface FileItem {
  id: string
  name: string
  path: string
  status: FileStatus
  content: string
  error?: string
  isFolder?: boolean
  children?: FileItem[]
  depth?: number
}

const buildFileHierarchy = (files: any[]): any[] => {
  const root: any = {}

  files.forEach((file) => {
    const parts = file.pathParts
    let current = root

    parts.forEach((part: string, index: number) => {
      if (!current[part]) {
        current[part] = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          isFolder: index < parts.length - 1,
          children: {},
        }
      }
      if (index === parts.length - 1 && !current[part].isFolder) {
        current[part].content = file.content
        current[part].file = file.file
      }
      current = current[part].children
    })
  })

  const convertToArray = (obj: any): any[] => {
    return Object.values(obj).map((item: any) => ({
      ...item,
      children: item.isFolder ? convertToArray(item.children) : undefined,
    }))
  }

  return convertToArray(root)
}

export function ScannerScreen({ uploadedFiles, onBack }: ScannerScreenProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [stats, setStats] = useState({ total: 0, scanned: 0, errors: 0 })

  useEffect(() => {
    const hierarchy = buildFileHierarchy(uploadedFiles)

    const flattenFiles = (items: any[], depth = 0): any[] => {
      return items.flatMap((item) => {
        const base = { ...item, depth }
        if (item.children) {
          return [base, ...flattenFiles(item.children, depth + 1)]
        }
        return [base]
      })
    }

    const allFiles = flattenFiles(hierarchy)
    let currentIndex = 0

    const revealInterval = setInterval(() => {
      if (currentIndex < allFiles.length) {
        const mockFile = allFiles[currentIndex]
        const newFile: FileItem = {
          id: `file-${currentIndex}`,
          name: mockFile.name,
          path: mockFile.path,
          status: "pending",
          content: mockFile.content || "",
          isFolder: mockFile.isFolder,
          children: mockFile.children,
          depth: mockFile.depth,
        }

        setFiles((prev) => [...prev, newFile])
        currentIndex++

        if (!mockFile.isFolder) {
          setTimeout(() => {
            setFiles((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, status: "scanning" as FileStatus } : f)))

            setTimeout(() => {
              const hasError = Math.random() > 0.7
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === newFile.id
                    ? {
                        ...f,
                        status: hasError ? "error" : "suspect",
                        error: hasError
                          ? "Potential code quality issue detected. Consider reviewing this file for best practices."
                          : undefined,
                      }
                    : f,
                ),
              )

              setStats((prev) => ({
                ...prev,
                scanned: prev.scanned + 1,
                errors: hasError ? prev.errors + 1 : prev.errors,
              }))
            }, 1200)
          }, 300)
        }
      } else {
        clearInterval(revealInterval)
      }
    }, 800)

    setStats({ total: allFiles.filter((f) => !f.isFolder).length, scanned: 0, errors: 0 })

    return () => clearInterval(revealInterval)
  }, [uploadedFiles])

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Scan className="h-6 w-6" />
                Code Inspector
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Scanning {stats.total} files...</p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.scanned}</div>
              <div className="text-xs text-muted-foreground">Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-2">{stats.total - stats.scanned}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
        </div>

        <FileList files={files} />

        {files.length > 0 && stats.scanned === stats.total && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border"
          >
            <CheckCircle className="h-5 w-5 text-chart-2" />
            <span className="text-sm text-foreground">Scan complete</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
