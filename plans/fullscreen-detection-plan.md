# Relative Fullscreen Detection Plan

## Overview
The current absolute measurement strategy (`window.innerWidth === window.screen.width`) fails frequently due to Windows Display Scaling or multi-monitor setups.
This plan proposes a robust "Relative Dimension" strategy that captures the user's specific viewport size shortly after they enter fullscreen, establishing a personalized baseline.

## Implementation Details

**Target File**: `frontend/src/pages/TestPage.tsx`

### 1. Variables & State
We need to introduce refs to hold the baseline values so they persist across renders without causing unnecessary re-renders.
```typescript
const initialFullScreenWidth = useRef<number | null>(null);
const initialFullScreenHeight = useRef<number | null>(null);
const fullScreenInitializeTimer = useRef<NodeJS.Timeout | null>(null);
```

### 2. Updating `checkFullScreenState`
Replace the exact dimension matching logic with a baseline comparison.

```typescript
const checkFullScreenState = () => {
    // 1. API check
    const isAPIFullScreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
    );

    // 2. Relative check logic
    let isRelativeFullScreen = false;

    if (initialFullScreenWidth.current !== null && initialFullScreenHeight.current !== null) {
        // Allow a 2% variance for minor scaling rounding issues
        const widthRatio = window.innerWidth / initialFullScreenWidth.current;
        const heightRatio = window.innerHeight / initialFullScreenHeight.current;
        
        isRelativeFullScreen = widthRatio > 0.98 && heightRatio > 0.98;
    } else {
        // If baseline isn't set yet, we assume it's fullscreen if the API says so, 
        // to avoid instantly triggering warnings.
        isRelativeFullScreen = isAPIFullScreen;
    }

    const currentFullScreen = isAPIFullScreen || isRelativeFullScreen;
    setIsFullScreen(currentFullScreen);
    
    // ... trigger violation logic if currentFullScreen is false ...
};
```

### 3. Establishing the Baseline
Hook into the initial start or the first full-screen event to record the dimensions. This requires a slight delay (0.5s - 1.0s) so the browser UI has time to retract.

```typescript
useEffect(() => {
    // Inside the main settings block where full screen is handled...
    
    const handleFullScreenChange = () => {
        // If the browser API reports we ENTERED full screen, we capture the dimensions after a delay
        if (
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
        ) {
            // Clear any existing timer to prevent race conditions
            if (fullScreenInitializeTimer.current) {
                clearTimeout(fullScreenInitializeTimer.current);
            }
            
            // Wait 1.5 seconds to ensure the browser has fully animated into full screen
            fullScreenInitializeTimer.current = setTimeout(() => {
                initialFullScreenWidth.current = window.innerWidth;
                initialFullScreenHeight.current = window.innerHeight;
                checkFullScreenState();
            }, 1000); 
        } else {
            // API reports exit, run check immediately
            checkFullScreenState();
        }
    };
    
    // ... add event listeners ...
    
    return () => {
        if (fullScreenInitializeTimer.current) {
            clearTimeout(fullScreenInitializeTimer.current);
        }
        // ... remove listeners ...
    }
}, [...dependencies]);
```

## Why this solves the issue
Instead of expecting the width to be exactly `1920px` (which might report as `1536px` due to 125% OS scaling), the code waits for the UI to hide, records `1536`, and compares subsequent resize events against `1536`. If the user exits full screen, the browser tabs will suddenly occupy about `60px` to `100px` of vertical height, causing the `window.innerHeight` to drop to roughly `1450`, triggering the `< 0.98` threshold trap.
