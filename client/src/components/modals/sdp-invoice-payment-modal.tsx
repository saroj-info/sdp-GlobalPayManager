// SDP Invoice Payment Modal using Stripe integration (referenced from Stripe blueprint)
import { useState, useEffect } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CreditCard } from 'lucide-react';

// Initialize Stripe outside of component render
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface SdpInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  currency: string;
  status: string;
}

interface SdpInvoicePaymentModalProps {
  invoice: SdpInvoice;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentForm = ({ invoice, onSuccess, onClose }: { invoice: SdpInvoice; onSuccess: () => void; onClose: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm the payment on our backend
        await apiRequest("POST", `/api/sdp-invoices/${invoice.id}/confirm-payment`, {
          paymentIntentId: paymentIntent.id
        });

        toast({
          title: "Payment Successful",
          description: `Payment for invoice ${invoice.invoiceNumber} completed successfully!`,
        });
        
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An error occurred while processing payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100">Invoice Details</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Invoice: {invoice.invoiceNumber}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Amount: {invoice.currency} {invoice.totalAmount}
          </p>
        </div>
        
        <div className="border rounded-lg p-4">
          <PaymentElement />
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-cancel-payment"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="flex-1"
          data-testid="button-confirm-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay {invoice.currency} {invoice.totalAmount}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export function SdpInvoicePaymentModal({ invoice, onClose, onSuccess }: SdpInvoicePaymentModalProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      setError("Payment processing is not configured");
      setLoading(false);
      return;
    }

    // Create payment intent when modal opens
    const createPaymentIntent = async () => {
      try {
        const response = await apiRequest("POST", `/api/sdp-invoices/${invoice.id}/create-payment-intent`);
        const data = await response.json();
        
        if (response.ok) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.message || "Failed to create payment intent");
        }
      } catch (error: any) {
        setError(error.message || "Failed to connect to payment service");
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [invoice.id]);

  if (!stripePromise) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" data-testid="modal-payment-error">
          <DialogHeader>
            <DialogTitle>Payment Not Available</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Payment processing is not configured. Please contact support.
            </p>
          </div>
          <Button onClick={onClose} className="w-full" data-testid="button-close-error">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-sdp-invoice-payment">
        <DialogHeader>
          <DialogTitle>Pay Invoice {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2 text-muted-foreground">Setting up payment...</span>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={onClose} variant="outline" data-testid="button-close-error">
              Close
            </Button>
          </div>
        ) : clientSecret ? (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
              }
            }}
          >
            <PaymentForm 
              invoice={invoice}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}