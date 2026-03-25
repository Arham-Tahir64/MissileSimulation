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
    // Ion token — replace with your own or leave empty for offline/free basemap use
    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN ?? '';

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

    // Expose to the module-level registry so non-component code can access the viewer
    registerViewer(v);
    // Trigger re-render so EntityLayer / TrajectoryLayer receive the real viewer
    setViewer(v);

    return () => {
      unregisterViewer();
      v.destroy();
      setViewer(null);
    };
  }, [containerId]);

  return viewer;
}
