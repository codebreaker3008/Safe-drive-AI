import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { DetectionMetrics, DrowsinessState } from '../types';
import { EAR_THRESHOLD, HEAD_PITCH_THRESHOLD } from '../constants';

interface DetectionPanelProps {
  onMetricsUpdate: (metrics: DetectionMetrics) => void;
  status: DrowsinessState;
}

// MediaPipe landmarks
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

// Helper: Calculate distance
const dist = (p1: any, p2: any) => 
  Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const calculateEAR = (landmarks: any[], indices: number[]) => {
  const p1 = landmarks[indices[0]];
  const p2 = landmarks[indices[1]];
  const p3 = landmarks[indices[2]];
  const p4 = landmarks[indices[3]];
  const p5 = landmarks[indices[4]];
  const p6 = landmarks[indices[5]];
  return (dist(p2, p6) + dist(p3, p5)) / (2.0 * dist(p1, p4));
};

// Helper: Geometric approximation for Head Pose (Pitch/Yaw)
// We compare Nose Tip (1) with Nose Bridge (168) and Chin (152) and sides of face
const calculateHeadPose = (landmarks: any[]) => {
    const noseTip = landmarks[1];
    const noseBridge = landmarks[168]; // Top of nose
    const chin = landmarks[152];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    // Pitch: Ratio of NoseToChin vs BridgeToChin. 
    // If nose tip gets closer to chin relative to full face height, head is tipping down.
    const faceVertical = dist(noseBridge, chin);
    const noseToChin = dist(noseTip, chin);
    const pitchRatio = noseToChin / faceVertical; 
    // Normalize: standard ~ 0.5. Lower means looking down.
    // We invert it so higher = looking down for easier logic
    const pitch = 0.6 - pitchRatio; 

    // Yaw: Symmetry of nose between cheeks
    const leftDist = dist(leftCheek, noseTip);
    const rightDist = dist(rightCheek, noseTip);
    const totalWidth = leftDist + rightDist;
    const yaw = Math.abs((leftDist / totalWidth) - 0.5) * 2; // 0 = Center, 1 = Fully turned

    return { pitch, yaw };
};

export const DetectionPanel: React.FC<DetectionPanelProps> = ({ onMetricsUpdate, status }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const requestRef = useRef<number | undefined>(undefined);
  const lastVideoTimeRef = useRef<number>(-1);

  // Logic State
  const eyesClosedStartTime = useRef<number | null>(null);
  const blinkTimestamps = useRef<number[]>([]);
  const wasClosedRef = useRef<boolean>(false);
  
  // Smoothing
  const earHistory = useRef<number[]>([]);

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      // @ts-ignore
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      setLandmarker(faceLandmarker);
      setWebcamRunning(true);
    };
    initMediaPipe();
    return () => { if(requestRef.current) cancelAnimationFrame(requestRef.current); }
  }, []);

  const processVideo = useCallback(() => {
    if (webcamRef.current?.video?.readyState === 4 && landmarker && canvasRef.current) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        let startTimeMs = performance.now();
        if (lastVideoTimeRef.current !== video.currentTime) {
            lastVideoTimeRef.current = video.currentTime;
            const results = landmarker.detectForVideo(video, startTimeMs);

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                
                // 1. Calculate Raw Metrics
                const leftEAR = calculateEAR(landmarks, LEFT_EYE);
                const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
                const avgEAR = (leftEAR + rightEAR) / 2;
                const { pitch, yaw } = calculateHeadPose(landmarks);

                // 2. Smooth EAR
                earHistory.current.push(avgEAR);
                if (earHistory.current.length > 10) earHistory.current.shift();
                const smoothedEAR = earHistory.current.reduce((a, b) => a + b, 0) / earHistory.current.length;

                // 3. Drawing
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    const drawingUtils = new DrawingUtils(ctx);
                    
                    // Draw Face Mesh Overlay (Tech Look)
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#3b82f620', lineWidth: 0.5 });
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#10b981', lineWidth: 2 });
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#10b981', lineWidth: 2 });
                    
                    // Draw Head Pose Indicator
                    if (pitch > HEAD_PITCH_THRESHOLD) {
                        ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
                        ctx.fillRect(0, 0, canvas.width, 20); // Top warning bar
                        ctx.font = "20px Inter";
                        ctx.fillStyle = "white";
                        ctx.fillText("HEAD TILT DETECTED", 10, 50);
                    }
                }

                // 4. Logic Processing
                const isClosed = smoothedEAR < EAR_THRESHOLD;
                let currentClosedDuration = 0;

                // Eye Closure Timer
                if (isClosed) {
                    if (eyesClosedStartTime.current === null) eyesClosedStartTime.current = performance.now();
                    currentClosedDuration = (performance.now() - eyesClosedStartTime.current) / 1000;
                    if (!wasClosedRef.current) wasClosedRef.current = true;
                } else {
                    if (wasClosedRef.current) {
                        // Blink Detected
                        blinkTimestamps.current.push(Date.now());
                        wasClosedRef.current = false;
                    }
                    eyesClosedStartTime.current = null;
                    currentClosedDuration = 0;
                }

                // Filter old blinks (keep last 60s)
                const now = Date.now();
                blinkTimestamps.current = blinkTimestamps.current.filter(t => now - t < 60000);
                const bpm = blinkTimestamps.current.length;

                // 5. Calculate Drowsiness Score (0-100)
                // Factors: Low EAR, Long Closure, Nodding (Pitch), Low Blink Rate
                let score = 0;
                
                // EAR contribution (if EAR is low but not closed, likely drowsy/squinting)
                if (smoothedEAR < 0.28) score += 30; 
                
                // Head Tilt contribution
                if (pitch > HEAD_PITCH_THRESHOLD) score += 40; 
                
                // Closure Duration (The biggest factor)
                score += currentClosedDuration * 20;

                // Blink Rate (Low bpm < 10 is suspicious)
                if (bpm < 10) score += 10;

                score = Math.min(100, Math.max(0, score));

                onMetricsUpdate({
                    ear: smoothedEAR,
                    eyesClosedDuration: currentClosedDuration,
                    blinkCount: bpm, // Total blinks in last min
                    blinksPerMinute: bpm,
                    headPitch: pitch,
                    headYaw: yaw,
                    drowsinessScore: score,
                    fps: 1000 / (performance.now() - startTimeMs)
                });
            }
        }
    }
    requestRef.current = requestAnimationFrame(processVideo);
  }, [landmarker, onMetricsUpdate]);

  useEffect(() => {
    if (webcamRunning && landmarker) requestRef.current = requestAnimationFrame(processVideo);
  }, [webcamRunning, landmarker, processVideo]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-xl group">
      {!landmarker && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-50 bg-slate-900">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="animate-pulse">Initializing Neural Network...</p>
        </div>
      )}
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        mirrored={true}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />
      
      {/* HUD Overlay */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-2">
         <div className={`px-3 py-1 rounded font-bold text-xs tracking-wider border backdrop-blur-sm ${
            status === DrowsinessState.NORMAL ? 'bg-green-500/20 border-green-500/50 text-green-400' : 
            status === DrowsinessState.WARNING ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 
            'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse'
         }`}>
            {status}
         </div>
      </div>
    </div>
  );
};
