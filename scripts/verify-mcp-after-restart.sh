#!/bin/bash
# Run this after restarting Claude Code

echo "🔍 Checking MCP Server Status..."
echo ""

# Check MCP list
claude mcp list 2>&1 | grep -E "supabase|playwright|filesystem|memory"

echo ""
echo "✅ If supabase shows '✓ Connected', MCP is ready!"
echo "⚠️ If it still shows 'Needs authentication', proceed with Option 2 (Direct client)"
