/*eslint-env node*/

/*                    REQUIREMENTS                                   */
var debug = require("./lib/debug");
var altStackTrace = require("./lib/altStackTrace");
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var jsonParser = bodyParser.json();
var cheerio = require('cheerio');
var request = require('request');
var express = require('express');
var cfenv = require('cfenv');
var fs = require('fs');
var nodemailer = require('nodemailer');
/*                    END REQUIREMENtS                               */

/*                    SET PARAMETERS                                 */
var EMAIL = 'kunkel.nik@gmail.com'
var VERBOSE = false;
var edgarURL = 'http://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=only&start=0&count=100&output=atom';
var fidelityURL = 'https://eresearch.fidelity.com/eresearch/goto/evaluate/snapshot.jhtml?symbols='
var cikURL1 = 'http://www.sec.gov/cgi-bin/browse-edgar?CIK=';
var cikURL2 = '&Find=Search&owner=exclude&action=getcompany&output=atom';
var companyTickerList = [];
var companyCIKList = [];
var TickerToCIK = {};
var CikList = [];
var FormList = [];
/*                    END SET PARAMETERS                             */

/*                    INITIALIZE DEBUG                               */
//Each DEBUGxxx(string) function prints log message with prefix xxx and string passed
var DEBUGinit = debug.createDebug("INIT")
var DEBUGinfo = debug.createDebug("INFO")
var DEBUGserver = debug.createDebug("SERVER")
var DEBUGexit = debug.createDebug("EXIT")
var DEBUGerror = debug.createDebug("ERROR")

DEBUGinit("node application starting")
DEBUGinit("enabbling alternate stack trace")
altStackTrace.enable()

DEBUGinit("adding exit handler")
process.on("exit", function(code) {
  DEBUGexit("code: " + code)
})

DEBUGinit("adding uncaught exception handler")
process.on("uncaughtException", function(err) {
  DEBUGerror("exception: " + err.stack)
  process.exit(1)
})
/*                    END INITIALIZE DEBUG                           */

/*                    OBJECT DEFINITIONS                             */
function FormHistory()
{
  var self = this;
  this.list = [];
  this.printList = function()
  {
    for(var i = 0; i < this.list.length; i++)
    {
      console.log(this.list[i]);
    }
  }
  this.restoreFromFile = function()
  {
    DEBUGinfo('Restoring History From File');
    fs.readFile('FormHistory.txt', function(err, data) {
      if(err) throw error;
      self.list = data.toString().split("\n");
    });
    self.printList();
  }
  
  this.backupToFile = function(str)
  {
    var stream = fs.appendFile('Formhistory.txt', str + '\n', function(err) {
      if(err) throw error;
    });
  }
}

