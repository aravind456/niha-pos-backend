const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Path-ai '..' vachi check pannikonga

// 1. ADD PRODUCT
router.post('/add-product', async (req, res) => {
    try {
        const { userMobile, ...productData } = req.body;
        const lastProduct = await Product.findOne({ userMobile }).sort({ createdAt: -1 });
        let nextCode = "001";
        if (lastProduct && lastProduct.code) {
            let lastNumber = parseInt(lastProduct.code);
            nextCode = (lastNumber + 1).toString().padStart(3, '0');
        }
        const newProduct = new Product({ ...productData, userMobile, code: nextCode });
        await newProduct.save();
        res.status(201).send({ message: "Product Saved!", product: newProduct });
    } catch (err) {
        res.status(400).send({ error: "Failed to save product" });
    }
});

// 2. GET PRODUCTS
router.get('/get-products/:mobile', async (req, res) => {
    try {
        const products = await Product.find({ userMobile: req.params.mobile }); 
        res.json(products);
    } catch (err) { 
        res.status(500).json({ error: "Failed to fetch" }); 
    }
});

// UPDATE PRODUCT
router.put('/update-product/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true }
        );
        res.status(200).json({ message: "Updated", product: updatedProduct });
    } catch (err) {
        res.status(400).json({ error: "Update failed" });
    }
});

// DELETE PRODUCT
router.delete('/delete-product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Product Deleted" });
    } catch (err) {
        res.status(400).json({ error: "Delete failed" });
    }
});
// MUKKIYAM: Ithai marakkama kadaisiyila podunga
module.exports = router;