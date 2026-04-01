const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const PORT = process.env.PORT || 5000;

// 2. Database Connection
const dbURI = 'mongodb://nihapos_admin:Nideepaha%26121420@ac-tkb49np-shard-00-00.tkb49np.mongodb.net:27017,ac-tkb49np-shard-00-01.tkb49np.mongodb.net:27017,ac-tkb49np-shard-00-02.tkb49np.mongodb.net:27017/NihaPOS?ssl=true&replicaSet=atlas-xxxxxx-shard-0&authSource=admin&retryWrites=true&w=majority';

mongoose.connect(dbURI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Successfully!');
    // Connection success aanadhukku apparam server-ai start pannuvom
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    // Message mattum print panna clear-ah irukkum
    console.error('❌ MongoDB Connection Error:', err.message);
  });
// 1. Models Import
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');

const productRoutes = require('./routes/Product');
const customerRoutes = require('./routes/Customer'); // <--- Idhu thaan missing!
const supplierRoutes = require('./routes/Supplier');

const settingsRoutes = require('./routes/Settings');

const app = express();
app.use(express.json());
app.use(cors());


app.use('/api/products', productRoutes);   // Ithu thaan main address
app.use('/api/customers', customerRoutes); 
app.use('/api/suppliers', supplierRoutes); // '/api' ku bathila '/api/products'
app.use('/api/settings', settingsRoutes);

// 5. Server Start
mongoose.connect(dbURI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas Successfully!');
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    })
    .catch(err => console.error('❌ Could not connect to MongoDB Atlas:', err));


// 2. User Schema & Model (Signup/Login-kaga)
const userSchema = new mongoose.Schema({
    name: String,
    mobile: { type: String, unique: true },
    email: String,
    password: String,
    shopDetails: { type: Object, default: null },
    createdAt: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    isPremium: { type: Boolean, default: false },

    deviceId: { type: String, default: null }, // Unique Mobile ID
    multiDeviceAllowed: { type: Boolean, default: false } // Neenga permission kudukkanna, illa na single device-ku restrict panna
});

const User = mongoose.model('User', userSchema);

// server.js-la ithu irukanum
 



// --- AUTH ROUTES (Signup/Login) ---

app.post('/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        let today = new Date();
        newUser.expiryDate = new Date(today.setDate(today.getDate() + 5)); 
        await newUser.save();
        res.status(201).send({ message: "Registered! 5 Days Trial Started." });
    } catch (err) {
        res.status(400).send({ error: "Registration Failed!" });
    }
});

app.post('/login', async (req, res) => {
    // 1. Flutter-la irundhu deviceId-yum anupanum
    const { mobile, password, deviceId } = req.body; 
    
    if (!deviceId) {
        return res.status(400).send({ error: "Device ID Missing!" });
    }
    
    try {
        const user = await User.findOne({ mobile, password });
        
        if (user) {
            // --- DEVICE LOCK LOGIC START ---
            // Oru vaela user munnadiye login pannirundha, andha mobile ID check panrom
            if (user.deviceId && user.deviceId !== deviceId) {
                return res.status(403).send({ 
                    error: "Device Lock!", 
                    message: "Indha account munnadiye vera mobile-la login aagi irukku." 
                });
            }

            // Mudhal vaati login panraaga na, indha mobile ID-ah fix panniduvom
            if (!user.deviceId) {
                user.deviceId = deviceId;
                await user.save();
            }
            // --- DEVICE LOCK LOGIC END ---

            // Unga old Expiry logic...
            let today = new Date();
            if (!user.isPremium && user.expiryDate && today > user.expiryDate) {
                return res.status(403).send({ 
                    error: "Trial Expired!", 
                    message: "Unga 5 days trial mudinjiruchi." 
                });
            }

            res.status(200).send({ message: "Login Success!", user });
        } else {
            res.status(401).send({ error: "Invalid login!" });
        }
    } catch (err) {
        res.status(500).send({ error: "Server Error" });
    }
});

// --- SHOP UPDATE ROUTE ---
app.post('/update-shop', async (req, res) => {
    try {
        const { mobile, shopDetails } = req.body;
        // User-ah kandupudichi shopDetails-ah mattum update panrom
        const updatedUser = await User.findOneAndUpdate(
            { mobile: mobile },
            { $set: { shopDetails: shopDetails } },
            { new: true }
        );

        if (updatedUser) {
            res.status(200).send({ message: "Shop Details Updated!", user: updatedUser });
        } else {
            res.status(404).send({ message: "User not found!" });
        }
    } catch (err) {
        res.status(500).send({ error: "Server Error", details: err.message });
    }
});

// --- PRODUCT ROUTES ---


//app.post('/api/add-customer', async (req, res) => {
//    try {
//        const { userMobile, name } = req.body;
//        const customerCount = await Customer.countDocuments({ userMobile });
 //       const newCode = (customerCount + 1).toString().padStart(4, '0');
  //      const newCustomer = new Customer({ ...req.body, customerCode: newCode });
   //     const savedData = await newCustomer.save();
  //      res.status(201).json({ message: "Customer Saved", data: savedData });
  //  } catch (err) { res.status(400).json({ error: err.message }); }
//});

//app.get('/api/get-customers/:userMobile', async (req, res) => {
  //  try {
    //    const customers = await Customer.find({ userMobile: req.params.userMobile }).sort({ name: 1 });
      //  res.status(200).json(customers);
  //  } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
//});

// --- SUPPLIER ROUTES ---

//app.post('/api/add-supplier', async (req, res) => {
  //  try {
    //    const { userMobile, name } = req.body;
      //  const supplierCount = await Supplier.countDocuments({ userMobile });
//        const newCode = "S" + (supplierCount + 1).toString().padStart(4, '0');
  //      const newSupplier = new Supplier({ ...req.body, supplierCode: newCode });
    //    await newSupplier.save();
      //  res.status(201).json({ message: "Supplier Saved", code: newCode });
//    } catch (err) { res.status(400).json({ error: err.message }); }
//});

//app.get('/api/get-suppliers/:userMobile', async (req, res) => {
///    try {
  ///      const suppliers = await Supplier.find({ userMobile: req.params.userMobile }).sort({ name: 1 });
     ///   res.status(200).json(suppliers);
 ///   } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
//});




// --- DATABASE & SERVER START ---

