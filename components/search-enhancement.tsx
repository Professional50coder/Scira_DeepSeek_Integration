"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Globe, Clock, TrendingUp } from "lucide-react"

interface SearchEnhancementProps {
  query: string
  isActive: boolean
}

export function SearchEnhancement({ query, isActive }: SearchEnhancementProps) {
  const [searchKeywords] = useState([
    "weather",
    "today",
    "current",
    "now",
    "latest",
    "recent",
    "news",
    "price",
    "stock",
    "live",
    "what is",
    "how much",
    "when is",
    "where is",
  ])

  const detectSearchNeed = (text: string): boolean => {
    const lowerText = text.toLowerCase()
    return searchKeywords.some((keyword) => lowerText.includes(keyword))
  }

  const needsSearch = detectSearchNeed(query)

  if (!isActive || !needsSearch) return null

  return (
    <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Search className="h-4 w-4" />
          Real-time Search Enhancement
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Live Data
          </Badge>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Current Results
          </Badge>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Enhanced Context
          </Badge>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Your query appears to need current information. The AI models will be enhanced with real-time search results
          from Google to provide accurate, up-to-date responses.
        </p>
      </CardContent>
    </Card>
  )
}
