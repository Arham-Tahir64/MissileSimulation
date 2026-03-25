# Parallel Feature Task Board

This document scopes the next product features into isolated workstreams so they can be delegated to subagents in parallel with minimal file collisions.

The goal is to keep each slice:
- vertically coherent
- narrowly owned
- integration-light
- safe to merge independently

---

## Principles

### 1. One slice, one owner
Each agent owns one bounded problem and a mostly disjoint file set.

### 2. Avoid shared-shell edits in parallel
Do not have multiple agents editing the same top-level shell or shared selector file at once unless one agent is explicitly responsible for integration.

### 3. Prefer additive files over shared rewrites
If a slice needs new UI or selector logic, create new local files under its owned area rather than editing cross-cutting files.

### 4. Keep integration centralized
The main thread should own merge coordination, shared selector cleanup, and any changes that touch multiple slices.

---

## Recommended First-Wave Workstreams

### A. `scenario_home`
**Goal**
Productize the entry flow so users can clearly choose between predefined scenarios and the custom builder.

**Why this is parallel-safe**
It can be mostly isolated to the overview and scenario selector experience without touching the globe, replay, or analytics.

**Owns**
- `frontend/src/components/AppShell/OverviewPage.tsx`
- `frontend/src/components/ScenarioSelector/*`
- optional new files under `frontend/src/components/AppShell/overview/*`
- optional light usage in `frontend/src/services/scenarioApi.ts`

**Must not edit**
- `frontend/src/components/AppShell/AppShell.tsx`
- `frontend/src/components/AppShell/TopNav.tsx`
- `frontend/src/components/AppShell/MonitorPage.tsx`
- globe layers
- replay components

**Outputs**
- real scenario home
- scenario library surfaced clearly
- custom-builder CTA surfaced clearly
- better empty/no-scenario states

---

### B. `replay_investigation`
**Goal**
Make replay a real investigation workflow instead of only a scrubber with markers.

**Why this is parallel-safe**
Replay is already page-scoped and mostly isolated to its own page and timeline bar.

**Owns**
- `frontend/src/components/AppShell/ReplayPage.tsx`
- `frontend/src/components/HUD/ReplayTimelineBar.tsx`
- optional new files under `frontend/src/components/AppShell/replay/*`
- `frontend/src/store/playbackStore.ts`

**Must not edit**
- `AppShell.tsx`
- `MonitorPage.tsx`
- `AlertFeedPanel.tsx`
- `TracksPanel.tsx`
- `DefenseAssetsPanel.tsx`

**Target features**
- replay bookmarks
- jump-to-event workflow
- event filtering within replay
- richer replay context strip / selection context

**Outputs**
- improved replay usability
- cleaner investigation flow
- bookmark-ready state model in playback store

---

### C. `alert_triage`
**Goal**
Turn alerts into a usable triage flow instead of a simple scrolling feed.

**Why this is parallel-safe**
Alert UI can be isolated to the alert feed and local alert presentation components.

**Owns**
- `frontend/src/components/HUD/AlertFeedPanel.tsx`
- optional new files under `frontend/src/components/Alerts/*`
- optional `frontend/src/components/InfoPanel/EventLog.tsx` only if needed for alert presentation consistency

**Must not edit**
- `ReplayPage.tsx`
- `MonitorPage.tsx`
- `AppShell.tsx`
- `hudSelectors.ts`

**Target features**
- severity grouping
- event-type filters
- cleaner scan hierarchy
- better alert row design
- clearer jump-to-context affordance

**Outputs**
- better live alert feed
- stronger replay/event investigation handoff
- less noisy alert presentation

---

### D. `tracks_assets_search`
**Goal**
Make track and defense-asset investigation cleaner with search, filtering, grouping, and stronger detail presentation.

**Why this is parallel-safe**
It can be scoped to the track/asset side panels and selection detail display.

**Owns**
- `frontend/src/components/HUD/TracksPanel.tsx`
- `frontend/src/components/HUD/DefenseAssetsPanel.tsx`
- `frontend/src/components/HUD/SelectionDetailPanel.tsx`
- optional new files under `frontend/src/components/HUD/selection/*`

**Must not edit**
- `MonitorPage.tsx`
- `AppShell.tsx`
- replay files
- overview files

**Target features**
- better search
- lightweight filtering/sorting
- stronger grouped asset states
- richer selected track/asset detail
- preparation for future compare flow

**Outputs**
- cleaner investigation workflows
- stronger distinction between tracks and assets
- improved per-entity product polish

---

### E. `run_reports`
**Goal**
Make the analysis/report page feel like a real post-run summary instead of a thin dashboard wrapper.

**Why this is parallel-safe**
Analysis is already page-scoped and can evolve independently from monitor and replay.

**Owns**
- `frontend/src/components/AppShell/AnalysisPage.tsx`
- optional new files under `frontend/src/components/Reports/*`

**Must not edit**
- `AppShell.tsx`
- `ReplayPage.tsx`
- `MonitorPage.tsx`
- globe layers

