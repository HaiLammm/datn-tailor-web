"use client";

import { useMemo } from 'react';
import { MasterGeometry } from '@/types/geometry';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useAutoFit = (geometry: MasterGeometry | null, padding: number = 50): ViewBox => {
  return useMemo(() => {
    if (!geometry || !geometry.parts || geometry.parts.length === 0) {
      return { x: 0, y: 0, width: 1000, height: 1000 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    let hasPoints = false;

    geometry.parts.forEach(part => {
      part.paths.forEach(path => {
        path.segments.forEach(seg => {
          hasPoints = true;
          // Check end point
          minX = Math.min(minX, seg.to.x);
          minY = Math.min(minY, seg.to.y);
          maxX = Math.max(maxX, seg.to.x);
          maxY = Math.max(maxY, seg.to.y);
          
          // Check control points
          if (seg.control) {
            minX = Math.min(minX, seg.control.cp1.x);
            minY = Math.min(minY, seg.control.cp1.y);
            maxX = Math.max(maxX, seg.control.cp1.x);
            maxY = Math.max(maxY, seg.control.cp1.y);
            
            if (seg.control.cp2) {
              minX = Math.min(minX, seg.control.cp2.x);
              minY = Math.min(minY, seg.control.cp2.y);
              maxX = Math.max(maxX, seg.control.cp2.x);
              maxY = Math.max(maxY, seg.control.cp2.y);
            }
          }
        });
      });
    });

    if (!hasPoints || minX === Infinity) {
      return { x: 0, y: 0, width: 1000, height: 1000 };
    }

    const width = maxX - minX;
    const height = maxY - minY;
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: width + (padding * 2),
      height: height + (padding * 2)
    };

  }, [geometry, padding]);
};
