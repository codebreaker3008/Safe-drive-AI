import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Grid, PerspectiveCamera, Text, Float } from '@react-three/drei';
import { Color, Mesh, Vector3 } from 'three';
import { CarModel } from './CarModel';
import { SimulationState, DrowsinessState } from '../types';

interface SimulationPanelProps {
  simState: SimulationState;
  drowsinessState: DrowsinessState;
}

// Procedural Traffic
const Traffic = ({ speed, count = 5 }: { speed: number, count?: number }) => {
    // Generate random start positions
    const cars = useMemo(() => Array.from({ length: count }).map((_, i) => ({
        id: i,
        lane: (Math.random() > 0.5 ? 1 : -1) * 3.5, // Left or right lane (far)
        speedOffset: Math.random() * 20 + 10,
        color: new Color().setHSL(Math.random(), 0.7, 0.5),
        startZ: -50 - (Math.random() * 100)
    })), [count]);

    return (
        <group>
            {cars.map((car) => (
                <TrafficCar key={car.id} carData={car} playerSpeed={speed} />
            ))}
        </group>
    )
}

const TrafficCar = ({ carData, playerSpeed }: { carData: any, playerSpeed: number }) => {
    const meshRef = useRef<Mesh>(null);
    
    useFrame((state, delta) => {
        if (meshRef.current) {
            // Relative speed logic
            // If car is in same direction (right side, usually) vs opposite
            // Simple logic: cars move towards camera relative to player speed
            const relativeSpeed = (playerSpeed + carData.speedOffset) * delta * 0.5;
            meshRef.current.position.z += relativeSpeed;

            // Loop traffic
            if (meshRef.current.position.z > 20) {
                meshRef.current.position.z = carData.startZ;
            }
        }
    });

    return (
        <mesh ref={meshRef} position={[carData.lane, 0.5, carData.startZ]}>
            <boxGeometry args={[1.8, 0.8, 4]} />
            <meshStandardMaterial color={carData.color} />
            <mesh position={[0, 0.5, 0]}>
                 <boxGeometry args={[1.6, 0.6, 2]} />
                 <meshStandardMaterial color="#111" />
            </mesh>
            {/* Tail lights */}
            <mesh position={[-0.6, 0.2, 2.01]}>
                <planeGeometry args={[0.4, 0.2]} />
                <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[0.6, 0.2, 2.01]}>
                <planeGeometry args={[0.4, 0.2]} />
                <meshBasicMaterial color="red" />
            </mesh>
        </mesh>
    )
}

const Road = ({ speed }: { speed: number }) => {
  const meshRef = useRef<Mesh>(null);
  useFrame((state, delta) => {
    if (meshRef.current) {
      const moveFactor = (speed / 100) * 10 * delta;
      (meshRef.current.material as any).map.offset.y -= moveFactor;
    }
  });

  const gridConfig = useMemo(() => ({
    cellSize: 1,
    cellThickness: 1,
    cellColor: new Color('#2a2a2a'),
    sectionSize: 5,
    sectionThickness: 1.5,
    sectionColor: new Color('#333'),
    fadeDistance: 60,
    fadeStrength: 2,
    infiniteGrid: true,
  }), []);

  return (
    <group position={[0, -0.01, 0]}>
       <Grid position={[0, 0, 0]} args={[20, 20]} {...gridConfig} />
       <MovingStripes speed={speed} />
       {/* Side Barriers */}
       <mesh position={[-6, 0.5, 0]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 100, 8]} />
          <meshStandardMaterial color="#555" />
       </mesh>
       <mesh position={[6, 0.5, 0]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 100, 8]} />
          <meshStandardMaterial color="#555" />
       </mesh>
    </group>
  );
};

const MovingStripes = ({ speed }: { speed: number }) => {
  const groupRef = useRef<any>(null);
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.z += (speed / 3.6) * delta; 
      if (groupRef.current.position.z > 10) groupRef.current.position.z = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={i} position={[0, 0.01, -i * 10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 4]} />
          <meshBasicMaterial color="white" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

const Speedometer = ({ speed }: { speed: number }) => (
    <group position={[0, 3.5, -5]}>
         <Text fontSize={0.5} color="#aaa" position={[0, 0.6, 0]}>SPEED</Text>
         <Text fontSize={1.5} color="white" anchorX="center" anchorY="middle">
             {Math.round(speed)}
         </Text>
         <Text fontSize={0.4} color="#aaa" position={[0, -0.6, 0]}>km/h</Text>
    </group>
);

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ simState, drowsinessState }) => {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden relative shadow-2xl border border-slate-700">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 2.5, 6]} fov={60} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={2} castShadow />
        <Environment preset="night" />
        
        <Road speed={simState.speed} />
        <Traffic speed={simState.speed} />
        <CarModel hazardsOn={simState.hazardsOn} />
        <Speedometer speed={simState.speed} />
        
        <fog attach="fog" args={['#0f172a', 10, 50]} />
      </Canvas>
      
      {/* Emergency Overlay */}
      {drowsinessState === DrowsinessState.CRITICAL && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/60 z-50 backdrop-blur-sm">
            <div className="border-4 border-red-500 bg-black/90 p-8 rounded-2xl shadow-2xl text-center animate-pulse">
                <div className="text-6xl mb-2">🚨</div>
                <h1 className="text-4xl font-bold text-red-500 tracking-widest uppercase mb-2">Emergency</h1>
                <p className="text-white text-xl font-mono">Vehicle Stopped Automatically</p>
                <div className="mt-6 bg-red-600 text-white px-6 py-2 rounded font-bold animate-bounce">
                    CALLING 911...
                </div>
            </div>
        </div>
      )}
      
      {/* Warning Overlay */}
      {drowsinessState === DrowsinessState.WARNING && (
          <div className="absolute top-10 left-0 w-full flex justify-center pointer-events-none">
              <div className="bg-amber-500 text-black font-bold px-6 py-2 rounded-full shadow-lg shadow-amber-500/20 animate-pulse">
                  ⚠ WARNING: SLOWING DOWN
              </div>
          </div>
      )}
    </div>
  );
};