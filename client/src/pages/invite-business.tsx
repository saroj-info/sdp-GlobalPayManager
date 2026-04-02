import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Send, Building2, Mail, MessageSquare, Calendar, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";

const inviteBusinessSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().email("Please enter a valid email address"),
  contractorMessage: z.string().optional(),
});

type InviteBusinessForm = z.infer<typeof inviteBusinessSchema>;

export default function InviteBusiness() {
  const { toast } = useToast();
  const [form, setForm] = useState<InviteBusinessForm>({
    businessName: "",
    businessEmail: "",
    contractorMessage: "",
  });

  usePageHeader("Invite Business", "Invite new businesses to join SDP Global Pay and expand your network");

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: businessInvitations = [] } = useQuery({
    queryKey: ["/api/business-invitations"],
    enabled: (user as any)?.userType === 'worker',
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: InviteBusinessForm) => {
      const response = await apiRequest("POST", "/api/business-invitations", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Business invitation has been sent successfully. They will receive an email with instructions to join SDP Global Pay.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business-invitations"] });
      setForm({
        businessName: "",
        businessEmail: "",
        contractorMessage: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Invitation",
        description: error.message || "Failed to send business invitation. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFormChange = (field: keyof InviteBusinessForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = inviteBusinessSchema.parse(form);
      createInvitationMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="text-blue-600 border-blue-200"><Clock className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'registered':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Registered</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Business Invitation
            </CardTitle>
            <CardDescription>
              Invite a business to join SDP Global Pay. They'll receive an email with instructions to create their account and connect with you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Business Name
                  </Label>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => handleFormChange('businessName', e.target.value)}
                    placeholder="Enter business name"
                    required
                    data-testid="input-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Business Email
                  </Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={form.businessEmail}
                    onChange={(e) => handleFormChange('businessEmail', e.target.value)}
                    placeholder="business@company.com"
                    required
                    data-testid="input-business-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractorMessage" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Personal Message (Optional)
                </Label>
                <Textarea
                  id="contractorMessage"
                  value={form.contractorMessage}
                  onChange={(e) => handleFormChange('contractorMessage', e.target.value)}
                  placeholder="Add a personal message to explain why you're recommending SDP Global Pay..."
                  rows={4}
                  data-testid="input-contractor-message"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full md:w-auto flex items-center gap-2"
                disabled={createInvitationMutation.isPending}
                data-testid="button-send-invitation"
              >
                <Send className="h-4 w-4" />
                {createInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Invitation History
            </CardTitle>
            <CardDescription>
              Track the status of your previously sent business invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {businessInvitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No invitations sent yet</p>
                <p className="text-sm">Start by inviting your first business above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {businessInvitations.map((invitation: any) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{invitation.businessName}</h3>
                        {getStatusBadge(invitation.status)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {invitation.businessEmail}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Sent {formatDate(invitation.createdAt)}
                        </div>
                        {invitation.contractorMessage && (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-3 w-3 mt-0.5" />
                            <span className="text-xs italic">"{invitation.contractorMessage}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {invitation.status === 'sent' && (
                      <div className="text-xs text-gray-500">
                        <div>Expires {formatDate(invitation.expiresAt)}</div>
                      </div>
                    )}
                    {invitation.status === 'registered' && invitation.registeredAt && (
                      <div className="text-xs text-green-600">
                        <div>Registered {formatDate(invitation.registeredAt)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Why Invite Businesses to SDP Global Pay?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h4 className="font-semibold mb-2">For Your Business Partners:</h4>
                <ul className="space-y-1">
                  <li>• Global compliance and payroll management</li>
                  <li>• Streamlined contractor payments</li>
                  <li>• Automated contract generation</li>
                  <li>• Real-time timesheet approval</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">For You:</h4>
                <ul className="space-y-1">
                  <li>• Easier collaboration and payments</li>
                  <li>• Professional contract management</li>
                  <li>• Transparent timesheet tracking</li>
                  <li>• Stay connected with potential opportunities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}