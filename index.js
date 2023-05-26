const express = require("express");
const app = express();
const model = require("./models/shortner");
const mongoose = require("mongoose");
const { urlencoded } = require("body-parser");
const methodOverride = require("method-override");
const validUrl = require("valid-url");
const PORT = process.env.PORT || 1000
require('dotenv').config()
const qrcode = require('qrcode');



app.use(methodOverride("_method"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("db connected");
  })
  .catch((error) => {
    console.log(error);
  });

app.set("view-engine", "ejs");

app.get("/", async (req, res) => {
  try {
    const allUrls = await model.find();

    // Generate QR codes for each shortened URL
    const qrCodes = await Promise.all(
      allUrls.map(async (shortUrl) => {
        const qrCode = await qrcode.toDataURL(shortUrl.full);
        return qrCode;
      })
    );

    res.render("index.ejs", { urls: allUrls, qrCodes: qrCodes, error: null, host: req.get('host') });
  } catch (error) {
    res.render("index.ejs", { urls: [], qrCodes: [], error: "Error retrieving URLs", host: req.get('host') });
  }
});


app.delete("/url/:id", async (req, res) => {
  try {
    await model.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/url", async (req, res) => {
  const { fullurl } = req.body;
  if (validUrl.isWebUri(fullurl)) {
    try {
      await model.create({ full: fullurl });
      res.redirect("/");
    } catch (error) {
      res.render("index.ejs", { error: "Error saving URL", urls: [] , host: req.get('host')});
    }
  } else {
    const allurls = await model.find();
    res.render("index.ejs", { error: "Invalid URL", urls: allurls,host: req.get('host') });
  }
});

app.get("/:shortUrl", async (req, res) => {
  try {
    const shortUrl = await model.findOne({ short: req.params.shortUrl });
    if (!shortUrl) {
      return res.sendStatus(404);
    }

    shortUrl.clicks++;
    await shortUrl.save();
    res.redirect(shortUrl.full);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get("/api/urls", async (req, res) => {
  try {
    const allurls = await model.find();
    res.json(allurls);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving URLs" });
  }
});


app.post("/api/urls", async (req, res) => {
  const { fullurl } = req.body;

  if (!validUrl.isWebUri(fullurl)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const createdUrl = await model.create({ full: fullurl });
    res.status(201).json(createdUrl);
  } catch (error) {
    res.status(500).json({ error: "Error creating URL" });
  }
});




app.listen(PORT, () => {
  console.log(`listening to ${PORT}`);
});
