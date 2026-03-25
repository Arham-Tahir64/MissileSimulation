# Product + Engineering Gap Audit

Created for the current `MissileSimulation` repo as a saved copy of the audit brief and the resulting product/engineering gap analysis.

## Audit Brief

### Summary
Perform a full-stack audit of the current repo against the attached product document, then produce a decision-oriented roadmap that identifies what is already solid, what is rough or unfinished, and which features should be built next.

The audit will be grounded in the actual implementation that exists today:
- Backend simulation engine with fictional radar detection, battery engagement, dynamic interceptor shots, runtime event streaming, and deterministic-ish seek/rebuild.
- Frontend Cesium globe with entity rendering, trajectories, impact effects, placement flow, replay controls, and a recently added multi-page shell.
- Current product inconsistencies already visible in the repo, including dead-end or hidden UI paths such as `ScenarioSelector`, `InfoPanel`, and `PlaybackControls`, plus older HUD-era components that coexist with newer app-shell patterns.

### Audit Method
1. **Current-state inventory**
   - Map the actual shipped flows across `App`, `AppShell`, globe layers, stores, WebSocket ingestion, scenario builder, and backend engine/runtime.
   - Classify features as:
     - complete and surfaced
     - complete but weak
     - partially implemented
     - hidden / dead-end
     - missing entirely

2. **Document-to-code comparison**
   - Compare the PDF's intended platform shape against the repo in these buckets:
     - visualization and globe UX
     - replay/playback
     - tracking, sensors, and engagement logic
     - scenario management/editor flows
     - analytics/reporting
     - persistence/data platform
     - extensibility / advanced simulation roadmap
   - Mark each gap as:
     - fully missing
     - partially implemented
     - implemented but weak
     - implemented but not surfaced well
     - nice-to-have / defer

3. **Product + engineering prioritization**
   - Score each candidate feature by:
     - user value
     - UX improvement
     - technical feasibility
     - portfolio/demo impact
     - architectural importance
     - foundational necessity
   - Output:
     - top 5 next features
     - top 10 roadmap
     - quick wins vs strategic investments
     - explicit cuts/postponements

### Key Focus Areas To Evaluate
- **Navigation and product structure**
  - The repo now has an `AppShell` with `Overview`, `Monitor`, `Replay`, `Analysis`, and `Settings`, but the audit should verify whether those pages are truly productized or still thin wrappers around older HUD logic.
- **Globe vs panel responsibility**
  - Check whether globe workflows are still overloaded or whether the new page split actually reduces clutter in practice.
- **Scenario entry flow**
  - Determine whether the current launch-builder flow has effectively replaced scenario selection, or whether `ScenarioSelector` is a stranded path that indicates unfinished product architecture.
- **Replay usability**
  - Verify whether replay is now truly a first-class workflow or still shares too much state and interaction logic with live monitoring.
- **Analytics depth**
  - The current `AnalysisPage` appears lightweight and report-like, but likely falls short of the document's broader analytics and run-comparison vision.
- **Simulation fidelity vs roadmap**
  - The backend now covers basic detection and engagement, but the PDF points toward tracking/state estimation, persistence, Monte Carlo, and scenario/run storage that are not yet present.
- **State boundaries and maintainability**
  - Review whether store responsibilities are clean or whether selection, navigation, replay, camera, and dashboard state remain too coupled.
- **Dead-end / duplicate UI**
  - Explicitly call out components present in the repo but not productized or not mounted (`InfoPanel`, `ScenarioSelector`, `PlaybackControls`, older shell remnants).
- **Testing and tooling gaps**
  - Backend has meaningful tests; frontend appears to rely on builds and React Doctor rather than feature tests. This should be evaluated as a likely engineering gap.

### Output To Produce
The final audit deliverable should follow this structure:
1. Executive summary
2. What the codebase currently does well
3. Biggest gaps between the codebase and the document
4. Recommended features to add now
5. Top 5 highest-value additions
6. Quick wins
7. Longer-term roadmap
8. Technical debt / architecture improvements
9. Features to postpone or cut
10. Final recommendation: what to build first

And it must end with:
- best next feature
- best UX fix
- best portfolio/demo feature
- best technical refactor
- phased implementation order for the next 2-4 weeks

### Assumptions And Defaults
- Treat the repo as the source of truth over prior discussion; if a feature was discussed previously but is not actually present in code, it counts as missing.
- Prioritize usability, product clarity, and portfolio/demo impact over speculative high-fidelity simulation work.
- Keep all recommendations fictional, abstract, and simulation-focused; do not recommend real-world operational features.
- Be opinionated: identify what should be cut, hidden, postponed, or de-emphasized, not just what could be added.

