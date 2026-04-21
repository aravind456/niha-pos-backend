const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    receiptNo: { type: String, required: true, unique: true }, // எ.கா: REC-001
    date: { type: Date, default: Date.now },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'Online', 'Cheque'], default: 'Cash' },
    remarks: { type: String }
});

module.exports = mongoose.model('Receipt', receiptSchema);