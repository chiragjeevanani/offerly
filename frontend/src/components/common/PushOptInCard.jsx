import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';

import { usePushNotifications } from '../../hooks/usePushNotifications';

/**
 * Opt-in control for browser/device push. Shared by the customer and merchant
 * notification pages — only the copy and the target endpoint differ.
 *
 * The permission prompt is deliberately behind a tap: browsers permanently
 * blacklist a site once a user picks "Block", and an unprompted dialog on page
 * load is the surest way to earn that.
 *
 * @param {'customer'|'merchant'} persona
 * @param {boolean} isLoggedIn
 */
const PushOptInCard = ({ persona = 'customer', isLoggedIn = true, className = '' }) => {
  const { supported, permission, enabled, busy, enable, disable, sendTest } = usePushNotifications({
    persona,
    isLoggedIn,
  });

  // Nothing to offer on a browser that can't do web push (notably iOS Safari
  // before 16.4, and any iOS page not added to the home screen).
  if (!supported) {
    return null;
  }

  const blurb =
    persona === 'merchant'
      ? 'Get alerted the moment a customer books or your store status changes.'
      : 'Get notified the moment a booking is verified or a reward unlocks.';

  if (permission === 'denied') {
    return (
      <div className={`flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>
        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
          <NotificationsOffRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300" />
        </div>
        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
          Notifications are blocked for this site. Turn them back on in your browser settings
          to get alerts here.
        </p>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className={`flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>
        <div className="w-9 h-9 rounded-xl bg-[#5EB929]/5 flex items-center justify-center flex-shrink-0">
          <NotificationsActiveRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">Push is on</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Alerts will reach this device.</p>
        </div>
        <button
          type="button"
          onClick={sendTest}
          className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest px-2.5 py-1.5 active:scale-95 transition-all"
        >
          Test
        </button>
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2.5 py-1.5 active:scale-95 transition-all disabled:opacity-40"
        >
          Off
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#5EB929]/20 shadow-sm ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-[#5EB929]/5 flex items-center justify-center flex-shrink-0">
        <NotificationsActiveRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-gray-800 uppercase tracking-tight">Turn on alerts</p>
        <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-relaxed">{blurb}</p>
      </div>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="text-[10px] font-bold text-white uppercase tracking-widest bg-[#5EB929] px-3.5 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
      >
        {busy ? '…' : 'Enable'}
      </button>
    </div>
  );
};

export default PushOptInCard;
