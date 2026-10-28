'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useToast() {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((t: string) => {
    setText(t)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setText(null), 3200)
  }, [])
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  const node = text ? (
    <div className="toast" role="status">
      {text}
    </div>
  ) : null
  return { show, node }
}
