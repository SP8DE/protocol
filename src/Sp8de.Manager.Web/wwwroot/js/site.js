// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.copy-btn')) {
        document.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(document.querySelector('.input-address').value)
        });
    }

    var qrcode = new QRCode(document.querySelector('.qr-wrap'), {
        width: 250,
        height: 250,
        useSVG: true
    });
    qrcode.makeCode(document.querySelector('.input-address').value);
});
