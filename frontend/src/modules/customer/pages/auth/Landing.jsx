import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded';
import PageTransition from '../../components/ui/PageTransition';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    { icon: LocalOfferRoundedIcon, text: 'Best Deals' },
    { icon: LocationOnRoundedIcon, text: 'Near You' },
    { icon: FlashOnRoundedIcon, text: 'Fast Redeem' }
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-primary flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6 mx-auto">
              <CardGiftcardRoundedIcon sx={{ fontSize: 48 }} className="text-primary" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-wide mb-3">
              OFFERLY
            </h1>
            <p className="text-white/90 text-lg font-medium">
              Discover Local Deals & Save More
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-6 mb-12"
          >
            {features.map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2">
                  <feature.icon sx={{ fontSize: 24 }} className="text-white" />
                </div>
                <span className="text-xs text-white/90 font-semibold">{feature.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Auth Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-5 pb-12 space-y-3"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="w-full bg-white text-primary font-bold py-4 rounded-2xl shadow-xl transition-all"
          >
            LOGIN
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/signup')}
            className="w-full bg-white/20 backdrop-blur-sm border-2 border-white text-white font-bold py-4 rounded-2xl transition-all"
          >
            SIGN UP
          </motion.button>

          <div className="text-center pt-4">
            <p className="text-white/70 text-sm mb-2">Are you a business owner?</p>
            <button
              onClick={() => navigate('/merchant')}
              className="text-white font-bold text-sm underline underline-offset-4"
            >
              Join as Merchant →
            </button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Landing;
