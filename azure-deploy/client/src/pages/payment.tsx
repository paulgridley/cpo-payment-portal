import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lock, CreditCard, CheckCircle, ArrowRight } from "lucide-react";

export default function PaymentPage() {
  const [paymentData, setPaymentData] = useState({
    pcnNumber: '',
    vehicleRegistration: '',
    email: '',
    penaltyAmount: 90
  });
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { toast } = useToast();

  // Extract URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pcnNumber = urlParams.get('pcn') || '';
    const vehicleReg = urlParams.get('vehicle') || ''; 
    const amount = urlParams.get('amount') || '90';
    
    setPaymentData({
      pcnNumber,
      vehicleRegistration: vehicleReg.toUpperCase(),
      email: '',
      penaltyAmount: parseFloat(amount) || 90
    });
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: field === 'email' ? value : 
               field === 'penaltyAmount' ? parseFloat(value) || 0 : value
    }));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentData.email || !acceptedTerms) {
      toast({
        title: "Required Information",
        description: "Please provide your email address and accept terms to proceed",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Submitting payment data:', paymentData);
      
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        pcnNumber: paymentData.pcnNumber,
        vehicleRegistration: paymentData.vehicleRegistration,
        email: paymentData.email,
        penaltyAmount: paymentData.penaltyAmount
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Checkout response:', data);
      
      if (data.url) {
        // Redirect the popup to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getNextPaymentDates = () => {
    const today = new Date();
    
    // For month 2: 30 days from today
    const payment2 = new Date(today);
    payment2.setDate(today.getDate() + 30);
    
    // For month 3: 60 days from today  
    const payment3 = new Date(today);
    payment3.setDate(today.getDate() + 60);
    
    return {
      payment2: payment2.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      payment3: payment3.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  };

  const { payment2, payment3 } = getNextPaymentDates();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Pay in Instalments
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Split your parking charge into 3 monthly payments
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Payment Details Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">PCN Number:</span>
                  <span className="font-mono font-medium">{paymentData.pcnNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Vehicle:</span>
                  <span className="font-mono font-medium">{paymentData.vehicleRegistration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Amount:</span>
                  <span className="font-medium">£{paymentData.penaltyAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Monthly Payment:</span>
                  <span className="font-medium text-green-600">£{(paymentData.penaltyAmount / 3).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Payment Schedule</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment 1 (Today):</span>
                  <span className="font-medium">£{(paymentData.penaltyAmount / 3).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment 2 ({payment2}):</span>
                  <span className="font-medium">£{(paymentData.penaltyAmount / 3).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment 3 ({payment3}):</span>
                  <span className="font-medium">£{(paymentData.penaltyAmount / 3).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Email Input */}
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={paymentData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Payment confirmations and receipts will be sent to this email
                </p>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms" 
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-xs text-gray-600 leading-4">
                  I agree to the Terms and Conditions and authorise recurring payments of £{(paymentData.penaltyAmount / 3).toFixed(2)} per month for 3 months (total £{paymentData.penaltyAmount.toFixed(2)}) starting today.
                </Label>
              </div>

              {/* Payment Button */}
              <Button 
                type="submit" 
                disabled={isLoading || !paymentData.email || !acceptedTerms}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Setting up payment...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Proceed to Secure Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Security Badge */}
            <div className="text-center text-xs text-gray-500">
              <div className="flex items-center justify-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Secured by Stripe - Industry leading payment security</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}