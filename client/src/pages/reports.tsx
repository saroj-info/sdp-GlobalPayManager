import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Mail, 
  FileSpreadsheet, 
  FileText, 
  Calendar,
  Building2,
  Globe,
  BarChart3,
  Clock,
  Receipt,
  DollarSign
} from "lucide-react";
import { User, Country, Business } from "@shared/schema";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Email form schema
const emailFormSchema = z.object({
  to: z.string().min(1, "Recipients required").refine(
    (value) => {
      const emails = value.split(',').map(email => email.trim());
      return emails.every(email => z.string().email().safeParse(email).success);
    },
    { message: "Please enter valid email addresses separated by commas" }
  ),
  subject: z.string().optional(),
  message: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

// Report interfaces
interface SdpInvoiceReport {
  id: string;
  invoiceNumber: string;
  sdpEntity: string;
  businessName: string;
  serviceType: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  gstVatAmount: string;
  totalAmount: string;
  currency: string;
  status: string;
}

interface TimesheetReport {
  id: string;
  workerName: string;
  businessName: string;
  periodStart: string;
  periodEnd: string;
  totalHours: string;
  status: string;
  submittedAt: string;
}

interface PayslipReport {
  id: string;
  workerName: string;
  businessName: string;
  sdpEntity: string;
  payDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossTaxableWages: string;
  tax: string;
  netPay: string;
}

export default function Reports() {
  const [selectedTab, setSelectedTab] = useState("sdp-invoices");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<any[]>([]);
  const [currentReportType, setCurrentReportType] = useState("");
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<string>("all");

  const { user } = useAuth() as { user: User | undefined; isLoading: boolean; isAuthenticated: boolean; authReady: boolean; error: any };
  const { toast } = useToast();

  usePageHeader("Reports", "Generate and export comprehensive reports for SDP operations");

  // Only allow SDP internal users
  if (user?.userType !== 'sdp_internal') {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">Access Denied</h1>
          <p className="text-secondary-600">Only SDP internal users can access reports.</p>
        </div>
      </div>
    );
  }

  // Get countries and businesses for filters
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
  });

  // Report queries - for now returning empty arrays until backend is implemented
  const { data: sdpInvoiceReports = [], isLoading: loadingInvoices } = useQuery<SdpInvoiceReport[]>({
    queryKey: ["/api/reports/sdp-invoices", dateFrom, dateTo, selectedCountry, selectedBusiness],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      if (selectedCountry !== 'all') params.append('countryId', selectedCountry);
      if (selectedBusiness !== 'all') params.append('businessId', selectedBusiness);
      
      const response = await apiRequest("GET", `/api/reports/sdp-invoices?${params.toString()}`);
      return response.json();
    },
    enabled: selectedTab === "sdp-invoices",
  });

  const { data: timesheetReports = [], isLoading: loadingTimesheets } = useQuery<TimesheetReport[]>({
    queryKey: ["/api/reports/timesheets", dateFrom, dateTo, selectedCountry, selectedBusiness],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      if (selectedCountry !== 'all') params.append('countryId', selectedCountry);
      if (selectedBusiness !== 'all') params.append('businessId', selectedBusiness);
      
      const response = await apiRequest("GET", `/api/reports/timesheets?${params.toString()}`);
      return response.json();
    },
    enabled: selectedTab === "timesheets",
  });

  const { data: payslipReports = [], isLoading: loadingPayslips } = useQuery<PayslipReport[]>({
    queryKey: ["/api/reports/payslips", dateFrom, dateTo, selectedCountry, selectedBusiness],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      if (selectedCountry !== 'all') params.append('countryId', selectedCountry);
      if (selectedBusiness !== 'all') params.append('businessId', selectedBusiness);
      
      const response = await apiRequest("GET", `/api/reports/payslips?${params.toString()}`);
      return response.json();
    },
    enabled: selectedTab === "payslips",
  });

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: async ({ reportType, format, emailData }: { reportType: string; format: string; emailData: EmailFormData }) => {
      const response = await apiRequest("POST", "/api/reports/email", {
        type: reportType,
        format,
        filters: {
          from: dateFrom,
          to: dateTo,
          countryId: selectedCountry !== 'all' ? selectedCountry : undefined,
          businessId: selectedBusiness !== 'all' ? selectedBusiness : undefined,
        },
        to: emailData.to.split(',').map(email => email.trim()),
        subject: emailData.subject,
        message: emailData.message,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Sent",
        description: "Report has been emailed successfully.",
      });
      setEmailDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send report via email",
        variant: "destructive",
      });
    },
  });

  // Export functions
  const exportToExcel = (data: any[], reportType: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType);
    
    const fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({
      title: "Export Successful",
      description: `Report exported as ${fileName}`,
    });
  };

  const exportToPDF = (data: any[], reportType: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, 20, 20);
    
    // Add date range if filters applied
    if (dateFrom || dateTo) {
      doc.setFontSize(10);
      doc.text(`Period: ${dateFrom || 'Beginning'} to ${dateTo || 'Today'}`, 20, 30);
    }

    // Prepare table data
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => item[header] || ''));

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: dateFrom || dateTo ? 40 : 30,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
      },
    });

    const fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Export Successful",
      description: `Report exported as ${fileName}`,
    });
  };

  const openEmailDialog = (data: any[], reportType: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to email",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentReportData(data);
    setCurrentReportType(reportType);
    setEmailDialogOpen(true);
  };

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      subject: `${currentReportType.charAt(0).toUpperCase() + currentReportType.slice(1)} Report`,
      message: "Please find the attached report.",
    },
  });

  return (
    <div className="p-6">

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3" data-testid="tabs-report-types">
              <TabsTrigger value="sdp-invoices" data-testid="tab-sdp-invoices">
                <Receipt className="w-4 h-4 mr-2" />
                SDP Invoices
              </TabsTrigger>
              <TabsTrigger value="timesheets" data-testid="tab-timesheets">
                <Clock className="w-4 h-4 mr-2" />
                Timesheets Received
              </TabsTrigger>
              <TabsTrigger value="payslips" data-testid="tab-payslips">
                <DollarSign className="w-4 h-4 mr-2" />
                Payslip Details
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>Apply filters to customize your report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="date-from">From Date</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to">To Date</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      data-testid="input-date-to"
                    />
                  </div>
                  <div>
                    <Label>SDP Entity</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger data-testid="select-country">
                        <SelectValue placeholder="Select SDP Entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country.id} value={country.id}>
                            {country.companyName} ({country.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Business</Label>
                    <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                      <SelectTrigger data-testid="select-business">
                        <SelectValue placeholder="Select Business" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Businesses</SelectItem>
                        {businesses.map((business) => (
                          <SelectItem key={business.id} value={business.id}>
                            {business.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SDP Invoices Report */}
            <TabsContent value="sdp-invoices">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>SDP Invoice Report</CardTitle>
                    <CardDescription>
                      Invoices issued by SDP entities to businesses
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToExcel(sdpInvoiceReports, 'sdp-invoices')}
                      data-testid="button-export-excel-invoices"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPDF(sdpInvoiceReports, 'sdp-invoices')}
                      data-testid="button-export-pdf-invoices"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailDialog(sdpInvoiceReports, 'sdp-invoices')}
                      data-testid="button-email-invoices"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingInvoices ? (
                    <div className="text-center py-8">Loading report data...</div>
                  ) : sdpInvoiceReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>SDP Entity</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Invoice Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>GST/VAT</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sdpInvoiceReports.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{invoice.sdpEntity}</TableCell>
                            <TableCell>{invoice.businessName}</TableCell>
                            <TableCell>{invoice.serviceType}</TableCell>
                            <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell>{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</TableCell>
                            <TableCell>{invoice.currency} {parseFloat(invoice.gstVatAmount).toFixed(2)}</TableCell>
                            <TableCell className="font-medium">{invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoice data found for the selected criteria
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timesheets Report */}
            <TabsContent value="timesheets">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Timesheets Received Report</CardTitle>
                    <CardDescription>
                      All timesheets submitted by workers
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToExcel(timesheetReports, 'timesheets')}
                      data-testid="button-export-excel-timesheets"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPDF(timesheetReports, 'timesheets')}
                      data-testid="button-export-pdf-timesheets"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailDialog(timesheetReports, 'timesheets')}
                      data-testid="button-email-timesheets"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingTimesheets ? (
                    <div className="text-center py-8">Loading report data...</div>
                  ) : timesheetReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Worker</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>Period Start</TableHead>
                          <TableHead>Period End</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timesheetReports.map((timesheet) => (
                          <TableRow key={timesheet.id}>
                            <TableCell className="font-medium">{timesheet.workerName}</TableCell>
                            <TableCell>{timesheet.businessName}</TableCell>
                            <TableCell>{new Date(timesheet.periodStart).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(timesheet.periodEnd).toLocaleDateString()}</TableCell>
                            <TableCell>{parseFloat(timesheet.totalHours).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={timesheet.status === 'approved' ? 'default' : 'secondary'}>
                                {timesheet.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(timesheet.submittedAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No timesheet data found for the selected criteria
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payslips Report */}
            <TabsContent value="payslips">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Payslip Details Report</CardTitle>
                    <CardDescription>
                      Payslips processed by SDP entities
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToExcel(payslipReports, 'payslips')}
                      data-testid="button-export-excel-payslips"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPDF(payslipReports, 'payslips')}
                      data-testid="button-export-pdf-payslips"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailDialog(payslipReports, 'payslips')}
                      data-testid="button-email-payslips"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingPayslips ? (
                    <div className="text-center py-8">Loading report data...</div>
                  ) : payslipReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Worker</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>SDP Entity</TableHead>
                          <TableHead>Pay Date</TableHead>
                          <TableHead>Period Start</TableHead>
                          <TableHead>Period End</TableHead>
                          <TableHead>Gross Wages</TableHead>
                          <TableHead>Tax</TableHead>
                          <TableHead>Net Pay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payslipReports.map((payslip) => (
                          <TableRow key={payslip.id}>
                            <TableCell className="font-medium">{payslip.workerName}</TableCell>
                            <TableCell>{payslip.businessName}</TableCell>
                            <TableCell>{payslip.sdpEntity}</TableCell>
                            <TableCell>{new Date(payslip.payDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(payslip.payPeriodStart).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(payslip.payPeriodEnd).toLocaleDateString()}</TableCell>
                            <TableCell>{parseFloat(payslip.grossTaxableWages).toFixed(2)}</TableCell>
                            <TableCell>{parseFloat(payslip.tax).toFixed(2)}</TableCell>
                            <TableCell className="font-medium">{parseFloat(payslip.netPay).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No payslip data found for the selected criteria
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Report</DialogTitle>
            <DialogDescription>
              Send the {currentReportType} report to email recipients
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
              emailMutation.mutate({
                reportType: currentReportType,
                format: 'xlsx',
                emailData: data,
              });
            })} className="space-y-4">
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipients</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@example.com, another@example.com"
                        {...field}
                        data-testid="input-email-recipients"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Report subject..." {...field} data-testid="input-email-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional message..." {...field} data-testid="input-email-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailDialogOpen(false)}
                  data-testid="button-cancel-email"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={emailMutation.isPending}
                  data-testid="button-send-email"
                >
                  {emailMutation.isPending ? "Sending..." : "Send Report"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}