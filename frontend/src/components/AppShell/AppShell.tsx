import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { TopNav } from './TopNav';
import { OverviewPage } from './OverviewPage';
import { MonitorPage } from './MonitorPage';
import { ReplayPage } from './ReplayPage';
import { AnalysisPage } from './AnalysisPage';
import { RunArchivePage } from './archive/RunArchivePage';
import { SettingsPage } from './SettingsPage';
import { getViewer } from '../../services/viewerRegistry';
import { wsClient } from '../../services/wsClient';
import { useCameraStore } from '../../store/cameraStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';
import { deriveHudSnapshot, AlertRow, ReplayEventMarker } from '../HUD/hudSelectors';
import { timeToFraction } from '../../utils/timeUtils';
import { usePlayback } from '../Playback/usePlayback';
import { flyToScenario } from '../../utils/cesiumHelpers';
import { ArchivedRunDetail } from '../../types/runArchive';

export function AppShell() {
  const {
    trackedEntityId,
    isHudExpanded,
    setMode,
    setTrackedEntityId,
    setFollowPreset,
    setHudExpanded,
    reset: resetCamera,
  } = useCameraStore();
  const {
    currentPage,
    monitorSection,
    layers,
    experimentalGlobeLayers,
    density,
    reduceMotion,
    setCurrentPage,
    setMonitorSection,
    setLayerVisibility,
    setExperimentalGlobeLayer,
    setDensity,
    setReduceMotion,
  } = useDashboardStore();
  const {
    simTimeS,
    status,
    connectionStatus,
    entities,
    events,
    scenarioId,
    hasStateFrame,
    reset: resetSimulation,
  } = useSimulationStore();
  const { activeScenario, setActiveScenario } = useScenarioStore();
  const { durationS, isPlaying, speed, setDuration, setPlaying, clearBookmarks } = usePlaybackStore();
  const { seek } = usePlayback();

  // Auto-navigate to Analysis when a simulation completes.
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev !== 'completed' && status === 'completed' && currentPage !== 'analysis') {
      setCurrentPage('analysis');
    }
  }, [status, currentPage, setCurrentPage]);

  const snapshot = useMemo(() => deriveHudSnapshot({
    scenarioId,
    activeScenario,
    entities,
    events,
    trackedEntityId,
    simTimeS,
    durationS,
  }), [activeScenario, durationS, entities, events, scenarioId, simTimeS, trackedEntityId]);

  const selectedTrackId = snapshot.selection.kind === 'track' ? snapshot.selection.entity?.id ?? null : null;
  const selectedAssetId = snapshot.selection.kind === 'asset' ? snapshot.selection.entity?.id ?? null : null;
  const awaitingInitialState = status !== 'idle' && !hasStateFrame;

  const navigateToPage = (page: typeof currentPage) => {
    setCurrentPage(page);

    if (page === 'monitor') {
      return;
    }

    setMode('tactical');
    setHudExpanded(false);
    setTrackedEntityId(null);

    const viewer = getViewer();
    if (viewer && activeScenario && page !== 'replay') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!viewer.isDestroyed()) {
            flyToScenario(viewer, activeScenario);
          }
        });
      });
    }
  };

  const selectTrack = (trackId: string, preset: 'wide' | 'chase' = 'wide') => {
    setTrackedEntityId(trackId);
    setFollowPreset(preset);
    setMode('follow');
    setHudExpanded(true);
  };

  const selectAsset = (assetId: string) => {
    setTrackedEntityId(assetId);
    setMode('tactical');
    setHudExpanded(true);
  };

  const handleSelectAlert = (alert: AlertRow) => {
    if (currentPage !== 'replay') {
      setCurrentPage('monitor');
      setMonitorSection('alerts');
    }

    if (alert.event.sim_time_s <= durationS) {
      seek(alert.event.sim_time_s);
    }

    if (alert.relatedAssetId && alert.event.type === 'engagement_order') {
      selectAsset(alert.relatedAssetId);
      return;
    }
    if (alert.relatedEntityId) {
      selectTrack(alert.relatedEntityId, 'wide');
      return;
    }
    if (alert.relatedAssetId) {
      selectAsset(alert.relatedAssetId);
    }
  };

  const handleSelectMarker = (marker: ReplayEventMarker) => {
    handleSelectAlert({
      id: marker.id,
      simTimeS: marker.event.sim_time_s,
      title: marker.label,
      subtitle: marker.label,
      tone: marker.tone,
      relatedEntityId:
        marker.event.type === 'sensor_track'
          ? marker.event.threat_id
          : marker.event.type === 'engagement_order'
            ? marker.event.interceptor_id
            : marker.event.interceptor_id,
      relatedAssetId:
        marker.event.type === 'sensor_track'
          ? marker.event.sensor_id
          : marker.event.type === 'engagement_order'
            ? marker.event.battery_id
            : null,
      event: marker.event,
      pkScore: null,
    });
  };

  const openMonitor = () => navigateToPage('monitor');
  const openReplay = () => navigateToPage('replay');
  const handleGlobeView = () => {
    navigateToPage('monitor');
    setMode('tactical');
    setHudExpanded(false);
    setTrackedEntityId(null);

    const viewer = getViewer();
    if (viewer && activeScenario) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!viewer.isDestroyed()) {
            flyToScenario(viewer, activeScenario);
          }
        });
      });
    }
  };

  const handleOpenArchivedReplay = (run: ArchivedRunDetail) => {
    const sessionId = `archive_${Date.now()}`;

    resetSimulation();
    clearBookmarks();
    setPlaying(false);
    setDuration(run.duration_s);
    setActiveScenario(run.scenario_definition);
    resetCamera();
    setCurrentPage('replay');
    setHudExpanded(false);

    wsClient.connect(sessionId);
    wsClient.send({
      type: 'cmd_load_definition',
      definition: run.scenario_definition,
    });

    const viewer = getViewer();
    if (viewer) {
      flyToScenario(viewer, run.scenario_definition);
    }
  };

  let pageContent: ReactNode = null;

  if (awaitingInitialState && currentPage !== 'archive') {
    pageContent = <LoadingSurface page={currentPage} status={status} />;
  } else if (currentPage === 'overview') {
    pageContent = (
      <OverviewPage
        snapshot={snapshot}
        onGoToMonitor={() => {
          setCurrentPage('monitor');
          setMonitorSection('tracks');
        }}
        onGoToReplay={() => navigateToPage('replay')}
        onSelectAlert={handleSelectAlert}
      />
    );
  } else if (currentPage === 'monitor') {
    pageContent = (
      <MonitorPage
        snapshot={snapshot}
        monitorSection={monitorSection}
        setMonitorSection={setMonitorSection}
        selectedTrackId={selectedTrackId}
        selectedAssetId={selectedAssetId}
        detailOpen={isHudExpanded}
        onSelectTrack={selectTrack}
        onSelectAsset={selectAsset}
        onSelectAlert={handleSelectAlert}
        onOpenReplay={openReplay}
        onOpenSettings={() => setCurrentPage('settings')}
        onToggleDetail={() => setHudExpanded(!isHudExpanded)}
      />
    );
  } else if (currentPage === 'replay') {
    pageContent = (
      <ReplayPage
        snapshot={snapshot}
        isPlaying={isPlaying}
        status={status}
        speed={speed}
        simTimeS={simTimeS}
        durationS={durationS}
        fraction={timeToFraction(simTimeS, durationS)}
        markers={snapshot.markers}
        showAlerts={layers.alerts}
        onSelectAlert={handleSelectAlert}
        onSelectMarker={handleSelectMarker}
        onGoToMonitor={openMonitor}
      />
    );
  } else if (currentPage === 'analysis') {
    pageContent = <AnalysisPage snapshot={snapshot} />;
  } else if (currentPage === 'archive') {
    pageContent = <RunArchivePage onOpenReplay={handleOpenArchivedReplay} />;
  } else if (currentPage === 'settings') {
    pageContent = (
      <SettingsPage
        layers={layers}
        experimentalGlobeLayers={experimentalGlobeLayers}
        density={density}
        reduceMotion={reduceMotion}
        onToggleLayer={setLayerVisibility}
        onToggleExperimentalGlobeLayer={setExperimentalGlobeLayer}
        onDensityChange={setDensity}
        onReduceMotionChange={setReduceMotion}
      />
    );
  }

  return (
    <div style={{
      ...styles.shell,
      background: reduceMotion ? 'rgba(0,0,0,0.2)' : undefined,
      fontSize: density === 'compact' ? 13 : 14,
    }}
    >
      <div style={{
        ...styles.pageWash,
        opacity:
          currentPage === 'analysis' ? 0.86
          : currentPage === 'archive' ? 0.82
          : currentPage === 'overview' ? 0.58
          : currentPage === 'settings' ? 0.82
          : 0.38,
      }}
      />

      <TopNav
        currentPage={currentPage}
        onNavigate={navigateToPage}
        onGlobeView={handleGlobeView}
        scenarioLabel={snapshot.scenarioLabel}
        sessionLabel={snapshot.sessionLabel}
        status={status}
        connectionStatus={connectionStatus}
        showGlobeView={Boolean(activeScenario)}
      />

      {pageContent}
    </div>
  );
}

