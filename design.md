# YTDownloader Design Structure

This document outlines the design structure and visual language based on the provided UI screens. The design follows a highly modern, sleek, and premium aesthetic with brutalist and technical influences.

## Design System & Aesthetics
- **Theme:** Dark mode primary with high-contrast neon accents.
- **Color Palette:**
  - **Primary Background:** Deep Obsidian/Black (e.g., `#0A0A0A`).
  - **Secondary Backgrounds:** Dark Forest Green (`#1A2E20` approx), Off-White/Light Beige (`#F5F5F0`).
  - **Accents:** Neon/Lime Green (`#B1FF36`).
  - **Text:** White (Headings), Light Gray (Subtitles/Paragraphs), Black (on Neon and Off-White backgrounds).
- **Typography:**
  - **Headings & Body:** Bold, modern sans-serif (e.g., Inter, Helvetica Neue, or Clash Display for a geometric feel). Tracking is tight on large headings.
  - **Metadata & Labels:** Monospace font for technical details (e.g., `SERVICE ONLINE / 99.98% UPTIME`).
- **Visual Style:** 
  - Sharp, unrounded corners on most elements (buttons, inputs) for a "pro-tool" vibe.
  - Clean typographic hierarchy and grid alignment.
  - High utility, immediate handoff aesthetic.

## Page Structure

### 1. Header & Navigation
- **Top Bar (Status):** Monospace green text indicating service status (`SERVICE ONLINE`) and global edge data (`21 SEPT 2026`).
- **Main Nav:**
  - **Logo:** `YTDOWNLOADER` (Bold, white, uppercase).
  - **Links:** `HOW IT WORKS`, `FORMATS`, `FAQ` (Gray, regular weight, small caps).
- **Ticker/Banner:** A full-width neon green banner with black uppercase text highlighting core values (`WHAT YOU WANT. WHEN YOU WANT IT. FAST CONVERSION - HIGH QUALITY - NO CLUTTER`).

### 2. Hero Section
- **Background:** Deep Black.
- **Label:** `VIDEO UTILITY / 001` in neon green monospace.
- **Headline:** Massive, bold white text: "Download the moment."
- **Subtitle:** Light gray text explaining the value proposition.
- **Input Area:** 
  - A large, full-width (within container) off-white rectangular input field.
  - Placeholder: "Paste a YouTube, TikTok, or Instagram link..." (monospace/typewriter style).
  - **Action Button:** Nested inside the input field on the right, neon green background with black text "START DOWNLOAD".
- **Supported Platforms:** Small "SUPPORTED:" label followed by minimal monochrome icons for YouTube, Instagram, and TikTok.

### 3. Features Section ("Built for the files...")
- **Background:** Dark Forest Green.
- **Header:** 
  - Left: `DOWNLOAD DESK / 002` (green monospace).
  - Right: Bold white text "Built for the files you actually keep."
- **Grid Layout:** Three distinct columns separated by a subtle top border/line.
  - Each column contains a green numeric indicator (`01`, `02`, `03`).
  - A bold white sub-heading (e.g., "Every useful format.").
  - A light gray description paragraph.

### 4. Steps/Workflow Section ("The Short Route")
- **Background:** Off-white/Light Beige.
- **Label:** `THE SHORT ROUTE / 003` (Black monospace).
- **Separator:** A stark black horizontal line spanning the container.
- **Grid Layout:** Three columns.
  - Numeric/Action labels (e.g., `01 / PASTE`).
  - Massive bold black headings (e.g., "Bring the link.").
  - Dark gray description text.

### 5. Call to Action (CTA) Section
- **Background:** Deep Black.
- **Label:** `READY WHEN YOU ARE` (Green).
- **Headline:** "Your next download starts with a link." (White).
- **Button:** Neon green "PASTE A LINK" button, centered.

### 6. Footer
- **Background:** Full-width Neon Green.
- **Content (Black text):**
  - Left: `YTDOWNLOADER` logo (bold).
  - Center: `USE RESPONSIBLY / PUBLIC CONTENT ONLY` (Monospace).
  - Right: A circular down-arrow icon.

## Implementation Notes
- **CSS Architecture:** The design heavily relies on CSS Grid for the 3-column layouts in the Features and Workflow sections.
- **Responsiveness:** On smaller screens (mobile/tablet), the 3-column grids should stack vertically. The hero input might need the button to move below the input field on mobile.
- **Micro-interactions:** The neon green ticker could be an infinite CSS marquee. Buttons should have a harsh, instant hover state (e.g., inverting colors or applying a solid black border) to match the brutalist aesthetic.
