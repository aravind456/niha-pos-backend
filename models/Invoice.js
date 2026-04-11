const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    billNo: { type: String, required: true },
    customerName: { type: String, default: "Cash" },
    customerMobile: { type: String, default: "" },
    salesmanName: { type: String, default: "Self" }, // 👈 Inga thaan store aagum
    cartItems: [
        {
            productName: String,
            qty: Number,
            rate: Number,
            total: Number
        }
    ],
    totalAmount: Number,
    paymentMode: String, // Cash, Online, or Multi
    billDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);