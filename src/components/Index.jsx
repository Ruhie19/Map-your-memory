import React from 'react';
import TypeWriter from './TypeWriter';
import BackgroundLines from './BackgroundLines';

const texts = [
  "In our ever-changing world, the landscape shifts",
  "but our cherished traditions and memories remain.",
  "This project invites you to share your personal stories and community experiences",
  "both seen and felt",
  "to create a living map that captures",
  "our evolving surroundings and the legacies we hold dear."
];

const Index = () => {
  return (
    <div className="relative min-h-screen bg-[#0F0E0E] flex flex-col items-center justify-center overflow-hidden">
      <BackgroundLines />
      
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-white text-5xl md:text-6xl font-bold mb-8">
          Map Your Memory
        </h1>
        
        <div className="mb-12">
          <TypeWriter texts={texts} />
        </div>
        
        <button className="mt-8 px-8 py-3 text-lg bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#0F0E0E] transition-colors duration-300">
          Enter Memory &gt;
        </button>
      </div>
    </div>
  );
};

export default Index;