// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
var toogleWithdraw = function (amount, wallet) {
    var address = document.querySelector('.address'),
        withdraw = document.querySelector('.withdraw');
    address.style.display = 'none';
    withdraw.style.display = 'block';
};
var CreateWithdrawalRequest = function () {
    var headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    var amount = +document.querySelector('.amount').value,
        wallet = document.querySelector('.wallet').value,
        __RequestVerificationToken = document.getElementsByName('__RequestVerificationToken').value,
        tfa = document.querySelector('.tfa').value,
        body = {
            Amount: amount,
            Wallet: wallet,
            Currency: 'SPX',
            TwoFactorCode: tfa,
            __RequestVerificationToken: __RequestVerificationToken
        },
        options = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        };
    fetch('https://localhost:5001/Wallet/CreateWithdrawalRequest', options)
        .then(res => {
            console.log(res);
        })
};
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.copy-btn')) {
        document.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(document.querySelector('.input-address').value)
        });
    }
    if (document.querySelector('.CreateWithdrawalRequest')) {
        document.querySelector('.CreateWithdrawalRequest').addEventListener('click', CreateWithdrawalRequest);
        document.querySelector('.toogleWithdraw').addEventListener('click', toogleWithdraw);
    }

    var qrcode = new QRCode(document.querySelector('.qr-wrap'), {
        width: 250,
        height: 250,
        useSVG: true
    });
    qrcode.makeCode(document.querySelector('.input-address').value);
});
