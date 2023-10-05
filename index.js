const express = require("express");
const app = express();
const model = require("./models/shortner");
const mongoose = require("mongoose");
const { urlencoded } = require("body-parser");
const methodOverride = require("method-override");
const validUrl = require("valid-url");
const bcrypt = require('bcrypt');
const path = require('path')
const cookieparser = require('cookie-parser')
const PORT = process.env.PORT || 1000
require('dotenv').config()
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const authmodel = require('./models/auth')
const {validtoken,isauthenticated} = require('./services/service')
const {generateAndSendOTP} = require('./middlewares/otpgeneration')

const registration_otp = {}
const forgotpassword_otp = {}


app.use(methodOverride("_method"));
app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");
app.set("views", "../SHORTNER/views");
app.use(express.urlencoded({ extended: false }));
app.use(cookieparser());
app.use(express.json());
 
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("db connected");
  })
  .catch((error) => {
    console.log(error);
  });


app.get("/signup",isauthenticated(), (req, res) => {
  res.render("signup.ejs", { error: null });
});

app.get("/login",isauthenticated(), (req, res) => {
  res.render("login.ejs", { error: null });
});

app.get('/',isauthenticated(),(req,res)=>{
  return res.render('home')
})

app.get('/forgotpassword',(req,res)=>{
  return res.render('forgot_password.ejs',{error:null});
})


app.get("/mylinks",validtoken(), async (req, res) => {
  try {
    
    // const allUrls = await model.find();
    // const qrCodes = await Promise.all(
    //   allUrls.map(async (shortUrl) => {
    //     const qrCode = await qrcode.toDataURL(shortUrl.full);
    //     return qrCode;
    //   })
    // );

    const allurls =await model.find({createdBy:req.user.userid})
    res.render("index.ejs", { urls: allurls, error: null, host: req.get('host') });
  } catch (error) {
    console.log(error)
    res.render("index.ejs", { urls: [], error: "Error retrieving URLs", host: req.get('host') });
  }
});


app.delete("/url/:id", async (req, res) => {
  try {
    await model.findByIdAndDelete(req.params.id);
    res.redirect("/mylinks");
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/url",validtoken(), async (req, res) => {
  // const allUrls = await model.find();
  // const qrCodes = await Promise.all(
  //   allUrls.map(async (shortUrl) => {
  //     const qrCode = await qrcode.toDataURL(shortUrl.full);
  //   })
  // );
  const { fullurl } = req.body;
  const {email} =req.user;
  console.log(req.user)
  const user = await authmodel.findOne({email})
  if (validUrl.isWebUri(fullurl)) {
    try {
      await model.create({full: fullurl,createdBy: req.user.userid });
      return res.redirect("/mylinks");
    } catch (error) {
      console.log(error)
      return res.render("index.ejs", { error: "Error saving URL", urls: [] , host: req.get('host')});
    }
  } else {
    const allurls = await model.find();
    return res.render("index.ejs", { error: "Invalid URL", urls: allurls,host: req.get('host')});
  }
});

app.get("/url/:shortUrl", async (req, res) => {
  try {
    const shortUrl = await model.findOne({ short: req.params.shortUrl });
    if (!shortUrl) {
      console.log("error finding short id")
      return ;
    }

    shortUrl.clicks++;
    await shortUrl.save();
    return res.redirect(shortUrl.full);
  } catch (error) {
    console.log(error)
  }
});

app.post('/user/signup', async (req, res) => {
  const userscount = await authmodel.countDocuments({})
  const {username,email,password,OTP} = req.body
  const pattern = "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$";
  if(registration_otp[email]?.otp!=OTP)
  {
    return res.status(500).render("signup", { error: "OTP is invalid!" });
  }
  if(!password.match(pattern))
  {
    return res.status(500).render("signup", { error: "Min 8 characters,least 1 uppercase letter and 1 lowercase letter and 1 number and 1 special character" });
  }
  const hashedpassword = await bcrypt.hash(password, 10);
  try {
    const user = await authmodel.findOne({ email });
    if (user) {
      return res.status(500).render("signup", { error: "User already exists" });
    }
    const newuser = await authmodel.create({
      // _id: new mongoose.Types.ObjectId(),
      username,
      email,
      password: hashedpassword,
      userid: userscount+1
    });
    req.user = newuser
    return res.redirect('/login');
  } catch (err) {
    console.log(err);
    return res.send(err);
  }
});


app.post('/user/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await authmodel.findOne({ email });
    if (!user) {
      return res
        .status(500)
        .render("login", { error: "incorrect credentials" });
    }
    const checkpassword = await bcrypt.compare(password, user.password);
    if (!checkpassword) {
      return res.render("login", { error: "incorrect credentials" });
    }
    console.log(user)
    const accesstoken = await jwt.sign(
      {
        username: user.username,
        email: user.email,
        userid:user.userid
      },
      "supersecret"
    ,{expiresIn:'1h'});
    res.cookie("sid", accesstoken);
    return res.redirect('/mylinks')
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).send(err);
  }
});


app.get("/logout", (req, res) => {
  const cookies = req.cookies;
  for (const cookieName in cookies) {
    res.clearCookie(cookieName);
  }
  res.redirect("/login");
})


app.post('/forgotpassword',async(req,res)=>{
  const {email,OTP,password} = req.body
  if(forgotpassword_otp[email]?.otp!=OTP)
  {
    return res.status(400).render('forgot_password',{error:"Incorrect OTP"})
  }
  const exist = await authmodel.findOne({email})
  if(!exist)
  {
    return res.status(400).render('forgot_password',{error:"Email Not Exist"})
  }
  console.log('i am here')
  const hashedpassword = await bcrypt.hash(password,10)
  await authmodel.updateOne({email},{$set:{password:hashedpassword}})
  console.log('password changed')
  return res.redirect('/')
})


app.post('/sendotp', async (req, res) => {
  const {email,type,otp } = req.body;
  if(type=='new')
  {
    const checkexist = await authmodel.findOne({email})
    if(checkexist)
    {
      return res.status(400).json({msg: "Email Already Exist"})
    }
    await generateAndSendOTP(req.body, registration_otp);
    
  }
  else if(type=="forgotpasswordnew")
  {
    const checkexist = await authmodel.findOne({email})
    if(!checkexist)
    {
      return res.status(400).json({msg: "Email Not Exist"})
    }
    await generateAndSendOTP(req.body, forgotpassword_otp);
  }
  else if(type=='forgotpasswordverify')
  {
    if(forgotpassword_otp[email]?.otp==otp)
    {
      return res.status(200).json({msg: "OTP is Verified!"})
    }
    else{
      return res.status(200).json({msg: "Incorrect OTP"})
    }
  }
  else{
      
    if(registration_otp[email]?.otp==otp)
    {
      return res.status(200).json({msg: "OTP is Verified!"})
    }
    else{
      return res.status(200).json({msg: "Incorrect OTP"})
    }
  }
});

app.get('/deleteaccount',validtoken(),async(req,res)=>{
  const {email} = req.user
  const x = await authmodel.deleteOne({email})
  return res.redirect('/logout')
})

app.get('*', function(req, res){
  res.sendFile(path.join(__dirname+'/public','/404.html'));
});

app.listen(PORT, () => {
  console.log(`listening to ${PORT}`);
});

console.log(__dirname)