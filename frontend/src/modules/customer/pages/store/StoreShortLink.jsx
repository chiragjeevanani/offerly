import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { merchantAPI } from '../../../../api/merchant.api';
import { useApp } from '../../context/AppContext';
import { rememberAfterLogin } from '../../../../utils/afterLogin';

// getofferly.in/<slug> - the short link merchants share. Looks the store up and
// opens its page; a logged-out visitor logs in first and then lands on it.
const StoreShortLink = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, authStatus } = useApp();

  useEffect(() => {
    if (authStatus === 'loading') return;
    let cancelled = false;
    (async () => {
      try {
        const { merchantId, storeName } = await merchantAPI.resolveStoreLink(slug);
        if (cancelled) return;
        const target = `/store/${merchantId}`;
        if (isLoggedIn) {
          navigate(target, { replace: true });
        } else {
          rememberAfterLogin(target);
          toast(`Log in to see ${storeName} on Offerly`, { id: 'store-link-login' });
          navigate('/login', { replace: true });
        }
      } catch {
        if (cancelled) return;
        toast.error("We couldn't find that store", { id: 'store-link-missing' });
        navigate(isLoggedIn ? '/home' : '/login', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, isLoggedIn, authStatus, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default StoreShortLink;
