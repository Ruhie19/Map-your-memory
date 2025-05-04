
import React, { useState, useEffect } from 'react';

const TypeWriter = ({
  texts,
  typingSpeed = 50,
  deletingSpeed = 30,
  delayBetweenLines = 1000,
}) => {
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentIndex >= texts.length) return;

    if (isTyping) {
      if (currentText.length < texts[currentIndex].length) {
        const timeout = setTimeout(() => {
          setCurrentText(texts[currentIndex].slice(0, currentText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setDisplayedLines([...displayedLines, currentText]);
          setCurrentText('');
          setCurrentIndex(currentIndex + 1);
        }, delayBetweenLines);
        return () => clearTimeout(timeout);
      }
    }
  }, [currentText, currentIndex, isTyping, texts, displayedLines]);

  return (
    <div className="text-gray-400 space-y-2">
      {displayedLines.map((line, index) => (
        <div key={index} className="opacity-70">{line}</div>
      ))}
      {currentIndex < texts.length && (
        <div className="relative">
          {currentText}
          <span className="animate-pulse">|</span>
        </div>
      )}
    </div>
  );
};

export default TypeWriter;