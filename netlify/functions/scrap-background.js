const axios = require("axios");
const allStyleTags = require('../../utils/allStyleTags.json');
const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");
const Excel = require('exceljs');

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

async function saveScrappedData(url_x, url_y) {

    console.log("saveScrappedData - REQ RECEIVED: ", url_x, url_y)

    const viewPortDataList_resp = await axios.post(`https://breakpoint-responsify-v22.netlify.app/.netlify/functions/pup-core`, {targetURL: url_x});
    const viewPortDataList_X = viewPortDataList_resp.data
    viewPortDataList_X ? console.log('extracted from ', url_x) : console.log('failed to extract from ', url_x)

    const viewPortDataList_Y_resp = await axios.post(`https://breakpoint-responsify-v22.netlify.app/.netlify/functions/pup-core`, {targetURL: url_y});
    const viewPortDataList_Y = viewPortDataList_Y_resp.data
    viewPortDataList_Y ? console.log('extracted from ', url_y) : console.log('failed to extract from ', url_y)

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
}

function sortByKey(array, key) {
    // console.log(array)
    return array.sort((a, b) => {
        let x = a[key];
        let y = b[key];

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

const transporter = nodemailer.createTransport(
    mg({
        auth: {
            api_key: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN,
        },
    })
);

exports.handler = async function (event) {
    const {email, url_x, url_y} = JSON.parse(event.body);

    const style_data = await saveScrappedData(url_x, url_y);

    const headers = await prepareExcelHeaders();

    const filename = 'Dataset.xlsx';
    let workbook = new Excel.Workbook();
    let worksheet = workbook.addWorksheet('Dataset');


    worksheet.columns = headers;

    style_data.forEach((e) => {
        worksheet.addRow(e);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const info = await transporter.sendMail({
        from: 'John Doe <john@mg.yourdomain.com>',
        to: email,
        subject: "Your dataset is ready!",
        text: `Extracted dataset from ${url_x} and ${url_y}. See attached excel sheet. `,
        attachments: [
            {
                filename,
                content: buffer,
                contentType:
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        ],
    });

    console.log(`test report sent: ${info.messageId}`);
};