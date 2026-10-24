import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { Sidebar, Navbar, TxReceiptModal } from './components';
import { Admin, Auth, CampaignDetails, CreateCampaign, Home, Profile, Explorer } from './pages';

const App = () => {
  return (
    <div className="relative min-h-screen flex flex-row bg-slate-50">
      {/* Left Sidebar */}
      <div className="sm:flex hidden relative">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col max-w-[1280px] mx-auto sm:pr-6 w-full">
        <Navbar />
        <main className="flex-1 px-4 sm:px-0 pb-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/create-campaign" element={<CreateCampaign />} />
            <Route path="/campaign-details/:id" element={<CampaignDetails />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>

      {/* Global Transaction Receipt Modal */}
      <TxReceiptModal />
    </div>
  );
};

export default App;