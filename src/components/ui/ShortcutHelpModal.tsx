'use client'

import { shortcutsList } from '@/hooks/useKeyboardShortcuts'
import { X, Keyboard } from 'lucide-react'

interface ShortcutHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutHelpModal({ isOpen, onClose }: ShortcutHelpModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <ul className="space-y-3">
            {shortcutsList.map((shortcut) => (
              <li key={shortcut.keys} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                <kbd className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                  {shortcut.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 text-center">
          <p className="text-xs text-gray-400">Press <kbd className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1 font-mono text-xs">?</kbd> to toggle this dialog</p>
        </div>
      </div>
    </div>
  )
}
