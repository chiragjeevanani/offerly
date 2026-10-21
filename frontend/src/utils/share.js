// Links people share must point at the public site: inside the Android app the
// page's own origin can be a local WebView address. Local dev keeps its own
// origin so shared links can be tried.
export const SITE_URL = import.meta.env.DEV ? window.location.origin : 'https://getofferly.in';

export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older WebViews: fall back to a hidden textarea.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
};

// The phone's share sheet when there is one, else copy the link.
// Returns 'shared' | 'copied' | 'cancelled' | 'failed'.
export const shareOrCopy = async ({ title, text, url }) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // Some WebViews expose share() but refuse it - fall back to copying.
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
};