function LoadingSurface({
  page,
  status,
}: {
  page: string;
  status: string;
}) {
  return (
    <div style={loadingStyles.wrap}>
      <div style={loadingStyles.card}>
        <div style={loadingStyles.kicker}>{page.toUpperCase()}_PREP</div>
        <div style={loadingStyles.title}>Hydrating scenario state…</div>
        <div style={loadingStyles.copy}>
          The shell is ready, but the first paused frame has not arrived yet. This view will unlock as soon as the scenario state is available.
        </div>
        <div style={loadingStyles.status}>STATUS // {status.toUpperCase()}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    position: 'absolute',
    inset: 0,
    zIndex: 20,
    color: '#dfe2eb',
    pointerEvents: 'none',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  pageWash: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(6,9,12,0.72) 0%, rgba(6,9,12,0.46) 28%, rgba(6,9,12,0.34) 62%, rgba(6,9,12,0.72) 100%)',
  },
};

const loadingStyles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: '96px 20px 24px 20px',
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
  },
  card: {
    width: 'min(540px, 100%)',
    padding: '28px 32px',
    border: '1px solid rgba(0, 229, 255, 0.2)',
    background: 'linear-gradient(180deg, rgba(8,12,18,0.9), rgba(8,12,18,0.72))',
    boxShadow: '0 18px 42px rgba(0, 0, 0, 0.34)',
    color: '#dfe2eb',
  },
  kicker: {
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    letterSpacing: '0.18em',
    fontSize: 11,
    color: 'rgba(0, 229, 255, 0.78)',
    marginBottom: 14,
  },
  title: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 28,
    lineHeight: 1.05,
    marginBottom: 12,
  },
  copy: {
    color: 'rgba(223, 226, 235, 0.72)',
    lineHeight: 1.6,
    fontSize: 14,
  },
  status: {
    marginTop: 18,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    letterSpacing: '0.16em',
    fontSize: 11,
    color: 'rgba(255, 198, 113, 0.9)',
  },
};
