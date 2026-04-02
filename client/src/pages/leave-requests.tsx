import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, XCircle, Clock, User, Plane } from 'lucide-react';
import { usePageHeader } from '@/contexts/AuthenticatedLayoutContext';

export default function LeaveRequests() {
  usePageHeader("Leave Requests", "Review and manage employee leave requests");
  
  const { data: leaveRequests = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/leave-requests'],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'annual':
        return <Plane className="w-4 h-4" />;
      case 'sick':
        return <Clock className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading leave requests...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

          {leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
                <p className="text-gray-600">Workers haven't submitted any leave requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {leaveRequests.map((request: any) => (
                <Card key={request.id} className="border-l-4 border-l-primary-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-500" />
                        <div>
                          <CardTitle className="text-lg">
                            {request.worker?.firstName} {request.worker?.lastName}
                          </CardTitle>
                          <p className="text-sm text-gray-600">{request.worker?.email}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status}</span>
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        {getLeaveTypeIcon(request.leaveType)}
                        <span className="text-sm capitalize font-medium">{request.leaveType} Leave</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{calculateDays(request.startDate, request.endDate)} days</span>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Reason</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.reason}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex space-x-3">
                        <Button variant="default" size="sm">
                          Approve
                        </Button>
                        <Button variant="outline" size="sm">
                          Reject
                        </Button>
                      </div>
                    )}

                    {request.status === 'rejected' && request.rejectionReason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                        <h5 className="font-medium text-red-800 mb-1">Rejection Reason</h5>
                        <p className="text-sm text-red-700">{request.rejectionReason}</p>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Requested: {new Date(request.createdAt).toLocaleString()}
                      {request.approvedAt && (
                        <span className="ml-4">Approved: {new Date(request.approvedAt).toLocaleString()}</span>
                      )}
                      {request.rejectedAt && (
                        <span className="ml-4">Rejected: {new Date(request.rejectedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}