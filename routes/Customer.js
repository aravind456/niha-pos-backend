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
//router.get('/customer-bills/:customerId', async (req, res) => {
router.get('/customer-bills/:userMobile/:customerId', async (req, res) => {
    try {
        const { userMobile, customerId } = req.params;

        // String-ஐ ObjectId-ஆக மாற்றுகிறோம்
        const mongoose = require('mongoose');
        const queryId = new mongoose.Types.ObjectId(customerId);

        const bills = await Invoice.find({ 
            userMobile: userMobile, 
            customerId: customerId, // மாற்றப்பட்ட ID
            paymentMode: "Credit" 
        }).sort({ billDate: -1 });
        
        console.log("Found Bills:", bills.length); // எத்தனை பில் வந்தது என்று லாக்-ல் பார்க்க
        res.status(200).json(bills);
    } catch (err) {
        console.error("Fetch Error Detail:", err); // என்ன எர்ரர் என்று லாக்-ல் காட்டும்
        res.status(500).json({ error: "Failed to fetch bills", detail: err.message });
    }
});

router.post('/receipt-in', async (req, res) => {
    try {
        const { customerId, userMobile, amountReceived } = req.body;
        
        // 1. கஸ்டமர் பேலன்ஸ் குறைக்கிறோம்
        const updatedCustomer = await Customer.findOneAndUpdate(
            { _id: customerId, userMobile: userMobile },
            { $inc: { currentBalance: -Number(amountReceived) } }, 
            { new: true }
        );

        if (!updatedCustomer) {
            return res.status(404).json({ error: "Customer Not Found" });
        }

        // 2. 🟢 மிக முக்கியம்: பணத்தை வரவு வைத்ததற்கு ஒரு "Fake" Invoice அல்லது 
        // ஒரு ட்ரான்ஸாக்ஷன் ரெக்கார்ட் உருவாக்கினால் தான் ஹிஸ்டரியில் காட்டும்.
        const receiptInvoice = new Invoice({
            userMobile: userMobile,
            billNo: "REC-" + Date.now().toString().slice(-4),
            customerId: customerId,
            customerName: updatedCustomer.name,
            totalAmount: amountReceived,
            paymentMode: "Receipt", // இதை Receipt என வைப்போம்
            billDate: new Date()
        });
        await receiptInvoice.save();

        res.status(200).json({ success: true, newBalance: updatedCustomer.currentBalance });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;