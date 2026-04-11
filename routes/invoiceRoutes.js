router.post('/save-bill', async (req, res) => {
    try {
        // 1. Bill-ah save panrom
        const newInvoice = new Invoice(req.body);
        const savedInvoice = await newInvoice.save();

        // 2. Credit logic: Bill-la credit amount iruntha Customer balance-ah update panrom
        // req.body-la 'paymentDetails' kulla 'credit' amount varudhunu confirm pannikonga
        if (req.body.paymentDetails && req.body.paymentDetails.credit > 0) {
            
            // Customer ID kandippa irukanum
            if (req.body.customerId) {
                await Customer.findByIdAndUpdate(
                    req.body.customerId, 
                    { 
                        // $inc nu potta irukura balance kooda intha credit amount-ah add pannum
                        $inc: { totalDue: req.body.paymentDetails.credit } 
                    }
                );
            }
        }

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved & Customer Ledger Updated!",
            invoiceId: savedInvoice._id 
        });

    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});