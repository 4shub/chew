/*

*/

//ugh documentation sucks...

var brand_count = flavor_count = 0;

$(document).ready(function(){

var handler = StripeCheckout.configure({
    key: 'pk_test_z4jAAlz6sNyDGDjI7R8cdwNV',
    image: '/img/logo.png',
    token: function(token) {
		data = {};
		
		data.order = []
		var x = 0;
		for(var i = 0; i < $('.option-flavor ').length; i++){
			if($('#flavor_' + i).data('selected') === true){
				data.order[x] = {}
				data.order[x].type = $('#flavor_' + i).data('type');
				data.order[x].brand = $('#flavor_' + i).data('brand');
				data.order[x].flavor = $('#flavor_' + i).data('flavor');
				x++;
			}
			if(i === $('.option-flavor').length - 1){
				data.name = $('#name').val()
				data.location = {
					address:$('#address').val(),
					state:$('#state').val(),
					zip:$('#zip').val()
					
				};
				data.email = token.email;

				data.card = token.id;
				$.ajax({
					url: "/order",
					type: "POST",
					data: {order:data},
					success: function(data) {
						window.location.href = "/subscriptions";
					},
					error:function(data){
						alert('An error happened');   
					}
				});
			}
		}
    }
  });

  document.getElementById('purchase').addEventListener('click', function(e) {
    // Open Checkout with further options
	if($('#address').val() != '' && $('#state').val() != '' && $('#zip').val() != '' && $('#name').val() != ''){
		handler.open({
		  name: 'Chew',
		  description: 'Recurring Monthly Subscription ($15.00)',
		  amount: 1500
		});
	} else {
		alert('You need to fill in your address and name completely');
	}
    e.preventDefault();
	
  });
});

$(document).on('click', '.header-user', function(){
	$('.option-menu-holder').toggle();
});

$(document).on('click', '.order-cancel', function(){
	pos = $(this).data('position');
	$.ajax({
		url: "/order/cancel",
		type: "POST",
		data: {id:pos},
		success: function(data) {
			window.location.href = "/subscriptions";
		},
		error:function(data){
			alert('An error happened');   
		}
	});

});



$(document).on('click', '.option-type ', function(){
	$('.option-type').data('selected', false);
	$('.option-type').css("background-image", "url('/img/unchecked.png')");
	$('.opt-Mint, .opt-Fruit, .option-flavor').hide();
	brand_count = 0;
	$('.option-brand').data('selected', false);
	$('.option-brand').css("background-image", "url('/img/unchecked.png')");
});


$(document).on('click', '.form-option ', function(){
	if($(this).data('selected') === true){
		$(this).css("background-image", "url('/img/unchecked.png')");
		$(this).data('selected', false);
	} else{
		$(this).data('selected', true);
		$(this).css("background-image", "url('/img/checked.png')");
	}
	
});


$(document).on('click', '.option-type', function(){
	
	if($(this).data('selected') === true){
		if($(this).html() === 'Fruity' ){
			$('.opt-Fruit').show();
		} else if($(this).html() === 'Minty'){
			$('.opt-Mint').show();
		} else if($(this).html() === 'Both'){ 
			$('.opt-Mint, .opt-Fruit').show();
		}
	} 
	$('.step2').show();
});



$(document).on('click', '.option-brand', function(){
		if($(this).data('selected') === true){
			if(brand_count < 2){
				brand_count = brand_count + 1;
				$('.opt-' + $(this).data('brand')).show();
			} else {
				$(this).data('selected', false);
				$(this).css("background-image", "url('/img/unchecked.png')");
				alert('Unselect a brand to choose more');
			}
		} else {
			brand_count = brand_count - 1;
			$('.opt-' + $(this).data('brand')).hide();
		}
		$('.step3').show();
});

$(document).on('click', '.option-flavor', function(){
		if($(this).data('selected') === true){
			if(flavor_count < 2){
				flavor_count = flavor_count + 1;
				$(this).find('.addx').addClass('active_op');
			} else {
				$(this).data('selected', false);
				
				$(this).css("background-image", "url('/img/unchecked.png')");
				alert('Unselect a flavor to choose more');
			}
		} else {
			$(this).find('.addx').removeClass('active_op');
			$(this).find('.addx').html("(0 pack)");
			flavor_count = flavor_count - 1;
		}
		if(flavor_count === 0){
			$('.active_op').html("(0 pack)");
		} else if(flavor_count === 2){
			$('.active_op').html("(1 pack)");
			$(this).data('count', 1);
		} else if(flavor_count === 1){
			$('.active_op').html("(2 packs)");
			$(this).data('count', 2);
		}
	$('.step4').show();
});

