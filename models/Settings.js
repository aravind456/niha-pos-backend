const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // 👈 Idhu thaan romba mukkiyam (Multiple users-ai handle panna)
  userMobile: { type: String, required: true, unique: true }, 
  
  adminPin: { type: String, default: "1234" }, 
  isLockEnabled: { type: Boolean, default: true }, 
  upiId: { type: String, default: "" }, 
  businessName: { type: String, default: "Niha POS" },
  
  // Billing details (Optional - Nalaikku PDF generate panna use aagum)
  address: { type: String, default: "" },
  shopMobile: { type: String, default: "" },

  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', SettingsSchema);