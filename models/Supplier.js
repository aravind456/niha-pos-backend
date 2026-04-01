const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    supplierCode: { type: String, required: true },
    name: { type: String, required: true },
    openingBalance: { type: Number, default: 0 },
    mobileNumber: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    address1: { type: String, default: "" },
    address2: { type: String, default: "" },
    address3: { type: String, default: "" },
    pincode: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Supplier', SupplierSchema);