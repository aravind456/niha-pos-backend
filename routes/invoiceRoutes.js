router.post('/save-bill', async (req, res) => {
    // 1. First-ey userMobile check pannanum (Intha block-ah mela kondu vandhutom)
    if (!req.body.userMobile) {
        return res.status(400).json({ success: false, message: "userMobile is required!" });
    }

    try {
        // 2. Bill Number Auto-increment
        // userMobile vachu filter panna thaan antha user-oda correct bill no varum
        const lastInvoice = await Invoice.findOne({ userMobile: req.body.userMobile }).sort({ billNo: -1 });
        let nextBillNo = 1;
        
        if (lastInvoice && lastInvoice.billNo) {
            // BillNo string-ah irundha parseInt pannanum, number-ah irundha direct-ah +1
            nextBillNo = parseInt(lastInvoice.billNo) + 1;
        }

        // 3. Bill-ah save panrom
        const newInvoice = new Invoice({
            ...req.body,
            billNo: nextBillNo.toString() // Schema string-na toString() pannunga
        });
        const savedInvoice = await newInvoice.save();

        // 4. Credit logic
        const creditAmt = req.body.creditAmount || (req.body.paymentDetails ? req.body.paymentDetails.credit : 0);

        if (creditAmt > 0 && req.body.customerId) {
            await Customer.findByIdAndUpdate(
                req.body.customerId, 
                { $inc: { totalDue: creditAmt } }
            );
        }

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved Successfully!",
            billNo: savedInvoice.billNo,
            invoiceId: savedInvoice._id 
        });

    } catch (err) {
        console.error("Save Bill Error:", err);
        res.status(400).json({ success: false, message: err.message });
    }
});