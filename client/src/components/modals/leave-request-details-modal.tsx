import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, CheckCircle, XCircle, Clock, User, Building, FileText, Plane } from "lucide-react";

interface LeaveRequestDetailsModalProps {
  request: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const LEAVE_TYPE_ICONS: Record<string, any> = {
  annual: Plane,
  sick: Clock,
  personal: User,
  parental: Calendar,
  compassionate: Calendar,
  unpaid: Calendar,
};

const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function statusIcon(status: string) {
  if (status === "approved") return <CheckCircle className="h-3.5 w-3.5" />;
  if (status === "rejected") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

export function LeaveRequestDetailsModal({ request, open, onOpenChange }: LeaveRequestDetailsModalProps) {
  if (!request) return null;

  const LeaveIcon = LEAVE_TYPE_ICONS[request.leaveType] || Calendar;
  const leaveTypeLabel = String(request.leaveType || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Leave Request Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header: type + status */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <LeaveIcon className="h-3 w-3" />
              {leaveTypeLabel} Leave
            </Badge>
            <Badge className={`${STATUS_COLORS[request.status] || "bg-gray-100 text-gray-700"} text-xs flex items-center gap-1 capitalize`}>
              {statusIcon(request.status)}
              {request.status}
            </Badge>
            {request.totalDays != null && (
              <Badge variant="outline" className="text-xs">
                {request.totalDays} day{request.totalDays !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Worker + business */}
          {(request.worker || request.business) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-secondary-50 rounded-lg text-sm">
              {request.worker && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1 mb-0.5">
                    <User className="h-3 w-3" /> Worker
                  </p>
                  <p className="font-medium">
                    {request.worker.firstName} {request.worker.lastName}
                  </p>
                  {request.worker.email && (
                    <p className="text-xs text-secondary-600 mt-0.5">{request.worker.email}</p>
                  )}
                </div>
              )}
              {request.business && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1 mb-0.5">
                    <Building className="h-3 w-3" /> Business
                  </p>
                  <p className="font-medium">{request.business.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Start Date
              </p>
              <p className="font-medium mt-0.5">{fmtDate(request.startDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> End Date
              </p>
              <p className="font-medium mt-0.5">{fmtDate(request.endDate)}</p>
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 mb-1">Reason</p>
              <p className="text-sm whitespace-pre-wrap text-secondary-800 bg-gray-50 p-3 rounded border">
                {request.reason}
              </p>
            </div>
          )}

          {/* Rejection reason — only when actually rejected */}
          {request.status === "rejected" && request.rejectionReason && (
            <div className="rounded-md border border-red-200 bg-red-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-red-700 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-900 whitespace-pre-wrap">{request.rejectionReason}</p>
            </div>
          )}

          <Separator />

          {/* Audit trail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500">Submitted</p>
              <p className="font-medium mt-0.5">{fmtDateTime(request.submittedAt || request.createdAt)}</p>
            </div>
            {request.approvedAt && (
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary-500">Approved</p>
                <p className="font-medium mt-0.5">{fmtDateTime(request.approvedAt)}</p>
              </div>
            )}
            {request.rejectedAt && (
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary-500">Rejected</p>
                <p className="font-medium mt-0.5">{fmtDateTime(request.rejectedAt)}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
