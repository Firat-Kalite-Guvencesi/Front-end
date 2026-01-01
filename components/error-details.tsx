"use client"

import { motion } from "framer-motion"
import { AlertCircle } from "lucide-react"

interface ErrorDetailsProps {
  error: string
}

export function ErrorDetails({ error }: ErrorDetailsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-lg border border-destructive/30 bg-destructive/10 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <div className="text-sm font-medium text-destructive">Error Detected</div>
          <div className="text-sm text-foreground/80">{error}</div>
        </div>
      </div>
    </motion.div>
  )
}
