import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import toast from 'react-hot-toast';

const documentTypes = [
  { type: 'aadhaar_front', label: 'Aadhaar front', required: true, accept: 'image/*,application/pdf', maxSize: 5 },
  { type: 'aadhaar_back', label: 'Aadhaar back', required: true, accept: 'image/*,application/pdf', maxSize: 5 },
  { type: 'pan_card', label: 'PAN card', required: true, accept: 'image/*,application/pdf', maxSize: 5 },
  { type: 'owner_photo', label: 'Owner photo', required: true, accept: 'image/*', maxSize: 2 },
  { type: 'business_registration', label: 'Business registration', required: true, accept: 'image/*,application/pdf', maxSize: 5 },
  { type: 'store_front_photo', label: 'Store front photo', required: true, accept: 'image/*', maxSize: 5 },
];

const KYBDocumentsStep = ({ data, category, onSubmit, onBack, loading }) => {
  const [documents, setDocuments] = useState(data.documents || []);
  const [gstNumber, setGstNumber] = useState(data.gstNumber || '');
  const [errors, setErrors] = useState({});
  const fileInputRefs = useRef({});
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const handleFileUpload = (docType, label) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const docConfig = documentTypes.find(d => d.type === docType);
    if (file.size > docConfig.maxSize * 1024 * 1024) {
      toast.error(`Max ${docConfig.maxSize}MB allowed`);
      return;
    }

    try {
      setUploadingDoc(docType);
      const { uploadAPI } = await import('../../../../api/upload.api');
      const response = await uploadAPI.uploadImage(file);
      const imageUrl = response?.url || response;

      if (!imageUrl) throw new Error('Upload failed');

      setDocuments(prev => {
        const filtered = prev.filter(d => d.type !== docType);
        return [...filtered, { type: docType, label, url: imageUrl, name: file.name, size: file.size }];
      });
      toast.success(`${label} captured`);
    } catch (error) {
      toast.error(`Upload failed for ${label}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const isDocumentUploaded = (docType) => documents.some(d => d.type === docType && d.url);

  const validate = () => {
    const newErrors = {};
    documentTypes.forEach(doc => {
      if (doc.required && !isDocumentUploaded(doc.type)) {
        newErrors[doc.type] = `${doc.label} required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (uploadingDoc) { toast.error('Upload in progress'); return; }
    if (validate()) onSubmit({ documents, gstNumber });
    else toast.error('Check all documents');
  };

  const renderUploadBox = (doc) => {
    const uploaded = documents.find(d => d.type === doc.type);
    const isUploading = uploadingDoc === doc.type;

    return (
      <div key={doc.type} className="space-y-1.5">
        <label className="text-[10px] font-bold text-gray-400 px-1">{doc.label}</label>
        <div 
          onClick={() => !isUploading && fileInputRefs.current[doc.type]?.click()}
          className={`relative h-28 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
            isDocumentUploaded(doc.type) 
              ? 'border-[#5EB929]/30 bg-[#5EB929]/5' 
              : 'border-gray-100 bg-background hover:border-[#5EB929]/30'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#5EB929]/30 border-t-[#5EB929] rounded-full animate-spin" />
              <span className="text-[9px] font-bold text-[#5EB929]">Uploading...</span>
            </div>
          ) : isDocumentUploaded(doc.type) ? (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
               {uploaded.url.match(/\.(jpg|jpeg|png|gif|webp)$|^data:image/) ? (
                 <img src={uploaded.url} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />
               ) : (
                 <DescriptionRoundedIcon className="text-[#5EB929]/20 absolute" sx={{ fontSize: 60 }} />
               )}
               <CheckCircleRoundedIcon className="text-[#5EB929] mb-1" sx={{ fontSize: 24 }} />
               <span className="text-[9px] font-bold text-[#5EB929] uppercase tracking-tight">Uploaded</span>
               <button 
                 onClick={(e) => { e.stopPropagation(); setDocuments(prev => prev.filter(d => d.type !== doc.type)); }}
                 className="absolute top-2 right-2 w-6 h-6 bg-white/80 backdrop-blur-sm text-red-500 rounded-lg flex items-center justify-center shadow-sm active:scale-90"
               >
                 <span className="text-xs font-bold">×</span>
               </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <UploadFileRoundedIcon className="text-gray-300" sx={{ fontSize: 28 }} />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Tap to upload</span>
            </div>
          )}
          <input ref={el => fileInputRefs.current[doc.type] = el} type="file" accept={doc.accept} className="hidden" onChange={handleFileUpload(doc.type, doc.label)} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-gray-200/50 border border-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5EB929]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 space-y-8">
          <div className="space-y-1">
            <h2 className="text-gray-900 font-bold text-xl tracking-tight">KYB Verification</h2>
            <p className="text-gray-400 text-[10px] font-bold tracking-tight">Secure document protocol for business identity</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Owner Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <AssignmentIndRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 18 }} />
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Owner identity</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {documentTypes.slice(0, 4).map(renderUploadBox)}
              </div>
            </div>

            {/* Business Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <BusinessCenterRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 18 }} />
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Business proof</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {documentTypes.slice(4).map(renderUploadBox)}
              </div>
            </div>

            {/* GST */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 px-1">GST Number (Optional)</label>
              <div className="relative group">
                <DescriptionRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                <input 
                  type="text" placeholder="e.g. 22AAAAA0000A1Z5" value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="w-full h-12 pl-11 pr-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all"
                />
              </div>
            </div>

            {/* Protocol Guidelines */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Guidelines</p>
               <div className="grid grid-cols-2 gap-2">
                  {['High-res original', 'Full visibility', 'Valid expiry', 'Matching names'].map(text => (
                    <div key={text} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 bg-[#5EB929] rounded-full" />
                      <span className="text-[9px] font-bold text-gray-500">{text}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-4 pt-6 border-t border-gray-50">
               <motion.button 
                 type="button" whileTap={{ scale: 0.98 }} onClick={onBack}
                 className="flex-1 h-14 bg-gray-50 text-gray-400 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-2 border border-gray-100"
               >
                 <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Back
               </motion.button>
               <motion.button 
                 type="submit" whileTap={{ scale: 0.98 }} disabled={loading || uploadingDoc}
                 className="flex-[2] h-14 bg-[#5EB929] text-white rounded-2xl font-bold text-[12px] shadow-lg shadow-[#5EB929]/20 flex items-center justify-center gap-2"
               >
                 {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Continue Protocol <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></>}
               </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default KYBDocumentsStep;
