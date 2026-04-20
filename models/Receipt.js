const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    receiptNo: { type: String, required: true }, // இது REC-1, REC-2 என வரும்
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    amountReceived: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMode: { type: String, default: "Cash" },
    userMobile: { type: String, required: true }
});

module.exports = mongoose.model('Receipt', receiptSchema);