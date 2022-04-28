const jsdom = require("jsdom");
const chromium = require('chrome-aws-lambda')
// const puppeteer = require('puppeteer-core')
const allStyleTags = require('../../utils/allStyleTags.json');
const nodemailer = require("nodemailer");
const Excel = require('exceljs');

const VIEWPORT_WIDTHS = [
    375,
    480,
    620,
    768,
    990,
    1200,
    1600,
    1920
]

const XY_MAP = {
    1920: 1920,
    1600: 1600,
    1200: 1200,
    990: 990,
    768: 768,
    620: 620,
    480: 480,
    375: 375
}

async function collectCSSFromPage(page, width) {
    await page.setViewportSize({width, height: 900});

    return await page.evaluate(() => {

        function traversDOM(element, parent, nodes, variable) {
            parent = parent || {top: 0, left: 0, depth: 0};
            nodes = nodes || [];

            if (element.nodeType === 1) {
                var node = {};
                // node[`HTML Element-${variable}`] = element.tagName;
                // node[`CSS Class-${variable}`] = element.className;
                //node.styles = getAllStyles(element, variable);
                nodes.push(getAllStyles(element, variable, parent));
                // nodes.push(node);

                for (var i = 0; i < element.childNodes.length; i++) {
                    traversDOM(element.childNodes[i], element, nodes, variable);
                }
            }
            return nodes;
        }

        function getAllStyles(elem, variable, parentElement) {
            console.log("---------------------------------------")
            if (!elem) return []; // Element does not exist, empty list.
            var win = document.defaultView || window, style, styleNode = [];
            const allAllStylesMap = {};
            if (win.getComputedStyle) { /* Modern browsers */
                style = win.getComputedStyle(elem, '');
                //const allAllStylesMap = {};

                allAllStylesMap[`Breakpoint-${variable}`] = window.innerWidth;
                allAllStylesMap[`HTML Element-${variable}`] = elem.tagName;
                allAllStylesMap[`CSS Class-${variable}`] = elem.className;
                allAllStylesMap[`CSS Class Parent-${variable}`] = parentElement.className;
                console.log("parent ", parentElement.className)

                for (var i = 0; i < style.length; i++) {
                    allAllStylesMap[`${style[i]}-${variable}`] = style.getPropertyValue(style[i]);
                    styleNode.push(allAllStylesMap);
                    //styleNode.push(style[i] + ':' + style.getPropertyValue(style[i]));
                    //               ^name ^           ^ value ^
                }
            } else if (elem.currentStyle) { /* IE */
                style = elem.currentStyle;
                for (var name in style) {
                    styleNode.push(name + ':' + style[name]);
                }
            } else { /* Ancient browser..*/
                style = elem.style;
                for (var i = 0; i < style.length; i++) {
                    styleNode.push(style[i] + ':' + style[style[i]]);
                }
            }
            return allAllStylesMap;
        }

        const styleMap = {};
        ['xvar', 'yvar'].forEach(_variable => {
            styleMap[_variable] = traversDOM(document.body, undefined, undefined, _variable)
        })
        //    return traversDOM(document.body);
        return styleMap;
    });
}

function traversDOM(element, parent, nodes) {
    parent = parent || {top: 0, left: 0, depth: 0};
    nodes = nodes || [];

    if (element.nodeType === 1) {
        var node = {};
        node.element = element.tagName;
        node.className = element.className;
        node.styles = getAllStyles(element);
        nodes.push(node);

        for (var i = 0; i < element.childNodes.length; i++) {
            traversDOM(element.childNodes[i], node, nodes);
        }
    }
    return nodes;
}

function getAllStyles(elem) {
    const dom = new JSDOM();
    const document = dom.window.document;
    const window = dom.window;

    if (!elem) return []; // Element does not exist, empty list.
    var win = document.defaultView || window, style, styleNode = [];
    if (win.getComputedStyle) { /* Modern browsers */
        style = win.getComputedStyle(elem, '');
        for (var i = 0; i < style.length; i++) {
            styleNode.push(style[i] + ':' + style.getPropertyValue(style[i]));
            //               ^name ^           ^ value ^
        }
    } else if (elem.currentStyle) { /* IE */
        style = elem.currentStyle;
        for (var name in style) {
            styleNode.push(name + ':' + style[name]);
        }
    } else { /* Ancient browser..*/
        style = elem.style;
        for (var i = 0; i < style.length; i++) {
            styleNode.push(style[i] + ':' + style[style[i]]);
        }
    }
    return styleNode;
}

