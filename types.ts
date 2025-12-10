import React from 'react';

export enum DrowsinessState {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface SimulationState {
  speed: number;
  hazardsOn: boolean;
  honking: boolean;
  distanceTraveled: number;
}

export interface DetectionMetrics {
  ear: number; // Eye Aspect Ratio
  eyesClosedDuration: number; // Seconds
  blinkCount: number;
  blinksPerMinute: number;
  headPitch: number; // 0 = Center, > 0.1 = Looking Down (Nodding)
  headYaw: number; // 0 = Center, > 0.1 = Looking Left/Right
  drowsinessScore: number; // 0-100
  fps: number;
}

export interface EmergencyLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'alert' | 'critical' | 'ai';
}

// Global type augmentation for React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      cylinderGeometry: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      fog: any;
    }
  }
}
