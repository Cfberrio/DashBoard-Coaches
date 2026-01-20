/**
 * NotificationsPanel Component
 * Displays a dropdown panel with unread messages grouped by parent
 * Now receives notifications as props from useCoachNotifications hook
 */

"use client";

import { useRouter } from "next/navigation";
import { CoachNotificationItem } from "@/hooks/useCoachNotifications";

interface NotificationsPanelProps {
  notifications: CoachNotificationItem[];
  onClose?: () => void;
}

export function NotificationsPanel({ notifications, onClose }: NotificationsPanelProps) {
  const router = useRouter();

  if (notifications.length === 0) {
    return (
      <div className="w-80 p-4 text-center text-gray-500">
        <p className="text-sm">No new messages</p>
      </div>
    );
  }

  const handleNotificationClick = (teamId: string, parentId: string) => {
    // Navigate to messages with URL params to pre-select team and parent
    router.push(`/messages?team=${teamId}&parent=${parentId}`);
    // Close the dropdown
    onClose?.();
  };

  const totalUnread = notifications.reduce(
    (sum, item) => sum + item.unread_count,
    0
  );

  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          New Messages {totalUnread > 0 && `(${totalUnread})`}
        </h3>
        <button
          onClick={() => router.push("/messages")}
          className="text-xs text-[#0085B7] hover:text-[#006a94] font-medium"
        >
          View all
        </button>
      </div>

      <div className="divide-y">
        {notifications.map((notification) => (
          <button
            key={`${notification.teamid}-${notification.parentid}`}
            onClick={() => handleNotificationClick(notification.teamid, notification.parentid)}
            className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {notification.parentname}
                  </span>
                  <span className="flex-shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {notification.unread_count}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {notification.teamname}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
