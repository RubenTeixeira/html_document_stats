/**
 * Created by ruben on 30/09/2017.
 */
'use strict';
const expect = require("chai").expect;
const { HtmlMetaInfo } = require("../HtmlMetaInfo.js");

describe("Meta Info Parser", function() {
    it("fetches and parses HTML content", function() {
        const parser = new HtmlMetaInfo('www.example.com'); // Bogus url
        parser.testFetch(`<!DOCTYPE html>
                            <html>
                            <head></head>
                            <body>
                                <img src='http://www.example.com/logo.jpg'></img>
                            </body>
                            </html>`);
        parser.parse();
        expect(parser.map.get('HTML').count).to.deep.equal(1);
        expect(parser.map.get('BODY').childNodeTypes[0]).to.equal('IMG');
        expect(parser.map.get('IMG').resources[0].host).to.equal('www.example.com');
    });
});