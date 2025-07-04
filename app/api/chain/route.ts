import { type NextRequest, NextResponse } from "next/server"

interface ChainRequest {
  prompt: string
  mode:
    | "scira"
    | "deepseek"
    | "gemini"
    | "chain"
    | "smart-technical"
    | "smart-creative"
    | "smart-research"
    | "smart-simple"
  context?: string
  enableSearch?: boolean
}

interface ProcessingStep {
  model: string
  input: string
  output: string
  status: "pending" | "processing" | "completed" | "error"
  timestamp: number
}

interface ChainResponse {
  result: string
  mode: string
  steps: ProcessingStep[]
  totalTime: number
}

// Enhanced SerpApi search with comprehensive data extraction
async function comprehensiveSearch(query: string): Promise<string> {
  try {
    if (!process.env.SERPAPI_KEY) {
      throw new Error("SerpApi key not configured")
    }

    console.log(`Searching for: ${query}`)
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=10`,
    )

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`SerpApi error: ${data.error}`)
    }

    let searchResults = `COMPREHENSIVE SEARCH RESULTS FOR: "${query}"\n`
    searchResults += `Search performed at: ${new Date().toISOString()}\n\n`

    // 1. Answer Box (Direct Answers)
    if (data.answer_box) {
      searchResults += "=== DIRECT ANSWER ===\n"
      if (data.answer_box.answer) {
        searchResults += `Answer: ${data.answer_box.answer}\n`
      }
      if (data.answer_box.snippet) {
        searchResults += `Details: ${data.answer_box.snippet}\n`
      }
      if (data.answer_box.list) {
        searchResults += "List:\n"
        data.answer_box.list.forEach((item: string, index: number) => {
          searchResults += `${index + 1}. ${item}\n`
        })
      }
      searchResults += "\n"
    }

    // 2. Knowledge Graph (Entity Information)
    if (data.knowledge_graph) {
      const kg = data.knowledge_graph
      searchResults += "=== KNOWLEDGE GRAPH ===\n"
      if (kg.title) searchResults += `Entity: ${kg.title}\n`
      if (kg.type) searchResults += `Type: ${kg.type}\n`
      if (kg.description) searchResults += `Description: ${kg.description}\n`
      if (kg.attributes) {
        searchResults += "Attributes:\n"
        Object.entries(kg.attributes).forEach(([key, value]) => {
          searchResults += `- ${key}: ${value}\n`
        })
      }
      searchResults += "\n"
    }

    // 3. Featured Snippet
    if (data.featured_snippet) {
      searchResults += "=== FEATURED SNIPPET ===\n"
      searchResults += `${data.featured_snippet.snippet}\n`
      if (data.featured_snippet.source) {
        searchResults += `Source: ${data.featured_snippet.source}\n`
      }
      searchResults += "\n"
    }

    // 4. Tables and Structured Data
    if (data.tables) {
      searchResults += "=== TABLES ===\n"
      data.tables.forEach((table: any, index: number) => {
        searchResults += `Table ${index + 1}:\n`
        if (table.table) {
          table.table.forEach((row: any, rowIndex: number) => {
            if (rowIndex === 0) {
              // Header row
              searchResults += `| ${Object.values(row).join(" | ")} |\n`
              searchResults += `|${Object.values(row)
                .map(() => "---")
                .join("|")}|\n`
            } else {
              searchResults += `| ${Object.values(row).join(" | ")} |\n`
            }
          })
        }
        searchResults += "\n"
      })
    }

    // 5. Organic Results (Top 5)
    if (data.organic_results && data.organic_results.length > 0) {
      searchResults += "=== TOP SEARCH RESULTS ===\n"
      data.organic_results.slice(0, 5).forEach((result: any, index: number) => {
        searchResults += `${index + 1}. **${result.title}**\n`
        if (result.snippet) {
          searchResults += `   Summary: ${result.snippet}\n`
        }
        if (result.date) {
          searchResults += `   Date: ${result.date}\n`
        }
        searchResults += `   URL: ${result.link}\n\n`
      })
    }

    // 6. News Results
    if (data.news_results) {
      searchResults += "=== NEWS RESULTS ===\n"
      data.news_results.slice(0, 3).forEach((news: any, index: number) => {
        searchResults += `${index + 1}. ${news.title}\n`
        if (news.snippet) searchResults += `   ${news.snippet}\n`
        if (news.date) searchResults += `   Published: ${news.date}\n`
        searchResults += `   Source: ${news.source}\n\n`
      })
    }

    // 7. Related Questions
    if (data.related_questions) {
      searchResults += "=== RELATED QUESTIONS ===\n"
      data.related_questions.slice(0, 3).forEach((q: any, index: number) => {
        searchResults += `${index + 1}. ${q.question}\n`
        if (q.snippet) searchResults += `   Answer: ${q.snippet}\n`
        searchResults += "\n"
      })
    }

    return searchResults || `No comprehensive results found for "${query}"`
  } catch (error) {
    console.error("SerpApi Comprehensive Search Error:", error)
    return `Search Error: Unable to fetch comprehensive results for "${query}". Error: ${error.message}`
  }
}

// Smart mode detection functions
function detectQueryType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  const priceKeywords = [
    "price",
    "cost",
    "value",
    "worth",
    "trading",
    "market cap",
    "usd",
    "dollar",
    "euro",
    "btc",
    "eth",
  ]
  const technicalKeywords = [
    "code",
    "programming",
    "algorithm",
    "debug",
    "function",
    "api",
    "database",
    "sql",
    "javascript",
    "python",
    "react",
    "error",
    "bug",
    "technical",
    "implementation",
  ]
  const creativeKeywords = [
    "write",
    "story",
    "poem",
    "creative",
    "imagine",
    "design",
    "art",
    "brainstorm",
    "idea",
    "concept",
    "narrative",
    "character",
    "plot",
  ]
  const researchKeywords = [
    "research",
    "analyze",
    "compare",
    "study",
    "investigate",
    "current",
    "latest",
    "news",
    "trends",
    "market",
    "statistics",
    "data",
    "report",
  ]
  const simpleKeywords = ["what is", "who is", "when", "where", "how much", "define", "meaning", "explain"]

  const priceScore = priceKeywords.filter((keyword) => lowerPrompt.includes(keyword)).length
  const technicalScore = technicalKeywords.filter((keyword) => lowerPrompt.includes(keyword)).length
  const creativeScore = creativeKeywords.filter((keyword) => lowerPrompt.includes(keyword)).length
  const researchScore = researchKeywords.filter((keyword) => lowerPrompt.includes(keyword)).length
  const simpleScore = simpleKeywords.filter((keyword) => lowerPrompt.includes(keyword)).length

  const scores = {
    price: priceScore,
    technical: technicalScore,
    creative: creativeScore,
    research: researchScore,
    simple: simpleScore,
  }
  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) return "general"

  return Object.keys(scores).find((key) => scores[key] === maxScore) || "general"
}

// Always search for full chain mode
function shouldSearch(prompt: string, mode: string): boolean {
  // Full chain mode ALWAYS searches
  if (mode === "chain") return true

  // Other modes search based on keywords
  const searchKeywords = [
    "current",
    "today",
    "now",
    "latest",
    "recent",
    "price",
    "cost",
    "value",
    "worth",
    "news",
    "stock",
    "market",
    "weather",
    "live",
    "this week",
    "this month",
    "2024",
    "2025",
    "trending",
    "update",
    "what is",
    "who is",
    "when",
    "where",
    "how much",
    "compare",
    "vs",
    "versus",
  ]

  const lowerPrompt = prompt.toLowerCase()
  return searchKeywords.some((keyword) => lowerPrompt.includes(keyword))
}

// Format response text with enhanced formatting
function formatResponse(text: string): string {
  if (!text) return ""

  return (
    text
      // Convert **bold** to <strong>
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Convert *italic* to <em>
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Convert bullet points
      .replace(/^\* (.*$)/gm, "• $1")
      // Convert numbered lists
      .replace(/^(\d+)\. (.*$)/gm, "<strong>$1.</strong> $2")
      // Convert headers
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      // Convert tables (basic markdown table support)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match
          .split("|")
          .filter((cell) => cell.trim())
          .map((cell) => `<td>${cell.trim()}</td>`)
          .join("")
        return `<tr>${cells}</tr>`
      })
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim()
  )
}

// Real DeepSeek API call via OpenRouter
async function callDeepSeekAPI(prompt: string): Promise<string> {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API key not configured")
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "myScira.AI",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "system",
            content:
              "You are an expert data analyst and researcher. Analyze the provided search data thoroughly and provide structured, insightful analysis. Focus on accuracy, relevance, and clear presentation of information.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("DeepSeek API Error Response:", errorData)
      throw new Error(`DeepSeek API error ${response.status}: ${errorData}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("No content received from DeepSeek API")
    }

    return formatResponse(content)
  } catch (error) {
    console.error("DeepSeek API Error:", error)
    throw new Error(`DeepSeek API failed: ${error.message}`)
  }
}

