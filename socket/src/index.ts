const server = Bun.serve({
  port: 3002,
  fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/health' || url.pathname === '/socket/health') {
      return new Response('ok')
    }

    if (url.pathname === '/' || url.pathname === '/socket') {
      if (server.upgrade(req)) return
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    return new Response('Not Found', { status: 404 })
  },
  websocket: {
    open(ws) {
      console.log('client connected')
    },
    message(ws, message) {
      ws.send(message)
    },
    close(ws) {
      console.log('client disconnected')
    },
  },
})

console.log(`Socket server listening on :${server.port}`)
