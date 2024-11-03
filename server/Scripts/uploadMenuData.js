const mongoose = require('mongoose');
const Menu = require('../Models/Menu');

const uri = "mongodb+srv://rvcorporation23:9bjCM9XqHvtp3dGS@cluster0.eyzf9.mongodb.net/savannah_bites?retryWrites=true&w=majority";

const menuItems = {
  starters: [
    { id: 1, name: 'Suya Skewers', price: { small: 8, medium: 10, large: 12 }, image: 'suya-skewers.png', description: 'Spicy grilled meat skewers', ingredients: 'Beef, peanuts, spices', story: 'A popular street food in Nigeria' },
    { id: 2, name: 'Moi Moi', price: { small: 6, medium: 8, large: 10 }, image: 'moi-moi.jpg', description: 'Steamed bean pudding', ingredients: 'Black-eyed peas, peppers, onions', story: 'A nutritious Nigerian dish' },
    { id: 3, name: 'Puff Puff', price: { small: 5, medium: 7, large: 9 }, image: 'puff-puff.jpg', description: 'Sweet fried dough balls', ingredients: 'Flour, sugar, yeast', story: 'A popular snack in West Africa' },
    { id: 4, name: 'Jamaican Patties', price: { small: 5, medium: 7, large: 9 }, image: 'jamaican-patties.jpg', description: 'Jamaican style patties', ingredients: 'Flour, meat, yeast', story: 'A popular snack in Jamaica' }

  ],
  mainDishes: [
    { id: 1, name: 'Jollof Rice', price: { small: 10, medium: 15, large: 20 }, image: 'jollof-rice.jpg', description: 'Spicy and flavorful rice dish', ingredients: 'Rice, tomatoes, peppers, spices', story: 'A staple at West African celebrations' },
    { id: 2, name: 'Egusi Soup', price: { small: 12, medium: 16, large: 22 }, image: 'egusi-soup.jpg', description: 'Melon seed soup served with fufu', ingredients: 'Egusi seeds, spinach, meat', story: 'A traditional Nigerian dish' },
    { id: 3, name: 'Calulu', price: { small: 15, medium: 20, large: 25 }, image: 'calulu.jpg', description: 'Traditional Leaf Soup From Sao Tome & Principe', ingredients: 'Chicken, Leaf, spices', story: 'A favorite for celebrations' },
    { id: 4, name: 'Cachupa', price: { small: 15, medium: 20, large: 25 }, image: 'cachupa.jpg', description: 'Traditional Soup From Cape Verde', ingredients: 'Lamb meat, Corn, Spices, Potatoes', story: 'A Traditonal Cape Verde Soup' }

  ],
  desserts: [
    { id: 1, name: 'Malva Pudding', price: { small: 7, medium: 9, large: 11 }, image: 'malva-pudding.png', description: 'Sweet and sticky sponge pudding', ingredients: 'Apricot jam, vanilla, cream', story: 'A beloved South African dessert' },
    { id: 2, name: 'Chin Chin', price: { small: 5, medium: 7, large: 9 }, image: 'chin-chin.jpg', description: 'Crunchy fried snack', ingredients: 'Flour, sugar, milk', story: 'A popular treat in Nigeria' },
    { id: 3, name: 'Banana Flambe', price: { small: 6, medium: 8, large: 10 }, image: 'banana-flambe.jpg', description: 'Fried Sweet Banana With Ice Cream', ingredients: 'Bananas, Carmel syrup, Ice Cream', story: 'A delightful dessert from French Caribbean' },
    { id: 4, name: 'Randburg Sun', price: { small: 3, medium: 6, large: 10 }, image: 'randburg-sun.jpg', description: 'Trifle is a dessert typically consisting of plain or sponge cake soaked in sherry', ingredients: 'Bananas, Carmel syrup, Ice Cream', story: 'Summer Christmas Truffle' }

  ],
  softDrinks: [
    { id: 1, name: 'Water', price: { small: 2, large: 3 }, image: 'water.jpg', description: 'Fresh mineral water', category: 'Soft Drinks' },
    { id: 2, name: 'Coca-Cola', price: { small: 2, large: 3 }, image: 'coca-cola.jpg', description: 'Classic cola drink', category: 'Soft Drinks' },
    { id: 3, name: 'Ice Tea', price: { small: 2, large: 3 }, image: 'ice-tea.jpg', description: 'Refreshing iced tea', category: 'Soft Drinks' },
    { id: 4, name: 'Compal', price: { small: 2, large: 3 }, image: 'compal.jpg', description: 'Refreshing Compal', category: 'Soft Drinks' }

  ],
  milkshakes: [
    { id: 1, name: 'Strawberry Milkshake', price: { small: 4, medium: 5, large: 6 }, image: 'strawberry-milkshake.jpg', description: 'Creamy strawberry shake', category: 'Milkshakes' },
    { id: 2, name: 'Chocolate Milkshake', price: { small: 4, medium: 5, large: 6 }, image: 'chocolate-milkshake.jpg', description: 'Rich chocolate shake', category: 'Milkshakes' },
    { id: 3, name: 'Vanilla Milkshake', price: { small: 4, medium: 5, large: 6 }, image: 'vanilla-milkshake.jpg', description: 'Classic vanilla shake', category: 'Milkshakes' },
    { id: 4, name: 'Oreo Milkshake', price: { small: 4, medium: 5, large: 6 }, image: 'oreo-milkshake.jpg', description: 'Classic oreo shake', category: 'Milkshakes' }
  ],
  alcoholicDrinks: [
    { id: 1, name: 'Apple Somersby Beer', price: 3, image: 'apple-somersby.jpg', description: 'Refreshing summer beer', category: 'Alcoholic Drinks' },
    { id: 2, name: 'Super Bock', price: 4, image: 'super-bock.jpg', description: 'Premium Portuguese beer', category: 'Alcoholic Drinks' },
    { id: 3, name: 'Stella Artois', price: 5, image: 'stella-artois.jpg', description: 'Belgian premium lager', category: 'Alcoholic Drinks' },
    { id: 4, name: 'Cuca', price: 5, image: 'cuca.jpg', description: 'Angolan premium lager', category: 'Alcoholic Drinks' }

  ]
};

// Transform the data into the required format
const transformedMenuItems = [
  ...menuItems.starters.map(item => ({ ...item, category: 'Starters' })),
  ...menuItems.mainDishes.map(item => ({ ...item, category: 'Main Dishes' })),
  ...menuItems.desserts.map(item => ({ ...item, category: 'Desserts' })),
  ...menuItems.softDrinks,
  ...menuItems.milkshakes,
  ...menuItems.alcoholicDrinks
];

const uploadMenuData = async () => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');

    // Clear existing menu items
    await Menu.deleteMany({});
    console.log('Existing menu items cleared');

    // Insert new menu items
    await Menu.insertMany(transformedMenuItems);
    console.log('Menu data uploaded successfully');
  } catch (error) {
    console.error('Error uploading menu data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

uploadMenuData();