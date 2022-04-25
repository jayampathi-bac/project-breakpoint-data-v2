const puppeteer = require('puppeteer');

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
    await page.setViewport({width, height: 900});

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

async function viewPortDataListFunc(url) {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});
    // await page.setDefaultNavigationTimeout(0);
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

exports.handler = async (event, context) => {
    const url = event.queryStringParameters.url || "World";
    console.log("hi", url)

    const viewPortDataList = await viewPortDataListFunc(url)
    // console.log(viewPortDataList)
    return {
        statusCode: 200,
        body: JSON.stringify(viewPortDataList),
    };
};