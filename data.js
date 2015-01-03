/*
This product is copyright no reuse @2014-15 Shubham Naik / Chew
*/

var express = require('express');
var http = require('http');
var https = require('http');
var path = require('path');
var app = express();
var request = require('request');
var moment = require('moment');
var crypto = require('crypto');
var MongoDB 	= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var mongojs = require('mongojs');
var util = require('util');
var twitter = require('twitter');

module.exports = function(app) {
	//define database
	var connection_string = '';

	var db = mongojs(connection_string, ['accounts, types']);
	var accounts = db.collection('accounts');
	var types = db.collection('types');

	/*twitter verification*/
	var OAuth = require('oauth').OAuth
		, otw = new OAuth(
		"https://api.twitter.com/oauth/request_token",
		"https://api.twitter.com/oauth/access_token",
		"",
		"",
		"1.0",
		"http://trychew.com/auth/twitter/callback",
		"HMAC-SHA1"
		);

	app.get('/auth/twitter', function(req, res) {
		otw.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
	   
		  req.session.oauthtw = {
			token: oauth_token,
			token_secret: oauth_token_secret
		  };
		  res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
		}
	  );

	});
	
	//stripe
	var stripe = require("stripe")( "" );

	app.get('/auth/twitter/callback', function(req, res) {
	  if (req.session.oauthtw) {
		req.session.oauthtw.verifier = req.query.oauth_verifier;
		var oauth_data = req.session.oauthtw;

		otw.getOAuthAccessToken(
		  oauth_data.token,
		  oauth_data.token_secret,
		  oauth_data.verifier,
		  function(error, oauth_access_token, oauth_access_token_secret, results) {
			if (error) {
			  console.log(error);
			  res.send("Authentication Failure!");
			} else {
				var twit = new twitter({
					consumer_key: '',
					consumer_secret: '',
					access_token_key: oauth_access_token,
					access_token_secret: oauth_access_token_secret
				});
				  twit.get('https://api.twitter.com/1.1/account/settings.json', {include_entities:true}, function(twe) {
					twit.get('https://api.twitter.com/1.1/users/show.json', {include_entities:true, screen_name:twe.screen_name}, function(data) {
					
						accounts.findOne({id:data.id_str}, function(e, o) {
							if (o){
								req.session.user = o;
								res.redirect('/order');
							}	else{
								stripe.customers.create({ 
									description: data.name, 
								}, function(err, customer) { // asynchronously called 
									req.session.user = {};
									req.session.user.username = data.screen_name;
									req.session.user.id = data.id_str;
									req.session.user.payment_id = customer.id;
									req.session.user.rank = 'normal';
									req.session.user.admin = false;
									req.session.user.orders = []; //{id:2131, type:'Fruity', brand:'Wrigleys', flavor:'berry' }
									req.session.user.location = {
										address:'',
										state:'',
										country:'United States',
										zip:''
									};
									req.session.user.name = data.name;
									req.session.user.image = data.profile_image_url;
									
									accounts.insert(req.session.user, {safe: true}, function(){
										res.redirect('/order');
									});
								});
								
							}
						});
					});
				});
				
			
			}
		  }
		);
	  } else {
		res.redirect('/'); // Redirect to login page
	  }
	});
	
	app.get('/', function(req, res) {
		res.render('index', {udata:req.session.user});
	});
	var menu = [
		{
			brand:'Stride',
			flavors:['Winterblue', 'Spearmint'],
			type:'Mint'
		},
		{
			brand:'Orbit',
			flavors:['Peppermint', 'Wintermint', 'Spearmint'],
			type:'Mint'
		},
		{
			brand:'Trident',
			flavors:['Original mint'],
			type:'Mint'
		},
		{
			brand:'Wrigleys',
			flavors:['Doubemint', 'Winterfresh'],
			type:'Mint'
		},
		{
			brand:'Trident',
			flavors:['Watermelon twist', 'Island Berry Lime', 'Tropical Twist'],
			type:'Fruit'
		},
		{
			brand:'Bubalicious',
			flavors:['Watermelon', 'Strawberry', 'Grape'],
			type:'Fruit'
		},
		{
			brand:'Wrigleys',
			flavors:['Juicy Fruit'],
			type:'Fruit'
		},
		{
			brand:'Extra',
			flavors:['Mixed Berry'],
			type:'Fruit'
		},
	]
	
	app.get('/order', function(req, res) {
		if(req.session.user){
			res.render('order', {udata:req.session.user, menu:menu});
		} else {
			res.redirect('/');
		}
	});
	
	app.get('/subscriptions', function(req, res) {
		if(req.session.user){
			res.render('subscriptions', {udata:req.session.user});
		} else {
			res.redirect('/');
		}
	});
	
	app.get('/admin', function(req, res) {
		if(req.session.user != undefined && req.session.user.admin === true){
			accounts.find( { rank : 'subscriber' } ).toArray(
			function(e, results) {
			if (e){ 
				res.send('some error:' + e);
			}else{
				console.log(results);
				res.render('admin', {udata:req.session.user, users:results});
			}
			});
		} else {
			res.redirect('/');
		}
	});

	app.get('/admin/orders', function(req, res) {
		if(req.session.user != undefined && req.session.user.admin === true){
			accounts.find( { rank : 'subscriber' } ).toArray(
			function(e, results) {
			if (e){ 
				res.send('some error:' + e);
			}else{
				res.send(results);
			}
		});
		} else {
			res.redirect('/');
		}
	});
	
	app.get('/admin/types', function(req, res) {
		if(req.session.user != undefined && req.session.user.admin === true){
			
		} else {
			res.redirect('/');
		}
	});
	
	app.post('/admin/types', function(req, res) {
		if(req.session.user != undefined && req.param('type') != undefined && req.session.user.admin === true){
			var type = req.param('type');
			types.findOne({name:type.brand}, function(e, o) {
				if(o){
					if(type.action === 'del'){
						types.remove({name:type.brand}, function(){
							res.send('Removed');
						});
					} else {
						var upset = {};
						o.name = type.brand;
						o.type = type.type;
						o.flavor = type.flavor; //array
						types.save(o, {safe: true}, function(){
							res.send('Modified');
						});
					}
				} else{
					var upset = {};
					upset.name = type.brand;
					upset.type = type.type;
					upset.flavor = type.flavor; //array
					types.insert(upset, {safe: true}, function(){
						res.send('Added');
					});
				}
			});
			
		} else {
			res.redirect('/');
		}
	});
	
	//confirm
	var ES = {
		host		: 'smtp.mandrillapp.com',
		user 		: 'contact@hubyard.com',
		password 	: '',
		sender		: 'Chew Team <no-reply@trychew.com>'
	}

	server = require("emailjs/email").server.connect({

		host 	    : ES.host,
		user 	    : ES.user,
		password    : ES.password,
		ssl		    : true

	});

	confimationemail = function(account, callback)
	{
		server.send({
			from         : ES.sender,
			to           : account.email,
			subject      : 'Chew Recipt',
			text         : 'Your order has been processed :)',
			attachment   : composeEmail(account)
		}, callback );
	}

	composeEmail = function(o)
	{
		var html = "<html><body>";
			html += "Hi "+o.name+",<br><br>";
			html += "This email has been to inform you that your order for gum every month ($15/month) has been processed.";
			html += "<br><br>To check on or cancel your order, please visit <a href='http://trychew.com/subscriptions'>trychew.com/subscriptions</a><br><br>";
			html += "Cheers,<br>";
			html += "Chew Team, <a href='http://trychew.com'>Chew</a><br><br>";
			html += "Please send any inquiries to <a href='http://twitter.com/trychew'>@trychew</a><br><br>";
			html += "</body></html>";
		return  [{data:html, alternative:true}];
	}
	
	app.post('/order', function(req, res) {
		if(req.param('order')){
			var order = req.param('order');
			stripe.customers.createSubscription( 
				req.session.user.payment_id, 
				{plan: "default", card:order.card}, 
				function(err, subscription) { 
				if(err){ 
					console.log(err);
					res.send(400);
				} else{
					accounts.findOne({id:req.session.user.id}, function(e, o) {
						if(o){
							o.rank = 'subscriber'
							o.name = order.name;
							o.email = order.email;
							o.location = order.location;
							o.orders[req.session.user.orders.length] = {id:subscription.id, order:order.order };
							accounts.save(o, {safe: true}, function(){
								confimationemail(o, function(){
									req.session.user = o;
									res.send(200);
								});
							});
						} else {
							res.send(400);
						}
					});
				}
				
			});
		} else {
			res.send(400);
		}
	});
	
	app.post('/order/cancel', function(req, res) {
		if(req.param('id')){
			var id = parseFloat(req.param('id'));
			stripe.customers.cancelSubscription(req.session.user.payment_id, req.session.user.orders[id].id, 
			function(err, confirmation) {
			if(err){ 
			console.log(err);
			res.send(400);
			} else{
				accounts.findOne({id:req.session.user.id}, function(e, o) {
					if(o){
						o.orders.splice(id, 1);
						if(req.session.user.orders.length === 0){
							o.rank = 'normal'
						} 
						accounts.save(o, {safe: true}, function(){
							req.session.user = o;
							res.send(200);
						});
					} else {
						res.send(400);
					}
				});

				}
			});
		} else {
			res.send(400);
		}
	});
	
	


		
}