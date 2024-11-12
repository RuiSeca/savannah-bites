import React, { useState, useEffect } from "react";
import styles from "./styles.css";

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Toggle visibility
  const toggleVisibility = () => {
    const scrolled = document.documentElement.scrollTop;
    if (scrolled > 300) {
      setIsVisible(true);
    } else if (scrolled <= 300) {
      setIsVisible(false);
    }
  };

  // Add scroll event listener
  useEffect(() => {
    console.log("ScrollToTop component mounted"); // Debug log
    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  // Scroll to top handler
  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  console.log("Visibility state:", isVisible); // Debug log

  return (
    <>
      {isVisible && (
        <button
          onClick={handleScrollToTop}
          className={styles.scrollTop}
          aria-label="Scroll to top"
          type="button"
        >
          ↑
        </button>
      )}
    </>
  );
};

export default ScrollToTop;
