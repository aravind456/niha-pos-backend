const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase'); 
const Product = require('../models/Product');

// 1. SAVE PURCHASE (Pudhu entry podumbodhu stock egharum)
// routes/purchases.js

router.post('/save-purchase', async (req, res) => {
    try {
        const { userMobile, supplierId, totalAmount, paymentType, items, billNo, date } = req.body;

        const newPurchase = new Purchase({
            userMobile, supplierId, totalAmount, paymentType, items, billNo, date
        });

        const savedPurchase = await newPurchase.save();

       if (items && items.length > 0) {
    const bulkOps = items.map(item => {
        // Log panni paarunga ID varudha-nu
        console.log("Updating Product ID:", item.productId); 
        
        return {
            updateOne: {
                filter: { 
                    _id: item.productId, // Inga Flutter-la irundhu 'productId' katchidhama varanum
                    userMobile: String(userMobile) 
                },
                // quantity or qty - ethu vandhalum handle panna:
                update: { 
                    $inc: { 
                        stock: Math.abs(Number(item.qty) || Number(item.quantity) || 0) 
                    } 
                }
            }
        };
    });
    await Product.bulkWrite(bulkOps);
    }

        // 2. SUPPLIER LEDGER UPDATE
        if (paymentType === "Credit" && supplierId) {
            const Supplier = require('../models/Supplier');
            await Supplier.findOneAndUpdate(
                { _id: supplierId, userMobile: userMobile }, 
                { $inc: { currentBalance: totalAmount } }
            );
        }

        res.status(200).json({ success: true, message: "Purchase & Stock Updated!", data: savedPurchase });

    } catch (e) {
        console.error("Purchase Error:", e);
        res.status(500).json({ success: false, error: e.message });
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

router.get('/customer-history/:userMobile/:customerName', async (req, res) => {
    try {
        const { userMobile, customerName } = req.params;
        const history = await Invoice.find({ 
            userMobile: userMobile, 
            customerName: customerName 
        }).sort({ billDate: -1 });
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 🟢 Specific Supplier History edukka pudhu API
router.get('/supplier-history/:userMobile/:supplierId', async (req, res) => {
    try {
        const { userMobile, supplierId } = req.params;
        const history = await Purchase.find({ 
            userMobile: userMobile, 
            supplierId: supplierId,  // Idhai vachi filter panrom
            paymentType: "Credit"
        }).sort({ createdAt: -1 });
        
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/outstanding-bills/:supplierId', async (req, res) => {
    const bills = await Purchase.find({ 
        supplierId: req.params.supplierId, 
        paymentType: "Credit" 
    }).sort({ createdAt: -1 });
    res.json(bills);
});

// purchases.js file-oda kadaisiyila (module.exports-ku munnadi) idhai sethudunga
router.get('/supplier-bills/:supplierId', async (req, res) => {
    try {
        const { supplierId } = req.params;
        const bills = await Purchase.find({ 
            supplierId: supplierId, 
            paymentType: "Credit" 
        }).sort({ createdAt: -1 }); 
        
        res.json(bills);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



module.exports = router;