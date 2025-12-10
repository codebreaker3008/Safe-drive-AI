import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import '../types';

interface CarModelProps {
  hazardsOn: boolean;
}

export const CarModel: React.FC<CarModelProps> = ({ hazardsOn }) => {
  const chassisRef = useRef<Mesh>(null);
  const blinkerRef = useRef<number>(0);
  const lightRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (chassisRef.current) {
      // Subtle vibration based on engine running
      chassisRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 20) * 0.005;
    }

    if (hazardsOn && lightRef.current) {
      blinkerRef.current += delta * 10;
      const opacity = Math.sin(blinkerRef.current) > 0 ? 1 : 0.1;
      (lightRef.current.material as any).opacity = opacity;
      (lightRef.current.material as any).emissiveIntensity = opacity * 2;
    } else if (lightRef.current) {
      (lightRef.current.material as any).opacity = 0.1;
      (lightRef.current.material as any).emissiveIntensity = 0;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Car Body */}
      <mesh ref={chassisRef} position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.8, 0.8, 4]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 1.2, -0.2]} castShadow>
        <boxGeometry args={[1.6, 0.7, 2.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.1} roughness={0.1} transparent opacity={0.9} />
      </mesh>

      {/* Wheels */}
      <mesh position={[-0.9, 0.3, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.9, 0.3, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.9, 0.3, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.9, 0.3, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Hazard Lights (Rear) */}
      <mesh ref={lightRef} position={[0, 0.7, 2.01]}>
        <planeGeometry args={[1.6, 0.2]} />
        <meshBasicMaterial color="#ef4444" transparent />
      </mesh>
    </group>
  );
};
