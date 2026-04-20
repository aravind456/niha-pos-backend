const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// 1. Schema Definition
const invoiceSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    billNo: { type: String, required: true },
    //customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // இது மிக முக்கியம்
    customerId: { type: String },
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
        // 1. Body-la irundhu data-vai edukkom
        const { userMobile, items, creditAmount, customerId } = req.body;

        if (!userMobile) {
            return res.status(400).json({ success: false, message: "userMobile is required!" });
        }

        // Bill Number Generation
        // Bill Number logic-ai ippadi maathunga
const lastInvoice = await Invoice.findOne({ userMobile }).sort({ _id: -1 }); // Latest bill-ai edukka _id use pannunga
let nextBillNo = "1";
if (lastInvoice && lastInvoice.billNo) {
    nextBillNo = (parseInt(lastInvoice.billNo) + 1).toString();
}

        const newInvoice = new Invoice({
            ...req.body,
            billNo: nextBillNo,
            customerName: req.body.customerName || "Cash",
            cartItems: items, 
            billDate: req.body.date || req.body.createdAt || Date.now()
        });

        const savedInvoice = await newInvoice.save();

        // 🔥 STOCK UPDATE (DECREASE) - FIX START
        if (items && items.length > 0) {
            const bulkOps = items.map(item => {
                // Flutter-la irundhu 'quantity' nu varutha illa 'qty' nu varutha nu check pannunga
                const q = Number(item.quantity) || Number(item.qty) || 0;

                // 🔴 MUKKIAM: Flutter-la irundhu productId nu anupunga
                // Oru vela item._id-nu anupunaal adhaium edukkum
                const pId = item.productId || item._id || item.id;

                if (!pId) {
                    console.log("Error: Product ID missing for item:", item.name);
                }

                return {
                    updateOne: {
                        filter: { 
                            _id: pId, // Database Product ID match aaganum
                            userMobile: String(userMobile) // Database-la "1" match aaganum
                        },
                        // Inga dhaan stock-ai minus panrom
                        update: { $inc: { stock: -Math.abs(q) } } 
                    }
                };
            });

            // Log check panna (Render logs-la theriyum)
            console.log("Final Stock Update Ops:", JSON.stringify(bulkOps, null, 2));

            const result = await Product.bulkWrite(bulkOps);
            console.log("BulkWrite Result:", result); 
        }
        // 🔥 STOCK UPDATE - FIX END

        // 2. CUSTOMER LEDGER UPDATE
        if (creditAmount > 0 && customerId && customerId !== "null") {
            await Customer.findOneAndUpdate(
                { _id: customerId, userMobile: userMobile },
                { $inc: { currentBalance: Number(creditAmount) || 0 } }
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

        // Query-ai ippadi maathunga:
        const invoices = await Invoice.find({
            userMobile: mobile, // Mela params-la irundhu edutha 'mobile' variable
            billDate: { $gte: start, $lte: end } // Innaikku date-la irukkira bill-ai matum edukka
        });

       //const invoices = await Invoice.find({
       //userMobile: userMobile,
       //"cartItems.productId": productId // 🟢 Flutter-லிருந்து அனுப்பும் போது 'productId' என்ற பெயரில் அனுப்புகிறீர்களா என உறுதி செய்யவும்
       //}).select('billNo billDate cartItems');

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
        console.error("Dashboard Sales Error:", e);
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

        // 1. Get Product Details
        const product = await Product.findOne({ _id: productId, userMobile: userMobile });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const pName = product.name;

        // 2. Fetch Sales (Invoices)
        const invoices = await Invoice.find({
            userMobile: userMobile,
            $or: [
                { "cartItems.productId": productId },
                { "cartItems.id": productId }, // Flutter-la irundhu id-nu vara vaippu iruku
                { "cartItems.name": pName }
            ]
        }).select('billNo billDate customerName cartItems');

        // 3. Fetch Purchases
        const Purchase = mongoose.model('Purchase');
        const purchases = await Purchase.find({
            userMobile: userMobile,
            $or: [
                { "items.productId": productId },
                { "items.id": productId },
                { "items.name": pName }
            ]
        })
        .populate('supplierId', 'name')
        .select('billNo date supplierName items');

        let history = [];

        const opStock = Number(product.openingStock) || Number(product.opening_stock) || 0;

// 2. MUKKIYAM: Inga 'opStock' variable-ai thaan check pannanum
if (opStock > 0) {
    history.push({
        date: product.createdAt || new Date(2026, 0, 1), 
        type: 'OPENING',
        partyName: 'INITIAL OPENING STOCK',
        billNo: 'START',
        qty: opStock, // Variable-ai use pannunga
        runningBalance: opStock,
        color: 'blue'
    });
}

        // 4. Process Sales Data
        invoices.forEach(inv => {
            const item = inv.cartItems.find(i => 
                (i.productId && i.productId.toString() === productId) || 
                (i.id && i.id.toString() === productId) ||
                (i.name === pName)
            );
            if (item) {
                history.push({
                    date: inv.billDate,
                    type: 'SALES',
                    billNo: inv.billNo,
                    partyName: inv.customerName || "Cash Sale",
                    qty: Number(item.quantity) || Number(item.qty) || 0,
                    color: 'red'
                });
            }
        });

        // 5. Process Purchase Data
        purchases.forEach(p => {
            const sName = (p.supplierId && p.supplierId.name) ? p.supplierId.name : "Unknown Supplier";

            const item = p.items.find(i => 
                (i.productId && i.productId.toString() === productId) || 
                (i.id && i.id.toString() === productId) ||
                (i.name === pName)
            );
            if (item) {
                history.push({
                    date: p.date || p.Date, // Check capital 'D' in your schema
                    type: 'PURCHASE',
                    billNo: p.billNo,
                    partyName: sName,
                    qty: Number(item.quantity) || Number(item.qty) || 0,
                    color: 'green'
                });
            }
        });

        // 🔥 RUNNING BALANCE LOGIC STARTS HERE 🔥
        
        // Step A: Modhalla pazhaya date-la irundhu sort pannanum (Ascending)
        history.sort((a, b) => new Date(a.date) - new Date(b.date));

       let currentBal = 0; // Modhalla 0-la start pannanum
        history = history.map(item => {
          if (item.type === 'OPENING' || item.type === 'PURCHASE') {
           currentBal += item.qty;
          } else if (item.type === 'SALES') {
           currentBal -= item.qty;
          }
          return { ...item, runningBalance: currentBal };
      });

        // 6. Sort by Date (Latest First)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            productName: pName,
            currentStock: product.stock,
            history: history
        });

    } catch (e) {
        console.error("Report Error:", e.message);
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

// கஸ்டமர் ரூட்டை இப்படி அப்டேட் செய்யுங்கள்
router.get('/customer-bills/:userMobile/:customerId', async (req, res) => {
    try {
        const { userMobile, customerId } = req.params;

        // String-ஐ ObjectId-ஆக மாற்றுகிறோம்
        const mongoose = require('mongoose');
        const queryId = new mongoose.Types.ObjectId(customerId);

        const bills = await Invoice.find({ 
            userMobile: userMobile, 
            customerId: customerId, // மாற்றப்பட்ட ID
            paymentMode: "Credit" 
        }).sort({ billDate: -1 });
        
        console.log("Found Bills:", bills.length); // எத்தனை பில் வந்தது என்று லாக்-ல் பார்க்க
        res.status(200).json(bills);
    } catch (err) {
        console.error("Fetch Error Detail:", err); // என்ன எர்ரர் என்று லாக்-ல் காட்டும்
        res.status(500).json({ error: "Failed to fetch bills", detail: err.message });
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

// invoice.js -ல் இதைத் தேடி மாத்துங்க
router.get('/customer-outstanding-list/:userMobile', async (req, res) => {
    try {
        const customers = await Customer.find({ userMobile: req.params.userMobile }).sort({ name: 1 });
        
        // இங்க கண்டிஷன் இல்லாம எல்லா கஸ்டமரையும் அனுப்புறோம்
        const formattedData = customers.map(c => {
            const customerObj = c.toObject();
            const opening = Number(customerObj.openingBalance) || 0;
            const current = Number(customerObj.currentBalance) || 0;
            customerObj.totalBalance = opening + current;
            return customerObj;
        });

        res.json(formattedData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;