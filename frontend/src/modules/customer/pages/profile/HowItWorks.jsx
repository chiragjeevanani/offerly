import { useNavigate } from 'react-router-dom';
import WelcomeGuide from '../../components/WelcomeGuide';

// Profile -> How Offerly works: the first-time walkthrough on demand
const HowItWorks = () => {
  const navigate = useNavigate();
  const leave = () => (window.history.length > 1 ? navigate(-1) : navigate('/home', { replace: true }));
  return <WelcomeGuide onClose={leave} />;
};

export default HowItWorks;
