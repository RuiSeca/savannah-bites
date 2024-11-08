// src/utils/scrollUtils.js
export const scrollToTop = (smooth = false) => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };