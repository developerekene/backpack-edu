import { useState } from "react";
import { AppNotification, User } from "../../types";
import { loadCache, updateBackpackUserField } from "../utils/backpackUtils";
import { sendPushNotification } from "../../lib/pushNotifications";

export const useNotifications = (currentUser: User | null) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadCache("notifications", []),
  );

  const addNotification = (
    notifData: Omit<AppNotification, "id" | "createdAt" | "read">,
  ) => {
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
    };

    const targetUid = notifData.userId || currentUser?.id;
    if (targetUid) {
      updateBackpackUserField<AppNotification>(
        targetUid,
        "notifications",
        (list) => [newNotif, ...list],
      ).catch(console.error);
    }

    if (!notifData.userId || notifData.userId === currentUser?.id) {
      setNotifications((prev) => [newNotif, ...prev]);
      // Send push notification if granted
      sendPushNotification(newNotif.title, {
        body: newNotif.message,
        linkUrl: newNotif.linkUrl,
      });
    }
  };

  const markNotificationRead = (id: string) => {
    if (currentUser?.id) {
      updateBackpackUserField<AppNotification>(
        currentUser.id,
        "notifications",
        (list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)),
      ).catch(console.error);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllNotificationsRead = () => {
    if (currentUser?.id) {
      updateBackpackUserField<AppNotification>(
        currentUser.id,
        "notifications",
        (list) => list.map((n) => ({ ...n, read: true })),
      ).catch(console.error);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    if (currentUser?.id) {
      updateBackpackUserField<AppNotification>(
        currentUser.id,
        "notifications",
        () => [],
      ).catch(console.error);
    }
    setNotifications([]);
  };

  return {
    notifications,
    setNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  };
};
