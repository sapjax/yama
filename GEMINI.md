# Gemini Onboarding Instructions

Before performing any task, you **must** read the following documents in order to gain a comprehensive understanding of the project and your role. This is non-negotiable.

1.  **`AGENTS.md`**: Located in the root directory. It contains general instructions and rules for all AI agents working on this project.
2.  **`openspec/project.md`**: Contains the detailed project overview, architecture, tech stack, and features.

---

## My Understanding of OpenSpec

This section documents my understanding of the OpenSpec methodology as it applies to this project.

### 1. Purpose (The "Why")

OpenSpec is a framework for **spec-driven development** designed specifically for AI collaboration. Its primary purpose is to **align human intent with AI actions before code is written**. By establishing a formal process for defining and approving changes, it makes AI contributions predictable, verifiable, and truly collaborative, treating the AI as a team member that operates on clear requirements.

### 2. Workflow (The "How")

The workflow revolves around two key directories (`specs/` and `changes/`) and a clear, four-stage process:

1.  **Define (`specs/`)**: The `specs/` directory is the **single source of truth**. It contains version-controlled Markdown files that describe the current, as-built state of the project's capabilities.

2.  **Propose (`changes/`)**: All new features or modifications start as a **Change Proposal** in the `changes/` directory. A proposal consists of:
    - `proposal.md`: Explaining the "why" and "what" of the change.
    - `tasks.md`: A checklist for implementation.
    - `proposal.md`: Explaining the "why" and "what" of the change.
    - `tasks.md`: A checklist for implementation.
    - `specs/`: Directory containing spec deltas.
        - Must mirror the structure of the main `specs/` directory (e.g., `specs/settings/spec.md`).
        - Spec files must use delta headers: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, `## RENAMED Requirements`.
        - Each requirement must include at least one `#### Scenario:` block.

3.  **Validate & Implement**: A command-line tool (`openspec`) validates the proposal's structure. Once a human approves the proposal, the intent is locked. The AI (or human) then implements the code precisely according to the approved tasks and spec changes.

4.  **Archive**: After implementation and deployment, the change proposal is "archived". The deltas from the proposal are merged into the main `specs/`, updating the project's source of truth to reflect the new reality.
