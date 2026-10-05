<!-- BACKLOG.MD GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.53.0 -->

<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**At the beginning of each conversation in this project, run `backlog instructions overview` before answering or taking action. Re-read it only if you have not read it yet in the current conversation.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Before task lifecycle actions, read the matching detailed guide:

- `backlog instructions task-creation` before creating or splitting tasks
- `backlog instructions task-execution` before planning, changing status or assignee, adding a plan or implementation notes, or implementing task work
- `backlog instructions task-finalization` before checking acceptance criteria, writing final summaries, or moving tasks to terminal statuses

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->

## Starter engineering rules

- Use the native project-local Node/pnpm setup documented in README and prepend `.toolchain/bin` to PATH. Node is managed by pnpm `devEngines.runtime`; shared versions use the pnpm catalog. Do not change global settings.
- Keep apps in `apps/*`, reusable modules in `packages/*`; use package names, public exports and `workspace:*`. Packages cannot import apps or form cycles.
- Use `vp run` for orchestration. `pnpm verify` is the final local acceptance entry; final CI runs without task cache. Tests must exist and must execute.
- Keep TypeScript strict and root `typeAware`/`typeCheck` enabled. Never replace package boundaries with TS paths or source aliases.
- Use Backlog CLI lifecycle instructions; auto commit and remote operations stay disabled. The web UI remains on localhost.
- Use small Conventional Commits after verified stages. A local commit does not authorize push, publishing or deployment.
- Prefer native tool configuration over custom scripts or controllers. Renovate proposes dependency and lockfile updates; GitHub Actions runs `pnpm verify`.
- Never print/store credentials in source, logs, prompts or evidence. PR verification runs with read-only permissions and no model credentials.
- Pi CI assistance is an optional, manually triggered diagnosis of failed logs. Disable tools and project resources in that workflow; keep its credentials confined to the diagnosis step. It does not decide CI success or write back to PRs.
- Enable remote integrations only after their repository settings are configured. Keep Renovate automerge disabled by default; when enabling it, require both platform CI checks in GitHub branch protection.
