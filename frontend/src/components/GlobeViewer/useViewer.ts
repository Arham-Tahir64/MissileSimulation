import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import {
  registerViewer,
  registerViewerReset,
  unregisterViewer,
} from '../../services/viewerRegistry';

const DEFAULT_VIEW = Cesium.Rectangle.fromDegrees(-145, -28, 110, 62);

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
    v.scene.highDynamicRange = true;
    v.scene.globe.enableLighting = true;
    v.scene.globe.showGroundAtmosphere = true;
    v.scene.globe.depthTestAgainstTerrain = true;
    v.scene.fog.enabled = true;
    v.scene.fog.density = 0.00012;

    // Day/night terminator — use sun-based scene lighting
    v.scene.light = new Cesium.SunLight();
    if (v.scene.skyAtmosphere) {
      v.scene.skyAtmosphere.show = true;
      v.scene.skyAtmosphere.atmosphereLightIntensity = 12.0;
    }
    // Show the sun disc and moon for spatial orientation
    if (v.scene.sun) v.scene.sun.show = true;
    if (v.scene.moon) v.scene.moon.show = true;

    // Clamp globe night side so dark areas stay dark
    v.scene.globe.nightFadeOutDistance = 1.0e7;
    v.scene.globe.nightFadeInDistance  = 5.0e8;

    const resetToDefaultView = () => {
      if (v.isDestroyed()) return;
      v.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      v.camera.flyTo({
        destination: DEFAULT_VIEW,
        duration: 1.6,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    };

    v.camera.setView({ destination: DEFAULT_VIEW });

    // World Terrain (3D elevation) via Ion
    Cesium.createWorldTerrainAsync().then((terrain) => {
      if (!v.isDestroyed()) v.terrainProvider = terrain;
    }).catch(() => {});

    // OSM Buildings via Ion
    Cesium.createOsmBuildingsAsync().then((buildings) => {
      if (!v.isDestroyed()) v.scene.primitives.add(buildings);
    }).catch(() => {});

    registerViewer(v);
    registerViewerReset(resetToDefaultView);
    setViewer(v);

    return () => {
      unregisterViewer();
      v.destroy();
      setViewer(null);
    };
  }, [containerId]);

  return viewer;
}
