"use client"

import { motion } from "framer-motion"

interface EditorPanelProps {
  content: string
}

export function EditorPanel({ content }: EditorPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-lg border border-border bg-muted/30 overflow-hidden"
    >
      {/* Monaco Editor Placeholder */}
      <div className="bg-card/50 px-4 py-2 border-b border-border">
        <div className="text-xs text-muted-foreground font-mono">Code Preview</div>
      </div>

      <div className="p-4 min-h-[300px] max-h-[500px] overflow-auto">
        <pre className="text-sm font-mono text-foreground">
          <code>{content}</code>
        </pre>
      </div>
    </motion.div>
  )
}
