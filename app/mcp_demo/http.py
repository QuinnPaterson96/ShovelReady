"""Private loopback HTTP transport. Public deployment requires separate exposure review."""

import ipaddress
import time
from collections import deque

from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from mcp.server.transport_security import TransportSecuritySettings
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
