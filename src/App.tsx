import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Campaigns from "./pages/Campaigns";
import PublicCampaignDetail from "./pages/CampaignDetail";
import HowItWorks from "./pages/HowItWorks";
import Auth from "./pages/Auth";
import Inquire from "./pages/Inquire";
import NotFound from "./pages/NotFound";
import DancerProfile from "./pages/DancerProfile";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Dancer pages
import DancerApply from "./pages/dancer/Apply";
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
import ManageNavigation from "./pages/admin/ManageNavigation";
import ManageMusic from "./pages/admin/ManageMusic";
import Reports from "./pages/admin/Reports";
import ManagePartners from "./pages/admin/ManagePartners";
import DealDashboard from "./pages/admin/DealDashboard";

// Producer pages
import ProducerDashboard from "./pages/producer/Dashboard";
import ProducerTracks from "./pages/producer/Tracks";
import SubmitTrack from "./pages/producer/SubmitTrack";
import TrackDetail from "./pages/producer/TrackDetail";
import ProducerOffers from "./pages/producer/Offers";
import OfferDetail from "./pages/producer/OfferDetail";
import ProducerContracts from "./pages/producer/Contracts";
import ProducerEarnings from "./pages/producer/Earnings";

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
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:slug" element={<PublicCampaignDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/inquire" element={<Inquire />} />
          <Route path="/creators/:id" element={<DancerProfile />} />

          {/* Dancer routes */}
          <Route path="/dancer/apply" element={<DancerApply />} />
          <Route path="/dancer/dashboard" element={<ProtectedRoute requiredRole="dancer"><DancerDashboard /></ProtectedRoute>} />
          <Route path="/dancer/campaigns" element={<ProtectedRoute requiredRole="dancer"><CampaignBrowse /></ProtectedRoute>} />
          <Route path="/dancer/campaigns/:id" element={<ProtectedRoute requiredRole="dancer"><CampaignDetail /></ProtectedRoute>} />
          <Route path="/dancer/submissions" element={<ProtectedRoute requiredRole="dancer"><MySubmissions /></ProtectedRoute>} />
          <Route path="/dancer/payments" element={<ProtectedRoute requiredRole="dancer"><DancerPayments /></ProtectedRoute>} />
          <Route path="/dancer/settings" element={<ProtectedRoute requiredRole="dancer"><DancerSettings /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/music" element={<ProtectedRoute requiredRole="admin"><ManageMusic /></ProtectedRoute>} />
          <Route path="/admin/campaigns" element={<ProtectedRoute requiredRole="admin"><ManageCampaigns /></ProtectedRoute>} />
          <Route path="/admin/campaigns/new" element={<ProtectedRoute requiredRole="admin"><CreateCampaign /></ProtectedRoute>} />
          <Route path="/admin/submissions" element={<ProtectedRoute requiredRole="admin"><ReviewSubmissions /></ProtectedRoute>} />
          <Route path="/admin/payouts" element={<ProtectedRoute requiredRole="admin"><ManagePayouts /></ProtectedRoute>} />
          <Route path="/admin/dancers" element={<ProtectedRoute requiredRole="admin"><ManageDancers /></ProtectedRoute>} />
          <Route path="/admin/partners" element={<ProtectedRoute requiredRole="admin"><ManagePartners /></ProtectedRoute>} />
          <Route path="/admin/deals" element={<ProtectedRoute requiredRole="admin"><DealDashboard /></ProtectedRoute>} />
          <Route path="/admin/navigation" element={<ProtectedRoute requiredRole="admin"><ManageNavigation /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />

          {/* Producer routes */}
          <Route path="/producer/dashboard" element={<ProtectedRoute requiredRole="producer"><ProducerDashboard /></ProtectedRoute>} />
          <Route path="/producer/tracks" element={<ProtectedRoute requiredRole="producer"><ProducerTracks /></ProtectedRoute>} />
          <Route path="/producer/tracks/new" element={<ProtectedRoute requiredRole="producer"><SubmitTrack /></ProtectedRoute>} />
          <Route path="/producer/tracks/:id" element={<ProtectedRoute requiredRole="producer"><TrackDetail /></ProtectedRoute>} />
          <Route path="/producer/offers" element={<ProtectedRoute requiredRole="producer"><ProducerOffers /></ProtectedRoute>} />
          <Route path="/producer/offers/:id" element={<ProtectedRoute requiredRole="producer"><OfferDetail /></ProtectedRoute>} />
          <Route path="/producer/contracts" element={<ProtectedRoute requiredRole="producer"><ProducerContracts /></ProtectedRoute>} />
          <Route path="/producer/earnings" element={<ProtectedRoute requiredRole="producer"><ProducerEarnings /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
