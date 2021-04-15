const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("<h1>Welcome to EJS world!</h1>");
});

app.listen(3000, () => {
    console.log("server started on port 3000");
});