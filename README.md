# SafeDrive AI 🚗💤

**SafeDrive AI** is a hackathon-ready, real-time driver drowsiness detection system that combines computer vision with generative AI to prevent accidents before they happen.

The app uses **MediaPipe** for client-side face tracking (privacy-first) and **Google Gemini 2.5 Flash** for post-drive safety analysis. It features a fully interactive "driver's perspective" simulation that visually and audibly reacts to the driver's alertness state in real-time.

## 🌟 Features

- **Real-time Drowsiness Detection**: Tracks Eye Aspect Ratio (EAR) using MediaPipe Face Mesh directly in the browser.
- **Immersive Simulation Dashboard**: 
  - **Visuals**: A dynamic 3D road that slows down or stops based on driver state.
  - **Audio**: Web Audio API generated engine sounds, warning beeps, car horns, and emergency sirens.
  - **Dashboard**: Real-time speedometer, RPM, and hazard indicators.
- **Intelligent State Machine**:
  - **SAFE**: Eyes open, normal driving.
  - **WARNING**: Short blinks/distraction detected.
  - **CRITICAL**: Eyes closed > 3.5s. Car slows, hazards blink, horn honks.
  - **EMERGENCY**: Eyes closed > 8s. Simulated emergency call dispatch.
- **AI Safety Analyst**: Uses **Gemini 2.5 Flash** to generate a personalized driving report and safety tips based on session metrics (duration, critical events, average alertness).

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI & Vision**: 
  - `@mediapipe/tasks-vision` (Face Landmark Detection)
  - `@google/genai` (Gemini API)
- **Visualization**: Recharts, HTML5 Canvas

## 🎮 How to Demo

1. **Grant Permissions**: Allow camera access when the app loads.
2. **Start Engine**: Click the **START DRIVING** button.
3. **Simulate Scenarios**:
   - **Normal Driving**: Keep eyes open. The road moves fast, speedometer is stable.
   - **Drowsiness (Warning)**: Close eyes for ~2 seconds. Hear a warning beep.
   - **Microsleep (Critical)**: Keep eyes closed for ~4 seconds. The "car" automatically slows down, hazard lights flash, and the horn sounds to wake you up.
   - **Unresponsive (Emergency)**: Keep eyes closed for 8+ seconds. Emergency siren activates.
4. **Analysis**: Click **STOP DRIVING**. The app will use Gemini to analyze your session performance and offer a safety tip.

## 📂 Project Structure

- `App.tsx`: Main game loop, MediaPipe integration, and state management.
- `components/SimulationPanel.tsx`: The right-side visualizer (road, dashboard, indicators).
- `components/FaceMeshOverlay.tsx`: Canvas overlay drawing facial landmarks on the video feed.
- `components/AnalysisModal.tsx`: Gemini API integration for generating reports.
- `services/audioService.ts`: Synthesizer for horns and sirens (no external audio files needed).

---

*Note: This project is a demonstration of AI capabilities and is not intended to replace professional safety equipment.*

