// schemas.js
const mongoose = require('mongoose');

// User Schema


const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  profile_img:String,
  socialLogin: {
    type: Boolean,
    default: false,
  },
  
});


const User = mongoose.model('User', userSchema);


const itemSchema = new mongoose.Schema({
  
 
  product_id: {type:Number},
  category_id : {type : Number},
  name: { type: String},
 price: { type: Number },
  image_url: { type: String},
  quantity: { type: Number, default: 1 }
 
});

const Item = mongoose.model('Item', itemSchema);


const categorySchema = new mongoose.Schema({
 id:{type:Number},
 name:{type:String}
});



const Category = mongoose.model('Category', categorySchema);


const cartSchema = new mongoose.Schema({
  

  user_id:{type:String},
  product_id: {type:String},
  category_id : {type : Number},
  name: { type: String},
 price: { type: Number },
  image_url: { type: String},
  quantity:{type:Number}
});  


const Cart = mongoose.model('Cart', cartSchema);



const wishlistSchema = new mongoose.Schema({
  

  user_id:{type:String},
  product_id: {type:String},
  category_id : {type : Number},
  name: { type: String},
 price: { type: Number },
  image_url: { type: String},

});

const Wishlist = mongoose.model('WishList', wishlistSchema);


// Order schema
const orderSchema = new mongoose.Schema({
  
  orderDateTime: { type: Date, default: Date.now },
  status: { type: String, default: 'Pending' },
  
      product_id: { type: String },
      user_id: { type: String },
      name: { type: String },
      price: { type: Number },
      quantity: { type: Number },
      phoneNumber:{type:String},
      shippingAddress:{type:String}
    
  

});

const Order = mongoose.model('Order', orderSchema);

module.exports = { Order };

module.exports = { User, Item, Category, Cart ,Wishlist,Order};
