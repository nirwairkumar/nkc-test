# Using Google AI Mode MCP Safely and Efficiently

The `google-ai-mode-mcp` integration allows Antigravity to access Google Search's **AI Overviews** (formerly known as SGE or AI mode) directly. This is achieved via the `udm=50` parameter, which focuses on synthesized answers rather than just a list of links.

## 🚀 How to Trigger It
To ensure the AI uses the Google Search tool, use specific "trigger" phrases:
*   "Search for..."
*   "Using Google AI mode, find..."
*   "What are the latest updates on..."
*   "Give me an AI summary of [Topic]"

## 💡 Efficiency Tips

### 1. Be Specific with Timeframes
Since this mode pulls from live search, it's most efficient for timely information. 
*   *Inefficient:* "Tell me about Bitcoin."
*   *Efficient:* "What is the Bitcoin price trend in the last 24 hours according to Google AI mode?"

### 2. Request Citations
Google's AI mode is great at synthesizing multiple sources. You can ask Antigravity to:
*   "Summarize the latest news on [Topic] and **provide the source links**."
*   "What do recent articles say about [Topic]? Give me a breakdown with citations."

### 3. Use for Comparative Research
It excels at gathering info from across the web.
*   "Compare the features of the latest MacBook Pro models using AI search mode."

### 4. Directing the Tool
If Antigravity seems to be using its internal knowledge instead of searching, explicitly tell it:
*   "**Use the google-ai-search tool** to find information on..."

## ⚠️ Key Limitations
*   **Reverse-Engineered:** This tool uses a specific Google Search parameter (`udm=50`). If Google changes how their search filters work, the tool's effectiveness might vary.
*   **No Personal Data:** It can only search public web data, not your private emails or files.
*   **Latency:** Searching the web adds a small delay compared to internal AI knowledge. Use it only when you need real-time or very specific web-based data.

## 🛠️ Configuration Detail
The tool is configured in your `mcp_config.json` as:
```json
"google-ai-search": {
  "command": "npx",
  "args": ["-y", "google-ai-mode-mcp@latest"]
}
```
This ensures you are always using the latest version of the bridge whenever a search is performed.
