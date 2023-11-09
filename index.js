const express = require("express");
const cors = require("cors");
require('dotenv').config()
const bodyParser = require("body-parser");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const port = 5000;
const jwt = require("jsonwebtoken");


// middleware
app.use(express.json({limit:'50mb'}))
app.use(express.urlencoded({ limit: "50mb" }));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser())
app.use(
  cors({
    origin: ["https://crystal-cup.web.app"],
    credentials: true,
  })
);
//  ["http://localhost:5173"],
// ["https://crystal-cup.web.app"]
// , "https://crystal-cup.web.app"

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};


const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.q9bdeff.mongodb.net/clean-co?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});








async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection = client.db('crystal').collection('menu')
    const cartCollection = client.db('crystal').collection('cart')

    
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log('user from req: ',user)
      const token = jwt.sign(user, process.env.SECRET, {
        expiresIn: "1hr",
      });
      if (req.cookies?.token) {
        return;
      }
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.get("/api/v1/best-selling", async (req, res) => {
      try{
        const options = {
          projection:{_id:1,name:1,image:1,price_BTD:1,category:1,color:1}
        }
        const result = await menuCollection.find({},options).sort({ sellingCount:-1 }).limit(6).toArray()
       
        res.send(result);
      }catch(err){
        console.log(err)

      }
    });

    app.post("/api/v1/add-product", async (req, res) => {

      try{
        const data = await menuCollection.insertOne(req.body)
        res.send(data);

      }catch(err){
        console.log(err);
      }

    });
    app.patch("/api/v1/edit-product",verifyToken, async (req, res) => {
       if (req.params.email !== req.user.email) {
         return res.status(403).send({ message: "access forbidden" });
       }
      try{
        const data = req.body
        const id = {_id: new ObjectId(data._id)}
        const result = await menuCollection.updateOne(id,{$set: {quantity:data.quantity}})
        res.send(result)

      }catch(err){
        console.log(err);
      }

    });


    app.get("/api/v1/menu", async (req, res) => {

      try{
        const page = parseInt(req.query.page) - 1;
        const size = parseInt(req.query.size);
        const data = await menuCollection
          .find()
          .skip(page * size)
          .limit(size)
          .toArray();
        const count = await menuCollection.estimatedDocumentCount();
        res.send({data,count});

      }catch(err){
        console.log(err);
      }

    });
   
    app.get("/api/v1/menu/:id", async (req, res) => {

      try{

        const page = parseInt(req.query.page) - 1;
        const size = parseInt(req.query.size);
        
         let query = req.params.id;
        if(query==='Ice-Cream'){
          query = 'Ice Cream'
        }
        console.log(query)
        const data = await menuCollection
          .find({ category: query })
          .skip(page * size)
          .limit(size)
          .toArray();
         const c = await menuCollection.find({ category: query }).toArray()
        res.send({data,count:c.length});

      }catch(err){
        console.log(err);
      }

    });


      app.get("/api/v1/manage",verifyToken, async (req, res) => {
         if (req.query.email !== req.user.email) {
           return res.status(403).send({ message: "access forbidden" });
         }
      try{
        const user = req.query.email
        if (req.query.email === req.user.email) {
          const result = await menuCollection.find({ addedBy: user }).toArray();
          res.send(result);
        }

      }catch(err){}
    
    })


    app.patch("/api/v1/modify/:id",verifyToken,async(req,res)=>{
      try{
        const id ={_id: new ObjectId(req.params.id)};
        console.log(id)
        const data = req.body
        const result = await menuCollection.updateOne(id,{$set:data});
        res.send(result);
      }catch(err){}
    });


      app.get(
        "/api/v1/manage/edit-item/:id",
        async (req, res) => {
          
          try {
            const id = req.params.id;
           
           const result = await menuCollection.findOne({
             _id: new ObjectId(id),
           });
           res.send(result);
             
          } catch (err) {}
        }
      );

    app.delete("/api/v1/menu/:id", async (req, res) => {
      try {
        const id = { _id: new ObjectId(req.params.id) };
        console.log(id);
        const result = await menuCollection.deleteOne(id);
        res.send(result);
      } catch (err) {}
    });


    app.get('/api/v1/menu/item-details/:id',async(req,res)=>{
      try{
        const id = req.params.id;
        const result = await menuCollection.findOne({_id:new ObjectId(id)})
        res.send(result)

      }catch(err){}
    })



    app.post('/api/v1/add-cart',async(req,res)=>{
      try{

        const data = req.body
        console.log(req.body)
        const result = await cartCollection.insertOne(data)
        res.send(result)

      }catch(err){}
    })

      app.post("/logout", async (req, res) => {
        console.log("logging out user: ", req.body);
        res.clearCookie("token", { maxAge: 0 }).send({ successLogout: true });
      });



    app.get('/api/v1/cart',async(req,res)=>{
      try{

       const email = req.query.email
       const result = await cartCollection.find({email: email}).toArray();
       res.send(result)

      }catch(err){}
    })
    app.delete('/api/v1/cart/:id',async(req,res)=>{
      try{

       const id = {_id:new ObjectId(req.params.id)}
       console.log(id)
       const result = await cartCollection.deleteOne(id)
       res.send(result)

      }catch(err){}
    })


 

  

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }

}
run().catch(console.dir);





app.get("/", (req, res) => {
  res.send(`crystal cup server is running at ${port}`);
});

app.listen(port, () => {
  console.log(`crystal cup is listening on port ${port}`);
});
