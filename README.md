<div align="center">

# 🚢 Docker Yard IDE Simulator

### Learn Docker by *doing* — right in your browser.

**A no-backend, interactive Docker IDE simulator** that teaches you how to write `Dockerfile`s and `compose.yml` files through hands-on practice — with real-time diagnostics, a visual container yard, and guided lessons.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)
[![No Backend](https://img.shields.io/badge/Backend-None-orange)](https://github.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> Inspired by [learngitbranching.js.org](https://learngitbranching.js.org) — but for Docker.

</div>

---

## What is Docker Yard?

Docker Yard is a **fully in-browser Docker learning environment**. No Docker installation required. No backend. Just open the app and start typing commands.

- Write `Dockerfile`s and `compose.yml` files in a Monaco-powered editor
- Run simulated Docker CLI commands in a real terminal emulator
- Watch your containers, images, networks, and volumes appear in a visual **Container Yard**
- Get instant diagnostics — errors, warnings, and best-practice hints as you type
- Follow guided lessons or explore freely

---

## ✨ Features

### 🖥️ Mini Browser IDE
- File explorer with `Dockerfile`, `compose.yml`, `.env`, and `app/*` workspace
- Monaco-style editor with tabs and split-view support
- **Inline diagnostics** — errors and warnings rendered as editor markers
- Terminal dock with command history and `Ctrl+L` clear

### ⚙️ Simulation Engine
Event-sourced and deterministic: every command produces events, every event updates state.

| Component | What you see |
|-----------|-------------|
| **Containers** | Status, ports, env vars, logs |
| **Images** | Layer stack with cache hit/miss indicators |
| **Networks** | Visual tracks and cable connections |
| **Volumes** | Mount state |
| **Event Stream** | Full timeline — "what just happened and why?" |

### 📚 Learning Mode
- Scenario templates that load into the workspace
- Progress checks based on state + command history
- **"Explain last action"** — derived from the event stream, not magic strings

---

## 🚀 Quickstart

**Prerequisites:** Node.js 18+ (20+ recommended)

```bash
# 1. Install dependencies
npm install       # or pnpm install / yarn

# 2. Start dev server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

**Build for production:**

```bash
npm run build
npm run start
```

---

## 🧠 What You'll Learn

### Docker CLI — without installing Docker
Practice commands safely. The engine simulates state transitions and produces realistic terminal output.

### How to write a correct `Dockerfile`

| Type | Examples |
|------|----------|
| **Errors** (blocking) | Missing `FROM`, unknown instruction, invalid `ENV` format, bad `COPY`/`ADD` args |
| **Warnings** (best practice) | Pinning `:latest`, combining `RUN` steps, adding `.dockerignore` |

### How to write a correct `compose.yml`

| Type | Examples |
|------|----------|
| **Errors** (blocking) | YAML parse errors, missing `services`, invalid `ports`/`environment` format |
| **Warnings** (best practice) | Unpinned image versions, ambiguous defaults, implicit network/volume usage |

---

## 🧩 Supported Commands

> A focused, learnable subset — also documented in-app via `docker help`.

**Docker CLI**
```
docker pull <image[:tag]>
docker images
docker run [--name <n>] [-d] [-p host:container] [-e KEY=VAL] <image>
docker ps [-a]
docker stop / start / rm <name|id>
docker logs <name|id>
docker exec <name|id> <cmd>
```

**Build (from workspace)**
```
docker build -t <tag> .
```
Reads your `Dockerfile`, validates it, simulates the build with layer logs and cache behavior.

**Compose (from workspace)**
```
docker compose up -d
docker compose ps
docker compose logs
```
Reads your `compose.yml`, validates it, and creates services/networks/volumes in the yard.

---

## 🏗️ Architecture

Single-repo, no backend, no server. Everything runs in the browser.

```
src/
├── engine/          # Pure TypeScript simulation core (no React/DOM)
│   ├── cli/         # Parser + command handlers
│   ├── dockerfile/  # Validator + build evaluator
│   ├── compose/     # Validator + evaluator
│   └── events/      # Event log + deterministic state
├── ui/              # IDE shell (Explorer / Editor / Visualizer / Terminal)
└── machines/        # XState actors
    ├── engine/      # Command execution runtime
    ├── ide/         # Layout + selections
    └── lessons/     # Scenario templates + progress
```

**Design principles:**

- **Event sourcing** — every action yields events; state is always derived, never mutated directly
- **Explainability** — "Explain last action" is powered by the same event stream, not hardcoded strings
- **Reviewable slices** — small, self-contained commits for careful code review

---

## 🧪 Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # Lint
npm run format    # Format
```

---

## 🗺️ Roadmap

- [x] Project scaffolding + README
- [ ] IDE shell — Explorer + Editor + Visualizer + Terminal
- [ ] Engine core — event sourcing, `help` command
- [ ] Terminal bridge (xterm.js)
- [ ] CLI MVP — `pull`, `run`, `ps`, `logs`, `exec`
- [ ] In-memory workspace filesystem
- [ ] Monaco editor + tabs
- [ ] Diagnostics v1 — Dockerfile + Compose markers
- [ ] Build simulation — layers + cache hints
- [ ] Compose simulation — services graph
- [ ] Lessons + scenario templates
- [ ] Autocomplete + "Explain last action"

---

## 🤝 Contributing

Contributions are very welcome.

1. Fork the repo and create a feature branch
2. Keep commits small and focused — one logical change per PR
3. Open a PR with:
   - What changed and why
   - How to verify manually
   - Screenshots/GIFs if the UI changed

**Proposing a new Docker/Compose diagnostic rule?** Please include:
- A valid example (should pass)
- An invalid example (should fail/warn)
- A concise, user-friendly message explaining *why*

All rules must be deterministic and explainable.

---

## 🔐 Security

Docker Yard runs **entirely in the browser** and executes no real Docker commands. If you discover a security issue (e.g., an XSS vector via crafted file content), please open an issue with reproduction steps.

---

## 📄 License

[MIT](LICENSE) — free to use, fork, and build on.

---

## 🙏 Acknowledgements

- Learn-by-doing inspiration: [learngitbranching.js.org](https://learngitbranching.js.org)
- Terminal UI: [xterm.js](https://xtermjs.org)
- Editor UI: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- State modeling: [XState](https://xstate.js.org)

---

<div align="center">

**⭐ Star the repo if you find it useful — and let us know what Docker "gotchas" the simulator should teach next!**

</div>
