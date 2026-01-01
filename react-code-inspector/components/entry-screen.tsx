"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Scan, Upload, Plus, LinkIcon, X, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"

interface EntryScreenProps {
  onStartScan: (files: any[]) => void
}

export function EntryScreen({ onStartScan }: EntryScreenProps) {
  const [searchValue, setSearchValue] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [url, setUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileStructure: any[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const path = file.webkitRelativePath || file.name
      const pathParts = path.split("/")

      fileStructure.push({
        name: file.name,
        path: path,
        file: file,
        pathParts: pathParts,
        content: await file.text(),
      })
    }

    onStartScan(fileStructure)
    setShowModal(false)
  }

  const handleUrlSubmit = () => {
    if (!url.trim()) return

    // Create mock file structure from URL
    const mockFiles = [
      {
        name: "index.tsx",
        path: "src/index.tsx",
        pathParts: ["src", "index.tsx"],
        content: "// Fetched from: " + url,
      },
      {
        name: "App.tsx",
        path: "src/App.tsx",
        pathParts: ["src", "App.tsx"],
        content: "// Sample file from repository",
      },
      {
        name: "utils.ts",
        path: "src/utils/utils.ts",
        pathParts: ["src", "utils", "utils.ts"],
        content: "// Utility functions",
      },
    ]

    onStartScan(mockFiles)
    setShowModal(false)
    setShowUrlInput(false)
    setUrl("")
  }

  const handleUploadClick = () => {
    setShowModal(false)
    fileInputRef.current?.click()
  }

  const handleUrlClick = () => {
    setShowUrlInput(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="rounded-full bg-primary/10 p-6">
              <Scan className="h-12 w-12 text-primary" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold tracking-tight text-foreground"
          >
            Living Tree Code Inspector
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-muted-foreground"
          >
            Upload your project or enter a URL to analyze code
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search for projects..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="h-12 pr-4 bg-card border-border text-white placeholder:text-muted-foreground"
              />
            </div>
            <Button onClick={() => setShowModal(true)} size="lg" className="h-12 w-12 p-0">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />

          <div className="text-center text-sm text-muted-foreground">
            <p>Click the + button to upload files or enter a repository URL</p>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowModal(false)
              setShowUrlInput(false)
              setUrl("")
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Add Project</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowModal(false)
                    setShowUrlInput(false)
                    setUrl("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!showUrlInput ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleUploadClick}
                    className="w-full h-16 text-base justify-start gap-3 bg-transparent"
                    variant="outline"
                  >
                    <div className="rounded-full bg-primary/10 p-2">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Upload Files</div>
                      <div className="text-xs text-muted-foreground">Select a folder from your computer</div>
                    </div>
                  </Button>

                  <Button
                    onClick={handleUrlClick}
                    className="w-full h-16 text-base justify-start gap-3 bg-transparent"
                    variant="outline"
                  >
                    <div className="rounded-full bg-primary/10 p-2">
                      <LinkIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Enter URL</div>
                      <div className="text-xs text-muted-foreground">Import from GitHub or repository</div>
                    </div>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={() => {
                      setShowUrlInput(false)
                      setUrl("")
                    }}
                    variant="ghost"
                    size="sm"
                    className="mb-2 text-white hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Repository URL</label>
                    <Input
                      type="url"
                      placeholder="https://github.com/username/repo"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && url.trim()) {
                          handleUrlSubmit()
                        }
                      }}
                      className="h-10"
                      autoFocus
                    />
                  </div>
                  <Button onClick={handleUrlSubmit} className="w-full" disabled={!url.trim()}>
                    Import
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
