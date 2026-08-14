import { memo } from 'react';
import { motion } from 'framer-motion';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';

const CityHorizontalCard = ({ city, onExplore, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    handleMenuClose();
    onEdit(city);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    handleMenuClose();
    onDelete(city);
  };

  const totalMerchants = city.zones?.reduce((sum, z) => sum + (z.merchantCount || 0), 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.002, backgroundColor: '#fcfcfc' }}
      className="group bg-white rounded-2xl p-3 px-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#5EB929]/20 transition-all cursor-pointer mb-3"
      onClick={() => onExplore(city)}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Section: Icon & Identity */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-11 h-11 bg-[#5EB929]/5 text-[#5EB929] rounded-xl flex items-center justify-center border border-[#5EB929]/5 group-hover:bg-[#5EB929] group-hover:text-white transition-all duration-300">
            <MapRoundedIcon sx={{ fontSize: 22 }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">{city.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
               <span className={`w-1.5 h-1.5 rounded-full ${city.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
               <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  {city.status || 'Active'}
               </span>
            </div>
          </div>
        </div>

        {/* Center Section: Stats Summary */}
        <div className="hidden md:flex items-center gap-10 flex-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Coverage</span>
            <span className="text-xs font-bold text-gray-700">{city.zones?.length || 0} Zones</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Active Partners</span>
            <div className="flex items-center gap-1.5">
              <BusinessCenterRoundedIcon sx={{ fontSize: 14 }} className="text-[#5EB929]/70" />
              <span className="text-xs font-bold text-gray-700">{totalMerchants} Merchants</span>
            </div>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onExplore(city); }}
            className="flex items-center gap-1.5 bg-gray-50 hover:bg-[#5EB929] text-gray-500 hover:text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-all group/btn"
          >
            Explore <ArrowForwardIosRoundedIcon sx={{ fontSize: 10 }} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
          
          <div onClick={(e) => e.stopPropagation()}>
            <IconButton 
              size="small" 
              onClick={handleMenuOpen}
              className="hover:bg-gray-100 rounded-lg p-1.5"
            >
              <MoreVertRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.08))',
                  mt: 0.5,
                  borderRadius: '12px',
                  '& .MuiMenuItem-root': {
                    fontSize: 12,
                    fontWeight: 700,
                    px: 1.5,
                    py: 1,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleEditClick} className="text-gray-700">
                <EditRoundedIcon sx={{ fontSize: 16, mr: 1, color: '#3182ce' }} />
                Edit
              </MenuItem>
              <MenuItem onClick={handleDeleteClick} className="text-red-600">
                <DeleteRoundedIcon sx={{ fontSize: 16, mr: 1, color: '#e53e3e' }} />
                Delete
              </MenuItem>
            </Menu>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(CityHorizontalCard);
