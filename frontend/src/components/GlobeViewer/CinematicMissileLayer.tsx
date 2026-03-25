import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useCameraStore } from '../../store/cameraStore';
import { useSimulationStore } from '../../store/simulationStore';
import { geoToCartesian } from '../../utils/cesiumHelpers';
import { isMovingRuntimeEntity } from '../../utils/entityRuntime';

interface Props {
  viewer: Cesium.Viewer | null;
}

const missileCanvasCache = new Map<string, HTMLCanvasElement>();
let plumeCanvas: HTMLCanvasElement | null = null;

function getCinematicMissileCanvas(type: string): HTMLCanvasElement {
  if (missileCanvasCache.has(type)) return missileCanvasCache.get(type)!;

  const canvas = document.createElement('canvas');
  canvas.width = 84;
  canvas.height = 260;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(42, 0);
  ctx.lineTo(58, 34);
  ctx.lineTo(54, 34);
  ctx.lineTo(54, 146);
  ctx.lineTo(82, 214);
  ctx.lineTo(56, 194);
  ctx.lineTo(48, 232);
  ctx.lineTo(42, 260);
  ctx.lineTo(36, 232);
  ctx.lineTo(28, 194);
  ctx.lineTo(2, 214);
  ctx.lineTo(30, 146);
  ctx.lineTo(30, 34);
  ctx.lineTo(26, 34);
  ctx.closePath();
  ctx.fill();

  if (type === 'interceptor') {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(34, 70, 16, 66);
  }

  missileCanvasCache.set(type, canvas);
  return canvas;
}

function getPlumeCanvas(): HTMLCanvasElement {
  if (plumeCanvas) return plumeCanvas;

  plumeCanvas = document.createElement('canvas');
  plumeCanvas.width = 120;
  plumeCanvas.height = 220;
  const ctx = plumeCanvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(60, 0, 60, 220);
  gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.2, 'rgba(255,222,155,0.86)');
  gradient.addColorStop(0.5, 'rgba(255,153,0,0.46)');
  gradient.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.lineTo(110, 220);
  ctx.lineTo(10, 220);
  ctx.closePath();
  ctx.fill();

  return plumeCanvas;
}

function setPosition(
  property: Cesium.PositionProperty | undefined,
  value: Cesium.Cartesian3,
): Cesium.ConstantPositionProperty {
  if (property && 'setValue' in property && typeof property.setValue === 'function') {
    property.setValue(value);
    return property as Cesium.ConstantPositionProperty;
  }
  return new Cesium.ConstantPositionProperty(value);
}

function setConstantValue<T>(
  property: Cesium.Property | undefined,
  value: T,
): Cesium.ConstantProperty {
  if (property && 'setValue' in property && typeof property.setValue === 'function') {
    property.setValue(value);
    return property as Cesium.ConstantProperty;
  }
  return new Cesium.ConstantProperty(value);
}