---

## Audit Output

### 1. Executive Summary
The repo is already beyond "prototype." It has a real simulation loop, a Cesium globe, a custom scenario builder, fictional radar/battery behavior, replay, and a multi-page shell. The strongest parts are the simulation-to-visualization pipeline and the globe interaction model. The weakest parts are productization: scenario entry, run lifecycle, replay/reporting depth, and state architecture for a growing app.

The biggest gap between the PDF and the codebase is that the document describes a platform with a full learning loop:
- pick or create a scenario
- run it
- investigate it
- replay it
- analyze results
- store and compare runs

The repo currently does:
- create/run well
- inspect somewhat
- replay partially
- analyze lightly
- store/compare not at all

The strongest recommendation: **build a persistent run/reporting layer next**. That is the highest-leverage feature because it closes the product loop, unlocks better replay/analytics, and makes the app feel like a platform instead of a one-session simulation demo.

### 2. What the Codebase Currently Does Well

#### What exists and feels solid
- **Globe simulation stack** is strong.
  - `GlobeViewer`, `EntityLayer`, `TrajectoryLayer`, `CinematicCameraController`, `CinematicMissileLayer`, `ImpactEffectsLayer`, and `AssetOverlayLayer` form a coherent Cesium-based rendering system.
- **Core scenario execution** is real, not mocked.
  - The backend engine supports ballistic/cruise motion, fictional radar detection, battery engagement, dynamic interceptor shots, and runtime event emission.
- **Custom scenario builder** is a real product feature.
  - `MissileTypePicker`, `LaunchPanel`, `placementStore`, and `scenarioBuilder` let users build mixed scenarios with threats and defense assets.
- **Runtime event model** is useful.
  - `sensor_track`, `engagement_order`, and `event_intercept` are enough to power a believable fictional workflow.
- **Replay plumbing exists**.
  - There is WebSocket-driven playback, time seeking, and a dedicated replay page.
- **Backend test coverage is good for the sim core**.
  - Physics and engine tests exist and are meaningful.

#### What is implemented but weak
- **Multi-page product shell** exists, but is still thin.
  - `AppShell`, `OverviewPage`, `MonitorPage`, `ReplayPage`, `AnalysisPage`, and `SettingsPage` are present, but several pages are still mostly layout wrappers around existing HUD-derived data.
- **Analysis is present but shallow**.
  - `AnalysisPage` is more of a lightweight report card than a real analytics surface.
- **Overview is directionally right but not productized**.
  - It has orientation copy and summary cards, but the "live viewport" is decorative rather than a real mini-monitoring surface.
- **Replay is separated, but still not fully investigation-grade**.
  - It has a better structure now, but lacks bookmarks, comparisons, before/after state inspection, and rich event filtering.

#### What looks unfinished or inconsistent
- **Scenario entry flow is inconsistent**.
  - `ScenarioSelector` and scenario API support exist, but the current visible experience is dominated by the custom builder path.
- **Old/dead-end UI still exists**.
  - `InfoPanel`, `PlaybackControls`, and `ScenarioSelector` are in the repo but not clearly part of the current main flow.
- **State boundaries are blurry**.
  - Selection, page navigation, replay, layers, and camera state are spread across `cameraStore`, `dashboardStore`, `playbackStore`, and `simulationStore` with UI-specific derived logic living in `hudSelectors.ts`.
- **The app shell is not route-driven**.
  - Page navigation is in Zustand (`dashboardStore`) rather than URL/router state, so the app behaves like a single-screen state machine more than a real product.

#### Duplicated logic / dead ends / inconsistencies
- `PlaybackControls.tsx` duplicates replay UI behavior that now also exists in `ReplayTimelineBar.tsx`.
- `InfoPanel.tsx` + `EventLog.tsx` represent an older panel model that is no longer integrated into the main UX.
- `ScenarioSelector.tsx` is a valid feature, but it is stranded relative to the current launch-builder-first experience.
- `hudSelectors.ts` carries both derivation and presentation formatting, which is convenient but is becoming a product-logic bottleneck.
- `db/schema.sql` describes a serious persistence layer, but the actual backend runtime is still in-memory plus static JSON scenarios.

### 3. Biggest Gaps Between the Codebase and the Document

#### Fully missing
- **Run persistence and replay archive**
  - The document explicitly points toward PostGIS/Timescale-style run storage and replay reconstruction. The codebase has only a schema file, no persistence integration.
  - Why it matters: without stored runs, replay is session-local and analytics cannot become meaningful over time.