function FormData()
{
  this.url = "",
  this.ticker = "",
  this.corpName = "",
  this.cik = "",
  this.ownerName = "",
  this.title = "",
  this.isOfficer = "",
  this.isDirector = "",
  this.securityType = [],
  this.numShares = [],
  this.directOrIndirect = [],
  this.sharePrice = [],
  this.transactionType = [],
  this.transactionDate = [],
  this.transactionCode = [],
  this.footnotes = [],
  this.totalValue = 0,
  this.curStockPrice = 0,
  
  this.printFormData = function()
  {
    DEBUGinfo('\033[42mTicker = ' + this.ticker + '\x1b[0m');
    DEBUGinfo('\033[42mCompany Name = ' + this.corpName + '\x1b[0m');
    DEBUGinfo('\033[42mCIK = ' + this.cik + '\x1b[0m');
    DEBUGinfo('\033[42mName = ' + this.ownerName + '\x1b[0m');
    DEBUGinfo('\033[42mTitle = ' + this.title + '\x1b[0m');
    DEBUGinfo('\033[42mIs Officer = ' + this.isOfficer + '\x1b[0m');
    DEBUGinfo('\033[42mIs Director = ' + this.isDirector + '\x1b[0m');
    DEBUGinfo('\033[42mCur Stock Price = ' + this.curStockPrice + '\x1b[0m');
    
    for(var i = 0; i < this.securityType.length; i++) {
      DEBUGinfo('\033[42mSecurity Type ' + i + ' = ' + this.securityType[i] + '\x1b[0m');
    }
    for(var i = 0; i < this.numShares.length; i++) {
      DEBUGinfo('\033[42mNumber of Shares ' + i + ' = ' + this.numShares[i] + '\x1b[0m');
    }
    for(var i = 0; i < this.directOrIndirect.length; i++) {
      DEBUGinfo('\033[42mOwnership Nature ' + i + ' = ' + this.directOrIndirect[i] + '\x1b[0m');
    }
    for(var i = 0; i < this.sharePrice.length; i++) {
      DEBUGinfo('\033[42mShare Price ' + i + ' = ' + this.sharePrice[i] + '\x1b[0m');
    }
    for(var i = 0; i < this.transactionType.length; i++) {
      DEBUGinfo('\033[42mSale Type ' + i + ' = ' + this.transactionType[i] + '\x1b[0m');
    }
    for(var i = 0; i < this.transactionDate.length; i++) {
      DEBUGinfo('\033[42mTransaction Date ' + i + ' = ' + this.transactionDate[i] + '\x1b[0m');
    }
    for(var i = 0; i < this.transactionCode.length; i++) {
      DEBUGinfo('\033[42mTransaction Code ' + i + ' = ' + this.transactionCode[i] + '\x1b[0m');
    }
    for(var i = 0; i < this.footnotes.length; i++) {
      DEBUGinfo('\033[42mFootnotes ' + i + ' = ' + this.footnotes[i] + '\x1b[0m\n');
    }
  }
  
  this.printToEmail = function() {
    DEBUGinfo('converting form to email string');
    var email = 'Ticker = ' + this.ticker + '\n'
                + 'Company Name = ' + this.corpName + '\n'
                + 'Company CIK = ' + this.cik + '\n'
                + 'Name = ' + this.ownerName + '\n'
                + 'Title = ' + this.title + '\n'
                + 'Is Officer = ' + this.isOfficer + '\n'
                + 'Is Director = ' + this.isDirector + '\n'
                + 'Current Stock Price = ' + this.curStockPrice + '\n\n';
                
    for(var i = 0; i < this.securityType.length; i++) {
        email = email + 'TRANSACTION ' + (i + 1) + '\n'
                + 'Security Type = ' + this.securityType[i] + '\n'
                + 'Number of Shares = ' + this.numShares[i] + '\n'
                + 'Ownership Nature = ' + this.directOrIndirect[i] + '\n'
                + 'Price Per Share = ' + this.sharePrice[i] + '\n'
                + 'Sale Type = ' + this.transactionType[i] + '\n'
                + 'Transaction Code = ' + this.transactionCode[i] + '\n'
                + 'Transaction Date = ' + this.transactionDate[i] + '\n'
                + 'Transaction Value = ' + (this.sharePrice[i] * this.numShares[i]) + '\n\n';
    }
    email = email + 'FOOTNOTES\n';
    for(var i = 0; i < this.footnotes.length; i++) {
      email = email + this.footnotes[i] + '\n\n';
      
    }
    email = email + 'Form 4 URL = ' + this.url;
    
    DEBUGinfo(email);
    return email;
  }
}
/*                    END OBJECT DEFINITIONS                         */


/*                    INITIALIZE EXPRESS SERVER                      */
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {

	// print a message when the server starts listening
  DEBUGserver("server starting on " + appEnv.url);
});
/*                    END INITIALIZE EXPRESS SERVER                  */

/*                    INITIALIZE EMAIL NOTIFIER                      */
var smtpConfig = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'form4alert@gmail.com',
    pass: 'blablablabla'
  }
};

var transporter = nodemailer.createTransport(smtpConfig);

transporter.verify(function(error, success) {
  if(error) {
    DEBUGerror(error);
  } else {
    DEBUGinfo('Gmail service ready to accept emails');
  }
});
/*                     END INITIALIZE EMAIL NOTIFIER                 */

