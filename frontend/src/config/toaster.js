// react-hot-toast look, shared by the main app and the delivery partner root.
export const toasterProps = {
  position: 'top-center',
  toastOptions: {
    duration: 2500,
    style: {
      background: '#1A1A1A',
      color: '#fff',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: 500,
    },
    success: {
      iconTheme: { primary: '#5EB929', secondary: '#fff' },
    },
  },
};
