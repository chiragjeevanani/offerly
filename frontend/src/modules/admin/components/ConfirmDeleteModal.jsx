import AdminModal from './AdminModal';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Deletion"
      footer={
        <div className="flex gap-3 w-full">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
          >
            Yes, Delete
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <WarningRoundedIcon sx={{ fontSize: 32 }} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          {message || "This action is permanent and cannot be undone. All associated data will be removed from the platform."}
        </p>
      </div>
    </AdminModal>
  );
};

export default ConfirmDeleteModal;
