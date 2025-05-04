
import React from 'react';

const BackgroundLines = () => {
  return (
    <div className="fixed inset-0 z-0">
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-gray-800 w-full transform -rotate-45 animate-pulse"
            style={{
              top: `${i * 10}%`,
              left: `-${i * 5}%`,
              animationDelay: `${i * 0.1}s`,
              opacity: 0.3
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BackgroundLines;