**Target features**
- stronger outcome summary
- asset activity recap
- event distribution improvements
- better report-like layout
- clear end-of-scenario value

**Outputs**
- portfolio-grade analysis page
- stronger post-run experience
- a foundation for saved-run reporting later

---

### F. `run_persistence_backend`
**Goal**
Add saved run/session persistence and run history on the backend.

**Why this should be separate**
It is backend-heavy and should not block the frontend UX slices.

**Owns**
- backend API route additions
- backend persistence/session model
- storage integration
- schema wiring where needed

**Likely files**
- `backend/app/api/routes/*`
- `backend/app/models/schema/*`
- `backend/app/simulation/runner.py`
- new persistence modules under `backend/app/*`

**Must not edit**
- frontend UX files

**Target features**
- persist completed runs
- expose run list/history API
- load run metadata for archive/replay later

---

### G. `run_archive_frontend`
**Goal**
Build the frontend run archive / replay history experience on top of persisted runs.

**Dependency**
Depends on backend API shape from `run_persistence_backend`.

**Owns**
- archive page/components
- run-history service client
- app-shell navigation integration if required

**Should wait until**
- persistence API is stable

---

### H. `state_architecture_refactor`
**Goal**
Reduce coupling across HUD/page logic so parallel work stays safe.

**Recommended owner**
Main thread only.

**Why**
This slice touches shared selectors and store boundaries and is the easiest place to create merge conflicts.

**Owns**
- `frontend/src/components/HUD/hudSelectors.ts`
- optional new files under `frontend/src/selectors/*`
- `frontend/src/store/dashboardStore.ts`
- `frontend/src/store/playbackStore.ts`
- `frontend/src/store/cameraStore.ts`

**Target refactors**
- separate domain selectors from page formatting
- reduce view-model logic inside component files
- clarify page state vs camera state vs replay state

---

## Recommended Parallel Execution Order

### Phase 1: Start now
These can run in parallel with minimal collisions:
1. `scenario_home`
2. `replay_investigation`
3. `alert_triage`
4. `tracks_assets_search`
5. `run_reports`

### Phase 2: Infrastructure split
Once Phase 1 is in flight:
6. `run_persistence_backend`
7. `state_architecture_refactor` (main thread)

### Phase 3: Archive UX
After backend persistence stabilizes:
8. `run_archive_frontend`

---

## Merge Order

### Safe merge sequence
1. `scenario_home`
2. `alert_triage`
3. `tracks_assets_search`
4. `run_reports`
5. `replay_investigation`
6. `state_architecture_refactor`
7. `run_persistence_backend`
8. `run_archive_frontend`

### Why this order
- The first four are mostly UI-local.
- Replay may touch playback state and benefits from the panel/UI improvements landing first.
- State refactor should happen after the first visual slices are understood, not before.
- Persistence and archive should merge after frontend UX surfaces are more stable.

---

## Ownership Matrix

| Slice | Primary Files | Shared Risk | Notes |
|---|---|---|---|
| `scenario_home` | `OverviewPage`, `ScenarioSelector/*` | Low | UI-local, no shell rewrites |
| `replay_investigation` | `ReplayPage`, `ReplayTimelineBar`, `playbackStore` | Medium | Touches replay state |
| `alert_triage` | `AlertFeedPanel`, new alert components | Low | Avoid shared selector changes |
| `tracks_assets_search` | `TracksPanel`, `DefenseAssetsPanel`, `SelectionDetailPanel` | Low | Do not touch monitor shell |
| `run_reports` | `AnalysisPage`, new report components | Low | Page-local |
| `run_persistence_backend` | backend routes/models/persistence | Medium | API contract dependency |
| `run_archive_frontend` | new archive page/services | Medium | Depends on persistence API |
| `state_architecture_refactor` | selectors + stores | High | Main thread only |

---

## Subagent-Ready Prompts

### Prompt: `scenario_home`
You are implementing the scenario-home / entry-flow slice in `/Users/arhamtahir/Desktop/MissileSimulation`.

Owned scope:
- `frontend/src/components/AppShell/OverviewPage.tsx`
- `frontend/src/components/ScenarioSelector/*`
- optional new files under `frontend/src/components/AppShell/overview/*`
- optional light service usage in `frontend/src/services/scenarioApi.ts`

Goal:
Turn the overview into a real scenario-entry page that clearly surfaces:
- predefined scenario library
- custom builder path
- quick scenario status / summary
- better empty/no-scenario states

Constraints:
- Preserve existing behavior elsewhere.
- Do not edit `AppShell.tsx`, `TopNav.tsx`, `MonitorPage.tsx`, `ReplayPage.tsx`, `AnalysisPage.tsx`, `SettingsPage.tsx`, or globe layers.
- You are not alone. Other agents are editing replay, alerts, tracks/assets, and reports. Do not revert their changes.
- Keep styling aligned with the Kinetic Sentinel direction.

Deliverables:
- working code in owned files
- `npm run build` in `frontend`
- short summary of changed files and caveats