/*                    PARSE STOCK SYMBOL INPUT FILE                  */
function parseStockFile() {
 return new Promise(function (resolve, reject) {
   //Asynchronous File Read
   fs.readFile('StockList.txt', function(err, data) {
     if(err) reject(err);
     companyTickerList = data.toString().split("\n");
   
     //Print Stock List
     DEBUGinfo('monitoring following stocks: \n');
     for(i in companyTickerList) {
       console.log(companyTickerList[i]);
     }
     resolve(1);
   });
 });
}
/*                    END PARSE STOCK SYMBOL INPUT FILE              */

/*                    FIND STOCK TICKERS CORRESPONDING CIKS          */
function findCompanyCIK() {
  for(var i in companyTickerList) { 
    if(VERBOSE) DEBUGinfo('i = ' + i);
    var cik_lookup_url = cikURL1 + companyTickerList[i] + cikURL2;
    if(VERBOSE) DEBUGserver[cik_lookup_url];
    (function(i) {
      request(cik_lookup_url, function(error, response, xml) {
        if(!error && response.statusCode == 200) {
          if(VERBOSE) DEBUGinfo('CIK lookup - response status = 200 - loading xml');
          var cik_xml = cheerio.load(xml);
          if(VERBOSE) DEBUGinfo('TICKER = ' + companyTickerList[i] + ' CIK = ' + cik_xml('company-info cik').text());
          //Insert Symbol and CIK Data into Map
          TickerToCIK[companyTickerList[i]] = cik_xml('company-info cik').text();
          CikList.push(cik_xml('company-info cik').text());
        } else {
          DEBUGerror('Request for CIK Unsuccessful');
        }
      });
    })(i);
  }
}
/*                 END FIND STOCK TICKETS CORRESPONDING CIKS         */

function verifyCIK() {
  DEBUGinfo('inside verifyCIK');
  for(var ticker in TickerToCIK) {
    if(TickerToCIK.hasOwnProperty(ticker)) {
      console.log(ticker + " = " + TickerToCIK[ticker]);
    }
  }
}

/*                    QUERY SEC EDGAR FEED                           */
function queryEdgarFeed(url, callback) {
  DEBUGinfo('querying edgar database');
  request(url, function(error, response, xml) {
    if(!error && response.statusCode == 200) {
      if(VERBOSE) DEBUGinfo('Edgar query - response status = 200 - loading xml');
      var $ = cheerio.load(xml);
      callback($);
    }
    else {
      DEBUGerror('invalid response from edgar query');
      throw error;
    }
  });
}
/*                    END QUERY SEC EDGAR FEED                       */

/*                    PARSE EDGAR XML DATA                           */
function parseXML($) {
  DEBUGinfo('parsing xml response');
  //traverse over all title inside each entry
  $('entry title').each(function(index,element) {
    var title = $(this).text();
    var title_tokens = title.split(" ");
    DEBUGinfo(title);
    //identify if form 4
    if(title_tokens[0] == '4') {
      if(VERBOSE) DEBUGinfo('found a form 4');
      length = title_tokens.length
      //identify if filed by Reporting Officer or Issuing Company
      if(title_tokens[length - 1] == '(Issuer)') {
        if(VERBOSE) DEBUGinfo('found issuer');
        //Pull CIK data
        var CIK = title_tokens[length - 2];
        //format CIK data
        CIK = CIK.substring(1,CIK.length - 1);
        //check if CIK matches our Stock List
        if(CikList.indexOf(CIK) > -1) {
          DEBUGinfo('\x1b[41m********************* FOUND CIK ON STOCK LIST ************************\x1b[0m');
          //extract URL for Filing Details
          var filing_url = $(this).next().attr('href');
          if(VERBOSE) DEBUGserver(filing_url);
          //check if this form has already been processed previously
          if(history.list.indexOf(filing_url) == -1) {
            getForm4Link(filing_url);
            history.list.push(filing_url);
            history.backupToFile(filing_url);
          } else {
            DEBUGinfo('Skipping - Found repeat form');
          }
        }
      }
    }
  });
}
/*                    END PARSE EDGAR XML DATA                       */

