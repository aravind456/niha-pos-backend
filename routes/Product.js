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

// PURCHASE ENTRY ROUTE
router.post('/add-purchase', async (req, res) => {
    try {
        const { userMobile, productId, purchaseQuantity, purchaseRate } = req.body;

        // 1. Find the product
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // 2. Logic: Opening stock-ai distrub pannama, 'stock' field-la add panrom
        // Total Stock = openingStock + (Existing Stock + New Purchase)
        const newStockTotal = product.stock + parseFloat(purchaseQuantity);

        // 3. Update Product (Purchase rate kooda update aagalaam optional-ah)
        product.stock = newStockTotal;
        if(purchaseRate) product.purchaseRate = purchaseRate;

        await product.save();

        res.status(200).json({ 
            message: "Purchase Updated Successfully!", 
            currentStock: product.stock,
            openingStock: product.openingStock 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PURCHASE ENTRY ROUTE - Cart items-ku support pannum maari fix
router.post('/save-purchase', async (req, res) => {
    try {
        const { userMobile, items } = req.body; // Flutter-la irundhu 'items' List varum

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items found" });
        }

        const bulkOps = items.map(item => {
            // Flutter-la irundhu 'productId' nu anupunga
            const pId = item.productId || item._id || item.id;
            const q = Number(item.quantity) || Number(item.qty) || 0;

            return {
                updateOne: {
                    filter: { _id: pId, userMobile: String(userMobile) },
                    // Purchase panna stock PLUS (+) aaganum
                    update: { $inc: { stock: Math.abs(q) } } 
                }
            };
        });

        const result = await Product.bulkWrite(bulkOps);

        res.status(200).json({ 
            success: true,
            message: "Purchase Saved & Stock Added!", 
            modifiedCount: result.modifiedCount 
        });

    } catch (err) {
        console.error("Purchase Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// MUKKIYAM: Ithai marakkama kadaisiyila podunga
module.exports = router;