export function CinematicMissileLayer({ viewer }: Props) {
  const mode = useCameraStore((s) => s.mode);
  const trackedEntityId = useCameraStore((s) => s.trackedEntityId);
  const followPreset = useCameraStore((s) => s.followPreset);
  const entities = useSimulationStore((s) => s.entities);

  const trackedEntity = entities.find((entity) => entity.id === trackedEntityId) ?? null;

  const trackedEntityRef = useRef(trackedEntity);
  const modeRef = useRef(mode);
  const presetRef = useRef(followPreset);
  const smoothedPositionRef = useRef<Cesium.Cartesian3 | null>(null);
  const missileRef = useRef<Cesium.Entity | null>(null);
  const plumeRef = useRef<Cesium.Entity | null>(null);

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
    if (!viewer) return;

    const ensureEntities = () => {
      if (!missileRef.current) {
        missileRef.current = viewer.entities.add({
          id: 'cinematic_track_missile',
          position: Cesium.Cartesian3.ZERO,
          billboard: {
            image: getCinematicMissileCanvas('interceptor'),
            width: 72,
            height: 220,
            color: Cesium.Color.fromCssColorString('#dff8ff'),
            show: false,
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: 'TRACK_LOCK',
            font: '600 14px monospace',
            fillColor: Cesium.Color.fromCssColorString('#00e5ff'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            pixelOffset: new Cesium.Cartesian2(0, -146),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: false,
          },
        });
      }

      if (!plumeRef.current) {
        plumeRef.current = viewer.entities.add({
          id: 'cinematic_track_plume',
          position: Cesium.Cartesian3.ZERO,
          billboard: {
            image: getPlumeCanvas(),
            width: 92,
            height: 220,
            color: Cesium.Color.WHITE.withAlpha(0.92),
            show: false,
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    };

    const onTick = () => {
      ensureEntities();

      const tracked = trackedEntityRef.current;
      const isVisible = modeRef.current === 'follow'
        && presetRef.current === 'chase'
        && tracked
        && isMovingRuntimeEntity(tracked)
        && tracked.status === 'active';

      if (!missileRef.current || !plumeRef.current) return;

      missileRef.current.billboard!.show = setConstantValue(
        missileRef.current.billboard!.show,
        Boolean(isVisible),
      );
      missileRef.current.label!.show = setConstantValue(
        missileRef.current.label!.show,
        Boolean(isVisible),
      );
      plumeRef.current.billboard!.show = setConstantValue(
        plumeRef.current.billboard!.show,
        Boolean(isVisible),
      );

      if (!isVisible || !tracked) {
        smoothedPositionRef.current = null;
        return;
      }

      const desiredPosition = geoToCartesian(tracked.position);
      smoothedPositionRef.current = smoothedPositionRef.current
        ? Cesium.Cartesian3.lerp(
          smoothedPositionRef.current,
          desiredPosition,
          0.18,
          new Cesium.Cartesian3(),
        )
        : desiredPosition;

      const rotation = -Cesium.Math.toRadians(tracked.heading_deg);
      const scale = Cesium.Math.clamp(0.9 + tracked.velocity_ms / 1_600, 1, 2.25);

      missileRef.current.position = setPosition(
        missileRef.current.position,
        smoothedPositionRef.current,
      );
      plumeRef.current.position = setPosition(
        plumeRef.current.position,
        smoothedPositionRef.current,
      );

      missileRef.current.billboard!.image = setConstantValue(
        missileRef.current.billboard!.image,
        getCinematicMissileCanvas(tracked.type),
      );
      missileRef.current.billboard!.rotation = setConstantValue(
        missileRef.current.billboard!.rotation,
        rotation,
      );
      missileRef.current.billboard!.scale = setConstantValue(
        missileRef.current.billboard!.scale,
        scale,
      );
      plumeRef.current.billboard!.rotation = setConstantValue(
        plumeRef.current.billboard!.rotation,
        rotation,
      );
      plumeRef.current.billboard!.scale = setConstantValue(
        plumeRef.current.billboard!.scale,
        scale * 1.1,
      );
      plumeRef.current.billboard!.color = setConstantValue(
        plumeRef.current.billboard!.color,
        tracked.type === 'interceptor'
          ? Cesium.Color.fromCssColorString('#ffd799').withAlpha(0.82)
          : Cesium.Color.fromCssColorString('#ffb46b').withAlpha(0.72),
      );
      missileRef.current.label!.text = setConstantValue(
        missileRef.current.label!.text,
        `${tracked.id} // IN_FLIGHT`,
      );
    };

    viewer.scene.preRender.addEventListener(onTick);

    return () => {
      viewer.scene.preRender.removeEventListener(onTick);
      if (!viewer.isDestroyed()) {
        if (missileRef.current) viewer.entities.remove(missileRef.current);
        if (plumeRef.current) viewer.entities.remove(plumeRef.current);
      }
      missileRef.current = null;
      plumeRef.current = null;
      smoothedPositionRef.current = null;
    };
  }, [viewer]);

  return null;
}
