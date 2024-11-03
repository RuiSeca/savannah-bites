const mongoose = require('mongoose');

// Hardcoded MongoDB URI
const uri = "mongodb+srv://rvcorporation23:9bjCM9XqHvtp3dGS@cluster0.eyzf9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; 

const connectToDatabase = async () => {
  try {
    console.log('MongoDB URI:', uri); // Debugging line to check if the URI is loaded

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message); // Provide more context
    throw error; // Rethrow the error to be caught in server.js
  }
};

module.exports = connectToDatabase;