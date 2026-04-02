import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarIcon, Plus, Clock, Check, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type LeaveRequestData = {
  leaveType: 'annual' | 'sick' | 'personal' | 'parental' | 'compassionate' | 'unpaid';
  startDate: Date;
  endDate: Date;
  reason: string;
};

export default function LeavePage() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();

  usePageHeader("Leave Requests", "Manage your leave requests and time off");

  const { data: workerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/workers/profile"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const { data: leaveRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/leave-requests"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const form = useForm<LeaveRequestData>({
    defaultValues: {
      leaveType: 'annual',
      startDate: new Date(),
      endDate: new Date(),
      reason: '',
    }
  });

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: LeaveRequestData) => {
      const totalDays = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return await apiRequest('/api/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          totalDays,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      setShowForm(false);
      form.reset();
      toast({
        title: "Success",
        description: "Leave request submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.userType !== 'worker') {
    return null;
  }

  const isEligibleForLeave = workerProfile?.workerType === 'employee' || 
    (workerProfile?.workerType === 'contractor' && workerProfile?.businessStructure === 'contractor_of_record');

  if (!isEligibleForLeave) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Leave Requests Not Available</h3>
                <p className="text-gray-600">
                  Leave requests are only available for employees and contractors of record.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = (data: LeaveRequestData) => {
    createLeaveRequestMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">My Leave Requests</h2>
          <Button 
            onClick={() => setShowForm(true)}
            data-testid="button-new-leave-request"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Leave Request
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>New Leave Request</CardTitle>
              <CardDescription>
                Submit a new leave request for approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leaveType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leave Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-leave-type">
                                <SelectValue placeholder="Select leave type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="annual">Annual Leave</SelectItem>
                              <SelectItem value="sick">Sick Leave</SelectItem>
                              <SelectItem value="personal">Personal Leave</SelectItem>
                              <SelectItem value="parental">Parental Leave</SelectItem>
                              <SelectItem value="compassionate">Compassionate Leave</SelectItem>
                              <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div></div>
                    
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-start-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-end-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < form.watch('startDate')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Leave</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Please provide a reason for your leave request..."
                            data-testid="input-leave-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      data-testid="button-cancel-leave"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLeaveRequestMutation.isPending}
                      data-testid="button-submit-leave"
                    >
                      {createLeaveRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {requestsLoading ? (
            <div className="text-center py-8">Loading leave requests...</div>
          ) : leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Leave Requests</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't submitted any leave requests yet.
                  </p>
                  <Button onClick={() => setShowForm(true)} data-testid="button-first-leave-request">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Leave Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            leaveRequests.map((request: any) => (
              <Card key={request.id} data-testid={`card-leave-request-${request.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {request.leaveType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Leave
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>{format(new Date(request.startDate), "PPP")}</strong> to <strong>{format(new Date(request.endDate), "PPP")}</strong>
                        <span className="ml-2">({request.totalDays} day{request.totalDays !== 1 ? 's' : ''})</span>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-gray-800">{request.reason}</p>
                      )}
                      {request.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">
                            <strong>Rejection Reason:</strong> {request.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>Submitted: {format(new Date(request.submittedAt), "MMM dd, yyyy")}</div>
                      {request.approvedAt && (
                        <div>Approved: {format(new Date(request.approvedAt), "MMM dd, yyyy")}</div>
                      )}
                      {request.rejectedAt && (
                        <div>Rejected: {format(new Date(request.rejectedAt), "MMM dd, yyyy")}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}