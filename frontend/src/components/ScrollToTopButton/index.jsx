import React, { useState, useEffect } from "react";
import "./styles.css";

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Handle scroll visibility
  useEffect(() => {
    let timeoutId;

    const handleScroll = () => {
      // Show button when user scrolls down 100px
      const shouldBeVisible = window.scrollY > 100;
      setIsVisible(shouldBeVisible);

      // Clear the previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set a new timeout to hide the button after 2 seconds of no scrolling
      if (shouldBeVisible && !isHovering) {
        timeoutId = setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isHovering]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      className={`scroll-to-top ${isVisible ? "visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
};

export default ScrollToTop;
