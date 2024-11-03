// menuRoutes.js
const express = require('express');
const router = express.Router();
const Menu = require('../Models/Menu');

// GET menu items grouped by category
router.get('/', async (req, res) => {
    try {
        // Set a timeout for the database query
        const menuItems = await Menu.find().lean().maxTimeMS(5000);

        if (!menuItems || menuItems.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No menu items found'
            });
        }

        // Group items by category
        const groupedMenu = menuItems.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
            
            if (!acc[category]) {
                acc[category] = {
                    category,
                    items: []
                };
            }
            
            // Remove category from item to avoid duplication
            const { category: itemCategory, ...itemWithoutCategory } = item;
            acc[category].items.push(itemWithoutCategory);
            
            return acc;
        }, {});

        // Convert to array and sort
        const result = Object.values(groupedMenu)
            .sort((a, b) => a.category.localeCompare(b.category));

        res.status(200).json({
            status: 'success',
            data: result
        });

    } catch (error) {
        console.error('Menu fetch error:', error);
        
        // Send appropriate error response
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch menu items',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET specific menu item
router.get('/:id', async (req, res) => {
    try {
        const menuItem = await Menu.findById(req.params.id).lean().maxTimeMS(5000);
        
        if (!menuItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Menu item not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: menuItem
        });

    } catch (error) {
        console.error('Menu item fetch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch menu item',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;