import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error("Error caught in ErrorBoundary:", error, errorInfo);

    // Check if the error is specifically related to order creation failure
    if (
      error.message.includes("Payment successful but order creation failed")
    ) {
      this.setState({
        errorMessage:
          "There was an issue processing your reservation. Please try again later.",
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return (
        <div className="error-container">
          <h2>Oops, something went wrong!</h2>
          <p>{this.state.errorMessage}</p>
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
