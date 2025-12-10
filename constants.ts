export const EAR_THRESHOLD = 0.26; // Eye Aspect Ratio threshold
export const HEAD_PITCH_THRESHOLD = 0.2; // Threshold for nodding down
export const TIME_TO_WARNING = 2000; // 2 seconds
export const TIME_TO_CRITICAL = 10000; // 10 seconds
export const PROBATION_TIME = 300000; // 5 minutes (300,000 ms)

export const MAX_SPEED = 90; // km/h
export const WARNING_SPEED = 45; // km/h
export const CRITICAL_SPEED = 0; // km/h

// Scoring Weights
export const SCORE_EAR_WEIGHT = 50;
export const SCORE_BLINK_WEIGHT = 20;
export const SCORE_HEAD_WEIGHT = 30;

// Colors
export const COLOR_NORMAL = '#10b981'; // Emerald 500
export const COLOR_WARNING = '#f59e0b'; // Amber 500
export const COLOR_CRITICAL = '#ef4444'; // Red 500
export const COLOR_ACCENT = '#3b82f6'; // Blue 500