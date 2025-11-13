interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`text-center ${className}`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-primary mx-auto mb-4`}></div>
      {text && <p>{text}</p>}
    </div>
  );
}