/*                    GET FORM 4 URL                                 */
function getForm4Link(url) {
  DEBUGinfo('parsing filing details');
  request(url, function(error, response, xml) {
    if(!error && response.statusCode == 200) {
     if(VERBOSE) DEBUGserver('FILING DETAILS QUERY SUCCESSFUL\n');
     var filing_xml = cheerio.load(xml);
     
     var form4_html_url = filing_xml('.tableFile a').attr('href');
     form4_html_url = 'http://www.sec.gov' + form4_html_url;
     
     var form4_xml_url = filing_xml('.blueRow a').attr('href');
     form4_xml_url = 'http://www.sec.gov' + form4_xml_url;
     
     if(VERBOSE) DEBUGserver('FORM-4 URL = ' + form4_xml_url);
     parseForm4(form4_xml_url, form4_html_url);
    }
    else {
     DEBUGerror('FILING DETAILS QUERY FAILURE');
     throw error;
    }
  });
}
/*                 END GET FORM 4 URL                                */


/*                    PARSE FORM K4 FILING                           */
function parseForm4(url_xml, url_html) {
  DEBUGinfo('parsing form 4');
  request(url_xml, function(error, response, xml) {
    if(!error && response.statusCode == 200) {
      if(VERBOSE) DEBUGserver('Form 4 QUERY SUCCESSFUL\n');
      var form4 = cheerio.load(xml);
      var NewForm = new FormData();
      
      //link to form
      NewForm.url = url_html;
      
      //get trading symbol
      if(form4('issuerTradingSymbol').length > 0) {
        NewForm.ticker = form4('issuerTradingSymbol').text();
      }
      
      //get company name
      if(form4('issuerName').length > 0) {
        NewForm.corpName = form4('issuerName').text();
      }
      
      //get company CIK
      if(form4('issuerCik').length > 0) {
        NewForm.cik = form4('issuerCik').text();
      }
      
      //get name of owner
      if(form4('rptOwnerName').length > 0) {
        NewForm.ownerName = form4('rptOwnerName').text();
      }
      
      //get title
      if(form4('officerTitle').length > 0) {
        NewForm.title = form4('officerTitle').text();
      }
      
      //get officer status
      if(form4('isOfficer').length > 0) {
        NewForm.isOfficer = form4('isOfficer').text();
      }
      
      //get director status
      if(form4('isDirector').length > 0) {
        NewForm.isDirector = form4('isDirector').text();
      }
      //get type of security
      if(form4('nonDerivativeTable nonDerivativeTransaction securityTitle').length > 0) {
        form4('nonDerivativeTable nonDerivativeTransaction securityTitle value').each(function(i, elem) {
          NewForm.securityType.push(form4(this).text());
        });
      }
      
      //get number of shares
      if(form4('nonDerivativeTable nonDerivativeTransaction transactionAmounts transactionShares').length > 0) {
        form4('nonDerivativeTable nonDerivativeTransaction transactionAmounts transactionShares value').each(function(i, elem) {
          NewForm.numShares.push(form4(this).text());
        });
      }
      
      //get ownership type
      if(form4('nonDerivativeTable nonDerivativeTransaction ownershipNature directOrIndirectOwnership').length > 0) {
       form4('nonDerivativeTable nonDerivativeTransaction ownershipNature directOrIndirectOwnership value').each(function(i, elem) {
         NewForm.directOrIndirect.push(form4(this).text());
       });
      }
      
      //get share price
      if(form4('nonDerivativeTable nonDerivativeTransaction transactionAmounts transactionPricePerShare').length > 0) {
        var sharePrice = [];
        form4('nonDerivativeTable nonDerivativeTransaction transactionPricePerShare value').each(function(i, elem) {
          NewForm.sharePrice.push(form4(this).text());
        });
      }

      //get transaction type
      if(form4('nonDerivativeTable nonDerivativeTransaction transactionAmounts transactionAcquiredDisposedCode value').length > 0) {
        var transactionType = [];
        form4('nonDerivativeTable nonDerivativeTransaction transactionAmounts transactionAcquiredDisposedCode value').each(function(i, elem) {
          NewForm.transactionType.push(form4(this).text());
        });
      }
      
      //get transaction date
      if(form4('nonDerivativeTable nonDerivativeTransaction transactionDate').length > 0) {
        var transactionDate = [];
        form4('nonDerivativeTable nonDerivativeTransaction transactionDate value').each(function(i, elem) {
          NewForm.transactionDate.push(form4(this).text());
        });
      }
      
      //get transacton code
      if(form4('nonDerivativeTable nonDerivativeTransaction transactionCoding transactionCode').length > 0) {
        var transactionCode = [];
        form4('nonDerivativeTable nonDerivativeTransaction transactionCoding transactionCode').each(function(i, elem) {
          NewForm.transactionCode.push(form4(this).text());
        });
      }
      
      //calculate total value
      if(NewForm.numShares != 0 && sharePrice != 0) {
        NewForm.totalValue = NewForm.numShares * NewForm.sharePrice;
      }
      
      //get footnotes
      if(form4('footnotes footnote').length > 0) {
        var footnotes = [];
        form4('footnotes footnote').each(function(i, elem) {
          NewForm.footnotes.push(form4(this).text());
        });
      }
      
      //Get Current Stock price
      NewForm.curStockPrice = checkValue(NewForm.ticker).then(function(response) {
        NewForm.curStockPrice = response;
        
        //Add Form 4 to List
        FormList.push(NewForm);
        
        //Print Out All Info Collected
        if(VERBOSE) NewForm.printFormData();
        
        //Send Form Alert to Email
        sendToEmail(NewForm);
      }, function(error) {
        DEBUGerror("Failed to get current stock price");
        throw error;
      });
    } 
    else {
      DEBUGerror('FORM 4 QUERY FAILURE');
      throw error;
    }
  });
}
/*                    END PARSE FORM K4 FILING                       */

