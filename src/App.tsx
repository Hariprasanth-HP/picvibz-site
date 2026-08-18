import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UploadProvider } from '@/context/UploadContext';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
import { CreateEvent } from '@/pages/CreateEvent';
import { EventDetails } from '@/pages/EventDetails';
import { Group } from '@/pages/Group';
import { Gallery } from '@/pages/Gallery';
import { Account } from '@/pages/Account';
import { Upgrade } from '@/pages/Upgrade';
import { Payment } from '@/pages/Payment';
import { PaymentSuccess } from '@/pages/PaymentSuccess';
import { ScanQR } from '@/pages/ScanQR';
import { Login } from '@/pages/Login';
import { SignUp } from '@/pages/SignUp';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { AuthCallback } from '@/pages/AuthCallback';
import { Splash } from '@/pages/Splash';
import { Join } from '@/pages/Join';
import { ReferAndEarn } from '@/pages/ReferAndEarn';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {!user ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/join" element={<Join />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="group" element={<Group />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="account" element={<Account />} />
          <Route path="create-event" element={<CreateEvent />} />
          <Route path="event/:id" element={<EventDetails />} />
          <Route path="upgrade" element={<Upgrade />} />
          <Route path="payment" element={<Payment />} />
          <Route path="payment-success" element={<PaymentSuccess />} />
          <Route path="scan" element={<ScanQR />} />
          <Route path="refer" element={<ReferAndEarn />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <AppProvider>
        <UploadProvider>
          <Router>
            <AppRoutes />
          </Router>
        </UploadProvider>
      </AppProvider>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default function App() {
  return <AppContent />;
}