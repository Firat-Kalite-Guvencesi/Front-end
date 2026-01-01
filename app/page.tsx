"use client"

import { useState } from "react"
import { EntryScreen } from "@/components/entry-screen"
import { ScannerScreen } from "@/components/scanner-screen"
import { AnimatePresence, motion } from "framer-motion"

export default function Page() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [isScanning, setIsScanning] = useState(false)

  const handleStartScan = (files: any[]) => {
    setUploadedFiles(files)
    setIsScanning(true)
  }

  const handleBack = () => {
    setIsScanning(false)
    setUploadedFiles([])
  }

  return (
    <div className="min-h-screen bg-background dark">
      <AnimatePresence mode="wait">
        {!isScanning ? (
          <motion.div
            key="entry"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <EntryScreen onStartScan={handleStartScan} />
          </motion.div>
        ) : (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <ScannerScreen uploadedFiles={uploadedFiles} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
