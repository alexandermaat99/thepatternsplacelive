import Image from 'next/image';

interface CustomLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  animationType?: 'gif' | 'svg' | 'lottie' | 'css';
  src?: string;
}

/**
 * Custom Loading Component - Supports multiple animation formats
 * 
 * Usage examples:
 * 
 * 1. GIF/WebP Animation:
 *    <CustomLoading animationType="gif" src="/animations/loading.gif" />
 * 
 * 2. SVG Animation (inline):
 *    <CustomLoading animationType="svg" />
 * 
 * 3. Lottie Animation:
 *    <CustomLoading animationType="lottie" src="/animations/loading.json" />
 * 
 * 4. CSS Animation (current default):
 *    <CustomLoading animationType="css" />
 */

export function CustomLoading({ 
  size = 'md', 
  text = 'Loading...', 
  className = '',
  animationType = 'css',
  src
}: CustomLoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  // CSS Animation (default - no file needed)
  if (animationType === 'css') {
    return (
      <div className={`text-center ${className}`}>
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-primary mx-auto mb-4`}></div>
        {text && <p>{text}</p>}
      </div>
    );
  }

  // GIF/WebP Animation
  if (animationType === 'gif' && src) {
    return (
      <div className={`text-center ${className}`}>
        <Image
          src={src}
          alt="Loading"
          width={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
          height={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
          className={`${sizeClasses[size]} mx-auto mb-4`}
          unoptimized // GIFs don't need optimization
        />
        {text && <p>{text}</p>}
      </div>
    );
  }

  // SVG Animation (inline example)
  if (animationType === 'svg') {
    return (
      <div className={`text-center ${className}`}>
        <svg
          className={`${sizeClasses[size]} mx-auto mb-4 animate-spin text-primary`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {text && <p>{text}</p>}
      </div>
    );
  }

  // Lottie Animation (requires lottie-react package)
  if (animationType === 'lottie' && src) {
    // Note: You'll need to install: npm install lottie-react
    // Then uncomment and use:
    /*
    import Lottie from 'lottie-react';
    return (
      <div className={`text-center ${className}`}>
        <div className={`${sizeClasses[size]} mx-auto mb-4`}>
          <Lottie animationData={require(src)} loop={true} />
        </div>
        {text && <p>{text}</p>}
      </div>
    );
    */
    return (
      <div className={`text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          Install lottie-react to use Lottie animations
        </p>
      </div>
    );
  }

  return null;
}

