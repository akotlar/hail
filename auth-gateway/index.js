require("dotenv").config();

const polka = require("polka");
const { verifyToken, getAuthToken } = require("./token");

const PORT = 8000;
const unauthorized = res => {
  res.statusCode = 401;
  res.end();
};

const app = polka()
  .get("/verify", (req, res) => {
    const token = getAuthToken(req);

    if (!token) {
      unauthorized(res);
      return;
    }

    verifyToken(token)
      .then(user => {
        res.setHeader("User", user.sub);
        res.setHeader("Scope", user.scope);

        res.end();
      })
      .catch(e => {
        console.error(e);
        unauthorized(res);
      });
  })
  .listen(PORT, err => {
    if (err) {
      throw err;
    }

    console.info(`Auth server running on port ${PORT}`);
  });

module.exports = app.server;
