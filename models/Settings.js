const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  userMobile: { type: String, required: true, unique: true }, 
  adminPin: { type: String, default: "1234" }, 
  isLockEnabled: { type: Boolean, default: true }, 
  upiId: { type: String, default: "" }, 
  businessName: { type: String, default: "Niha POS" },
  address: { type: String, default: "" },
  shopMobile: { type: String, default: "" },

  // 👇 Intha fields thaan missing, ithai nichayama add pannunga
  isDecimalQtyEnabled: { type: Boolean, default: false },
  productDiscOption: { type: Boolean, default: false },
  totalDiscOption: { type: Boolean, default: false },
  salesmanOption: { type: Boolean, default: false },

  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', SettingsSchema);