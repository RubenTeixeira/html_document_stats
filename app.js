#!/usr/bin/env node
/**
 * Created by ruben on 29/09/2017.
 */
'use strict';
const { HtmlMetaInfo } = require('./HtmlMetaInfo.js');

/* Display Usage */
if (process.argv.length < 3) {
    console.log("USAGE: \"node app.js HOST [FILENAME]\"");
    return;
}

/* Ensure protocol exists on the URL */
const argv = process.argv;
let host = process.argv[2];
if (!host.includes("http"))
    host = "http://".concat(host);

/* Create HtmlInfo object and fetch content*/
const parser = new HtmlMetaInfo(host);
parser.fetch(parse);

/**
 * Start the parsing process
 */
function parse() {
    parser.parse();
    parser.displayResults();
    let fileName = argv[3];
    if (fileName) {
        if (!fileName.includes(".json"))
            fileName = fileName.concat(".json");
        parser.saveResults(fileName);
    } else
        parser.saveResults();
}
