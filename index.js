const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require('bcrypt')
const token = require('jsonwebtoken')
const mongoose = require('mongoose');
const { User, Item, Cart, Category ,Wishlist,Order} = require('./schemas'); // Adjust the path accordingly
const sendMail= require('./sendMail.js')
const app = express();
const crypto = require('crypto')
const Razorpay = require('razorpay');
require('dotenv').config();

app.use(cors());
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;

const initializeDBAndServer = async () => {
  try {
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`Server Running at http://localhost:${port}`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/items", async (request, response) => {
  try {
    const { sort_by = 'id', search_q = '', order = 'ASC', category_id = '' } = request.query;

    let query = {};

    // Add category filter if provided
    if (category_id !== '') {
      query.category_id = category_id;
    }

    // Add name search
    if (search_q !== '') {
      query.name = { $regex: search_q, $options: 'i' }; // Case-insensitive search
    }

    // Sort the result
    const sortOptions = {};
    sortOptions[sort_by] = order === 'ASC' ? 1 : -1;

    const data = await Item.find(query).sort(sortOptions);

    response.json(data);
  } catch (error) {
    console.error("Error fetching items:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});


app.get("/categories", async (request, response) => {
 
  try {
    const data = await Category.find();
    
    response.json(data);
  } catch (error) {
    response.status(500).json({ message: "Internal server error" });
  }
});

app.post('/login', async (request, response) => {
  try {
    const { username, password } = request.body;
    const user = await User.findOne({ username });

 

    if (!user) {

      response.status(400).json({ message: "Invalid Username, please Register" });
    } else {
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
      if (isPasswordCorrect) {
        const payload = {username: user.username };
       
        const jwtToken = token.sign(payload, process.env.JWT_SECRET);
      
        response.status(200).json({ jwtToken });
      } else {
        response.status(400).json({ message: "Invalid Password" });
      }
    }
  } catch (error) {
    response.status(500).json({ message: "Internal server error" });
  }
});

app.post('/register', async (request, response) => {

  try {
    const { username, password, email,phoneNumber } = request.body;

    
    

    try {
      const existingUser = await User.findOne({ username });

      if (existingUser) {
        return response.status(400).json({ message: "Username already exists" });
      
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, password: hashedPassword, email,phoneNumber });
      await newUser.save();
      sendMail(username, password, email,phoneNumber)
      response.json({ message: "User registered successfully" });

       
   } catch (findError) {
      console.error("Error finding user:", findError);
      response.status(500).json({ message: "Internal server error" });
    }
  } catch (error) {
    console.error("Error in registration endpoint:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});


app.post('/user-info', async (request, response) => {
  let jwtToken;
  
  const authHeader = request.headers['authorization'];
 

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }



  if (jwtToken === undefined) {
    response.status(401).json({ message: "Invalid JWT Token" });
  } else {
 
    token.verify(jwtToken, process.env.JWT_SECRET, async (error, user) => {
      if (error) {
        console.log(error)
        response.status(401).json({ message: "Invalid Access Token" });
      } else {
        try {
          const data = await User.findOne({ username: user.username });
          response.status(200).json({ data });
        } catch (error) {
          response.status(500).json({ message: "Internal server error" });
        }
      }
    });
  }
});

app.get('/add-cart', async (request, response) => {

  try {
    const { id, user_id, quantity } = request.query;

  
   
    const productDetails = await Item.findOne({_id:id});
  


   
      const cartData = await Cart.findOne({ product_id: id, user_id });
      // The code after this line will execute if there are no errors in the previous line.

    
    
    
    if (cartData===null) {
   
      const newCartItem = new Cart({
        user_id,
        product_id:id,
        category_id: parseInt(productDetails.category_id),
        name: productDetails.name,
        price: parseInt(productDetails.price),
        image_url: productDetails.image_url,
        quantity:parseInt(quantity),
      });
      try {
        await newCartItem.save();

        const data = await Cart.find({user_id})


      
        response.status(200).json({ message: "Success" });
      } catch (error) {
        
        response.status(500).json({ message: "Internal server error", error });
      }
      
      
      
    


    } else {
      response.status(400).json({ message: "Already exists in the cart" });
    }
  } catch (error) {
    response.status(500).json({ message: "Internal server error" });
  }
});

app.get('/cart', async (req, res) => {
  try {
    const { user_id } = req.query;

const data = await Cart.find({ user_id})


    res.status(200).json({ data });
    
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/remove-cart', async (req, res) => {
  try {
    const { user_id, product_id } = req.query;

    await Cart.findOneAndDelete({ user_id, product_id });
    res.json({ message: "Removed from the cart" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/add-quantity', async (req, res) => {
  const { id, user_id } = req.query;

  try {
   
    const productDetails = await Cart.findOne({ product_id: id, user_id });

  
    if (productDetails) {
      const newQuantity = productDetails.quantity + 1;

      await Cart.findOneAndUpdate(
        { user_id, product_id: id },
        { $set: { quantity: newQuantity } }
      );
      
      res.json({ message: "Quantity updated successfully" });
    } else {
      res.status(404).json({ message: "Product not found in the cart" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get('/remove-quantity', async (req, res) => {
    try {
      const { id, user_id } = req.query;
      const productDetails = await Cart.findOne({ product_id: id, user_id });

      if (productDetails) {
        const newQuantity = Math.max(1, productDetails.quantity - 1);
  
        await Cart.findOneAndUpdate(
          { user_id, product_id: id },
          { $set: { quantity: newQuantity } }
        );
        res.json({ message: "Quantity updated successfully" });
      } else {
        res.status(404).json({ message: "Product not found in the cart" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // ... (other routes)
  
  // Add a generic error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error" });
  });




  app.get('/add-wishlist', async (request, response) => {

    try {
      const { id, user_id} = request.query;
  

     
     
      const productDetails = await Item.findOne({ _id:id });
      
  
      const wishListData = await Wishlist.findOne({ product_id: id, user_id})
  
    
       
      if (wishListData===null) {
     
        const newWishlistItem = new Wishlist({
          user_id,
          product_id: productDetails.id,
          category_id: parseInt(productDetails.category_id),
          name: productDetails.name,
          price: parseInt(productDetails.price),
          image_url: productDetails.image_url,
          
        });
        try {
          await newWishlistItem.save();
  
          response.status(200).json({ message: "Success" });
        } catch (error) {
          console.error("Save Error:", error);
          response.status(500).json({ message: "Internal server error", error });
        }
        
        
        
      
  
  
      } else {
        response.status(400).json({ message: "Already exists in the cart" });
      }
    } catch (error) {
      response.status(500).json({ message: "Internal server error" });
    }
  });
  

  app.get('/remove-wishlist', async (req, res) => {
    try {
      const { user_id, product_id } = req.query;

      await Wishlist.findOneAndDelete({ user_id, product_id });
      res.json({ message: "Removed from the wishlist" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });


  app.get('/wishlist', async (req, res) => {
    try {
      const { user_id } = req.query;
  
      const data = await Wishlist.find({ user_id:user_id });
     
     
      res.json({ data });
      
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });


  app.post('/social-login', async (request, response) => {
    const { username, email, profileImg } = request.body;
  
    try {

      try {
        // Check if the user already exists based on email
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          // Update user's social login details
          existingUser.socialLogin = true;
          await existingUser.save();
          const payload = {username: existingUser.username };
       
          const jwtToken = token.sign(payload, process.env.JWT_SECRET);
        
          response.status(200).json({ jwtToken });


          
        } else {
          // If user doesn't exist, create a new user
          const newUser = new User({ username, email, profile_img:profileImg,socialLogin: true });
          await newUser.save();
  
          const payload = {username:username };
       
          const jwtToken = token.sign(payload, process.env.JWT_SECRET);
        
          response.status(200).json({ jwtToken });

        }
      } catch (findError) {
        console.error("Error finding user:", findError);
        response.status(500).json({ message: "Internal server error" });
      }
    } catch (error) {
      console.error("Error in social login endpoint:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post('/order',async(req,res)=>{
   
    try{
    const razorpay = new Razorpay({
        key_id:process.env.RAZORPAY_KEY_ID,
        key_secret:process.env.RAZORPAY_KEY_SECRET
    });
    const options = req.body;
    const order = await razorpay.orders.create(options);
    if(!order){
        return res.status(500).send('Error');
    }
 
    res.status(200).json(order)
}
catch(err){
    console.log(err)
    return res.status(500).send("error");
}

})



app.post('/order/validate',async(req,res)=>{
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
     const verifySignature = (order_id, razorpay_payment_id, secret, razorpay_signature) => {
        const generated_signature = crypto.createHmac('sha256', secret)
            .update(`${order_id}|${razorpay_payment_id}`)
            .digest('hex');
    console.log(razorpay_signature,generated_signature)
        return generated_signature === razorpay_signature;
    };

    const isPaymentValid = verifySignature(razorpay_order_id, razorpay_payment_id, process.env.RAZORPAY_KEY_SECRET, razorpay_signature);

if (isPaymentValid) {
    return res.status(200).json({
        msg:"success",
        orderId:razorpay_order_id,
        paymentId:razorpay_payment_id,
    })
}
 res.status(400).json({
    msg:"Transaction is not legit!",
   
})

 
})



app.post('/order-details', async (req, res) => {
  const { cart, orderDetails } = req.body;
  console.log(orderDetails)

  try {
    const orderPromises = cart.map(async (each) => {
      const newOrder = new Order({
        product_id: each.product_id,
        user_id: each.user_id,
        name: each.name,
        price: each.price,
        quantity: each.quantity,
        phoneNumber: orderDetails.phoneNumber,
        shippingAdress: orderDetails.shippingAdress,
      });

      await newOrder.save();
    });

    // Wait for all orders to be saved
    await Promise.all(orderPromises);

    // Send a single success response after all orders are saved
    res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("Internal server error:", error);

    // If an error occurs, send a single error response
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});
