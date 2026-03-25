import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

export function useViewer(containerId: string) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    // Cesium Ion token — replace with your own or leave empty for offline use
    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN ?? '';

    viewerRef.current = new Cesium.Viewer(containerId, {
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
      creditContainer: document.createElement('div'), // hide credits div
    });

    // Dark space-like background
    viewerRef.current.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0f');
    viewerRef.current.scene.globe.enableLighting = true;

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [containerId]);

  return viewerRef;
}
