const mongoose = require('mongoose');

// 1. Schema name and Model name check
const invoiceSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    billNo: { type: String, required: true },
    customerName: String,
    customerMobile: String,
    salesmanName: String,
    cartItems: Array, // Neenga anupura 'items' inga save aagum
    totalAmount: Number,
    paymentMode: String,
    billDate: { type: Date, default: Date.now }
});

// Model-ah define pannunga (Inga 'Invoice' nu kudutha Atlas-la 'invoices' nu collection create aagum)
const Invoice = mongoose.model('Invoice', invoiceSchema);

// 2. Router-la Error varama irukka:
router.post('/save-bill', async (req, res) => {
    try {
        // userMobile check (Ithu illana MongoDB search-ey panna mudiyathu)
        if (!req.body.userMobile) {
            return res.status(400).json({ success: false, message: "userMobile is required!" });
        }

        // Bill Number Logic
        const lastInvoice = await Invoice.findOne({ userMobile: req.body.userMobile }).sort({ _id: -1 });
        let nextBillNo = "1"; 
        
        if (lastInvoice && lastInvoice.billNo) {
            nextBillNo = (parseInt(lastInvoice.billNo) + 1).toString();
        }

        // Puthiya Bill Create
        const newInvoice = new Invoice({
            userMobile: req.body.userMobile,
            billNo: nextBillNo,
            customerName: req.body.customerName || "Cash",
            customerMobile: req.body.customerMobile || "",
            salesmanName: req.body.salesmanName || "Self",
            cartItems: req.body.items, 
            totalAmount: req.body.totalAmount || 0,
            paymentMode: req.body.paymentMode || "Cash",
            billDate: req.body.createdAt || Date.now()
        });

        const savedInvoice = await newInvoice.save();

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved!", 
            billNo: savedInvoice.billNo 
        });

    } catch (err) {
        console.error("Save Bill Error:", err);
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = Invoice; // Inga 'Invoice' ah direct-ah export pannunga