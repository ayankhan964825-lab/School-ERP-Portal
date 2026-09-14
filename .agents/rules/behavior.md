---
description: Strict workflow for handling doubts and architectural confusion.
---

# Agent Self-Analysis & Doubt Resolution Rule

**CRITICAL RULE: DO NOT ASSUME. READ THE ARCHITECTURE FIRST.**

Whenever the user gives a command and you (the AI) experience any confusion, doubt, or contradiction regarding the architecture, YOU MUST follow this strict sequence:

1. **Self-Analysis Step:** DO NOT immediately ask the user or guess the answer.
2. **Deep File Reading:** You MUST use the `view_file` tool to read and deeply analyze the 5 core project files:
   - `prd.md` (Product Requirements Document)
   - `trd.md` (Technical Requirements Document)
   - `system.html` (System Architecture Visualizer)
   - `architecture_analysis.md` (Or any other flow analysis docs)
   - `schema.prisma` (if it exists)
3. **Internal Resolution:** Cross-reference the user's command with the explicit logic written in these documents. If the logic (like Supabase Branching, `x-school-id`, or Handover Model details) is found in the docs, proceed strictly based on the docs without asking.
4. **Final Escalation:** ONLY IF the files completely lack the answer to the doubt, then you may ask the user for clarification.
5. **Proactive Suggestions:** If you understand the command but have a better technical idea or suggestion regarding the user's approach, DO NOT execute blindly. Present your suggestion to the user first and ask for their permission to proceed with either their original idea or your suggested improvement.

**Failure to follow this rule means you are acting on your own assumptions, which is strictly forbidden.**
