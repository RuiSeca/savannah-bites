import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import "./styles.css";
import { useCart } from "../../context/CartContext";

// Import images
import suyaSkewersImage from "../../images/suya-skewers.png";
import jollofRiceImage from "../../images/jollof-rice.jpg";
import malvaPuddingImage from "../../images/malva-pudding.png";
import moiMoiImage from "../../images/moi-moi.jpg";
import puffPuffImage from "../../images/puff-puff.jpg";
import egusiSoupImage from "../../images/egusi-soup.jpg";
import jamaicanPattiesImage from "../../images/jamaican-patties.jpg";
import caluluImage from "../../images/calulu.jpg";
import cachupaImage from "../../images/cachupa.jpg";
import chinChinImage from "../../images/chin-chin.jpg";
import bananaFlambeImage from "../../images/banana-flambe.jpg";
import randburgSunImage from "../../images/randburg-sun.jpg"; // Added for Randburg Sun
import waterImage from "../../images/water.jpg";
import cokeImage from "../../images/coca-cola.jpg";
import iceTeaImage from "../../images/ice-tea.jpg";
import compalImage from "../../images/compal.jpg"; // Added for Compal
import strawberryShakeImage from "../../images/strawberry-milkshake.jpg";
import chocolateShakeImage from "../../images/chocolate-milkshake.jpg";
import vanillaShakeImage from "../../images/vanilla-milkshake.jpg";
import oreoShakeImage from "../../images/oreo-milkshake.jpg"; // Added for Oreo Milkshake
import summersBeerImage from "../../images/apple-somersby.jpg";
import superBockImage from "../../images/super-bock.jpg";
import stellaImage from "../../images/stella-artois.jpg";
import cucaImage from "../../images/cuca.jpg"; // Added for Cuca

// Configure axios
axios.defaults.withCredentials = true;

// Define API URL
const apiUrl = process.env.NODE_ENV === 'development' 
  ? process.env.REACT_APP_NGROK_URL || process.env.REACT_APP_API_BASE_URL
  : process.env.REACT_APP_API_BASE_URL;

console.log("Using API URL:", apiUrl);

// Image mapping
const images = {
  "suya-skewers.png": suyaSkewersImage,
  "jollof-rice.jpg": jollofRiceImage,
  "malva-pudding.png": malvaPuddingImage,
  "moi-moi.jpg": moiMoiImage,
  "puff-puff.jpg": puffPuffImage,
  "jamaican-patties.jpg": jamaicanPattiesImage,
  "egusi-soup.jpg": egusiSoupImage,
  "calulu.jpg": caluluImage,
  "cachupa.jpg": cachupaImage,
  "chin-chin.jpg": chinChinImage,
  "banana-flambe.jpg": bananaFlambeImage,
  "randburg-sun.jpg": randburgSunImage,
  "water.jpg": waterImage,
  "coca-cola.jpg": cokeImage,
  "ice-tea.jpg": iceTeaImage,
  "compal.jpg": compalImage,
  "strawberry-milkshake.jpg": strawberryShakeImage,
  "chocolate-milkshake.jpg": chocolateShakeImage,
  "vanilla-milkshake.jpg": vanillaShakeImage,
  "oreo-milkshake.jpg": oreoShakeImage,
  "apple-somersby.jpg": summersBeerImage,
  "super-bock.jpg": superBockImage,
  "stella-artois.jpg": stellaImage,
  "cuca.jpg": cucaImage,
};


// Category ordering
const categoryOrder = {
  'Starters': 1,
  'Main Dishes': 2,
  'Desserts': 3,
  'Soft Drinks': 4,
  'Milkshakes': 5,
  'Alcoholic Drinks': 6
};

// Helper functions
const getImage = (filename) => images[filename] || "https://via.placeholder.com/150";

const formatPrice = (price) => {
  if (!price) return 'N/A';
  if (typeof price === 'object') {
    const smallPrice = price.small;
    const mediumPrice = price.medium;
    const largePrice = price.large;
    
    if (smallPrice && mediumPrice && largePrice) {
      return `£${smallPrice.toFixed(2)} - £${largePrice.toFixed(2)}`;
    } else {
      return `£${(smallPrice || mediumPrice || largePrice).toFixed(2)}`;
    }
  }
  return `£${price.toFixed(2)}`;
};

