const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// 1. Schema Definition
const invoiceSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    billNo: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // இது மிக முக்கியம்
    customerName: String,
    customerMobile: String,
    salesmanName: String,
    cartItems: Array,
    totalAmount: Number,
    paymentMode: String,
    billDate: { type: Date, default: Date.now },
    // Multi payment-க்காக இவை தேவை
    cashAmount: Number,
    onlineAmount: Number,
    creditAmount: Number
});

// 2. Model Creation
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

// Customer Model Import (இது Ledger அப்டேட் செய்ய தேவை)
// ஒருவேளை உங்கள் models folder-ல் Customer.js இருந்தால் இதை பயன்படுத்தவும்
let Customer;
try {
    Customer = mongoose.model('Customer');
} catch (e) {
    // ஒருவேளை இன்னும் model கிரியேட் ஆகவில்லை என்றால் import செய்யவும்
    Customer = require('../models/Customer');
}

// ==========================================
// 1. ஒரு கஸ்டமரின் பில்களை மட்டும் எடுக்க (Ledger-க்காக)
// =========================================

router.post('/save-bill', async (req, res) => {
    try {
        const { userMobile, items, creditAmount, customerId } = req.body;

        if (!userMobile) {
            return res.status(400).json({ success: false, message: "userMobile is required!" });
        }

        // Bill Number Auto-Generation
        const lastInvoice = await Invoice.findOne({ userMobile }).sort({ billNo: -1 });
        let nextBillNo = lastInvoice && lastInvoice.billNo ? (parseInt(lastInvoice.billNo) + 1).toString() : "1";

        const newInvoice = new Invoice({
            ...req.body,
            billNo: nextBillNo,
            customerName: req.body.customerName || "Cash",
            cartItems: items, 
            billDate: req.body.createdAt || Date.now()
        });

        const savedInvoice = await newInvoice.save();

        // 🔥 1. STOCK UPDATE (DECREASE)
        if (items && items.length > 0) {
            const bulkOps = items.map(item => ({
                updateOne: {
                    filter: { 
                        _id: item.productId, 
                        userMobile: userMobile 
                    },
                    update: { $inc: { stock: -Math.abs(Number(item.quantity)) } } // Kandippa minus aagum
                }
            }));
            await Product.bulkWrite(bulkOps);
        }

        // 2. CUSTOMER LEDGER UPDATE
        if (creditAmount > 0 && customerId) {
            await Customer.findOneAndUpdate(
                { _id: customerId, userMobile: userMobile },
                { $inc: { currentBalance: creditAmount } }
            );
        }

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved & Stock Updated!", 
            billNo: savedInvoice.billNo 
        });

    } catch (err) {
        console.error("Save Bill Error:", err);
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

// ==========================================
// 2. TODAY SALES API
// ==========================================
router.get('/today-sales/:mobile', async (req, res) => {
    try {
        const mobile = req.params.mobile;
        const start = new Date();
        start.setHours(0, 0, 0, 0); 
        const end = new Date();
        end.setHours(23, 59, 59, 999); 

        const invoices = await Invoice.find({
            userMobile: mobile,
            billDate: { $gte: start, $lte: end }
        });

        let total = 0, cash = 0, upi = 0, credit = 0;

        invoices.forEach(inv => {
            const billTotal = Number(inv.totalAmount) || 0;
            const mode = (inv.paymentMode || "").toLowerCase();

            if (mode === 'multi') {
                cash += Number(inv.cashAmount) || 0;
                upi += Number(inv.onlineAmount) || 0;
                credit += Number(inv.creditAmount) || 0;
                total += (Number(inv.cashAmount) || 0) + (Number(inv.onlineAmount) || 0) + (Number(inv.creditAmount) || 0);
            } else if (mode === 'cash') {
                cash += billTotal;
                total += billTotal;
            } else if (mode === 'upi' || mode === 'online') {
                upi += billTotal;
                total += billTotal;
            } else if (mode === 'credit') {
                credit += billTotal;
                total += billTotal;
            }
        });

        res.status(200).json({ 
            totalSales: total, 
            cashSales: cash, 
            upiSales: upi, 
            creditSales: credit 
        });

    } catch (e) {
        res.status(500).json({ error: "Server error occurred" });
    }
});

// ==========================================
// 3. SALES REPORT API
// ==========================================
router.get('/report/sales', async (req, res) => {
    try {
        const { userMobile, fromDate, toDate } = req.query;
        const start = new Date(fromDate || new Date());
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate || new Date());
        end.setHours(23, 59, 59, 999);

        const sales = await Invoice.find({
            userMobile: userMobile,
            billDate: { $gte: start, $lte: end }
        }).sort({ billDate: -1 });

        res.json(sales);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ==========================================
// STOCK HISTORY & CLOSING STOCK REPORT
// ==========================================


router.get('/stock-report/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { userMobile } = req.query;

        // 1. Purchase History (Stock Add-aanadha edukkum)
        const Purchase = mongoose.model('Purchase');
        const purchases = await Purchase.find({
            userMobile: userMobile,
            "items.productId": productId
        }).select('billNo date items totalAmount');

        // 2. Sales History (Stock Minus-aanadha edukkum)
        const invoices = await Invoice.find({
            userMobile: userMobile,
            "cartItems.productId": productId
        }).select('billNo billDate cartItems');

        // 3. Current Product Details (Closing Stock-kaga)
        const product = await Product.findOne({ _id: productId, userMobile: userMobile });

        let history = [];

        // Purchase Data-vai History-la sethu 'Type' Purchase-nu vaikkarom
        purchases.forEach(p => {
            const item = p.items.find(i => i.productId.toString() === productId);
            history.push({
                date: p.date,
                type: 'PURCHASE',
                billNo: p.billNo,
                qty: item ? item.quantity : 0,
                color: 'green'
            });
        });

        // Sales Data-vai History-la sethu 'Type' Sales-nu vaikkarom
        invoices.forEach(inv => {
            const item = inv.cartItems.find(i => i.productId.toString() === productId);
            history.push({
                date: inv.billDate,
                type: 'SALES',
                billNo: inv.billNo,
                qty: item ? item.quantity : 0,
                color: 'red'
            });
        });

        // Date wise sort pannuvom (Latest first)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            productName: product ? product.name : "Unknown",
            currentStock: product ? product.stock : 0,
            history: history
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// இது கண்டிப்பாக இருக்க வேண்டும்
router.delete('/:id', async (req, res) => {
    try {
        const billId = req.params.id;
        // பில்லை முழுமையாக டெலீட் செய்ய:
        await Invoice.findByIdAndDelete(billId); 
        
        res.json({ success: true, message: "Bill Deleted Successfully" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/report/item-wise', async (req, res) => {
    try {
        const { userMobile, fromDate, toDate } = req.query;
        
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        const invoices = await Invoice.find({
            userMobile: userMobile,
            billDate: { $gte: start, $lte: end }
        });

        let itemSummary = {};

        invoices.forEach(inv => {
            // நீங்கள் ஸ்கீமாவில் cartItems என்றுதான் வைத்துள்ளீர்கள்
            const items = inv.cartItems || []; 
            
            items.forEach(item => {
                // Flutter-லிருந்து 'name' அல்லது 'productName' என எது வந்தாலும் எடுக்கும்
                const itemName = item.name || item.productName || "Unknown Item";
                
                if (!itemSummary[itemName]) {
                    itemSummary[itemName] = { 
                        name: itemName, 
                        totalQty: 0, 
                        totalAmount: 0,
                        history: [] 
                    };
                }

                // 🔴 இங்கே கவனிக்கவும்: உங்கள் Flutter கோடில் 'qty' என்று அனுப்புகிறீர்களா அல்லது 'quantity' ஆ?
                // அதேபோல 'price' அல்லது 'rate'? இரண்டையுமே செக் செய்கிறோம்:
                const q = Number(item.quantity) || Number(item.qty) || 0;
                const p = Number(item.price) || Number(item.rate) || Number(item.sellingPrice) || 0;

                itemSummary[itemName].totalQty += q;
                itemSummary[itemName].totalAmount += (q * p);
                
                itemSummary[itemName].history.push({
                    date: inv.billDate,
                    billNo: inv.billNo,
                    customer: inv.customerName || "Cash",
                    qty: q,
                    price: p
                });
            });
        });

        res.json(Object.values(itemSummary));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/customer-history/:userMobile/:customerName', async (req, res) => {
    try {
        const { userMobile, customerName } = req.params;
        const history = await Invoice.find({ 
            userMobile: userMobile, 
            customerName: customerName,
            paymentMode: "Credit"
        }).sort({ billDate: -1 });
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// routes/invoiceRoutes.js

router.get('/customer-outstanding/:customerId', async (req, res) => {
    try {
        const bills = await Invoice.find({ 
            customerId: req.params.customerId, 
            paymentType: "Credit" 
        }).sort({ createdAt: -1 }); // Pudhu bill mela varum
        
        res.json(bills);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;