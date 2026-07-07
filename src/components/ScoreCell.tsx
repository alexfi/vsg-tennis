import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ScoreCellProps {
  score: string | null
  isAdmin: boolean
  isDiagonal: boolean
  isInverted: boolean
  onSave: (newScore: string) => void
  onDelete: () => void
}

export function ScoreCell({
  score,
  isAdmin,
  isDiagonal,
  isInverted,
  onSave,
  onDelete,
}: ScoreCellProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(score || "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleDoubleClick = useCallback(() => {
    if (!isAdmin || isDiagonal) return
    setValue(score || "")
    setEditing(true)
  }, [isAdmin, isDiagonal, score])

  const commit = useCallback(() => {
    setEditing(false)
    const trimmed = value.trim()
    if (!trimmed) {
      if (score) onDelete()
    } else if (trimmed !== score) {
      onSave(trimmed)
    }
  }, [value, score, onSave, onDelete])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        commit()
      } else if (e.key === "Escape") {
        setEditing(false)
        setValue(score || "")
      }
    },
    [commit, score]
  )

  // Diagonal cell (self-intersection)
  if (isDiagonal) {
    return (
      <td className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 w-24 h-12" />
    )
  }

  // Display the score. If the score is for the symmetric opposite, show inverted view.
  const displayScore = score || "\u2014"

  if (editing) {
    return (
      <td className="border border-gray-300 dark:border-gray-700 p-0 w-24 h-12">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-full w-full border-0 rounded-none text-center text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
          placeholder="6:4, 6:2"
        />
      </td>
    )
  }

  return (
    <td
      className={cn(
        "border border-gray-300 dark:border-gray-700 text-center text-xs px-1 py-2 w-24 h-12 select-none",
        isAdmin && !isDiagonal && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:ring-1 hover:ring-blue-500 hover:ring-inset",
        !score && "text-gray-300 dark:text-gray-600",
        score && "text-gray-700 dark:text-gray-200 font-medium",
        isInverted && "text-gray-400 dark:text-gray-500"
      )}
      onDoubleClick={handleDoubleClick}
    >
      {displayScore}
    </td>
  )
}
