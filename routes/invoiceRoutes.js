const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

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
// ==========================================
router.get('/customer-bills/:customerId', async (req, res) => {
    try {
        const bills = await Invoice.find({ 
            customerId: req.params.customerId 
        }).sort({ billDate: -1 });
        res.status(200).json(bills);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

// ==========================================
// 1. SAVE BILL API
// ==========================================
router.post('/save-bill', async (req, res) => {
    try {
        if (!req.body.userMobile) {
            return res.status(400).json({ success: false, message: "userMobile is required!" });
        }

        const lastInvoice = await Invoice.findOne({ userMobile: req.body.userMobile }).sort({ billNo: -1 }); //id
        let nextBillNo = "1"; 
        
        if (lastInvoice && lastInvoice.billNo) {
            nextBillNo = (parseInt(lastInvoice.billNo) + 1).toString();
        }

        const newInvoice = new Invoice({
            ...req.body,
            billNo: nextBillNo,
            customerName: req.body.customerName || "Cash",
            customerMobile: req.body.customerMobile || "",
            salesmanName: req.body.salesmanName || "Self",
            cartItems: req.body.items, 
            billDate: req.body.createdAt || Date.now()
        });

        const savedInvoice = await newInvoice.save();

        // Customer Ledger Update (If Credit)
        if (req.body.creditAmount > 0 && req.body.customerId) {
            await Customer.findByIdAndUpdate(
                req.body.customerId, 
                { $inc: { currentBalance: req.body.creditAmount } }
            );
            } 
        

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved!", 
            billNo: savedInvoice.billNo 
        });

    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ==========================================
// 2. TODAY SALES API
// ==========================================
router.get('/today-sales/:mobile', async (req, res) => {
    try {
        const mobile = req.params.mobile;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); 
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); 

        const invoices = await Invoice.find({
            userMobile: mobile,
            billDate: { $gte: start, $lte: end }
        });

        let total = 0, cash = 0, upi = 0, credit = 0;

        invoices.forEach(inv => {
            const billTotal = Number(inv.totalAmount) || 0;
            
            // Payment Mode-ai small letters-ah mathi check pandrom (Error varama irukka)
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

        // 3. FINALLY SEND DATA
        res.status(200).json({ 
            totalSales: total, 
            cashSales: cash, 
            upiSales: upi, 
            creditSales: credit 
        });

    } catch (e) {
        console.error("Dashboard Error:", e.message);
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
            customerName: customerName 
        }).sort({ billDate: -1 });
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;