import { Link, useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';

const MerchantLegalLayout = ({ children, activeTab, isEmbedded = false }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/merchant/login');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // If rendered inside the approved merchant dashboard, we don't duplicate outer shell headers
  if (isEmbedded) {
    return (
      <div className="w-full">
        {/* In-dashboard tab switcher */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl">
            <Link
              to="/merchant/terms"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'terms'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <DescriptionRoundedIcon sx={{ fontSize: 16 }} className={activeTab === 'terms' ? 'text-[#5EB929]' : ''} />
              <span>Terms of Operation</span>
            </Link>
            <Link
              to="/merchant/privacy"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'privacy'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <SecurityRoundedIcon sx={{ fontSize: 16 }} className={activeTab === 'privacy' ? 'text-[#5EB929]' : ''} />
              <span>Privacy Protocol</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <PrintRoundedIcon sx={{ fontSize: 16 }} />
              <span className="hidden sm:inline">Print Document</span>
            </button>
          </div>
        </div>

        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-gray-900 selection:bg-[#5EB929]/20 selection:text-gray-900">
      {/* ── Public Top Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand & Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              aria-label="Back"
              className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all active:scale-95 border border-gray-100"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            </button>

            <Link to="/merchant/login" className="flex items-center gap-2.5 group">
              <img
                src="/offerly-logo-ring.png"
                alt="Offerly"
                className="w-7 h-7 object-contain group-hover:scale-105 transition-transform"
              />
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold text-gray-900 text-base tracking-tight uppercase">
                  OFFERLY<span className="text-[#5EB929] italic">BIZ</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1 px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200/60">
                  Legal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="hidden md:flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/50">
            <Link
              to="/merchant/terms"
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'terms'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <DescriptionRoundedIcon sx={{ fontSize: 16 }} className={activeTab === 'terms' ? 'text-[#5EB929]' : ''} />
              <span>Terms of Operation</span>
            </Link>
            <Link
              to="/merchant/privacy"
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'privacy'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <SecurityRoundedIcon sx={{ fontSize: 16 }} className={activeTab === 'privacy' ? 'text-[#5EB929]' : ''} />
              <span>Privacy Protocol</span>
            </Link>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              type="button"
              title="Print Document"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100"
            >
              <PrintRoundedIcon sx={{ fontSize: 16 }} />
              <span>Print</span>
            </button>

            <Link
              to="/merchant/login"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center gap-1.5"
            >
              <LoginRoundedIcon sx={{ fontSize: 16 }} />
              <span className="hidden sm:inline">Merchant Login</span>
              <span className="sm:hidden">Login</span>
            </Link>

            <Link
              to="/merchant/signup"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#5EB929] hover:bg-[#52a623] text-white shadow-md shadow-[#5EB929]/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <StorefrontRoundedIcon sx={{ fontSize: 16 }} />
              <span className="hidden sm:inline">Deploy Store</span>
              <span className="sm:hidden">Sign Up</span>
            </Link>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden border-t border-gray-100 px-4 py-2 bg-gray-50/70 flex items-center gap-2">
          <Link
            to="/merchant/terms"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'terms'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                : 'text-gray-500'
            }`}
          >
            <DescriptionRoundedIcon sx={{ fontSize: 15 }} className={activeTab === 'terms' ? 'text-[#5EB929]' : ''} />
            <span>Terms</span>
          </Link>
          <Link
            to="/merchant/privacy"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'privacy'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                : 'text-gray-500'
            }`}
          >
            <SecurityRoundedIcon sx={{ fontSize: 15 }} className={activeTab === 'privacy' ? 'text-[#5EB929]' : ''} />
            <span>Privacy</span>
          </Link>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* ── Public Footer ──────────────────────────────────────────── */}
      <footer className="mt-auto bg-white border-t border-gray-100 pt-12 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Brand */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <img src="/offerly-logo-ring.png" alt="Offerly" className="w-6 h-6 object-contain" />
                <span className="font-extrabold text-gray-900 text-sm tracking-tight uppercase">
                  OFFERLY<span className="text-[#5EB929] italic">BIZ</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-sm">
                The high-performance merchant operating network for local commerce. Powering verified QR redemptions, instant campaign rollouts, and customer growth.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-bold text-gray-500">
                <VerifiedUserRoundedIcon sx={{ fontSize: 14 }} className="text-[#5EB929]" />
                <span>Encrypted & Compliant Protocol Architecture</span>
              </div>
            </div>

            {/* Column 2: Legal & Governance */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Merchant Governance</p>
              <ul className="space-y-2 text-xs font-semibold text-gray-600">
                <li>
                  <Link to="/merchant/terms" className="hover:text-[#5EB929] transition-colors">
                    Terms of Operation
                  </Link>
                </li>
                <li>
                  <Link to="/merchant/privacy" className="hover:text-[#5EB929] transition-colors">
                    Privacy Protocol
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#5EB929] transition-colors">
                    Customer Terms
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-[#5EB929] transition-colors">
                    Customer Privacy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Platform & Access */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Merchant Access</p>
              <ul className="space-y-2 text-xs font-semibold text-gray-600">
                <li>
                  <Link to="/merchant/login" className="hover:text-[#5EB929] transition-colors">
                    Terminal Login
                  </Link>
                </li>
                <li>
                  <Link to="/merchant/signup" className="hover:text-[#5EB929] transition-colors">
                    Enroll New Store
                  </Link>
                </li>
                <li>
                  <Link to="/merchant/support" className="hover:text-[#5EB929] transition-colors">
                    Merchant Concierge
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-[#5EB929] transition-colors flex items-center gap-1">
                    <span>Offerly Consumer App</span>
                    <ArrowForwardRoundedIcon sx={{ fontSize: 12 }} />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom copyright */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400 font-medium">
            <p>© {new Date().getFullYear()} Offerly Technologies Inc. All commercial protocols reserved.</p>
            <p className="flex items-center gap-3">
              <span>Security Hub v2.4.0</span>
              <span>•</span>
              <span>DPDP Act 2023 Compliant</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MerchantLegalLayout;
