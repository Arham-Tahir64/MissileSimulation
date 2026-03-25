import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { getImpactPreset } from '../../config/impactPresets';
import { ImpactEffectManager } from '../../services/impactEffectManager';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';
import { EntityDefinition, EntityState } from '../../types/entity';
import { isInterceptionEvent } from '../../types/simulation';
import { ImpactEvent } from '../../types/impact';

interface Props {
  viewer: Cesium.Viewer | null;
}

function isThreat(entity: EntityState): boolean {
  return entity.type === 'ballistic_threat' || entity.type === 'cruise_threat';
}

function terminalPositionFor(entity: EntityState, definition: EntityDefinition | null) {
  return definition?.target
    ?? definition?.waypoints?.[definition.waypoints.length - 1]
    ?? entity.position;
}

export function ImpactEffectsLayer({ viewer }: Props) {
  const scenarioId = useSimulationStore((s) => s.scenarioId);
  const simTimeS = useSimulationStore((s) => s.simTimeS);
  const status = useSimulationStore((s) => s.status);
  const runtimeEvents = useSimulationStore((s) => s.events);
  const entities = useSimulationStore((s) => s.entities);
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  const managerRef = useRef<ImpactEffectManager | null>(null);
  const prevScenarioIdRef = useRef<string | null>(scenarioId);
  const prevSimTimeRef = useRef(simTimeS);
  const processedKeysRef = useRef<Set<string>>(new Set());
  const prevEntitiesRef = useRef<Map<string, EntityState>>(new Map());

  useEffect(() => {
    if (!viewer) return;

    const manager = new ImpactEffectManager(viewer);
    managerRef.current = manager;

    const onTick = () => {
      manager.update(performance.now());
    };

    viewer.scene.preRender.addEventListener(onTick);

    return () => {
      viewer.scene.preRender.removeEventListener(onTick);
      manager.destroy();
      managerRef.current = null;
    };
  }, [viewer]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const rewound = simTimeS + 0.001 < prevSimTimeRef.current;
    const scenarioChanged = prevScenarioIdRef.current !== scenarioId;
    const becameIdle = status === 'idle' && entities.length === 0;

    if (rewound || scenarioChanged || becameIdle) {
      manager.reset();
      processedKeysRef.current.clear();
      prevEntitiesRef.current.clear();
    }

    prevSimTimeRef.current = simTimeS;
    prevScenarioIdRef.current = scenarioId;
  }, [entities.length, scenarioId, simTimeS, status]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const nowMs = performance.now();

    for (const event of runtimeEvents) {
      if (!isInterceptionEvent(event)) continue;
      if (event.sim_time_s - simTimeS > 0.001) continue;

      const preset = getImpactPreset(event.outcome === 'success' ? 'heavy_intercept' : 'small_intercept');
      const dedupeKey = `intercept:${event.event_id}`;
      if (processedKeysRef.current.has(dedupeKey)) continue;

      const impact: ImpactEvent = {
        id: dedupeKey,
        dedupeKey,
        kind: 'intercept',
        simTimeS: event.sim_time_s,
        position: event.position,
        relatedEntityIds: [event.interceptor_id, event.threat_id],
        presetId: preset.id,
        intensity: preset.intensity,
        palette: preset.palette,
        sourceEvent: event,
        durationMs: preset.durationMs,
        radiusM: preset.radiusM,
        ringSpeedMps: preset.ringSpeedMps,
        smokeLifetimeMs: preset.smokeLifetimeMs,
        particleCount: preset.particleCount,
        aftermathLifetimeMs: preset.aftermathLifetimeMs,
        localCameraShakeHint: preset.cameraShakeHint,
      };

      manager.emit(impact, nowMs);
      processedKeysRef.current.add(dedupeKey);
    }
  }, [runtimeEvents, simTimeS]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const nowMs = performance.now();
    const nextPrevMap = new Map<string, EntityState>();

    for (const entity of entities) {
      const prevEntity = prevEntitiesRef.current.get(entity.id);
      nextPrevMap.set(entity.id, entity);

      if (!isThreat(entity)) continue;
      if (entity.status !== 'missed') continue;
      if (prevEntity?.status === 'missed') continue;
      if (entity.sim_time_s - simTimeS > 0.001) continue;

      const definition = activeScenario?.entities.find((candidate) => candidate.id === entity.id) ?? null;
      const position = terminalPositionFor(entity, definition);
      const dedupeKey = `terminal:${scenarioId ?? 'session'}:${entity.id}:${position.lat.toFixed(4)}:${position.lon.toFixed(4)}:${entity.sim_time_s.toFixed(2)}`;
      if (processedKeysRef.current.has(dedupeKey)) continue;

      const preset = getImpactPreset('terminal_impact');
      const impact: ImpactEvent = {
        id: dedupeKey,
        dedupeKey,
        kind: 'terminal_impact',
        simTimeS: entity.sim_time_s,
        position,
        relatedEntityIds: [entity.id],
        presetId: preset.id,
        intensity: preset.intensity,
        palette: preset.palette,
        durationMs: preset.durationMs,
        radiusM: preset.radiusM,
        ringSpeedMps: preset.ringSpeedMps,
        smokeLifetimeMs: preset.smokeLifetimeMs,
        particleCount: preset.particleCount,
        aftermathLifetimeMs: preset.aftermathLifetimeMs,
        localCameraShakeHint: preset.cameraShakeHint,
      };

      manager.emit(impact, nowMs);
      processedKeysRef.current.add(dedupeKey);
    }

    prevEntitiesRef.current = nextPrevMap;
  }, [activeScenario, entities, scenarioId, simTimeS]);

  return null;
}
