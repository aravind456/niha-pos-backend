const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    customerCode: { type: String, required: true }, // Inga 'required' sethukonga
    name: { type: String, required: true },
    openingBalance: { type: Number, default: 0 },
    address1: String,
    address2: String,
    address3: String,
    pincode: String,
    mobileNumber: String,
    gstNumber: String,
    createdAt: { type: Date, default: Date.now }
});

// Indexing: UserMobile and Name vechu search panna speed-ah irukkum
customerSchema.index({ userMobile: 1, name: 1 });

module.exports = mongoose.model('Customer', customerSchema);