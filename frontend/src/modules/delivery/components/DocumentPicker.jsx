import { useEffect, useId, useMemo } from 'react';
import AddAPhotoRoundedIcon from '@mui/icons-material/AddAPhotoRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import toast from 'react-hot-toast';

const MAX_MB = 8;

// Photo picker with a preview. `file` is a File (new pick) or a URL (already saved).
const DocumentPicker = ({ label, file, onChange, error, round = false }) => {
  const id = useId();
  const preview = useMemo(() => (!file ? '' : typeof file === 'string' ? file : URL.createObjectURL(file)), [file]);
  useEffect(() => () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please choose a photo');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Please choose a photo under ${MAX_MB} MB`);
      return;
    }
    onChange(f);
  };

  if (round) {
    return (
      <label htmlFor={id} className="relative w-20 h-20 rounded-full bg-[#F8FAFC] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
        {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <AddAPhotoRoundedIcon className="text-gray-300" />}
        <span className="sr-only">{label}</span>
        <input id={id} type="file" accept="image/*" capture="user" className="hidden" onChange={pick} />
      </label>
    );
  }

  return (
    <div>
      <label
        htmlFor={id}
        className={`relative block aspect-[4/3] rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
          error ? 'border-red-300 bg-red-50/30' : preview ? 'border-[#5EB929]/40' : 'border-gray-200 bg-[#F8FAFC] hover:border-[#5EB929]/40'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
              <CheckCircleRoundedIcon sx={{ fontSize: 20 }} className="text-[#5EB929]" />
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-gray-400 p-2 text-center">
            <AddAPhotoRoundedIcon />
            <span className="text-[10px] font-bold uppercase tracking-wide">Add photo</span>
          </span>
        )}
        <input id={id} type="file" accept="image/*" className="hidden" onChange={pick} />
      </label>
      <p className="mt-1.5 text-[11px] font-bold text-gray-600 leading-tight">{label}</p>
      {error && <p className="text-[10px] font-bold text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};

export default DocumentPicker;
