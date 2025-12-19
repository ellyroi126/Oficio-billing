'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Image, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

interface PaymentEvidenceUploadProps {
  value: string | null
  onChange: (path: string | null) => void
  paymentId?: string
}

export function PaymentEvidenceUpload({
  value,
  onChange,
  paymentId,
}: PaymentEvidenceUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError('')

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPG, PNG, GIF, PDF')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (paymentId) {
        formData.append('paymentId', paymentId)
      }

      const response = await fetch('/api/payments/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        onChange(result.data.filePath)
        setFileName(result.data.originalName)
      } else {
        setError(result.error || 'Failed to upload file')
      }
    } catch (err) {
      setError('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }, [onChange, paymentId])

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

  const handleRemove = () => {
    onChange(null)
    setFileName('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const getFileIcon = () => {
    if (!value) return null
    const ext = value.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return <Image className="h-8 w-8 text-green-500" />
    }
    return <File className="h-8 w-8 text-blue-500" />
  }

  if (value) {
    return (
      <div className="rounded-md border bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <div>
              <p className="font-medium text-sm">{fileName || 'Uploaded file'}</p>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View file
              </a>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`relative rounded-md border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,application/pdf"
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="lg" />
            <p className="text-sm text-gray-900">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-900" />
            <p className="text-sm text-gray-900">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-900">
              JPG, PNG, GIF or PDF (max 10MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
