export default function Bookmarklet() {
  const bookmarkletCode = `
javascript:(function(){
  // Extract data from Civil Parking Office forms
  function extractCPOData() {
    const data = {
      pcnNumber: '',
      vehicleRegistration: '',
      amount: 90
    };
    
    // Try to find form fields by various selectors
    const selectors = [
      // Common input field selectors
      'input[name*="pcn"], input[id*="pcn"], input[placeholder*="pcn"], input[placeholder*="parking charge"]',
      'input[name*="vehicle"], input[id*="vehicle"], input[placeholder*="vehicle"], input[placeholder*="registration"]',
      'input[name*="amount"], input[id*="amount"], input[placeholder*="amount"], input[placeholder*="charge"]'
    ];
    
    // PCN Number
    const pcnField = document.querySelector(selectors[0]);
    if (pcnField && pcnField.value) {
      data.pcnNumber = pcnField.value.trim();
    }
    
    // Vehicle Registration
    const vehicleField = document.querySelector(selectors[1]);
    if (vehicleField && vehicleField.value) {
      data.vehicleRegistration = vehicleField.value.trim().toUpperCase();
    }
    
    // Amount (try to extract from page text if no field)
    const amountField = document.querySelector(selectors[2]);
    if (amountField && amountField.value) {
      data.amount = parseFloat(amountField.value) || 90;
    } else {
      // Try to find amount in page text
      const pageText = document.body.innerText;
      const amountMatch = pageText.match(/£?([0-9]+(?:\\.[0-9]{2})?)/);
      if (amountMatch) {
        data.amount = parseFloat(amountMatch[1]) || 90;
      }
    }
    
    return data;
  }
  
  const extractedData = extractCPOData();
  
  // Build URL for your payment portal
  const baseUrl = '${window.location.origin}';
  const params = new URLSearchParams();
  
  if (extractedData.pcnNumber) params.set('pcn', extractedData.pcnNumber);
  if (extractedData.vehicleRegistration) params.set('vehicle', extractedData.vehicleRegistration);
  if (extractedData.amount) params.set('amount', extractedData.amount.toString());
  
  const paymentUrl = baseUrl + '/?' + params.toString();
  
  // Show confirmation dialog
  const confirmMessage = \`Extract PCN data and proceed to payment?\\n\\nPCN: \${extractedData.pcnNumber || 'Not found'}\\nVehicle: \${extractedData.vehicleRegistration || 'Not found'}\\nAmount: £\${extractedData.amount}\`;
  
  if (confirm(confirmMessage)) {
    window.open(paymentUrl, '_blank');
  }
})();
  `.trim();

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    alert('Bookmarklet copied to clipboard! Drag this to your bookmarks bar or save as a bookmark.');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            CPO Payment Integration Tools
          </h1>
          
          <div className="space-y-8">
            {/* Bookmarklet Section */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Option 1: Browser Bookmarklet
              </h2>
              <p className="text-gray-600 mb-4">
                This bookmarklet can extract PCN data from any Civil Parking Office page and redirect to your payment portal.
              </p>
              
              <div className="bg-gray-50 rounded p-4 mb-4">
                <h3 className="font-medium mb-2">How to use:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Copy the bookmarklet code below</li>
                  <li>Create a new bookmark in your browser</li>
                  <li>Paste the code as the URL</li>
                  <li>Visit any CPO page with PCN form</li>
                  <li>Click the bookmark to extract data and redirect</li>
                </ol>
              </div>
              
              <div className="relative">
                <textarea
                  readOnly
                  value={bookmarkletCode}
                  className="w-full h-40 p-3 bg-gray-100 border rounded text-xs font-mono"
                />
                <button
                  onClick={handleCopyBookmarklet}
                  className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* URL Parameters Section */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Option 2: URL Parameters
              </h2>
              <p className="text-gray-600 mb-4">
                Your payment portal now accepts URL parameters to pre-fill form data.
              </p>
              
              <div className="bg-gray-50 rounded p-4">
                <h3 className="font-medium mb-2">Example URLs:</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div>
                    <span className="text-gray-500">Basic:</span> 
                    <br />
                    <code className="text-blue-600">
                      {window.location.origin}/?pcn=PCN123456&vehicle=AB12CDE&amount=90
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-500">With email:</span>
                    <br />
                    <code className="text-blue-600">
                      {window.location.origin}/?pcn=PCN123456&vehicle=AB12CDE&amount=90&email=test@example.com
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration Instructions */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Option 3: JavaScript Integration
              </h2>
              <p className="text-gray-600 mb-4">
                For direct integration into the CPO website, use this JavaScript code:
              </p>
              
              <div className="bg-gray-100 rounded p-4">
                <pre className="text-sm overflow-x-auto">
{`// Add "Pay in Instalments" button to existing CPO forms
function addInstalmentsButton() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const button = document.createElement('button');
    button.textContent = 'Pay in Instalments';
    button.className = 'bg-green-500 text-white px-6 py-2 rounded';
    button.onclick = function(e) {
      e.preventDefault();
      
      const pcn = form.querySelector('[name*="pcn"], [id*="pcn"]')?.value || '';
      const vehicle = form.querySelector('[name*="vehicle"], [id*="vehicle"]')?.value || '';
      
      const url = '${window.location.origin}/?pcn=' + 
                  encodeURIComponent(pcn) + '&vehicle=' + 
                  encodeURIComponent(vehicle) + '&amount=90';
      
      window.open(url, '_blank');
    };
    
    form.appendChild(button);
  });
}

// Run when page loads
document.addEventListener('DOMContentLoaded', addInstalmentsButton);`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}