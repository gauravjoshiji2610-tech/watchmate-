/**
 * Cross-browser fullscreen helper functions.
 * Supports standard W3C, WebKit (Safari / iOS), and Firefox APIs.
 */

export function isFullscreenAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(
    document.fullscreenEnabled ||
    (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
  );
}

export function isCurrentlyFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
}

export async function requestElementFullscreen(element: HTMLElement): Promise<void> {
  if (!element) return;

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if ((element as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
      await (element as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
    }
  } catch (err) {
    // Fullscreen request rejected or unsupported
  }
}

export async function exitElementFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
      await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
    }
  } catch (err) {
    // Exit fullscreen rejected
  }
}
