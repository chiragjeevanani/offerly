import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cityAPI } from '../../../api/city.api';
import { deliveryAPI } from '../../../api/delivery.api';
import { storage } from '../../../utils/storage';
import { useApp } from '../../customer/context/AppContext';
import PageTransition from '../../customer/components/ui/PageTransition';
import { BrandMark, Card, PrimaryButton, SectionLabel, TextField } from '../components/PartnerUI';
import DocumentPicker from '../components/DocumentPicker';
import { VEHICLES, uploadDocument } from '../utils/partner';

const PartnerSignup = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login } = useApp();
  const [cities, setCities] = useState([]);
  const [saving, setSaving] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    licenceNumber: '',
  });
  const [files, setFiles] = useState({ profilePhoto: null, licenceImage: null, idProofImage: null });

  useEffect(() => {
    cityAPI.getAll()
      .then((res) => setCities((res?.cities || []).map((c) => c.name)))
      .catch(() => setCities([]));
  }, []);

  if (!state?.verificationToken) return <Navigate to="/delivery/signup" replace />;

  const motorised = form.vehicleType !== 'bicycle';
  const set = (key) => (e) => {
    const value = key === 'vehicleNumber' || key === 'licenceNumber' ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.city) e.city = 'Choose the city you will deliver in';
    if (motorised && form.vehicleNumber.trim().length < 4) e.vehicleNumber = 'Enter your vehicle number';
    if (motorised && form.licenceNumber.trim().length < 5) e.licenceNumber = 'Enter your driving licence number';
    if (!files.idProofImage) e.idProofImage = 'Upload a photo of your Aadhaar or other government ID';
    if (motorised && !files.licenceImage) e.licenceImage = 'Upload a photo of your driving licence';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please complete the highlighted fields');
      return;
    }
    try {
      // 1. Create the account (returns a session), 2. upload documents with it.
      setSaving('Creating your account...');
      const res = await deliveryAPI.registerPartner(state.verificationToken, {
        phone: state.phone,
        name: form.name.trim(),
        email: form.email.trim(),
        city: form.city,
        vehicleType: form.vehicleType,
        vehicleNumber: motorised ? form.vehicleNumber.trim() : '',
        licenceNumber: motorised ? form.licenceNumber.trim() : '',
      });
      storage.setToken(res.token);
      login(res.user);

      setSaving('Uploading documents...');
      try {
        const [profilePhoto, licenceImage, idProofImage] = await Promise.all([
          uploadDocument(files.profilePhoto),
          uploadDocument(files.licenceImage),
          uploadDocument(files.idProofImage),
        ]);
        await deliveryAPI.updateDocuments({ licenceImage: licenceImage || '', idProofImage: idProofImage || '' });
        if (profilePhoto) await deliveryAPI.updateMe({ profilePhoto });
      } catch {
        toast.error('Account created, but documents did not upload. Add them from the next screen.');
      }

      toast.success('Application submitted!');
      navigate('/delivery', { replace: true });
    } catch (err) {
      toast.error(err?.error || 'Could not create your account');
    } finally {
      setSaving('');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] py-8 px-4">
        <form onSubmit={submit} className="w-full max-w-lg mx-auto space-y-5" noValidate>
          <BrandMark subtitle="Partner Application" />

          <Card className="p-5 space-y-4">
            <SectionLabel>About you</SectionLabel>
            <div className="flex items-center gap-4">
              <DocumentPicker
                round
                label="Photo"
                file={files.profilePhoto}
                onChange={(f) => setFiles((x) => ({ ...x, profilePhoto: f }))}
              />
              <div className="flex-1 space-y-1">
                <p className="text-[13px] font-bold text-gray-900">+91 {state.phone}</p>
                <p className="text-[11px] font-medium text-[#5EB929]">Mobile number verified</p>
              </div>
            </div>
            <TextField label="Full name (as on ID)" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
            <TextField label="Email (optional)" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
            <label className="block">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">City you'll deliver in</span>
              <select
                value={form.city}
                onChange={set('city')}
                className={`mt-1.5 w-full h-12 px-4 bg-[#F8FAFC] border rounded-xl text-[13px] font-semibold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]/50 ${errors.city ? 'border-red-300' : 'border-gray-100'}`}
              >
                <option value="">Select city</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.city && <span className="block mt-1 text-[10px] font-bold text-red-500">{errors.city}</span>}
            </label>
          </Card>

          <Card className="p-5 space-y-4">
            <SectionLabel>Your vehicle</SectionLabel>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Vehicle type">
              {VEHICLES.map((v) => {
                const active = form.vehicleType === v.key;
                return (
                  <button
                    key={v.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm((f) => ({ ...f, vehicleType: v.key }))}
                    className={`rounded-2xl border-2 py-3 flex flex-col items-center gap-1 transition-all ${active ? 'border-[#5EB929] bg-[#5EB929]/5 text-[#3F7F17]' : 'border-gray-100 text-gray-400'}`}
                  >
                    <v.icon sx={{ fontSize: 22 }} />
                    <span className="text-[10px] font-bold">{v.label}</span>
                  </button>
                );
              })}
            </div>
            {motorised && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField label="Vehicle number" placeholder="MP09 AB 1234" value={form.vehicleNumber} onChange={set('vehicleNumber')} error={errors.vehicleNumber} />
                <TextField label="Driving licence no." value={form.licenceNumber} onChange={set('licenceNumber')} error={errors.licenceNumber} />
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <SectionLabel>Documents</SectionLabel>
            <p className="text-[12px] text-gray-500 font-medium -mt-2">Clear photos help us approve you faster. Only Offerly's team can see them.</p>
            <div className="grid grid-cols-2 gap-3">
              <DocumentPicker
                label="Government ID (Aadhaar / PAN)"
                file={files.idProofImage}
                error={errors.idProofImage}
                onChange={(f) => { setFiles((x) => ({ ...x, idProofImage: f })); setErrors((x) => ({ ...x, idProofImage: '' })); }}
              />
              {motorised && (
                <DocumentPicker
                  label="Driving licence"
                  file={files.licenceImage}
                  error={errors.licenceImage}
                  onChange={(f) => { setFiles((x) => ({ ...x, licenceImage: f })); setErrors((x) => ({ ...x, licenceImage: '' })); }}
                />
              )}
            </div>
          </Card>

          <p className="text-center text-[11px] font-medium text-gray-500">
            By submitting you agree to the{' '}
            <Link to="/delivery/terms" className="font-bold text-[#5EB929]">Partner Terms</Link> and{' '}
            <Link to="/delivery/privacy" className="font-bold text-[#5EB929]">Privacy Policy</Link>.
          </p>
          <PrimaryButton type="submit" loading={Boolean(saving)} className="w-full">
            Submit Application
          </PrimaryButton>
          {saving && <p className="text-center text-[11px] font-semibold text-gray-500" aria-live="polite">{saving}</p>}
        </form>
      </div>
    </PageTransition>
  );
};

export default PartnerSignup;
