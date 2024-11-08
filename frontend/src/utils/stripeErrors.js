// src/utils/stripeErrors.js
export const stripeErrorMessages = {
    card_error: {
      card_declined: "Card was declined. Please try another card.",
      expired_card: "Card has expired. Please use a different card.",
      incorrect_cvc: "Incorrect CVC code. Please check and try again.",
      incorrect_number: "Incorrect card number. Please check and try again.",
      insufficient_funds: "Insufficient funds. Please try another card.",
      invalid_cvc: "Invalid CVC code. Please check and try again.",
      invalid_expiry_month: "Invalid expiry month. Please check and try again.",
      invalid_expiry_year: "Invalid expiry year. Please check and try again.",
      invalid_number: "Invalid card number. Please check and try again.",
      postal_code_invalid: "Invalid postal code. Please check and try again."
    },
    validation_error: {
      invalid_request_error: "Invalid request. Please try again.",
      rate_limit_error: "Too many requests. Please try again later.",
      api_error: "Unable to process payment. Please try again later.",
      authentication_error: "Authentication failed. Please try again.",
      invalid_param: "Invalid parameters provided."
    }
  };
  
  export const getStripeErrorMessage = (error) => {
    if (!error) return 'An unexpected error occurred';
    
    if (error.type === 'card_error') {
      return stripeErrorMessages.card_error[error.code] || error.message;
    }
    if (error.type === 'validation_error') {
      return stripeErrorMessages.validation_error[error.code] || error.message;
    }
    return error.message || 'An unexpected error occurred. Please try again.';
  };