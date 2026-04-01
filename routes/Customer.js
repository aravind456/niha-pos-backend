const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// ADD CUSTOMER
router.post('/add-customer', async (req, res) => {
    try {
        const { userMobile, name } = req.body;
        const customerCount = await Customer.countDocuments({ userMobile });
        const newCode = (customerCount + 1).toString().padStart(4, '0');
        const newCustomer = new Customer({ ...req.body, customerCode: newCode });
        const savedData = await newCustomer.save();
        res.status(201).json({ message: "Customer Saved", data: savedData });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

// GET CUSTOMERS
router.get('/get-customers/:userMobile', async (req, res) => {
    try {
        const customers = await Customer.find({ userMobile: req.params.userMobile }).sort({ name: 1 });
        res.status(200).json(customers);
    } catch (err) { 
        res.status(500).json({ error: "Fetch failed" }); 
    }
});

/// UPDATE CUSTOMER
router.put('/update-customer/:id', async (req, res) => {
    try {
        const updated = await Customer.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.status(200).json(updated);
    } catch (err) { res.status(400).json({ error: "Update failed" }); }
});

// DELETE CUSTOMER
router.delete('/delete-customer/:id', async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted" });
    } catch (err) { res.status(400).json({ error: "Delete failed" }); }
});

module.exports = router;