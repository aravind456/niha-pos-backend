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
        // userMobile-ஐ நம்பராக மாற்றி தேடுகிறோம் (String-ஆ வந்தாலும் நம்பரா மாத்திடும்)
        const mobile = req.params.userMobile;
        
        const customers = await Customer.find({ 
            $or: [
                { userMobile: mobile },
                { userMobile: String(mobile) },
                { userMobile: Number(mobile) } 
            ]
        }).sort({ name: 1 });

        if (customers.length === 0) {
            console.log("No customers found for mobile:", mobile);
        }

        const formattedCustomers = customers.map(c => {
            const customerObj = c.toObject();
            customerObj.openingBalance = Number(customerObj.openingBalance) || 0;
            customerObj.currentBalance = Number(customerObj.currentBalance) || 0;
            customerObj.totalBalance = customerObj.openingBalance + customerObj.currentBalance;
            customerObj.mobile = customerObj.mobileNumber || customerObj.mobile || "No Number";
            return customerObj;
        });

        res.status(200).json(formattedCustomers);
    } catch (err) { 
        console.error("Backend Error:", err);
        res.status(500).json({ error: "Fetch failed" }); 
    }
});

// GET CUSTOMERS
//router.get('/get-customers/:userMobile', async (req, res) => {
//    try {
//        const customers = await Customer.find({ userMobile: req.params.userMobile }).sort({ name: 1 });
//        res.status(200).json(customers);
//    } catch (err) { 
//        res.status(500).json({ error: "Fetch failed" }); 
//    }
//});

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

// GET ONLY CREDIT BILLS FOR A CUSTOMER
router.get('/customer-bills/:customerId', async (req, res) => {
    try {
        // Inga 'Credit' mode-la irukara bills-ai mattum filter panrom
        const bills = await Invoice.find({ 
            customerId: req.params.customerId,
            paymentMode: "Credit" 
        }).sort({ billDate: -1 });
        
        res.status(200).json(bills);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch bills" });
    }
});

module.exports = router;