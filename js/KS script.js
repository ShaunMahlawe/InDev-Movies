// Look at console
$(document).ready(function() {
	var loginUsername;
	var loginPassword;
	var account = [loginUsername, loginPassword];
  
	$('#login-button').on('click', function() {
		var loginUsernameEntry = $("#login-username").val();
    var loginPasswordEntry = $("#signInPass").val();
		if (loginUsernameEntry == account[0] && loginPasswordEntry == account[1]) {
			console.log("Current Username " + account[0]);
			console.log("Current Password " + account[1]);
			console.log("Logged In");
		} else {
			console.log("Attempted Username " + loginUsernameEntry);
			console.log("Attempted Password " + loginPasswordEntry);
			console.log("Login Falied");
		};
	});
  
	$('#create-button').on('click', function() {
		var createUsernameEntry = $("#create-username").val();
		var createPasswordEntry = $("#signUpPass").val();
		var createEmailEntry = $("#signUpEmail").val();
    var createUsernameValid = false;
    var createPasswordValid = false;
    var createEmailValid = false;
    var createUsernameObject = $("#create-username");
    var createPasswordObject = $("#signUpPass");
    var createEmailObject = $("#signUpEmail");
    var validate = /^\s*[a-zA-Z0-9,\s]+\s*$/;
    var validateEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
   
    if(!validate.test(createUsernameEntry) || (createUsernameEntry).length == 0) {
      $(createUsernameObject).addClass("error")
      $(createUsernameObject).val("No special characters or spaces.")
    } else {
      createUsernameValid = true;
      var createUsername = $(createUsernameObject).val();
    }
    
    if(!validate.test(createPasswordEntry) || (createPasswordEntry).length == 0) {
      $(createPasswordObject).addClass("error");
      $(createPasswordObject).val("No special characters or spaces.");
    } else {
      createPasswordValid = true;
      var createPassword = $(createPasswordObject).val();
    }
    
    if(!validateEmail.test(createEmailEntry)) {
      $(createEmailObject).addClass("error");
      $(createEmailObject).val("Enter a valid email");
    } else {
      createEmailValid = true;
      console.log("Account Email " + createEmailObject.val())
    }
      
    $(createUsernameObject).on('click', function () {
      $(this).val("");  
      $(this).removeClass("error");
    });
    
    $(createPasswordObject).on('click', function () {
      $(this).val("");  
      $(this).removeClass("error");
    });
    
    $(createEmailObject).on('click', function () {
      $(this).val("");
      $(this).removeClass("error");
    });
    
    account = [createUsername, createPassword];
		console.log("Account Username " + account[0]);
		console.log("Account Password " + account[1]);
    
		if(createUsernameValid == true && createPasswordValid == true && createEmailValid == true) {
      $('form').animate({
			height: "toggle",
			opacity: "toggle"
		}, "fast");
    }
	});
  
	$('.message a').on('click', function() {
		$('form').animate({
			height: "toggle",
			opacity: "toggle"
		}, "fast");
	});
});


const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

if (container && registerBtn) {
  registerBtn.addEventListener('click', () => {
    container.classList.add('active');
  });
}

if (container && loginBtn) {
  loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
  });
}


let username;

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener("submit", e  =>{
    e.preventDefault();
    username = document.getElementById("signInEmail").value;
    localStorage.setItem("userName", username);
  });
}

function showName(){
  const savedName = localStorage.getItem("userName");
  const displayName = document.getElementById('displayName');
  if (displayName && savedName) {
    displayName.textContent = "Welcome " + savedName;
  }
}
