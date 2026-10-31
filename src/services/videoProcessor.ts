import { BackgroundProcessor, BackgroundProcessorWrapper } from '@livekit/track-processors';
import { LocalVideoTrack } from 'livekit-client';

export type BlurLevel = 'off' | 'slight' | 'heavy';

let activeProcessor: BackgroundProcessorWrapper | null = null;
let currentBlurLevel: BlurLevel = 'off';

/**
 * Apply or remove LiveKit background blur video processor on a local video track
 */
export async function setTrackBackgroundBlur(
  track: LocalVideoTrack | undefined,
  level: BlurLevel
): Promise<boolean> {
  currentBlurLevel = level;

  if (!track) {
    return false;
  }

  try {
    if (level === 'off') {
      if (activeProcessor) {
        await track.stopProcessor();
        activeProcessor = null;
      }
      return true;
    }

    const blurRadius = level === 'heavy' ? 20 : 10;

    // If processor is already running, switch mode/radius dynamically
    if (activeProcessor) {
      await activeProcessor.switchTo({
        mode: 'background-blur',
        blurRadius,
      });
      return true;
    }

    // Instantiate LiveKit background processor
    const processor = BackgroundProcessor({
      mode: 'background-blur',
      blurRadius,
    });

    await track.setProcessor(processor);
    activeProcessor = processor;
    return true;
  } catch (err) {
    console.warn('LiveKit BackgroundProcessor warning:', err);
    // If native WebAssembly segmentation fails in specific sandbox, clear processor
    try {
      await track.stopProcessor();
    } catch {}
    activeProcessor = null;
    return false;
  }
}

export function getCurrentBlurLevel(): BlurLevel {
  return currentBlurLevel;
}
