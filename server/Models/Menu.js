const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: {
        type: Object,
        validate: {
            validator: function(value) {
                return value && (value.small || value.medium || value.large);
            },
            message: 'At least one price (small, medium, or large) must be provided.'
        },
        required: true
    },
    image: { type: String },
    description: { type: String },
    ingredients: { type: String },
    story: { type: String },
    category: { type: String, required: true }
});

const Menu = mongoose.model('Menu', menuSchema);

module.exports = Menu;