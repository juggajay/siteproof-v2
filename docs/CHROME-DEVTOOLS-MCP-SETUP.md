# Chrome DevTools MCP Setup Guide

## ⚠️ CRITICAL: CORRECT PACKAGE NAME

**THE ONLY CORRECT PACKAGE NAME IS:** `chrome-devtools-mcp@latest`

**DO NOT USE THESE INCORRECT NAMES:**
- ❌ `@modelcontextprotocol/server-chrome-devtools` (DOES NOT EXIST)
- ❌ `chrome-devtools-server` (WRONG)
- ❌ `mcp-chrome-devtools` (WRONG)
- ❌ Any other variation

## ✅ CORRECT INSTALLATION COMMAND

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

## 🔧 TROUBLESHOOTING STEPS

### If Chrome DevTools MCP is not working:

1. **FIRST - Check current configuration:**
```bash
cat ~/.claude.json | jq '.mcpServers."chrome-devtools"'
```

2. **SECOND - Remove any incorrect configuration:**
```bash
claude mcp remove chrome-devtools
```

3. **THIRD - Add the CORRECT configuration:**
```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

4. **FOURTH - Restart Claude Code**

## 📋 VERIFICATION

After setup, verify it's working:
1. Restart Claude Code
2. Test with: `mcp__chrome-devtools__list_pages`
3. Should see: "0: about:blank [selected]" or similar

## 🚨 COMMON MISTAKES TO AVOID

1. **Package Name Confusion:** The package is NOT under @modelcontextprotocol scope
2. **Wrong Package:** It's `chrome-devtools-mcp` not `server-chrome-devtools`
3. **Missing @latest:** Always include @latest to ensure you get the latest version

## 📝 WORKING CONFIGURATION EXAMPLE

This is what should be in ~/.claude.json:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

## 🎯 QUICK FIX COMMAND (Copy & Paste)

If Chrome DevTools MCP is broken, run this single command:
```bash
claude mcp remove chrome-devtools && claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

Then restart Claude Code.

## 📌 REMEMBER

- Package name: `chrome-devtools-mcp@latest`
- NOT: `@modelcontextprotocol/server-chrome-devtools`
- This has been tested and confirmed working multiple times
- If Claude Code suggests any other package name, refer to this document!

---
Last verified working: 2025-10-06