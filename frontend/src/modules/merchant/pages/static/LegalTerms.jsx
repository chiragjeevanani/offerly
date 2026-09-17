/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import MerchantLegalLayout from '../../components/layout/MerchantLegalLayout';

const TermSection = ({ section, isExpanded, onToggle }) => {
  const Icon = section.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isExpanded ? 'border-[#5EB929]/30 ring-2 ring-[#5EB929]/5' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <button
        onClick={onToggle}
        type="button"
        className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 text-[#5EB929] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon sx={{ fontSize: 20 }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                Section {section.number}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#5EB929]/10 text-[#5EB929] font-bold text-[10px] uppercase tracking-wider">
                {section.category}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              {section.title}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed max-w-2xl">
              {section.summary}
            </p>
          </div>
        </div>

        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
          isExpanded ? 'bg-[#5EB929] text-white rotate-180' : 'bg-gray-100 text-gray-400'
        }`}>
          <ExpandMoreRoundedIcon sx={{ fontSize: 20 }} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 px-5 sm:px-6 pt-4 pb-6 bg-gray-50/40"
          >
            <div className="space-y-4 text-xs sm:text-sm text-gray-600 font-normal leading-relaxed">
              {section.content}

              {section.highlights && section.highlights.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Key Compliance Rules</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section.highlights.map((h, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-gray-700">
                        <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929] flex-shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const LegalTerms = ({ isEmbedded = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({ 0: true, 1: true });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      number: "01",
      category: "Binding Agreement",
      icon: PolicyRoundedIcon,
      title: "Protocol Acceptance & Scope of Merchant Relationship",
      summary: "Digital legal contract establishing operational terms between your registered commercial outlet and Offerly.",
      content: (
        <>
          <p>
            By enrolling, deploying a digital storefront, scanning customer passes, or logging into the Offerly Biz Terminal, you enter into a legally binding contract under the applicable Information Technology and electronic contract laws.
          </p>
          <p>
            This agreement governs your status as an authorized commercial partner within the Offerly ecosystem. If you do not accept these operational protocols in full, you must not use the merchant terminal or advertise offerings on the platform.
          </p>
        </>
      ),
      highlights: [
        "Binding electronic signature on registration",
        "Applicable to all store staff operating the terminal",
        "Supersedes prior informal commercial understandings"
      ]
    },
    {
      number: "02",
      category: "KYB & Verification",
      icon: BusinessRoundedIcon,
      title: "Merchant Eligibility & Commercial Due Diligence",
      summary: "Mandatory verification standards including business licenses, GST identification, and physical storefront validation.",
      content: (
        <>
          <p>
            To maintain consumer safety and platform integrity, all merchants must undergo Know-Your-Business (KYB) validation. You warrant that all commercial registration certificates, PAN details, GSTIN documentation, FSSAI / trade permits, and physical location coordinates provided are current, valid, and authentic.
          </p>
          <p>
            Offerly reserves the right to conduct ongoing verification, request updated tax credentials, or dispatch physical field compliance auditors to inspect the outlet during standard business hours.
          </p>
        </>
      ),
      highlights: [
        "Valid commercial license required",
        "Accurate geo-location & operating hours",
        "Mandatory notification of change in ownership"
      ]
    },
    {
      number: "03",
      category: "Campaigns & Offers",
      icon: LocalOfferRoundedIcon,
      title: "Offer Creation, Rocket Campaigns & Pricing Integrity",
      summary: "Zero tolerance for fake discounts, price gouging, or refusal to honor published vouchers.",
      content: (
        <>
          <p>
            Merchants hold full discretion over the discounts, combo deals, and Rocket Campaigns they activate on Offerly. However, you strictly agree to honor 100% of the offers displayed live on the network without any surcharge, unexpected minimum spend, or discriminatory treatment of Offerly customers.
          </p>
          <p>
            You expressly agree not to artificially inflate regular in-store menu or retail prices prior to applying discounts. Misleading promotional representations violate consumer protection statutes and warrant immediate store delisting.
          </p>
        </>
      ),
      highlights: [
        "100% fulfillment guarantee on live offers",
        "No hidden fees or unexpected customer surcharges",
        "Instant campaign pause/resume via merchant terminal"
      ]
    },
    {
      number: "04",
      category: "QR Redemption",
      icon: QrCodeScannerRoundedIcon,
      title: "Terminal Scanner Protocol & Point-of-Sale Verification",
      summary: "Procedures for scanning customer vouchers, preventing fraud, and completing redemptions.",
      content: (
        <>
          <p>
            All offer redemptions must be processed in real-time through the Offerly Biz Scanner terminal. The terminal decrypts and validates the customer's dynamic cryptographically timestamped QR voucher.
          </p>
          <p>
            Manual circumvention, accepting expired/photocopied screenshots, or attempting to redeem passes without delivering the promised goods or services is considered transactional fraud. In the event of out-of-stock items, merchants must offer an equivalent substitute of equal or greater value.
          </p>
        </>
      ),
      highlights: [
        "Cryptographic QR validation at checkout",
        "Fair equivalent substitute policy for sold-out items",
        "Instant digital ledger receipt generated for both parties"
      ]
    },
    {
      number: "05",
      category: "Financial Settlements",
      icon: PaymentsRoundedIcon,
      title: "Subscription Plans, Platform Fees & Settlement Cycles",
      summary: "Transparent fee schedules, weekly settlement cycles, and subscription renewal policies.",
      content: (
        <>
          <p>
            <strong>Subscription Access:</strong> Access to the Offerly Biz merchant terminal, active store listing, and promotional tools requires an active Merchant Pricing Plan. If a subscription lapses, store listings and scanner capabilities may be paused until renewal.
          </p>
          <p>
            <strong>Settlement Payouts:</strong> For pre-paid or platform-collected vouchers, disbursements are calculated and settled every week (Monday payout cycle) directly into the verified commercial bank account provided during KYB verification, net of agreed platform service fees and applicable taxes (TCS/TDS/GST).
          </p>
          <p>
            <strong>Direct In-Store Payments:</strong> For dine-in and pay-at-store discount vouchers, the customer pays the discounted bill directly to your outlet via your standard POS methods. Offerly does not levy unexpected deductions on direct store collections.
          </p>
        </>
      ),
      highlights: [
        "Automated weekly settlements every Monday",
        "No hidden percentage surcharges on store billing",
        "Detailed financial ledger available 24/7 in dashboard"
      ]
    },
    {
      number: "06",
      category: "Intellectual Property",
      icon: VerifiedUserRoundedIcon,
      title: "Store Content, Brand Marks & Catalog Rights",
      summary: "Licensing of storefront photos, brand logos, and protection against copyright infringement.",
      content: (
        <>
          <p>
            You retain intellectual property ownership of your store trademarks, logos, and product photographs. By publishing your profile on Offerly, you grant Offerly a non-exclusive, worldwide, royalty-free license to display your brand assets on the customer app, search channels, marketing newsletters, and social media promotions.
          </p>
          <p>
            You warrant that uploaded menu imagery and promotional banners do not infringe on any third-party copyrights or trademarks.
          </p>
        </>
      ),
      highlights: [
        "You retain 100% ownership of your trademarks",
        "Offerly promotes your outlet across digital channels",
        "Merchants responsible for rights to uploaded photos"
      ]
    },
    {
      number: "07",
      category: "Data Sovereignty",
      icon: SecurityRoundedIcon,
      title: "Customer Privacy & Anti-Exploitation Standards",
      summary: "Customer identification data accessed via scanner is strictly restricted to immediate order fulfillment.",
      content: (
        <>
          <p>
            Customer names, telephone numbers, and profile avatars displayed during QR verification are strictly provided for immediate order fulfillment and fraud prevention.
          </p>
          <p>
            Merchants are strictly prohibited from harvesting, exporting, selling, or utilizing customer contact details for unsolicited SMS/WhatsApp marketing or sharing with external brokers. Breaching customer data sovereignty results in immediate terminal revocation and legal reporting under the Digital Personal Data Protection (DPDP) Act.
          </p>
        </>
      ),
      highlights: [
        "Zero unauthorized remarketing to scanned customers",
        "Strict compliance with DPDP Act 2023",
        "Immediate contract termination for contact leakage"
      ]
    },
    {
      number: "08",
      category: "Platform Disciplinary",
      icon: GavelRoundedIcon,
      title: "Quality Standards, Suspension & Account Termination",
      summary: "Grounds for platform warnings, temporary freeze, and permanent termination of merchant access.",
      content: (
        <>
          <p>
            Offerly reserves the absolute right to suspend, freeze, or terminate merchant terminal privileges with or without notice upon:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Refusal to honor valid Offerly customer vouchers.</li>
            <li>Fraudulent QR scans or self-redemption schemes to manipulate platform incentives.</li>
            <li>Customer abuse, unhygienic conditions, or consistent ratings below 3.0 stars.</li>
            <li>Submission of falsified business, GST, or bank records.</li>
          </ul>
          <p className="mt-2">
            Merchants may voluntarily deactivate their account by providing a 14-day notice through the Merchant Concierge, provided all outstanding customer vouchers and settlements are reconciled.
          </p>
        </>
      ),
      highlights: [
        "Transparent warning and audit mechanisms",
        "Appeals process through Merchant Grievance Concierge",
        "Orderly 14-day exit protocol upon request"
      ]
    },
    {
      number: "09",
      category: "Dispute Redressal",
      icon: SupportAgentRoundedIcon,
      title: "Concierge Dispute Resolution & Governing Law",
      summary: "Dedicated resolution timelines for merchant disputes and standard arbitration provisions.",
      content: (
        <>
          <p>
            All merchant disputes regarding transaction settlements, customer chargebacks, or technical issues are handled with priority by the Offerly Business Concierge with a target 48-hour resolution SLA.
          </p>
          <p>
            These terms are governed by and construed in accordance with the laws of India. Any unresolved dispute arising out of or in connection with this agreement shall be submitted to binding arbitration in accordance with the Arbitration and Conciliation Act.
          </p>
        </>
      ),
      highlights: [
        "Dedicated priority merchant concierge support",
        "Target 48-hour resolution turnaround",
        "Fair and independent arbitration framework"
      ]
    }
  ];

  const filteredSections = sections.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const toggleSection = (idx) => {
    setExpandedSections((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const expandAll = () => {
    const all = {};
    sections.forEach((_, idx) => (all[idx] = true));
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  return (
    <MerchantLegalLayout activeTab="terms" isEmbedded={isEmbedded}>
      <div className="space-y-8">
        
        {/* ── Hero Banner ───────────────────────────────────────────── */}
        <div className="bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-xl text-white border border-gray-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#5EB929]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5EB929]/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-[#5EB929]">
                <PolicyRoundedIcon sx={{ fontSize: 14 }} />
                <span>Commercial Operating Protocol · v2.4</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Terms of <span className="text-[#5EB929]">Operation.</span>
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">
                Last Revised: April 2026. Governing all merchant storefronts, digital QR redemptions, campaign publishing, and financial settlements across Offerly Biz.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex-shrink-0 flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Governing Status</span>
              <div className="flex items-center gap-2 text-xs font-bold text-[#5EB929]">
                <div className="w-2 h-2 rounded-full bg-[#5EB929] animate-pulse" />
                <span>Active & Legally Binding</span>
              </div>
              <span className="text-[10px] text-gray-400">Applies to all Offerly Terminals</span>
            </div>
          </div>

          {/* Feature Pills */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Verified KYB Due Diligence</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Cryptographic QR Passes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Weekly Monday Payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Customer Data Sovereignty</span>
            </div>
          </div>
        </div>

        {/* ── Search & Controls Bar ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative w-full sm:w-80">
            <SearchRoundedIcon
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              sx={{ fontSize: 18 }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clauses (e.g. settlements, QR, KYB)..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-xs font-semibold text-gray-900 rounded-xl border border-gray-200/60 focus:border-[#5EB929] outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Expand All
            </button>
            <span className="text-gray-300">•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* ── Sections List ─────────────────────────────────────────── */}
        <div className="space-y-3.5">
          {filteredSections.length > 0 ? (
            filteredSections.map((section, idx) => (
              <TermSection
                key={section.number}
                section={section}
                isExpanded={Boolean(expandedSections[idx])}
                onToggle={() => toggleSection(idx)}
              />
            ))
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
              <p className="text-sm font-bold text-gray-700">No matching operational clauses found</p>
              <p className="text-xs text-gray-400 mt-1">Try searching with a broader keyword like "fees", "scanner", or "payouts"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>

        {/* ── Acceptance & Concierge Contact Card ──────────────────── */}
        <div className="bg-gradient-to-br from-[#5EB929] to-[#4EA31F] rounded-[2rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-xl shadow-[#5EB929]/15">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-2 max-w-lg">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                Architected for Commercial Transparency
              </h3>
              <p className="text-white/80 text-xs sm:text-sm font-medium leading-relaxed">
                Have specific contractual inquiries or need custom enterprise integration terms? Our merchant concierge desk is available 7 days a week.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/merchant/contact"
                className="px-5 py-3 bg-white text-[#5EB929] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 active:scale-95 transition-all shadow-md"
              >
                Merchant Concierge
              </Link>
              <Link
                to="/merchant/privacy"
                className="px-5 py-3 bg-black/20 hover:bg-black/30 text-white rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                View Privacy Protocol
              </Link>
            </div>
          </div>
        </div>

      </div>
    </MerchantLegalLayout>
  );
};

export default LegalTerms;
