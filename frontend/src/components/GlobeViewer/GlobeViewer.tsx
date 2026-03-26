import { useId } from 'react';
import { useViewer } from './useViewer';
import { EntityLayer } from './EntityLayer';
import { TrajectoryLayer } from './TrajectoryLayer';
import { GlobeClickHandler } from './GlobeClickHandler';
import { ReachRadiusLayer } from './ReachRadiusLayer';
import { PlacementMarkerLayer } from './PlacementMarkerLayer';
import { CinematicCameraController } from './CinematicCameraController';
import { CinematicMissileLayer } from './CinematicMissileLayer';
import { ImpactEffectsLayer } from './ImpactEffectsLayer';
import { AssetOverlayLayer } from './AssetOverlayLayer';
import { CoverageLayer } from './CoverageLayer';
import { InterceptorTrajectoryLayer } from './InterceptorTrajectoryLayer';
import { TrackHistoryLayer } from './TrackHistoryLayer';
import { BdaMarkerLayer } from './BdaMarkerLayer';
import { RadarSweepLayer } from './RadarSweepLayer';
import { SaturationHighlightLayer } from './SaturationHighlightLayer';
import { ReentryFootprintLayer } from './ReentryFootprintLayer';
import { JammingZoneLayer } from './JammingZoneLayer';
import { TaskingLineLayer } from './TaskingLineLayer';
import { MissileExhaustLayer } from './MissileExhaustLayer';
import { useSimulationStore } from '../../store/simulationStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { useDashboardStore } from '../../store/dashboardStore';

export function GlobeViewer() {
  const rawId = useId();
  const containerId = `cesium-globe-${rawId.replace(/:/g, '')}`;

  const viewer = useViewer(containerId);

  const entities       = useSimulationStore((s) => s.entities);
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  const layers = useDashboardStore((s) => s.layers);
  const currentPage = useDashboardStore((s) => s.currentPage);

  const onActiveSimPage =
    currentPage !== 'overview' &&
    currentPage !== 'analysis' &&
    currentPage !== 'archive'  &&
    currentPage !== 'settings';

  const effectiveLayers = {
    trajectories:
      layers.trajectories
      && (currentPage === 'monitor' || currentPage === 'replay'),
    impactEffects:  layers.impactEffects  && onActiveSimPage,
    assetOverlays:  layers.assetOverlays  && onActiveSimPage,
    labels:         layers.labels         && currentPage === 'monitor',
    rangeRings:     layers.rangeRings     && currentPage === 'monitor',
    trackTrails:    onActiveSimPage,
    bdaMarkers:     onActiveSimPage,
    radarSweeps:    layers.rangeRings     && onActiveSimPage,
  };

  return (
    // Fill whatever container GlobeViewer is placed in
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div id={containerId} style={{ width: '100%', height: '100%' }} />

      {/* ── Simulation layers ──────────────────────────────────────── */}
      <CinematicCameraController viewer={viewer} />
      <EntityLayer
        viewer={viewer}
        entities={entities}
        entityDefinitions={activeScenario?.entities ?? []}
        showLabels={effectiveLayers.labels}
      />
      <CinematicMissileLayer viewer={viewer} />
      {effectiveLayers.impactEffects && <ImpactEffectsLayer viewer={viewer} />}
      {effectiveLayers.assetOverlays && (
        <AssetOverlayLayer
          viewer={viewer}
          showLabels={effectiveLayers.labels}
          showRangeRings={effectiveLayers.rangeRings}
        />
      )}
      {effectiveLayers.rangeRings && <CoverageLayer viewer={viewer} />}
      {activeScenario && effectiveLayers.trajectories && (
        <TrajectoryLayer
          viewer={viewer}
          entityDefinitions={activeScenario.entities}
          entities={entities}
        />
      )}
      {effectiveLayers.trajectories && (
        <InterceptorTrajectoryLayer viewer={viewer} />
      )}
      {effectiveLayers.trackTrails  && <TrackHistoryLayer       viewer={viewer} />}
      {effectiveLayers.bdaMarkers   && <BdaMarkerLayer          viewer={viewer} />}
      {effectiveLayers.radarSweeps  && <RadarSweepLayer         viewer={viewer} />}
      {onActiveSimPage              && <SaturationHighlightLayer  viewer={viewer} />}
      {onActiveSimPage              && <ReentryFootprintLayer     viewer={viewer} />}
      {onActiveSimPage              && <JammingZoneLayer          viewer={viewer} />}
      {onActiveSimPage              && <TaskingLineLayer          viewer={viewer} />}
      {onActiveSimPage              && <MissileExhaustLayer       viewer={viewer} />}

      {/* ── Interactive placement layers ───────────────────────────── */}
      <GlobeClickHandler viewer={viewer} />
      <ReachRadiusLayer viewer={viewer} />
      <PlacementMarkerLayer viewer={viewer} />
    </div>
  );
}
