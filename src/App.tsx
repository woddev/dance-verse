import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
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
import DancerLeaderboard from "./pages/dancer/Leaderboard";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import ManageCampaigns from "./pages/admin/ManageCampaigns";
import CreateCampaign from "./pages/admin/CreateCampaign";
import ReviewSubmissions from "./pages/admin/ReviewSubmissions";
import ManagePayouts from "./pages/admin/ManagePayouts";
import ManageDancers from "./pages/admin/ManageDancers";
import ManageNavigation from "./pages/admin/ManageNavigation";
import ManageMusic from "./pages/admin/ManageMusic";
import AdminTrackDetail from "./pages/admin/TrackDetail";
import Reports from "./pages/admin/Reports";
import ManagePartners from "./pages/admin/ManagePartners";
import DealDashboard from "./pages/admin/DealDashboard";
import FinanceDashboard from "./pages/admin/FinanceDashboard";
import ManageProducerApplications from "./pages/admin/ManageProducerApplications";
import EmailTemplates from "./pages/admin/EmailTemplates";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageCategories from "./pages/admin/ManageCategories";
import ManagePackages from "./pages/admin/ManagePackages";
import ArtistSubmissions from "./pages/admin/ArtistSubmissions";
import ManageHero from "./pages/admin/ManageHero";

// Public promotion pages
import Promote from "./pages/Promote";
import PromoteSuccess from "./pages/PromoteSuccess";
import MusicGenerator from "./pages/MusicGenerator";

// Producer pages
import ProducerLanding from "./pages/ProducerLanding";
import ProducerApply from "./pages/producer/Apply";
import ProducerDashboard from "./pages/producer/Dashboard";
import ProducerTracks from "./pages/producer/Tracks";
import SubmitTrack from "./pages/producer/SubmitTrack";
import TrackDetail from "./pages/producer/TrackDetail";
import ProducerOffers from "./pages/producer/Offers";
import OfferDetail from "./pages/producer/OfferDetail";
import ProducerContracts from "./pages/producer/Contracts";
import ProducerEarnings from "./pages/producer/Earnings";
import ProducerSettings from "./pages/producer/Settings";

// Partner pages
import PartnerSignup from "./pages/partner/Signup";
import PartnerTerms from "./pages/partner/Terms";
import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerReferrals from "./pages/partner/Referrals";
import PartnerEarnings from "./pages/partner/Earnings";
import PartnerSettings from "./pages/partner/Settings";

import { useSiteGate } from "./components/layout/SiteGate";

const queryClient = new QueryClient();

const App = () => {
  const { locked, Gate } = useSiteGate();
  if (locked) return Gate;

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:slug" element={<PublicCampaignDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/inquire" element={<Inquire />} />
          <Route path="/creators/:id" element={<DancerProfile />} />
          <Route path="/producers" element={<ProducerLanding />} />
          <Route path="/promote" element={<Promote />} />
          <Route path="/promote/success" element={<PromoteSuccess />} />
          <Route path="/music-generator" element={<MusicGenerator />} />

          {/* Dancer routes */}
          <Route path="/dancer/apply" element={<DancerApply />} />
          <Route path="/dancer/dashboard" element={<ProtectedRoute requiredRole="dancer"><DancerDashboard /></ProtectedRoute>} />
          <Route path="/dancer/campaigns" element={<ProtectedRoute requiredRole="dancer"><CampaignBrowse /></ProtectedRoute>} />
          <Route path="/dancer/campaigns/:id" element={<ProtectedRoute requiredRole="dancer"><CampaignDetail /></ProtectedRoute>} />
          <Route path="/dancer/submissions" element={<ProtectedRoute requiredRole="dancer"><MySubmissions /></ProtectedRoute>} />
          <Route path="/dancer/payments" element={<ProtectedRoute requiredRole="dancer"><DancerPayments /></ProtectedRoute>} />
          <Route path="/dancer/leaderboard" element={<ProtectedRoute requiredRole="dancer"><DancerLeaderboard /></ProtectedRoute>} />
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
          <Route path="/admin/finance" element={<ProtectedRoute requiredRole="admin"><FinanceDashboard /></ProtectedRoute>} />
          <Route path="/admin/navigation" element={<ProtectedRoute requiredRole="admin"><ManageNavigation /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />
          <Route path="/admin/producer-applications" element={<ProtectedRoute requiredRole="admin"><ManageProducerApplications /></ProtectedRoute>} />
          <Route path="/admin/email-templates" element={<ProtectedRoute requiredRole="admin"><EmailTemplates /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><ManageUsers /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requiredRole="admin"><ManageCategories /></ProtectedRoute>} />
          <Route path="/admin/packages" element={<ProtectedRoute requiredRole="admin"><ManagePackages /></ProtectedRoute>} />
          <Route path="/admin/artist-submissions" element={<ProtectedRoute requiredRole="admin"><ArtistSubmissions /></ProtectedRoute>} />
          <Route path="/admin/hero" element={<ProtectedRoute requiredRole="admin"><ManageHero /></ProtectedRoute>} />

          {/* Producer routes */}
          <Route path="/producer/apply" element={<ProducerApply />} />
          <Route path="/producer/dashboard" element={<ProtectedRoute requiredRole="producer"><ProducerDashboard /></ProtectedRoute>} />
          <Route path="/producer/tracks" element={<ProtectedRoute requiredRole="producer"><ProducerTracks /></ProtectedRoute>} />
          <Route path="/producer/tracks/new" element={<ProtectedRoute requiredRole="producer"><SubmitTrack /></ProtectedRoute>} />
          <Route path="/producer/tracks/:id" element={<ProtectedRoute requiredRole="producer"><TrackDetail /></ProtectedRoute>} />
          <Route path="/producer/offers" element={<ProtectedRoute requiredRole="producer"><ProducerOffers /></ProtectedRoute>} />
          <Route path="/producer/offers/:id" element={<ProtectedRoute requiredRole="producer"><OfferDetail /></ProtectedRoute>} />
          <Route path="/producer/contracts" element={<ProtectedRoute requiredRole="producer"><ProducerContracts /></ProtectedRoute>} />
          <Route path="/producer/earnings" element={<ProtectedRoute requiredRole="producer"><ProducerEarnings /></ProtectedRoute>} />
          <Route path="/producer/settings" element={<ProtectedRoute requiredRole="producer"><ProducerSettings /></ProtectedRoute>} />


          {/* Partner routes */}
          <Route path="/partner/signup" element={<PartnerSignup />} />
          <Route path="/partner/terms" element={<ProtectedRoute requiredRole="partner"><PartnerTerms /></ProtectedRoute>} />
          <Route path="/partner/dashboard" element={<ProtectedRoute requiredRole="partner"><PartnerDashboard /></ProtectedRoute>} />
          <Route path="/partner/referrals" element={<ProtectedRoute requiredRole="partner"><PartnerReferrals /></ProtectedRoute>} />
          <Route path="/partner/earnings" element={<ProtectedRoute requiredRole="partner"><PartnerEarnings /></ProtectedRoute>} />
          <Route path="/partner/settings" element={<ProtectedRoute requiredRole="partner"><PartnerSettings /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
