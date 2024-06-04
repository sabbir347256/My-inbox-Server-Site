const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require("dotenv").config();
const stripe = require('stripe')(process.env.SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kd61vsr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const AllPost = client.db('My_Inbox').collection('addpost');

    app.get('/getaddpost', async (req, res) => {
      const cursor = AllPost.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.post('/addpost', async (req, res) => {
      const user = req.body;
      const result = await AllPost.insertOne(user);
      res.send(result);
    })

    app.post('/create-payment-intent', async (req,res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100); 

      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount ,
        currency : 'usd',
        payment_method_types : ['card']
      });

      res.send({
        clientSecret : paymentIntent.client_secret
      })

    })



    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send('assignment 12 site is running');
  })
  
  app.listen(port, () => {
    console.log(`this server is running : ${port}`)
  })