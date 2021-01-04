const puppeteer = require('puppeteer');
const axios = require('axios');
const mysql = require('mysql');
var mongoose = require("mongoose");
var cors = require("cors");
var morgan = require("morgan");
const URI = "mongodb://localhost/integrated-orders";
mongoose.connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((db) => console.log("DB connected"))
    .catch((err) => console.error(err));
const { Schema } = mongoose;
const OrderSchema = new Schema({}, { strict: false });
var Order = mongoose.model("Order", OrderSchema);
async function integration() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'p64266426',
        database: 'mydb'
    });
    await connection.connect((err) => {
        if (err) throw err;
        console.log('Connected!');
    });
    await connection.query('SELECT * FROM branch_platform where platform_id="2"', async (err, rows) => {
        if (err) throw err;
        var grubhub = await rows;

        for (let i = 0; i < grubhub.length; i++) {
            let browser, url, res, data1, response, timestamp, page, auth2, auth = 0, grubhub_order, currentDate, currentDate_plus_900seconds, Branch_id, token, values, sql, sql1, token_valid_to, token_valid_from, token_valid_till, token_validity;
            setTimeout(async function run() {
                try {
                    browser = await puppeteer.launch({ headless: false });
                    page = await browser.newPage();
                    await page.goto('https://restaurant.grubhub.com/login');
                    await page.waitForSelector(".gfr-textfield-text__input");
                    await page.type(".gfr-textfield-text__input", grubhub[i].email);
                    await page.waitForSelector('input[type="password"]', { visible: true });
                    await page.type('input[type="password"]', grubhub[i].password)
                    await page.click('[type="submit"]')
                    await page.waitForNavigation();
                    await page.setRequestInterception(true);
                    page.on('response', (async response => {
                        auth2 = await response.request().headers()
                        if (auth2.authorization && auth2.authorization != auth) {
                            currentDate = await new Date().getTime();
                            currentDate_plus_900seconds = await currentDate + 900000;
                            Branch_id = await grubhub[i].Branch_id;
                            token = await auth2.authorization;
                            values = [[token, currentDate, currentDate_plus_900seconds, '2', Branch_id]];
                            sql = "INSERT IGNORE into session (token,token_valid_from,token_valid_to,platform_id,Branch_id) VALUES ?";

                            await connection.query(sql, [values], function (err, result) {
                                if (err) throw err;
                                console.log("Number of records inserted: " + result.affectedRows);
                            });

                            await connection.query('SELECT token_valid_to FROM session where Branch_id="2220052"', async (err, rows) => {
                                if (err) throw err;
                                token_valid_to = await rows;
                                token_validity = await token_valid_to[0].token_valid_to;
                                token_valid_from = await Number(token_validity);
                                token_valid_till = await token_valid_from + 900000;
                                sql1 = "UPDATE session SET token = ?, token_valid_from =?,token_valid_to =?  WHERE Branch_id=?";
                                await connection.query(sql1, [auth2.authorization, token_valid_from, token_valid_till, "2220052"], function (err, result) {
                                    if (err) throw err;
                                    console.log("Number of records updated: " + result.affectedRows);
                                });
                            });
                            console.log(auth2.authorization)
                            auth = auth2.authorization
                            await browser.close();
                        }
                    }))
                }
                catch (error) {
                    console.log(' -> somethign in run went wrong !', error);
                }
                setTimeout(run, 900000)
            }, 1000)

            setTimeout(async function done() {
                // let Branch_id = await grubhub[i].Branch_id;
                await connection.query('SELECT token_valid_from FROM session where Branch_id="2220052"', async (err, rows) => {
                    if (err) throw err;
                    response = await rows;
                    timestamp = await response[0].token_valid_from;
                    url = "https://api-gtm.grubhub.com/merchant/2220052,2220818,2218384,2219349,2221715,2218188,2221811,2218970/orders?timestamp=" + timestamp;
                    console.log(auth)
                    console.log(url);
                    res = await axios.get(url, {
                        headers: {
                            'Accept': 'application/json',
                            'authorization': auth,
                            'origin': 'https://restaurant.grubhub.com'
                        }
                    }).catch(err => {
                        console.log("error in await", err);
                    })
                    data1 = await res.data;
                    if (data1) {
                        for (let key in data1) {
                            if (typeof data1[key] === 'object') {
                                if (data1[key].orders) {
                                    grubhub_order = data1[key].orders;
                                    if (grubhub_order.length > 0) {
                                        for (i = 0; i < grubhub_order.length; i++) {
                                            console.log(grubhub_order[i].order_number);
                                            await grubhub_order[i].token
                                            grubhub_order[i].token = auth;
                                            await Order.updateOne(
                                                { order_number: grubhub_order[i].order_number },
                                                grubhub_order[i],
                                                { upsert: true })
                                        }
                                    }
                                    else
                                        console.log(data1[key])
                                }
                            }
                        }
                    }
                })
                setTimeout(done, 30000);
            }, 30000)
        }
    });
    await connection.query('SELECT * FROM branch_platform where platform_id="1"', async (err, rows) => {
        if (err) throw err;
        var uber = await rows;
        for (let i = 0; i < uber.length; i++) {
            let browser, Branch_id, values, sql, page, active_order_url, a, ts, sid, csid, transport, res, data1, cookie_string, timestamp, currentDate_plus_900seconds, currentDate, bsid, bcid, sql1;
            try {
                Branch_id = await uber[i].Branch_id;
                if (browser)
                    await browser.close();
                // timestamp = new Date().getTime();
                browser = await puppeteer.launch({ headless: false });
                page = await browser.newPage()
                await page.goto('https://restaurant-dashboard.uber.com/');

                await page.waitForSelector("#useridInput")
                await page.type("#useridInput", uber[i].email);
                await page.click('.btn.btn--arrow.btn--full')

                await page.waitForNavigation({ timeout: 100000 });
                await page.waitForSelector("#password");
                await page.type("#password", uber[i].password);
                await page.click(".btn.btn--arrow.btn--full.push--top");
                await page.waitForNavigation({ timeout: 100000 });

                await page.setRequestInterception(true);
                page.on('request', (async interceptedRequest => {

                    active_order_url = await "https://restaurant-dashboard.uber.com/rt/eats/v1/stores/" + Branch_id + "/active-orders"
                    transport = axios.create({ withCredentials: true });
                    a = await page.cookies();
                    sid = await a.find(o => o.name === 'sid');
                    csid = await a.find(o => o.name === 'csid');
                    cookie_string = await "sid=" + sid.value + ";" + "csid=" + csid.value + ";"
                    if (interceptedRequest.url().endsWith('/active-orders')) {
                        res = await transport.get(active_order_url, {
                            headers: {
                                'accept': '*/*',
                                'cookie': cookie_string
                            }
                        }).catch(err => {
                            console.log("error in await", err);
                        })
                        data1 = await res.data.orders;
                        console.log("done", cookie_string);
                        if (data1) {
                            if (data1.length > 0) {

                                for (i = 0; i < data1.length; i++) {
                                    await data1[i].status;
                                    data1[i].status = "active";
                                    await Order.updateOne(
                                        { uuid: data1[i].uuid },
                                        data1[i],
                                        { upsert: true })
                                }
                            }
                        }
                    }

                    if (interceptedRequest.url()) {
                        currentDate = await new Date().getTime();
                        currentDate_plus_900seconds = await currentDate + 900000;
                        values = [[sid.value, csid.value, currentDate, currentDate_plus_900seconds, currentDate, currentDate_plus_900seconds, "1", Branch_id]];
                        sql = "INSERT IGNORE into session (sid,cid,sid_valid_from,sid_valid_to,cid_valid_from,cid_valid_to,platform_id,Branch_id) VALUES ?";
                        await connection.query(sql, [values], function (err, result) {
                            if (err) throw err;
                            console.log("Number of records inserted: " + result.affectedRows);
                        });
                        await connection.query('SELECT sid,cid FROM session where Branch_id="ce1a1d32-4053-45c5-93e5-79fde0bf0d06"', async (err, rows) => {
                            if (err) throw err;
                            ts = await rows;
                            bsid = await ts[0].sid;
                            bcid = await ts[0].cid;
                            if (bsid != sid.value || bcid != csid.value) {
                                sql1 = "UPDATE session SET sid = ?,cid = ?, sid_valid_from =?,sid_valid_to =?,cid_valid_from =?,cid_valid_to =?  WHERE Branch_id=?";
                                await connection.query(sql1, [sid.value, csid.value, currentDate, currentDate_plus_900seconds, currentDate, currentDate_plus_900seconds, "ce1a1d32-4053-45c5-93e5-79fde0bf0d06"], function (err, result) {
                                    if (err) throw err;
                                    console.log("Number of records updated: " + result.affectedRows);
                                });
                            }
                        })
                    }
                }))
            }
            catch (error) {
                console.log(' -> somethign in run went wrong !', error);
            }
        }
    });
}
integration();
