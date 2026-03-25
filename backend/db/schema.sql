-- Educational Missile Defense Simulation — Database Schema
-- Non-operational. All scenario data uses fictional parameters.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ── Scenario registry ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scenarios (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    duration_s  FLOAT NOT NULL,
    tags        TEXT[],
    definition  JSONB NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Session tracking ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_sessions (
    session_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id   TEXT REFERENCES scenarios(id),
    started_at    TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    final_status  TEXT
);

-- ── Time-series entity state log (TimescaleDB hypertable) ───────────────────

CREATE TABLE IF NOT EXISTS entity_state_log (
    time          TIMESTAMPTZ NOT NULL,
    session_id    UUID NOT NULL,
    entity_id     TEXT NOT NULL,
    entity_type   TEXT NOT NULL,
    status        TEXT NOT NULL,
    position      GEOGRAPHY(POINTZ, 4326),
    velocity_ms   FLOAT,
    heading_deg   FLOAT,
    sim_time_s    FLOAT
);

SELECT create_hypertable('entity_state_log', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_entity_state_session ON entity_state_log (session_id, time DESC);

-- ── Interception events ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interception_events (
    event_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID REFERENCES simulation_sessions(session_id),
    sim_time_s     FLOAT NOT NULL,
    threat_id      TEXT NOT NULL,
    interceptor_id TEXT NOT NULL,
    position       GEOGRAPHY(POINTZ, 4326),
    outcome        TEXT NOT NULL CHECK (outcome IN ('success', 'miss')),
    logged_at      TIMESTAMPTZ DEFAULT NOW()
);
