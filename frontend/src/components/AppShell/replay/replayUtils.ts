import { ReplayBookmark } from '../../../store/playbackStore';
import { AlertRow, ReplayEventMarker } from '../../HUD/hudSelectors';

export type ReplayEventFilter = 'all' | 'sensor_track' | 'engagement_order' | 'event_intercept';

export interface ReplayEventCounts {
  sensorTrack: number;
  engagementOrder: number;
  intercept: number;
  successfulIntercepts: number;
  missedIntercepts: number;
}

export function filterAlerts(alerts: AlertRow[], filter: ReplayEventFilter): AlertRow[] {
  if (filter === 'all') {
    return alerts;
  }
  return alerts.filter((alert) => alert.event.type === filter);
}

export function filterMarkers(markers: ReplayEventMarker[], filter: ReplayEventFilter): ReplayEventMarker[] {
  if (filter === 'all') {
    return markers;
  }
  return markers.filter((marker) => marker.event.type === filter);
}

export function countReplayEvents(alerts: AlertRow[]): ReplayEventCounts {
  return alerts.reduce<ReplayEventCounts>((acc, alert) => {
    switch (alert.event.type) {
      case 'sensor_track':
        acc.sensorTrack += 1;
        break;
      case 'engagement_order':
        acc.engagementOrder += 1;
        break;
      case 'event_intercept':
        acc.intercept += 1;
        if (alert.event.outcome === 'success') {
          acc.successfulIntercepts += 1;
        } else {
          acc.missedIntercepts += 1;
        }
        break;
    }
    return acc;
  }, {
    sensorTrack: 0,
    engagementOrder: 0,
    intercept: 0,
    successfulIntercepts: 0,
    missedIntercepts: 0,
  });
}

export function getNearestAlerts(alerts: AlertRow[], simTimeS: number, count = 5): AlertRow[] {
  return [...alerts]
    .sort((a, b) => Math.abs(a.simTimeS - simTimeS) - Math.abs(b.simTimeS - simTimeS))
    .slice(0, count);
}

export function getActiveMomentAlert(alerts: AlertRow[], simTimeS: number): AlertRow | null {
  const thresholdS = 2;
  const candidates = alerts
    .filter((alert) => Math.abs(alert.simTimeS - simTimeS) <= thresholdS)
    .sort((a, b) => Math.abs(a.simTimeS - simTimeS) - Math.abs(b.simTimeS - simTimeS));
  return candidates[0] ?? null;
}

export function buildBookmarkId(simTimeS: number, eventId?: string | null): string {
  if (eventId) {
    return `event:${eventId}`;
  }
  return `time:${simTimeS.toFixed(2)}`;
}

export function bookmarkMatchesTime(bookmark: ReplayBookmark, simTimeS: number, epsilon = 0.75): boolean {
  return Math.abs(bookmark.simTimeS - simTimeS) <= epsilon;
}
