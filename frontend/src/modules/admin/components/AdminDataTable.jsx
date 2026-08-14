import { useState } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';

const AdminDataTable = ({ 
  title, 
  description, 
  columns, 
  data, 
  onEdit, 
  onDelete, 
  onAdd,
  onRowClick,
  addLabel = "Add New",
  searchPlaceholder = "Search...",
  searchKey = "name",
  filters = null // Support custom filter UI injection
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredData = data.filter(item => {
    // Dynamic deep search support
    const val = searchKey.split('.').reduce((obj, key) => obj?.[key], item);
    if (typeof val === 'string') {
      return val.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">{title}</h1>
          {description && <p className="text-sm font-medium text-gray-500 mt-1">{description}</p>}
        </div>
        
        {onAdd && (
          <button 
            onClick={onAdd}
            className="bg-[#3D7A4F] hover:bg-[#2B5738] text-white px-5 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#3D7A4F]/25 transition-all whitespace-nowrap active:scale-95"
          >
            <AddRoundedIcon sx={{ fontSize: 20 }} />
            {addLabel}
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200/60 overflow-hidden">
        {/* Action Bar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative w-full max-w-sm group">
            <SearchRoundedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#3D7A4F] transition-colors" sx={{ fontSize: 18 }} />
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#3D7A4F]/20 focus:border-[#3D7A4F] transition-all outline-none shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            {filters}
            {!filters && (
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-bold text-sm text-gray-600 transition-colors shadow-sm">
                <FilterListRoundedIcon sx={{ fontSize: 18 }} />
                <span>Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Table wrapper */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                {columns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-24 text-center text-gray-400">
                    <div className="p-3 bg-gray-50 rounded-full inline-block mb-3">
                      <SearchRoundedIcon sx={{ fontSize: 32 }} className="text-gray-300" />
                    </div>
                    <p className="font-bold text-gray-500">No records found</p>
                    <p className="text-sm font-medium mt-1">Try adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <tr 
                    key={row._id || row.id || rowIdx} 
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-[#3D7A4F]/[0.02]' : 'hover:bg-gray-50/50'}`}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-6 py-4 align-middle ${col.className || ''}`}>
                        {col.render ? col.render(row) : (row[col.key] || '-')}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 text-right align-middle">
                        <div 
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onEdit && (
                            <button 
                              onClick={() => onEdit(row)}
                              className="p-1.5 hover:bg-[#3D7A4F]/10 text-gray-400 hover:text-[#3D7A4F] rounded-md transition-colors"
                              title="Edit"
                            >
                              <EditRoundedIcon sx={{ fontSize: 18 }} />
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              onClick={() => onDelete(row)}
                              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                              title="Delete"
                            >
                              <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <p className="text-xs font-bold text-gray-500">
              Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="text-gray-900">{filteredData.length}</span> results
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <KeyboardArrowLeftRoundedIcon sx={{ fontSize: 20 }} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <KeyboardArrowRightRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDataTable;
