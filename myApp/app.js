var express = require('express');
var path = require('path');
var { MongoClient } = require('mongodb');
var session = require('express-session');
var app = express();

const databaseUrl = "mongodb://127.0.0.1:27017";
const defaultPort = 3000;


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));


function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/');
  }
}

app.get('/', function(req, res) {
  res.render('login');
});
app.get('/registration', (req, res) => {
  res.render('registration'); 
});
app.get('/home', isAuthenticated, function(req, res) {
  res.render('home');
});
app.get('/hiking', isAuthenticated, function(req, res) {
  res.render('hiking');
});
app.get('/cities', isAuthenticated, function(req, res) {
  res.render('cities');
});
app.get('/islands', isAuthenticated, function(req, res) {
  res.render('islands');
});
app.get('/paris', isAuthenticated, function(req, res) {
  res.render('paris');
});
app.get('/rome', isAuthenticated, function(req, res) {
  res.render('rome');
});
app.get('/inca', isAuthenticated, function(req, res) {
  res.render('inca');
});
app.get('/annapurna', isAuthenticated, function(req, res) {
  res.render('annapurna');
});
app.get('/bali', isAuthenticated, function(req, res) {
  res.render('bali');
});
app.get('/santorini', isAuthenticated, function(req, res) {
  res.render('santorini');
});
app.post('/add-to-wanttogo', isAuthenticated, async function(req, res) {
  const { destination } = req.body;

  if (!destination) {
    return res.status(400).send('Destination is required.');
  }

  try {
    const client = await MongoClient.connect(databaseUrl);
    const db = client.db("myDB");
    const collection = db.collection("myCollection");

    const user = await collection.findOne({ username: req.session.user.username });

    if (user.wantToGoList && user.wantToGoList.includes(destination)) {
      client.close();
      return res.redirect('/wanttogo?error=This%20destination%20is%20already%20in%20your%20Want-to-Go%20list!');
    }

    await collection.updateOne(
      { username: req.session.user.username }, 
      { $addToSet: { wantToGoList: destination } } 
    );

    client.close();
    res.redirect('/wanttogo?success=' + encodeURIComponent(`${destination} has been added to your Want-to-Go list!`));
  } catch (err) {
    console.error('Error adding to want-to-go list:', err.message);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/wanttogo', isAuthenticated, async function(req, res) {
  try {
    const client = await MongoClient.connect(databaseUrl);
    const db = client.db("myDB");
    const collection = db.collection("myCollection");

    const user = await collection.findOne({ username: req.session.user.username });
    client.close();

    const errorMessage = req.query.error;
    const successMessage = req.query.success;

    res.render('wanttogo', {
      wantToGoList: user.wantToGoList || [],
      errorMessage: errorMessage || null,
      successMessage: successMessage || null
    });
  } catch (err) {
    console.error('Error fetching want-to-go list:', err.message);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/search', isAuthenticated, (req, res) => {
  const searchKeyword = req.body.Search.toLowerCase();
  const destinations = [
      { name: "Rome", link: "/rome" },
      { name: "Paris", link: "/paris" },
      { name: "Bali", link: "/bali" },
      { name: "Santorini", link: "/santorini" },
      { name: "Inca Trail to Machu Picchu", link: "/inca" },
      { name: "Annapurna Circuit", link: "/annapurna" }
  ];

  const results = destinations.filter(destination =>
      destination.name.toLowerCase().includes(searchKeyword)
  );

  if (results.length === 0) {
      res.render('searchResults', { message: "Destination not Found", results: [] });
  } else {
      res.render('searchResults', { message: null, results });
  }
});

(async () => {
    try {
        const client = await MongoClient.connect(databaseUrl);
        console.log("Connected to MongoDB!");
        db = client.db('myDB');
        console.log("Connected to database: myDB");

        const startServer = (port) => {
            app.listen(port, () => {
                console.log("Server is running on port ${port}");
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log("Port ${port} is already in use, trying another port...");
                    startServer(port + 1); 
                } else {
                    console.error('Failed to start server:', err.message);
                }
            });
        };

        startServer(defaultPort);
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err.message);
    }
})();

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  console.log("Received registration request:", { username, password });

  if (!username || !password) {
    return res.render('registration', { errorMessage: 'Username and password fields cannot be empty.' });
  }

  try {
    const client = await MongoClient.connect(databaseUrl);
    console.log("Connected to MongoDB in register route");
    const db = client.db("myDB");
    const collection = db.collection("myCollection");

    const existingUser = await collection.findOne({ username });
    if (existingUser) {
      client.close();
      return res.render('registration', { errorMessage: 'Username already exists.' });
    }

    const result = await collection.insertOne({ username, password, wantToGoList: [] });
    console.log("Document inserted successfully:", result);
    console.log("User registered successfully, redirecting to login");
    client.close();
    res.redirect('/'); 
  } catch (err) {
    console.error("Failed to register user:", err.message);
    res.status(500).send('Error registering user');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log("Received login request:", { username, password });

  if (!username || !password) {
    return res.render('login', { errorMessage: 'Username and password fields cannot be empty.' });
  }

  try {
    const client = await MongoClient.connect(databaseUrl);
    console.log("Connected to MongoDB in login route");
    const db = client.db("myDB");
    const collection = db.collection("myCollection");

    const user = await collection.findOne({ username });
    client.close();

    if (!user || user.password !== password) {
      return res.render('login', { errorMessage: 'Invalid username or password.' });
    }

    req.session.user = user;
    console.log("User authenticated successfully, redirecting to home");
    res.redirect('/home'); 
  } catch (err) {
    console.error("Failed to login user:", err.message);
    res.status(500).send('Error logging in user');
  }
});

app.post('/add-to-wanttogo', isAuthenticated, async (req, res) => {
  const { destination } = req.body;
  console.log("Received add-to-wanttogo request:", { destination });

  if (!destination) {
    return res.render('wanttogo', { wantToGoList: req.session.user.wantToGoList || [], errorMessage: 'Destination cannot be empty.' });
  }

  try {
    const client = await MongoClient.connect(databaseUrl);
    const db = client.db("myDB");
    const collection = db.collection("myCollection");

    const user = await collection.findOne({ username: req.session.user.username });
    if (user.wantToGoList.includes(destination)) {
      client.close();
      return res.render('wanttogo', { wantToGoList: user.wantToGoList, errorMessage: 'Destination is already in your want-to-go list.' });
    }

    await collection.updateOne(
      { username: req.session.user.username },
      { $push: { wantToGoList: destination } }
    );

    req.session.user.wantToGoList.push(destination);
    client.close();

    res.redirect('/wanttogo'); 
  } catch (err) {
    console.error('Error adding to want-to-go list:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(defaultPort, () => {
  console.log("Server is running on port ${defaultPort}");
});