const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier'); // Model path correct-ah irukanum

// ADD SUPPLIER
router.post('/add-supplier', async (req, res) => {
    try {
        const { userMobile, name } = req.body;
        const supplierCount = await Supplier.countDocuments({ userMobile });
        const newCode = "S" + (supplierCount + 1).toString().padStart(4, '0');
        const newSupplier = new Supplier({ ...req.body, supplierCode: newCode });
        await newSupplier.save();
        res.status(201).json({ message: "Supplier Saved", code: newCode });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

// GET SUPPLIERS
router.get('/get-suppliers/:userMobile', async (req, res) => {
    try {
        const suppliers = await Supplier.find({ userMobile: req.params.userMobile }).sort({ name: 1 });
        res.status(200).json(suppliers);
    } catch (err) { 
        res.status(500).json({ error: "Fetch failed" }); 
    }
});


// UPDATE SUPPLIER
router.put('/update-supplier/:id', async (req, res) => {
    try {
        const updatedSupplier = await Supplier.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true }
        );
        res.status(200).json({ message: "Updated", data: updatedSupplier });
    } catch (err) {
        res.status(400).json({ error: "Update failed" });
    }
});

// DELETE SUPPLIER
router.delete('/delete-supplier/:id', async (req, res) => {
    try {
        await Supplier.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Supplier Deleted" });
    } catch (err) {
        res.status(400).json({ error: "Delete failed" });
    }
});
module.exports = router;