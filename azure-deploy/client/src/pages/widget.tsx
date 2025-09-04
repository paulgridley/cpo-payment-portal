import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Widget() {
  const [detectedData, setDetectedData] = useState({
    pcnNumber: '',
    vehicleRegistration: '',
    amount: 90
  });

  useEffect(() => {
    // Auto-detect form fields when widget loads
    detectFormFields();
  }, []);

  const detectFormFields = () => {
    const data = {
      pcnNumber: '',
      vehicleRegistration: '',
      amount: 90
    };

    // Enhanced field detection patterns
    const fieldPatterns = {
      pcn: [
        'input[name*="pcn" i]',
        'input[id*="pcn" i]', 
        'input[placeholder*="pcn" i]',
        'input[placeholder*="parking charge" i]',
        'input[placeholder*="penalty" i]',
        'input[name*="reference" i]',
        'input[name*="notice" i]'
      ],
      vehicle: [
        'input[name*="vehicle" i]',
        'input[id*="vehicle" i]',
        'input[placeholder*="vehicle" i]',
        'input[placeholder*="registration" i]',
        'input[name*="reg" i]',
        'input[id*="reg" i]',
        'input[placeholder*="reg" i]'
      ],
      amount: [
        'input[name*="amount" i]',
        'input[id*="amount" i]',
        'input[placeholder*="amount" i]',
        'input[name*="charge" i]',
        'input[name*="penalty" i]',
        'input[name*="fine" i]'
      ]
    };

    // Try each pattern for PCN
    for (const selector of fieldPatterns.pcn) {
      const field = document.querySelector(selector) as HTMLInputElement;
      if (field?.value?.trim()) {
        data.pcnNumber = field.value.trim();
        break;
      }
    }

    // Try each pattern for vehicle
    for (const selector of fieldPatterns.vehicle) {
      const field = document.querySelector(selector) as HTMLInputElement;
      if (field?.value?.trim()) {
        data.vehicleRegistration = field.value.trim().toUpperCase();
        break;
      }
    }

    // Try each pattern for amount
    for (const selector of fieldPatterns.amount) {
      const field = document.querySelector(selector) as HTMLInputElement;
      if (field?.value?.trim()) {
        data.amount = parseFloat(field.value) || 90;
        break;
      }
    }

    // If no amount field found, try to extract from page text
    if (!data.amount || data.amount === 90) {
      const pageText = document.body.innerText;
      const amountMatches = pageText.match(/£?(\d+(?:\.\d{2})?)/g);
      if (amountMatches) {
        // Find likely penalty amounts (usually between £50-£200)
        const amounts = amountMatches
          .map(match => parseFloat(match.replace('£', '')))
          .filter(amount => amount >= 30 && amount <= 500);
        
        if (amounts.length > 0) {
          data.amount = amounts[0];
        }
      }
    }

    setDetectedData(data);
  };

  const handlePayInInstalments = () => {
    const params = new URLSearchParams();
    
    if (detectedData.pcnNumber) params.set('pcn', detectedData.pcnNumber);
    if (detectedData.vehicleRegistration) params.set('vehicle', detectedData.vehicleRegistration);
    if (detectedData.amount) params.set('amount', detectedData.amount.toString());
    
    const paymentUrl = `${window.location.origin}/?${params.toString()}`;
    window.open(paymentUrl, '_blank');
  };

  const handleRefreshDetection = () => {
    detectFormFields();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg border-2 border-green-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Pay in Instalments</h3>
            <button 
              onClick={handleRefreshDetection}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          
          <div className="space-y-2 text-xs text-gray-600 mb-3">
            <div className="flex justify-between">
              <span>PCN:</span>
              <span className="font-mono">{detectedData.pcnNumber || 'Not detected'}</span>
            </div>
            <div className="flex justify-between">
              <span>Vehicle:</span>
              <span className="font-mono">{detectedData.vehicleRegistration || 'Not detected'}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-mono">£{detectedData.amount}</span>
            </div>
          </div>
          
          <Button 
            onClick={handlePayInInstalments}
            className="w-full bg-green-500 hover:bg-green-600 text-white text-sm py-2"
          >
            Pay in 3 Monthly Instalments
          </Button>
          
          <div className="text-xs text-gray-500 mt-2 text-center">
            Split into 3 equal payments over 3 months
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Function to inject the widget into any page
export const injectWidget = () => {
  // Create container for the widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'pcn-instalments-widget';
  document.body.appendChild(widgetContainer);
  
  // Widget would be rendered here (this is just the concept)
  // In practice, you'd need to use a build system or CDN approach
};