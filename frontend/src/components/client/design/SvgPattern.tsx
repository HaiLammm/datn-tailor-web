"use client";

import React, { useMemo } from 'react';
import { Path, Segment } from '@/types/geometry';

interface SvgPatternProps {
  paths: Path[];
  className?: string;
  fill?: string;
  stroke?: string;
}

const SvgPath: React.FC<{ path: Path; defaultFill: string; defaultStroke: string }> = ({ path, defaultFill, defaultStroke }) => {
  const d = useMemo(() => {
    let cmd = path.segments.map(seg => {
      const { to, type, control } = seg;
      switch (type) {
        case 'move':
          return `M ${to.x} ${to.y}`;
        case 'line':
          return `L ${to.x} ${to.y}`;
        case 'curve':
          if (control) {
             if (control.cp2) {
               return `C ${control.cp1.x} ${control.cp1.y}, ${control.cp2.x} ${control.cp2.y}, ${to.x} ${to.y}`;
             }
             return `Q ${control.cp1.x} ${control.cp1.y}, ${to.x} ${to.y}`;
          }
          return `L ${to.x} ${to.y}`;
        default:
          return '';
      }
    }).join(' ');

    if (path.closed) cmd += ' Z';
    return cmd;
  }, [path]);

  return (
    <path
      d={d}
      data-morph-id={path.id}
      fill={path.fill || undefined}
      stroke={path.stroke || undefined}
      strokeWidth="1.5"
      vectorEffect="non-scaling-stroke"
      className={!path.fill && !path.stroke ? `${defaultFill} ${defaultStroke}` : undefined}
    />
  );
};

export const SvgPattern: React.FC<SvgPatternProps> = ({ 
  paths, 
  className,
  fill = "fill-silk-ivory",
  stroke = "stroke-indigo-600"
}) => {
  return (
    <g className={className}>
      {paths.map((path) => (
        <SvgPath key={path.id} path={path} defaultFill={fill} defaultStroke={stroke} />
      ))}
    </g>
  );
};