/*                    CHECK VALUE OF STOCK                           */
function checkValue(ticker) {
  return new Promise(function(resolve, reject) {
    if(ticker == '') DEBUGerror('Error: Blank ticker passed to checkValue');
    var url = fidelityURL + ticker;
    if(VERBOSE) DEBUGinfo('checking value of stock ticker = ' + ticker);
    if(VERBOSE) DEBUGinfo('Stock Price Checker URL = ' + url);
    request(url, function(error, response, html) {
      if(!error && response.statusCode == 200) {
        var $ = cheerio.load(html);
        var curStockPrice = $('.symbol-value-sub').text();
        if(VERBOSE) DEBUGinfo(ticker + ' Current Stock Price = ' + curStockPrice);
        resolve(curStockPrice);
      }
      else {
        DEBUGerror('Fidelity Price Check Query Failed');
      }
    });
  });
}
/*                    END CHECK VALUE OF STOCK                       */

/*                    MONITOR EDGAR FEED                             */
function monitorEdgar() {
  var $ = queryEdgarFeed(edgarURL, parseXML);
}
/*                    END MONITOR EDGAR FEED                         */

/*                    SEND NOTIFICATION TO EMAIL                     */
function sendToEmail(Form) {
  email_body = Form.printToEmail();
 
  var mailOptions = {
  from: 'form4alert@gmail.com',
  to: EMAIL,
  subject: 'SEC Edgar Form-4 Filing Alert',
  text: email_body
  };
  
  DEBUGinfo('Sending Email Alert');
  transporter.sendMail(mailOptions, function(error, info) {
    if(error) DEBUGerror(error); 
    else DEBUGinfo('Message sent: ' + info.response);
  });
}
/*                    END SEND NOTIFICATION TO EMAIL                 */


/*                    MAIN LOOP                                      */
try {
  DEBUGinfo('loading past form history');
  var history = new FormHistory();
  history.restoreFromFile();
 
  DEBUGinfo('parsing StockList input file');
  parseStockFile().then(function(response) {
     findCompanyCIK();
   }, function(error) {
    DEBUGerror("Failed to parse Stock List Correctly");
    throw error;
  });
  
  DEBUGinfo('monitoring SEC Edgar Feed');
  monitorEdgar();
  setInterval(monitorEdgar, 60*1000);
}

catch(error) {
  DEBUGerror('Error was thrown: value = ' + error);
}
/*                    END MAIN LOOP                                  */