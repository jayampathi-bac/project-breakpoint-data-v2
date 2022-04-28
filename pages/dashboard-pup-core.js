import Head from 'next/head'
import ApplicationHeader from '../components/applicationHeader';
import NProgress from 'nprogress'; //nprogress module
import 'nprogress/nprogress.css'; //styles of nprogress
import {NotificationContainer, NotificationManager} from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import ExcelExport from 'export-xlsx';
import {scrapperService} from '../services';
import allStyleTags from '../utils/allStyleTags.json';
import Script from 'next/script'
import {isString} from "next/dist/build/webpack/plugins/jsconfig-paths-plugin";
import axios from "axios";

let x_stylesData = []
let y_stylesData = []
let stylesData480px = []

export default function dashboard() {
    // const registerUser = async event => {
    //     event.preventDefault()
    //     NProgress.start()
    //
    //     const response = await scrapperService.saveScrappedData({url: event.target.url.value});
    //
    //     console.log("response", x_stylesData)
    //
    //     const {message, data} = response.data
    //
    //     x_stylesData = data.styleData
    //     console.log("API RESPONSE: ", message, data);
    //
    //     // exportToExcel(data.styleData);
    //
    //     NotificationManager.success('Success', 'Scrapped html from URL.');
    //
    //     NProgress.done()
    // }

    const registerUser = async event => {
        event.preventDefault()
        NProgress.start()
        const results = await axios.post('/.netlify/functions/pup-core-background',{
            url_x: event.target.url_x.value,
            url_y: event.target.url_y.value,
            email: event.target.email.value
        })
        // const results = await axios.post('/.netlify/functions/playwright-background')
        console.log('results', results)
        NProgress.done()
        NotificationManager.success('Success', 'Scrapped html from URLs. Dataset will be sent to the given email.');
    }

    return (
        <div>
            <Head>
                <meta charSet="utf-8"/>
                <title>Dashboard</title>
                <meta content="Dashboard" property="og:title"/>
                <meta content="Dashboard" property="twitter:title"/>
                <meta content="width=device-width, initial-scale=1" name="viewport"/>
                {/* [if lt IE 9]><![endif] */}
                <link href="images/favicon.ico" rel="shortcut icon" type="image/x-icon"/>
                <link href="images/webclip.png" rel="apple-touch-icon"/>
            </Head>
            <div>
                <ApplicationHeader/>
                <div className="div-block-15">
                    <h1 className="heading-8">Enter URLs from websites To Collect Its HTML And CSS Data</h1>
                    <div className="div-block-17">
                        <div className="form-block w-form">
                            <form id="wf-form-Sign-Up-Form" name="wf-form-Sign-Up-Form" data-name="Sign Up Form"
                                  method="post" onSubmit={registerUser}>
                                <label htmlFor="url_x" className="field-label-2 sign-in">URL for x variables*</label>
                                <input type="text" className="text-field-2 w-input" maxLength={256} name="url_x"
                                       data-name="url_x" placeholder="https://yoursite.com" id="url_x" required/>
                                <label htmlFor="url_y" className="field-label-2 sign-in">URL for y variables*</label>
                                <input type="text" className="text-field-2 w-input" maxLength={256} name="url_y"
                                       data-name="url_y" placeholder="https://yoursite.com" id="url_y" required/>
                                <label htmlFor="email" className="field-label-2 sign-in">Email*</label>
                                <input type="text" className="text-field-2 w-input" maxLength={256} name="email"
                                       data-name="email" placeholder="test@test.com" id="email" required/>
                                <input type="submit" defaultValue="Submit" data-wait="Please wait..."
                                       className="submit-button w-button"/>
                            </form>
                            <div className="w-form-done">
                                <div>Thank you! Your submission has been received!</div>
                            </div>
                            <div className="w-form-fail">
                                <div>Oops! Something went wrong while submitting the form.</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <Script id="script-1"
                    src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=61847bafc93e586fe61e9b9d"
                    type="text/javascript" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="
                    crossOrigin="anonymous"></Script>
            {/* <script id="script-2" src="js/webflow.js" type="text/javascript"></script> */}
            {/* [if lte IE 9]><Script id="script-3" src="https://cdnjs.cloudflare.com/ajax/libs/placeholders/3.0.2/placeholders.min.js"></Script><![endif] */}
            <NotificationContainer/>
        </div>
    )
}

