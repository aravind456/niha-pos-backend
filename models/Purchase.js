const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    billNo: { type: String },
    date: { type: String },
    items: [
        {
            id: String,
            name: String,
            qty: Number,
            basicRate: Number,
            gst: Number,
            taxAmt: Number,
            total: Number
        }
    ],
    totalAmount: { type: Number, required: true },
    paymentType: { type: String, default: 'Cash' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);