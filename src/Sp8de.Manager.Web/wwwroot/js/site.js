// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
var toogleWithdraw = function (amount, wallet) {
    var address = document.querySelector('.address'),
        withdraw = document.querySelector('.withdraw');
    address.style.display = 'none';
    withdraw.style.display = 'block';
};
function CreateWithdrawalRequest() {
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
    fetch('/Wallet/CreateWithdrawalRequest', options)
        .then(res => {
            console.log(res);
        });
    return false;
};
var isAddress = function (address) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        // check if it has the basic requirements of an address
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        // If it's all small caps or all all caps, return true
        return true;
    } else {
        return false
    }
};
var validateAddress = function () {
    console.log('reu')
    var wallet = document.querySelector('.wallet');
    if (isAddress(wallet.value)) setWalletValid();
    else setWalletInvalid();
};
var setWalletInvalid = function () {
    var wallet = document.querySelector('.wallet'),
        submit = document.querySelector('.CreateWithdrawalRequest');
    wallet.classList.add('is-invalid');
    submit.disable = true;
};
var setWalletValid = function () {
    var wallet = document.querySelector('.wallet'),
        submit = document.querySelector('.CreateWithdrawalRequest');
    wallet.classList.remove('is-invalid');
    submit.disable = false;
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.copy-btn')) {
        document.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(document.querySelector('.input-address').value)
        });
    }
    if (document.querySelector('.CreateWithdrawalRequest')) {
        // document.querySelector('.CreateWithdrawalRequest').addEventListener('click', CreateWithdrawalRequest);
        document.querySelector('.toogleWithdraw').addEventListener('click', toogleWithdraw);
        // document.querySelector('.wallet').addEventListener('change', validateAddress);
        // document.querySelector('.wallet').addEventListener('blur', validateAddress);
        // document.querySelector('.wallet').addEventListener('keyup', validateAddress);
    }

    var qrcode = new QRCode(document.querySelector('.qr-wrap'), {
        width: 250,
        height: 250,
        useSVG: true
    });
    qrcode.makeCode(document.querySelector('.input-address').value);
});
