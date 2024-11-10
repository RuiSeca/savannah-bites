// src/components/MealDealsSection/index.jsx
import React from "react";
import { useCart } from "../../context/CartContext";
import "./styles.css";

const MEAL_DEALS = {
  FAMILY_FEAST: {
    id: "family_feast",
    name: "Family Feast",
    price: 89.99,
    requirements: {
      "Main Dishes": { count: 2, size: "large" },
      Starters: { count: 2, size: "any" },
      "Soft Drinks": { count: 2, size: "large" },
      Desserts: { count: 1, size: "any" },
    },
    description:
      "2 large main courses + 2 starters + 2 large drinks + 1 dessert",
    savings: "Save up to £35",
  },
  LUNCH_SPECIAL: {
    id: "lunch_special",
    name: "Lunch Special",
    price: 17.99,
    requirements: {
      "Main Dishes": { count: 1, size: "any" },
      Starters: { count: 1, size: "any" },
      "Soft Drinks": { count: 1, size: "any" },
      Desserts: { count: 1, size: "any" },
    },
    description: "Main course + starter + drink + dessert",
    savings: "Save up to £12",
    timeRestrictions: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "11:00",
      endTime: "15:00",
    },
  },
  SOLO_TRIP: {
    id: "solo_trip",
    name: "Solo Trip Special",
    price: 18.99,
    requirements: {
      "Main Dishes": { count: 1, size: "any" },
      Starters: { count: 1, size: "any" },
      "Soft Drinks": { count: 1, size: "any" },
    },
    description: "Main course + starter + drink",
    savings: "Save up to £8",
  },
};

const MealDealsSection = ({ onDealSelect }) => {
  const { activeDeal, checkDealRequirements, cart } = useCart(); // Removed unused startDeal

  const handleDealClick = (deal) => {
    const isQualifying = cart.length > 0 && checkDealRequirements(deal, cart);
    if (onDealSelect) {
      onDealSelect(deal, isQualifying);
    }
  };

  return (
    <div className="meal-deals">
      <h2 className="category-title">Special Meal Deals</h2>
      <div className="deals-grid">
        {Object.values(MEAL_DEALS).map((deal) => {
          const isQualifying =
            cart.length > 0 && checkDealRequirements(deal, cart);
          const isActive = activeDeal?.id === deal.id;

          return (
            <div
              key={deal.id}
              className={`deal-card ${isQualifying ? "qualifying" : ""} ${
                isActive ? "active" : ""
              }`}
            >
              <div className="deal-content">
                <h3>{deal.name}</h3>
                <p className="deal-description">{deal.description}</p>
                <div className="deal-price">£{deal.price.toFixed(2)}</div>
                {deal.timeRestrictions && (
                  <div className="deal-restrictions">
                    <p>Available {deal.timeRestrictions.days.join(", ")}</p>
                    <p>
                      {deal.timeRestrictions.startTime} -{" "}
                      {deal.timeRestrictions.endTime}
                    </p>
                  </div>
                )}
                <div className="deal-savings">{deal.savings}</div>
                <button
                  className={`deal-button ${isActive ? "active" : ""}`}
                  onClick={() => handleDealClick(deal)}
                  disabled={isActive}
                >
                  {isActive
                    ? "Deal Applied"
                    : isQualifying
                      ? "Apply Deal"
                      : "View Requirements"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MealDealsSection;