- **Scenario/run comparison**
  - No stored run history, no comparison dashboards, no before/after scenario comparison.
  - Why it matters: this is one of the clearest portfolio-grade features in the document's advanced direction.
- **Tracking/state estimation**
  - The document calls out Kalman-filter style tracking, confidence, uncertainty, and covariance views. The current app has detection and engagement, but not a real tracking layer.
  - Why it matters: this is the biggest simulation-model gap between "cinematic demo" and "educational systems platform."
- **Onboarding / scenario home / empty-state product flow**
  - There is no clearly productized "start here" page that unifies scenario library, custom builder, and learning objective.
  - Why it matters: the app is powerful, but entry is still expert-biased.

#### Partially implemented
- **Multi-page information architecture**
  - Pages now exist, but they are not fully distinct workflows yet.
  - Why it matters: clutter reduction has started, but not finished.
- **Replay mode**
  - Now separated and improved, but still lacks higher-order investigation tools.
  - Why it matters: replay should be one of the core strengths of this product.
- **Analytics**
  - Present, but basic.
  - Why it matters: the document explicitly treats analytics/reporting as a product pillar.
- **Scenario selection**
  - API and UI pieces exist, but the current surfaced flow is not coherent.
  - Why it matters: both predefined scenario library and custom builder should coexist cleanly.

#### Implemented but weak
- **Alerts workflow**
  - Alerts exist, but there is no full triage experience with grouping, filtering, acknowledgment-like handling, bookmarking, or deep linking.
  - Why it matters: alerts should drive user attention, not just decorate the monitor.
- **Track investigation workflow**
  - You can select tracks and assets, but there is no strong compare/search/filter workflow.
  - Why it matters: investigation is a core product loop.
- **Overview page**
  - Good direction, weak execution.
  - Why it matters: it should be the clarity-first landing page and currently feels more like a conceptual stub.
- **Settings as a control surface**
  - It moves low-frequency controls out of the monitor, which is correct, but it still feels thin.
  - Why it matters: it should absorb clutter more aggressively.

#### Implemented but hidden / not surfaced well
- **Scenario library**
  - `ScenarioSelector` + `scenarioApi` exist, but are not clearly part of the current main product.
- **Static scenario loading**
  - Backend `/api/scenarios` exists, but the current main flow feels centered on custom build-and-launch.
- **Legacy event/info paneling**
  - `InfoPanel` and `PlaybackControls` imply older usable patterns, but they are not integrated.
- **Database ambition**
  - `db/schema.sql` is a strong signal of intended product maturity, but it is not surfaced in runtime architecture.

#### Nice-to-have / defer
- **Monte Carlo runs**
  - Valuable long-term, but not the next thing.
- **Multiplayer roles**
  - Not important yet.
- **Pluggable model kernels**
  - Architecturally interesting, but premature relative to more obvious product gaps.
- **ML/analytics sandbox**
  - Defer.

### 4. Recommended Features to Add Now

#### UX / navigation improvements
- Productized **scenario home + entry flow**
- Dedicated **alerts experience** with filtering and jump-to-context
- Better **track/asset investigation flow**
- True **end-of-scenario summary/report**
- Clearer **live monitor hierarchy** with fewer simultaneous widgets

#### Core simulation / product features
- **Stored runs + replay archive**
- **Scenario/run persistence**
- **Tracking confidence / uncertainty model**
- **Bookmarks / key event capture**

#### Replay / investigation features
- Replay bookmarks
- Event filtering
- Selected state at time `t`
- Jump-to-event compare flow

#### Analytics / reporting features
- Run summary report
- Outcome breakdowns
- Asset activity summary
- Scenario comparison over multiple runs

#### Interaction polish
- Search/filter for tracks/assets/alerts
- Saved view presets / layer presets
- Better empty states and guide rails

#### Performance / architecture
- Normalize derived state away from UI-only selectors
- URL/router-based page state
- Better frontend testing
- Clear separation between page state and simulation state

### 5. Top 5 Highest-Value Additions

| Feature | Impact | Effort | Urgency | Type | Why now |
|---|---|---:|---:|---|---|
| Stored runs + replay archive | High | High | High | Product / Technical | This closes the product loop and unlocks real replay, analytics, bookmarks, and future comparisons. It is the biggest "platform vs demo" gap. |
| End-of-scenario report page | High | Medium | High | UX / Product | The app currently runs scenarios but does not land them well. A strong report screen would make the product feel dramatically more complete. |
| Productized scenario home (library + custom builder) | High | Medium | High | UX / Product | The entry flow is fragmented between hidden scenario library and visible custom builder. This is the clearest UX gap for first-time users. |
| Real alert/track investigation workflow | High | Medium | High | UX | Alerts, tracks, and replay exist, but the user still lacks a clean "investigate this" workflow with filtering, context jump, and comparison. |
| Tracking confidence / uncertainty visualization | High | Medium/High | Medium | Product / Portfolio | This is the single biggest simulation-model upgrade from the document that would make the app feel more educational and technically serious. |

