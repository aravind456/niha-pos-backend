router.post('/save-bill', async (req, res) => {
    try {
        // 1. Bill Number Auto-increment Logic
        const lastInvoice = await Invoice.findOne().sort({ billNo: -1 });
        let nextBillNo = lastInvoice && lastInvoice.billNo ? lastInvoice.billNo + 1 : 1;

        // 2. Bill-ah save panrom (billNo sethu)
        const newInvoice = new Invoice({
            ...req.body,
            billNo: nextBillNo
        });
        const savedInvoice = await newInvoice.save();

        // 3. Credit logic: existing logic-ah use panrom
        // Note: Frontend-la irunthu 'creditAmount' nu anupuna adha 'paymentDetails.credit' ku mathikonga
        const creditAmt = req.body.creditAmount || (req.body.paymentDetails ? req.body.paymentDetails.credit : 0);

        if (creditAmt > 0 && req.body.customerId) {
            await Customer.findByIdAndUpdate(
                req.body.customerId, 
                { 
                    $inc: { totalDue: creditAmt } 
                }
            );
        }

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved Successfully!",
            billNo: savedInvoice.billNo, // Bill number-ah thirumba anupuna frontend-la display panna vasathiya irukum
            invoiceId: savedInvoice._id 
        });

    } catch (err) {
        console.error("Save Bill Error:", err);
        res.status(400).json({ success: false, message: err.message });
    }
});