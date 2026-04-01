const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    userMobile: String, 
    code: { type: String },
    name: String,
    category: String,
    gst: String,
    unit: String,
    hsn: String,
    purchaseRate: Number,
    totalPurchaseCost: Number,
    salesRate: Number,
    mrp: Number,
    profit: Number,
    stock: { type: Number, default: 0 }, // Ithu thaan current stock
    openingStock: { type: Number, default: 0 }, // Initial-ah evlo irundhuchu
    createdAt: { type: Date, default: Date.now }
    
    
});


module.exports = mongoose.model('Product', productSchema);