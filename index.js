const express = require('express');
const { MongoClient, ServerApiVersion, Timestamp } = require('mongodb');
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
    const AllUserPayment = client.db('My_Inbox').collection('paymentUser');
    const userCollection = client.db('My_Inbox').collection('usercollection');

    app.get('/getaddpost', async (req, res) => {
      const cursor = AllPost.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/getaddpost/:email', async (req, res) => {
      const email = req.body.email;
      const query = { email: (email) };
      const cursor = AllPost.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.get('/paymentUser/:email', async (req, res) => {
      const email = req.params.email;
      const result = await AllUserPayment.findOne({email})
      res.send(result);
    })

    app.get('/user/:email',async (req,res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({email})
      res.send(result);
    })


    app.patch('/users/update/:email', async (req,res) => {
      const email = req.params.email;
      const user = req.body;
      const query = {email} ;
      const updatedoc = {
        $set: {
          ...user, timestamp: Date.now()
        }
      }
      const result = await userCollection.updatedoc(query,updatedoc);
      res.send(result);
    })


    app.put('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email }
      const isExit = await userCollection.findOne(query)
      if (isExit) {
        if (user.status === 'Requested') {
          const result = await userCollection.updateOne(query, {
            $set: {
              status: user?.status
            }
          })
          res.send(result);
        } else {
          return res.send(isExit);
        }
      }

      const options = { upsert: true }
      const updatedoc = {
        $set: {
          ...user,
          timestamp: Date.now()
        }
      }
      const result = await userCollection.updateOne(query, updatedoc, options)
      res.send(result);
    })

    app.put('/payment', async (req, res) => {
      const user = req.body;
      const query = { 
        email: user?.email,
        role : user?.role
       }
      const isExit = await AllUserPayment.insertOne(query)
      if (isExit) {
        if (user.status === 'succeeded') {
          const result = await AllUserPayment.updateOne(query, {
            $set: {
              status: user?.status
            }
          })
          res.send(result);
        } else {
          return res.send(isExit);
        }
      }

      const options = { upsert: true }
      const updatedoc = {
        $set: {
          ...user,
          timestamp: Date.now()
        }
      }
      const result = await AllUserPayment.updateOne(query, updatedoc, options)
      res.send(result);
    })


    app.post('/addpost', async (req, res) => {
      const user = req.body;
      const result = await AllPost.insertOne(user);
      res.send(result);
    })
    app.put('/payment', async (req, res) => {
      const user = req.body;
      const result = await AllUserPayment.insertOne(user);
      res.send(result);
    })

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
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