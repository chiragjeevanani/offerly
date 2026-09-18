import React from 'react';
import { motion } from 'framer-motion';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { renderPlanIcon } from './planIcons';

const MerchantPlanCard = ({ plan, index, onSelect, loading }) => {
  const isHighlighted = plan.cardTheme === 'highlighted' || plan.isPopular;
  const badgeText = plan.badge || `PLAN ${index + 1}`;
  const buttonLabel = plan.buttonText || `Choose ${plan.name} Plan`;
  const characterImg = plan.characterImage || (
    index === 0 
      ? '/assets/plans/plan1-pointing.jpg' 
      : index === 1 
        ? '/assets/plans/plan2-thumbsup.jpg' 
        : '/assets/plans/plan3-cheering.jpg'
  );

  // Normalize features: prefer structuredFeatures if available, else fallback to plain string features
  const featuresList = (plan.structuredFeatures && plan.structuredFeatures.length > 0)
    ? plan.structuredFeatures
    : (plan.features || []).map(f => ({
        title: typeof f === 'string' ? f : f?.title || '',
        description: typeof f === 'string' ? '' : f?.description || '',
        icon: 'check'
      }));

  if (isHighlighted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="relative rounded-[28px] lg:rounded-[32px] overflow-visible bg-white border-2 border-[#16A34A] shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
      >
        {/* Floating Top Badge */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0B3B17] text-white text-[11px] font-extrabold tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20 whitespace-nowrap">
          <span>👑</span>
          <span>{plan.popularBadgeText || 'Most Popular'}</span>
        </div>

        {/* Card Header with Vivid Gradient */}
        <div className="relative rounded-t-[26px] lg:rounded-t-[30px] bg-gradient-to-b from-[#18A03E] via-[#138A35] to-[#0D6D29] p-6 pb-7 text-white overflow-hidden">
          {/* Decorative Doodles & Accents */}
          <div className="absolute top-2 right-12 opacity-30 select-none pointer-events-none text-2xl font-mono text-white">
            {'[ ]'}
          </div>
          <div className="absolute top-8 right-2 opacity-40 select-none pointer-events-none">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
            </svg>
          </div>
          {plan.floatingTagline && (
            <div className="absolute -bottom-1 right-2 z-10 select-none pointer-events-none transform rotate-3">
              <span className="font-serif italic font-extrabold text-[12px] text-emerald-100 drop-shadow-sm tracking-wide">
                {plan.floatingTagline}
              </span>
            </div>
          )}

          <div className="flex justify-between items-start gap-2 relative z-10">
            <div className="flex-1 pr-2">
              {/* Badge */}
              <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/30 mb-2.5">
                {badgeText}
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1">
                {plan.name}
              </h3>

              {/* Subtitle */}
              {plan.tagline && (
                <p className="text-[13px] font-bold text-white/95 leading-tight mb-1">
                  {plan.tagline}
                </p>
              )}

              {/* Description */}
              {plan.description && (
                <p className="text-[11px] text-emerald-100 font-medium leading-relaxed mb-3 line-clamp-2">
                  {plan.description}
                </p>
              )}

              {/* Price Pill */}
              <div className="inline-flex items-baseline gap-1 bg-[#0B3B17] border border-emerald-700/60 px-3.5 py-1 rounded-full text-white shadow-inner">
                <span className="text-xl sm:text-2xl font-black text-white leading-none">
                  ₹{plan.payable ?? plan.price}
                </span>
                <span className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-tight">
                  /{plan.duration ? plan.duration.toLowerCase() : 'month'}
                </span>
              </div>
              {plan.walletDiscount > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-bold line-through text-white/60">₹{plan.listPrice}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-emerald-950">-₹{plan.walletDiscount} wallet</span>
                </div>
              )}
            </div>

            {/* Character 3D Illustration */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 -mr-3 -mt-2 shrink-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-md">
              <img
                src={characterImg}
                alt={plan.name}
                className="w-full h-full object-cover object-top select-none pointer-events-none group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>

        {/* Card Body with Features */}
        <div className="p-6 flex-1 flex flex-col justify-between bg-white rounded-b-[26px] lg:rounded-b-[30px]">
          <div className="space-y-3.5 my-2 flex-1">
            {featuresList.map((feature, fIdx) => (
              <div key={fIdx} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0B3B17] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  {renderPlanIcon(feature.icon, { size: 16, className: 'text-white' })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-[13px] leading-tight mb-0.5">
                    {feature.title}
                  </p>
                  {feature.description && (
                    <p className="text-[11px] text-gray-500 font-medium leading-snug">
                      {feature.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Solid Dark Green CTA Button */}
          <div className="pt-5 mt-auto">
            <button
              onClick={() => onSelect(plan)}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#0B3B17] hover:bg-[#072B10] text-white font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-md shadow-emerald-950/20 group cursor-pointer disabled:opacity-50"
            >
              <span>{buttonLabel}</span>
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Standard Card Style (Plan 1 & Plan 2)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="relative rounded-[28px] lg:rounded-[32px] bg-white border border-emerald-100 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col justify-between group"
    >
      <div>
        {/* Header Row */}
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="flex-1 pr-2">
            {/* Badge */}
            <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-2.5">
              {badgeText}
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
              {plan.name}
            </h3>

            {/* Subtitle */}
            {plan.tagline && (
              <p className="text-[13px] font-bold text-gray-800 leading-tight mb-1">
                {plan.tagline}
              </p>
            )}

            {/* Description */}
            {plan.description && (
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-3 line-clamp-2">
                {plan.description}
              </p>
            )}

            {/* Price Pill */}
            <div className="inline-flex items-baseline gap-1 bg-emerald-50 border border-emerald-200/60 px-3.5 py-1 rounded-full text-[#16A34A]">
              <span className="text-xl sm:text-2xl font-black text-[#16A34A] leading-none">
                ₹{plan.payable ?? plan.price}
              </span>
              <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-tight">
                /{plan.duration ? plan.duration.toLowerCase() : 'month'}
              </span>
            </div>
            {plan.walletDiscount > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold line-through text-gray-400">₹{plan.listPrice}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">-₹{plan.walletDiscount} wallet</span>
              </div>
            )}
          </div>

          {/* Character 3D Illustration */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 -mr-3 -mt-2 shrink-0 flex items-center justify-center overflow-hidden rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-sm">
            <img
              src={characterImg}
              alt={plan.name}
              className="w-full h-full object-cover object-top select-none pointer-events-none group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-3.5 my-5">
          {featuresList.map((feature, fIdx) => (
            <div key={fIdx} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#16A34A] border border-emerald-100/70 flex items-center justify-center shrink-0 mt-0.5">
                {renderPlanIcon(feature.icon, { size: 16, className: 'text-[#16A34A]' })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-[13px] leading-tight mb-0.5">
                  {feature.title}
                </p>
                {feature.description && (
                  <p className="text-[11px] text-gray-500 font-medium leading-snug">
                    {feature.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emerald Outline CTA Button */}
      <div className="pt-4 mt-auto">
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-full border-2 border-[#16A34A] bg-white hover:bg-[#16A34A] text-[#16A34A] hover:text-white font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-sm group cursor-pointer disabled:opacity-50"
        >
          <span>{buttonLabel}</span>
          <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};

export default MerchantPlanCard;
