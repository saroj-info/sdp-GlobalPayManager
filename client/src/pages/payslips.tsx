import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPayslipSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, DollarSign, Calendar, Building2 } from "lucide-react";
import type { UploadResult } from "@uppy/core";
import type { Payslip, Worker, Business, User, Country } from "@shared/schema";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { useAuth } from "@/hooks/useAuth";

type PayslipWithDetails = Payslip & {
  worker: Worker & { country: Country };
  business: Business;
  uploadedByUser: User;
};

const payslipFormSchema = z.object({
  workerId: z.string().min(1, "Worker is required"),
  businessId: z.string().min(1, "Business is required"),
  payDate: z.string().min(1, "Pay date is required"),
  payPeriodStart: z.string().min(1, "Pay period start is required"),
  payPeriodEnd: z.string().min(1, "Pay period end is required"),
  grossTaxableWages: z.string().min(1, "Gross wages is required"),
  tax: z.string().min(1, "Tax is required"),
  netPay: z.string().min(1, "Net pay is required"),
  superannuation: z.string().optional(),
  providentFund: z.string().optional(),
  kiwiSaver: z.string().optional(),
  documentURL: z.string().optional(),
});

type PayslipFormData = z.infer<typeof payslipFormSchema>;

export default function PayslipsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedFileURL, setUploadedFileURL] = useState<string>("");
  
  const isInternal = (user as any)?.userType === 'sdp_internal';
  usePageHeader(
    "Payslips",
    isInternal ? "Upload and manage worker payslips" : "View your payslips"
  );

  const form = useForm<PayslipFormData>({
    resolver: zodResolver(payslipFormSchema),
    defaultValues: {
      payDate: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      grossTaxableWages: "",
      tax: "",
      netPay: "",
      superannuation: "0",
      providentFund: "0",
      kiwiSaver: "0",
      documentURL: "",
    },
  });

  // Fetch payslips for SDP internal users
  const { data: payslips = [], isLoading: isLoadingPayslips } = useQuery<PayslipWithDetails[]>({
    queryKey: ["/api/payslips"],
  });

  // Fetch workers for the dropdown
  const { data: workers = [] } = useQuery<(Worker & { country: Country })[]>({
    queryKey: ["/api/workers"],
  });

  // Fetch businesses for the dropdown (simulated, you'd need a real API endpoint)
  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
    enabled: false, // Disable until we have a proper endpoint
  });

  const createPayslipMutation = useMutation({
    mutationFn: async (data: PayslipFormData) => {
      return await apiRequest("/api/payslips", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payslips"] });
      toast({
        title: "Success",
        description: "Payslip uploaded and processed successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setUploadedFileURL("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload payslip",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const res = await apiRequest("POST", "/api/objects/upload");
    const response = (await res.json()) as { uploadURL: string };
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        setUploadedFileURL(uploadURL);
        form.setValue("documentURL", uploadURL);
        
        // Set ACL policy for the uploaded document
        try {
          await apiRequest("/api/payslip-documents", "PUT", { payslipURL: uploadURL });
          toast({
            title: "File uploaded",
            description: "Payslip document uploaded successfully",
          });
        } catch (error) {
          console.error("Error setting document ACL:", error);
        }
      }
    }
  };

  const onSubmit = (data: PayslipFormData) => {
    if (!uploadedFileURL) {
      toast({
        title: "Missing document",
        description: "Please upload a payslip document first",
        variant: "destructive",
      });
      return;
    }
    
    createPayslipMutation.mutate({
      ...data,
      documentURL: uploadedFileURL,
    });
  };

  const formatCurrency = (amount: string, currency: string = "USD") => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (isLoadingPayslips) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Payslip
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload New Payslip</DialogTitle>
              <DialogDescription>
                Upload a payslip document and extract the financial data for analytics
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Worker</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select worker" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workers.map((worker) => (
                              <SelectItem key={worker.id} value={worker.id}>
                                {worker.firstName} {worker.lastName} ({worker.country.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="businessId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select business" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businesses.map((business) => (
                              <SelectItem key={business.id} value={business.id}>
                                {business.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Payslip Document</Label>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonClassName="w-full mt-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {uploadedFileURL ? "Change Document" : "Upload Payslip Document"}
                      </div>
                    </ObjectUploader>
                    {uploadedFileURL && (
                      <p className="text-sm text-green-600 mt-1">Document uploaded successfully</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="payDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="payPeriodStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period Start</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="payPeriodEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period End</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grossTaxableWages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Taxable Wages</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="netPay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Pay</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="superannuation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Superannuation (AU)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="providentFund"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provident Fund (SG/IN)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="kiwiSaver"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KiwiSaver (NZ)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPayslipMutation.isPending || !uploadedFileURL}
                  >
                    {createPayslipMutation.isPending ? "Uploading..." : "Upload Payslip"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payslips</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payslips.length}</div>
            <p className="text-xs text-muted-foreground">Processed this period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(payslips.map(p => p.worker.country.id)).size}
            </div>
            <p className="text-xs text-muted-foreground">Active countries</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payslips.filter(p => {
                const payDate = new Date(p.payDate);
                const now = new Date();
                return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Payslips processed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payslips
                  .filter(p => {
                    const payDate = new Date(p.payDate);
                    const now = new Date();
                    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum, p) => sum + (parseFloat(p.netPay) || 0), 0)
                  .toString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payslips</CardTitle>
          <CardDescription>
            All uploaded payslips across your accessible countries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Pay Date</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Gross Wages</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Uploaded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No payslips uploaded yet. Upload your first payslip to get started.
                  </TableCell>
                </TableRow>
              ) : (
                payslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">
                      {payslip.worker.firstName} {payslip.worker.lastName}
                    </TableCell>
                    <TableCell>{payslip.business.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payslip.worker.country.code}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(payslip.payDate)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(payslip.payPeriodStart)} - {formatDate(payslip.payPeriodEnd)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payslip.grossTaxableWages, payslip.worker.country.currency)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payslip.tax, payslip.worker.country.currency)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payslip.netPay, payslip.worker.country.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payslip.uploadedByUser.firstName || payslip.uploadedByUser.email}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}