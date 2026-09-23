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
│   ├── downloads/         # Temporary storage for finished media
│   ├── models/            # Mongoose schemas (DownloadHistory.js)
│   ├── routes/            # Express endpoints (api.js)
│   ├── services/          # Business logic (jobTracker.js, ytdlp.js)
│   └── index.js           # Server entry point
└── frontend/
    └── src/
        ├── components/    # Reusable UI parts (Hero, Features, Header, DownloadModal)
        ├── context/       # React Context (ThemeProvider.js)
        ├── pages/         # Route views (Home, Convert, History)
        ├── index.css      # Global styles, variables, & animations
        └── App.jsx        # Routing configuration
```

---

## ⚠️ Notes on Deployment

Deploying `yt-dlp` applications to cloud providers (like Render, Vercel, or Heroku) is notoriously difficult because YouTube actively blocks the IP ranges of major data centers with `HTTP 429` or `403 Forbidden` errors. 

**For production deployment, you will need:**
1. A VPS (Virtual Private Server) with a clean, residential-like IP address.
2. Or a rotating proxy network injected into the `yt-dlp` config via the `--proxy` flag.
3. The current codebase successfully runs locally to leverage your personal residential IP and entirely bypass these cloud restrictions.