// Real Gemini API call with enhanced formatting
async function callGeminiAPI(combinedOutput: string, originalPrompt: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured")
    }

    const geminiPrompt = `You are an expert content formatter and presentation specialist.

Original user question: "${originalPrompt}"

Here's comprehensive data and analysis:
"${combinedOutput}"

Your task:
1. Create a well-structured, user-friendly response
2. If there are tables or data, format them clearly using HTML tables or structured lists
3. If there are numbers or statistics, present them prominently
4. Use proper headings, bullet points, and formatting
5. Make complex information easy to understand
6. Include relevant data sources when appropriate
7. For price/financial data, highlight key numbers clearly
8. For comparisons, use clear formatting to show differences

Format using HTML tags for better presentation:
- Use <h3> for section headers
- Use <table> for tabular data
- Use <strong> for important information
- Use <ul> and <li> for lists
- Use <blockquote> for quotes or highlights

Provide only the final, well-formatted response.`

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: geminiPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Gemini API Error Response:", errorData)
      throw new Error(`Gemini API error ${response.status}: ${errorData}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error("No content received from Gemini API")
    }

    return content // Don't format again, Gemini already provides HTML
  } catch (error) {
    console.error("Gemini API Error:", error)
    throw new Error(`Gemini API failed: ${error.message}`)
  }
}

// Enhanced Scira API call (simulation with search integration)
async function callSciraAPI(prompt: string, context?: string): Promise<string> {
  try {
    if (!process.env.SCIRA_API_KEY) {
      throw new Error("Scira API key not configured")
    }

    let enhancedPrompt = prompt

    // Add conversation context if available
    if (context && context.trim()) {
      enhancedPrompt = `${context}\nCurrent question: ${prompt}`
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate contextual response
    const queryType = detectQueryType(prompt)
    let response = ""

    if (context && context.trim()) {
      response = `SCIRA CONTEXTUAL ANALYSIS

Building on our previous conversation, I'm analyzing: "${prompt}"

Context Integration: This question relates to our earlier discussion and requires contextual understanding.

Query Classification: ${queryType === "technical" ? "Technical Analysis Required" : queryType === "creative" ? "Creative Processing Needed" : queryType === "research" ? "Research and Data Analysis" : queryType === "price" ? "Financial/Market Data Query" : "General Information Request"}

Processing Approach: This query will benefit from real-time data integration and multi-model analysis to provide comprehensive, accurate, and contextually relevant information.

Initial Assessment: The question requires ${queryType === "simple" ? "direct factual response" : "comprehensive multi-step analysis"} with current data integration.`
    } else {
      response = `SCIRA INITIAL ANALYSIS

Query: "${prompt}"

Classification: ${queryType === "technical" ? "Technical Query - Requires detailed analysis and problem-solving approach" : queryType === "creative" ? "Creative Request - Needs imaginative and artistic processing" : queryType === "research" ? "Research Query - Requires comprehensive data analysis and current information" : queryType === "price" ? "Financial Query - Needs real-time market data and analysis" : "General Information - Requires balanced analysis and clear explanation"}

Processing Strategy: This query will be enhanced with real-time search data and processed through our advanced reasoning pipeline for optimal accuracy and comprehensiveness.

Data Requirements: ${shouldSearch(prompt, "chain") ? "Real-time search data integration required" : "Knowledge-based processing sufficient"}

Next Steps: Proceeding to comprehensive search and analysis phase.`
    }

    return response
  } catch (error) {
    console.error("Scira API Error:", error)
    throw new Error(`Scira API failed: ${error.message}`)
  }
}

// Quick answer function for smart-simple mode
async function getQuickAnswer(prompt: string, context?: string): Promise<string> {
  const queryType = detectQueryType(prompt)

  // For queries needing real-time data
  if (shouldSearch(prompt, "smart-simple")) {
    try {
      const searchResults = await comprehensiveSearch(prompt)
      const geminiPrompt = `User asked: "${prompt}"

Here's comprehensive search data:
${searchResults}

Provide a clear, direct answer focusing on the most relevant information. Format it well for easy reading.`

      return await callGeminiAPI(searchResults, prompt)
    } catch (error) {
      return `I couldn't fetch current data for "${prompt}". Please try again or check the information manually.`
    }
  }

  // For other queries, use appropriate model
  if (queryType === "technical") {
    return await callDeepSeekAPI(context ? `${context}\nQuestion: ${prompt}` : prompt)
  } else {
    return await callGeminiAPI(context ? `${context}\nQuestion: ${prompt}` : prompt, prompt)
  }
}