### 6. Quick Wins
- Mount a real **scenario home** that exposes both predefined scenarios and the custom builder.
- Turn the `Overview` page into a genuine entry page instead of a mostly decorative orientation layer.
- Add **search and filtering** to tracks/assets/alerts.
- Add **bookmarks / "save this moment"** in replay.
- Add an actual **post-run summary card flow** when status becomes `completed`.
- Remove or archive dead-end UI:
  - `InfoPanel`
  - `PlaybackControls`
  - unused scenario-flow remnants if they are not reintegrated
- Reduce duplicated status displays across top bar, detail drawer, and metric surfaces.

### 7. Longer-Term Roadmap

#### Top 10 roadmap
1. Stored runs + replay archive
2. End-of-scenario reporting
3. Productized scenario home
4. Alert/track investigation workflow
5. Tracking confidence / uncertainty
6. Scenario/run comparison dashboards
7. Analytics page expansion with trend views
8. URL/router-based multi-page state
9. Frontend test coverage for key flows
10. Persistence-backed scenario management

#### Quick wins
- scenario home
- search/filter
- bookmarks
- better overview page
- post-run summary
- dead-end UI cleanup

#### Strategic investments
- persisted run model
- tracking/uncertainty layer
- comparison dashboards
- normalized selector/state architecture
- proper routing and app-state boundaries

### 8. Technical Debt / Architecture Improvements
- Move from **store-only page state** to **URL/router-backed navigation**.
  - Right now page state in `dashboardStore` is fine for experimentation, but weak for product navigation.
- Split `hudSelectors.ts` into:
  - domain selectors
  - page adapters
  - presentational formatting helpers
- Introduce a clearer **selection model**.
  - Current selection is heavily coupled to camera behavior, which is convenient but brittle.
- Add frontend test coverage for:
  - scenario launch flow
  - track selection
  - asset selection
  - replay seeking
  - alert jump behavior
- Formalize run/session model in backend:
  - in-memory engine is fine for MVP sim execution
  - not fine for long-term replay/reporting productization
- Consider a more explicit **view model layer** between `simulationStore` and page components.
- Keep Cesium-specific imperative sync isolated in globe-layer files; do not let it leak into page components.

### 9. Features to Postpone or Cut
- **Multiplayer**
  - Too early. Product basics are not yet closed.
- **Monte Carlo simulation**
  - Valuable later, but only after runs can be stored, replayed, and compared.
- **Pluggable model kernels**
  - Not worth the complexity yet.
- **High-fidelity tracking / advanced seeker-like logic**
  - Explicitly postpone; the app should stay fictional and abstract.
- **More dashboard widgets on live monitor**
  - Cut, do not add. The problem is already too much simultaneous information.
- **More globe overlays by default**
  - Also cut. The globe needs less noise, not more.

### 10. Final Recommendation: What to Build First
Build **stored run persistence + an end-of-scenario report/replay archive flow** first.

That is the best next step because it:
- converts the app from a transient simulation session into a product
- unlocks better replay, analytics, bookmarks, and scenario comparison
- aligns directly with the document's platform vision
- improves both user value and portfolio/demo impact
- creates the foundation for almost every advanced feature you actually want later

## Final Callouts

### Best next feature
- **Stored run persistence with replay archive**

### Best UX fix
- **A proper scenario home that unifies scenario library, custom builder, and quick-start overview**

### Best portfolio/demo feature
- **A polished end-of-scenario report with replay jump points, outcome summary, and asset/track activity recap**

### Best technical refactor
- **Separate domain selectors/state from HUD/page formatting and move page navigation to route-aware state**

### Phased implementation order for the next 2-4 weeks

#### Week 1
- Build scenario home / entry flow
- Surface predefined scenarios alongside custom builder
- Clean up dead-end UI and remove duplicate live status surfaces

#### Week 2
- Implement end-of-scenario report
- Add replay bookmarks / jump-to-key-moments
- Improve alerts/tracks filtering and search

#### Week 3
- Add stored run/session persistence in the backend
- Save completed runs and replay metadata
- Create replay archive / run history page

#### Week 4
- Expand analysis from single-run summary to saved-run comparison prep
- Start tracking confidence/uncertainty visualization plan
- Refactor selectors/state boundaries to support the new persisted product loop
