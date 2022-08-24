const express =require("express");
const app = express();
const dotenv = require("dotenv").config();
const cors = require("cors");
const mongodb = require("mongodb");
mongoClient = mongodb.MongoClient;
const bcryptjs = require("bcryptjs")
const URL = process.env.DB;
const SECRET = process.env.SECRET;
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");


//Middlewares
app.use(express.json()); 

app.use(
    cors({
      origin: "*",
    })
  );


  let authenticate = function (req, res, next) {
    if (req.headers.authorization) {
     try {
      let verify = jwt.verify(req.headers.authorization, SECRET);
      if (verify) {
        req.Email = verify.Email;
        next();
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
     } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
     }
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };
  





app.get('/',function(req,res){
    res.send('SERVER CANNOT BE FOUND')
})


  app.post("/registration", async function(req,res){
try{
    const connection = await mongoClient.connect(URL);
    const db = connection.db("User_database");
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(req.body.Password,salt);
    req.body.Password=hash;
    await db.collection("Users").insertOne(req.body);
    await connection.close();
    res.json({
        message : "Successfully Registered"
    })

}
catch(error){
    console.log(error)
}



  })

  app.post("/verificationmail",async function(req,res){
    try{
        const connection = await mongoClient.connect(URL);
        const db = connection.db("User_database");
        const existing_user=await db.collection("Users").findOne({UserName:req.body.UserName});
        
       console.log(existing_user);

        if(existing_user){

            const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';  //List of characters

            //Logic to generate random alphanumerals
            let string = '';
            for(let i=0;i<5;i++){
                string+=characters[Math.floor(Math.random()*characters.length)];

            }

            const stringinsert = await db.collection("Users").updateOne({UserName:req.body.UserName},{ $set : {"verification_code":`${string}`}});

            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: 'joel.joel52@gmail.com',
                  pass: 'wyzfcbmgjsvvysic'
                }
              });

              var mailOptions = {
                from: 'joel.joel52@gmail.com',
                to: existing_user.Email,
                subject: 'User verification',
                html:`<span>Verification code :<h1>${string}</h1> </span><a href="https://relaxed-cajeta-2c9b5f.netlify.app/userverification">Reset Password</a>`
              };

              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                  res.json({
                    message:"Error"
                })
                } else {
                  console.log('Email sent: ' + info.response);
                  res.json({
                    message: "Verification code has been sent to your mail"
                   
                })
                }
              });


        }

        else{
            res.json({
                message : "User doesn't exists"
            })
        }

        await connection.close();
          }
          catch(error){
            console.log(error);
        }
  })

  app.post("/resetpassword",async function(req,res){
    try{
        const connection = await mongoClient.connect(URL);
        const db = connection.db("User_database");
        const find_code = await db.collection("Users").findOne({verification_code:req.body.verification_code});
        const id = find_code._id;
        console.log(id);
        if(find_code){
        
            res.json({
                message:"user verified",
                _id : id
            })
        }
        else{
            res.json({
                message:"incorrect verification code"
            });
        }

    }
    catch(error){
        console.log(error);
    }
  })

  app.post("/newpassword",async function(req,res){

    try{
        const connection = await mongoClient.connect(URL);
        const db = connection.db("User_database");
       
        const existing_user = await db.collection("Users").findOne({_id:mongodb.ObjectId(req.body.id)});
        console.log(existing_user)
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'joel.joel52@gmail.com',
              pass: 'wyzfcbmgjsvvysic'
            }
          });

          var mailOptions = {
            from: 'joel.joel52@gmail.com',
            to: existing_user.Email,
            subject: 'User verification',
            html:`<h2>Password : ${req.body.Password}</h2>`
          };


          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
              res.json({
                message:"Error"
            })
            } else {
              console.log('Email sent: ' + info.response);
              res.json({
                message: "Email sent"
               
            })
            }
          });

          const salt = await bcryptjs.genSalt(10);
          const hash = await bcryptjs.hash(req.body.Password,salt);
          req.body.Password=hash;
        
          const update_newpassword = await db.collection("Users").updateOne({_id:mongodb.ObjectId(req.body.id)},{$set:{"Password":`${req.body.Password}`}});

    }
    catch(error){
        console.log(error);
    }
        
  })

  app.get("/userpage/:id",authenticate,async function(req,res){
    try{
      const connection = await mongoClient.connect(URL);
      const db = connection.db("User_database");
      const user = await db.collection("Users").findOne({_id:mongodb.ObjectId(req.params.id)});
     console.log(req.params.id);
      connection.close();
      res.json({
        message:`Good day , ${user.UserName} `
      })
    }
    catch(error){
      console.log(error);
    }
  })

  
app.post("/login", async function(req,res){
  try{
    const connection = await mongoClient.connect(URL);
    const db = connection.db("User_database");
    const user = await db.collection("Users").findOne({Email:req.body.Email});
    if(user){
      const match = await bcryptjs.compare(req.body.Password, user.Password);
if(match){
  const token = jwt.sign({ _id: user._id }, SECRET);
  res.json({
    id:user._id,
    message: "Successfully Logged In",
    token,
  });
}
else{
  res.status(401).json({
    message:"password incorrect",
    
  })
}
    }
    else{
      res.status(401).json({
message:"User not found"
      })
    }
  } 
  catch(error){
    console.log(error);
  }
})







app.listen( process.env.PORT);