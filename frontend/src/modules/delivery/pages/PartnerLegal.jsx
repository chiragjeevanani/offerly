import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { supportAPI } from '../../../api/support.api';
import { Card, SectionLabel } from '../components/PartnerUI';
import { LEGAL_UPDATED, PARTNER_PRIVACY, PARTNER_TERMS } from '../legalContent';

const DOCS = {
  terms: { title: 'Partner Terms', sections: PARTNER_TERMS, other: { to: '/delivery/privacy', label: 'Privacy Policy' } },
  privacy: { title: 'Privacy Policy', sections: PARTNER_PRIVACY, other: { to: '/delivery/terms', label: 'Partner Terms' } },
};

// /delivery/terms and /delivery/privacy - open to everyone (signed in or not),
// so they can also be linked from the app store listing.
const PartnerLegal = ({ doc }) => {
  const navigate = useNavigate();
  const { title, sections, other } = DOCS[doc];
  const { data: support } = useQuery({
    queryKey: ['supportContacts'],
    queryFn: async () => (await supportAPI.getContacts())?.data,
    staleTime: 300_000,
  });
  const contact = support?.merchant?.email || support?.customer?.email;
  const phone = support?.merchant?.phone || support?.customer?.phone;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-lg mx-auto pb-12">
        <div className="px-4 py-4 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/delivery'))}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700"
            aria-label="Back"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">{title}</h1>
            <p className="text-[11px] text-gray-400 font-medium mt-1">Offerly Delivery Partner · Updated {LEGAL_UPDATED}</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {sections.map((s, i) => (
            <Card key={s.title} className="p-5">
              <SectionLabel>{String(i + 1).padStart(2, '0')}</SectionLabel>
              <h2 className="text-[15px] font-bold text-gray-900 mt-1">{s.title}</h2>
              <div className="mt-2 space-y-2">
                {s.body.map((p) => (
                  <p key={p.slice(0, 40)} className="text-[13px] text-gray-600 leading-relaxed">{p}</p>
                ))}
              </div>
            </Card>
          ))}

          {(contact || phone) && (
            <Card className="p-5">
              <SectionLabel>Contact</SectionLabel>
              <p className="text-[13px] text-gray-600 mt-1">Offerly partner support</p>
              {contact && <a href={`mailto:${contact}`} className="block text-[13px] font-bold text-[#5EB929] mt-1">{contact}</a>}
              {phone && <a href={`tel:${phone}`} className="block text-[13px] font-bold text-[#5EB929] mt-1">{phone}</a>}
            </Card>
          )}

          <Link to={other.to} className="block text-center text-[12px] font-bold text-[#5EB929] py-2">
            Read the {other.label} →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PartnerLegal;
