const ProgressBar = ({ currentStep = 1, totalSteps = 2 }) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span className="font-medium">Step {currentStep} of {totalSteps}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-700 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
