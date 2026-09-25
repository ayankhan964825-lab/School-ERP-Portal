<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Architecture Rule: Hybrid Approach
**"Code like a SaaS, Test like a Single School"**

> **CRITICAL AGENT RULE:** Before starting work on ANY new feature or task, you MUST read this `AGENTS.md` file using the `view_file` tool to ensure you are aligned with the project's core architecture and latest rules. This is a non-negotiable step to prevent future technical debt.

We are building this ERP with a strict hybrid approach. You must always follow these rules:
1. **SaaS-Ready Database & APIs:** Every database query and API endpoint MUST include and validate the `schoolId`. Never write queries that assume a single tenant in the backend. 
2. **Phase 4 Deferment:** Do not implement Phase 4 (Agency Panel, B2B Subscriptions, Multi-tenant dynamic subdomains) from `phase.md` until explicitly instructed.
3. **Single School Testing:** For the frontend and middleware, we are hardcoding/mapping the current domain (e.g., `schoolerpportal.vercel.app`) to the "RL Academy" tenant for seamless testing without complex login screens.
4. **Conclusion:** Build all features (Phase 1-3) perfectly as a SaaS, but keep the UI/testing flow locked to a single school for now.
