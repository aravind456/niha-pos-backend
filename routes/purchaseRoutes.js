const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase'); 
const Product = require('../models/Product');

// 1. SAVE PURCHASE (Pudhu entry podumbodhu stock egharum)
router.post('/save-purchase', async (req, res) => {
    try {
        const newPurchase = new Purchase(req.body);
        const savedPurchase = await newPurchase.save();

        // STOCK UPDATE: Purchase panna stock increase aaganum
        for (let item of req.body.items) {
            await Product.findOneAndUpdate(
                { _id: item.id, userMobile: req.body.userMobile },
                { $inc: { stock: item.qty } } 
            );
        }
        res.status(201).json({ success: true, message: "Purchase Saved & Stock Updated!" });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// 2. DELETE PURCHASE (Entry-ai delete panna, antha stock-ai thirumba kuraikkanum)
router.delete('/:id', async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) return res.status(404).json({ message: "Not found" });

        // STOCK REVERSE: Vaanguna item-ai delete panna stock-la irundhu kuraikkanum
        for (let item of purchase.items) {
            await Product.findOneAndUpdate(
                { _id: item.id, userMobile: purchase.userMobile },
                { $inc: { stock: -item.qty } } // Minus panrom
            );
        }

        await Purchase.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Purchase Deleted & Stock Adjusted!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. MODIFY/UPDATE PURCHASE (Idhu konjam complex - Pazhaya stock-ai reset panni pudhusu add pannanum)
router.put('/:id', async (req, res) => {
    try {
        const oldPurchase = await Purchase.findById(req.params.id);
        if (!oldPurchase) return res.status(404).json({ message: "Purchase history not found!" });
        
        // A. Pazhaya stock-ai reverse pannunga (Minus)
        for (let item of oldPurchase.items) {
            await Product.findOneAndUpdate(
                { _id: item.id, userMobile: oldPurchase.userMobile },
                { $inc: { stock: -item.qty } }
            );
        }

        // B. Pudhu data-ai update pannunga
        const updatedPurchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // C. Pudhu stock-ai add pannunga (Plus)
        for (let item of updatedPurchase.items) {
            await Product.findOneAndUpdate(
                { _id: item.id, userMobile: updatedPurchase.userMobile },
                { $inc: { stock: item.qty } }
            );
        }

        res.json({ success: true, message: "Purchase Updated & Stock Re-adjusted!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. GET ALL PURCHASES (With Supplier Name)
router.get('/get-purchases/:userMobile', async (req, res) => {
    try {
        const { userMobile } = req.params;
        const { fromDate, toDate } = req.query;

        let query = { userMobile: userMobile };

        if (fromDate && toDate) {
            // DB-la format "DD-MM-YYYY" nu irundha, 
            // Inga string matching correct-ah irukanum.
            query.date = { $gte: fromDate, $lte: toDate };
        }

        const purchases = await Purchase.find(query)
            .populate('supplierId', 'name')
            .sort({ createdAt: -1 }); // 'date' string-ah irukarthala 'createdAt' vachi sort pannunga

        res.json(purchases);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;