function formatDataToExport(styleList) {
    const allAllStylesMap = getAllStylesMap();
    const stylesDataList = [];

    styleList.forEach(elementStyleData => {
        const allStyleMapCopy = {...allAllStylesMap};

        elementStyleData.styles.forEach(styleData => {
            let styleParts = styleData.split(':');
            let styleKey = styleParts[0];
            let styleValue = styleParts[1];

            allStyleMapCopy[`${styleKey}-xvar`] = styleValue;
            allStyleMapCopy[`${styleKey}-yvar`] = styleValue;
        })

        allStyleMapCopy[`HTML Element-xvar`] = elementStyleData.element;
        allStyleMapCopy['HTML Element-yvar'] = elementStyleData.element;
        allStyleMapCopy[`CSS Class-xvar`] = (elementStyleData.className === '' || typeof elementStyleData.className === 'object') ? 'null' : elementStyleData.className;
        allStyleMapCopy['CSS Class-yvar'] = (elementStyleData.className === '' || typeof elementStyleData.className === 'object') ? 'null' : elementStyleData.className;

        stylesDataList.push(allStyleMapCopy);
    });
}

function getAllStylesMap() {
    const styleAllStylesMap = {};

    allStyleTags.forEach(styleData => {
        let styleParts = styleData.split(':');
        let styleKey = styleParts[0];

        styleAllStylesMap[`${styleKey}-xvar`] = 'null';
        styleAllStylesMap[`${styleKey}-yvar`] = 'null';
    });

    return styleAllStylesMap;
}

function exportToExcel(stylesData) {
    const excelExport = new ExcelExport();

    excelExport.downloadExcel({
        fileName: 'example',
        workSheets: [
            {
                sheetName: 'example',
                startingRowNumber: 1,
                gapBetweenTwoTables: 2,
                tableSettings: {
                    data: {
                        importable: true,
                        tableTitle: '',
                        notification: '',
                        headerGroups: [
                            {
                                name: 'X Variables (Independent Variables)',
                                key: 'xvar',
                            },
                            {
                                name: 'Y Variables (Dependent Variables)',
                                key: 'yvar',
                            },
                        ],
                        headerDefinition: prepareExcelHeaders()
                    }
                }
            }]
    }, [{data: prepareCSSData()}]);
}

function remove_elements_without_class_name(element) {
    return isString(element['CSS Class-xvar']) && element['CSS Class-xvar'] !== ''
}

function prepareCSSData() {
    console.log("prepareCSSData x", x_stylesData)
    console.log("prepareCSSData y", y_stylesData)
    let filteredRows = []
    // const titles = [];
    // x_stylesData.forEach((currentValue, index, arr) => {
    //     console.log("-x-x-x-x",currentValue.index, arr)
    //     // let x_styleParts = x_stylesData.split(':');
    //     // let x_styleKey = x_styleParts[0];
    //     // console.log("--------",x_styleKey)
    //     allStyleTags.forEach(y_stylesData => {
    //         // let y_styleParts = y_stylesData.split(':');
    //         // let y_styleKey = x_styleParts[0];
    //         // console.log("--------",y_styleKey)
    //     })
    // })

    x_stylesData.forEach((x_row, index) => {
        // console.log(`Current index: ${index} : ${element}`);
        let is_class_name_valid = isString(x_row['CSS Class-xvar']) && x_row['CSS Class-xvar'] !== ''
        if (is_class_name_valid) {
            y_stylesData.forEach((y_row, index) => {
                if (x_row['Breakpoint-xvar'] === y_row['Breakpoint-xvar'] && x_row['CSS Class-xvar'] === y_row['CSS Class-xvar']) {
                    allStyleTags.forEach(styleData => {
                        let styleParts = styleData.split(':');
                        let styleKey = styleParts[0];
                        x_row[`${styleKey}-yvar`] = y_row[`${styleKey}-xvar`]
                    })
                }

            })
        }
    });


    //Removing rows without css class names
    filteredRows = x_stylesData.filter(remove_elements_without_class_name);

    // console.log("stylesData480px", stylesData480px)
    console.log("filteredRows", filteredRows)
    return filteredRows
}

function prepareExcelHeaders() {
    const titles = [];
    allStyleTags.forEach(styleData => {
        let styleParts = styleData.split(':');
        let styleKey = styleParts[0];

        titles.push({
            "name": styleKey,
            "key": `${styleKey}-xvar`,
            "width": 15,
            "groupKey": "xvar"
        })

        titles.push({
            "name": styleKey,
            "key": `${styleKey}-yvar`,
            "width": 15,
            "groupKey": "yvar"
        })
    })

    return sortByKey(titles, 'groupKey');
}

function sortByKey(array, key) {
    return array.sort((a, b) => {
        let x = a[key];
        let y = b[key];

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}
