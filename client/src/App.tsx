import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PaymentPortal from "@/pages/payment-portal";
import PaymentSuccess from "@/pages/payment-success";
import PaymentPage from "@/pages/payment";
import Bookmarklet from "@/pages/bookmarklet";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PaymentPortal} />
      <Route path="/payment" component={PaymentPage} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/tools" component={Bookmarklet} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
