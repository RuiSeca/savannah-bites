import React, { useState, useEffect } from "react";
import "./styles.css";

// Move debounce function outside of the component
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    // Define the debounced toggleVisibility function directly within useEffect
    const handleScroll = debounce(() => {
      setIsVisible(window.scrollY > 300);
    }, 100);

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []); // No dependencies required

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="scroll-to-top-btn"
          aria-label="Scroll to top"
        >
          &#8593;
        </button>
      )}
    </>
  );
};

export default ScrollToTop;
