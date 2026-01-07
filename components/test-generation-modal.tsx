"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Sparkles, Zap, Code2 } from "lucide-react"

interface TestGenerationModalProps {
  isOpen: boolean
  fileName: string
  isGenerating: boolean
  error?: string
}

export function TestGenerationModal({
  isOpen,
  fileName,
  isGenerating,
  error,
}: TestGenerationModalProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      return
    }

    // Simulate progress that slows down (never quite reaches 100%)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + Math.random() * 10
        if (prev < 60) return prev + Math.random() * 5
        if (prev < 90) return prev + Math.random() * 2
        return Math.min(prev + 0.5, 95)
      })
    }, 300)

    return () => clearInterval(interval)
  }, [isGenerating])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-700"
          >
            {error ? (
              // Error state
              <div className="text-center">
                <motion.div
                  animate={{ x: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 0.4 }}
                  className="flex justify-center mb-4"
                >
                  <div className="bg-red-500/20 rounded-full p-4">
                    <Zap className="w-8 h-8 text-red-400" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold text-white mb-2">Generation Failed</h3>
                <p className="text-sm text-slate-400 mb-4">{error}</p>
              </div>
            ) : (
              // Loading state
              <div className="text-center">
                {/* Animated icon */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur opacity-75 animate-pulse"></div>
                    <div className="relative bg-slate-800 rounded-full p-4">
                      <Code2 className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>
                </motion.div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Generating Test
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ✨
                  </motion.span>
                </h3>

                {/* File name */}
                <p className="text-sm text-slate-400 mb-6 font-mono truncate">
                  {fileName}
                </p>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: "spring", damping: 20, stiffness: 100 }}
                      className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full"
                    ></motion.div>
                  </div>
                  <p className="text-xs text-slate-500">{Math.round(progress)}%</p>
                </div>

                {/* Status message */}
                <div className="space-y-2 text-sm text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      ⚙️
                    </motion.span>
                    <span>Analyzing code structure</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                    >
                      🧪
                    </motion.span>
                    <span>Writing test cases</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                    >
                      ✅
                    </motion.span>
                    <span>Verifying test syntax</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>

                {/* Tip */}
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                    <p className="text-xs text-slate-400">
                      This may take a moment while the AI generates and verifies your test...
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