function MenuPage() {
  // State management
  const [menuItems, setMenuItems] = useState([]);
  const [selectedDish, setSelectedDish] = useState(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);
  const [menuErrorMessage, setMenuErrorMessage] = useState("");
  const [selectedSize, setSelectedSize] = useState(null);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const { addToCart } = useCart();

  // Sort menu items by category order
  const sortedMenuItems = useMemo(() => {
    return [...menuItems].sort((a, b) => {
      const orderA = categoryOrder[a.category] || 999;
      const orderB = categoryOrder[b.category] || 999;
      return orderA - orderB;
    });
  }, [menuItems]);

  // Fetch menu data function update
  const fetchMenu = useCallback(async () => {
    try {
      setMenuLoading(true);
      setMenuError(false);
      
      // Construct the URL properly
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
      const menuUrl = `${baseUrl}/menu`;
      
      console.log('Fetching from:', menuUrl); // Debug log
      
      const response = await axios({
        method: 'get',
        url: menuUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        timeout: 5000
      });
      
      if (response.data.status === 'success') {
        setMenuItems(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch menu data');
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response,
        config: error.config
      });
      
      setMenuError(true);
      setMenuErrorMessage(
        error.response?.data?.message || 
        error.message || 
        "Failed to load menu items. Please check your connection."
      );
    } finally {
      setMenuLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Handle view more details
  const handleDishClick = (dish) => {
    setSelectedDish(dish);
  };

  // Handle adding item to cart
  const handleAddToCart = useCallback((item, selectedSize = null) => {
    let price;
    if (selectedSize) {
      price = item.price[selectedSize];
    } else {
      price = typeof item.price === 'object' ? item.price.small : item.price;
    }

    const itemToAdd = {
      ...item,
      id: item._id,
      selectedPrice: price,
      size: selectedSize || (typeof item.price === 'object' ? 'small' : null)
    };
    
    addToCart(itemToAdd);
    setShowSizeModal(false);
    setSelectedSize(null);
  }, [addToCart]);

  // Handle size selection
  const handleSizeSelect = (item, size) => {
    setSelectedSize(size);
    handleAddToCart(item, size);
  };

  // Open size selection modal
  const openSizeModal = (item) => {
    setActiveItem(item);
    setShowSizeModal(true);
  };

  // Loading state
  if (menuLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading menu...</div>
      </div>
    );
  }

  // Error state
  if (menuError) {
    return (
      <div className="error-container">
        <p className="error-message">{menuErrorMessage}</p>
        <button 
          className="retry-button"
          onClick={fetchMenu} 
          disabled={menuLoading}
        >
          Retry Loading Menu
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="menu-page">
      <h1 className="menu-title">Savannah Delicious Online Menu</h1>

      <div className="menu-categories">
        {sortedMenuItems.length > 0 ? (
          sortedMenuItems.map((category) => (
            <div key={category.category} className="menu-category">
              <h2 className="category-title">{category.category}</h2>
              <div className="menu-items">
                {category.items.map((item) => (
                  <div key={item._id} className="menu-item">
                    <img
                      src={getImage(item.image)}
                      alt={item.name}
                      className="menu-item-image"
                    />
                    <div className="menu-item-details">
                      <h3>{item.name}</h3>
                      <p className="price">{formatPrice(item.price)}</p>
                      <div className="menu-item-buttons">
                        {typeof item.price === 'object' ? (
                          <button
                            className="size-button"
                            onClick={() => openSizeModal(item)}
                            aria-label={`Choose size for ${item.name}`}
                          >
                            Choose Size
                          </button>
                        ) : (
                          <button
                            className="add-to-cart-button"
                            onClick={() => handleAddToCart(item)}
                            aria-label={`Add ${item.name} to cart`}
                          >
                            Add to Cart
                          </button>
                        )}
                        <button
                          className="view-more-button"
                          onClick={() => handleDishClick(item)}
                          aria-label={`View details of ${item.name}`}
                        >
                          View More
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="no-items-message">No menu items available at the moment.</p>
        )}
      </div>

      {/* Size Selection Modal */}
      {showSizeModal && activeItem && (
        <div className="modal-overlay" onClick={() => setShowSizeModal(false)}>
          <div className="size-modal" onClick={e => e.stopPropagation()}>
            <button 
              className="close-button"
              onClick={() => setShowSizeModal(false)}
              aria-label="Close size selection"
            >
              ×
            </button>
            <h3>{activeItem.name}</h3>
            <p>Select a Size:</p>
            <div className="size-options">
              {Object.entries(activeItem.price).map(([size, price]) => (
                <button
                  key={size}
                  className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                  onClick={() => handleSizeSelect(activeItem, size)}
                >
                  <span className="size-name">{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                  <span className="size-price">£{price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dish Details Modal */}
      {selectedDish && (
        <div className="modal-overlay" onClick={() => setSelectedDish(null)}>
          <div className="dish-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <button 
                className="close-button"
                onClick={() => setSelectedDish(null)}
                aria-label="Close dish details"
              >
                ×
              </button>
              <h2>{selectedDish.name}</h2>
              <img 
                src={getImage(selectedDish.image)} 
                alt={selectedDish.name}
                className="modal-image" 
              />
              <p className="description">{selectedDish.description || "No description available."}</p>
              <p className="ingredients">
                <strong>Ingredients:</strong> {selectedDish.ingredients || "Not available."}
              </p>
              {selectedDish.story && (
                <p className="story">{selectedDish.story}</p>
              )}
              <p className="modal-price">{formatPrice(selectedDish.price)}</p>
              {typeof selectedDish.price === 'object' ? (
                <button
                  className="modal-size-button"
                  onClick={() => {
                    setSelectedDish(null);
                    openSizeModal(selectedDish);
                  }}
                >
                  Choose Size
                </button>
              ) : (
                <button
                  className="modal-add-button"
                  onClick={() => {
                    handleAddToCart(selectedDish);
                    setSelectedDish(null);
                  }}
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuPage;