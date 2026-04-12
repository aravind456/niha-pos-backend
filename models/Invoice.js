router.post('/save-bill', async (req, res) => {
    try {
        // 1. Bill Number Logic (String-ah irundhalum namma Number-ah mathi +1 panrom)
        const lastInvoice = await Invoice.findOne({ userMobile: req.body.userMobile }).sort({ _id: -1 });
        let nextBillNo = "1"; 
        
        if (lastInvoice && lastInvoice.billNo) {
            nextBillNo = (parseInt(lastInvoice.billNo) + 1).toString();
        }

        // 2. Puthiya Bill Create Panrom
        const newInvoice = new Invoice({
            userMobile: req.body.userMobile,
            billNo: nextBillNo,
            customerName: req.body.customerName || "Cash",
            customerMobile: req.body.customerMobile || "",
            
            cartItems: req.body.items, // Frontend-la 'items' nu anupuna inga 'cartItems' nu save aagum
            totalAmount: req.body.totalAmount,
            paymentMode: req.body.paymentMode,
            billDate: req.body.createdAt || Date.now()
        });

        const savedInvoice = await newInvoice.save();

        // 3. Credit Logic (Ledger Update)
        // Neenga munnadiye vechiruntha antha Customer Balance update code-ah inga add pannikonga

        res.status(201).json({ 
            success: true, 
            message: "Bill Saved!", 
            billNo: savedInvoice.billNo 
        });

    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
});