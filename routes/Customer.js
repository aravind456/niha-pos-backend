const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// ADD CUSTOMER
// ADD CUSTOMER
router.post('/add-customer', async (req, res) => {
    try {
        const { userMobile, name, openingBalance } = req.body;
        const customerCount = await Customer.countDocuments({ userMobile });
        const newCode = (customerCount + 1).toString().padStart(4, '0');

        // மாற்றம் இங்கே: 
        // புதிய கஸ்டமர் சேரும்போது, currentBalance-ம் openingBalance-க்கு சமமாக இருக்க வேண்டும்.
        const newCustomer = new Customer({ 
            ...req.body, 
            customerCode: newCode,
            currentBalance: Number(openingBalance) || 0 // இதைச் சேர்க்கவும்
        });

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
        
        // டேட்டா அனுப்பும் முன் மொபைல் நம்பர் செக்
        const formattedCustomers = customers.map(c => {
            const customerObj = c.toObject();
            const opening = Number(customerObj.openingBalance) || 0;
            const current = Number(customerObj.currentBalance) || 0;
            customerObj.totalBalance = opening + current; // Inga kooti anupurom
            // இதில் 'mobile' அல்லது 'customerMobile' - உங்கள் மாடலில் உள்ள பெயரைக் கொடுங்கள்
            //customerObj.mobile = customerObj.mobile || customerObj.customerMobile || "No Number";
            customerObj.mobile = customerObj.mobileNumber || customerObj.mobile || "No Number";
            return customerObj;
        });

        res.status(200).json(formattedCustomers);
    } catch (err) { 
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
// தப்பான பேலன்ஸை சரிசெய்ய (One-time fix)
router.put('/fix-balance/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        // உதாரணமாக: opening 1000 - receipt 1000 = balance 0 வர வேண்டும்
        // இப்போது -1000 இருப்பதால், அதை 0-ஆக மாற்றுங்கள்
        await Customer.findByIdAndUpdate(req.params.id, { currentBalance: 0 });
        res.send("Fixed");
    } catch (err) { res.status(500).send(err.message); }
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