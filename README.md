<div align="center">
  <h1>A Very Terry Recap</h1>
  <p>Real-time party game where guests bluff about who took each year-in-review photo</p>
</div>

## Screenshots

<!-- Add screenshots here -->

## About

A custom party game built for my annual recap event where 6-20 players submit photos from their year, then compete to convince others they took each photo (whether they did or not). Features anonymous photo submission, real-time volunteering, live voting with animated results, and a final scoreboard reveal. Built in one week with Claude Code and now requested at multiple events.

### Built With

* React + TypeScript
* Firebase Realtime Database + Storage
* Tailwind CSS
* GSAP (animations)
* Vite

## Getting Started

### Prerequisites

* Node.js 18+
* Firebase project with Realtime Database and Storage enabled

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/yourusername/very-terry-game.git
   ```

2. Install dependencies
   ```sh
   npm install
   ```

3. Set up Firebase
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Realtime Database and Storage
   - Copy your config to `src/lib/firebase.ts`

4. Run the development server
   ```sh
   npm run dev
   ```

## How It Works

The game runs across 4 synchronized interfaces:

| Interface | Purpose |
|-----------|---------|
| `/submit` | Players upload 1-4 photos with optional captions |
| `/tv` | Large display showing current photo, vote counts, scoreboard |
| `/play` | Mobile interface for volunteering and voting |
| `/host` | Control panel for phase transitions and game flow |

**Game Flow:** A photo appears on screen. Players volunteer claiming it's theirs. Selected volunteers pitch why they took the photo. Everyone votes on who they believe. Points awarded for fooling others or correctly identifying the real owner.

All state lives in Firebase with real-time listeners, so every screen updates instantly when the host advances phases or players vote.
