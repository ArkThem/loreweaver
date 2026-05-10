# LoreWeaver Proxy SillyTavern Extension

This is the MVP extension shell for LoreWeaver. It listens for chat events,
sends message events to the proxy, exposes a small Memory panel, injects
`st_memory` into direct LoreWeaver `/v1/chat/completions` browser requests, and
provides `window.LoreWeaverProxy.buildSTMemoryMetadata()` for request metadata
wiring.

Install it by copying this directory into SillyTavern's third-party extension
directory:

```text
SillyTavern/public/scripts/extensions/third-party/loreweaver-proxy
```

Point the panel at the proxy URL, usually:

```text
http://localhost:8088
```

For the Kubernetes/NPM route, use:

```text
/loreweaver
```

When a group-chat generation request is sent directly from the browser to the
LoreWeaver proxy, the extension attaches metadata with the target
`active_character` if it can resolve the requested speaker from the prompt
payload and current group members. The proxy still has its own fallback parser,
but explicit `st_memory.active_character` is the preferred path.

## UI Smoke

`UI Smoke` is hidden from the visible panel as of extension `0.2.26`, but remains
available as `window.LoreWeaverProxy.runUISmokeTests()` for development builds.
It runs a synthetic end-to-end check from inside SillyTavern and does not add a
message to the visible chat. The test uses the current world metadata, creates
an isolated synthetic chat id, then:

1. checks `/readyz`;
2. checks `/v1/debug/status`;
3. checks `/v1/models`;
4. checks `/v1/embeddings`;
5. ingests a synthetic message about Lyra;
6. retrieves a memory block;
7. deletes the synthetic message;
8. verifies via debug endpoint that active facts are gone.

The result is printed in the debug output block as a compact pass/fail JSON
report.

## Graph Debug

Click `Graph Debug` to inspect graph-v2 statements for the current
`world_id/chat_id`. It calls:

```text
GET /v1/graph/statements/{world_id}?status=all&chat_id={chat_id}
```

The debug output includes a summary grouped by status, predicate, and subject,
plus the raw statement list. This is read-only and does not affect prompt
injection.

## Merge Entity

`Merge Entity` is also hidden from the visible panel. Call
`window.LoreWeaverProxy.mergeEntity()` only when you have confirmed that two ids
are the same entity, for example a duplicate `ent_*` and the canonical `char_*`.
It asks for source and target ids, then calls `/v1/entities/merge`. It is a
soft/audited operation: old statements are rejected, safe statements are
replayed under the target, and the source entity is marked as merged.

## Button Reference

See [../../docs/sillytavern-extension-debug-panel.md](../../docs/sillytavern-extension-debug-panel.md)
for what each panel button does, when to use it, and which buttons mutate data.
