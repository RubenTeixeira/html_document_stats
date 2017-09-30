/**
 * Created by ruben on 29/09/2017.
 */
'use strict';
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const URL = require("url");
const FILENAME = 'results.json';
const MAX_STRING_LENGTH = 50;
let HOST;

/**
 * Class holding the parameters and behaviour of the app
 * +url     - the url to fetch info of
 * +map     - holds the information gathered from the parsing
 * +depth   - the max depth of the DOM tree
 * +tagsCount   - Total nodes found on the document
 */
class HtmlMetaInfo {

    constructor(url) {
        HOST = URL.parse(url);
        this.url = url;
    }

    /**
     * Parse the document and gather all the needed info
     */
    parse() {
        this.tagsCount = 0;
        this.map = new Map;
        this.depth = 0;
        //var tags = this.dom.window.document.getElementsByTagName('*');
        let root = this.dom.window.document.getElementsByTagName('html');
        this.walkDOM(root[0], 1);
    }

    saveResults(fileName) {
        let file = fileName || FILENAME;
        const content = JSON.stringify(this);
        fs.writeFile(file, content, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }

            console.log("Results JSON file was saved as "+file+" on current directory.");
        });
    }

    /**
     * Gets the document and instantiates JSDOM object
     * @param callback - function to call when a response is received
     *                  and the JSDOM object is created.
     */
    fetch(callback) {
        JSDOM.fromURL(this.url, {resources: "usable"}).then(dom => {
            this.dom = dom;
            callback();
        }).catch((err) => {console.log(err)});
    }

    testFetch(html) {
        this.dom = new JSDOM(html);
    }


    /**
     * Adds new node to the Map, if it exists already, it counts it
     * and adds its own info to the stats
     * @param elem
     */
    addNode(elem) {
        if(elem.nodeType !== 1) /* ignore text nodes */
            return;
        this.tagsCount++;
        if (this.map.has(elem.nodeName)) {
            let tagInfo = this.map.get(elem.nodeName);
            tagInfo.update(elem);
            this.map.set(elem.nodeName, tagInfo);
        } else {
            let tagInfo = new TagInfo(elem);
            this.map.set(elem.nodeName,tagInfo);
        }
    }

    /**
     * Recursively walks down the DOM tree using Depth First Search.
     * After reaching the end of a branch, current depth is compared
     * against highest branch found so far, and if higher, stored as
     * current max depth.
     * @param node root node
     * @param depth initial depth (1 in this case)
     */
    walkDOM(node, depth) {
        this.addNode(node);
        node = node.firstChild;
        while(node) {
            this.walkDOM(node, depth+1);
            if (depth>this.depth)
                this.depth = depth;
            node = node.nextSibling;
        }
    }

    /**
     * Displays a table of gathered data on the console
     */
    displayResults() {
        const CLI = require('clui'),
            clc = require('cli-color');

        let Line          = CLI.Line,
            LineBuffer    = CLI.LineBuffer;

        let outputBuffer = new LineBuffer({
            x: 0,
            y: 0,
            width: 'console',
            height: 'console'
        });
        let message = new Line(outputBuffer)
            .column(this.url+" Meta Information", 50, [clc.green])
            .fill()
            .store();

        let info = new Line(outputBuffer)
            .column("DOM Tree Depth: "+this.depth+" - Total Nodes: "+this.tagsCount, 50, [clc.yellow])
            .fill()
            .store();

        let blankLine = new Line(outputBuffer)
            .fill()
            .store();

        let header = new Line(outputBuffer)
            .column('TAG', 11, [clc.cyan])
            .column('FREQUENCY', 11, [clc.cyan])
            .column('ATTR No.', 10, [clc.cyan])
            .column('RESOURCES', 11, [clc.cyan])
            .column('CHILD No.', 11, [clc.cyan])
            .column('CHILD TYPES', 30, [clc.cyan])
            .fill()
            .store();

        let line;
        this.map.forEach((v, k) => {
            line = new Line(outputBuffer)
                .column(k, 11)
                .column(v.count.toString(), 11)
                .column(v.totalAttributeCount.toString(), 10)
                .column((v.resources) ? v.resources.length.toString() : '-', 11)
                .column(v.childNodeCount.toString(), 11)
                .column((v.childNodeCount > 0) ? v.childNodeTypes.toString() : '-', 30)
                .fill()
                .store();
        });

        outputBuffer.output();
    }

    /**
     * Converts ES6 Map into Object in order to return a serializable
     * object.
     * @returns {{url: string, tagsCount: number, depth: number, info: (Object | Map)}}
     */
    toJSON() {
        let object = {};
        this.map.forEach((value, key) => {
            let keys = key.split('.'),
                last = keys.pop();
            keys.reduce((r, a) => r[a] = r[a] || {}, object)[last] = value;
        });
        return {
            url: this.url,
            tagsCount: this.tagsCount,
            depth: this.depth,
            info: object
        };
    }
}

/**
 * Class describing the objects which will hold
 * each found HTML tag's statistical information
 * +count : number
 * +childNodeCount : number
 * +childNodeTypes : Array(string)
 * +totalAttributeCount : number
 * +resources : Array(ResourceInfo)
 */
class TagInfo {

    /**
     * The constructor takes an HTML node
     * @param node
     */
    constructor(node) {
        this.count = 1;
        this.totalAttributeCount = 0;
        if (node.attributes.length > 0) {
            this.totalAttributeCount = node.attributes.length;
            this.checkResources(node);
        }
        this.childNodeCount = node.childElementCount;
        if (this.childNodeCount > 0) {
            this.childNodeTypes = new Array;
            this.checkChildNodes(node);
        }
    }

    /**
     * If node tag already exists on the Map, then
     * the tags info is updated
     * @param node
     */
    update(node) {
        this.count++;
        if (node.attributes.length > 0) {
            this.totalAttributeCount += node.attributes.length;
            this.checkResources(node);
        }
        this.childNodeCount += node.childElementCount;
        if (node.childElementCount > 0) {
            if (!this.childNodeTypes)
                this.childNodeTypes = new Array;
            this.checkChildNodes(node);
        }

    }

    /**
     * If a node contains child nodes, this fetches their types
     * @param node
     */
    checkChildNodes(node) {
        node.childNodes.forEach((node) => {
            if (node.nodeType === 1 && this.childNodeTypes.indexOf(node.nodeName) === -1)
                this.childNodeTypes.push(node.nodeName);
        });
    }

    /**
     * If a node has 'src' attributes, then store resource info
     * using ResourceInfo objects
     * @param node
     */
    checkResources(node) {
        if(!node.hasAttribute("src"))
            return;
        let src = node.getAttribute("src");
        let resInfo = new ResourceInfo(src);
        if (!this.resources)
            this.resources = new Array;
        this.resources.push(resInfo);
    }
}

/**
 * Class holding information about a resource
 * +host: string
 * +path: string
 */
class ResourceInfo {

    /**
     * The constructor takes the 'src' attributes value
     * @param src
     */
    constructor(src) {
        if (src.includes("data:"))
            this.host = HOST.host;
        else {
            let host = URL.parse(src).host;
            this.host = (host === null) ? HOST.host : host;
        }
        this.path = this.truncateString(URL.parse(src).path);
    }


    /**
     * Truncate 'src' values strings for readability
     * @param str
     * @returns {string}
     */
    truncateString(str) {
        if (str.length > MAX_STRING_LENGTH)
            return str.substring(0,MAX_STRING_LENGTH/2-2)+'...'+str.substring(str.length - MAX_STRING_LENGTH/2-1);
        return str;
    }
}

exports.HtmlMetaInfo = HtmlMetaInfo;