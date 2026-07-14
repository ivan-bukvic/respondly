'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ResponseEditorProps = {
  initialText: string
  disabled?: boolean
  onCancel: () => void
  onSave: (finalText: string) => Promise<void>
}

export function ResponseEditor({
  initialText,
  disabled = false,
  onCancel,
  onSave,
}: ResponseEditorProps) {
  const [text, setText] = useState(initialText)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = text.trim()
    if (!trimmed || saving) {
      return
    }

    setSaving(true)
    try {
      await onSave(trimmed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled || saving}
        rows={5}
        aria-label="Edited response"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || saving || !text.trim()}
          onClick={handleSave}
        >
          {saving ? 'Sending...' : 'Save & send'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
