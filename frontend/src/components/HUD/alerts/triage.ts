import { AlertRow } from '../hudSelectors';

export type AlertFilter = 'all' | 'priority' | 'tracking' | 'engagement' | 'resolution';
export type AlertBucket = 'critical' | 'engagement' | 'tracking' | 'resolution';

export interface AlertFilterOption {
  id: AlertFilter;
  label: string;
  count: number;
}

export interface AlertSection {
  id: AlertBucket;
  title: string;
  description: string;
  tone: AlertRow['tone'];
  alerts: AlertRow[];
}

function byMostRecent(a: AlertRow, b: AlertRow): number {
  if (b.simTimeS !== a.simTimeS) {
    return b.simTimeS - a.simTimeS;
  }
  return a.id.localeCompare(b.id);
}

export function getAlertBucket(alert: AlertRow): AlertBucket {
  if (alert.event.type === 'event_intercept') {
    return alert.event.outcome === 'miss' ? 'critical' : 'resolution';
  }

  if (alert.event.type === 'engagement_order') {
    return 'engagement';
  }

  return 'tracking';
}

export function getAlertSignalLabel(alert: AlertRow): string {
  if (alert.event.type === 'sensor_track') {
    return 'TRACK';
  }

  if (alert.event.type === 'engagement_order') {
    return 'ASSIGN';
  }

  return alert.event.outcome === 'success' ? 'RESOLVED' : 'ESCALATE';
}

export function getAlertContextLabel(alert: AlertRow): string {
  if (alert.event.type === 'sensor_track') {
    return `${alert.event.sensor_id} -> ${alert.event.threat_id}`;
  }

  if (alert.event.type === 'engagement_order') {
    return `${alert.event.battery_id} -> ${alert.event.interceptor_id}`;
  }

  return `${alert.event.interceptor_id} -> ${alert.event.threat_id}`;
}

export function buildAlertFilters(alerts: AlertRow[]): AlertFilterOption[] {
  const counts = {
    all: alerts.length,
    priority: 0,
    tracking: 0,
    engagement: 0,
    resolution: 0,
  };

  for (const alert of alerts) {
    const bucket = getAlertBucket(alert);
    if (bucket === 'critical') {
      counts.priority += 1;
    }
    if (bucket === 'tracking') {
      counts.tracking += 1;
    }
    if (bucket === 'engagement') {
      counts.engagement += 1;
    }
    if (bucket === 'resolution') {
      counts.resolution += 1;
    }
  }

  return [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'priority', label: 'Priority', count: counts.priority },
    { id: 'tracking', label: 'Tracks', count: counts.tracking },
    { id: 'engagement', label: 'Engage', count: counts.engagement },
    { id: 'resolution', label: 'Resolved', count: counts.resolution },
  ];
}

export function buildAlertSections(alerts: AlertRow[], filter: AlertFilter): AlertSection[] {
  const critical = alerts.filter((alert) => getAlertBucket(alert) === 'critical').sort(byMostRecent);
  const engagement = alerts.filter((alert) => getAlertBucket(alert) === 'engagement').sort(byMostRecent);
  const tracking = alerts.filter((alert) => getAlertBucket(alert) === 'tracking').sort(byMostRecent);
  const resolution = alerts.filter((alert) => getAlertBucket(alert) === 'resolution').sort(byMostRecent);

  const sections: AlertSection[] = [];

  if (filter === 'priority') {
    if (critical.length > 0) {
      sections.push({
        id: 'critical',
        title: 'Needs Attention',
        description: 'Unresolved or missed intercept events.',
        tone: 'red',
        alerts: critical,
      });
    }
    return sections;
  }

  if (filter === 'tracking') {
    if (tracking.length > 0) {
      sections.push({
        id: 'tracking',
        title: 'Sensor Track',
        description: 'Objects newly acquired by the sensor network.',
        tone: 'amber',
        alerts: tracking,
      });
    }
    return sections;
  }

  if (filter === 'engagement') {
    if (engagement.length > 0) {
      sections.push({
        id: 'engagement',
        title: 'Engagement Orders',
        description: 'Battery assignment and interceptor launches.',
        tone: 'cyan',
        alerts: engagement,
      });
    }
    return sections;
  }

  if (filter === 'resolution') {
    if (resolution.length > 0) {
      sections.push({
        id: 'resolution',
        title: 'Resolved Events',
        description: 'Successful fictional intercept outcomes.',
        tone: 'cyan',
        alerts: resolution,
      });
    }
    return sections;
  }

  if (critical.length > 0) {
    sections.push({
      id: 'critical',
      title: 'Needs Attention',
      description: 'Missed intercepts and unresolved high-priority moments.',
      tone: 'red',
      alerts: critical,
    });
  }

  if (engagement.length > 0) {
    sections.push({
      id: 'engagement',
      title: 'Engagement Flow',
      description: 'Battery assignment and interceptor launch activity.',
      tone: 'cyan',
      alerts: engagement,
    });
  }

  if (tracking.length > 0) {
    sections.push({
      id: 'tracking',
      title: 'Sensor Activity',
      description: 'Newly acquired or refreshed tracks from the sensor mesh.',
      tone: 'amber',
      alerts: tracking,
    });
  }

  if (resolution.length > 0) {
    sections.push({
      id: 'resolution',
      title: 'Resolved',
      description: 'Successful intercept outcomes and cleared events.',
      tone: 'cyan',
      alerts: resolution,
    });
  }

  return sections;
}
