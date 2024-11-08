// index.jsx
import React from "react";
import "./styles.css";

const AnimatedCookingLoader = () => {
  return (
    <>
      <h1>Cooking in progress..</h1>
      <div id="cooking">
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div id="area">
          <div id="sides">
            <div id="pan"></div>
            <div id="handle"></div>
          </div>
          <div id="pancake">
            <div id="pastry"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnimatedCookingLoader;
