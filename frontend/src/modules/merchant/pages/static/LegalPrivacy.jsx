/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import CookieRoundedIcon from '@mui/icons-material/CookieRounded';
import ContactMailRoundedIcon from '@mui/icons-material/ContactMailRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import MerchantLegalLayout from '../../components/layout/MerchantLegalLayout';

const PrivacySection = ({ section, isExpanded, onToggle }) => {
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
                Protocol {section.number}
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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Technical Safeguards</p>
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

const LegalPrivacy = ({ isEmbedded = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({ 0: true, 1: true });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      number: "01",
      category: "Data Ingestion",
      icon: StorageRoundedIcon,
      title: "Commercial & Operational Information We Collect",
      summary: "Specific categories of merchant data required for platform operation, store listing, and settlements.",
      content: (
        <>
          <p>
            When you register an establishment on Offerly Biz, we ingest and maintain the following categories of commercial information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Store Identity:</strong> Business legal name, trade name, category, store photos, address, and geo-coordinates.</li>
            <li><strong>Owner Identification:</strong> Full name, phone number, email address, and KYB identity documents (Aadhaar, PAN).</li>
            <li><strong>Financial Credentials:</strong> Bank account numbers, IFSC codes, and GST identification for automated weekly settlements.</li>
            <li><strong>Transactional Telemetry:</strong> In-terminal QR scans, offer redemption counts, booking logs, and customer reviews.</li>
          </ul>
        </>
      ),
      highlights: [
        "Encrypted storage for bank credentials",
        "Geo-coordinates used strictly for customer proximity discovery",
        "Minimal data collection principle"
      ]
    },
    {
      number: "02",
      category: "Data Processing",
      icon: ShieldRoundedIcon,
      title: "How We Utilize Your Business Intelligence",
      summary: "Clear enumeration of how your data powers the marketplace, payouts, and campaign performance.",
      content: (
        <>
          <p>
            Your commercial data is used exclusively to facilitate your operations within the Offerly network:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Displaying your store profile, menu items, and Rocket Campaigns on the Offerly customer application.</li>
            <li>Verifying the authenticity of your commercial establishment during onboarding.</li>
            <li>Executing weekly automated Monday financial disbursements into your bank account.</li>
            <li>Generating store analytics and customer traffic insights accessible within your dashboard.</li>
            <li>Delivering operational push notifications regarding new bookings and store status changes.</li>
          </ul>
        </>
      ),
      highlights: [
        "Real-time terminal transaction processing",
        "Dedicated payout reconciliation engine",
        "No secondary commercial exploitation"
      ]
    },
    {
      number: "03",
      category: "Zero-Sale Policy",
      icon: VisibilityOffRoundedIcon,
      title: "Absolute Guarantee Against Third-Party Data Sale",
      summary: "Offerly never sells, trades, or monetizes merchant business lists or financial intelligence.",
      content: (
        <>
          <p>
            We adhere to a strict and unconditional zero-sale policy. Offerly does not sell, lease, barter, or distribute your merchant records, customer redemption data, or revenue metrics to third-party marketing companies, advertisers, or external brokerages under any circumstances.
          </p>
          <p>
            Your business metrics belong exclusively to your commercial enterprise.
          </p>
        </>
      ),
      highlights: [
        "Zero data brokering or ad-exchange sharing",
        "No third-party behavioral profiling",
        "Contractual non-disclosure guarantees"
      ]
    },
    {
      number: "04",
      category: "Cryptographic Security",
      icon: LockRoundedIcon,
      title: "Security Architecture & Encryption Standards",
      summary: "Enterprise-grade encryption in transit and at rest protecting all merchant transactions.",
      content: (
        <>
          <p>
            All communications between your terminal browser and the Offerly cloud servers are protected with 256-bit TLS 1.3 encryption. Sensitive financial records and KYB identification artifacts are stored in encrypted databases using AES-256 standards.
          </p>
          <p>
            Access to our production database cluster is governed by zero-trust identity policies, strict role-based access control (RBAC), and automated 24/7 intrusion detection telemetry.
          </p>
        </>
      ),
      highlights: [
        "TLS 1.3 encryption in transit",
        "AES-256 encryption at rest",
        "Automated daily vulnerability testing"
      ]
    },
    {
      number: "05",
      category: "Authorized Partners",
      icon: CloudQueueRoundedIcon,
      title: "Trusted Sub-processors & Infrastructure Partners",
      summary: "Verified technical partners strictly bound by compliance and non-disclosure standards.",
      content: (
        <>
          <p>
            To execute specific platform functions, Offerly shares necessary minimal data with verified, compliant sub-processors:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Payment Gateways & Banking Partners:</strong> (e.g. Razorpay/Stripe, verified scheduled banks) for payout transfers and subscription billing.</li>
            <li><strong>Cloud Infrastructure:</strong> High-security ISO-27001 certified cloud environments for encrypted hosting.</li>
            <li><strong>Notification Relays:</strong> Google Firebase Cloud Messaging for real-time terminal alerts and order sound triggers.</li>
          </ul>
          <p className="mt-2">
            Every sub-processor is bound by rigorous Data Protection Agreements (DPAs) meeting or exceeding the standards of this Privacy Protocol.
          </p>
        </>
      ),
      highlights: [
        "PCI-DSS compliant payment gateways",
        "ISO 27001 certified cloud infrastructure",
        "Strict contractual processing restrictions"
      ]
    },
    {
      number: "06",
      category: "POS Privacy",
      icon: VerifiedUserRoundedIcon,
      title: "Customer Voucher Data & Terminal Privacy",
      summary: "Protocols protecting customer information displayed on your scanner screen.",
      content: (
        <>
          <p>
            When a customer presents a QR pass at your counter, the terminal momentarily displays their verification token, first name, and order items. This ephemeral display is intended exclusively for verifying voucher authenticity.
          </p>
          <p>
            Merchants do not receive raw access to the customer's permanent financial credentials or private home addresses. We urge store staff to respect customer privacy and refrain from recording personal customer numbers outside the platform.
          </p>
        </>
      ),
      highlights: [
        "Ephemeral customer token verification",
        "Masked sensitive customer identifiers",
        "Protection for both store and consumer"
      ]
    },
    {
      number: "07",
      category: "Merchant Rights",
      icon: ManageAccountsRoundedIcon,
      title: "Data Sovereignty, Export & Deletion Rights",
      summary: "Complete authority to inspect, export, correct, or request deletion of your store records.",
      content: (
        <>
          <p>
            Under the Digital Personal Data Protection (DPDP) Act and Offerly's operational framework, you possess absolute sovereignty over your commercial records:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Right to Export:</strong> You can download comprehensive transaction ledgers, redemption reports, and review histories at any time directly from the dashboard.</li>
            <li><strong>Right to Rectification:</strong> You can update outlet operating hours, business phone numbers, menu catalogs, and bank accounts through the Profile view or Concierge.</li>
            <li><strong>Right to Erasure:</strong> Upon verified store de-registration, your commercial profile will be unlisted, and non-financial records will be purged following statutory tax retention periods.</li>
          </ul>
        </>
      ),
      highlights: [
        "24/7 on-demand financial ledger exports",
        "Self-serve profile update tools",
        "Transparent statutory data retention schedules"
      ]
    },
    {
      number: "08",
      category: "Cookies & Sessions",
      icon: CookieRoundedIcon,
      title: "Session Tokens & Local Browser Storage",
      summary: "Transparent explanation of cookies and local tokens used by the merchant terminal.",
      content: (
        <>
          <p>
            The Offerly Biz terminal uses secure session tokens and local browser storage to keep you logged in to your merchant workspace, remember your scanner preferences, and display real-time push alerts.
          </p>
          <p>
            We do not deploy invasive third-party cross-site tracking cookies or advertising pixels on the merchant portal.
          </p>
        </>
      ),
      highlights: [
        "Zero cross-site advertising trackers",
        "Strictly functional session management",
        "Instant token invalidation upon sign-out"
      ]
    },
    {
      number: "09",
      category: "Compliance Office",
      icon: ContactMailRoundedIcon,
      title: "Data Protection Officer & Grievance Contact",
      summary: "Dedicated escalation channel for privacy inquiries, audit requests, and security disclosures.",
      content: (
        <>
          <p>
            If you have questions regarding this Privacy Protocol, wish to report a security disclosure, or seek assistance with data rights, contact our Data Protection Office:
          </p>
          <div className="mt-3 p-3.5 bg-white rounded-xl border border-gray-100 space-y-1 font-mono text-xs text-gray-700">
            <p><strong>Offerly Privacy & Data Protection Desk</strong></p>
            <p>Email: <a href="mailto:privacy@offerly.in" className="text-[#5EB929] hover:underline">privacy@offerly.in</a></p>
            <p>Merchant Grievance Desk: <a href="mailto:biz-support@offerly.in" className="text-[#5EB929] hover:underline">biz-support@offerly.in</a></p>
            <p>Turnaround SLA: 24 to 48 business hours</p>
          </div>
        </>
      ),
      highlights: [
        "Dedicated Data Protection Desk",
        "Fast 24-48 hour turnaround SLA",
        "Direct escalation pathway"
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
    <MerchantLegalLayout activeTab="privacy" isEmbedded={isEmbedded}>
      <div className="space-y-8">
        
        {/* ── Hero Banner ───────────────────────────────────────────── */}
        <div className="bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-xl text-white border border-gray-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#5EB929]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5EB929]/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-[#5EB929]">
                <SecurityRoundedIcon sx={{ fontSize: 14 }} />
                <span>Data Security Hub · v2.4</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Privacy <span className="text-[#5EB929]">Protocol.</span>
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">
                Privacy by design. How we shield, manage, and encrypt your commercial intelligence, banking credentials, and terminal redemption records.
              </p>
            </div>

            {/* Quick Trust Pill */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex-shrink-0 flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Security Architecture</span>
              <div className="flex items-center gap-2 text-xs font-bold text-[#5EB929]">
                <LockRoundedIcon sx={{ fontSize: 14 }} />
                <span>AES-256 & TLS 1.3 Active</span>
              </div>
              <span className="text-[10px] text-gray-400">DPDP Act 2023 Compliant</span>
            </div>
          </div>

          {/* Security Badges */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Zero Data Selling Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Encrypted Settlement Ledgers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Role-Based Terminal Access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
              <span>Full Data Export Sovereignty</span>
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
              placeholder="Search privacy topics (e.g. cookies, bank, encryption)..."
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
              <PrivacySection
                key={section.number}
                section={section}
                isExpanded={Boolean(expandedSections[idx])}
                onToggle={() => toggleSection(idx)}
              />
            ))
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
              <p className="text-sm font-bold text-gray-700">No matching privacy protocols found</p>
              <p className="text-xs text-gray-400 mt-1">Try searching for terms like "bank", "sub-processors", or "deletion"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>

        {/* ── Trust Commitment Box ──────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 text-[#5EB929] flex items-center justify-center flex-shrink-0">
              <VerifiedUserRoundedIcon sx={{ fontSize: 24 }} />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                Continuous Security Audits
              </h4>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Our infrastructure and payment gateways undergo automated daily scans and periodic external audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              to="/merchant/terms"
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              View Terms
            </Link>
            <Link
              to="/merchant/support"
              className="px-4 py-2.5 rounded-xl bg-[#5EB929] hover:bg-[#52a623] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-[#5EB929]/20"
            >
              Get Support
            </Link>
          </div>
        </div>

      </div>
    </MerchantLegalLayout>
  );
};

export default LegalPrivacy;
