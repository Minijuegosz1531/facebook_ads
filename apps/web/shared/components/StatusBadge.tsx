import type { CampaignStatus } from "@/shared/types/api";

const STYLES: Record<CampaignStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      data-testid="status-badge"
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
