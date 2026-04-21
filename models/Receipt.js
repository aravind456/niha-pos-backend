const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    receiptNo: { type: String, required: false, unique: true }, // எ.கா: REC-001
    billNo: String,
    date: { type: Date, default: Date.now },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'Online', 'Cheque'], default: 'Cash' },
    remarks: { type: String }
});

module.exports = mongoose.model('Receipt', receiptSchema);