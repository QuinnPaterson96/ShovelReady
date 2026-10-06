"""Private loopback HTTP transport. Public deployment requires separate exposure review."""

import ipaddress
import time
from collections import deque

from mcp import types
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from mcp.server.transport_security import TransportSecurityMiddleware, TransportSecuritySettings
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from .server import create_server


class PrivateEndpoint:
    def __init__(self, manager):
        self.manager = manager
        self.requests = deque()

    async def __call__(self, scope, receive, send):
        client = scope.get("client")
        try:
            allowed = client is not None and ipaddress.ip_address(client[0]).is_loopback
        except ValueError:
            allowed = False
        if not allowed:
            await PlainTextResponse("Private demo: loopback access only", 403)(scope, receive, send)
            return
        if scope["method"] == "POST":
            now = time.monotonic()
            while self.requests and self.requests[0] <= now - 60:
                self.requests.popleft()
            if len(self.requests) >= 30:
                await PlainTextResponse(
                    "Demo rate limit; retry in 60 seconds", 429, headers={"Retry-After": "60"}
                )(scope, receive, send)
                return
            self.requests.append(now)
            # SDK transport validation can echo input values and log malformed messages.
            # Validate with its public models before forwarding, retaining no diagnostics.
            request = Request(scope, receive)
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 131_072:
                    await PlainTextResponse("MCP request exceeds 128 KiB", 413)(
                        scope, receive, send
                    )
                    return
            security = TransportSecurityMiddleware(self.manager.security_settings)
            failure = await security.validate_request(request, is_post=True)
            if failure is not None:
                await failure(scope, receive, send)
                return
            raw = bytes(body)
            try:
                message = types.JSONRPCMessage.model_validate_json(raw).root
                if isinstance(message, types.JSONRPCRequest):
                    types.ClientRequest.model_validate_json(raw)
                elif isinstance(message, types.JSONRPCNotification):
                    types.ClientNotification.model_validate_json(raw)
            except ValidationError:
                await PlainTextResponse(
                    "Invalid MCP message. Check the protocol envelope and parameter types.", 400
                )(scope, receive, send)
                return

            original_receive = receive
            delivered = False

            async def replay():
                nonlocal delivered
                if delivered:
                    return await original_receive()
                delivered = True
                return {"type": "http.request", "body": raw, "more_body": False}

            receive = replay
        await self.manager.handle_request(scope, receive, send)


def build_http(*, app_url: str):
    manager = StreamableHTTPSessionManager(
        create_server(app_url=app_url),
        stateless=True,
        json_response=True,
        max_request_body_size=131_072,
        security_settings=TransportSecuritySettings(
            allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*"],
            allowed_origins=["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"],
        ),
    )
    route = Route("/mcp", endpoint=PrivateEndpoint(manager), methods=["POST", "GET", "DELETE"])
    return manager, route
