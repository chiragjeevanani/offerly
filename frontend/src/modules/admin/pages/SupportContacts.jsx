import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/admin.api';

const EMPTY = { email: '', phone: '', whatsapp: '', hours: '' };

const FIELDS = [
  { key: 'email', label: 'Support email', icon: EmailRoundedIcon, type: 'email', placeholder: 'support@yourdomain.com' },
  { key: 'phone', label: 'Support phone', icon: PhoneRoundedIcon, type: 'tel', placeholder: '+91 98765 43210' },
  { key: 'whatsapp', label: 'WhatsApp number (optional)', icon: WhatsAppIcon, type: 'tel', placeholder: '+91 98765 43210' },
  { key: 'hours', label: 'Support hours (optional)', icon: AccessTimeRoundedIcon, type: 'text', placeholder: 'Mon-Sat, 10 AM to 7 PM' },
];

const ContactCard = ({ title, subtitle, icon: Icon, value, onChange, onSave, saving, dirty }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center">
        <Icon sx={{ fontSize: 20 }} />
      </div>
      <div>
        <h3 className="text-[14px] font-semibold text-gray-800">{title}</h3>
        <p className="text-[12px] text-gray-500">{subtitle}</p>
      </div>
    </div>
    <div className="p-5 space-y-4">
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{f.label}</span>
          <div className="relative mt-1.5">
            <f.icon sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type={f.type}
              value={value[f.key]}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full h-11 pl-10 pr-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10"
            />
          </div>
        </label>
      ))}
      <p className="text-[11px] text-gray-400">Leave a field empty to hide it in the app.</p>
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="w-full h-11 rounded-xl bg-[#5EB929] text-white text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
);

const SupportContacts = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['supportContacts'],
    queryFn: async () => (await adminAPI.getSupportContacts())?.data || {},
  });

  const [customer, setCustomer] = useState(EMPTY);
  const [merchant, setMerchant] = useState(EMPTY);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!data) return;
    setCustomer({ ...EMPTY, ...(data.customer || {}) });
    setMerchant({ ...EMPTY, ...(data.merchant || {}) });
  }, [data]);

  const isDirty = (current, saved) => FIELDS.some((f) => (current[f.key] || '').trim() !== (saved?.[f.key] || ''));

  const save = async (audience, value) => {
    setSaving(audience);
    try {
      const res = await adminAPI.updateSupportContacts({ [audience]: value });
      queryClient.setQueryData(['supportContacts'], res.data);
      toast.success(audience === 'customer' ? 'Customer app support details saved' : 'Merchant app support details saved');
    } catch (err) {
      toast.error(err?.error || err?.message || 'Could not save');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
          <SupportAgentRoundedIcon />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Support Contacts</h1>
          <p className="text-[12px] text-gray-500">
            The email, phone and WhatsApp numbers shown on the Contact and Support pages. Changes show in the apps straight away.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ContactCard
            title="Customer app"
            subtitle="Shown to customers on Contact Us"
            icon={PersonRoundedIcon}
            value={customer}
            onChange={setCustomer}
            onSave={() => save('customer', customer)}
            saving={saving === 'customer'}
            dirty={isDirty(customer, data?.customer)}
          />
          <ContactCard
            title="Merchant app"
            subtitle="Shown to merchants on Support, Contact and their application status"
            icon={StorefrontRoundedIcon}
            value={merchant}
            onChange={setMerchant}
            onSave={() => save('merchant', merchant)}
            saving={saving === 'merchant'}
            dirty={isDirty(merchant, data?.merchant)}
          />
        </div>
      )}
    </div>
  );
};

export default SupportContacts;
