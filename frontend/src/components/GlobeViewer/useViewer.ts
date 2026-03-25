import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { registerViewer, unregisterViewer } from '../../services/viewerRegistry';

/**
 * Initializes a Cesium Viewer inside the DOM element with the given containerId.
 * Returns the viewer instance via useState so that dependent components re-render
 * once Cesium is ready (useRef would not trigger a re-render).
 */
export function useViewer(containerId: string): Cesium.Viewer | null {
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

  useEffect(() => {
    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN ?? '';

    // Create viewer without an imageryProvider — Cesium will use Ion's Bing Maps
    // Aerial (asset 2) automatically when a valid Ion token is set.
    const v = new Cesium.Viewer(containerId, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      creditContainer: document.createElement('div'),
    });

    v.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0f');
    v.scene.globe.enableLighting = true;

    // World Terrain (3D elevation) via Ion
    Cesium.createWorldTerrainAsync().then((terrain) => {
      if (!v.isDestroyed()) v.terrainProvider = terrain;
    }).catch(() => {});

    // OSM Buildings via Ion
    Cesium.createOsmBuildingsAsync().then((buildings) => {
      if (!v.isDestroyed()) v.scene.primitives.add(buildings);
    }).catch(() => {});

    registerViewer(v);
    setViewer(v);

    return () => {
      unregisterViewer();
      v.destroy();
      setViewer(null);
    };
  }, [containerId]);

  return viewer;
}
