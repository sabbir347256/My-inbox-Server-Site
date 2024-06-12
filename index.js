const express = require('express');
const { MongoClient, ServerApiVersion, Timestamp, ObjectId } = require('mongodb');
const cors = require('cors');
require("dotenv").config();
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const stripe = require('stripe')(process.env.SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;



app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://my-inbox-c638f.web.app",
      "https://my-inbox-c638f.firebaseapp.com"
    ],
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kd61vsr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// const logger = (req, res, next) => {
//   console.log('log : info', req.method, req.url);
//   next();
// }

// const tokenVerify = (req, res, next) => {
//   const token = req?.cookies?.token;
//   // console.log('token in the middleware',token);

//   if (!token) {
//     return res.status(401).send({ message: 'unauthorized access' })
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ message: 'unauthorized access' })
//     }
//     req.user = decoded;
//     next();
//   })

// }

const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const AllPost = client.db('My_Inbox').collection('addpost');
    const AllUserPayment = client.db('My_Inbox').collection('paymentUser');
    const userCollection = client.db('My_Inbox').collection('usercollection');
    const userComment = client.db('My_Inbox').collection('userComment');
    const showAllReport = client.db('My_Inbox').collection('showallreport');
    const announcement = client.db('My_Inbox').collection('announcement');


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '365d' })

      res.cookie('token', token, cookieOption)
        .send({ Success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token', { ...cookieOption, maxAge: 0 }).send({ Success: true })
    })





    app.get('/userCount',async (req,res) => {
      const count = await userCollection.estimatedDocumentCount();
      res.send({count});
    })
    app.get('/reportCount',async (req,res) => {
      const count = await showAllReport.estimatedDocumentCount();
      res.send({count});
    })
    app.get('/getaddpost', async (req, res) => {
      const search = req.query.search;
      let query = {}
      if(search){
        query = {inputField : search}
      }
      const cursor = AllPost.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/announcement', async (req, res) => {
      const cursor = announcement.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/comment', async (req, res) => {
      const cursor = userComment.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/showallreport', async (req, res) => {
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      const result = await showAllReport.find()
      .skip(page * size)
      .limit(size)
      .toArray();
      res.send(result);
    })

    app.get('/getaddpost/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = AllPost.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      const result = await userCollection.find()
      .skip(page * size)
      .limit(size)
      .toArray();
      res.send(result);
    })
    app.get('/paymentUse/:email', async (req, res) => {
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
      const result = await userCollection.updateOne(query,updatedoc);
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

    app.post('/announcement', async (req, res) => {
      const user = req.body;
      const result = await announcement.insertOne(user);
      res.send(result);
    })
    app.post('/showallreport', async (req, res) => {
      const user = req.body;
      const result = await showAllReport.insertOne(user);
      res.send(result);
    })
    app.post('/comment', async (req, res) => {
      const user = req.body;
      const result = await userComment.insertOne(user);
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


    app.delete('/deletePost/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await AllPost.deleteOne(query);
      res.send(result);
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