"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Search, Wifi, Database } from "lucide-react"

interface RealTimeIndicatorProps {
  isSearching: boolean
  searchProgress: number
  hasSearchData: boolean
}

export function RealTimeIndicator({ isSearching, searchProgress, hasSearchData }: RealTimeIndicatorProps) {
  if (!isSearching && !hasSearchData) return null

  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2">
        {isSearching ? (
          <>
            <Search className="h-4 w-4 animate-pulse text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">Fetching real-time data...</span>
            <Progress value={searchProgress} className="w-20 h-1" />
          </>
        ) : hasSearchData ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
              <Database className="h-3 w-3 mr-1" />
              Live Data Integrated
            </Badge>
          </>
        ) : null}
      </div>
    </div>
  )
}
