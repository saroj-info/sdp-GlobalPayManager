import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SelectSdpInvoiceType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface MarkAsPaidModalProps {
  invoice: SelectSdpInvoiceType;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAsPaidModal({ invoice, onClose, onSuccess }: MarkAsPaidModalProps) {
  const [paymentAmount, setPaymentAmount] = useState(invoice.totalAmount.toString());
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = parseFloat(paymentAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid payment amount",
          variant: "destructive",
        });
        return;
      }

      if (amount > parseFloat(invoice.totalAmount)) {
        toast({
          title: "Amount too large", 
          description: "Payment amount cannot exceed invoice total",
          variant: "destructive",
        });
        return;
      }

      await apiRequest("POST", `/api/sdp-invoices/${invoice.id}/mark-paid`, {
        paidAmount: amount,
        paidDate: paymentDate.toISOString(),
      });

      toast({
        title: "Payment recorded",
        description: amount === parseFloat(invoice.totalAmount)
          ? "Invoice marked as fully paid" 
          : `Partial payment of $${amount.toFixed(2)} recorded`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPartialPayment = parseFloat(paymentAmount) < parseFloat(invoice.totalAmount);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-mark-as-paid">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="font-medium">Invoice #{invoice.invoiceNumber}</div>
              <div>Total Amount: ${parseFloat(invoice.totalAmount).toFixed(2)}</div>
              <div>Status: {invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Unknown'}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={parseFloat(invoice.totalAmount)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                  data-testid="input-payment-amount"
                  required
                />
              </div>
              {isPartialPayment && (
                <p className="text-sm text-orange-600">
                  Partial payment: ${(parseFloat(invoice.totalAmount) - parseFloat(paymentAmount)).toFixed(2)} remaining
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                    data-testid="button-select-payment-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    initialFocus
                    data-testid="calendar-payment-date"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
                data-testid="button-confirm-payment"
              >
                {isSubmitting ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}