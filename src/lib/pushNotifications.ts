/**
 * Web Push Notifications API Utility
 * Provides standard browser-level & in-app push notification features for Backpack LMS.
 */

export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined';
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined') return 'denied';

  // Check stored virtual permission first
  const stored = localStorage.getItem('backpack_push_permission');
  if (stored === 'granted' || stored === 'denied') {
    return stored as NotificationPermission;
  }

  if ('Notification' in window) {
    try {
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
    } catch {
      // ignore iframe read errors
    }
  }

  return 'default';
};

export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    return 'denied';
  }

  try {
    if ('Notification' in window && typeof Notification.requestPermission === 'function') {
      let perm: NotificationPermission = 'default';
      try {
        const res = Notification.requestPermission();
        if (res && typeof res.then === 'function') {
          perm = await res;
        } else {
          perm = await new Promise((resolve) => {
            Notification.requestPermission((p) => resolve(p));
          });
        }
      } catch (e) {
        console.warn('Native Notification.requestPermission restricted in iframe:', e);
      }

      if (perm === 'granted') {
        localStorage.setItem('backpack_push_permission', 'granted');
        return 'granted';
      }
    }
  } catch (err) {
    console.warn('Push permission request fallback triggered:', err);
  }

  // Fallback for sandboxed iframe context: Enable virtual push notification mode
  localStorage.setItem('backpack_push_permission', 'granted');
  return 'granted';
};

export const sendPushNotification = (
  title: string,
  options?: NotificationOptions & { linkUrl?: string }
): Notification | boolean | null => {
  const perm = getNotificationPermission();
  if (perm !== 'granted') {
    return null;
  }

  // 1. Try native browser notification if allowed
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: options?.tag || 'backpack-lms-notification',
        ...options
      });

      if (options?.linkUrl) {
        notification.onclick = (e) => {
          e.preventDefault();
          window.focus();
          window.location.href = options.linkUrl!;
          notification.close();
        };
      }
      return notification;
    } catch (err) {
      console.warn('Native notification instantiation error, falling back to toast:', err);
    }
  }

  // 2. In-App Floating Toast Fallback for sandboxed preview & iframe
  createInAppPushToast(title, options?.body, options?.linkUrl);
  return true;
};

// Helper for rendered push toast in iframe
const createInAppPushToast = (title: string, body?: string, linkUrl?: string) => {
  if (typeof document === 'undefined') return;

  const containerId = 'backpack-push-toast-container';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'fixed top-4 right-4 z-[9999] flex flex-col space-y-3 max-w-sm pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto bg-slate-900 border border-indigo-500/50 text-white p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 transition-all duration-300 flex flex-col space-y-1';
  
  toast.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
        <strong class="text-sm font-bold text-white">${title}</strong>
      </div>
      <button class="text-slate-400 hover:text-white text-xs font-bold px-1">&times;</button>
    </div>
    ${body ? `<p class="text-xs text-slate-300 font-normal pl-4">${body}</p>` : ''}
    ${linkUrl ? `<a href="${linkUrl}" class="text-[11px] font-bold text-indigo-400 hover:underline pl-4 mt-1 inline-block">View Details &rarr;</a>` : ''}
  `;

  const closeBtn = toast.querySelector('button');
  if (closeBtn) {
    closeBtn.onclick = () => toast.remove();
  }

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 5000);
};

