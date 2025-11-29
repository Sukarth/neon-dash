<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/PeerJS-WebRTC-FF6B6B?style=for-the-badge" alt="PeerJS" />
</p>

<h1 align="center">🎮 NEON DASH</h1>

<p align="center">
  <strong>A fast-paced multiplayer rhythm platformer inspired by Geometry Dash</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#play-now">Play Now</a> •
  <a href="#installation">Installation</a> •
  <a href="#game-modes">Game Modes</a> •
  <a href="#controls">Controls</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## ✨ Features

- 🎯 **Multiple Game Modes** - Solo, VS AI, Local 2-Player, and Online Multiplayer
- 🌐 **Real-time Online Multiplayer** - Race against friends with WebRTC peer-to-peer connections
- 🤖 **AI Level Generator** - Create unique levels using Google's Gemini AI
- 🎵 **Procedural Audio** - Dynamic sound effects generated in real-time
- 🏆 **High Score System** - Track your best runs locally
- 📱 **Mobile Support** - Touch controls for mobile devices
- ⚡ **Smooth 60fps Gameplay** - Canvas-based rendering for optimal performance
- 🎨 **Neon Aesthetic** - Cyberpunk-inspired visuals with glow effects

## 🎮 Play Now

**[Play Neon Dash Online](https://sukarth.github.io/neon-dash)**

## 🚀 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/sukarth/neon-dash.git
cd neon-dash

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## 🎯 Game Modes

| Mode | Description |
|------|-------------|
| **Solo Run** | Classic single-player mode. Survive as long as you can! |
| **VS CPU** | Race against an AI bot. Don't get left behind! |
| **Local 2P** | Split-screen multiplayer. P1 vs P2 on the same device |
| **Online** | Real-time multiplayer. Create a room and share the code! |

## 🎮 Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Jump | `Space` / `W` / `↑` | Tap screen |
| Player 2 Jump | `↑` / `Enter` | - |

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Multiplayer**: PeerJS (WebRTC)
- **AI Generation**: Google Gemini API
- **Audio**: Web Audio API

## 🔧 Configuration

### AI Level Generator (Optional)

To enable AI-powered level generation, create a `.env.local` file:

```env
GEMINI_API_KEY=your_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/).

## 🌐 Deployment

### GitHub Pages

1. Update `vite.config.ts` with your base path:
```ts
export default defineConfig({
  base: '/neon-dash/',
  // ...
})
```

2. Build and deploy:
```bash
npm run build
# Deploy the dist folder to GitHub Pages
```

### Vercel / Netlify

Simply connect your repository - both platforms auto-detect Vite projects.

## 📁 Project Structure

```
neon-dash/
├── components/
│   ├── GameEngine.tsx    # Core game loop & rendering
│   ├── Menu.tsx          # Main menu & UI
│   ├── HighScores.tsx    # Leaderboard component
│   ├── HowToPlay.tsx     # Tutorial/instructions
│   ├── Modal.tsx         # Reusable modal
│   └── Settings.tsx      # Game settings
├── services/
│   ├── audioService.ts   # Procedural audio
│   ├── geminiService.ts  # AI level generation
│   ├── highScoreService.ts # Score persistence
│   └── peerService.ts    # WebRTC multiplayer
├── App.tsx               # Main app component
├── constants.ts          # Game constants
├── types.ts              # TypeScript types
└── index.html            # Entry point
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

<br>

Made with ❤️ by [Sukarth](https://github.com/sukarth)
