import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const Directory = lazy(() => import("./pages/Directory"));
const AgentProfile = lazy(() => import("./pages/AgentProfile"));
const Register = lazy(() => import("./pages/Register"));
const Verify = lazy(() => import("./pages/Verify"));
const Endorse = lazy(() => import("./pages/Endorse"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-lukso-border border-t-lukso-pink rounded-full animate-spin mb-3" />
      <p className="text-gray-500 text-sm">Loading…</p>
    </div>
  );
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-lukso-darker">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Directory />} />
              <Route path="/agent/:address" element={<AgentProfile />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/endorse" element={<Endorse />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
