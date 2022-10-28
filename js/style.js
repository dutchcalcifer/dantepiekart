$( document ).ready(function() {
    $( "main" ).hide().fadeIn(1000);
});

$(document).ready(function() {
    var palettes = [
      ['#2980b9'],
      ['#64E764'],
      ['#E76464']
    ];
    var randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
    
    var new_bgcolor = randomPalette;
  
    $('main').css({
      'background-color': new_bgcolor,
    });
  });