async function viewPortDataListFunc(url) {
    // const browser = await puppeteer.launch();

    const browser = chromium.puppeteer.launch({
        args: chromium.args,
        // get path to browser
        executablePath: process.env.EXCECUTABLE_PATH || await chromium.executablePath,
        headless: true
    })

    // const page = await browser.newPage();
    // await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});
    // await page.setDefaultNavigationTimeout(0);

    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForTimeout(0);

    const styleMap = {};

    for (let index = 0; index < VIEWPORT_WIDTHS.length; index++) {
        const width = VIEWPORT_WIDTHS[index];

        styleMap[width] = await collectCSSFromPage(page, width)
    }

    // console.log("DATA FROM EVAL ", styleMap)
    await browser.close();
    console.log("extracted data from : ", url)
    return styleMap;
}


async function saveScrappedData(url_x, url_y) {

    console.log("saveScrappedData - REQ RECEIVED: ", url_x, url_y)

    const viewPortDataList_X = await viewPortDataListFunc(url_x)
    const viewPortDataList_Y = await viewPortDataListFunc(url_y)

    const styleData = [];

    Object.keys(XY_MAP).forEach(key => {
        viewPortDataList_X[XY_MAP[key]]['xvar'].forEach((element_x) => {

            viewPortDataList_Y[XY_MAP[key]]['yvar'].forEach((element_y) => {

                if (element_x['Breakpoint-xvar'] && element_x['CSS Class-xvar'] && element_x['Breakpoint-xvar'] === element_y['Breakpoint-yvar'] && element_x['CSS Class-xvar'] === element_y['CSS Class-yvar']) {
                    // console.log("key_x",element_x['Breakpoint-xvar'] , element_x['CSS Class-xvar'], " - key_y",element_y['Breakpoint-yvar'] , element_y['CSS Class-yvar'])
                    styleData.push({...element_x, ...element_y});
                }
            })

        })
    })


    console.log("matched the css classes of x and y variables..!")
    return styleData;
}

/////////////////////////////////////////////// frontend functions start ///////////////////////////////////////////////

function prepareExcelHeaders() {
    const titles = [];

    allStyleTags.forEach(styleData => {
        let styleParts = styleData.split(':');
        let styleKey = styleParts[0];

        titles.push({
            header: styleKey,
            key: `${styleKey}-xvar`,
            width: 15
        })
    })

    allStyleTags.forEach(styleData => {
        let styleParts = styleData.split(':');
        let styleKey = styleParts[0];

        titles.push({
            header: styleKey,
            key: `${styleKey}-yvar`,
            width: 15
        })
    })
    console.log("headers are prepared for the excel sheet.")
    return sortByKey(titles, 'groupKey');
    // return titles
}

function sortByKey(array, key) {
    // console.log(array)
    return array.sort((a, b) => {
        let x = a[key];
        let y = b[key];

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

/////////////////////////////////////////////// frontend functions end   ///////////////////////////////////////////////


var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'userdevy.io@gmail.com',
        pass: 'Devy.io@10'
    }
});

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return {statusCode: 405, body: 'Method Not Allowed'};
    }

    const errorGen = msg => {
        return {statusCode: 500, body: msg};
    };

    try {
        const {email, url_x, url_y} = JSON.parse(event.body);
        // const url_x = 'https://login-absolute.netlify.app/'
        // const url_y = 'https://login-output-responsive.netlify.app/'
        // const email = 'jayampathi.bac@gmail.com'

        if (!email && !url_x && !url_y) {
            return errorGen('Missing Fields. Please try again..!');
        }

        const styledata = await saveScrappedData(url_x, url_y);
        const headers = await prepareExcelHeaders();

        const filename = `Dataset.xlsx`;
        let workbook = new Excel.Workbook();
        let worksheet = workbook.addWorksheet('Dataset');


        worksheet.columns = headers;

        let data = styledata;
        data.forEach((e) => {
            worksheet.addRow(e);
        });
        const buffer = await workbook.xlsx.writeBuffer();

        var mailOptions = {
            from: 'userdevy.io@gmail.com',
            to: email,
            subject: `Dataset for the neural network`,
            text: `extracted from - ${url_x} and ${url_y}`,
            attachments: [
                {
                    filename,
                    content: buffer,
                    contentType:
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            ],
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });


        console.log(`test report sent: `);
        return {statusCode: 200, body: JSON.stringify({msg: "An email will be sent with the dataset..!"})}
    } catch (err) {
        console.log(err); // output to netlify function log
        return {
            statusCode: 500,
            body: JSON.stringify({msg: err.message}),
        };
    }

    // const url_x = 'https://superhuman-not-adjusted.netlify.app/';
    // const url_y = 'https://superuhuman-adjusted.netlify.app/';

    // const url_x = 'https://grammarly-version-2.netlify.app/';
    // const url_y = 'https://grammarly-version-3.netlify.app/';

    // const url_x = 'https://login-absolute.netlify.app/';
    // const url_y = 'https://login-output-responsive.netlify.app/';
};