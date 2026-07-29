# 06 — List and call Tools over Streamable HTTP

**What to build:** The same `list-tools` / `call-tool` flow works for Streamable HTTP Servers (`url`, optional `headers`) in Config, suitable for IntelliJ Copy HTTP Stream Config–shaped entries.

**Blocked by:** 05 — List and call Tools over stdio

**Status:** completed

- [x] `list-tools --server <name>` works for an HTTP Server in Config
- [x] `call-tool --server <name> …` works for an HTTP Server in Config
- [x] Optional `headers` from Config are sent on the HTTP transport
- [x] Connect/Tool failures surface as non-zero exit with clear errors
- [x] Legacy SSE is not implemented or required
- [x] CLI acceptance tests use a stub Streamable HTTP MCP Server
