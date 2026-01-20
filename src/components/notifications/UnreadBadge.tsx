/**
 * UnreadBadge Component
 * Displays a red badge with unread message count
 */

interface UnreadBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
}

export function UnreadBadge({ count, size = "md" }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: "text-[10px] min-w-4 h-4 px-1",
    md: "text-xs min-w-5 h-5 px-1.5",
    lg: "text-sm min-w-6 h-6 px-2",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-red-500 text-white font-bold ${sizeClasses[size]}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
