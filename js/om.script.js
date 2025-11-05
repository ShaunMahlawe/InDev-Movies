// $(document).ready(function(){
//     $(window).scroll(function(){
//         var scroll = $(window).scrollTop();
//         if(scroll > 100){
//             $(".takeTwo").css("background", "#0C0C0C")
//         }
//         else{
//             $(".netflix-navbar").css("background", "transparent")
//         }
//     })
// })

!async function(){
const url = 'https://imdb236.p.rapidapi.com/api/imdb/cast/nm0000190/titles';
const options = {
    method: 'GET',
    headers: {
        'x-rapidapi-key': 'ecdd572f6fmsh055b23482742d2cp1af123jsn9b1d66941f6f',
        'x-rapidapi-host': 'imdb236.p.rapidapi.com'
    }
};

    let data = await fetch(url, options)
                .then((response) => response.json())
                .then((result)=> {return result})
                .then ((error) => console.log(error));

    console.log(data);

}();


