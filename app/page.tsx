"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, Bot, User, ChevronDown, ChevronRight, Settings, Search, Eye, EyeOff, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Mode = "chain" | "single" | "smart-technical" | "smart-creative" | "smart-research" | "smart-simple"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: number
  steps?: ProcessingStep[]
  mode?: Mode
  totalTime?: number
}

interface ProcessingStep {
  model: string
  input: string
  output: string
  status: "pending" | "processing" | "completed" | "error"
  timestamp: number
}

interface ApiResponse {
  result: string
  mode: string
  steps: ProcessingStep[]
  totalTime: number
}

export default function AIAssistantInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<Mode>("chain")
  const [showSteps, setShowSteps] = useState(false)
  const [enableSearch, setEnableSearch] = useState(true)
  const [enableContext, setEnableContext] = useState(true)
  const [expandedSteps, setExpandedSteps] = useState<{ [key: string]: boolean }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const toggleStepExpansion = (messageId: string, stepIndex: number) => {
    const key = `${messageId}-${stepIndex}`
    setExpandedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Get conversation context for context-aware responses
  const getConversationContext = (): string => {
    if (!enableContext || messages.length === 0) return ""

    // Get last 3 messages for context (excluding current input)
    const recentMessages = messages.slice(-6) // 3 user + 3 assistant messages
    let context = "Previous conversation context:\n"

    recentMessages.forEach((msg, index) => {
      if (msg.role === "user") {
        context += `User: ${msg.content}\n`
      } else {
        // Truncate long assistant responses for context
        const truncatedContent = msg.content.length > 200 ? msg.content.substring(0, 200) + "..." : msg.content
        context += `Assistant: ${truncatedContent}\n`
      }
    })

    return context + "\n"
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: "user",
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue.trim()
    setInputValue("")
    setIsLoading(true)

    try {
      // Get conversation context
      const context = getConversationContext()

      const response = await fetch("/api/chain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: currentInput,
          mode: mode,
          context: context,
          enableSearch: enableSearch,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data: ApiResponse = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.result,
        role: "assistant",
        timestamp: Date.now(),
        steps: data.steps,
        mode: mode,
        totalTime: data.totalTime,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble processing your request right now. Please try again.",
        role: "assistant",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessageContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>")
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const getStepColor = (model: string) => {
    if (model.includes("Search")) return "bg-green-100 text-green-800 border-green-200"
    if (model.includes("Scira")) return "bg-blue-100 text-blue-800 border-blue-200"
    if (model.includes("DeepSeek")) return "bg-purple-100 text-purple-800 border-purple-200"
    if (model.includes("Gemini")) return "bg-orange-100 text-orange-800 border-orange-200"
    return "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getModeDescription = (selectedMode: Mode) => {
    switch (selectedMode) {
      case "chain":
        return "Full processing chain: Search → Scira → DeepSeek → Gemini (Most comprehensive)"
      case "smart-technical":
        return "Optimized for coding, technical questions, and problem-solving (Scira → DeepSeek)"
      case "smart-creative":
        return "Best for creative writing, brainstorming, and artistic tasks (Scira → Gemini)"
      case "smart-research":
        return "Enhanced with real-time search for current information (Search → Gemini)"
      case "smart-simple":
        return "Quick, direct answers with real-time data when needed (Auto-selected model)"
      case "single":
        return "Process with one selected model only"
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-mono font-bold text-gray-900">myScira.AI</h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Processing Mode:</span>
              <Select value={mode} onValueChange={(value: Mode) => setMode(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chain">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>Full Chain (Search→AI→AI→AI)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="smart-technical">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>Smart: Technical Focus</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="smart-creative">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Smart: Creative Tasks</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="smart-research">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Smart: Research & Analysis</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="smart-simple">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      <span>Smart: Quick Answers</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="single">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Single Model Only</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Title Section */}
      <div className="max-w-4xl mx-auto px-8 py-12 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">AI Model Processing Chain</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
          Advanced AI processing with real-time search integration and multi-model analysis
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-3xl mx-auto">
          <p className="text-sm text-blue-800">
            <strong>Current Mode:</strong> {getModeDescription(mode)}
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="max-w-4xl mx-auto px-8 pb-32">
        <div className="space-y-8">
          {messages.map((message) => (
            <div key={message.id} className="space-y-6">
              {/* Chat Message */}
              <div className={`flex items-start gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    message.role === "assistant" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {message.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[75%] ${message.role === "user" ? "text-right" : "text-left"}`}>
                  <div
                    className={`rounded-2xl px-6 py-4 ${
                      message.role === "assistant"
                        ? "bg-gray-50 text-gray-900 shadow-sm border border-gray-100"
                        : "bg-blue-50 text-gray-900 border border-blue-100"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="text-sm font-semibold text-gray-700 mb-2">Scira Assistant</div>
                    )}
                    <div
                      className="text-base leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: message.content,
                      }}
                      style={{
                        fontSize: "16px",
                        lineHeight: "1.6",
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-2 px-2">
                    {formatTimestamp(message.timestamp)}
                    {message.totalTime && <span className="ml-2">• {message.totalTime}ms</span>}
                  </div>
                </div>
              </div>

              {/* Processing Chain Visualization */}
              {message.role === "assistant" && message.steps && message.steps.length > 0 && (
                <div className="ml-14 space-y-4">
                  {/* Toggle Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSteps(!showSteps)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {showSteps ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showSteps ? "Hide" : "Show"} Processing Steps ({message.steps.length} steps)
                  </Button>

                  {/* Processing Steps */}
                  {showSteps && (
                    <div className="grid gap-4">
                      {message.steps.map((step, index) => {
                        const isExpanded = expandedSteps[`${message.id}-${index}`]
                        return (
                          <Card key={index} className="border border-gray-200 shadow-sm">
                            <CardHeader
                              className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleStepExpansion(message.id, index)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge className={`${getStepColor(step.model)} border`}>
                                    Step {index + 1}: {step.model}
                                  </Badge>
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      step.status === "completed"
                                        ? "bg-green-500"
                                        : step.status === "error"
                                          ? "bg-red-500"
                                          : "bg-gray-400"
                                    }`}
                                  />
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            </CardHeader>

                            {isExpanded && (
                              <CardContent className="pt-0">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Input:</h4>
                                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 border max-h-40 overflow-y-auto">
                                      {step.input.length > 500 ? `${step.input.substring(0, 500)}...` : step.input}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Output:</h4>
                                    <div className="bg-white rounded-lg p-3 text-sm text-gray-800 border max-h-60 overflow-y-auto">
                                      <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{
                                          __html: step.output,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading Animation */}
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div className="max-w-[75%]">
                <div className="rounded-2xl px-6 py-4 bg-gray-50 shadow-sm border border-gray-100">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Scira Assistant</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {mode === "chain" ? "Processing through full chain..." : "Processing your request..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Options */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Real-time Search</span>
              <Switch checked={enableSearch} onCheckedChange={setEnableSearch} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Context Awareness</span>
              <Switch checked={enableContext} onCheckedChange={setEnableContext} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Show Processing Steps</span>
              <Switch checked={showSteps} onCheckedChange={setShowSteps} size="sm" />
            </div>
          </div>

          {/* Input */}
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything…"
              disabled={isLoading}
              className="w-full bg-gray-100 text-gray-900 rounded-2xl px-6 py-4 pr-16 text-base border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-lg"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed p-0 shadow-sm"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
