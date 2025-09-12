import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, X } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CheckoutSession {
  id: string;
  customer: string;
  subscription: string;
  amount_total: number;
  customer_details: {
    email: string;
    name?: string;
  };
  metadata?: {
    pcnNumber: string;
    vehicleRegistration: string;
    penaltyAmount?: string;
    monthlyAmount?: string;
    totalPayments?: string;
  };
}

export default function PaymentSuccess() {
  const [isPopup, setIsPopup] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  // Detect if we're in a popup window
  useEffect(() => {
    setIsPopup(window.opener !== null);
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  const { data: session } = useQuery({
    queryKey: ['/api/checkout-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await apiRequest('GET', `/api/checkout-session?sessionId=${sessionId}`);
      return response.json() as Promise<CheckoutSession>;
    },
    enabled: !!sessionId,
  });

  // Calculate penalty amount from session data or use default
  const penaltyAmount = session?.metadata?.penaltyAmount ? parseFloat(session.metadata.penaltyAmount) : 90;
  const monthlyAmount = (penaltyAmount / 3).toFixed(2);

  // Calculate payment dates
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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <CardContent className="p-0">
            {/* Animated green tick */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="w-14 h-14 text-green-600 animate-pulse" />
            </div>
            
            <h1 className="text-4xl font-bold text-neutral-800 mb-4">
              Payment Successful
            </h1>
            
            <p className="text-lg text-neutral-600 mb-8">
              Your payment has been processed successfully. You will receive a confirmation email shortly.
            </p>

            <div className="bg-neutral-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Payment Summary</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-neutral-600">Monthly Payment</span>
                  <span className="font-semibold text-neutral-800">£{monthlyAmount}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-neutral-600">Duration</span>
                  <span className="font-semibold text-neutral-800">3 months</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-neutral-600">Total Amount</span>
                  <span className="font-semibold text-neutral-800">£{penaltyAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-semibold text-neutral-800">
                  <span>First Payment Processed</span>
                  <span className="text-green-600">£{monthlyAmount}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-neutral-800 mb-3">Payment Schedule</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Payment 1 (Today)</span>
                    <span className="font-medium text-green-600">£{monthlyAmount} ✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Payment 2 ({payment2})</span>
                    <span className="font-medium">£{monthlyAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Payment 3 ({payment3})</span>
                    <span className="font-medium">£{monthlyAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            {isPopup ? (
              <Button 
                onClick={handleCloseWindow}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                <span>Close Window</span>
              </Button>
            ) : (
              <Link href="/">
                <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Portal</span>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}