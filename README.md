# YTDownloader - Premium Media Extraction App

YTDownloader is a full-stack, brutalist-inspired web application designed for high-quality YouTube video and audio extraction. It bypasses modern bot protections using `yt-dlp` nightly builds to fetch raw DASH streams, merges them automatically, and tracks your usage in a MongoDB database—all wrapped in a highly interactive, animated user interface.

## 🚀 Key Features

* **High-Fidelity Downloads:** Fetches raw DASH streams (1080p, 1440p, 4K) and dedicated high-bitrate audio formats using `yt-dlp`. Automatically merges video and audio streams behind the scenes.
* **Live SSE Progress Bars:** Server-Sent Events stream the exact download percentage, real-time download speed (e.g., 10 MiB/s), and ETA directly to the frontend modal at 60fps.
* **Download History Tracking:** Full integration with MongoDB Atlas stores a history of your downloads (Title, Type, Original URL, File Size) accessible via the `/history` dashboard.
* **Intelligent Dark/Light Mode:** Defaults to a high-contrast brutalist Dark Mode (with neon green accents) and seamlessly toggles to an inverted Light Mode (with neon purple accents), persisting your choice via `localStorage`.
* **Advanced UI/UX:**
  * Dynamic mouse-tracking ambient glow across the entire site.
  * 3D tilt effects on feature cards.
  * Intersection Observer-based scroll-reveal animations.
  * Terminal-style typing interactions and brutalist typography (`Space Mono` & `Inter`).

---

## 🛠️ Technology Stack

**Frontend:**
* React 18 (Bootstrapped with Vite)
* React Router v6 (Client-side routing)
* Raw CSS (Semantic CSS variables for theme switching)
* Native `EventSource` API for SSE

**Backend:**
* Node.js & Express.js
* `yt-dlp` (via `child_process.spawn`) for metadata and video extraction
* `ffmpeg` (utilized by yt-dlp) for multiplexing DASH streams
* Mongoose & MongoDB (Cloud Atlas)

---

## 🏗️ Architecture & Data Flow

1. **Information Fetching (`/api/fetch-info`)**
   * The user pastes a URL. The backend executes `yt-dlp -j <url>` to grab the JSON metadata.
   * The backend strips out incompatible formats and sorts the available streams into clean `Video` and `Audio` tables.
2. **Download Initialization (`/api/download`)**
   * The frontend requests a specific format ID. The backend spawns a detached `yt-dlp` process with the `--rm-cache-dir` flag (to bypass YouTube HTTP 403 blocks) and assigns it a unique `jobId`.
3. **Live Streaming (`/api/download-stream/:jobId`)**
   * The frontend opens an SSE connection. The backend uses a custom `EventEmitter` to parse `yt-dlp`'s `stdout` regex and pushes the percentage, speed, and ETA back to the client in real-time.
4. **Completion & History Tracking**
   * Once `yt-dlp` exits with code `0`, the file is ready in the `/downloads` directory. 
   * The backend automatically records the job metadata to MongoDB and notifies the frontend that the file is ready to save.

---

## 🖥️ Local Setup & Installation

### Prerequisites
* **Node.js** (v16+)
* **MongoDB Atlas** account (or local MongoDB server)
* **yt-dlp** (Must be installed globally and in your system PATH). We highly recommend running `yt-dlp --update-to nightly` to avoid bot protection bans.
* **ffmpeg** (Must be installed globally and in your system PATH).

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory and add your MongoDB connection string:
```
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ytdownloader
```
Start the backend development server:
```bash
npm run dev
```
*(The backend runs on `http://localhost:5000`)*

### 2. Frontend Setup
```bash
cd frontend
npm install
```
Start the Vite development server:
```bash
npm run dev
```
*(The frontend runs on `http://localhost:5173`)*

---

## 📂 Project Structure

```text
ytdownloader/
├── backend/
│   ├── downloads/         # Temporary storage for finished media (gitignored)
│   ├── models/            # Mongoose schemas (DownloadHistory.js)
│   ├── routes/            # Express endpoints (api.js)
│   ├── services/          # Business logic (jobTracker.js, ytdlp.js)
│   ├── server.js          # Server entry point
│   ├── entrypoint.sh      # Starts the PO-token provider, then server.js
│   ├── Dockerfile         # node:22 + nightly yt-dlp + ffmpeg + bgutil provider
│   └── .env.example       # Every configurable knob, documented
└── frontend/
    └── src/
        ├── components/    # Reusable UI parts (Hero, Features, Header, DownloadModal)
        ├── context/       # React Context (ThemeProvider.js)
        ├── lib/           # api.js — single source of truth for the API origin
        ├── index.css      # Global styles, variables, & animations
        └── App.jsx        # Routing configuration
```

