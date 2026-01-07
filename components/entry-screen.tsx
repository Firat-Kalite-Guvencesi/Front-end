"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Scan, Plus, Loader2, Rocket } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { ScanningPhase } from "@/components/scanning-progress"

// TreeNode type matching backend structure
export interface TreeNode {
  name: string
  type: "file" | "directory"
  status: "ignored" | "pending" | "scanning" | "suspect" | "error" | "critical"
  path?: string
  children?: TreeNode[]
}

export interface ProjectData {
  owner: string
  repo: string
  branch: string
  tree: TreeNode
  ignored_tree?: TreeNode  // Separate ignored files folder
  file_count: number
  pending_count: number
  ignored_count: number
  currentPhase?: ScanningPhase  // Current scanning phase
}

interface EntryScreenProps {
  onStartScan: (url: string) => void
}

const API_BASE_URL = "http://localhost:8000"

export function EntryScreen({ onStartScan }: EntryScreenProps) {
  const [searchValue, setSearchValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState<string>("")
  const [showRocketAnimation, setShowRocketAnimation] = useState(false)
  const [rocketFlashPos, setRocketFlashPos] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    // File upload not yet supported with SSE streaming
    setError("Local file upload is not yet supported. Please use a GitHub URL.")
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleUrlSubmit = () => {
    if (!searchValue.trim()) return
    
    // Get button position for flash effect
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setRocketFlashPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    }
    
    // Trigger rocket animation
    setShowRocketAnimation(true)
    
    // Delay the actual navigation to let animation play
    setTimeout(() => {
      onStartScan(searchValue.trim())
      setSearchValue("")
    }, 800)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim() && !isLoading) {
      handleUrlSubmit()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient glows */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -100, 50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 to-cyan-500/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -80, 100, 0],
          y: [0, 120, -60, 0],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, 60, -100, 0],
          y: [0, 80, 100, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl space-y-8 relative z-10"
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
            LLM-QA Test Code Production
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-muted-foreground"
          >
            Delivering code analysis and test generation for your repositories.
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Enter GitHub URL or repository link..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value)
                  setError(null)
                }}
                onKeyDown={handleSearchKeyDown}
                disabled={isLoading || showRocketAnimation}
                className="h-12 pr-4 bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {error && (
            <div className="text-center text-sm text-red-500 bg-red-500/10 rounded-md p-2">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="text-center text-sm text-primary space-y-2">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              <p>{currentPhase || "Starting repository analysis..."}</p>
            </div>
          )}

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

          {/* Beautiful Start Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center"
          >
            <motion.button
              ref={buttonRef}
              onClick={handleUrlSubmit}
              disabled={!searchValue.trim() || isLoading || showRocketAnimation}
              whileHover={{ scale: searchValue.trim() && !isLoading && !showRocketAnimation ? 1.05 : 1 }}
              whileTap={{ scale: searchValue.trim() && !isLoading && !showRocketAnimation ? 0.98 : 1 }}
              className="h-10 px-8 rounded-lg font-semibold text-white relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 group-hover:from-blue-500 group-hover:via-cyan-400 group-hover:to-blue-400 transition-all duration-300" />
              
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-0 group-hover:opacity-40 transition-opacity duration-300 -z-10" />

              {/* Content */}
              <div className="relative flex items-center justify-center gap-2">
                <span className="text-sm font-bold tracking-wide">Start Analysis</span>
                <motion.div
                  animate={showRocketAnimation ? { x: 400, y: -400, opacity: 0, rotate: 45 } : { x: 0, y: 0, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.8, ease: "easeIn" }}
                >
                  <Rocket className="h-4 w-4" />
                </motion.div>
              </div>
            </motion.button>
          </motion.div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Enter a GitHub repository URL and either press Enter or click "Start Analysis" to begin</p>
          </div>
        </motion.div>

        {/* Rocket trail particles */}
        <AnimatePresence>
          {showRocketAnimation && (
            <>
              {/* Bright glowing flash burst */}
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  left: rocketFlashPos.x,
                  top: rocketFlashPos.y,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  zIndex: 40,
                }}
                className="w-24 h-24 bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 rounded-full blur-xl"
              />

              {/* Secondary glow ring */}
              <motion.div
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  left: rocketFlashPos.x,
                  top: rocketFlashPos.y,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  zIndex: 39,
                }}
                className="w-32 h-32 border-2 border-cyan-400/50 rounded-full blur-lg"
              />

              {/* Flying rocket particles */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  initial={{ x: rocketFlashPos.x, y: rocketFlashPos.y, opacity: 1, scale: 1 }}
                  animate={{ x: rocketFlashPos.x + 400 + Math.random() * 100, y: rocketFlashPos.y - 400 - Math.random() * 100, opacity: 0, scale: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: "easeIn" }}
                  className="fixed pointer-events-none z-38"
                  style={{
                    left: 0,
                    top: 0,
                  }}
                >
                  <div className="w-2 h-2 bg-cyan-400 rounded-full blur-sm" />
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
