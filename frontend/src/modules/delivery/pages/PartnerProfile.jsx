import { useEffect, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Link } from 'react-router-dom';
import { useApp } from '../../customer/context/AppContext';
import { deliveryAPI } from '../../../api/delivery.api';
import { supportAPI } from '../../../api/support.api';
import { Card, PrimaryButton, SectionLabel, TextField } from '../components/PartnerUI';
import DocumentPicker from '../components/DocumentPicker';
import { VEHICLES, uploadDocument } from '../utils/partner';
import PushOptInCard from '../../../components/common/PushOptInCard';

const PartnerProfile = ({ partner }) => {
  const { logout } = useApp();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState(partner.profilePhoto || null);
  const [bank, setBank] = useState(partner.bankDetails);
  const [vehicleNumber, setVehicleNumber] = useState(partner.vehicleNumber || '');
  const [saving, setSaving] = useState('');

  useEffect(() => {
    setBank(partner.bankDetails);
  }, [partner.bankDetails]);

  const { data: support } = useQuery({
    queryKey: ['supportContacts'],
    queryFn: async () => (await supportAPI.getContacts())?.data,
    staleTime: 300_000,
  });
  const helpline = support?.merchant?.phone || support?.customer?.phone;

  const save = async (key, payload, message) => {
    setSaving(key);
    try {
      await deliveryAPI.updateMe(payload);
      await queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
      toast.success(message);
    } catch (err) {
      toast.error(err?.error || 'Could not save');
    } finally {
      setSaving('');
    }
  };

  const savePhoto = async (file) => {
    setPhoto(file);
    setSaving('photo');
    try {
      const url = await uploadDocument(file);
      await deliveryAPI.updateMe({ profilePhoto: url });
      await queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err?.error || err?.message || 'Could not upload photo');
      setPhoto(partner.profilePhoto || null);
    } finally {
      setSaving('');
    }
  };

  // Don't leave the account "online" in the pool after signing out.
  const signOut = async () => {
    if (partner.isOnline) await deliveryAPI.updateMe({ isOnline: false }).catch(() => {});
    logout();
  };

  const vehicle = VEHICLES.find((v) => v.key === partner.vehicleType);
  const setBankField = (k) => (e) => setBank((b) => ({ ...b, [k]: k === 'ifscCode' ? e.target.value.toUpperCase() : e.target.value }));

  return (
    <div className="px-4 pt-5 space-y-5 pb-4">
      <Card className="p-5 flex items-center gap-4">
        <DocumentPicker round label="Change photo" file={photo} onChange={savePhoto} />
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{partner.name}</h1>
          <p className="text-[12px] font-semibold text-gray-500">+91 {partner.phone}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#3F7F17] bg-[#5EB929]/10 px-2 py-0.5 rounded-full">
            <VerifiedRoundedIcon sx={{ fontSize: 12 }} /> Verified partner · {partner.city}
          </span>
        </div>
      </Card>

      <PushOptInCard persona="delivery" />

      <Card className="p-5 space-y-4">
        <SectionLabel>Vehicle</SectionLabel>
        <div className="flex items-center gap-3">
          {vehicle && (
            <span className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
              <vehicle.icon />
            </span>
          )}
          <p className="text-[14px] font-bold text-gray-900">{vehicle?.label || partner.vehicleType}</p>
        </div>
        {partner.vehicleType !== 'bicycle' && (
          <div className="flex gap-2 items-end">
            <TextField className="flex-1" label="Vehicle number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} />
            <PrimaryButton
              variant="light"
              loading={saving === 'vehicle'}
              disabled={vehicleNumber.trim() === (partner.vehicleNumber || '')}
              onClick={() => save('vehicle', { vehicleNumber: vehicleNumber.trim() }, 'Vehicle number saved')}
              className="!min-h-[48px] h-12"
            >
              <EditRoundedIcon sx={{ fontSize: 16 }} /> Save
            </PrimaryButton>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <SectionLabel>Payout details</SectionLabel>
        <p className="text-[12px] text-gray-500 font-medium -mt-1">Where Offerly sends your earnings. A UPI ID is enough.</p>
        <TextField label="UPI ID" placeholder="name@bank" value={bank.upiId} onChange={setBankField('upiId')} />
        <TextField label="Account holder name" value={bank.accountHolderName} onChange={setBankField('accountHolderName')} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Account number" inputMode="numeric" value={bank.accountNumber} onChange={setBankField('accountNumber')} />
          <TextField label="IFSC" value={bank.ifscCode} onChange={setBankField('ifscCode')} />
        </div>
        <PrimaryButton className="w-full" loading={saving === 'bank'} onClick={() => save('bank', { bankDetails: bank }, 'Payout details saved')}>
          Save Payout Details
        </PrimaryButton>
      </Card>

      {helpline && (
        <Card className="p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center"><SupportAgentRoundedIcon /></span>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-gray-900">Need help?</p>
            <p className="text-[11px] font-medium text-gray-400">Offerly partner support</p>
          </div>
          <a href={`tel:${helpline}`} className="h-10 px-4 rounded-xl bg-gray-900 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <PhoneRoundedIcon sx={{ fontSize: 16 }} /> Call
          </a>
        </Card>
      )}

      <Card className="divide-y divide-gray-50">
        {[
          ['/delivery/terms', 'Partner Terms'],
          ['/delivery/privacy', 'Privacy Policy'],
        ].map(([to, label]) => (
          <Link key={to} to={to} className="flex items-center justify-between px-4 py-3.5 text-[13px] font-bold text-gray-800">
            <span className="flex items-center gap-3"><DescriptionRoundedIcon sx={{ fontSize: 18 }} className="text-gray-400" /> {label}</span>
            <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300" />
          </Link>
        ))}
      </Card>

      <PrimaryButton variant="danger" className="w-full" onClick={signOut}>
        <LogoutRoundedIcon sx={{ fontSize: 18 }} /> Sign Out
      </PrimaryButton>
    </div>
  );
};

export default PartnerProfile;