---

## ⚠️ Notes on Deployment

Deploying a `yt-dlp` application to a cloud provider (Render, Heroku, a VPS) fails in a very
specific way: it works perfectly on `localhost` and every fetch fails in production with

```
ERROR: [youtube] VIDEOID: Sign in to confirm you're not a bot.
```

### Why this happens

YouTube does not judge the request by the URL — it judges it by **where the request came from**.
A residential IP is trusted; a datacentre IP (Render's, AWS's, GCP's) is not.

On top of that, yt-dlp's default player clients are `('visionos', 'web')` — see
`_DEFAULT_CLIENTS` in `yt_dlp/extractor/youtube/_video.py`. Those two are exactly the clients
YouTube bot-checks hardest from cloud IPs, so the default configuration is the worst case.

Since 2024 the `web` client also requires a **proof-of-origin (PO) token** — a value only
YouTube's own JavaScript, running in a real browser, can produce. yt-dlp cannot fabricate one,
so a request that claims to be a browser but cannot prove it gets the "not a bot" challenge.
This is why cookies alone often no longer fix it: cookies say *who* you are, not *where the
request came from*.

### How this repo handles it

1. **A bundled PO-token provider.** The Docker image builds
   [bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) and
   `entrypoint.sh` runs it on `127.0.0.1:4416`. This supplies the tokens the `mweb` client needs.
2. **A player-client fallback chain** (`backend/services/ytdlp.js`), tried in order until one
   succeeds. Only genuine blocks trigger the next attempt:

   | PO provider reachable | Chain tried |
   | --- | --- |
   | Yes (default in Docker) | `mweb` → `tv_simply` → `default` |
   | No | `tv_simply` → `tv` → `default` |

   `mweb` is the client yt-dlp recommends for a flagged IP. `tv_simply` needs no PO token and is
   rarely bot-checked. `default` is kept last so the app keeps tracking future yt-dlp releases.
3. **Client pinning between fetch and download.** `fetchInfo` returns `clientUsed` and the
   frontend sends it back on `/api/download`. Format IDs are client-specific and are **not**
   interchangeable — reusing an ID under a different client yields "requested format is not
   available".
4. **Real error reporting.** yt-dlp stderr is classified into codes (`BOT_CHECK`, `RATE_LIMIT`,
   `AGE_RESTRICTED`, `GEO_BLOCKED`, `PRIVATE`, `NOT_FOUND`, …) that reach the UI, instead of the
   old generic `Failed to parse yt-dlp output`.

### Checking a live deployment

```bash
curl https://your-app.onrender.com/api/health
```

```json
{
  "ytdlp": { "bin": "yt-dlp", "version": "2026.08.19" },
  "ffmpeg": true,
  "potProvider": { "url": "http://127.0.0.1:4416", "reachable": true, "version": "2.0.0" },
  "cookies": { "configured": false, "path": null },
  "playerClientChain": "mweb -> tv_simply -> default"
}
```

If `potProvider.reachable` is `false`, the app silently drops to the PO-free chain — still
working, but less reliable. Fix it before blaming YouTube.

### If it still fails

- **Age-restricted or members-only video** needs a real session. Export a Netscape
  `cookies.txt` from a logged-in browser, put it on the server, and set `YTDLP_COOKIES` to its
  path. Use a throwaway account — YouTube invalidates sessions faster when it sees them used
  from a datacentre IP, and a flagged account is a real risk.
- **Sustained traffic** (hundreds of downloads/day) will get the IP rate-limited regardless of
  client tuning. At that volume you need residential or rotating proxies via `--proxy`.
- **Keep yt-dlp on the nightly channel.** YouTube changes its checks constantly and only recent
  builds carry the counter-fixes. The Dockerfile already pulls nightly.

### Frontend build

Set the API origin at build time — the frontend and the API are on different hosts in
production, and a hard-coded `http://` URL is additionally blocked as mixed content on an
HTTPS page:

```bash
VITE_API_URL=https://your-app.onrender.com npm run build
```

Without it, requests silently target the wrong origin. The resolved value is inlined into the
bundle at build time.

### Configuration reference

See [`backend/.env.example`](backend/.env.example) for every knob: `YTDLP_BIN`,
`YTDLP_POT_PROVIDER_URL`, `YTDLP_PLUGIN_DIRS`, `YTDLP_PLAYER_CLIENT_CHAIN`, `YTDLP_COOKIES`,
and the fetch/download timeouts.
