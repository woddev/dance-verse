import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CampaignPage from "./pages/CampaignPage";
import Campaigns from "./pages/Campaigns";
import HowItWorks from "./pages/HowItWorks";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Dancer pages
import DancerDashboard from "./pages/dancer/Dashboard";
import CampaignBrowse from "./pages/dancer/CampaignBrowse";
import CampaignDetail from "./pages/dancer/CampaignDetail";
import MySubmissions from "./pages/dancer/MySubmissions";
import DancerPayments from "./pages/dancer/Payments";
import DancerSettings from "./pages/dancer/Settings";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import ManageCampaigns from "./pages/admin/ManageCampaigns";
import CreateCampaign from "./pages/admin/CreateCampaign";
import ReviewSubmissions from "./pages/admin/ReviewSubmissions";
import ManagePayouts from "./pages/admin/ManagePayouts";
import ManageDancers from "./pages/admin/ManageDancers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignPage />} />
          <Route path="/auth" element={<Auth />} />

          {/* Dancer routes */}
          <Route path="/dancer/dashboard" element={<ProtectedRoute requiredRole="dancer"><DancerDashboard /></ProtectedRoute>} />
          <Route path="/dancer/campaigns" element={<ProtectedRoute requiredRole="dancer"><CampaignBrowse /></ProtectedRoute>} />
          <Route path="/dancer/campaigns/:id" element={<ProtectedRoute requiredRole="dancer"><CampaignDetail /></ProtectedRoute>} />
          <Route path="/dancer/submissions" element={<ProtectedRoute requiredRole="dancer"><MySubmissions /></ProtectedRoute>} />
          <Route path="/dancer/payments" element={<ProtectedRoute requiredRole="dancer"><DancerPayments /></ProtectedRoute>} />
          <Route path="/dancer/settings" element={<ProtectedRoute requiredRole="dancer"><DancerSettings /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/campaigns" element={<ProtectedRoute requiredRole="admin"><ManageCampaigns /></ProtectedRoute>} />
          <Route path="/admin/campaigns/new" element={<ProtectedRoute requiredRole="admin"><CreateCampaign /></ProtectedRoute>} />
          <Route path="/admin/submissions" element={<ProtectedRoute requiredRole="admin"><ReviewSubmissions /></ProtectedRoute>} />
          <Route path="/admin/payouts" element={<ProtectedRoute requiredRole="admin"><ManagePayouts /></ProtectedRoute>} />
          <Route path="/admin/dancers" element={<ProtectedRoute requiredRole="admin"><ManageDancers /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
