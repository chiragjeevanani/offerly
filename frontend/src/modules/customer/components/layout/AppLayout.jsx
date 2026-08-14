import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import SideNav from './SideNav';

// Pages that DON'T show the navigation shell
const SHELL_EXCLUDED = ['/redeem'];

const AppLayout = ({ children }) => {
  const location = useLocation();
  const isExcluded = SHELL_EXCLUDED.some((p) => location.pathname.startsWith(p));

  if (isExcluded) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Top bar spanning full width */}
      <TopBar />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar - Collapsed by default, expands on hover */}
        <SideNav />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
          <div className="w-full max-w-[1200px] mx-auto min-h-full">
            {children}
          </div>
        </main>

        {/* Bottom nav — mobile only */}
        <BottomNav />
      </div>
    </div>
  );
};

export default AppLayout;
