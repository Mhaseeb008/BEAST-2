import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SiteSettings, Product, Order } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { StorePage } from './pages/StorePage.tsx';
import { RanksPage } from './pages/RanksPage.tsx';
import { CoinsPage } from './pages/CoinsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { PlayerDashboardPage } from './pages/PlayerDashboardPage.tsx';
import { MyOrdersPage } from './pages/MyOrdersPage.tsx';
import { VotePage } from './pages/VotePage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { TrackOrderModal } from './components/TrackOrderModal.tsx';

function MainApp() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [trackModalOpen, setTrackModalOpen] = useState<boolean>(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSiteSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Dynamic favicon update
  useEffect(() => {
    if (siteSettings?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = siteSettings.faviconUrl;
    }
  }, [siteSettings?.faviconUrl]);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab]);

  const handleCheckoutSuccess = (order: Order) => {
    // Switch directly to My Orders to track the newly submitted order
    setCurrentTab('orders');
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        siteSettings={siteSettings}
        onOpenTrackModal={() => setTrackModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            siteSettings={siteSettings}
            onSelectProduct={(p) => setSelectedProduct(p)}
            setCurrentTab={setCurrentTab}
          />
        )}
        {currentTab === 'store' && (
          <StorePage
            siteSettings={siteSettings}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}
        {currentTab === 'ranks' && (
          <RanksPage onSelectProduct={(p) => setSelectedProduct(p)} />
        )}
        {currentTab === 'coins' && (
          <CoinsPage onSelectProduct={(p) => setSelectedProduct(p)} />
        )}
        {currentTab === 'vote' && (
          <VotePage siteSettings={siteSettings} />
        )}
        {currentTab === 'login' && (
          <LoginPage setCurrentTab={setCurrentTab} />
        )}
        {currentTab === 'register' && (
          <RegisterPage setCurrentTab={setCurrentTab} />
        )}
        {currentTab === 'dashboard' && (
          <PlayerDashboardPage setCurrentTab={setCurrentTab} />
        )}
        {currentTab === 'orders' && (
          <MyOrdersPage setCurrentTab={setCurrentTab} />
        )}
        {currentTab === 'admin' && (
          <AdminDashboardPage
            siteSettings={siteSettings}
            onRefreshSettings={fetchSettings}
          />
        )}
      </main>

      {/* Footer */}
      <Footer siteSettings={siteSettings} setCurrentTab={setCurrentTab} />

      {/* Manual Payment Checkout Modal */}
      {selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={handleCheckoutSuccess}
          onGoToLogin={() => setCurrentTab('login')}
        />
      )}

      {/* Quick Order Tracking Modal */}
      {trackModalOpen && (
        <TrackOrderModal onClose={() => setTrackModalOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
