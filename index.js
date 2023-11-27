const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

//midleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pjcsd3j.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

const userCollection = client.db("restaurant").collection("users");
const menuCollection = client.db("restaurant").collection("menu");
const reviewCollection = client.db("restaurant").collection("reviews");
const cartCollection = client.db("restaurant").collection("carts");
const listCollection = client.db("restaurant").collection("list");


//jwt
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  res.send({ token });
})

// middlewares 
const verifyToken = (req, res, next) => {
  // console.log('inside verify token', req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

// use verify admin after verifyToken
// const verifyAdmin = async (req, res, next) => {
//   const email = req.decoded.email;
//   const query = { email: email };
//   const user = await userCollection.findOne(query);
//   const isAdmin = user?.role === 'admin';
//   if (!isAdmin) {
//     return res.status(403).send({ message: 'forbidden access' });
//   }
//   next();
// }



// users related api for admin
app.get('/users', verifyToken, async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.get('/users/admin/:email', verifyToken, async (req, res) => {
  const email = req.params.email;

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === 'admin';
  }
  res.send({ admin });
})


// users related api for manager
app.get('/users/manager/:email', verifyToken, async (req, res) => {
  const email = req.params.email;

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let manager = false;
  if (user) {
    manager = user?.role === 'manager';
  }
  res.send({ manager });
});




app.post('/users', async (req, res) => {
  const user = req.body;
  // insert email if user doesnt exists: 
  // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
  const query = { email: user.email }
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: 'user already exists', insertedId: null })
  }

  user.role = user.role || 'user';  //chilo na age notun add korlam 

  const result = await userCollection.insertOne(user);
  res.send(result);
});


//for admin
app.patch('/users/admin/:id', verifyToken,  async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: 'admin'
    }
  }
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
})


//for manager
app.patch('/users/manager/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: 'manager',
    },
  };
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
});




app.delete('/users/:id', verifyToken,  async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await userCollection.deleteOne(query);
  res.send(result);
})


//menu
app.get('/menu' , async(req,res) =>{
    const result = await menuCollection.find().toArray();
    res.send(result);
})

app.post('/menu' , async(req,res) =>{
  const menu= req.body;
  console.log('new menu : ' , menu);
  const result = await menuCollection.insertOne(menu);
  res.send(result);
})



//list
app.get('/list' , async(req,res) =>{
  const result = await listCollection.find().toArray();
  res.send(result);
})

app.post('/list' , async(req,res) =>{
const list= req.body;
console.log('new list : ' , list);
const result = await listCollection.insertOne(list);
res.send(result);
})

app.get('/list/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await listCollection.findOne(query);
  res.send(result);
})

app.patch('/list/:id', async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) }
  const updatedDoc = {
    $set: {
      productname: item.productname,
      quantity: item.quantity,
      location: item. location,
      price: item.price,
      profit: item.profit,
      discount: item.discount,
      description: item.description,
      image: item.image
    }
  }
  const result = await listCollection.updateOne(filter, updatedDoc)
  res.send(result);
})

app.delete('/list/:id', verifyToken,  async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await listCollection.deleteOne(query);
  res.send(result);
})


//reviews
app.get('/reviews' , async(req,res) =>{
    const result = await reviewCollection.find().toArray();
    res.send(result);
})

//carts
app.get('/carts' , async(req,res) =>{
  const email = req.query.email;
  const query = {email: email};
  const result = await cartCollection.find(query).toArray();
  res.send(result);
})

app.post('/carts' , async(req , res) =>{
  const cartItem = req.body;
  const result = await cartCollection.insertOne(cartItem);
  res.send(result);
})
app.delete('/carts/:id' , async(req,res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await cartCollection.deleteOne(query);
  res.send(result);
})


    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Choco World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})