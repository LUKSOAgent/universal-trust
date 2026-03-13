import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Directory from "./pages/Directory";
import AgentProfile from "./pages/AgentProfile";
import Register from "./pages/Register";
import Verify from "./pages/Verify";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-lukso-darker">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Directory />} />
            <Route path="/agent/:address" element={<AgentProfile />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<Verify />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
