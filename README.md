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

## Install

Replace `YOUR_COLD_AGENT_API_KEY` with a key from [Cold Agent Settings > API Keys](https://getcoldagent.com/settings/api-keys).

<details open>
<summary>Claude Code</summary>

**One-line install:**

```bash
claude mcp add -e COLD_AGENT_API_KEY=YOUR_COLD_AGENT_API_KEY cold-agent -- npx -y @razroo/cold-agent-mcp
```

**Uninstall:**

```bash
claude mcp remove cold-agent
```

Or manually add to `.mcp.json` (project-level) or `~/.claude/settings.json` (global):

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

To uninstall manually, remove the `cold-agent` entry from the config file.

</details>

<details>
<summary>Claude Desktop</summary>

Add to your Claude Desktop MCP config:

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

To uninstall, remove the `cold-agent` entry from the config file.

</details>

<details>
<summary>OpenAI Codex</summary>

**One-line install:**

```bash
codex mcp add cold-agent --env COLD_AGENT_API_KEY=YOUR_COLD_AGENT_API_KEY -- npx -y @razroo/cold-agent-mcp
```

**Uninstall:**

```bash
codex mcp remove cold-agent
```

Or manually add to `~/.codex/config.toml`:

```toml
[mcp_servers.cold-agent]
command = "npx"
args = ["-y", "@razroo/cold-agent-mcp"]

[mcp_servers.cold-agent.env]
COLD_AGENT_API_KEY = "YOUR_COLD_AGENT_API_KEY"
```

To uninstall manually, remove the `[mcp_servers.cold-agent]` entry from the config file.

</details>

<details>
<summary>OpenCode</summary>

Add to `opencode.json` in your project root or `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "cold-agent": {
      "type": "local",
      "command": ["npx", "-y", "@razroo/cold-agent-mcp"],
      "enabled": true,
      "environment": {
        "COLD_AGENT_API_KEY": "YOUR_COLD_AGENT_API_KEY"
      }
    }
  }
}
```

To uninstall, remove the `cold-agent` entry from `mcp`.

</details>

<details>
<summary>Cursor</summary>

Open Settings -> MCP -> Add new MCP server, or add to `~/.cursor/mcp.json` or `.cursor/mcp.json`:

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

To uninstall, remove the entry from MCP settings.

</details>

<details>
<summary>Windsurf</summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

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

To uninstall, remove the entry from the config file.

</details>

<details>
<summary>VS Code / Copilot</summary>

**One-line install:**

```bash
code --add-mcp '{"name":"cold-agent","command":"npx","args":["-y","@razroo/cold-agent-mcp"],"env":{"COLD_AGENT_API_KEY":"YOUR_COLD_AGENT_API_KEY"}}'
```

Or add to `.vscode/mcp.json`:

```json
{
  "servers": {
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

To uninstall, remove the entry from MCP settings or delete the server from the MCP panel.

</details>

<details>
<summary>Other MCP clients</summary>

Any MCP client that supports stdio transport can use Cold Agent. The server config is:

```json
{
  "command": "npx",
  "args": ["-y", "@razroo/cold-agent-mcp"],
  "env": {
    "COLD_AGENT_API_KEY": "YOUR_COLD_AGENT_API_KEY"
  }
}
```

To uninstall, remove the server entry from your client's MCP configuration.

</details>

## Environment Variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `COLD_AGENT_API_KEY` | Yes | | Cold Agent API key. |
| `COLD_AGENT_MCP_URL` | No | `https://getcoldagent.com/api/mcp` | Hosted MCP endpoint override. |
| `COLD_AGENT_MCP_TIMEOUT_MS` | No | `60000` | Per-request timeout. |
| `COLD_AGENT_MCP_PROTOCOL_VERSION` | No | `2025-11-25` | MCP protocol version header override. |

## Phone And Voice Tools

The hosted Cold Agent MCP server includes native phone workflow tools:

- `get_voice_setup` — view voice settings and managed Twilio numbers.
- `configure_voice_settings` — set callback phone, provider, caller ID, and call logging.
- `search_voice_numbers` — find available managed Twilio numbers with pricing.
- `purchase_voice_number` — buy a managed Twilio number after explicit confirmation.
- `start_voip_call` — start a Lead Desk click-to-call. With Twilio configured, Cold Agent calls your callback phone first, then bridges to the lead from the managed caller ID.
- `setup_voip` — create a webhook API key for external call event ingestion.

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
