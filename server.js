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

    app.use('/api/products', productRoutes);
    app.use('/api/customers', customerRoutes); 
    app.use('/api/suppliers', supplierRoutes);
    app.use('/api/settings', settingsRoutes);
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


