import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { EntityState } from '../../types/entity';
import { geoToCartesian, entityColor } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
  entities: EntityState[];
}

export function EntityLayer({ viewer, entities }: Props) {
  const entityMapRef = useRef<Map<string, Cesium.Entity>>(new Map());

  useEffect(() => {
    if (!viewer) return;

    const seenIds = new Set<string>();

    for (const state of entities) {
      seenIds.add(state.id);
      const position = geoToCartesian(state.position);
      const color = entityColor(state.type);

      const existing = entityMapRef.current.get(state.id);
      if (existing) {
        (existing.position as Cesium.ConstantPositionProperty).setValue(position);
        if (existing.point) {
          (existing.point.color as Cesium.ConstantProperty).setValue(
            state.status === 'intercepted' || state.status === 'destroyed'
              ? Cesium.Color.GRAY
              : color
          );
        }
      } else {
        const entity = viewer.entities.add({
          id: state.id,
          name: state.id,
          position,
          point: {
            pixelSize: state.type === 'sensor' ? 8 : 12,
            color,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.4),
            outlineWidth: 1,
          },
          label: {
            text: state.id,
            font: '11px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(14, -6),
            show: true,
          },
        });
        entityMapRef.current.set(state.id, entity);
      }
    }

    // Remove stale entities no longer in state
    for (const [id, entity] of entityMapRef.current) {
      if (!seenIds.has(id)) {
        viewer.entities.remove(entity);
        entityMapRef.current.delete(id);
      }
    }
  }, [viewer, entities]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const entity of entityMapRef.current.values()) {
        viewer.entities.remove(entity);
      }
      entityMapRef.current.clear();
    };
  }, [viewer]);

  return null;
}
