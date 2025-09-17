import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Car, Lock, CreditCard, CheckCircle, ArrowRight, Phone, HelpCircle, Home, FileText, RotateCcw, Users } from "lucide-react";

export default function PaymentPortal() {
  const [formData, setFormData] = useState({
    pcnNumber: '',
    vehicleRegistration: '',
    email: '',
    penaltyAmount: 90
  });
  
  // Extract URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pcnNumber = urlParams.get('pcn') || urlParams.get('pcnNumber');
    const vehicleReg = urlParams.get('vehicle') || urlParams.get('vehicleRegistration'); 
    const amount = urlParams.get('amount') || urlParams.get('penaltyAmount');
    const email = urlParams.get('email');
    
    if (pcnNumber || vehicleReg || amount || email) {
      setFormData(prev => ({
        ...prev,
        ...(pcnNumber && { pcnNumber }),
        ...(vehicleReg && { vehicleRegistration: vehicleReg.toUpperCase() }),
        ...(amount && { penaltyAmount: parseFloat(amount) || 90 }),
        ...(email && { email })
      }));
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'vehicleRegistration' 
        ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') 
        : field === 'penaltyAmount' 
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pcnNumber || !formData.vehicleRegistration || !formData.penaltyAmount || formData.penaltyAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in PCN number, vehicle registration and penalty amount",
        variant: "destructive",
      });
      return;
    }

    // Open payment popup with URL parameters
    const params = new URLSearchParams({
      pcn: formData.pcnNumber,
      vehicle: formData.vehicleRegistration,
      amount: formData.penaltyAmount.toString()
    });
    
    const popupUrl = `/payment?${params.toString()}`;
    
    // Open popup window
    const popup = window.open(
      popupUrl,
      'payment-popup',
      'width=600,height=700,scrollbars=yes,resizable=yes,status=yes'
    );
    
    if (!popup) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to continue with payment",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-gray-100">
      {/* Header with Navigation */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">CPO</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-black">CIVIL</div>
                <div className="text-sm font-semibold text-black">PARKING</div>
                <div className="text-sm font-semibold text-black">OFFICE</div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-black flex items-center space-x-1">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </a>
              <a href="#" className="text-gray-700 hover:text-black">Pay a PCN</a>
              <a href="#" className="text-gray-700 hover:text-black">Appeal a PCN</a>
              <a href="#" className="text-gray-700 hover:text-black">Transfer Liability</a>
              <a href="#" className="text-gray-700 hover:text-black">FAQs</a>
              <a href="/tools" className="text-blue-600 hover:text-blue-800 font-medium">Integration Tools</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Your Parking Charge</h1>
              <p className="text-gray-300">Pay or Appeal Your Parking Charge Securely Online</p>
            </div>
            <Button 
              onClick={handleFormSubmit}
              disabled={!formData.pcnNumber || !formData.vehicleRegistration || !formData.penaltyAmount || formData.penaltyAmount <= 0}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2"
            >
              Pay Now
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-medium text-gray-900 mb-2">
                Appeal or Pay Your Parking Charge Notice Online
              </h2>
              <p className="text-gray-600 mb-8">
                Enter your details and choose an option below to proceed
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking Charge Number
                  </Label>
                  <Input
                    data-testid="input-pcn-number"
                    type="text"
                    placeholder="Enter your parking charge number"
                    value={formData.pcnNumber}
                    onChange={(e) => handleInputChange('pcnNumber', e.target.value)}
                    className="w-full"
                    required
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Registration
                  </Label>
                  <Input
                    data-testid="input-vehicle-registration"
                    type="text"
                    placeholder="Enter your vehicle registration"
                    value={formData.vehicleRegistration}
                    onChange={(e) => handleInputChange('vehicleRegistration', e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
              </div>



              <div className="mb-8">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Penalty Amount (£)
                </Label>
                <Input
                  data-testid="input-penalty-amount"
                  type="number"
                  placeholder="90"
                  value={formData.penaltyAmount}
                  onChange={(e) => handleInputChange('penaltyAmount', e.target.value)}
                  className="w-full max-w-xs"
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mb-6">
                <Button 
                  data-testid="button-appeal"
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3"
                  type="button"
                >
                  Appeal
                </Button>
                <Button 
                  data-testid="button-transfer"
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3"
                  type="button"
                >
                  Transfer of Liability
                </Button>
                <Button 
                  data-testid="button-pay-online"
                  onClick={handleFormSubmit}
                  disabled={!formData.pcnNumber || !formData.vehicleRegistration || !formData.penaltyAmount || formData.penaltyAmount <= 0}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3"
                  type="button"
                >
                  Pay Online
                </Button>
              </div>



              {/* Pay in Installments - Main CTA */}
              <form onSubmit={handleFormSubmit}>
                <Button 
                  data-testid="button-pay-installments"
                  type="submit" 
                  disabled={!formData.pcnNumber || !formData.vehicleRegistration || !formData.penaltyAmount || formData.penaltyAmount <= 0}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 font-medium"
                >
                  Pay in Instalments
                </Button>
              </form>
            </div>
          </div>

          {/* Help Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <span>Help</span>
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Q: Where is my PCN Reference No.?</h4>
                  <p className="text-sm text-gray-600">
                    A: You will find this at the top of the PCN letter you received in the post.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Q: Can I pay by post?</h4>
                  <p className="text-sm text-gray-600">
                    A: Paying online is the fastest and most reliable method. To pay by post follow the instructions on the back of your PCN.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Payment Schedule</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Payment 1 (Today):</span>
                      <span>£{(formData.penaltyAmount / 3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment 2 ({payment2}):</span>
                      <span>£{(formData.penaltyAmount / 3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment 3 ({payment3}):</span>
                      <span>£{(formData.penaltyAmount / 3).toFixed(2)}</span>
                    </div>
                    <hr className="border-blue-200" />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>£{formData.penaltyAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-600">&copy; 2025 Civil Parking Office. All rights reserved.</p>
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-600 hover:text-gray-900">Privacy Policy</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Terms of Service</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
