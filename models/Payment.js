const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentNo: { type: String, required: true, unique: true }, // எ.கா: PAY-001
    date: { type: Date, default: Date.now },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'Online', 'Cheque'], default: 'Cash' },
    remarks: { type: String }
});

module.exports = mongoose.model('Payment', paymentSchema);