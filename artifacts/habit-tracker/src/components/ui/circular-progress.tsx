import React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function CircularProgress({ 
  value, 
  max, 
  size = 180, 
  strokeWidth = 16,
  className 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const safeValue = Math.min(Math.max(value, 0), max)
  const percent = max > 0 ? safeValue / max : 0
  const offset = circumference - percent * circumference

  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-secondary"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-black text-foreground tabular-nums">
          {safeValue}
        </span>
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          / {max} PTS
        </span>
      </div>
    </div>
  )
}
