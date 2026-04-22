'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, CheckCircle, File, AlertCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

interface MarkAsSignedModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  contractNumber: string
  clientName: string
  onSuccess: () => void
}

export default function MarkAsSignedModal({
  isOpen,
  onClose,
  contractId,
  contractNumber,
  clientName,
  onSuccess,
}: MarkAsSignedModalProps) {
  const [signedPdfPath, setSignedPdfPath] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      return
    }

    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 20MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientName', clientName)
      formData.append('contractNumber', contractNumber)

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setSignedPdfPath(result.data.filePath)
        setFileName(result.data.originalName || file.name)
      } else {
        setError(result.error || 'Failed to upload file')
      }
    } catch {
      setError('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }, [clientName, contractNumber])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }, [handleFile])

  if (!isOpen) return null

  const handleRemoveFile = () => {
    setSignedPdfPath(null)
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { markAsSigned: true }
      if (signedPdfPath) {
        body.signedPdfPath = signedPdfPath
      }

      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to mark as signed')

      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting && !uploading) {
      setSignedPdfPath(null)
      setFileName('')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mark as Signed
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting || uploading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload the signed copy of <span className="font-medium text-gray-900 dark:text-gray-100">{contractNumber}</span>.
            The original contract files will be preserved.
          </p>

          {/* File upload area */}
          {signedPdfPath ? (
            <div className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{fileName}</p>
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      Uploaded
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`relative rounded-md border-2 border-dashed p-6 text-center transition-colors mb-4 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={handleChange}
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={uploading}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Spinner size="lg" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PDF only (max 20MB)
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Uploading a signed copy is optional. You can mark as signed without uploading a file.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting || uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {submitting && <Spinner size="sm" className="mr-2" />}
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark as Signed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
