import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Calendar, Clock, FileText, ExternalLink, CheckCircle, AlertCircle, Download } from "lucide-react";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  issued: "bg-blue-100 text-blue-800",
  sent: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function InvoiceView() {
  const { token } = useParams<{ token: string }>();

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ["/api/invoice/view", token],
    queryFn: async () => {
      const res = await fetch(`/api/invoice/view/${token}`);
      if (!res.ok) throw new Error("Invoice not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h2>
            <p className="text-gray-600">
              This invoice link may have expired or the invoice does not exist.
              Please contact your billing team for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const formattedInvoiceDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const formattedDueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const categoryLabels: Record<string, string> = {
    sdp_services: "SDP Employment Services Invoice",
    customer_billing: "Client Billing Invoice",
    business_to_client: "Business → Host Client Invoice",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-800 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SDP Global Pay</h1>
            <p className="text-blue-200 text-sm mt-1">Employment Services</p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-sm">Invoice</p>
            <p className="text-xl font-semibold">{invoice.invoiceNumber}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Status Banner */}
        <div className={`rounded-lg p-4 flex items-center gap-3 ${
          isPaid ? "bg-green-50 border border-green-200" :
          isOverdue ? "bg-red-50 border border-red-200" :
          "bg-blue-50 border border-blue-200"
        }`}>
          {isPaid
            ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            : <AlertCircle className={`h-5 w-5 flex-shrink-0 ${isOverdue ? "text-red-600" : "text-blue-600"}`} />
          }
          <div className="flex-1">
            <p className={`font-medium ${isPaid ? "text-green-800" : isOverdue ? "text-red-800" : "text-blue-800"}`}>
              {isPaid ? "This invoice has been paid." :
               isOverdue ? "This invoice is overdue. Please arrange payment as soon as possible." :
               "Payment is due by " + formattedDueDate + "."}
            </p>
          </div>
          <Badge className={statusColors[invoice.status] || statusColors.draft}>
            {invoice.status?.replace("_", " ").toUpperCase() || "DRAFT"}
          </Badge>
        </div>

        {/* Invoice Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{categoryLabels[invoice.invoiceCategory] || "Invoice"}</p>
                <h2 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-3xl font-bold text-blue-800">
                  {invoice.currency} {parseFloat(invoice.totalAmount || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Invoice Date: <strong>{formattedInvoiceDate}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Due Date: <strong className={isOverdue ? "text-red-600" : ""}>{formattedDueDate}</strong></span>
              </div>
              {invoice.fromBusiness && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>From: <strong>{invoice.fromBusiness.name}</strong></span>
                </div>
              )}
              {invoice.toBusiness && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>To: <strong>{invoice.toBusiness.name}</strong></span>
                </div>
              )}
            </div>

            {invoice.description && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                <p className="font-medium text-gray-700 mb-1">Description</p>
                <p>{invoice.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Line Items
              </h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">Unit Price</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="border-b border-gray-100">
                        <td className="py-3 text-gray-700">{item.description}</td>
                        <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="py-3 text-right text-gray-600">
                          {invoice.currency} {parseFloat(item.unitPrice || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {invoice.currency} {parseFloat(item.amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={3} className="pt-3 text-right font-semibold text-gray-900">Total</td>
                      <td className="pt-3 text-right font-bold text-blue-800 text-lg">
                        {invoice.currency} {parseFloat(invoice.totalAmount || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timesheet Details */}
        {invoice.timesheetDetails && (
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timesheet Summary
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {invoice.timesheetDetails.workerName && (
                  <div>
                    <p className="text-gray-500">Worker</p>
                    <p className="font-medium text-gray-900">{invoice.timesheetDetails.workerName}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Period</p>
                  <p className="font-medium text-gray-900">
                    {invoice.timesheetDetails.periodStart && new Date(invoice.timesheetDetails.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" — "}
                    {invoice.timesheetDetails.periodEnd && new Date(invoice.timesheetDetails.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                {invoice.timesheetDetails.totalHours && (
                  <div>
                    <p className="text-gray-500">Total Hours</p>
                    <p className="font-medium text-gray-900">{invoice.timesheetDetails.totalHours}h</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Timesheet Status</p>
                  <p className="font-medium text-green-700 capitalize">{invoice.timesheetDetails.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Actions */}
        {!isPaid && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Payment Options</h3>
              <p className="text-blue-700 text-sm mb-4">
                {invoice.stripePaymentLink
                  ? "Pay securely online using the button below. No account required."
                  : "Please arrange payment through your SDP Global Pay dashboard or contact billing@sdpglobalpay.com."}
              </p>
              <div className="flex flex-wrap gap-3">
                {invoice.stripePaymentLink && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => window.open(invoice.stripePaymentLink, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Pay Now via Stripe
                  </Button>
                )}
                {!invoice.stripePaymentLink && (
                  <Button
                    variant="outline"
                    className="border-blue-300 text-blue-800"
                    onClick={() => window.location.href = "mailto:billing@sdpglobalpay.com?subject=Payment for Invoice " + invoice.invoiceNumber}
                  >
                    Contact Billing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download PDF */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="gap-2 text-gray-600"
            onClick={() => generateInvoicePdf(invoice)}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Footer */}
        <Separator />
        <div className="text-center text-sm text-gray-500 pb-8">
          <p className="font-medium text-gray-700">SDP Global Pay</p>
          <p>billing@sdpglobalpay.com</p>
          <p className="mt-2">© 2025 SDP Global Pay. Making global contracting and employment easy.</p>
        </div>
      </div>
    </div>
  );
}