---

### Prompt: `replay_investigation`
You are implementing the replay-investigation slice in `/Users/arhamtahir/Desktop/MissileSimulation`.

Owned scope:
- `frontend/src/components/AppShell/ReplayPage.tsx`
- `frontend/src/components/HUD/ReplayTimelineBar.tsx`
- optional new files under `frontend/src/components/AppShell/replay/*`
- `frontend/src/store/playbackStore.ts`

Goal:
Make replay a stronger investigation workflow with:
- bookmarks
- better jump-to-event behavior
- replay filtering and context
- clearer state inspection at time `t`

Constraints:
- Do not edit `AppShell.tsx`, `MonitorPage.tsx`, `AlertFeedPanel.tsx`, `TracksPanel.tsx`, `DefenseAssetsPanel.tsx`, or globe layers.
- Other agents are working in parallel. Do not revert their changes.
- Preserve existing seek/play/pause behavior.

Deliverables:
- working code in owned files
- `npm run build` in `frontend`
- summary of changed files and caveats

---

### Prompt: `alert_triage`
You are implementing the alert-triage slice in `/Users/arhamtahir/Desktop/MissileSimulation`.

Owned scope:
- `frontend/src/components/HUD/AlertFeedPanel.tsx`
- optional new files under `frontend/src/components/Alerts/*`
- optional `frontend/src/components/InfoPanel/EventLog.tsx` only if needed for alert presentation consistency

Goal:
Turn alerts into a better triage surface with:
- stronger scan hierarchy
- grouping or filter affordances
- clearer severity handling
- better handoff to selection/replay context

Constraints:
- Do not edit `ReplayPage.tsx`, `MonitorPage.tsx`, `AppShell.tsx`, or `hudSelectors.ts`.
- Other agents are editing in parallel. Do not revert their work.
- Preserve current `onSelectAlert` behavior.

Deliverables:
- working code in owned files
- `npm run build` in `frontend`
- summary of changed files and caveats

---

### Prompt: `tracks_assets_search`
You are implementing the tracks/assets investigation slice in `/Users/arhamtahir/Desktop/MissileSimulation`.

Owned scope:
- `frontend/src/components/HUD/TracksPanel.tsx`
- `frontend/src/components/HUD/DefenseAssetsPanel.tsx`
- `frontend/src/components/HUD/SelectionDetailPanel.tsx`
- optional new files under `frontend/src/components/HUD/selection/*`

Goal:
Improve track and defense-asset investigation with:
- cleaner search/filtering
- clearer grouped asset states
- stronger selected detail presentation
- groundwork for comparison later

Constraints:
- Do not edit `MonitorPage.tsx`, `AppShell.tsx`, `ReplayPage.tsx`, or overview files.
- Other agents are working in parallel. Do not revert their work.
- Preserve current selection callbacks.

Deliverables:
- working code in owned files
- `npm run build` in `frontend`
- summary of changed files and caveats

---

### Prompt: `run_reports`
You are implementing the post-run report slice in `/Users/arhamtahir/Desktop/MissileSimulation`.

Owned scope:
- `frontend/src/components/AppShell/AnalysisPage.tsx`
- optional new files under `frontend/src/components/Reports/*`

Goal:
Turn analysis into a real post-run report page with:
- stronger outcome summary
- asset activity recap
- improved event distribution
- more polished report layout

Constraints:
- Do not edit `AppShell.tsx`, `ReplayPage.tsx`, `MonitorPage.tsx`, `TopNav.tsx`, or globe layers.
- Other agents are editing in parallel. Do not revert their changes.
- Preserve current snapshot-driven data model.

Deliverables:
- working code in owned files
- `npm run build` in `frontend`
- summary of changed files and caveats

---

### Prompt: `run_persistence_backend`
You are implementing the run-persistence backend slice in `/Users/arhamtahir/Desktop/MissileSimulation`.

Owned scope:
- backend run/session persistence only
- backend routes/models/storage modules needed to save and list completed runs

Goal:
Persist completed simulation runs and expose a run-history API that can support a future archive/replay page.

Constraints:
- Do not edit frontend files.
- Keep the product fictional and simulation-focused.
- Preserve current simulation behavior.

Deliverables:
- backend persistence implementation
- backend tests
- summary of API shape and changed files

---

## Main-Thread Responsibilities

The main thread should own:
- selector refactors
- shared store boundary changes
- final integration across slices
- merge conflict resolution
- post-merge verification

Recommended local ownership:
- `frontend/src/components/HUD/hudSelectors.ts`
- new domain selectors under `frontend/src/selectors/*`
- `frontend/src/store/dashboardStore.ts`
- any app-shell integration needed after slice merges

---

## Immediate Recommendation

Start these first:
1. `scenario_home`
2. `alert_triage`
3. `tracks_assets_search`
4. `run_reports`
5. `replay_investigation`

Then handle:
6. selector/state cleanup in the main thread
7. backend run persistence
8. archive UX

