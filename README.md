# notepad

A pin-locked notepad that syncs in real time across devices. One file on disk, one WebSocket, no database.

## What it does

You open a URL, type a 4-digit PIN, and get a plain text editor. Anything you type is saved to a file on the server and pushed to every other browser that has it open. That's it.

The PIN isn't real security — it just keeps out casual visitors. If you need actual auth, put something in front of it.

## Stack

- **Server:** ~50 lines of Node.js using the `ws` library
- **Storage:** a single text file on disk
- **Sync:** WebSocket — server broadcasts edits to all other connected clients
- **Frontend:** vanilla HTML/CSS/JS, no build step
- **Fonts:** JetBrains Mono + Syne (loaded from Google Fonts)

## Running it

### With Docker (recommended)

```bash
docker compose up -d --build
```

The server starts on port `8002` (localhost only). Notes are persisted in a Docker volume.

### Without Docker

```bash
npm install
node server.js
```

Notes are written to `/data/note.txt` by default. Override with the `NOTE_FILE` environment variable:

```bash
NOTE_FILE=./my-notes.txt PORT=8002 node server.js
```

Then open `http://localhost:8002` in your browser.

## Putting it behind a reverse proxy

The server needs WebSocket support. Here's a Caddy example:

```
note.example.com {
    reverse_proxy localhost:8002

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    log {
        output file /var/log/caddy/notepad.log
        format json
    }
}
```

Nginx, Traefik, etc. all work too — just make sure WebSocket upgrade headers are forwarded for the `/ws` path.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8002` | Server port |
| `NOTE_FILE` | `/data/note.txt` | Where the note is stored |

The PIN is hardcoded in `index.html` (`CORRECT_PIN`). Change it there. It's checked client-side only — again, this is not a security boundary.

## How sync works

1. Client opens a WebSocket to `/ws`
2. Server immediately sends the current note content
3. When a client edits, it sends the full text to the server (debounced 300ms)
4. Server saves to disk and broadcasts to all other connected clients
5. If the connection drops, the client reconnects automatically after 3 seconds

There's no conflict resolution. Last write wins. For a single-user notepad this is fine.

## License

MIT