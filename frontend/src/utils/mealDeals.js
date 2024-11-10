// src/utils/mealDeals.js

export const MEAL_DEALS = {
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
    timeRestrictions: null,
  },
  LUNCH_SPECIAL: {
    id: "lunch_special",
    name: "Lunch Special",
    price: 17.99,
    requirements: {
      "Main Dishes": { count: 1, size: "any" },
      "Soft Drinks": { count: 1, size: "any" },
      Desserts: { count: 1, size: "any" },
    },
    description: "Main course + drink + dessert",
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
    timeRestrictions: null,
  },
};

export const isWithinTimeRestrictions = (restrictions) => {
  if (!restrictions) return true;

  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });
  const currentTime = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    restrictions.days.includes(currentDay) &&
    currentTime >= restrictions.startTime &&
    currentTime <= restrictions.endTime
  );
};

export const calculateDealSavings = (regularPrice, dealPrice) => {
  return Math.max(0, regularPrice - dealPrice);
};

export const formatDealRequirements = (requirements) => {
  return Object.entries(requirements).map(([category, { count, size }]) => ({
    category,
    count,
    size,
    text: `${count}x ${category}${size !== "any" ? ` (${size})` : ""}`,
  }));
};

export const validateDealRequirements = (deal, cartItems) => {
  if (!deal || !cartItems?.length) return { isValid: false, missing: [] };

  const itemsByCategory = cartItems.reduce((acc, item) => {
    const category = item.category || "uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const results = Object.entries(deal.requirements).map(
    ([category, requirement]) => {
      const items = itemsByCategory[category] || [];
      const validItems = items.filter(
        (item) => requirement.size === "any" || item.size === requirement.size
      );
      const totalCount = validItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        category,
        required: requirement.count,
        current: totalCount,
        isValid: totalCount >= requirement.count,
        missing: Math.max(0, requirement.count - totalCount),
      };
    }
  );

  return {
    isValid: results.every((r) => r.isValid),
    results,
    missing: results.filter((r) => !r.isValid),
  };
};