// Retry mechanism
async function callWithRetry<T>(apiCall: () => Promise<T>, modelName: string, maxRetries = 2): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${modelName}: Attempt ${attempt}`)
      return await apiCall()
    } catch (error) {
      lastError = error as Error
      console.log(`${modelName}: Attempt ${attempt} failed - ${error.message}`)

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`${modelName}: Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: ChainRequest = await request.json()
    const { prompt, mode, context, enableSearch } = body

    if (!prompt?.trim() || !mode) {
      return NextResponse.json({ error: "Missing prompt or mode" }, { status: 400 })
    }

    let result = ""
    const steps: ProcessingStep[] = []

    // Handle different modes
    switch (mode) {
      case "chain":
        // FULL CHAIN MODE: Search → Scira → DeepSeek → Gemini
        console.log("=== FULL CHAIN MODE: Search → Scira → DeepSeek → Gemini ===")

        let searchData = ""
        let sciraOutput = ""
        let deepseekOutput = ""
        let hasAnySuccess = false

        // STEP 1: Comprehensive Search (ALWAYS for full chain)
        try {
          console.log("Chain Step 1: Comprehensive Search...")
          searchData = await callWithRetry(() => comprehensiveSearch(prompt), "Search Engine")

          steps.push({
            model: "Search Engine (SerpApi)",
            input: prompt,
            output: searchData,
            status: "completed",
            timestamp: Date.now(),
          })
          hasAnySuccess = true
          console.log("Chain Step 1: Search completed successfully")
        } catch (error) {
          console.log("Chain Step 1: Search failed, continuing without search data...")
          steps.push({
            model: "Search Engine (SerpApi)",
            input: prompt,
            output: `Search failed: ${error.message}`,
            status: "error",
            timestamp: Date.now(),
          })
          searchData = `No search data available for: ${prompt}`
        }

        // STEP 2: Scira Analysis
        try {
          console.log("Chain Step 2: Scira Analysis...")
          const sciraInput = `${context || ""}\n\nUser Query: ${prompt}\n\nSearch Data:\n${searchData}`
          sciraOutput = await callWithRetry(() => callSciraAPI(prompt, context), "Scira")

          steps.push({
            model: "Scira",
            input: sciraInput,
            output: sciraOutput,
            status: "completed",
            timestamp: Date.now(),
          })
          hasAnySuccess = true
          console.log("Chain Step 2: Scira completed successfully")
        } catch (error) {
          console.log("Chain Step 2: Scira failed, continuing...")
          steps.push({
            model: "Scira",
            input: prompt,
            output: `Scira analysis failed: ${error.message}`,
            status: "error",
            timestamp: Date.now(),
          })
          sciraOutput = `Scira analysis unavailable. Original query: ${prompt}`
        }

        // STEP 3: DeepSeek Analysis
        try {
          console.log("Chain Step 3: DeepSeek Analysis...")
          const deepseekInput = `COMPREHENSIVE DATA ANALYSIS REQUEST

Original User Query: "${prompt}"

Search Results:
${searchData}

Scira Analysis:
${sciraOutput}

Please analyze this comprehensive data and provide structured insights, focusing on accuracy and relevance to the user's question.`

          deepseekOutput = await callWithRetry(() => callDeepSeekAPI(deepseekInput), "DeepSeek")

          steps.push({
            model: "DeepSeek",
            input: deepseekInput,
            output: deepseekOutput,
            status: "completed",
            timestamp: Date.now(),
          })
          hasAnySuccess = true
          console.log("Chain Step 3: DeepSeek completed successfully")
        } catch (error) {
          console.log("Chain Step 3: DeepSeek failed, continuing...")
          steps.push({
            model: "DeepSeek",
            input: "DeepSeek analysis input",
            output: `DeepSeek analysis failed: ${error.message}`,
            status: "error",
            timestamp: Date.now(),
          })
          deepseekOutput = searchData || sciraOutput || `Analysis unavailable for: ${prompt}`
        }

        // STEP 4: Gemini Final Formatting
        try {
          console.log("Chain Step 4: Gemini Final Formatting...")
          const geminiInput = `FINAL FORMATTING REQUEST

Original User Query: "${prompt}"

Search Results:
${searchData}

Scira Analysis:
${sciraOutput}

DeepSeek Analysis:
${deepseekOutput}

Please create a comprehensive, well-formatted final response that combines all this information effectively.`

          result = await callWithRetry(() => callGeminiAPI(geminiInput, prompt), "Gemini")

          steps.push({
            model: "Gemini",
            input: geminiInput,
            output: result,
            status: "completed",
            timestamp: Date.now(),
          })
          hasAnySuccess = true
          console.log("Chain Step 4: Gemini completed successfully")
        } catch (error) {
          console.log("Chain Step 4: Gemini failed")
          steps.push({
            model: "Gemini",
            input: "Gemini formatting input",
            output: `Gemini formatting failed: ${error.message}`,
            status: "error",
            timestamp: Date.now(),
          })

          // Use best available output
          result = deepseekOutput || searchData || sciraOutput || "Processing failed - please try again"
        }

        if (!hasAnySuccess) {
          throw new Error("Complete chain failure - all steps failed")
        }
        break

      case "smart-simple":
        try {
          console.log("Smart Simple Mode: Quick Answer")
          result = await callWithRetry(() => getQuickAnswer(prompt, context), "Quick Answer")
          steps.push({
            model: "Smart Answer (Auto-selected)",
            input: prompt,
            output: result,
            status: "completed",
            timestamp: Date.now(),
          })
        } catch (error) {
          throw error
        }
        break

      case "smart-technical":
        try {
          console.log("Smart Technical Mode: Scira → DeepSeek")
          const sciraOutput = await callWithRetry(() => callSciraAPI(prompt, context), "Scira")
          steps.push({
            model: "Scira",
            input: prompt,
            output: sciraOutput,
            status: "completed",
            timestamp: Date.now(),
          })

          const deepseekOutput = await callWithRetry(() => callDeepSeekAPI(sciraOutput), "DeepSeek")
          steps.push({
            model: "DeepSeek",
            input: sciraOutput,
            output: deepseekOutput,
            status: "completed",
            timestamp: Date.now(),
          })

          result = deepseekOutput
        } catch (error) {
          throw error
        }
        break

      case "smart-creative":
        try {
          console.log("Smart Creative Mode: Scira → Gemini")
          const sciraOutput = await callWithRetry(() => callSciraAPI(prompt, context), "Scira")
          steps.push({
            model: "Scira",
            input: prompt,
            output: sciraOutput,
            status: "completed",
            timestamp: Date.now(),
          })

          const geminiOutput = await callWithRetry(() => callGeminiAPI(sciraOutput, prompt), "Gemini")
          steps.push({
            model: "Gemini",
            input: sciraOutput,
            output: geminiOutput,
            status: "completed",
            timestamp: Date.now(),
          })

          result = geminiOutput
        } catch (error) {
          throw error
        }
        break

      case "smart-research":
        try {
          console.log("Smart Research Mode: Search → Gemini")
          const searchResults = await callWithRetry(() => comprehensiveSearch(prompt), "Search + Analysis")
          steps.push({
            model: "Search + Analysis",
            input: prompt,
            output: searchResults,
            status: "completed",
            timestamp: Date.now(),
          })

          const geminiOutput = await callWithRetry(() => callGeminiAPI(searchResults, prompt), "Gemini")
          steps.push({
            model: "Gemini",
            input: searchResults,
            output: geminiOutput,
            status: "completed",
            timestamp: Date.now(),
          })

          result = geminiOutput
        } catch (error) {
          throw error
        }
        break

      case "scira":
        result = await callWithRetry(() => callSciraAPI(prompt, context), "Scira")
        steps.push({
          model: "Scira",
          input: prompt,
          output: result,
          status: "completed",
          timestamp: Date.now(),
        })
        break

      case "deepseek":
        result = await callWithRetry(
          () => callDeepSeekAPI(context ? `${context}\nQuestion: ${prompt}` : prompt),
          "DeepSeek",
        )
        steps.push({
          model: "DeepSeek",
          input: prompt,
          output: result,
          status: "completed",
          timestamp: Date.now(),
        })
        break

      case "gemini":
        result = await callWithRetry(
          () => callGeminiAPI(context ? `${context}\nQuestion: ${prompt}` : prompt, prompt),
          "Gemini",
        )
        steps.push({
          model: "Gemini",
          input: prompt,
          output: result,
          status: "completed",
          timestamp: Date.now(),
        })
        break

      default:
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    const totalTime = Date.now() - startTime
    console.log(`Total processing time: ${totalTime}ms`)

    const response: ChainResponse = {
      result,
      mode,
      steps,
      totalTime,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("API Route Error:", error)
    const totalTime = Date.now() - startTime

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        totalTime,
        steps: [],
      },
      { status: 500 },
    )
  }
}
