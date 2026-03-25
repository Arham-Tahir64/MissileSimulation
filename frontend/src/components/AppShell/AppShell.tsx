import { useMemo } from 'react';
import { TopNav } from './TopNav';
import { OverviewPage } from './OverviewPage';
import { MonitorPage } from './MonitorPage';
import { ReplayPage } from './ReplayPage';
import { AnalysisPage } from './AnalysisPage';
import { RunArchivePage } from './archive/RunArchivePage';
import { SettingsPage } from './SettingsPage';
import { getViewer } from '../../services/viewerRegistry';
import { useCameraStore } from '../../store/cameraStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';
import { deriveHudSnapshot, AlertRow, ReplayEventMarker } from '../HUD/hudSelectors';
import { timeToFraction } from '../../utils/timeUtils';
import { usePlayback } from '../Playback/usePlayback';
import { flyToScenario } from '../../utils/cesiumHelpers';

export function AppShell() {
  const {
    trackedEntityId,
    isHudExpanded,
    setMode,
    setTrackedEntityId,
    setFollowPreset,
    setHudExpanded,
  } = useCameraStore();
  const {
    currentPage,
    monitorSection,
    layers,
    density,
    reduceMotion,
    setCurrentPage,
    setMonitorSection,
    setLayerVisibility,
    setDensity,
    setReduceMotion,
  } = useDashboardStore();
  const { simTimeS, status, connectionStatus, entities, events, scenarioId } = useSimulationStore();
  const { activeScenario } = useScenarioStore();
  const { durationS, isPlaying, speed } = usePlaybackStore();
  const { seek } = usePlayback();

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
    });
  };

  const openMonitor = () => setCurrentPage('monitor');
  const openReplay = () => setCurrentPage('replay');
  const handleGlobeView = () => {
    setCurrentPage('monitor');
    setMode('tactical');
    setHudExpanded(false);

    const viewer = getViewer();
    if (viewer && activeScenario) {
      flyToScenario(viewer, activeScenario);
    }
  };

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
        onNavigate={setCurrentPage}
        onGlobeView={handleGlobeView}
        scenarioLabel={snapshot.scenarioLabel}
        sessionLabel={snapshot.sessionLabel}
        status={status}
        connectionStatus={connectionStatus}
        showGlobeView={Boolean(activeScenario)}
      />

      {currentPage === 'overview' && (
        <OverviewPage
          snapshot={snapshot}
          onGoToMonitor={() => {
            setCurrentPage('monitor');
            setMonitorSection('tracks');
          }}
          onGoToReplay={() => setCurrentPage('replay')}
          onSelectAlert={handleSelectAlert}
        />
      )}

      {currentPage === 'monitor' && (
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
      )}

      {currentPage === 'replay' && (
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
      )}

      {currentPage === 'analysis' && <AnalysisPage snapshot={snapshot} />}

      {currentPage === 'archive' && <RunArchivePage />}

      {currentPage === 'settings' && (
        <SettingsPage
          layers={layers}
          density={density}
          reduceMotion={reduceMotion}
          onToggleLayer={setLayerVisibility}
          onDensityChange={setDensity}
          onReduceMotionChange={setReduceMotion}
        />
      )}
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
