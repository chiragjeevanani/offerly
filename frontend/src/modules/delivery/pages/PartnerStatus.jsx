import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useApp } from '../../customer/context/AppContext';
import { deliveryAPI } from '../../../api/delivery.api';
import { BrandMark, Card, PrimaryButton, SectionLabel } from '../components/PartnerUI';
import DocumentPicker from '../components/DocumentPicker';
import { uploadDocument } from '../utils/partner';
import PushOptInCard from '../../../components/common/PushOptInCard';
import { clearPartnerCache } from '../utils/partnerCache';

const COPY = {
  pending: {
    icon: HourglassTopRoundedIcon,
    tone: 'bg-amber-50 text-amber-600',
    title: 'Application under review',
    body: 'Our team is checking your details. This usually takes a day. We will let you know here as soon as you are approved.',
  },
  rejected: {
    icon: ErrorOutlineRoundedIcon,
    tone: 'bg-red-50 text-red-500',
    title: 'Application not approved',
    body: 'Please fix the issue below and resubmit your documents.',
  },
  blocked: {
    icon: BlockRoundedIcon,
    tone: 'bg-gray-100 text-gray-500',
    title: 'Account paused',
    body: 'Your partner account has been paused by Offerly. Please contact support.',
  },
};

// Shown until an admin approves the partner. Lets them add missing documents
// or resubmit after a rejection.
const PartnerStatus = ({ partner }) => {
  const { logout } = useApp();
  const queryClient = useQueryClient();
  const copy = COPY[partner.status] || COPY.pending;
  const Icon = copy.icon;
  const motorised = partner.vehicleType !== 'bicycle';
  const docs = partner.documents || {};
  const missingDocs = !docs.idProofImage || (motorised && !docs.licenceImage);
  const canEditDocs = partner.status === 'rejected' || (partner.status === 'pending' && missingDocs);

  const [files, setFiles] = useState({ idProofImage: docs.idProofImage || null, licenceImage: docs.licenceImage || null });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const submitDocs = async () => {
    if (!files.idProofImage || (motorised && !files.licenceImage)) {
      toast.error('Add all the required photos');
      return;
    }
    setSaving(true);
    try {
      const [idProofImage, licenceImage] = await Promise.all([uploadDocument(files.idProofImage), uploadDocument(files.licenceImage)]);
      await deliveryAPI.updateDocuments({ idProofImage, licenceImage: licenceImage || '' });
      toast.success('Documents submitted');
      await queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
    } catch (err) {
      toast.error(err?.error || err?.message || 'Could not submit documents');
    } finally {
      setSaving(false);
    }
  };

  const recheck = async () => {
    setChecking(true);
    await queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4">
      <div className="max-w-md mx-auto space-y-5">
        <BrandMark />

        <Card className="p-6 text-center">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${copy.tone}`}>
            <Icon sx={{ fontSize: 32 }} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-gray-900">{copy.title}</h2>
          <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">{copy.body}</p>
          {partner.status === 'rejected' && partner.rejectionReason && (
            <p className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-[12px] font-semibold text-red-600 text-left">
              {partner.rejectionReason}
            </p>
          )}
          {partner.status === 'pending' && !missingDocs && (
            <button onClick={recheck} disabled={checking} className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#5EB929]">
              <RefreshRoundedIcon sx={{ fontSize: 16 }} className={checking ? 'animate-spin' : ''} /> Check status
            </button>
          )}
        </Card>

        {partner.status !== 'blocked' && <PushOptInCard persona="delivery" hideWhenOn />}

        <Card className="p-5 space-y-3">
          <SectionLabel>Your application</SectionLabel>
          {[
            ['Name', partner.name],
            ['Mobile', `+91 ${partner.phone}`],
            ['City', partner.city],
            ['Vehicle', `${partner.vehicleType}${partner.vehicleNumber ? ` · ${partner.vehicleNumber}` : ''}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-[13px]">
              <span className="font-semibold text-gray-400">{k}</span>
              <span className="font-bold text-gray-900 capitalize text-right">{v}</span>
            </div>
          ))}
        </Card>

        {canEditDocs && (
          <Card className="p-5 space-y-4">
            <SectionLabel>{missingDocs && partner.status === 'pending' ? 'Add your documents' : 'Update your documents'}</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <DocumentPicker label="Government ID" file={files.idProofImage} onChange={(f) => setFiles((x) => ({ ...x, idProofImage: f }))} />
              {motorised && (
                <DocumentPicker label="Driving licence" file={files.licenceImage} onChange={(f) => setFiles((x) => ({ ...x, licenceImage: f }))} />
              )}
            </div>
            <PrimaryButton onClick={submitDocs} loading={saving} className="w-full">
              {partner.status === 'rejected' ? 'Resubmit for Review' : 'Submit Documents'}
            </PrimaryButton>
          </Card>
        )}

        <PrimaryButton variant="light" onClick={() => { clearPartnerCache(); logout(); }} className="w-full">
          <LogoutRoundedIcon sx={{ fontSize: 18 }} /> Sign Out
        </PrimaryButton>
      </div>
    </div>
  );
};

export default PartnerStatus;
