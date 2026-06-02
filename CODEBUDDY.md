# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## Project Overview

**CyberWhisper** - 基于 GitHub Issues 的匿名悄悄话应用。这是一个 100% 无服务器的 PWA，使用 GitHub Issues REST API 作为数据库，通过 GitHub Pages 部署。

## Development Commands

This project is a **pure static site** — no build step, no package manager, no Node.js dependencies.

### Run locally

Use any static HTTP server to avoid CORS issues (the GitHub API calls require `fetch`):

```bash
# Python 3
python -m http.server 8080

# Node (via npx)
npx serve .

# Or open via VS Code Live Server extension
```

Then open `http://localhost:8080` in a browser.

### Deploy to GitHub Pages

1. Edit `config.js` — set `REPO_OWNER` and `REPO_NAME` to your own GitHub account/repo
2. Push to the `main` branch of your fork
3. In repo Settings → Pages → set Source to `main` branch
4. Site is served at `https://<owner>.github.io/<repo>/`

> No build step is required. Files are served as-is.

### No tests or linting

There is no test framework or linter configured in this project.

## Code Architecture

### Two-Page SPA

The app has two HTML pages that share configuration via `localStorage`:

| Page | File | Purpose |
|------|------|---------|
| **收件箱 (Inbox)** | `index.html` + `script.js` | Displays received messages. User shares their link (`whisper.html?to=<userId>`) to receive anonymous messages. |
| **发送 (Send)** | `whisper.html` + `send.js` | Sends an encrypted message to a target user via URL param `?to=<userId>`. |

### Core Classes

- **`WhisperApp`** (`script.js`) — Main inbox logic. Manages user identity, message loading, polling, encryption/decryption, and all inbox UI.
- **`SendPage`** (`send.js`) — Send page logic. Looks up the target user's Issue via GitHub Search API, encrypts the message, and posts it as a comment.

### Message Flow

```
Sender (whisper.html)
  1. Read config from localStorage
  2. Search GitHub Issues API by title for target userId
  3. Encrypt message (XOR + Base64) via encryptMessage()
  4. POST encrypted message as Issue comment
       ↓
GitHub Issues (storage layer)
       ↓
Receiver (index.html)
  1. Read config from localStorage
  2. GET comments from own Issue
  3. Decrypt each comment body via decryptMessage()
  4. Render in message list
  5. Poll every CONFIG.AUTO_REFRESH (5000ms)
```

### User Registration

On first visit, `WhisperApp.createNewUser()`:
1. Generates a unique ID: `user-<timestamp>-<random8chars>`
2. Creates a GitHub Issue titled `Whisper Box: <userId>` with labels `['whisper-box', 'anonymous']`
3. Stores the Issue number and userId in `localStorage`

### Encryption

Simple **XOR cipher** with key `'cyber-whisper-2026'` wrapped in Base64. Defined identically in both `script.js` and `send.js`:
- `encryptMessage(text)` — XOR each character with key, then `btoa()`
- `decryptMessage(encryptedText)` — `atob()` then reverse XOR
- On decryption failure (non-encrypted content), falls back to returning raw text

### Config System

Two layers:
1. **`config.js`** — Default values (`REPO_OWNER`, `REPO_NAME`, `AUTO_REFRESH`, `ENCRYPT_KEY`, etc.)
2. **`localStorage`** — User overrides (GitHub Token, repo owner/name) saved via the config modal

Both pages load config the same way: `loadConfig()` reads `localStorage` keys and overrides the defaults in `CONFIG`.

### Key Dependencies (External)

- [Font Awesome 6.4.0](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css) — UI icons
- [Google Fonts](https://fonts.googleapis.com) — Orbitron (headings), Exo 2 (body)
- [GitHub REST API v3](https://api.github.com) — All data storage and retrieval

### QR Code Generator

`qrcode-generator.js` provides `QRCodeGenerator.generateQRCode(elementId, text, options)`. This is a **synthetic** QR code renderer — it produces a QR-code-like visual pattern using a text-hash-based deterministic algorithm. It is not scannable by standard QR readers. On failure, falls back to `generateSimpleQRCode()` in `script.js`.

### PWA

- `manifest.json` — App name "CyberWhisper", standalone display, theme color `#00ff88`
- `service-worker.js` — Cache-first strategy for `index.html`, `whisper.html`, `style.css`, `script.js`, `send.js`, `config.js`, and icon assets

### UI Theme (style.css)

Cyberpunk aesthetic with CSS custom properties:
```
--primary-color:   #00ff88 (neon green)
--secondary-color: #0088ff (electric blue)
--accent-color:    #ff0088 (neon pink)
--bg-dark:         #0a0a0f (dark background)
--bg-card:         #141420 (card background)
```

Key UI components: `cyber-card`, `cyber-btn`, `cyber-input`, particle animation overlay, scanline animation, message list with highlight animation for new messages.

## File Inventory

| File | Lines | Role |
|------|-------|------|
| `index.html` | ~200 | Inbox page |
| `whisper.html` | ~110 | Send page |
| `style.css` | 702 | All styles (cyberpunk theme) |
| `config.js` | 27 | App config constants |
| `script.js` | 639 | Inbox logic (`WhisperApp`) |
| `send.js` | 246 | Send logic (`SendPage`) |
| `qrcode-generator.js` | 126 | Synthetic QR code renderer |
| `service-worker.js` | 61 | PWA cache-first SW |
| `manifest.json` | 33 | PWA manifest |
