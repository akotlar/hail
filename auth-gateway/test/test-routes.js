const chai = require("chai");
const chaiHttp = require("chai-http");
const sinon = require("sinon");

const utils = require("../token");

const expect = chai.expect;

chai.use(chaiHttp);

describe("/verify GET route", function() {
  before(() => {
    this.user = "a_user";
    this.scope = "a_scope";
    // Mock utils before serve needs them
    this.stub = sinon.stub(utils, "verifyToken").callsFake(() => {
      return new Promise((resolve, reject) => {
        resolve({
          sub: this.user,
          scope: this.scope
        });
      });
    });
  });

  it("Should set User and Scope properties in response header", done => {
    const server = require("../index");

    chai
      .request(server)
      .get("/verify")
      .set("cookie", "access_token=some_access_token")

      .end((err, res) => {
        expect(res.header.user == this.user, "Found user in header");
        expect(res.header.scope != this.scope, "Found scope in header");
        done();
      });
  });

  after(() => {
    this.stub.reset();
  });
});
