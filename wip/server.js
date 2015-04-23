var fs = require('fs')
var express = require('express')
var bodyParser = require('body-parser')
var serveStatic = require('serve-static')
var multer  = require('multer')

var app = express()

app.use(multer({
	dest: './uploads/'
}))

app.use(serveStatic('.', {
	index: [
		'index.html',
		'index.htm'
	]
}))

// Parse POST bodies
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extended: false
}))

app.post('/report/:type', function (req, res) {
	console.log('received', req.params.type, req.body)
	res.end('OK')
})

var server = app.listen(3000, function () {
	console.log('Listening at http://localhost:' + server.address().port)
})
