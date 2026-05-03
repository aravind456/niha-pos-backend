const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// 1. Schema name and Model name check
const invoiceSchema = new mongoose.Schema({
    userMobile: { type: String, required: true },
    billNo: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // இது மிக முக்கியம்
    customerName: String,
    customerMobile: String,
    salesmanName: String,
    cartItems: Array,
    totalAmount: Number,
   // paymentMode: String,
    billDate: { type: Date, default: Date.now },
    // Multi payment-க்காக இவை தேவை
    cashAmount: Number,
    onlineAmount: Number,
    creditAmount: Number,
    type: { type: String, default: "SALES" }, // "SALES" அல்லது "RECEIPT"
    paymentMode: { type: String }, // Cash, Gpay
    description: { type: String },
});


module.exports = router;