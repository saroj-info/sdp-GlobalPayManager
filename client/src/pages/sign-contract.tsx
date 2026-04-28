import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, User, Building, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { ContractWithDerived } from "@/types/api";

export default function SignContract() {
  const [, params] = useRoute("/sign/:token");
  const [signature, setSignature] = useState("");
  const [isViewed, setIsViewed] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  const token = params?.token;

  // Redirect to login if not authenticated, with a clear message first
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (token) {
        sessionStorage.setItem('pendingSigningToken', token);
      }
      toast({
        title: "Please log in first",
        description: "You need to log in before signing the contract. Redirecting to login...",
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  }, [isAuthenticated, isLoading, token, toast]);

  // Fetch contract details using the token
  const { data: contract, isLoading: contractLoading, error } = useQuery<ContractWithDerived>({
    queryKey: ["/api/contracts/sign", token],
    enabled: !!token && isAuthenticated,
  });

  // Track when the contract is viewed
  useEffect(() => {
    if (contract && !isViewed) {
      setIsViewed(true);
      // Record contract view
      apiRequest("POST", `/api/contracts/${contract.id}/viewed`).catch(console.error);
    }
  }, [contract, isViewed]);

  // Sign contract mutation
  const signContractMutation = useMutation({
    mutationFn: async () => {
      if (!signature.trim()) {
        throw new Error("Please enter your full name as signature");
      }

      return await apiRequest("POST", `/api/contracts/${contract!.id}/sign`, {
        signature: signature.trim(),
        token
      });
    },
    onSuccess: () => {
      toast({
        title: "Contract Signed Successfully",
        description: "Your contract has been signed and recorded. Redirecting to home...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/sign", token] });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error Signing Contract",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || contractLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading contract...</p>
        </div>
      </div>
    );
  }

  // User not authenticated — show login-required screen (redirect is already queued via the effect above)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-blue-600">Login Required</CardTitle>
            <CardDescription>
              Please log in before signing your contract. Redirecting to the login page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Contract Not Found</CardTitle>
            <CardDescription>
              The contract link is invalid or has expired. Please contact your employer for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAlreadySigned = contract.signedAt;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Review & Signature</h1>
          <p className="text-gray-600">Please review the contract details below and sign if you agree to the terms</p>
        </div>

        {isAlreadySigned && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="font-semibold text-green-800">Contract Already Signed</p>
                <p className="text-green-700 text-sm">
                  This contract was signed on {new Date(contract.signedAt!).toLocaleDateString()} at {new Date(contract.signedAt!).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contract Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Worker</Label>
                    <div className="flex items-center mt-1">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">{contract.worker?.firstName} {contract.worker?.lastName}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Company</Label>
                    <div className="flex items-center mt-1">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">{contract.business?.name}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Position</Label>
                    <p className="font-medium mt-1">
                      {contract.roleTitle?.title || contract.customRoleTitle}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Employment Type</Label>
                    <Badge variant="outline" className="mt-1">
                      {contract.employmentType?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Start Date</Label>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{new Date(contract.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {contract.endDate && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">End Date</Label>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{new Date(contract.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Compensation</Label>
                  <div className="flex items-center mt-1">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">
                      {contract.currency} {parseFloat(contract.rate).toLocaleString()} per {contract.rateType}
                    </span>
                  </div>
                </div>

                {contract.jobDescription && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Job Description</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      <p className="whitespace-pre-wrap">{contract.jobDescription}</p>
                    </div>
                  </div>
                )}

                {contract.contractDocument && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Full Contract Terms</Label>
                    <div className="mt-1 p-4 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-sm">{contract.contractDocument}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Signing Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  {isAlreadySigned 
                    ? "This contract has been signed" 
                    : "Type your full name to sign this contract"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAlreadySigned ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="font-medium text-green-800">Signed by:</p>
                      <p className="text-green-700">{contract.signatureText}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Signed: {new Date(contract.signedAt!).toLocaleString()}</p>
                      {contract.signingLocation && (
                        <p>Location: {JSON.parse(contract.signingLocation).city}, {JSON.parse(contract.signingLocation).country}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="signature">Full Name *</Label>
                      <Input
                        id="signature"
                        type="text"
                        placeholder="Type your full legal name"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="mt-1"
                        data-testid="input-signature"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        By typing your name, you agree to the terms and conditions of this contract
                      </p>
                    </div>

                    <Button
                      onClick={() => signContractMutation.mutate()}
                      disabled={signContractMutation.isPending || !signature.trim()}
                      className="w-full"
                      data-testid="button-sign-contract"
                    >
                      {signContractMutation.isPending ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Signing Contract...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Sign Contract
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Your IP address and location will be recorded</p>
                      <p>• This signature is legally binding</p>
                      <p>• You will receive a confirmation email</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}