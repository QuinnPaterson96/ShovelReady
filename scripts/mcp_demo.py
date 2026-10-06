"""Real loopback MCP client smoke: tools/list and tools/call, without an LLM or live lookup."""

import argparse
import asyncio
import json
from pathlib import Path
from urllib.parse import urlsplit

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


async def verify(url: str):
    parsed = urlsplit(url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("Demo smoke only accepts a loopback endpoint")
    fixture = Path(__file__).resolve().parents[1] / "docs/mcp-demo/synthetic-screen.json"
    async with streamable_http_client(url) as (read, write, _):
        async with ClientSession(read, write) as client:
            await client.initialize()
            tools = await client.list_tools()
            assert {tool.name for tool in tools.tools} == {
                "supported_models",
                "property_candidates",
                "screen_selected_inputs",
            }
            models = await client.call_tool("supported_models", {})
            assert not models.isError
            body = json.loads(fixture.read_text(encoding="utf-8"))
            body["selected_model"]["catalogue_snapshot_id"] = models.structuredContent[
                "technical_details"
            ]["catalogue_snapshot_id"]
            result = await client.call_tool("screen_selected_inputs", body)
            assert not result.isError, result.content
            assert result.structuredContent["technical_details"]["scenarios"]["status"] == (
                "bounded_pass"
            )
            print(
                "Verified official SDK over loopback Streamable HTTP: initialize, "
                "tools/list and typed tools/call; synthetic placement only."
            )
            print(result.structuredContent["summary"])
            print("Next: " + result.structuredContent["next_actions"][0])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000/mcp")
    asyncio.run(verify(parser.parse_args().url))
