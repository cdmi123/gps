const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

mongoose.connect('mongodb+srv://ravi:123@cluster0.cmygjfn.mongodb.net/gpstracking');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const locationSchema = new mongoose.Schema({
  username: String,
  lat: Number,
  lng: Number,
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Location = mongoose.model("Location", locationSchema);

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({ secret: "gpssecret", resave: false, saveUninitialized: true }));

app.get("/register", (req, res) => res.render("register"));
app.get("/login", (req, res) => res.render("login"));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const exists = await User.findOne({ username });
  if (exists) return res.send("User already exists");
  await User.create({ username, password });
  res.redirect("/login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (!user) return res.send("Invalid login");
  req.session.username = username;
  res.redirect("/map");
});

app.get("/map", (req, res) => {
  if (!req.session.username) return res.redirect("/login");
  res.render("map", { username: req.session.username });
});

io.on("connection", socket => {
  socket.on("location", async (data) => {
    await Location.findOneAndUpdate(
      { username: data.username },
      { lat: data.lat, lng: data.lng, updatedAt: new Date() },
      { upsert: true }
    );
    socket.broadcast.emit("location", data);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});