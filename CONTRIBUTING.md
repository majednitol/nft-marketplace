# Contributing to NFT Nexus

Thank you for your interest in contributing to NFT Nexus! We welcome issues, suggestions, and pull requests to help improve this multi-chain marketplace.

---

## 🚀 Development Workflow

1.  **Fork the Repository**: Create a personal copy of the repository on GitHub.
2.  **Clone Locally**:
    ```bash
    git clone https://github.com/your-username/NFT-Marketplace.git
    cd NFT-Marketplace
    ```
3.  **Create a Branch**: Create a descriptive branch name for your feature or bug fix:
    ```bash
    git checkout -b feature/amazing-new-feature
    ```
4.  **Install & Setup Infrastructure**:
    *   Make sure you have Docker running locally.
    *   Run `docker-compose up -d` to launch Postgres, Redis, and NATS JetStream.
    *   Install dependencies and run migrations in `/server` and `/`.
5.  **Write Code**: Keep code type-safe (TypeScript strict-mode), clean, and accessible (WCAG compliant).
6.  **Verify Integrity**:
    *   Run type checking: `npm run type-check`
    *   Verify styling standards: `npm run lint`
7.  **Commit Changes**: Follow Conventional Commits guidelines (e.g., `feat: add soundwave styling`, `fix: normalize EVM address inputs`).
8.  **Submit Pull Request**: Open a pull request against our `main` branch with a clear summary of changes.

---

## 🎨 Coding Standards

*   **TypeScript**: No `any` type casts allowed unless strictly necessary (must be justified). Use explicit return types on custom hooks and API handlers.
*   **CSS**: Style components utilizing custom design tokens in `tailwind.config.js` or standard CSS variables rather than hardcoded colors.
*   **Accessibility**: Always provide descriptive ARIA attributes, keyboard-focusable interactions, and ensure high contrast ratios (WCAG AA).
*   **State Management**: Avoid prop-drilling; leverage Context API, Custom Hooks, or state reducers methodically.
