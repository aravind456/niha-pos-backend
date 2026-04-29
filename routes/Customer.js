const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// 1. ADD CUSTOMER - டபுள் என்ட்ரி ஆகாமல் இருக்க செக் சேர்க்கப்பட்டுள்ளது
router.post('/add-customer', async (req, res) => {
    try {
        const { userMobile, mobileNumber, openingBalance } = req.body;

        // ஏற்கனவே இதே மொபைல் எண்ணில் கஸ்டமர் இருக்கிறாரா என்று பார்க்க
        const existingCustomer = await Customer.findOne({ 
            userMobile: userMobile, 
            mobileNumber: mobileNumber 
        });

        if (existingCustomer) {
            return res.status(400).json({ error: "இந்த மொபைல் எண் ஏற்கனவே உள்ளது!" });
        }

        const customerCount = await Customer.countDocuments({ userMobile });
        const newCode = (customerCount + 1).toString().padStart(4, '0');

        const newCustomer = new Customer({ 
            ...req.body, 
            customerCode: newCode,
            currentBalance: Number(openingBalance) || 0 
        });

        const savedData = await newCustomer.save();
        res.status(201).json({ message: "Customer Saved", data: savedData });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

// 2. GET CUSTOMERS - ஒரு முறை மட்டும் போதும் (சரியான லாஜிக் உடன்)
router.get('/get-customers/:userMobile', async (req, res) => {
    try {
        const customers = await Customer.find({ userMobile: req.params.userMobile }).sort({ name: 1 });
        
        const formattedCustomers = customers.map(c => {
            const customerObj = c.toObject();
            
            // balance மற்றும் outstanding இரண்டிலும் currentBalance-ஐக் கொடுக்கவும்
            // ஒருவேளை currentBalance இல்லையென்றால் (null), 0 என்று காட்டும்
            const bal = Number(customerObj.currentBalance) || 0;
            customerObj.balance = bal; 
            customerObj.outstanding = bal;
            
            customerObj.mobile = customerObj.mobileNumber || customerObj.mobile || "No Number";
            return customerObj;
        });

        res.status(200).json(formattedCustomers);
    } catch (err) { 
        res.status(500).json({ error: "Fetch failed" }); 
    }
});

// 3. UPDATE CUSTOMER - இது வேலை செய்யவில்லை என்று சொன்னீர்கள், இப்போது இது வேலை செய்யும்
router.put('/update-customer/:id', async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // ஒருவேளை openingBalance-ஐ மாற்றினால் currentBalance-ஐயும் அப்டேட் செய்ய
        if (updateData.openingBalance !== undefined) {
            updateData.currentBalance = updateData.openingBalance;
        }

        const updated = await Customer.findByIdAndUpdate(
            req.params.id, 
            { $set: updateData }, 
            { new: true } // புதிய டேட்டாவை திரும்ப அனுப்பும்
        );
        res.status(200).json(updated);
    } catch (err) { 
        res.status(400).json({ error: "Update failed" }); 
    }
});

// 4. DELETE CUSTOMER
router.delete('/delete-customer/:id', async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted" });
    } catch (err) { res.status(400).json({ error: "Delete failed" }); }
});

// 5. FIX BALANCE - தப்பான டேட்டாவைச் சரிசெய்ய (தேவைப்பட்டால் மட்டும் பயன்படுத்தவும்)
router.put('/fix-balance/:id', async (req, res) => {
    try {
        await Customer.findByIdAndUpdate(req.params.id, { currentBalance: 0 });
        res.send("Fixed");
    } catch (err) { res.status(500).send(err.message); }
});

module.exports = router;