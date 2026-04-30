# LoreWeaver Proxy SillyTavern Extension

This is the MVP extension shell for LoreWeaver. It listens for chat events,
sends message events to the proxy, exposes a small Memory panel, and provides
`window.LoreWeaverProxy.buildSTMemoryMetadata()` for request metadata wiring.

Install it by copying this directory into SillyTavern's third-party extension
directory:

```text
SillyTavern/public/scripts/extensions/third-party/loreweaver-proxy
```

Point the panel at the proxy URL, usually:

```text
http://localhost:8088
```
