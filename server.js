require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 1. APP INITIALIZATION (IDHU DHAAN FIRST IRUKKANUM)
const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Niha POS Server is Running Successfully!');
});

const PORT = process.env.PORT || 10000;

/// 2. DATABASE CONNECTION URL
// Pazhaya hardcoded string-ku badhula idhai podunga
const mySecret = process.env.MONGO_URI; 

const intialDbConnection = async () => {
  try {
    // 3. Database connect panna try pannuvom
    await mongoose.connect(mySecret);
    console.log("✅ db connected");
  } catch (error) {
    // 4. Problem irundha inga error varum
    console.error("❌ Connection failed:", error.message);
  }
}

// 1. Models Import
try {
    const productRoutes = require('./routes/Product');
    const customerRoutes = require('./routes/Customer');
    const supplierRoutes = require('./routes/Supplier');
    const settingsRoutes = require('./routes/Settings');
    const invoiceRoutes = require('./routes/invoiceRoutes'); 
    




    app.use('/api/products', productRoutes);
    app.use('/api/customers', customerRoutes); 
    app.use('/api/suppliers', supplierRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/invoices', invoiceRoutes);


} catch (e) {
    console.log("⚠️ Routes load pannuvadhil small issue, but server run aagum.");
}

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

// --- EXPIRY CHECK MIDDLEWARE ---
const checkExpiry = async (req, res, next) => {
    try {
        const { mobile } = req.headers; // Mobile number-ah header-la anupa sollunga Flutter-la irundhu
        
        if (!mobile) return next(); // Mobile illa na bypass (login/register-kaga)

        const user = await User.findOne({ mobile });
        if (user) {
            let today = new Date();
            if (!user.isPremium && user.expiryDate && today > user.expiryDate) {
                return res.status(403).json({ 
                    error: "Expired", 
                    message: "Trial expired! Please contact admin." 
                });
            }
        }
        next();
    } catch (e) {
        next();
    }
};

// Ellaa routes-kum munnadi idhai apply pannunga
app.use(checkExpiry);

// server.js-la ithu irukanum
 


// --- AUTH ROUTES (Signup/Login) ---

app.post('/register', async (req, res) => {
    try {
        const { mobile } = req.body;

        // 1. Mobile number already irukka nu check panrom
        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return res.status(400).json({ message: "Mobile number already registered!" });
        }

        const newUser = new User(req.body);
        let today = new Date();
        newUser.expiryDate = new Date(today.setDate(today.getDate() + 5)); 
        
        await newUser.save();
        res.status(201).json({ message: "Registered! 5 Days Trial Started." });

    } catch (err) {
        console.error("Registration Error:", err.message); // Server console-la error theriyum
        res.status(500).json({ error: "Server Error", details: err.message });
    }
});

app.post('/login', async (req, res) => {
    const { mobile, password, deviceId } = req.body; 

    if (!deviceId) {
        return res.status(400).send({ error: "Device ID Missing!" });
    }

    try {
        const user = await User.findOne({ mobile, password });

        if (!user) {
            return res.status(401).send({ error: "Invalid login!" });
        }

        // --- SAFE MULTI-DEVICE LOGIC ---
        // Unga DB-la array illana kooda crash aagathu
        let devices = user.loggedInDevices || []; 

        let isAlreadyLoggedIn = devices.includes(deviceId);

        if (!isAlreadyLoggedIn) {
            let limit = user.deviceLimit || 1;
            
            if (devices.length >= limit) {
                return res.status(403).send({ 
                    error: "Limit Exceeded!", 
                    message: `Ungalukku ${limit} device mattum dhaan allow.` 
                });
            }

            // Direct-ah push pannama, clear-ah update panrom
            await User.updateOne(
                { _id: user._id },
                { $addToSet: { loggedInDevices: deviceId } } // $addToSet double entry-ai thadukkum
            );
        }

        // --- EXPIRY CHECK ---
        let today = new Date();
        if (!user.isPremium && user.expiryDate && today > new Date(user.expiryDate)) {
            return res.status(403).send({ 
                error: "Trial Expired!", 
                message: "Please contact admin." 
            });
        }

            res.status(200).send({ message: "Login Success!", 
                
                user: {
        name: user.name,
        mobile: user.mobile,
        expiryDate: user.expiryDate, 
        isPremium: user.isPremium,
        shopDetails: { 
            ...(user.shopDetails || {}), 
            shopName: user.shopDetails?.shopName || user.name,
            expiryDate: user.expiryDate // <--- Intha line mukkiam!
        }
            }
        });

    } catch (err) {
        // Ithu dhaan mukkiam: Terminal-la ena error-nu ippo print aagum
        console.log("SERVER CRASHED BECAUSE:", err.message);
        res.status(500).send({ error: "Server Error", logicError: err.message });
    }
});

// --- SHOP UPDATE ROUTE ---
// server.js-la intha route-ah replace pannunga:
app.post('/update-shop', async (req, res) => {
    try {
        const { mobile, shopDetails } = req.body;
        
        // 1. First user-ah find panrom
        const user = await User.findOne({ mobile: mobile });
        
        if (!user) {
            return res.status(404).send({ message: "User not found!" });
        }

        // 2. Shop details kulla expiry date-ah sethu merge panrom
        const finalShopDetails = {
            ...shopDetails,
            expiryDate: user.expiryDate // Database-la irukura date-ah inga sethu vidurom
        };

        // 3. Ippo update panrom
        user.shopDetails = finalShopDetails;
        await user.save();

        res.status(200).send({ 
            message: "Shop Details Updated!", 
            user: {
                ...user._doc,
                shopDetails: finalShopDetails // Updated details-ah Flutter-ku thirumba anupurom
            } 
        });
    } catch (err) {
        res.status(500).send({ error: "Server Error", details: err.message });
    }
});

// --- DATABASE CONNECTION & SERVER START ---

// --- DATABASE CONNECTION & SERVER START ---

mongoose.connect(mySecret)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Successfully!');
    
    // CHANGE IS HERE: Added '0.0.0.0' inside app.listen
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });


