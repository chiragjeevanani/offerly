import { useState } from 'react';
import toast from 'react-hot-toast';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import { SITE_URL, copyText, shareOrCopy } from '../../../utils/share';

// The store's short link (getofferly.in/<slug>) with copy / share buttons, so the
// merchant can send customers straight to their store page.

const StoreLinkCard = ({ merchant }) => {
  const [copied, setCopied] = useState(false);
  if (!merchant?.slug) return null;

  const url = `${SITE_URL}/${merchant.slug}`;
  const shown = `${SITE_URL.replace(/^https?:\/\/(www\.)?/, '')}/${merchant.slug}`;
  const message = `Check out ${merchant.storeName} on Offerly - deals and offers from our store: ${url}`;

  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      toast.success('Store link copied');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy - press and hold the link to copy it');
    }
  };

  const share = async () => {
    const result = await shareOrCopy({ title: merchant.storeName, text: message, url });
    if (result === 'copied') toast.success('Store link copied');
    if (result === 'failed') toast.error('Could not copy - press and hold the link to copy it');
  };

  return (
    <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-gray-100 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
          <LinkRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929]" /> Your store link
        </h3>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
          Share it on WhatsApp, Instagram or print it - it opens your store in the Offerly app or website.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-gray-50 border border-gray-100 pl-4 pr-1.5 py-1.5">
        <a href={url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-[13px] font-bold text-gray-900 select-all">
          {shown}
        </a>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy store link"
          className="shrink-0 flex items-center gap-1 h-9 px-3 rounded-xl bg-white border border-gray-200 text-[11px] font-bold text-gray-700 active:scale-95 transition-transform"
        >
          {copied ? <CheckRoundedIcon sx={{ fontSize: 15 }} className="text-[#5EB929]" /> : <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#25D366] text-white text-[12px] font-bold active:scale-[0.98] transition-transform"
        >
          <WhatsAppIcon sx={{ fontSize: 17 }} /> WhatsApp
        </a>
        <button
          type="button"
          onClick={share}
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-gray-900 text-white text-[12px] font-bold active:scale-[0.98] transition-transform"
        >
          <ShareRoundedIcon sx={{ fontSize: 16 }} /> Share
        </button>
      </div>
    </div>
  );
};

export default StoreLinkCard;
