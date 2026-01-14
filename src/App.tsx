import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SeasonalThemeProvider } from "@/hooks/useSeasonalThemes";
import { NotificationScheduler } from "@/components/notifications/NotificationScheduler";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CreateInvoice from "./pages/CreateInvoice";
import MyInvoices from "./pages/MyInvoices";
import InvoiceDetails from "./pages/InvoiceDetails";
import TeacherProfile from "./pages/TeacherProfile";
import UsersManagement from "./pages/admin/UsersManagement";
import DirectorManagement from "./pages/admin/DirectorManagement";
import InvoicesManagement from "./pages/admin/InvoicesManagement";
import InvoiceValidationPage from "./pages/admin/InvoiceValidationPage";
import CampusManagement from "./pages/admin/CampusManagement";
import FiliereManagement from "./pages/admin/FiliereManagement";
import ClassManagement from "./pages/admin/ClassManagement";
import PaymentManagement from "./pages/admin/PaymentManagement";
import SeasonalThemes from "./pages/admin/SeasonalThemes";
import Index from "./pages/Index";
import AdvancedAnalytics from "./pages/admin/AdvancedAnalytics";
import AuditTrailPage from "./pages/admin/AuditTrailPage";
import ReportsPage from "./pages/admin/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <SonnerToaster />
    <AuthProvider>
      <NotificationScheduler />
      <SeasonalThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            } />
            <Route path="/dashboard" element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            } />
            <Route path="/create-invoice" element={
              <AppLayout>
                <CreateInvoice />
              </AppLayout>
            } />
            <Route path="/my-invoices" element={
              <AppLayout>
                <MyInvoices />
              </AppLayout>
            } />
            <Route path="/invoice/:id" element={
              <AppLayout>
                <InvoiceDetails />
              </AppLayout>
            } />
            <Route path="/teacher-profile" element={
              <AppLayout>
                <TeacherProfile />
              </AppLayout>
            } />
            <Route path="/admin/users" element={
              <AppLayout>
                <UsersManagement />
              </AppLayout>
            } />
            <Route path="/admin/director" element={
              <AppLayout>
                <DirectorManagement />
              </AppLayout>
            } />
            <Route path="/admin/invoices" element={
              <AppLayout>
                <InvoicesManagement />
              </AppLayout>
            } />
            <Route path="/admin/invoices/:id" element={
              <AppLayout>
                <InvoiceValidationPage />
              </AppLayout>
            } />
            <Route path="/admin/campus" element={
              <AppLayout>
                <CampusManagement />
              </AppLayout>
            } />
            <Route path="/admin/filieres" element={
              <AppLayout>
                <FiliereManagement />
              </AppLayout>
            } />
            <Route path="/admin/classes" element={
              <AppLayout>
                <ClassManagement />
              </AppLayout>
            } />
            <Route path="/admin/payments" element={
              <AppLayout>
                <PaymentManagement />
              </AppLayout>
            } />
            <Route path="/admin/themes" element={
              <AppLayout>
                <SeasonalThemes />
              </AppLayout>
            } />
            <Route path="/admin/analytics" element={
              <AppLayout>
                <AdvancedAnalytics />
              </AppLayout>
            } />
            <Route path="/admin/audit" element={
              <AppLayout>
                <AuditTrailPage />
              </AppLayout>
            } />
            <Route path="/admin/reports" element={
              <AppLayout>
                <ReportsPage />
              </AppLayout>
            } />
            <Route path="/test-setup" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SeasonalThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
