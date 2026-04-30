# Cold Agent MCP

Stdio bridge for the hosted [Cold Agent](https://getcoldagent.com) MCP server.

Cold Agent's canonical MCP endpoint is:

```text
https://getcoldagent.com/api/mcp
```

Use this package when your MCP client prefers a local stdio command instead of a remote Streamable HTTP server.

## Requirements

- Node.js 18 or newer
- A paid Cold Agent workspace
- A Cold Agent API key from [Settings > API Keys](https://getcoldagent.com/settings/api-keys)

## Claude Code, Codex, OpenCode, and other stdio MCP clients

```json
{
  "mcpServers": {
    "cold-agent": {
      "command": "npx",
      "args": ["-y", "@razroo/cold-agent-mcp"],
      "env": {
        "COLD_AGENT_API_KEY": "YOUR_COLD_AGENT_API_KEY"
      }
    }
  }
}
```

## Environment Variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `COLD_AGENT_API_KEY` | Yes | | Cold Agent API key. |
| `COLD_AGENT_MCP_URL` | No | `https://getcoldagent.com/api/mcp` | Hosted MCP endpoint override. |
| `COLD_AGENT_MCP_TIMEOUT_MS` | No | `60000` | Per-request timeout. |
| `COLD_AGENT_MCP_PROTOCOL_VERSION` | No | `2025-11-25` | MCP protocol version header override. |

## Remote MCP Config

If your client supports hosted Streamable HTTP servers with headers, you can skip this package:

```json
{
  "mcpServers": {
    "cold-agent": {
      "url": "https://getcoldagent.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_COLD_AGENT_API_KEY"
      }
    }
  }
}
```

## What This Package Does

This package is intentionally thin:

- reads JSON-RPC messages from stdio
- forwards them to `https://getcoldagent.com/api/mcp`
- attaches your Cold Agent API key as a bearer token
- writes MCP responses back to stdio

It does not contain Cold Agent business logic and does not store credentials.

## Development

```bash
npm test
```

## Publishing

The GitHub Actions publish workflow expects an `NPM_TOKEN` repository secret.

Dry-run from the GitHub CLI:

```bash
gh workflow run publish.yml --ref main -f dry_run=true -f tag=latest
```

Publish the version in `package.json`:

```bash
gh workflow run publish.yml --ref main -f dry_run=false -f tag=latest
```

<!-- mcp-name: io.github.razroo/cold-agent-mcp -->
