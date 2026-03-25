import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCameraStore } from '../../store/cameraStore';
import { useSimulationStore } from '../../store/simulationStore';
import {
  CameraRigState,
  createChaseRig,
  createInitialCameraRig,
  createTacticalRig,
  smoothCameraRig,
} from '../../utils/cameraTracking';
import { isDefenseAssetEntity, isMovingRuntimeEntity } from '../../utils/entityRuntime';

interface Props {
  viewer: Cesium.Viewer | null;
}

export function CinematicCameraController({ viewer }: Props) {
  const mode = useCameraStore((s) => s.mode);
  const trackedEntityId = useCameraStore((s) => s.trackedEntityId);
  const followPreset = useCameraStore((s) => s.followPreset);
  const isAutoFollowEnabled = useCameraStore((s) => s.isAutoFollowEnabled);
  const setTrackedEntityId = useCameraStore((s) => s.setTrackedEntityId);
  const entities = useSimulationStore((s) => s.entities);

  const activeEntities = entities.filter(
    (entity) => entity.status === 'active' && isMovingRuntimeEntity(entity),
  );
  const trackedEntity =
    entities.find((entity) => entity.id === trackedEntityId)
    ?? (isAutoFollowEnabled ? activeEntities[0] : null)
    ?? null;

  const trackedEntityRef = useRef(trackedEntity);
  const modeRef = useRef(mode);
  const presetRef = useRef(followPreset);
  const rigRef = useRef<CameraRigState | null>(null);
  const inspectedAssetIdRef = useRef<string | null>(null);

  useEffect(() => {
    trackedEntityRef.current = trackedEntity;
  }, [trackedEntity]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    presetRef.current = followPreset;
  }, [followPreset]);

  useEffect(() => {
    if (!isAutoFollowEnabled || trackedEntityId || activeEntities.length === 0) return;
    setTrackedEntityId(activeEntities[0].id);
  }, [activeEntities, isAutoFollowEnabled, setTrackedEntityId, trackedEntityId]);

  useEffect(() => {
    if (!viewer) return;

    const screenController = viewer.scene.screenSpaceCameraController;
    const releaseCamera = () => {
      if (!viewer.isDestroyed()) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    };

    const onTick = () => {
      const entity = trackedEntityRef.current;
      const currentMode = modeRef.current;

      if (!entity || currentMode !== 'follow' || !isMovingRuntimeEntity(entity)) {
        rigRef.current = null;
        return;
      }

      const desiredRig = createChaseRig(entity, presetRef.current);

      rigRef.current = rigRef.current
        ? smoothCameraRig(rigRef.current, desiredRig, 0.1)
        : {
          ...createInitialCameraRig(desiredRig.target),
          heading: desiredRig.heading,
          pitch: desiredRig.pitch,
          range: desiredRig.range,
          target: desiredRig.target,
        };

      viewer.camera.lookAt(
        rigRef.current.target,
        new Cesium.HeadingPitchRange(
          rigRef.current.heading,
          rigRef.current.pitch,
          rigRef.current.range,
        ),
      );
    };

    viewer.scene.preRender.addEventListener(onTick);

    return () => {
      viewer.scene.preRender.removeEventListener(onTick);
      releaseCamera();
      screenController.enableInputs = true;
    };
  }, [viewer]);

  useEffect(() => {
    if (!viewer) return;
    if (mode !== 'tactical' || !trackedEntity || !isDefenseAssetEntity(trackedEntity)) {
      inspectedAssetIdRef.current = null;
      return;
    }
    if (inspectedAssetIdRef.current === trackedEntity.id) return;

    const rig = createTacticalRig(trackedEntity);
    inspectedAssetIdRef.current = trackedEntity.id;

    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(rig.target, 1), {
      offset: new Cesium.HeadingPitchRange(
        rig.heading,
        rig.pitch,
        rig.range,
      ),
      duration: 1.1,
    });
  }, [mode, trackedEntity, viewer]);

  useEffect(() => {
    if (!viewer) return;

    const screenController = viewer.scene.screenSpaceCameraController;
    const isFollow = mode === 'follow';
    screenController.enableInputs = !isFollow;

    if (!isFollow) {
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }

    return () => {
      if (!viewer.isDestroyed()) {
        screenController.enableInputs = true;
      }
    };
  }, [viewer, mode]);

  return null;
}
