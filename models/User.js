// User Schema update pannunga
const userSchema = new mongoose.Schema({
    // ... unga pazhaya fields (name, mobile, password) ...
    
    adminPin: { type: String, default: null }, // Inga thaan PIN save aagum
    isPinEnabled: { type: Boolean, default: false } // Security on/off panna
});