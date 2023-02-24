require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const shortId = require("shortid");
const bodyParser = require("body-parser");
const validUrl = require("valid-url");

const cors = require("cors");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

mongoose.set("strictQuery", false);
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
});

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

//Create Schema
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String,
});
const URL = mongoose.model("URL", urlSchema);

app.post("/api/shorturl", async function (req, res) {
  console.log("url:", req.body.url);
  const url = req.body.url;
  const urlCode = shortId.generate();

  // check if the url is valid or not
  if (!validUrl.isWebUri(url)) {
    res.status(401).json({
      error: "invalid URL",
    });
  } else {
    try {
      // check if its already in the database
      let foundURL = await URL.findOne({
        original_url: url,
      });
      if (foundURL) {
        res.json({
          original_url: foundURL.original_url,
          short_url: foundURL.short_url,
        });
      } else {
        // if its not exist yet then create new one and response with the result
        newURL = new URL({
          original_url: url,
          short_url: urlCode,
        });
        await newURL.save();
        res.json({
          original_url: newURL.original_url,
          short_url: newURL.short_url,
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json("Server erorr...");
    }
  }
});

app.get("/api/shorturl/:short_url?", async function (req, res) {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.short_url,
    });
    if (urlParams) {
      return res.redirect(urlParams.original_url);
    } else {
      return res.status(404).json("No URL found");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
});
