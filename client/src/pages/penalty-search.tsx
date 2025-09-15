import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Lock, CreditCard, Search, ArrowRight, X, AlertTriangle, RefreshCw } from "lucide-react";

interface PenaltyData {
  id: string;
  ticketNo: string;
  vrm: string;
  vehicleMake: string | null;
  penaltyAmount: string;
  dateIssued: string;
  site: string | null;
  reasonForIssue: string | null;
  status: string;
}

export default function PenaltySearchPage() {
  const [searchData, setSearchData] = useState({
    ticketNo: '',
    vrm: ''
  });
  const [selectedPenalty, setSelectedPenalty] = useState<PenaltyData | null>(null);
  const [paymentData, setPaymentData] = useState({
    email: ''
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  // Enhanced search penalties query with comprehensive error handling
  const { data: searchResults, refetch: searchPenalties, isFetching, error, isError } = useQuery({
    queryKey: ['/api/search-penalties', searchData.ticketNo, searchData.vrm],
    queryFn: async () => {
      if (import.meta.env.MODE !== 'production') {
        console.log('🔍 Search Debug: Starting search request', {
          ticketNo: searchData.ticketNo ? `${searchData.ticketNo.substring(0, 3)}***` : '',
          vrm: searchData.vrm ? `${searchData.vrm.substring(0, 2)}***` : '',
          timestamp: new Date().toISOString(),
          environment: import.meta.env.MODE
        });
      }

      if (!searchData.ticketNo && !searchData.vrm) {
        if (import.meta.env.MODE !== 'production') {
          console.log('🔍 Search Debug: No search criteria provided');
        }
        return [];
      }

      const params = new URLSearchParams();
      if (searchData.ticketNo) params.append('ticketNo', searchData.ticketNo);
      if (searchData.vrm) params.append('vrm', searchData.vrm);
      
      const requestUrl = `/api/search-penalties?${params.toString()}`;
      if (import.meta.env.MODE !== 'production') {
        console.log('🔍 Search Debug: Making API request to:', requestUrl);
      }

      try {
        const response = await apiRequest('GET', requestUrl);
        
        if (import.meta.env.MODE !== 'production') {
          console.log('🔍 Search Debug: API response received', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
        }

        if (!response.ok) {
          let errorMessage = 'Search failed';
          let errorDetails = '';

          // Handle specific HTTP error codes
          if (response.status === 502) {
            errorMessage = 'Service temporarily unavailable';
            errorDetails = 'The application is temporarily unavailable. This is usually resolved quickly. Please try again in a moment.';
          } else if (response.status === 503) {
            errorMessage = 'Search service temporarily unavailable';
            errorDetails = 'The penalty search service is currently experiencing issues. Please try again in a few minutes.';
          } else if (response.status === 404) {
            errorMessage = 'Search service not found';
            errorDetails = 'Unable to connect to the penalty search service. Please contact support if this issue persists.';
          } else if (response.status === 500) {
            errorMessage = 'Internal server error';
            errorDetails = 'The server encountered an error while processing your search. Please try again.';
          } else if (response.status >= 400 && response.status < 500) {
            errorMessage = 'Invalid search request';
            errorDetails = 'There was an issue with your search request. Please check your details and try again.';
          } else {
            errorMessage = `Search failed (${response.status})`;
            errorDetails = 'An unexpected error occurred while searching for penalties.';
          }

          // Try to get error details from response body
          try {
            const errorBody = await response.json();
            if (errorBody.error) {
              errorDetails = errorBody.error;
            }
            if (errorBody.details) {
              errorDetails = errorBody.details;
            }
            if (import.meta.env.MODE !== 'production') {
              console.log('🔍 Search Debug: Error response body:', errorBody);
            }
          } catch (parseError) {
            if (import.meta.env.MODE !== 'production') {
              console.log('🔍 Search Debug: Could not parse error response body');
            }
          }

          const error = new Error(errorMessage);
          (error as any).details = errorDetails;
          (error as any).status = response.status;
          throw error;
        }

        const data = await response.json() as PenaltyData[];
        if (import.meta.env.MODE !== 'production') {
          console.log('🔍 Search Debug: Search completed successfully', {
            resultsCount: data.length,
            results: data.map(r => ({ ...r, ticketNo: `${r.ticketNo.substring(0, 3)}***`, vrm: `${r.vrm.substring(0, 2)}***` }))
          });
        }

        return data;
      } catch (networkError: any) {
        if (import.meta.env.MODE !== 'production') {
          console.error('🔍 Search Debug: Network or parsing error:', networkError);
        }
        
        // Handle network connectivity issues
        if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
          const error = new Error('Network connection failed');
          (error as any).details = 'Unable to connect to the server. Please check your internet connection and try again.';
          throw error;
        }
        
        // Re-throw API errors with preserved details
        throw networkError;
      }
    },
    enabled: false,
    retry: (failureCount, error: any) => {
      if (import.meta.env.MODE !== 'production') {
        console.log('🔍 Search Debug: Retry attempt', { failureCount, error: error.message });
      }
      
      // Don't retry on client errors (4xx) or service unavailable specifically
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      
      // Retry up to 2 times for server errors and network issues
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Handle search query state changes for error/success feedback
  useEffect(() => {
    if (isError && error) {
      if (import.meta.env.MODE !== 'production') {
        console.error('🔍 Search Debug: Query error handler triggered:', error);
      }
      
      let errorMessage = 'Search failed';
      let errorDetails = 'An unexpected error occurred while searching for penalties.';
      
      if ((error as any).message && (error as any).details) {
        errorMessage = (error as any).message;
        errorDetails = (error as any).details;
      } else if ((error as any).message) {
        errorMessage = (error as any).message;
        if ((error as any).message.includes('Network connection failed')) {
          errorDetails = 'Please check your internet connection and try again.';
        } else if ((error as any).message.includes('service temporarily unavailable')) {
          errorDetails = 'The penalty search service is currently experiencing issues. Please try again in a few minutes.';
        }
      }

      setSearchError(errorDetails);
      
      toast({
        title: errorMessage,
        description: errorDetails,
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  useEffect(() => {
    if (searchResults && !isError && !isFetching) {
      if (import.meta.env.MODE !== 'production') {
        console.log('🔍 Search Debug: Query success handler triggered:', { resultsCount: searchResults.length });
      }
      setSearchError(null);
      setHasSearched(true);
      
      if (searchResults.length === 0) {
        toast({
          title: "No Results Found",
          description: "No penalties found matching your search criteria. Please check your details and try again.",
          variant: "default",
        });
      }
    }
  }, [searchResults, isError, isFetching, toast]);

  const handleSearch = () => {
    if (!searchData.ticketNo && !searchData.vrm) {
      toast({
        title: "Search Required",
        description: "Please enter either a parking charge number or vehicle registration",
        variant: "destructive",
      });
      return;
    }
    
    if (import.meta.env.MODE !== 'production') {
      console.log('🔍 Search Debug: User initiated search', {
        ticketNo: searchData.ticketNo ? `${searchData.ticketNo.substring(0, 3)}***` : '',
        vrm: searchData.vrm ? `${searchData.vrm.substring(0, 2)}***` : '',
        userAgent: navigator.userAgent,
        currentUrl: window.location.href
      });
    }
    
    // Clear previous errors and reset state
    setSearchError(null);
    setHasSearched(false);
    
    // Trigger the search
    searchPenalties();
  };

  const handleRetrySearch = () => {
    if (import.meta.env.MODE !== 'production') {
      console.log('🔍 Search Debug: User initiated retry search');
    }
    setSearchError(null);
    searchPenalties();
  };

  const handleSelectPenalty = (penalty: PenaltyData) => {
    setSelectedPenalty(penalty);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPenalty || !paymentData.email || !acceptedTerms) {
      toast({
        title: "Required Information",
        description: "Please provide your email address and accept terms to proceed",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        pcnNumber: selectedPenalty.ticketNo,
        vehicleRegistration: selectedPenalty.vrm,
        email: paymentData.email,
        penaltyAmount: parseFloat(selectedPenalty.penaltyAmount)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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

  const handleCloseWindow = () => {
    window.close();
  };

  const getNextPaymentDates = () => {
    const today = new Date();
    
    const payment2 = new Date(today);
    payment2.setDate(today.getDate() + 30);
    
    const payment3 = new Date(today);
    payment3.setDate(today.getDate() + 60);
    
    return {
      payment2: payment2.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      payment3: payment3.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  };

  const { payment2, payment3 } = getNextPaymentDates();
  const penaltyAmount = selectedPenalty ? parseFloat(selectedPenalty.penaltyAmount) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center relative">
            <Button
              onClick={handleCloseWindow}
              className="absolute top-2 right-2 p-2 h-auto bg-transparent hover:bg-gray-100 text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {showPaymentForm ? 'Pay in Instalments' : 'Find Your Parking Charge'}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {showPaymentForm ? 'Complete your payment setup' : 'Enter your details to search for your penalty'}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {!showPaymentForm ? (
              <>
                {/* Search Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ticketNo" className="text-sm font-medium text-gray-700 mb-2 block">
                      Parking Charge Number
                    </Label>
                    <Input
                      id="ticketNo"
                      type="text"
                      placeholder="Enter your parking charge number"
                      value={searchData.ticketNo}
                      onChange={(e) => setSearchData(prev => ({ ...prev, ticketNo: e.target.value }))}
                      className="w-full"
                      data-testid="input-ticketNo"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="vrm" className="text-sm font-medium text-gray-700 mb-2 block">
                      Vehicle Registration
                    </Label>
                    <Input
                      id="vrm"
                      type="text"
                      placeholder="Enter your vehicle registration"
                      value={searchData.vrm}
                      onChange={(e) => setSearchData(prev => ({ ...prev, vrm: e.target.value.toUpperCase() }))}
                      className="w-full"
                      data-testid="input-vrm"
                    />
                  </div>

                  <Button
                    onClick={handleSearch}
                    disabled={isFetching}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    data-testid="button-search"
                  >
                    {isFetching ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Searching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Search className="w-4 h-4" />
                        <span>Search Penalties</span>
                      </div>
                    )}
                  </Button>
                </div>

                {/* Enhanced Error Display */}
                {searchError && (
                  <Card className="border-l-4 border-l-red-500 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-800 mb-1">Search Error</h4>
                          <p className="text-sm text-red-700">{searchError}</p>
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={handleRetrySearch}
                              disabled={isFetching}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              data-testid="button-retry-search"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Retry Search
                            </Button>
                            <Button
                              onClick={() => setSearchError(null)}
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              data-testid="button-dismiss-error"
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Search Results */}
                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
                    {searchResults.map((penalty) => (
                      <Card key={penalty.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Parking Charge No:</span>
                              <p className="text-lg font-semibold text-gray-900">{penalty.ticketNo}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">Vehicle Registration:</span>
                              <p className="text-lg font-semibold text-gray-900">{penalty.vrm}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">Amount:</span>
                              <p className="text-lg font-semibold text-green-600">£{parseFloat(penalty.penaltyAmount).toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">Date Issued:</span>
                              <p className="text-lg font-semibold text-gray-900">
                                {penalty.dateIssued || 'Not available'}
                              </p>
                            </div>
                            {penalty.site && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Site:</span>
                                <p className="text-lg font-semibold text-gray-900">{penalty.site}</p>
                              </div>
                            )}
                            {penalty.reasonForIssue && (
                              <div className="md:col-span-2">
                                <span className="text-sm font-medium text-gray-700">Reason:</span>
                                <p className="text-lg font-semibold text-gray-900">{penalty.reasonForIssue}</p>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => handleSelectPenalty(penalty)}
                            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                            data-testid="button-pay-penalty"
                          >
                            Pay This Penalty in Instalments
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchResults && searchResults.length === 0 && hasSearched && !searchError && (
                  <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Search className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-yellow-800 mb-1">No Results Found</h4>
                          <p className="text-sm text-yellow-700 mb-3">
                            No penalties found matching your search criteria. Please verify your details and try again.
                          </p>
                          <div className="text-xs text-yellow-600 space-y-1">
                            <p>• Check your parking charge number is entered correctly</p>
                            <p>• Verify your vehicle registration matches exactly</p>
                            <p>• Try using just one search field if both are not working</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <>
                {/* Payment Form */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-3">Selected Penalty</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">PCN Number:</span>
                      <span className="font-mono font-medium">{selectedPenalty?.ticketNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Vehicle:</span>
                      <span className="font-mono font-medium">{selectedPenalty?.vrm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Amount:</span>
                      <span className="font-medium">£{penaltyAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Monthly Payment:</span>
                      <span className="font-medium text-green-600">£{(penaltyAmount / 3).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Schedule */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Payment Schedule</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment 1 (Today):</span>
                      <span className="font-medium">£{(penaltyAmount / 3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment 2 ({payment2}):</span>
                      <span className="font-medium">£{(penaltyAmount / 3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment 3 ({payment3}):</span>
                      <span className="font-medium">£{(penaltyAmount / 3).toFixed(2)}</span>
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
                      onChange={(e) => setPaymentData(prev => ({ ...prev, email: e.target.value }))}
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
                      I agree to the Terms and Conditions and authorise recurring payments of £{(penaltyAmount / 3).toFixed(2)} per month for 3 months (total £{penaltyAmount.toFixed(2)}) starting today.
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
                  
                  <Button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2"
                  >
                    Back to Search
                  </Button>
                </form>
              </>
            )}

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